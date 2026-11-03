// Salas para jugar en línea en "Construye tu Mundo" (WebSocket).
import { WebSocketServer } from 'ws';
import { cuentaDeToken } from './db.mjs';
import { config } from './config.mjs';
import { log } from './util.mjs';

const ANIMALES = ['GATO', 'PATO', 'SAPO', 'OSO', 'LOBO', 'MONO', 'LORO', 'VACA', 'PUMA', 'LLAMA', 'PANDA', 'TORO', 'PEZ', 'BUHO', 'ZORRO', 'CUY'];
const MAX_JUGADORES = 6, MAX_MSG = 256 * 1024, MAX_ITEMS = 6000, EXPIRA_MS = 10 * 60 * 1000;
const salas = new Map(); // codigo → { codigo, jugadores: Map(id → ws), items: [], vacia: ts|null }
let siguienteId = 1;

function nuevoCodigo() {
  for (let i = 0; i < 200; i++) {
    const c = ANIMALES[Math.floor(Math.random() * ANIMALES.length)] + '-' + String(Math.floor(Math.random() * 90) + 10);
    if (!salas.has(c)) return c;
  }
  return 'SALA-' + Date.now().toString(36).toUpperCase();
}
const num = v => typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
const ent = v => Number.isInteger(v) && Math.abs(v) < 1000 ? v : null;
const corto = (v, n = 24) => typeof v === 'string' ? v.slice(0, n) : '';
// un "item" del mundo: { t, k, c, x, y, z, r, w, e, id } con valores acotados
function itemLimpio(it) {
  if (!it || typeof it !== 'object') return null;
  const x = ent(it.x), y = ent(it.y), z = ent(it.z);
  if (x === null || y === null || z === null) return null;
  const o = { t: corto(it.t, 2), x, y, z };
  for (const k of ['k', 'c', 'w', 'e', 'id']) if (typeof it[k] === 'string') o[k] = corto(it[k], 32);
  if (Number.isInteger(it.r)) o.r = ((it.r % 4) + 4) % 4;
  return o;
}
const mismo = (a, x, y, z) => a.x === x && a.y === y && a.z === z;
function enviar(ws, msg) { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }
function aTodos(sala, msg, menos) { for (const ws of sala.jugadores.values()) if (ws !== menos) enviar(ws, msg); }
const jugadoresDe = sala => [...sala.jugadores.values()].map(w => w.jug);

