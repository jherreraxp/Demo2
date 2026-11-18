// Confirmación de adulto: después de escribir su contraseña o confirmar con Google, la cuenta recibe
// un pase corto (30 min) firmado por el servidor. El modo papá lo acepta como alternativa al PIN,
// y el panel de administración lo exige siempre (cabecera X-Adulto).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.mjs';

// el secreto vive en DATA_DIR (o en la variable SECRETO); nunca en el repositorio
let secreto = null;
function elSecreto() {
  if (secreto) return secreto;
  if (process.env.SECRETO && process.env.SECRETO.length >= 16) return (secreto = Buffer.from(process.env.SECRETO));
  const f = path.join(config.dataDir, 'secreto.key');
  try { secreto = fs.readFileSync(f); if (secreto.length >= 32) return secreto; } catch {}
  secreto = crypto.randomBytes(48);
  fs.writeFileSync(f, secreto, { mode: 0o600 });
  return secreto;
}
const firma = texto => crypto.createHmac('sha256', elSecreto()).update(texto).digest('base64url');

export function crearPaseAdulto(cuentaId, minutos = config.minutosAdulto) {
  const hasta = Date.now() + minutos * 60000;
  const cuerpo = Buffer.from(JSON.stringify({ c: cuentaId, e: hasta })).toString('base64url');
  return { adultoToken: cuerpo + '.' + firma(cuerpo), hasta: new Date(hasta).toISOString() };
}
export function paseAdultoValido(token, cuentaId) {
  if (typeof token !== 'string' || token.length > 400) return false;
  const [cuerpo, f] = token.split('.');
  if (!cuerpo || !f) return false;
  const esperado = Buffer.from(firma(cuerpo)), recibido = Buffer.from(f);
  if (esperado.length !== recibido.length || !crypto.timingSafeEqual(esperado, recibido)) return false;
  let d; try { d = JSON.parse(Buffer.from(cuerpo, 'base64url').toString()); } catch { return false; }
  return d.c === cuentaId && typeof d.e === 'number' && d.e > Date.now();
}
