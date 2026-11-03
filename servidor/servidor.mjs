// Servidor de Avelu y Amara: cuentas de familia, suscripción mensual, voces privadas,
// cuentos (fábulas y con IA) y salas en línea. Ver API.md y LEEME.md.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { config, VERSION } from './lib/config.mjs';
import {
  db, nuevaCuenta, cuentaPorEmail, cuentaPorId, crearSesion, cuentaDeToken, borrarSesion, limpiarSesionesVencidas,
  cuentaPublica, planDe, borrarCuenta, cuentaPorGoogle, unirGoogle, nuevaCuentaGoogle, ponerFoto,
} from './lib/db.mjs';
import { verificarGoogle } from './lib/google.mjs';
import { ErrorUsuario, log, hashClave, claveCorrecta, limitar, emailValido, textoCorto, aleatorio } from './lib/util.mjs';
import { crearSuscripcion, cancelarSuscripcion, webhook, revisar } from './lib/pagos.mjs';
import { listaCuentos, crearCuentoIA } from './lib/cuentos.mjs';
import { instalarSalas } from './lib/salas.mjs';

const MAX_JSON = 600 * 1024, MAX_VOZ = 1024 * 1024;
const TIPOS_VOZ = ['audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4'];
const origenPermitido = o => config.origenes.includes(o) || (process.env.ORIGENES_DEV === '1' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o));

function cabeceras(req, res) {
  const o = req.headers.origin;
  if (o && origenPermitido(o)) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
}
function responder(res, status, obj) {
  const cuerpo = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(cuerpo);
}
function leerCuerpo(req, max) {
  return new Promise((ok, no) => {
    const partes = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > max) { no(new ErrorUsuario('Es demasiado grande.', 413)); req.destroy(); } else partes.push(c); });
    req.on('end', () => ok(Buffer.concat(partes)));
    req.on('error', no);
  });
}
async function leerJSON(req) {
  const tipo = req.headers['content-type'] || '';
  const b = await leerCuerpo(req, MAX_JSON);
  if (!b.length) return {};
  if (!/json|text\/plain/.test(tipo)) throw new ErrorUsuario('Envía JSON.', 415);
  try { return JSON.parse(b.toString('utf8')); } catch (e) { throw new ErrorUsuario('El JSON no es válido.'); }
}
const ipDe = req => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '?';
const tokenDe = req => { const a = req.headers.authorization || ''; return a.startsWith('Bearer ') ? a.slice(7) : ''; };
function necesitaCuenta(req) {
  const c = cuentaDeToken(tokenDe(req));
  if (!c) throw new ErrorUsuario('Entra con tu cuenta.', 401);
  return c;
}
function necesitaFamilia(c) {
  if (planDe(c).plan !== 'familia') throw new ErrorUsuario('Esto es del plan familia. Pídele a papá o mamá que lo active.', 402);
}
const dirVoces = id => path.join(config.dataDir, 'voces', id);

// ---------- rutas ----------
const rutas = [];
const ruta = (metodo, patron, fn) => rutas.push({ metodo, patron: new RegExp('^' + patron + '$'), fn });

ruta('GET', '/api/salud', async () => ({ ok: true, version: VERSION }));

ruta('POST', '/api/registro', async (req) => {
  if (!limitar('reg:' + ipDe(req), 10, 60000)) throw new ErrorUsuario('Muchos intentos. Espera un minuto.', 429);
  const { email, clave, nombre, acepto } = await leerJSON(req);
  const e = String(email || '').trim().toLowerCase();
  if (!emailValido(e)) throw new ErrorUsuario('Escribe un correo válido.');
  if (typeof clave !== 'string' || clave.length < 8 || clave.length > 128) throw new ErrorUsuario('La clave debe tener al menos 8 letras o números.');
  if (!textoCorto(nombre, 60)) throw new ErrorUsuario('Escribe tu nombre.');
  if (acepto !== true) throw new ErrorUsuario('Debes ser mayor de edad y aceptar los términos y la política de privacidad.');
  if (cuentaPorEmail(e)) throw new ErrorUsuario('Ese correo ya tiene una cuenta. Entra con tu clave.', 409);
  const { sal, hash } = hashClave(clave);
  const id = nuevaCuenta({ email: e, nombre: nombre.trim(), sal, hash });
  log('registro', { cuenta: id });
  return { ok: true, token: crearSesion(id), cuenta: cuentaPublica(cuentaPorId(id)) };
});

