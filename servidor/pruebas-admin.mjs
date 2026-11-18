// Pruebas del pase de adulto y del panel de administración: node --no-warnings pruebas-admin.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

// Google falso (JWKS local) y Mercado Pago falso
const llaveG = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwkG = { ...llaveG.publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
const jwksSrv = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ keys: [jwkG] })); });
await new Promise(ok => jwksSrv.listen(0, '127.0.0.1', ok));
const CLIENTE_G = 'prueba.apps.googleusercontent.com';
const b64u = o => Buffer.from(JSON.stringify(o)).toString('base64url');
function tokenGoogle(datos = {}) {
  const ahora = Math.floor(Date.now() / 1000);
  const inicio = b64u({ alg: 'RS256', kid: 'k1', typ: 'JWT' }) + '.' + b64u({ iss: 'https://accounts.google.com', aud: CLIENTE_G, sub: 'g-jefe', email: 'jefe@prueba.pe', email_verified: true, given_name: 'Jefe', iat: ahora, exp: ahora + 600, ...datos });
  return inicio + '.' + crypto.sign('RSA-SHA256', Buffer.from(inicio), llaveG.privateKey).toString('base64url');
}
const estados = {};
const mp = http.createServer((req, res) => {
  let b = ''; req.on('data', c => b += c); req.on('end', () => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/users/me') return res.end(JSON.stringify({ id: 9, nickname: 'TIENDA', site_id: 'MPE', tags: [] }));
    if (req.method === 'POST' && req.url === '/preapproval') { const d = JSON.parse(b); estados.pre9 = { id: 'pre9', status: 'pending', external_reference: d.external_reference }; return res.end(JSON.stringify({ id: 'pre9', init_point: 'https://mp.test/pagar/pre9', status: 'pending' })); }
    const m = req.url.match(/^\/preapproval\/(\w+)$/);
    if (m && req.method === 'GET') return res.end(JSON.stringify(estados[m[1]] || {}));
    if (m && req.method === 'PUT') { estados[m[1]].status = 'cancelled'; return res.end('{}'); }
    res.statusCode = 404; res.end('{}');
  });
});
await new Promise(ok => mp.listen(0, '127.0.0.1', ok));

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avelu-admin-'));
Object.assign(process.env, {
  DATA_DIR: dir, IA_FALSA: '1', SUPERADMIN_EMAILS: 'Jefe@prueba.pe, otro-jefe@prueba.pe', PLAN_GRATIS_PARA: '',
  PAGOS_PROVEEDOR: 'mercadopago', MP_ACCESS_TOKEN: 'TEST-TOKEN', MP_API: `http://127.0.0.1:${mp.address().port}`,
  GOOGLE_CLIENT_ID: CLIENTE_G, GOOGLE_JWKS_URL: `http://127.0.0.1:${jwksSrv.address().port}/certs`, RESPALDOS: path.join(dir, 'respaldos'),
});
delete process.env.SECRETO;
const { crearServidor } = await import('./servidor.mjs');
const { crearPaseAdulto, paseAdultoValido } = await import('./lib/adulto.mjs');
const { db } = await import('./lib/db.mjs');
const { servidor } = crearServidor();
await new Promise(ok => servidor.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${servidor.address().port}`;

let fallos = 0, pasaron = 0, ipN = 0;
async function prueba(nombre, fn) { try { await fn(); pasaron++; console.log('✔', nombre); } catch (e) { fallos++; console.log('✘', nombre, '\n  ', e.stack || e.message); } }
async function api(metodo, ruta, { token, adulto, cuerpo } = {}) {
  const h = { 'X-Forwarded-For': '10.0.0.' + (++ipN % 250) };
  if (token) h.Authorization = 'Bearer ' + token;
  if (adulto) h['X-Adulto'] = adulto;
  if (cuerpo !== undefined) h['Content-Type'] = 'application/json';
  const r = await fetch(base + ruta, { method: metodo, headers: h, body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined });
  const ct = r.headers.get('content-type') || '';
  return { status: r.status, json: ct.includes('json') ? await r.json() : null, texto: ct.includes('json') ? '' : await r.text(), headers: r.headers };
}
const registrar = async (email, nombre) => (await api('POST', '/api/registro', { cuerpo: { email, clave: 'clave-segura', nombre, acepto: true } })).json;

const jefe = await registrar('jefe@prueba.pe', 'Jefe');
const fam = await registrar('fam@prueba.pe', 'Familia Uno');
const fam2 = await registrar('dos@prueba.pe', 'Familia Dos');
let pase;                       // pase de adulto del jefe
const A = () => ({ token: jefe.token, adulto: pase });

await prueba('la cuenta dice si es superadmin', async () => {
  assert.equal(jefe.cuenta.superadmin, true);
  assert.equal(fam.cuenta.superadmin, undefined);
});

await prueba('pase de adulto: contraseña bien y mal', async () => {
  assert.equal((await api('POST', '/api/adulto', { cuerpo: { clave: 'clave-segura' } })).status, 401);          // sin sesión
  const mal = await api('POST', '/api/adulto', { token: jefe.token, cuerpo: { clave: 'no-es-esta' } });
  assert.equal(mal.status, 401); assert.equal(mal.json.adultoToken, undefined);
  assert.equal((await api('POST', '/api/adulto', { token: jefe.token, cuerpo: {} })).status, 400);
  const ok = await api('POST', '/api/adulto', { token: jefe.token, cuerpo: { clave: 'clave-segura' } });
  assert.equal(ok.status, 200); assert.ok(ok.json.adultoToken);
  const min = (new Date(ok.json.hasta) - Date.now()) / 60000; assert.ok(min > 29 && min <= 30, 'dura 30 minutos');
  pase = ok.json.adultoToken;
  // el secreto queda en DATA_DIR, solo para el dueño
  const st = fs.statSync(path.join(dir, 'secreto.key')); assert.ok(st.size >= 32); assert.equal(st.mode & 0o077, 0);
});

await prueba('pase de adulto: con Google (misma persona) y rechazo de otra cuenta', async () => {
  const otra = await api('POST', '/api/adulto', { token: jefe.token, cuerpo: { credential: tokenGoogle({ sub: 'g-otro', email: 'otro@gmail.com' }) } });
  assert.equal(otra.status, 401); assert.match(otra.json.error, /no es la de esta familia/);
  assert.equal((await api('POST', '/api/adulto', { token: jefe.token, cuerpo: { credential: 'a.b.c' } })).status, 401);
  const ok = await api('POST', '/api/adulto', { token: jefe.token, cuerpo: { credential: tokenGoogle() } });
  assert.equal(ok.status, 200); assert.ok(ok.json.adultoToken);
  // ya quedó unida a ese Google: el mismo correo con otro "sub" no vale
  const falso = await api('POST', '/api/adulto', { token: jefe.token, cuerpo: { credential: tokenGoogle({ sub: 'g-impostor' }) } });
  assert.equal(falso.status, 401);
  // el Google del jefe no sirve para la cuenta de otra familia
  assert.equal((await api('POST', '/api/adulto', { token: fam.token, cuerpo: { credential: tokenGoogle() } })).status, 401);
});

await prueba('pase de adulto: vence, está atado a la cuenta y no se puede alterar', async () => {
  const id = jefe.cuenta.id;
  assert.equal(paseAdultoValido(pase, id), true);
  assert.equal(paseAdultoValido(pase, fam.cuenta.id), false);
  assert.equal(paseAdultoValido(crearPaseAdulto(id, -1).adultoToken, id), false);
  const [cuerpo, firma] = pase.split('.');
  const trampa = Buffer.from(JSON.stringify({ c: id, e: Date.now() + 9e9 })).toString('base64url') + '.' + firma;
  assert.equal(paseAdultoValido(trampa, id), false);
  assert.equal(paseAdultoValido(cuerpo + '.' + 'A'.repeat(firma.length), id), false);
  for (const malo of ['', 'x', null, undefined, 'a.b.c', 'x'.repeat(500)]) assert.equal(paseAdultoValido(malo, id), false);
});

await prueba('pase de adulto: límite de intentos', async () => {
  const x = await registrar('fuerza@prueba.pe', 'Fuerza');
  let ultimo; for (let i = 0; i < 9; i++) ultimo = await api('POST', '/api/adulto', { token: x.token, cuerpo: { clave: 'mala-' + i } });
  assert.equal(ultimo.status, 429);
});

const RUTAS = [['GET', '/api/admin/resumen'], ['GET', '/api/admin/uso'], ['GET', '/api/admin/cuentas'], ['GET', '/api/admin/cuentas/' + fam.cuenta.id],
  ['POST', '/api/admin/cuentas'], ['POST', `/api/admin/cuentas/${fam.cuenta.id}/plan`], ['POST', `/api/admin/cuentas/${fam.cuenta.id}/bloquear`],
  ['POST', `/api/admin/cuentas/${fam.cuenta.id}/clave`], ['DELETE', '/api/admin/cuentas/' + fam.cuenta.id], ['GET', '/api/admin/pagos'],
  ['POST', '/api/admin/pagos/revisar/' + fam.cuenta.id], ['POST', '/api/admin/pagos/cancelar/' + fam.cuenta.id], ['GET', '/api/admin/pagos/diagnostico'],
  ['GET', '/api/admin/salud'], ['GET', '/api/admin/auditoria']];
await prueba('candado del panel: 401 sin sesión, 403 si no es superadmin, 401 sin pase de adulto', async () => {
  const paseFam = (await api('POST', '/api/adulto', { token: fam.token, cuerpo: { clave: 'clave-segura' } })).json.adultoToken;
  for (const [m, r] of RUTAS) {
    const cuerpo = m === 'GET' ? undefined : {};
    assert.equal((await api(m, r, { cuerpo })).status, 401, 'sin sesión ' + r);
    assert.equal((await api(m, r, { token: fam.token, adulto: paseFam, cuerpo })).status, 403, 'no superadmin ' + r);
    const sin = await api(m, r, { token: jefe.token, cuerpo });
    assert.equal(sin.status, 401, 'sin pase ' + r); assert.equal(sin.json.codigo, 'adulto');
    assert.equal((await api(m, r, { token: jefe.token, adulto: paseFam, cuerpo })).status, 401, 'pase de otra cuenta ' + r);
    assert.equal((await api(m, r, { token: jefe.token, adulto: crearPaseAdulto(jefe.cuenta.id, -1).adultoToken, cuerpo })).status, 401, 'pase vencido ' + r);
  }
  // nada de eso cambió la cuenta de la familia
  assert.equal((await api('GET', '/api/yo', { token: fam.token })).status, 200);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM auditoria').get().n, 0);
});

const hoy = new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10), ayer = new Date(Date.now() - 29 * 3600000).toISOString().slice(0, 10);
await prueba('resumen y uso (horas por cuenta, niña, día y juego)', async () => {
  await api('PUT', '/api/progreso', { token: fam.token, cuerpo: { datos: { uso: { [hoy]: { total: 90, ninos: { Avelu: 60, Amara: 30 }, juegos: { 'carrera.html': 50, 'globos.html': 40 } }, [ayer]: { total: 30, ninos: { Avelu: 30 }, juegos: { 'carrera.html': 30 } }, '2020-01-01': { total: 999 } } } } });
  await api('PUT', '/api/progreso', { token: fam2.token, cuerpo: { datos: { uso: { [hoy]: { total: 12, ninos: { '=CMD()': 12 }, juegos: { 'cuento.html': 12 } }, basura: 5 } } } });
  const r = (await api('GET', '/api/admin/resumen', A())).json;
  assert.equal(r.ok, true); assert.equal(r.cuentas.total, 4); assert.equal(r.cuentas.nuevas7, 4); assert.equal(r.cuentas.nuevas30, 4);
  assert.ok(r.activas.hoy >= 3); assert.ok(r.activas.semana >= 3);
  assert.equal(r.familia.activas, 0); assert.equal(r.ingresoMes.monto, 0); assert.equal(r.ingresoMes.moneda, 'PEN');
  assert.deepEqual(r.cuentosIA, { hoy: 0, mes: 0 }); assert.deepEqual(r.voces, { cantidad: 0, mb: 0 }); assert.equal(r.salas.salas, 0);
  assert.equal(r.uso.horasHoy, 1.7); assert.equal(r.uso.dias.length, 30);
  const u = (await api('GET', '/api/admin/uso', A())).json;
  assert.equal(u.total, 132); assert.equal(u.dias.at(-1).dia, hoy); assert.equal(u.dias.at(-1).minutos, 102); assert.equal(u.dias.at(-1).cuentas, 2); assert.equal(u.dias.at(-2).minutos, 30);
  assert.equal(u.cuentas[0].email, 'fam@prueba.pe'); assert.equal(u.cuentas[0].minutos, 120); assert.equal(u.cuentas[0].horas, 2); assert.equal(u.cuentas[0].diasActivos, 2);
  assert.deepEqual(u.cuentas[0].ninos, [{ nombre: 'Avelu', minutos: 90 }, { nombre: 'Amara', minutos: 30 }]);
  assert.deepEqual(u.juegos[0], { juego: 'carrera', minutos: 80, horas: 1.3 });
  assert.equal(u.ninos[0].nombre, 'Avelu'); assert.equal(u.filas, undefined);
});

await prueba('uso en CSV', async () => {
  const r = await api('GET', '/api/admin/uso?formato=csv', A());
  assert.equal(r.status, 200); assert.match(r.headers.get('content-type'), /text\/csv/); assert.match(r.headers.get('content-disposition'), /avelu-uso-.*\.csv/);
  const lineas = r.texto.replace(/^﻿/, '').trim().split('\r\n');
  assert.equal(lineas[0], 'fecha,correo,cuenta,tipo,nombre,minutos,horas');
  assert.ok(lineas.includes(`${hoy},fam@prueba.pe,Familia Uno,total,,90,1.5`));
  assert.ok(lineas.includes(`${hoy},fam@prueba.pe,Familia Uno,niño,Avelu,60,1`));
  assert.ok(lineas.includes(`${ayer},fam@prueba.pe,Familia Uno,juego,carrera,30,0.5`));
  assert.ok(lineas.includes(`${hoy},dos@prueba.pe,Familia Dos,niño,'=CMD(),12,0.2`), 'sin fórmulas de Excel');
  assert.ok(!r.texto.includes('2020-01-01'));
});