export function instalarSalas(servidorHttp, origenPermitido) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MSG });
  servidorHttp.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname !== '/ws') return socket.destroy();
    if (req.headers.origin && !origenPermitido(req.headers.origin)) { socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); return socket.destroy(); }
    const cuenta = cuentaDeToken(url.searchParams.get('token'));
    if (!cuenta) { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); return socket.destroy(); }
    wss.handleUpgrade(req, socket, head, ws => { ws.cuenta = cuenta; wss.emit('connection', ws); });
  });

  wss.on('connection', ws => {
    ws.vivo = true; ws.sala = null; ws.posT = 0;
    ws.jug = { id: 'j' + (siguienteId++), nombre: corto(ws.cuenta.nombre, 24) || 'Amiga', personaje: 'nieve' };
    ws.on('pong', () => { ws.vivo = true; });
    ws.on('message', datos => {
      let m; try { m = JSON.parse(datos); } catch (e) { return; }
      if (!m || typeof m.t !== 'string') return;
      try { manejar(ws, m); } catch (e) { log('ws_error', { msg: e.message }); }
    });
    ws.on('close', () => salir(ws));
  });

  function salir(ws) {
    const sala = ws.sala; if (!sala) return;
    sala.jugadores.delete(ws.jug.id); ws.sala = null;
    aTodos(sala, { t: 'sale', id: ws.jug.id });
    if (!sala.jugadores.size) sala.vacia = Date.now();
  }
  function entrar(ws, sala) {
    if (ws.sala) salir(ws);
    sala.jugadores.set(ws.jug.id, ws); sala.vacia = null; ws.sala = sala;
    aTodos(sala, { t: 'entra', jugador: ws.jug }, ws);
  }

  function manejar(ws, m) {
    const sala = ws.sala;
    switch (m.t) {
      case 'crear': {
        const s = { codigo: nuevoCodigo(), jugadores: new Map(), items: [], vacia: null };
        salas.set(s.codigo, s); entrar(ws, s);
        enviar(ws, { t: 'sala', codigo: s.codigo, yo: ws.jug.id, mundo: s.items, jugadores: jugadoresDe(s) });
        log('sala_creada', { codigo: s.codigo });
        return;
      }
      case 'unirse': {
        const s = salas.get(corto(m.codigo, 20).toUpperCase().trim());
        if (!s) return enviar(ws, { t: 'error', error: 'No encontré esa sala. Revisa el código.' });
        if (s.jugadores.size >= MAX_JUGADORES && !s.jugadores.has(ws.jug.id)) return enviar(ws, { t: 'error', error: 'La sala está llena (máximo 6).' });
        entrar(ws, s);
        enviar(ws, { t: 'sala', codigo: s.codigo, yo: ws.jug.id, mundo: s.items, jugadores: jugadoresDe(s) });
        return;
      }
      case 'salir': return salir(ws);
      case 'hola': {
        ws.jug.nombre = corto(m.nombre, 24) || ws.jug.nombre; ws.jug.personaje = corto(m.personaje, 32) || ws.jug.personaje;
        if (sala) aTodos(sala, { t: 'hola', de: ws.jug.id, nombre: ws.jug.nombre, personaje: ws.jug.personaje }, ws);
        return;
      }
    }
    if (!sala) return enviar(ws, { t: 'error', error: 'Primero entra a una sala.' });
    switch (m.t) {
      case 'pos': {
        const ahora = Date.now(); if (ahora - ws.posT < 80) return; ws.posT = ahora; // ~12 por segundo
        return aTodos(sala, { t: 'pos', de: ws.jug.id, x: num(m.x), y: num(m.y), z: num(m.z), dir: num(m.dir), modo: corto(m.modo, 12) }, ws);
      }
      case 'mundo': {
        if (!Array.isArray(m.items)) return;
        sala.items = m.items.slice(0, MAX_ITEMS).map(itemLimpio).filter(Boolean);
        return aTodos(sala, { t: 'mundo', de: ws.jug.id, items: sala.items }, ws);
      }
      case 'poner': {
        const it = itemLimpio(m.item); if (!it) return;
        if (sala.items.length >= MAX_ITEMS) return enviar(ws, { t: 'error', error: '¡El mundo ya está lleno!' });
        sala.items = sala.items.filter(a => !mismo(a, it.x, it.y, it.z)); sala.items.push(it);
        return aTodos(sala, { t: 'poner', de: ws.jug.id, item: it }, ws);
      }
      case 'borrar': {
        const x = ent(m.x), y = ent(m.y), z = ent(m.z); if (x === null || y === null || z === null) return;
        sala.items = sala.items.filter(a => !mismo(a, x, y, z));
        return aTodos(sala, { t: 'borrar', de: ws.jug.id, x, y, z }, ws);
      }
      case 'pintar': {
        const x = ent(m.x), y = ent(m.y), z = ent(m.z), c = corto(m.c, 24); if (x === null || y === null || z === null || !c) return;
        sala.items.forEach(a => { if (mismo(a, x, y, z)) a.c = c; });
        return aTodos(sala, { t: 'pintar', de: ws.jug.id, x, y, z, c }, ws);
      }
      case 'saludo': {
        const emoji = ['👋', '❤️', '⭐', '😂'].includes(m.emoji) ? m.emoji : '👋';
        return aTodos(sala, { t: 'saludo', de: ws.jug.id, emoji }, ws);
      }
    }
  }

  // latido: corta conexiones muertas y borra salas vacías tras 10 minutos
  const latido = setInterval(() => {
    for (const ws of wss.clients) { if (!ws.vivo) { ws.terminate(); continue; } ws.vivo = false; ws.ping(); }
    const ahora = Date.now();
    for (const [c, s] of salas) if (!s.jugadores.size && s.vacia && ahora - s.vacia > EXPIRA_MS) salas.delete(c);
  }, Number(process.env.LATIDO_MS || 30000));
  latido.unref();
  return { wss, salas };
}
export { config };