ruta('POST', '/api/entrar', async (req) => {
  if (!limitar('ent:' + ipDe(req), 10, 60000)) throw new ErrorUsuario('Muchos intentos. Espera un minuto.', 429);
  const { email, clave } = await leerJSON(req);
  const c = cuentaPorEmail(String(email || '').trim().toLowerCase());
  if (!c || typeof clave !== 'string' || !claveCorrecta(clave, c.sal, c.hash)) throw new ErrorUsuario('El correo o la clave no coinciden.', 401);
  return { ok: true, token: crearSesion(c.id), cuenta: cuentaPublica(c) };
});

// datos públicos para que la página sepa qué mostrar (botón de Google, precio del plan)
ruta('GET', '/api/config', async () => ({
  ok: true, googleClientId: config.google.clientId || null, pagos: config.pagos,
  precio: config.mp.precio, moneda: config.mp.moneda,
}));

ruta('POST', '/api/google', async (req) => {
  if (!limitar('ggl:' + ipDe(req), 20, 60000)) throw new ErrorUsuario('Muchos intentos. Espera un minuto.', 429);
  const { credential, acepto } = await leerJSON(req);
  const g = await verificarGoogle(credential);
  let c = cuentaPorGoogle(g.sub);
  if (!c) {
    const mismo = cuentaPorEmail(g.email);
    if (mismo) { unirGoogle(mismo.id, g.sub); c = cuentaPorId(mismo.id); log('google_unido', { cuenta: c.id }); }
    else {
      // la primera vez, el adulto debe aceptar los términos (igual que al crear cuenta con correo)
      if (acepto !== true) return { ok: false, necesitaAcepto: true, nombre: g.nombre, email: g.email };
      const id = nuevaCuentaGoogle({ email: g.email, nombre: g.nombre || g.email.split('@')[0], sub: g.sub });
      c = cuentaPorId(id); log('registro_google', { cuenta: id });
    }
  }
  // la foto de Google se actualiza en cada ingreso (si la persona la cambió en Google)
  if ((g.foto || '') !== (c.foto || '')) { ponerFoto(c.id, g.foto); c = cuentaPorId(c.id); }
  return { ok: true, token: crearSesion(c.id), cuenta: cuentaPublica(c) };
});

ruta('POST', '/api/salir', async (req) => { borrarSesion(tokenDe(req)); return { ok: true }; });
ruta('GET', '/api/yo', async (req) => ({ ok: true, cuenta: cuentaPublica(necesitaCuenta(req)) }));

ruta('PUT', '/api/perfiles', async (req) => {
  const c = necesitaCuenta(req);
  const { perfiles } = await leerJSON(req);
  if (!Array.isArray(perfiles) || perfiles.length > 6) throw new ErrorUsuario('Hasta 6 perfiles.');
  // de los niños solo se guarda un primer nombre y su personaje
  const limpios = perfiles.map((p, i) => ({
    id: typeof p?.id === 'string' && /^[\w-]{1,24}$/.test(p.id) ? p.id : 'p' + i,
    nombre: String(p?.nombre || '').trim().split(/\s+/)[0].slice(0, 20) || 'Niña',
    personaje: typeof p?.personaje === 'string' ? p.personaje.slice(0, 32) : 'nieve',
  }));
  db.prepare('UPDATE cuentas SET perfiles = ? WHERE id = ?').run(JSON.stringify(limpios), c.id);
  return { ok: true, cuenta: cuentaPublica(cuentaPorId(c.id)) };
});

ruta('PUT', '/api/progreso', async (req) => {
  const c = necesitaCuenta(req);
  const { datos } = await leerJSON(req);
  const texto = JSON.stringify(datos ?? null);
  if (texto.length > 512 * 1024) throw new ErrorUsuario('El progreso es demasiado grande.', 413);
  db.prepare('INSERT INTO progreso (cuenta_id, datos, actualizado) VALUES (?, ?, ?) ON CONFLICT(cuenta_id) DO UPDATE SET datos = excluded.datos, actualizado = excluded.actualizado')
    .run(c.id, texto, new Date().toISOString());
  return { ok: true };
});
ruta('GET', '/api/progreso', async (req) => {
  const c = necesitaCuenta(req);
  const r = db.prepare('SELECT datos FROM progreso WHERE cuenta_id = ?').get(c.id);
  return { ok: true, datos: r ? JSON.parse(r.datos) : null };
});

