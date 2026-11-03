// Pruebas del servidor: node --no-warnings pruebas.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avelu-'));
Object.assign(process.env, {
  DATA_DIR: dir, IA_FALSA: '1', PAGOS_PROVEEDOR: 'ninguno', PLAN_GRATIS_PARA: 'papa@prueba.pe',
  ORIGENES: 'https://jherreraxp.github.io', LATIDO_MS: '200000',
});
const { crearServidor } = await import('./servidor.mjs');
const { default: WebSocket } = await import('ws');
const { servidor } = crearServidor();
await new Promise(ok => servidor.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${servidor.address().port}`;

let fallos = 0, pasaron = 0;
async function prueba(nombre, fn) {
  try { await fn(); pasaron++; console.log('✔', nombre); } catch (e) { fallos++; console.log('✘', nombre, '\n  ', e.message); }
}
async function api(metodo, ruta, { token, cuerpo, tipo, crudo, ip } = {}) {
  const h = {};
  if (token) h.Authorization = 'Bearer ' + token;
  if (ip) h['X-Forwarded-For'] = ip;
  let body;
  if (crudo) { body = crudo; h['Content-Type'] = tipo; } else if (cuerpo !== undefined) { body = JSON.stringify(cuerpo); h['Content-Type'] = 'application/json'; }
  const r = await fetch(base + ruta, { method: metodo, headers: h, body });
  const ct = r.headers.get('content-type') || '';
  return { status: r.status, json: ct.includes('json') ? await r.json() : null, buf: ct.includes('json') ? null : Buffer.from(await r.arrayBuffer()), headers: r.headers };
}

let mama, papa;
await prueba('salud', async () => { const r = await api('GET', '/api/salud'); assert.equal(r.json.ok, true); assert.ok(r.json.version); });
await prueba('registro valida datos', async () => {
  const r = await api('POST', '/api/registro', { cuerpo: { email: 'malo', clave: '12345678', nombre: 'X', acepto: true }, ip: '1.1.1.1' });
  assert.equal(r.status, 400);
  const r2 = await api('POST', '/api/registro', { cuerpo: { email: 'a@b.pe', clave: '123', nombre: 'X', acepto: true }, ip: '1.1.1.1' });
  assert.equal(r2.status, 400);
  const r3 = await api('POST', '/api/registro', { cuerpo: { email: 'a@b.pe', clave: '12345678', nombre: 'X' }, ip: '1.1.1.1' });
  assert.equal(r3.status, 400);
});
await prueba('registro y entrar', async () => {
  const r = await api('POST', '/api/registro', { cuerpo: { email: 'Mama@Prueba.pe', clave: 'clave-segura', nombre: 'Mamá', acepto: true }, ip: '1.1.1.2' });
  assert.equal(r.json.ok, true, JSON.stringify(r.json)); assert.ok(r.json.token); assert.equal(r.json.cuenta.plan, 'gratis'); assert.equal(r.json.cuenta.email, 'mama@prueba.pe');
  mama = r.json.token;
  const dup = await api('POST', '/api/registro', { cuerpo: { email: 'mama@prueba.pe', clave: 'otra-clave1', nombre: 'M', acepto: true }, ip: '1.1.1.2' });
  assert.equal(dup.status, 409);
  const mal = await api('POST', '/api/entrar', { cuerpo: { email: 'mama@prueba.pe', clave: 'equivocada' }, ip: '1.1.1.2' });
  assert.equal(mal.status, 401);
  const e = await api('POST', '/api/entrar', { cuerpo: { email: 'mama@prueba.pe', clave: 'clave-segura' }, ip: '1.1.1.2' });
  assert.equal(e.json.ok, true); assert.ok(e.json.token);
  const p = await api('POST', '/api/registro', { cuerpo: { email: 'papa@prueba.pe', clave: 'clave-papa1', nombre: 'Papá', acepto: true }, ip: '1.1.1.3' });
  papa = p.json.token; assert.equal(p.json.cuenta.plan, 'familia');
});
await prueba('yo, perfiles y progreso', async () => {
  const y = await api('GET', '/api/yo', { token: mama }); assert.equal(y.json.cuenta.nombre, 'Mamá');
  assert.equal((await api('GET', '/api/yo')).status, 401);
  const p = await api('PUT', '/api/perfiles', { token: mama, cuerpo: { perfiles: [{ id: 'avelu', nombre: 'Avelu Molina', personaje: 'nieve' }, { nombre: 'Amara', personaje: 'zoe' }] } });
  assert.equal(p.json.cuenta.perfiles.length, 2); assert.equal(p.json.cuenta.perfiles[0].nombre, 'Avelu'); // solo el primer nombre
  const demas = await api('PUT', '/api/perfiles', { token: mama, cuerpo: { perfiles: Array(7).fill({ nombre: 'x' }) } }); assert.equal(demas.status, 400);
  await api('PUT', '/api/progreso', { token: mama, cuerpo: { datos: { estrellas: 12, nivel: { carrera: 2 } } } });
  const g = await api('GET', '/api/progreso', { token: mama }); assert.equal(g.json.datos.estrellas, 12);
});
await prueba('CORS solo para el juego', async () => {
  const r = await fetch(base + '/api/salud', { headers: { Origin: 'https://jherreraxp.github.io' } });
  assert.equal(r.headers.get('access-control-allow-origin'), 'https://jherreraxp.github.io');
  const r2 = await fetch(base + '/api/salud', { headers: { Origin: 'https://malo.com' } });
  assert.equal(r2.headers.get('access-control-allow-origin'), null);
});
await prueba('cuentos gratis y premium', async () => {
  const sin = await api('GET', '/api/cuentos');
  assert.equal(sin.json.cuentos.length, 12);
  const libres = sin.json.cuentos.filter(c => !c.bloqueado); assert.equal(libres.length, 3); assert.ok(libres[0].paginas.length >= 6);
  assert.ok(sin.json.cuentos.filter(c => c.bloqueado).every(c => c.paginas.length === 0));
  const g = await api('GET', '/api/cuentos', { token: mama }); assert.equal(g.json.cuentos.filter(c => !c.bloqueado).length, 3);
  const f = await api('GET', '/api/cuentos', { token: papa }); assert.equal(f.json.cuentos.filter(c => !c.bloqueado).length, 12);
});
await prueba('cuento con IA (falsa) solo plan familia', async () => {
  const no = await api('POST', '/api/cuentos/ia', { token: mama, cuerpo: { protagonistas: ['Avelu'] } }); assert.equal(no.status, 402);
  const si = await api('POST', '/api/cuentos/ia', { token: papa, cuerpo: { protagonistas: ['Avelu', 'Papá'], tema: 'la playa' } });
  assert.equal(si.json.ok, true, JSON.stringify(si.json)); assert.match(si.json.cuento.titulo, /Avelu/); assert.ok(si.json.cuento.paginas.length >= 3);
  const lista = await api('GET', '/api/cuentos', { token: papa }); assert.ok(lista.json.cuentos.some(c => c.ia && c.id === si.json.cuento.id));
  const vacio = await api('POST', '/api/cuentos/ia', { token: papa, cuerpo: { protagonistas: [] } }); assert.equal(vacio.status, 400);
});
await prueba('voces privadas por familia', async () => {
  const audio = Buffer.alloc(2000, 7);
  const no = await api('PUT', '/api/voces/' + encodeURIComponent('¡Hola!'), { token: mama, crudo: audio, tipo: 'audio/wav' }); assert.equal(no.status, 402);
  const sube = await api('PUT', '/api/voces/' + encodeURIComponent('¡Hola!'), { token: papa, crudo: audio, tipo: 'audio/wav' });
  assert.equal(sube.json.ok, true, JSON.stringify(sube.json));
  const malTipo = await api('PUT', '/api/voces/x', { token: papa, crudo: audio, tipo: 'text/html' }); assert.equal(malTipo.status, 415);
  const lista = await api('GET', '/api/voces', { token: papa }); const url = lista.json.lista['¡Hola!']; assert.ok(url);
  const baja = await api('GET', url, { token: papa }); assert.equal(baja.status, 200); assert.equal(baja.buf.length, 2000);
  const conQuery = await api('GET', url + '?token=' + papa); assert.equal(conQuery.status, 200);
  // otra familia (con plan) no puede leerla
  const r = await api('POST', '/api/registro', { cuerpo: { email: 'otra@prueba.pe', clave: 'clave-otra1', nombre: 'Otra', acepto: true }, ip: '1.1.1.4' });
  process.env.PLAN_GRATIS_PARA = ''; // (no afecta: la config se leyó al inicio)
  const ajena = await api('GET', url, { token: r.json.token }); assert.ok([402, 404].includes(ajena.status));
  const sinToken = await api('GET', url); assert.equal(sinToken.status, 401);
  await api('DELETE', '/api/voces/' + encodeURIComponent('¡Hola!'), { token: papa });
  const despues = await api('GET', '/api/voces', { token: papa }); assert.equal(Object.keys(despues.json.lista).length, 0);
});
await prueba('suscripción sin proveedor configurado', async () => {
  const r = await api('POST', '/api/suscripcion/crear', { token: mama }); assert.equal(r.status, 503);
  const w = await api('POST', '/api/pagos/webhook?type=preapproval&data.id=123', { cuerpo: { type: 'preapproval' } }); assert.equal(w.status, 200);
});

function conectar(token) {
  return new Promise((ok, no) => {
    const ws = new WebSocket(base.replace('http', 'ws') + '/ws?token=' + token, { headers: { Origin: 'https://jherreraxp.github.io' } });
    ws.recibidos = [];
    ws.on('message', d => ws.recibidos.push(JSON.parse(d)));
    ws.on('open', () => ok(ws)); ws.on('error', no);
    ws.espera = (t, ms = 2000) => new Promise((ok2, no2) => {
      const ini = Date.now();
      const mira = () => { const i = ws.recibidos.findIndex(m => m.t === t); if (i >= 0) return ok2(ws.recibidos.splice(i, 1)[0]); if (Date.now() - ini > ms) return no2(new Error('no llegó ' + t)); setTimeout(mira, 20); };
      mira();
    });
    ws.manda = m => ws.send(JSON.stringify(m));
  });
}
await prueba('jugar en línea: salas', async () => {
  await assert.rejects(conectar('malo'));
  const a = await conectar(mama), b = await conectar(papa);
  a.manda({ t: 'crear' }); const sala = await a.espera('sala'); assert.match(sala.codigo, /^[A-Z]+-\d{2}$/);
  a.manda({ t: 'hola', nombre: 'Avelu', personaje: 'nieve' });
  a.manda({ t: 'mundo', items: [{ t: 'b', k: 'cubo', c: 'rosa', x: 0, y: 0, z: 0 }] });
  a.manda({ t: 'poner', item: { t: 'b', k: 'cubo', c: 'lila', x: 1, y: 0, z: 0 } });
  a.manda({ t: 'pintar', x: 0, y: 0, z: 0, c: 'aqua' });
  await new Promise(r => setTimeout(r, 150));
  b.manda({ t: 'unirse', codigo: sala.codigo.toLowerCase() });
  const s2 = await b.espera('sala');
  assert.equal(s2.mundo.length, 2); assert.equal(s2.mundo.find(i => i.x === 0).c, 'aqua'); // el mundo llega a quien entra tarde
  assert.equal(s2.jugadores.length, 2);
  const entra = await a.espera('entra'); assert.equal(entra.jugador.id, s2.yo);
  b.manda({ t: 'pos', x: 1.5, y: 0, z: 2, dir: 1, modo: 'correr' });
  const pos = await a.espera('pos'); assert.equal(pos.de, s2.yo); assert.equal(pos.x, 1.5);
  b.manda({ t: 'borrar', x: 1, y: 0, z: 0 }); const br = await a.espera('borrar'); assert.equal(br.x, 1);
  b.manda({ t: 'saludo', emoji: '❤️' }); assert.equal((await a.espera('saludo')).emoji, '❤️');
  const c = await conectar(papa); c.manda({ t: 'unirse', codigo: 'NADA-00' }); assert.ok((await c.espera('error')).error);
  b.close(); const sale = await a.espera('sale'); assert.equal(sale.id, s2.yo);
  a.close(); c.close();
});
await prueba('límite de intentos al entrar', async () => {
  let ultimo;
  for (let i = 0; i < 12; i++) ultimo = await api('POST', '/api/entrar', { cuerpo: { email: 'x@y.pe', clave: 'nada-nada' }, ip: '9.9.9.9' });
  assert.equal(ultimo.status, 429);
});
await prueba('borrar cuenta borra todo', async () => {
  await api('PUT', '/api/voces/adios', { token: papa, crudo: Buffer.alloc(500, 1), tipo: 'audio/webm' });
  const no = await api('DELETE', '/api/cuenta', { token: papa, cuerpo: { clave: 'equivocada' } }); assert.equal(no.status, 401);
  const yo = (await api('GET', '/api/yo', { token: papa })).json.cuenta;
  const r = await api('DELETE', '/api/cuenta', { token: papa, cuerpo: { clave: 'clave-papa1' } }); assert.equal(r.json.ok, true);
  assert.equal((await api('GET', '/api/yo', { token: papa })).status, 401);
  assert.equal(fs.existsSync(path.join(dir, 'voces', yo.id)), false);
});
await prueba('rutas desconocidas y JSON malo', async () => {
  assert.equal((await api('GET', '/api/nada')).status, 404);
  const r = await fetch(base + '/api/entrar', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '5.5.5.5' }, body: '{malo' });
  assert.equal(r.status, 400); const j = await r.json(); assert.equal(j.ok, false); assert.ok(!/at |Error/.test(j.error));
});

servidor.close();
fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n${pasaron} pasaron, ${fallos} fallaron`);
process.exit(fallos ? 1 : 0);
