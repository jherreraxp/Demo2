// Verificación de "Entrar con Google": el ID token (JWT RS256) se revisa aquí, en el servidor,
// con las llaves públicas de Google (JWKS). Nunca se confía en lo que dice el navegador.
import crypto from 'node:crypto';
import { config } from './config.mjs';
import { ErrorUsuario } from './util.mjs';

let llaves = new Map(), vence = 0;
async function jwks(forzar = false) {
  if (!forzar && llaves.size && Date.now() < vence) return llaves;
  const r = await fetch(config.google.jwksUrl);
  if (!r.ok) throw new ErrorUsuario('No pude hablar con Google. Prueba otra vez.', 503);
  const { keys = [] } = await r.json();
  llaves = new Map(keys.filter(k => k.kty === 'RSA' && k.kid).map(k => [k.kid, crypto.createPublicKey({ key: k, format: 'jwk' })]));
  const edad = Number(/max-age=(\d+)/.exec(r.headers.get('cache-control') || '')?.[1] || 3600);
  vence = Date.now() + Math.min(edad, 86400) * 1000;
  return llaves;
}
const b64 = s => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

export async function verificarGoogle(credencial) {
  if (!config.google.clientId) throw new ErrorUsuario('Entrar con Google aún no está configurado.', 503);
  const malo = () => new ErrorUsuario('No pude confirmar tu cuenta de Google. Prueba otra vez.', 401);
  const partes = String(credencial || '').split('.');
  if (partes.length !== 3 || credencial.length > 8000) throw malo();
  let cab, datos;
  try { cab = JSON.parse(b64(partes[0])); datos = JSON.parse(b64(partes[1])); } catch { throw malo(); }
  if (cab.alg !== 'RS256' || !cab.kid) throw malo();
  let k = (await jwks()).get(cab.kid);
  if (!k) k = (await jwks(true)).get(cab.kid); // Google cambia sus llaves de vez en cuando
  if (!k) throw malo();
  const ok = crypto.verify('RSA-SHA256', Buffer.from(partes[0] + '.' + partes[1]), k, b64(partes[2]));
  if (!ok) throw malo();
  const ahora = Math.floor(Date.now() / 1000);
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(datos.iss)) throw malo();
  if (datos.aud !== config.google.clientId) throw malo();
  if (typeof datos.exp !== 'number' || datos.exp < ahora - 30) throw malo();
  if (typeof datos.iat === 'number' && datos.iat > ahora + 300) throw malo();
  if (!datos.sub || !datos.email) throw malo();
  if (datos.email_verified !== true && datos.email_verified !== 'true') throw new ErrorUsuario('Tu correo de Google no está verificado.', 401);
  return { sub: String(datos.sub), email: String(datos.email).toLowerCase(), nombre: String(datos.given_name || datos.name || '').slice(0, 60) };
}