ruta('DELETE', '/api/cuenta', async (req) => {
  const c = necesitaCuenta(req);
  const { clave, confirmo } = await leerJSON(req);
  if (c.hash === '!') { if (confirmo !== 'BORRAR') throw new ErrorUsuario('Escribe BORRAR para confirmar.', 401); }
  else if (typeof clave !== 'string' || !claveCorrecta(clave, c.sal, c.hash)) throw new ErrorUsuario('La clave no coincide.', 401);
  if (c.suscripcion_id && !/cancel/i.test(c.suscripcion_estado || '')) { try { await cancelarSuscripcion(c); } catch (e) { log('cancelar_al_borrar', { cuenta: c.id }); } }
  borrarCuenta(c.id);
  log('cuenta_borrada', { cuenta: c.id });
  return { ok: true };
});

// ---------- suscripción ----------
ruta('POST', '/api/suscripcion/crear', async (req) => {
  const c = necesitaCuenta(req);
  if (planDe(c).plan === 'familia' && c.suscripcion_estado && /authorized|ACTIVE/.test(c.suscripcion_estado)) throw new ErrorUsuario('Ya tienes el plan familia. ¡Gracias!');
  return { ok: true, url: await crearSuscripcion(c) };
});
ruta('POST', '/api/suscripcion/cancelar', async (req) => { await cancelarSuscripcion(necesitaCuenta(req)); return { ok: true }; });
ruta('POST', '/api/suscripcion/revisar', async (req) => {
  const c = necesitaCuenta(req); await revisar(c);
  return { ok: true, cuenta: cuentaPublica(cuentaPorId(c.id)) };
});
ruta('POST', '/api/pagos/webhook', async (req, url) => {
  let cuerpo = {}; try { cuerpo = await leerJSON(req); } catch (e) {}
  try { await webhook(url.searchParams, cuerpo); } catch (e) { log('webhook_error', { msg: e.message }); }
  return { ok: true }; // siempre 200 para que el proveedor no reintente sin fin
});

