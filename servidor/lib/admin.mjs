// Panel de administración del servicio (panel.html). Solo para los correos de SUPERADMIN_EMAILS,
// con sesión iniciada Y con la confirmación de adulto reciente (cabecera X-Adulto: contraseña o Google,
// nunca el PIN). Todo lo que se cambia desde aquí queda anotado en la tabla "auditoria".
import fs from 'node:fs';
import path from 'node:path';
import { config, VERSION } from './config.mjs';
import {
  db, cuentaPorId, cuentaPorEmail, nuevaCuenta, planDe, guardarPlan, borrarCuenta, borrarSesionesDe,
  esSuperadmin, auditar,
} from './db.mjs';
import { paseAdultoValido } from './adulto.mjs';
import { ErrorUsuario, log, hashClave, emailValido, textoCorto, aleatorio, limitar } from './util.mjs';
import { cancelarSuscripcion, revisar, diagnosticoMercadoPago, ultimoErrorPagos } from './pagos.mjs';
import { salasAhora } from './salas.mjs';
import { configIA, resumenIA } from './ia.mjs';

// los días del juego son los de Perú (UTC-5, sin horario de verano)
const diaLima = (masDias = 0) => new Date(Date.now() - 5 * 3600000 + masDias * 86400000).toISOString().slice(0, 10);
const haceDias = d => new Date(Date.now() - d * 86400000).toISOString();
const num = (v, max = 1440) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.min(max, Math.round(n)) : 0; };
const horas = min => Math.round(min / 6) / 10;
const ACTIVA = /^(authorized|ACTIVE)$/;
const claveTemporal = () => aleatorio(9).replace(/[-_]/g, 'x').slice(0, 10) + (Math.floor(Math.random() * 90) + 10);