let nueva, soloG;
await prueba('cuentas: lista, buscar, filtrar y detalle', async () => {
  const todas = (await api('GET', '/api/admin/cuentas', A())).json;
  assert.equal(todas.total, 4);
  const una = todas.cuentas.find(c => c.email === 'fam@prueba.pe');
  assert.equal(una.minutos30, 120); assert.equal(una.plan, 'gratis'); assert.equal(una.bloqueada, false); assert.ok(una.ultimoIngreso); assert.ok(una.ultimaActividad);
  assert.equal(JSON.stringify(todas).includes('hash'), false);
  assert.deepEqual((await api('GET', '/api/admin/cuentas?q=DOS@', A())).json.cuentas.map(c => c.email), ['dos@prueba.pe']);
  assert.deepEqual((await api('GET', '/api/admin/cuentas?q=familia%20uno', A())).json.cuentas.map(c => c.email), ['fam@prueba.pe']);
  assert.equal((await api('GET', '/api/admin/cuentas?filtro=familia', A())).json.total, 0);
  assert.deepEqual((await api('GET', '/api/admin/cuentas?filtro=google', A())).json.cuentas.map(c => c.email), ['jefe@prueba.pe']);
  const d = (await api('GET', '/api/admin/cuentas/' + fam.cuenta.id, A())).json;
  assert.equal(d.cuenta.email, 'fam@prueba.pe'); assert.equal(d.uso.dias.length, 30); assert.equal(d.uso.dias.at(-1).minutos, 90); assert.equal(d.sesiones, 1);
  assert.equal((await api('GET', '/api/admin/cuentas/cNoExiste99', A())).status, 404);
});