// ---------- voces privadas (plan familia) ----------
ruta('GET', '/api/voces', async (req) => {
  const c = necesitaCuenta(req); necesitaFamilia(c);
  const filas = db.prepare('SELECT id, clave FROM voces WHERE cuenta_id = ?').all(c.id);
  return { ok: true, lista: Object.fromEntries(filas.map(f => [f.clave, '/api/voces/archivo/' + f.id])) };
});
ruta('PUT', '/api/voces/(?<clave>[^/]{1,200})', async (req, url, p) => {
  const c = necesitaCuenta(req); necesitaFamilia(c);
  const clave = decodeURIComponent(p.clave).trim().slice(0, 120);
  if (!clave) throw new ErrorUsuario('Falta el nombre de la frase.');
  const tipo = (req.headers['content-type'] || '').split(';')[0].trim();
  if (!TIPOS_VOZ.includes(tipo)) throw new ErrorUsuario('Ese tipo de audio no sirve.', 415);
  const cuantas = db.prepare('SELECT COUNT(*) AS n FROM voces WHERE cuenta_id = ?').get(c.id).n;
  if (cuantas >= 2000) throw new ErrorUsuario('Ya grabaste muchísimas frases (máximo 2000).');
  const audio = await leerCuerpo(req, MAX_VOZ);
  if (audio.length < 100) throw new ErrorUsuario('La grabación está vacía.');
  const viejo = db.prepare('SELECT id FROM voces WHERE cuenta_id = ? AND clave = ?').get(c.id, clave);
  const id = viejo?.id || 'v' + aleatorio(12);
  fs.mkdirSync(dirVoces(c.id), { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(dirVoces(c.id), id + '.bin'), audio, { mode: 0o600 });
  db.prepare('INSERT INTO voces (id, cuenta_id, clave, tipo, bytes, creada) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(cuenta_id, clave) DO UPDATE SET tipo = excluded.tipo, bytes = excluded.bytes, creada = excluded.creada')
    .run(id, c.id, clave, tipo, audio.length, new Date().toISOString());
  return { ok: true, url: '/api/voces/archivo/' + id };
});
ruta('GET', '/api/voces/archivo/(?<id>v[\\w-]{6,40})', async (req, url, p, res) => {
  // el token puede venir en la cabecera o como ?token= (para <audio src>)
  const c = cuentaDeToken(tokenDe(req) || url.searchParams.get('token'));
  if (!c) throw new ErrorUsuario('Entra con tu cuenta.', 401);
  necesitaFamilia(c);
  const f = db.prepare('SELECT * FROM voces WHERE id = ? AND cuenta_id = ?').get(p.id, c.id);
  if (!f) throw new ErrorUsuario('No encontré esa grabación.', 404);
  const audio = fs.readFileSync(path.join(dirVoces(c.id), f.id + '.bin'));
  res.writeHead(200, { 'Content-Type': f.tipo, 'Content-Length': audio.length, 'Cache-Control': 'private, max-age=86400' });
  res.end(audio);
  return null;
});
ruta('DELETE', '/api/voces/(?<clave>[^/]{1,200})', async (req, url, p) => {
  const c = necesitaCuenta(req); necesitaFamilia(c);
  const f = db.prepare('SELECT id FROM voces WHERE cuenta_id = ? AND clave = ?').get(c.id, decodeURIComponent(p.clave).trim());
  if (f) { fs.rmSync(path.join(dirVoces(c.id), f.id + '.bin'), { force: true }); db.prepare('DELETE FROM voces WHERE id = ?').run(f.id); }
  return { ok: true };
});

// ---------- cuentos ----------
ruta('GET', '/api/cuentos', async (req) => {
  const c = cuentaDeToken(tokenDe(req));
  const familia = !!c && planDe(c).plan === 'familia';
  return { ok: true, cuentos: listaCuentos(familia, c?.id) };
});
ruta('POST', '/api/cuentos/ia', async (req) => {
  const c = necesitaCuenta(req); necesitaFamilia(c);
  if (!limitar('ia:' + c.id, 3, 60000)) throw new ErrorUsuario('Espera un ratito antes de pedir otro cuento.', 429);
  return { ok: true, cuento: await crearCuentoIA(c.id, await leerJSON(req)) };
});

// ---------- páginas del juego (cuando la VM sirve el sitio completo) ----------
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.webm': 'audio/webm', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.bin': 'application/octet-stream' };
const PRIVADO = /^\/(\.|servidor\/|gas\/|node_modules\/)|\/\./;
function servirSitio(req, res, url) {
  if (!config.sitio || (req.method !== 'GET' && req.method !== 'HEAD')) return false;
  let ruta; try { ruta = decodeURIComponent(url.pathname); } catch { return false; }
  if (PRIVADO.test(ruta) || ruta.includes('\0')) return false;
  if (ruta.endsWith('/')) ruta += 'index.html';
  const raiz = path.resolve(config.sitio), archivo = path.resolve(raiz, '.' + ruta);
  if (!archivo.startsWith(raiz + path.sep)) return false;
  let st; try { st = fs.statSync(archivo); } catch { return false; }
  if (!st.isFile()) return false;
  const tipo = TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream';
  // las páginas del juego sí cargan estilos, programas, fuentes e imágenes (la regla estricta es solo para la API)
  res.removeHeader('Content-Security-Policy'); res.setHeader('X-Frame-Options', 'SAMEORIGIN'); res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.writeHead(200, { 'Content-Type': tipo, 'Content-Length': st.size, 'Cache-Control': /\.html$/.test(archivo) || /lista\.json$/.test(archivo) ? 'no-cache' : 'public, max-age=3600' });
  if (req.method === 'HEAD') { res.end(); return true; }
  fs.createReadStream(archivo).pipe(res);
  return true;
}

// ---------- servidor ----------
export function crearServidor() {
  const servidor = http.createServer(async (req, res) => {
    cabeceras(req, res);
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    const url = new URL(req.url, 'http://x');
    const r = rutas.find(r => r.metodo === req.method && r.patron.test(url.pathname));
    if (!r && !url.pathname.startsWith('/api/') && servirSitio(req, res, url)) return;
    if (!r) return responder(res, 404, { ok: false, error: 'No existe.' });
    try {
      const salida = await r.fn(req, url, url.pathname.match(r.patron).groups || {}, res);
      if (salida !== null) responder(res, 200, salida);
    } catch (e) {
      if (e instanceof ErrorUsuario) return responder(res, e.status, { ok: false, error: e.message });
      log('error', { ruta: url.pathname, msg: e.message });
      responder(res, 500, { ok: false, error: 'Algo salió mal. Prueba otra vez.' });
    }
  });
  servidor.requestTimeout = 60000; servidor.headersTimeout = 20000;
  const salas = instalarSalas(servidor, origenPermitido);
  setInterval(limpiarSesionesVencidas, 3600000).unref();
  return { servidor, salas };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { servidor } = crearServidor();
  servidor.listen(config.puerto, config.host, () => log('inicio', { puerto: config.puerto, version: VERSION, pagos: config.pagos }));
  const cerrar = () => { servidor.close(() => { db.close(); process.exit(0); }); setTimeout(() => process.exit(0), 3000).unref(); };
  process.on('SIGTERM', cerrar); process.on('SIGINT', cerrar);
}
