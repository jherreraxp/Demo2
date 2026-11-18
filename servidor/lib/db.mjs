// Base de datos SQLite (node:sqlite, sin dependencias nativas).
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.mjs';
import { aleatorio, sha256 } from './util.mjs';

fs.mkdirSync(config.dataDir, { recursive: true, mode: 0o700 });
fs.mkdirSync(path.join(config.dataDir, 'voces'), { recursive: true, mode: 0o700 });
export const db = new DatabaseSync(path.join(config.dataDir, 'datos.db'));
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS cuentas (
  id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, nombre TEXT NOT NULL,
  sal TEXT NOT NULL, hash TEXT NOT NULL, creada TEXT NOT NULL, acepto TEXT NOT NULL,
  perfiles TEXT NOT NULL DEFAULT '[]', plan TEXT NOT NULL DEFAULT 'gratis', plan_hasta TEXT,
  proveedor TEXT, suscripcion_id TEXT, suscripcion_estado TEXT
);
CREATE TABLE IF NOT EXISTS sesiones (
  token_hash TEXT PRIMARY KEY, cuenta_id TEXT NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE, vence INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS progreso (
  cuenta_id TEXT PRIMARY KEY REFERENCES cuentas(id) ON DELETE CASCADE, datos TEXT NOT NULL, actualizado TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS voces (
  id TEXT PRIMARY KEY, cuenta_id TEXT NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
  clave TEXT NOT NULL, tipo TEXT NOT NULL, bytes INTEGER NOT NULL, creada TEXT NOT NULL,
  UNIQUE (cuenta_id, clave)
);
CREATE TABLE IF NOT EXISTS cuentos_ia (
  id TEXT PRIMARY KEY, cuenta_id TEXT NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
  datos TEXT NOT NULL, dia TEXT NOT NULL, creado TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cuentos_ia_cuenta ON cuentos_ia(cuenta_id, dia);
CREATE TABLE IF NOT EXISTS pagos_eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT, proveedor TEXT, ref TEXT, estado TEXT, recibido TEXT
);
`);

// columnas que se agregaron después (bases ya creadas)
if (!db.prepare('PRAGMA table_info(cuentas)').all().some(c => c.name === 'google_sub')) db.exec('ALTER TABLE cuentas ADD COLUMN google_sub TEXT');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_cuentas_google ON cuentas(google_sub) WHERE google_sub IS NOT NULL');
if (!db.prepare('PRAGMA table_info(cuentas)').all().some(c => c.name === 'foto')) db.exec("ALTER TABLE cuentas ADD COLUMN foto TEXT DEFAULT ''");
{
  const cols = t => db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name);
  const c = cols('cuentas');
  if (!c.includes('bloqueada')) db.exec('ALTER TABLE cuentas ADD COLUMN bloqueada INTEGER NOT NULL DEFAULT 0');
  if (!c.includes('ultimo_ingreso')) db.exec('ALTER TABLE cuentas ADD COLUMN ultimo_ingreso TEXT');
  if (!c.includes('ultima_actividad')) db.exec('ALTER TABLE cuentas ADD COLUMN ultima_actividad TEXT');
  const p = cols('pagos_eventos');
  if (!p.includes('cuenta_id')) db.exec('ALTER TABLE pagos_eventos ADD COLUMN cuenta_id TEXT');
  if (!p.includes('tipo')) db.exec('ALTER TABLE pagos_eventos ADD COLUMN tipo TEXT');
}
db.exec(`
CREATE TABLE IF NOT EXISTS auditoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT, cuando TEXT NOT NULL, quien TEXT NOT NULL, accion TEXT NOT NULL, objetivo TEXT, detalle TEXT
);
CREATE TABLE IF NOT EXISTS ajustes (clave TEXT PRIMARY KEY, valor TEXT NOT NULL);
`);
export const ajuste = (clave, valor) => {
  if (valor === undefined) { const r = db.prepare('SELECT valor FROM ajustes WHERE clave = ?').get(clave); try { return r ? JSON.parse(r.valor) : null; } catch { return null; } }
  db.prepare('INSERT INTO ajustes (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor').run(clave, JSON.stringify(valor));
};
// avisos y cambios de pago (sin datos de tarjetas): quién, qué pasó y cuándo
export const eventoPago = ({ proveedor, ref, estado, cuentaId, tipo }) =>
  db.prepare('INSERT INTO pagos_eventos (proveedor, ref, estado, recibido, cuenta_id, tipo) VALUES (?, ?, ?, ?, ?, ?)')
    .run(proveedor || '', ref || '', estado || '', new Date().toISOString(), cuentaId || null, tipo || 'estado');
// todo lo que se hace desde el panel de administración queda anotado
export const auditar = (quien, accion, objetivo = '', detalle = '') =>
  db.prepare('INSERT INTO auditoria (cuando, quien, accion, objetivo, detalle) VALUES (?, ?, ?, ?, ?)')
    .run(new Date().toISOString(), quien, accion, String(objetivo || ''), typeof detalle === 'string' ? detalle : JSON.stringify(detalle));
// última actividad: se anota como mucho una vez cada 5 minutos por cuenta
const visto = new Map();
export function tocarActividad(id) {
  const t = Date.now(); if (t - (visto.get(id) || 0) < 5 * 60000) return;
  visto.set(id, t); db.prepare('UPDATE cuentas SET ultima_actividad = ? WHERE id = ?').run(new Date(t).toISOString(), id);
}
export const anotarIngreso = id => { const t = new Date().toISOString(); visto.set(id, Date.now()); db.prepare('UPDATE cuentas SET ultimo_ingreso = ?, ultima_actividad = ? WHERE id = ?').run(t, t, id); };
export const borrarSesionesDe = id => db.prepare('DELETE FROM sesiones WHERE cuenta_id = ?').run(id);
export const esSuperadmin = c => !!c && config.superadmins.includes(String(c.email).toLowerCase());
export const ponerFoto = (id, foto) => db.prepare('UPDATE cuentas SET foto = ? WHERE id = ?').run(foto || '', id);

const ahoraISO = () => new Date().toISOString();
export function nuevaCuenta({ email, nombre, sal, hash }) {
  const id = 'c' + aleatorio(9);
  db.prepare('INSERT INTO cuentas (id, email, nombre, sal, hash, creada, acepto) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, email, nombre, sal, hash, ahoraISO(), ahoraISO());
  return id;
}
export const cuentaPorGoogle = sub => db.prepare('SELECT * FROM cuentas WHERE google_sub = ?').get(sub);
export const unirGoogle = (id, sub) => db.prepare('UPDATE cuentas SET google_sub = ? WHERE id = ?').run(sub, id);
// cuenta creada con Google: no tiene clave propia (hash '!' nunca coincide con ninguna clave)
export function nuevaCuentaGoogle({ email, nombre, sub }) {
  const id = 'c' + aleatorio(9);
  db.prepare('INSERT INTO cuentas (id, email, nombre, sal, hash, creada, acepto, google_sub) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, email, nombre, '-', '!', ahoraISO(), ahoraISO(), sub);
  return id;
}
export const cuentaPorEmail = email => db.prepare('SELECT * FROM cuentas WHERE email = ?').get(email);
export const cuentaPorId = id => db.prepare('SELECT * FROM cuentas WHERE id = ?').get(id);
export const cuentaPorSuscripcion = sid => db.prepare('SELECT * FROM cuentas WHERE suscripcion_id = ?').get(sid);

export function crearSesion(cuentaId) {
  const token = aleatorio(32);
  db.prepare('INSERT INTO sesiones (token_hash, cuenta_id, vence) VALUES (?, ?, ?)')
    .run(sha256(token), cuentaId, Date.now() + config.diasSesion * 86400000);
  return token;
}
export function cuentaDeToken(token) {
  if (!token || typeof token !== 'string' || token.length > 100) return null;
  const s = db.prepare('SELECT * FROM sesiones WHERE token_hash = ?').get(sha256(token));
  if (!s) return null;
  if (s.vence < Date.now()) { db.prepare('DELETE FROM sesiones WHERE token_hash = ?').run(s.token_hash); return null; }
  const c = cuentaPorId(s.cuenta_id);
  if (!c || c.bloqueada) return null;   // una cuenta bloqueada no puede usar sus sesiones
  return c;
}
export const borrarSesion = token => db.prepare('DELETE FROM sesiones WHERE token_hash = ?').run(sha256(token || ''));
export function limpiarSesionesVencidas() { db.prepare('DELETE FROM sesiones WHERE vence < ?').run(Date.now()); }

// el plan vigente: "familia" si pagó y no venció, o si el correo está en PLAN_GRATIS_PARA
export function planDe(c) {
  if (config.gratisPara.includes(c.email)) return { plan: 'familia', planHasta: null };
  if (c.plan === 'familia' && c.plan_hasta && new Date(c.plan_hasta) > new Date()) return { plan: 'familia', planHasta: c.plan_hasta };
  return { plan: 'gratis', planHasta: c.plan === 'familia' ? c.plan_hasta : null };
}
export function cuentaPublica(c) {
  const p = planDe(c);
  return { id: c.id, email: c.email, nombre: c.nombre, perfiles: JSON.parse(c.perfiles || '[]'), plan: p.plan, planHasta: p.planHasta, google: !!c.google_sub, conClave: c.hash !== '!', foto: c.foto || '', ...(esSuperadmin(c) ? { superadmin: true } : {}) };
}
export function guardarPlan(id, { plan, hasta, proveedor, suscripcionId, estado }) {
  const c = cuentaPorId(id); if (!c) return;
  db.prepare('UPDATE cuentas SET plan = ?, plan_hasta = ?, proveedor = COALESCE(?, proveedor), suscripcion_id = COALESCE(?, suscripcion_id), suscripcion_estado = COALESCE(?, suscripcion_estado) WHERE id = ?')
    .run(plan, hasta, proveedor ?? null, suscripcionId ?? null, estado ?? null, id);
}
export function borrarCuenta(id) {
  db.prepare('DELETE FROM cuentas WHERE id = ?').run(id); // el resto se borra en cascada
  fs.rmSync(path.join(config.dataDir, 'voces', id), { recursive: true, force: true });
}