await prueba('crear cuenta: con contraseña temporal o solo Google', async () => {
  assert.equal((await api('POST', '/api/admin/cuentas', { ...A(), cuerpo: { email: 'malo', nombre: 'X' } })).status, 400);
  assert.equal((await api('POST', '/api/admin/cuentas', { ...A(), cuerpo: { email: 'fam@prueba.pe', nombre: 'X' } })).status, 409);
  const r = (await api('POST', '/api/admin/cuentas', { ...A(), cuerpo: { email: 'Nueva@Prueba.pe', nombre: 'Tía Rosa' } })).json;
  assert.equal(r.ok, true); assert.ok(r.claveTemporal.length >= 10); nueva = r;
  const entra = await api('POST', '/api/entrar', { cuerpo: { email: 'nueva@prueba.pe', clave: r.claveTemporal } });
  assert.equal(entra.status, 200); nueva.token = entra.json.token;
  const g = (await api('POST', '/api/admin/cuentas', { ...A(), cuerpo: { email: 'abuela@gmail.com', nombre: 'Abuela', soloGoogle: true } })).json;
  assert.equal(g.claveTemporal, undefined); assert.equal(g.cuenta.conClave, false); soloG = g.cuenta;
  // entra con Google sin crear otra cuenta
  const eg = await api('POST', '/api/google', { cuerpo: { credential: tokenGoogle({ sub: 'g-abuela', email: 'abuela@gmail.com' }) } });
  assert.equal(eg.status, 200); assert.equal(eg.json.cuenta.id, soloG.id);
  // una cuenta solo de Google no confirma con contraseña
  assert.equal((await api('POST', '/api/adulto', { token: eg.json.token, cuerpo: { clave: 'lo-que-sea' } })).status, 400);
});

