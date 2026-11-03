// Prueba una llave de IA antes de guardarla. Lee por la entrada estándar un JSON
// { proveedor, key, modelo, baseUrl } y escribe una línea JSON { ok, proveedor, nombre, modelo, error? }.
// Nunca escribe la llave. Uso: echo '{...}' | node --no-warnings probar-ia.mjs
import { PROVEEDORES, normalizarProveedor, probar, tapar, ErrorIA } from './lib/ia.mjs';

let entrada = '';
for await (const trozo of process.stdin) entrada += trozo;
let datos = {};
try { datos = JSON.parse(entrada || '{}'); } catch { datos = {}; }
const proveedor = normalizarProveedor(datos.proveedor);
const key = String(datos.key || '').trim();
const modelo = String(datos.modelo || '').trim() || (PROVEEDORES[proveedor] || {}).modelo || '';
const baseUrl = String(datos.baseUrl || '').trim();
const salida = { ok: false, proveedor, nombre: (PROVEEDORES[proveedor] || {}).nombre || '', modelo };
try {
  if (!proveedor) throw new ErrorIA('config', 'No reconozco ese proveedor.');
  if (proveedor === 'custom' && !baseUrl) throw new ErrorIA('config', 'Falta la dirección (URL base) del proveedor.');
  await probar({ proveedor, key, modelo, baseUrl, timeoutMs: Number(process.env.IA_TIMEOUT_MS || 30000), maxTokens: 30 });
  salida.ok = true;
} catch (e) {
  salida.error = tapar(e instanceof ErrorIA ? e.message : 'No se pudo probar la llave.', key);
  salida.tipo = e.tipo || 'otro';
}
console.log(JSON.stringify(salida));
process.exit(salida.ok ? 0 : 1);