// ---------- uso: lo que cada familia subió con su progreso (progress.uso) ----------
function leerUso(dias = 30) {
  const desde = diaLima(-(dias - 1));
  const porDia = new Map(), juegos = new Map(), cuentas = [], ninos = [], filas = [];
  for (let i = dias - 1; i >= 0; i--) porDia.set(diaLima(-i), { dia: diaLima(-i), minutos: 0, cuentas: 0 });
  const todas = db.prepare('SELECT p.cuenta_id AS id, p.datos, c.email, c.nombre, c.ultima_actividad FROM progreso p JOIN cuentas c ON c.id = p.cuenta_id').all();
  for (const f of todas) {
    let uso; try { uso = JSON.parse(f.datos)?.uso; } catch {}
    if (!uso || typeof uso !== 'object') continue;
    const c = { id: f.id, email: f.email, nombre: f.nombre, minutos: 0, diasActivos: 0, ninos: {}, juegos: {}, ultimaActividad: f.ultima_actividad || null };
    for (const [dia, u] of Object.entries(uso)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || dia < desde || !porDia.has(dia) || !u || typeof u !== 'object') continue;
      const total = num(u.total); if (!total) continue;
      c.minutos += total; c.diasActivos++;
      const d = porDia.get(dia); d.minutos += total; d.cuentas++;
      filas.push({ dia, email: f.email, cuenta: f.nombre, tipo: 'total', nombre: '', minutos: total });
      for (const [n, m] of Object.entries(u.ninos || {}).slice(0, 12)) {
        const nombre = String(n).slice(0, 30), min = num(m); if (!min) continue;
        c.ninos[nombre] = (c.ninos[nombre] || 0) + min;
        filas.push({ dia, email: f.email, cuenta: f.nombre, tipo: 'niño', nombre, minutos: min });
      }
      for (const [j, m] of Object.entries(u.juegos || {}).slice(0, 60)) {
        const juego = String(j).replace(/\.html$/, '').slice(0, 40), min = num(m); if (!min) continue;
        c.juegos[juego] = (c.juegos[juego] || 0) + min;
        juegos.set(juego, (juegos.get(juego) || 0) + min);
        filas.push({ dia, email: f.email, cuenta: f.nombre, tipo: 'juego', nombre: juego, minutos: min });
      }
    }
    if (!c.minutos) continue;
    for (const [nombre, minutos] of Object.entries(c.ninos)) ninos.push({ cuentaId: c.id, email: c.email, nombre, minutos, horas: horas(minutos) });
    cuentas.push({ ...c, horas: horas(c.minutos) });
  }
  cuentas.sort((a, b) => b.minutos - a.minutos); ninos.sort((a, b) => b.minutos - a.minutos);
  filas.sort((a, b) => a.dia < b.dia ? 1 : a.dia > b.dia ? -1 : a.email.localeCompare(b.email));
  const total = cuentas.reduce((n, c) => n + c.minutos, 0);
  return { desde, dias: [...porDia.values()], cuentas, ninos, juegos: [...juegos].map(([juego, minutos]) => ({ juego, minutos, horas: horas(minutos) })).sort((a, b) => b.minutos - a.minutos), filas, total, totalHoras: horas(total) };
}
// CSV que abre bien en Excel (con BOM) y sin fórmulas escondidas
const celda = v => { let t = String(v ?? ''); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return /[",\n;]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
const csv = (cab, filas) => '﻿' + [cab, ...filas].map(f => f.map(celda).join(',')).join('\r\n') + '\r\n';

// ---------- cuentas ----------
function filaCuenta(c, minutos = 0) {
  const p = planDe(c);
  let perfiles = []; try { perfiles = JSON.parse(c.perfiles || '[]'); } catch {}
  return {
    id: c.id, email: c.email, nombre: c.nombre, creada: c.creada, plan: p.plan, planHasta: p.planHasta,
    cortesia: config.gratisPara.includes(c.email), proveedor: c.proveedor || '', suscripcionId: c.suscripcion_id ? String(c.suscripcion_id).slice(0, 8) + '…' : '',
    suscripcionEstado: c.suscripcion_estado || '', bloqueada: !!c.bloqueada, google: !!c.google_sub, conClave: c.hash !== '!',
    superadmin: esSuperadmin(c), ultimoIngreso: c.ultimo_ingreso || null, ultimaActividad: c.ultima_actividad || null,
    perfiles: perfiles.map(x => ({ nombre: x.nombre, personaje: x.personaje })), minutos30: minutos, horas30: horas(minutos),
  };
}
function cuentaObjetivo(id) {
  const c = cuentaPorId(id);
  if (!c) throw new ErrorUsuario('No encontré esa cuenta.', 404);
  return c;
}
function tamanoDe(dir, tope = 20000) {
  let bytes = 0, archivos = 0;
  const andar = d => {
    let lista = []; try { lista = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of lista) {
      if (archivos >= tope) return;
      const f = path.join(d, e.name);
      if (e.isDirectory()) andar(f);
      else if (e.isFile()) { try { bytes += fs.statSync(f).size; archivos++; } catch {} }
    }
  };
  andar(dir);
  return { bytes, archivos };
}
const MB = b => Math.round(b / 104857.6) / 10;

export function rutasAdmin({ ruta, necesitaCuenta, leerJSON, ipDe }) {
  // sesión + dueño del servicio + confirmación de adulto reciente
  function admin(req) {
    const c = necesitaCuenta(req);
    if (!esSuperadmin(c)) throw new ErrorUsuario('Esto es solo para quien administra el servicio.', 403);
    if (!limitar('adm:' + c.id, 240, 60000)) throw new ErrorUsuario('Muchas consultas. Espera un minuto.', 429);
    if (!paseAdultoValido(req.headers['x-adulto'], c.id)) {
      const e = new ErrorUsuario('Confirma que eres tú con tu contraseña o con Google.', 401); e.codigo = 'adulto'; throw e;
    }
    return c;
  }
  const anotar = (yo, accion, objetivo, detalle) => { auditar(yo.email, accion, objetivo, detalle); log('admin', { accion, por: yo.id }); };

  ruta('GET', '/api/admin/resumen', async (req) => {
    admin(req);
    const uno = (sql, ...a) => db.prepare(sql).get(...a).n;
    const todas = db.prepare('SELECT * FROM cuentas').all();
    const familia = todas.filter(c => planDe(c).plan === 'familia');
    const pagando = todas.filter(c => ACTIVA.test(c.suscripcion_estado || '') && planDe(c).plan === 'familia' && !config.gratisPara.includes(c.email));
    const hoy = diaLima(), mes = hoy.slice(0, 7), inicioHoy = new Date(hoy + 'T05:00:00.000Z').toISOString();
    const voces = db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(bytes), 0) AS b FROM voces').get();
    const uso = leerUso(30);
    return {
      ok: true,
      cuentas: { total: todas.length, nuevas7: todas.filter(c => c.creada >= haceDias(7)).length, nuevas30: todas.filter(c => c.creada >= haceDias(30)).length, bloqueadas: todas.filter(c => c.bloqueada).length },
      activas: { hoy: todas.filter(c => (c.ultima_actividad || '') >= inicioHoy).length, semana: todas.filter(c => (c.ultima_actividad || '') >= haceDias(7)).length },
      familia: { activas: familia.length, pagando: pagando.length, cortesia: familia.length - pagando.length },
      ingresoMes: { monto: Math.round(pagando.length * Number(config.mp.precio) * 100) / 100, moneda: config.mp.moneda, nota: 'Estimado: familias que pagan × precio del plan.' },
      cuentosIA: { hoy: uno('SELECT COUNT(*) AS n FROM cuentos_ia WHERE dia = ?', new Date().toISOString().slice(0, 10)), mes: uno('SELECT COUNT(*) AS n FROM cuentos_ia WHERE dia LIKE ?', mes + '%') },
      voces: { cantidad: voces.n, mb: MB(voces.b) },
      salas: salasAhora(),
      uso: { horasHoy: horas(uso.dias.at(-1)?.minutos || 0), horas7: horas(uso.dias.slice(-7).reduce((n, d) => n + d.minutos, 0)), horas30: uso.totalHoras, dias: uso.dias },
    };
  });

  ruta('GET', '/api/admin/uso', async (req, url, p, res) => {
    const yo = admin(req);
    const dias = Math.min(30, Math.max(1, Number(url.searchParams.get('dias')) || 30));
    const u = leerUso(dias);
    if (url.searchParams.get('formato') === 'csv') {
      anotar(yo, 'exportar_uso', '', `${u.filas.length} filas`);
      const texto = csv(['fecha', 'correo', 'cuenta', 'tipo', 'nombre', 'minutos', 'horas'], u.filas.map(f => [f.dia, f.email, f.cuenta, f.tipo, f.nombre, f.minutos, horas(f.minutos)]));
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="avelu-uso-${diaLima()}.csv"`, 'Cache-Control': 'no-store' });
      res.end(texto);
      return null;
    }
    const { filas, ...resto } = u;
    return { ok: true, ...resto, cuentas: u.cuentas.map(c => ({ ...c, ninos: Object.entries(c.ninos).map(([nombre, minutos]) => ({ nombre, minutos })), juegos: Object.entries(c.juegos).map(([juego, minutos]) => ({ juego, minutos })).sort((a, b) => b.minutos - a.minutos) })) };
  });

  ruta('GET', '/api/admin/cuentas', async (req, url) => {
    admin(req);
    const q = (url.searchParams.get('q') || '').trim().toLowerCase().slice(0, 80), filtro = url.searchParams.get('filtro') || 'todas';
    const minutos = new Map(leerUso(30).cuentas.map(c => [c.id, c.minutos]));
    let lista = db.prepare('SELECT * FROM cuentas ORDER BY creada DESC').all().map(c => filaCuenta(c, minutos.get(c.id) || 0));
    if (q) lista = lista.filter(c => c.email.includes(q) || c.nombre.toLowerCase().includes(q) || c.id.toLowerCase() === q);
    const filtros = { familia: c => c.plan === 'familia', gratis: c => c.plan !== 'familia', bloqueadas: c => c.bloqueada, google: c => c.google, pagando: c => ACTIVA.test(c.suscripcionEstado) };
    if (filtros[filtro]) lista = lista.filter(filtros[filtro]);
    return { ok: true, total: lista.length, cuentas: lista.slice(0, 500) };
  });

  ruta('GET', '/api/admin/cuentas/(?<id>c[\\w-]{4,40})', async (req, url, p) => {
    admin(req);
    const c = cuentaObjetivo(p.id);
    const uso = leerUso(30), suya = uso.cuentas.find(x => x.id === c.id);
    const dias = new Map(uso.dias.map(d => [d.dia, 0]));
    for (const f of uso.filas) if (f.tipo === 'total' && f.email === c.email) dias.set(f.dia, f.minutos);
    const voces = db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(bytes), 0) AS b FROM voces WHERE cuenta_id = ?').get(c.id);
    return {
      ok: true, cuenta: filaCuenta(c, suya?.minutos || 0),
      uso: { dias: [...dias].map(([dia, minutos]) => ({ dia, minutos })), ninos: Object.entries(suya?.ninos || {}).map(([nombre, minutos]) => ({ nombre, minutos })), juegos: Object.entries(suya?.juegos || {}).map(([juego, minutos]) => ({ juego, minutos })).sort((a, b) => b.minutos - a.minutos) },
      voces: { cantidad: voces.n, mb: MB(voces.b) },
      cuentosIA: db.prepare('SELECT COUNT(*) AS n FROM cuentos_ia WHERE cuenta_id = ?').get(c.id).n,
      sesiones: db.prepare('SELECT COUNT(*) AS n FROM sesiones WHERE cuenta_id = ? AND vence > ?').get(c.id, Date.now()).n,
      pagos: db.prepare('SELECT proveedor, estado, tipo, recibido FROM pagos_eventos WHERE cuenta_id = ? ORDER BY id DESC LIMIT 20').all(c.id),
      auditoria: db.prepare('SELECT cuando, quien, accion, detalle FROM auditoria WHERE objetivo = ? ORDER BY id DESC LIMIT 20').all(c.email),
    };
  });

  // crear una cuenta para otra familia: con contraseña temporal (se muestra una sola vez) o solo con Google
  ruta('POST', '/api/admin/cuentas', async (req) => {
    const yo = admin(req);
    const { email, nombre, soloGoogle } = await leerJSON(req);
    const e = String(email || '').trim().toLowerCase();
    if (!emailValido(e)) throw new ErrorUsuario('Escribe un correo válido.');
    if (!textoCorto(nombre, 60)) throw new ErrorUsuario('Escribe el nombre de la persona.');
    if (cuentaPorEmail(e)) throw new ErrorUsuario('Ese correo ya tiene una cuenta.', 409);
    let temporal = null, id;
    if (soloGoogle === true) id = nuevaCuenta({ email: e, nombre: nombre.trim(), sal: '-', hash: '!' });
    else { temporal = claveTemporal(); id = nuevaCuenta({ email: e, nombre: nombre.trim(), ...hashClave(temporal) }); }
    anotar(yo, 'crear_cuenta', e, soloGoogle === true ? 'solo Google' : 'con contraseña temporal');
    return { ok: true, cuenta: filaCuenta(cuentaPorId(id)), ...(temporal ? { claveTemporal: temporal } : {}) };
  });

  // dar o quitar el plan Familia a mano (cortesía, promoción, arreglo de un pago)
  ruta('POST', '/api/admin/cuentas/(?<id>c[\\w-]{4,40})/plan', async (req, url, p) => {
    const yo = admin(req), c = cuentaObjetivo(p.id);
    const { plan, hasta, motivo } = await leerJSON(req);
    const m = String(motivo || '').trim().slice(0, 200);
    if (!m) throw new ErrorUsuario('Escribe el motivo (queda anotado).');
    if (plan === 'familia') {
      const f = new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(hasta)) ? hasta + 'T23:59:59-05:00' : hasta);
      if (!hasta || isNaN(f) || f <= new Date()) throw new ErrorUsuario('Elige hasta qué fecha (debe ser una fecha futura).');
      if (f > new Date(Date.now() + 5 * 366 * 86400000)) throw new ErrorUsuario('Como máximo 5 años.');
      guardarPlan(c.id, { plan: 'familia', hasta: f.toISOString() });
      anotar(yo, 'dar_familia', c.email, `hasta ${f.toISOString().slice(0, 10)} · ${m}`);
    } else if (plan === 'gratis') {
      guardarPlan(c.id, { plan: 'gratis', hasta: null });
      anotar(yo, 'quitar_familia', c.email, m);
    } else throw new ErrorUsuario('El plan debe ser familia o gratis.');
    const aviso = plan === 'gratis' && ACTIVA.test(c.suscripcion_estado || '') ? 'Ojo: esta cuenta tiene una suscripción activa que se sigue cobrando. Cancélala en Pagos.' : undefined;
    return { ok: true, cuenta: filaCuenta(cuentaPorId(c.id)), aviso };
  });

  ruta('POST', '/api/admin/cuentas/(?<id>c[\\w-]{4,40})/bloquear', async (req, url, p) => {
    const yo = admin(req), c = cuentaObjetivo(p.id);
    const { bloqueada, motivo } = await leerJSON(req);
    if (bloqueada === true) {
      if (c.id === yo.id || esSuperadmin(c)) throw new ErrorUsuario('No se puede bloquear a quien administra el servicio.');
      db.prepare('UPDATE cuentas SET bloqueada = 1 WHERE id = ?').run(c.id);
      borrarSesionesDe(c.id);
      anotar(yo, 'bloquear', c.email, String(motivo || '').slice(0, 200));
    } else {
      db.prepare('UPDATE cuentas SET bloqueada = 0 WHERE id = ?').run(c.id);
      anotar(yo, 'desbloquear', c.email, String(motivo || '').slice(0, 200));
    }
    return { ok: true, cuenta: filaCuenta(cuentaPorId(c.id)) };
  });

  // contraseña temporal: se muestra una sola vez y cierra las sesiones abiertas de esa cuenta
  ruta('POST', '/api/admin/cuentas/(?<id>c[\\w-]{4,40})/clave', async (req, url, p) => {
    const yo = admin(req), c = cuentaObjetivo(p.id);
    if (esSuperadmin(c) && c.id !== yo.id) throw new ErrorUsuario('No se puede cambiar la contraseña de otro administrador.');
    const temporal = claveTemporal(), { sal, hash } = hashClave(temporal);
    db.prepare('UPDATE cuentas SET sal = ?, hash = ? WHERE id = ?').run(sal, hash, c.id);
    if (c.id !== yo.id) borrarSesionesDe(c.id);
    anotar(yo, 'clave_temporal', c.email, '');
    return { ok: true, claveTemporal: temporal };
  });

  ruta('DELETE', '/api/admin/cuentas/(?<id>c[\\w-]{4,40})', async (req, url, p) => {
    const yo = admin(req), c = cuentaObjetivo(p.id);
    const { email } = await leerJSON(req);
    if (String(email || '').trim().toLowerCase() !== c.email) throw new ErrorUsuario('Para borrar, escribe el correo exacto de la cuenta.');
    if (c.id === yo.id || esSuperadmin(c)) throw new ErrorUsuario('No se puede borrar a quien administra el servicio desde el panel.');
    let aviso;
    if (c.suscripcion_id && !/cancel/i.test(c.suscripcion_estado || '')) { try { await cancelarSuscripcion(c); } catch (e) { aviso = 'No pude cancelar su suscripción con el proveedor; revísala en Mercado Pago.'; } }
    borrarCuenta(c.id);
    anotar(yo, 'borrar_cuenta', c.email, aviso || '');
    return { ok: true, aviso };
  });

  // ---------- pagos ----------
  ruta('GET', '/api/admin/pagos', async (req) => {
    admin(req);
    const subs = db.prepare("SELECT * FROM cuentas WHERE suscripcion_id IS NOT NULL AND suscripcion_id != '' ORDER BY plan_hasta DESC").all();
    return {
      ok: true, proveedor: config.pagos, precio: Number(Number(config.mp.precio).toFixed(2)), moneda: config.mp.moneda,
      suscripciones: subs.map(c => ({ id: c.id, email: c.email, nombre: c.nombre, proveedor: c.proveedor || '', estado: c.suscripcion_estado || '', activa: ACTIVA.test(c.suscripcion_estado || ''),
        monto: Number(Number(config.mp.precio).toFixed(2)), moneda: config.mp.moneda, plan: planDe(c).plan, proxima: ACTIVA.test(c.suscripcion_estado || '') ? c.plan_hasta : null, hasta: c.plan_hasta || null })),
      eventos: db.prepare('SELECT e.id, e.proveedor, e.estado, e.tipo, e.recibido, c.email FROM pagos_eventos e LEFT JOIN cuentas c ON c.id = e.cuenta_id OR (e.cuenta_id IS NULL AND c.suscripcion_id = e.ref) ORDER BY e.id DESC LIMIT 100').all(),
      ultimoError: ultimoErrorPagos(),
    };
  });
  ruta('POST', '/api/admin/pagos/revisar/(?<id>c[\\w-]{4,40})', async (req, url, p) => {
    const yo = admin(req), c = cuentaObjetivo(p.id);
    if (!c.suscripcion_id) throw new ErrorUsuario('Esa cuenta no tiene una suscripción.');
    await revisar(c);
    const n = cuentaPorId(c.id);
    anotar(yo, 'revisar_pago', c.email, n.suscripcion_estado || '');
    return { ok: true, cuenta: filaCuenta(n) };
  });
  ruta('POST', '/api/admin/pagos/cancelar/(?<id>c[\\w-]{4,40})', async (req, url, p) => {
    const yo = admin(req), c = cuentaObjetivo(p.id);
    await cancelarSuscripcion(c);
    anotar(yo, 'cancelar_suscripcion', c.email, c.proveedor || '');
    return { ok: true, cuenta: filaCuenta(cuentaPorId(c.id)) };
  });
  ruta('GET', '/api/admin/pagos/diagnostico', async (req) => {
    const yo = admin(req);
    const d = config.pagos === 'paypal'
      ? { proveedor: 'paypal', configurado: !!(config.paypal.clientId && config.paypal.secret && config.paypal.planId), tipoToken: config.paypal.modo === 'live' ? 'producción' : 'prueba', ultimoError: ultimoErrorPagos() }
      : await diagnosticoMercadoPago();
    anotar(yo, 'diagnostico_pagos', '', d.tokenValido === false ? 'token no válido' : (d.tipoToken || ''));
    return { ok: true, diagnostico: d };
  });

  // ---------- salud ----------
  ruta('GET', '/api/admin/salud', async (req) => {
    admin(req);
    const datos = tamanoDe(config.dataDir);
    let disco = null; try { const s = fs.statfsSync(config.dataDir); disco = { libreMB: Math.round(s.bavail * s.bsize / 1048576), totalMB: Math.round(s.blocks * s.bsize / 1048576) }; } catch {}
    let respaldo = null;
    try {
      const dir = process.env.RESPALDOS || '/var/backups/avelu';
      const ult = fs.readdirSync(dir).filter(f => /^datos-.*\.db$/.test(f)).map(f => fs.statSync(path.join(dir, f)).mtime).sort((a, b) => b - a)[0];
      if (ult) respaldo = ult.toISOString();
    } catch {}
    const pagosOk = config.pagos === 'mercadopago' ? !!config.mp.token : config.pagos === 'paypal' ? !!(config.paypal.clientId && config.paypal.secret && config.paypal.planId) : false;
    return {
      ok: true, version: VERSION, node: process.version, encendidoSeg: Math.round(process.uptime()), memoriaMB: Math.round(process.memoryUsage().rss / 1048576),
      ia: resumenIA(configIA()), pagos: { proveedor: config.pagos, configurado: pagosOk, firmaWebhook: !!config.mp.webhookSecret },
      google: !!config.google.clientId, sitio: !!config.sitio, superadmins: config.superadmins.length,
      datos: { mb: MB(datos.bytes), archivos: datos.archivos }, disco, respaldo, salas: salasAhora(),
      cuentas: db.prepare('SELECT COUNT(*) AS n FROM cuentas').get().n, sesiones: db.prepare('SELECT COUNT(*) AS n FROM sesiones WHERE vence > ?').get(Date.now()).n,
    };
  });

  ruta('GET', '/api/admin/auditoria', async (req, url) => {
    admin(req);
    const limite = Math.min(500, Math.max(1, Number(url.searchParams.get('limite')) || 200));
    return { ok: true, registros: db.prepare('SELECT id, cuando, quien, accion, objetivo, detalle FROM auditoria ORDER BY id DESC LIMIT ?').all(limite) };
  });
}