await prueba('dar y quitar el plan Familia (con motivo)', async () => {
  const r = `/api/admin/cuentas/${fam.cuenta.id}/plan`;
  assert.equal((await api('POST', r, { ...A(), cuerpo: { plan: 'familia', hasta: '2099-01-01' } })).status, 400);                   // sin motivo
  assert.equal((await api('POST', r, { ...A(), cuerpo: { plan: 'familia', hasta: '2020-01-01', motivo: 'x' } })).status, 400);      // fecha pasada
  const hasta = new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10);
  const ok = (await api('POST', r, { ...A(), cuerpo: { plan: 'familia', hasta, motivo: 'Cortesía por probar' } })).json;
  assert.equal(ok.cuenta.plan, 'familia'); assert.equal(ok.cuenta.planHasta.slice(0, 7), new Date(hasta + 'T23:59:59-05:00').toISOString().slice(0, 7));
  assert.equal((await api('GET', '/api/yo', { token: fam.token })).json.cuenta.plan, 'familia');
  assert.equal((await api('GET', '/api/admin/resumen', A())).json.familia.activas, 1);
  assert.equal((await api('GET', '/api/admin/cuentas?filtro=familia', A())).json.total, 1);
  const quita = (await api('POST', r, { ...A(), cuerpo: { plan: 'gratis', motivo: 'Se acabó la promo' } })).json;
  assert.equal(quita.cuenta.plan, 'gratis');
  assert.equal((await api('GET', '/api/yo', { token: fam.token })).json.cuenta.plan, 'gratis');
});

