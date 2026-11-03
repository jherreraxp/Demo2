import crypto from 'node:crypto';
// registros sin datos sensibles (nunca claves ni tokens)
export function log(evento, datos = {}) {
  const limpio = {};
  for (const [k, v] of Object.entries(datos)) if (!/clave|token|password|secret|key/i.test(k)) limpio[k] = v;
  process.stdout.write(JSON.stringify({ t: new Date().toISOString(), evento, ...limpio }) + '\n');
}
export class ErrorUsuario extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }
export const aleatorio = (n = 32) => crypto.randomBytes(n).toString('base64url');
export const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
export function hashClave(clave, sal = crypto.randomBytes(16).toString('hex')) {
  const h = crypto.scryptSync(clave, sal, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return { sal, hash: h };
}
export function claveCorrecta(clave, sal, hash) {
  const h = crypto.scryptSync(clave, sal, 64, { N: 16384, r: 8, p: 1 });
  const b = Buffer.from(hash, 'hex');
  return b.length === h.length && crypto.timingSafeEqual(b, h);
}
// limitador simple por IP y acción: n intentos por ventana
const cubos = new Map();
export function limitar(clave, n, ventanaMs) {
  const ahora = Date.now();
  let c = cubos.get(clave);
  if (!c || ahora > c.fin) { c = { cuenta: 0, fin: ahora + ventanaMs }; cubos.set(clave, c); }
  c.cuenta++;
  if (cubos.size > 50000) for (const [k, v] of cubos) if (ahora > v.fin) cubos.delete(k);
  return c.cuenta <= n;
}
export const emailValido = e => typeof e === 'string' && e.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
export const textoCorto = (v, max = 40) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;