await prueba('bloquear: no entra ni usa su sesión; desbloquear', async () => {
  const r = `/api/admin/cuentas/${nueva.cuenta.id}/bloquear`;
  assert.equal((await api('POST', r, { ...A(), cuerpo: { bloqueada: true, motivo: 'abuso' } })).json.cuenta.bloqueada, true);
  assert.equal((await api('GET', '/api/yo', { token: nueva.token })).status, 401);
  const e = await api('POST', '/api/entrar', { cuerpo: { email: 'nueva@prueba.pe', clave: nueva.claveTemporal } });
  assert.equal(e.status, 403); assert.match(e.json.error, /bloqueada/);
  // con Google tampoco
  await api('POST', `/api/admin/cuentas/${soloG.id}/bloquear`, { ...A(), cuerpo: { bloqueada: true } });
  assert.equal((await api('POST', '/api/google', { cuerpo: { credential: tokenGoogle({ sub: 'g-abuela', email: 'abuela@gmail.com' }) } })).status, 403);
  assert.equal((await api('GET', '/api/admin/cuentas?filtro=bloqueadas', A())).json.total, 2);
  // no se puede bloquear a quien administra
  assert.equal((await api('POST', `/api/admin/cuentas/${jefe.cuenta.id}/bloquear`, { ...A(), cuerpo: { bloqueada: true } })).status, 400);
  assert.equal((await api('POST', r, { ...A(), cuerpo: { bloqueada: false } })).json.cuenta.bloqueada, false);
  const otra = await api('POST', '/api/entrar', { cuerpo: { email: 'nueva@prueba.pe', clave: nueva.claveTemporal } });
  assert.equal(otra.status, 200); nueva.token = otra.json.token;
});

await prueba('contraseña temporal', async () => {
  const r = (await api('POST', `/api/admin/cuentas/${nueva.cuenta.id}/clave`, A())).json;
  assert.ok(r.claveTemporal && r.claveTemporal !== nueva.claveTemporal);
  assert.equal((await api('GET', '/api/yo', { token: nueva.token })).status, 401);                                    // se cerraron sus sesiones
  assert.equal((await api('POST', '/api/entrar', { cuerpo: { email: 'nueva@prueba.pe', clave: nueva.claveTemporal } })).status, 401);
  assert.equal((await api('POST', '/api/entrar', { cuerpo: { email: 'nueva@prueba.pe', clave: r.claveTemporal } })).status, 200);
});

await prueba('pagos: lista, revisar con Mercado Pago, cancelar y diagnóstico', async () => {
  assert.ok((await api('POST', '/api/suscripcion/crear', { token: fam2.token, cuerpo: {} })).json.url);
  let p = (await api('GET', '/api/admin/pagos', A())).json;
  assert.equal(p.proveedor, 'mercadopago'); assert.equal(p.suscripciones.length, 1);
  assert.deepEqual([p.suscripciones[0].email, p.suscripciones[0].estado, p.suscripciones[0].monto, p.suscripciones[0].moneda, p.suscripciones[0].proxima], ['dos@prueba.pe', 'pending', 19.9, 'PEN', null]);
  assert.deepEqual([p.eventos[0].tipo, p.eventos[0].email], ['creada', 'dos@prueba.pe']);
  // Mercado Pago ya cobró: "Revisar" lo trae sin esperar el aviso
  const prox = new Date(Date.now() + 30 * 86400000).toISOString();
  Object.assign(estados.pre9, { status: 'authorized', next_payment_date: prox });
  const rev = (await api('POST', '/api/admin/pagos/revisar/' + fam2.cuenta.id, A())).json;
  assert.equal(rev.cuenta.plan, 'familia'); assert.equal(rev.cuenta.suscripcionEstado, 'authorized');
  p = (await api('GET', '/api/admin/pagos', A())).json;
  assert.equal(p.suscripciones[0].activa, true); assert.ok(new Date(p.suscripciones[0].proxima) > new Date(prox));
  const res = (await api('GET', '/api/admin/resumen', A())).json;
  assert.equal(res.familia.pagando, 1); assert.equal(res.ingresoMes.monto, 19.9);
  assert.equal((await api('GET', '/api/admin/cuentas?filtro=pagando', A())).json.total, 1);
  assert.equal((await api('POST', '/api/admin/pagos/revisar/' + fam.cuenta.id, A())).status, 400);              // sin suscripción
  const can = (await api('POST', '/api/admin/pagos/cancelar/' + fam2.cuenta.id, A())).json;
  assert.equal(can.cuenta.suscripcionEstado, 'cancelled'); assert.equal(estados.pre9.status, 'cancelled'); assert.equal(can.cuenta.plan, 'familia');
  const d = (await api('GET', '/api/admin/pagos/diagnostico', A())).json.diagnostico;
  assert.deepEqual([d.tipoToken, d.tokenValido, d.siteId, d.paisOk, d.configurado], ['prueba', true, 'MPE', true, true]);
  assert.equal(JSON.stringify(d).includes('TEST-TOKEN'), false);
});

await prueba('borrar una cuenta pide su correo exacto', async () => {
  const r = '/api/admin/cuentas/' + nueva.cuenta.id;
  assert.equal((await api('DELETE', r, { ...A(), cuerpo: { email: 'otra@prueba.pe' } })).status, 400);
  assert.equal((await api('DELETE', '/api/admin/cuentas/' + jefe.cuenta.id, { ...A(), cuerpo: { email: 'jefe@prueba.pe' } })).status, 400);
  assert.equal((await api('DELETE', r, { ...A(), cuerpo: { email: 'nueva@prueba.pe' } })).json.ok, true);
  assert.equal((await api('GET', r, A())).status, 404);
  assert.equal((await api('POST', '/api/entrar', { cuerpo: { email: 'nueva@prueba.pe', clave: 'da-igual-123' } })).status, 401);
});

await prueba('salud', async () => {
  fs.mkdirSync(path.join(dir, 'respaldos')); fs.writeFileSync(path.join(dir, 'respaldos', 'datos-20260101-0317.db'), 'x');
  const s = (await api('GET', '/api/admin/salud', A())).json;
  assert.ok(s.version); assert.ok(s.encendidoSeg >= 0); assert.equal(s.ia.disponible, true); assert.equal(s.pagos.configurado, true);
  assert.ok(s.datos.mb >= 0 && s.datos.archivos >= 1); assert.ok(s.respaldo); assert.equal(s.google, true); assert.equal(s.superadmins, 2);
  assert.equal(JSON.stringify(s).includes('TEST-TOKEN'), false);
});

await prueba('auditoría: quién, cuándo, qué y a quién', async () => {
  const a = (await api('GET', '/api/admin/auditoria', A())).json.registros;
  const acciones = a.map(x => x.accion);
  for (const x of ['exportar_uso', 'crear_cuenta', 'dar_familia', 'quitar_familia', 'bloquear', 'desbloquear', 'clave_temporal', 'revisar_pago', 'cancelar_suscripcion', 'diagnostico_pagos', 'borrar_cuenta'])
    assert.ok(acciones.includes(x), 'falta ' + x);
  assert.ok(a.every(x => x.quien === 'jefe@prueba.pe' && !isNaN(new Date(x.cuando))));
  const dar = a.find(x => x.accion === 'dar_familia'); assert.equal(dar.objetivo, 'fam@prueba.pe'); assert.match(dar.detalle, /Cortesía por probar/);
  assert.equal(a.find(x => x.accion === 'borrar_cuenta').objetivo, 'nueva@prueba.pe');
  assert.equal(JSON.stringify(a).includes(nueva.claveTemporal), false, 'las contraseñas temporales no se anotan');
  assert.equal((await api('GET', '/api/admin/auditoria?limite=2', A())).json.registros.length, 2);
});

console.log(`\n${pasaron} pasaron, ${fallos} fallaron`);
servidor.close(); mp.close(); jwksSrv.close(); fs.rmSync(dir, { recursive: true, force: true });
process.exit(fallos ? 1 : 0);
