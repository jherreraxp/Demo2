// Pruebas de los cuentos con IA y sus proveedores: node --no-warnings pruebas-ia.mjs
// Un servidor falso imita las respuestas de Claude, Gemini y las APIs compatibles con OpenAI.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const LLAVE = 'sk-ant-prueba-1234567890abcdef';
const CUENTO = { titulo: 'Avelu y el sol', emoji: '☀️', paginas: [{ texto: 'Avelu mira el sol.', dibujo: '☀️' }, { texto: 'El sol sale.', dibujo: '🌄' }, { texto: 'Avelu ríe.', dibujo: '😄' }, { texto: 'Fin.', dibujo: '⭐' }], moraleja: 'El sol nos alegra.' };
let modoFalso = 'bien', ultimo = null;
const falso = http.createServer(async (req, res) => {
  let cuerpo = ''; for await (const t of req) cuerpo += t;
  ultimo = { url: req.url, headers: req.headers, cuerpo: cuerpo ? JSON.parse(cuerpo) : null };
  const enviar = (st, o) => { res.writeHead(st, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (modoFalso === 'llave') return enviar(401, { error: { message: 'invalid x-api-key' } });
  if (modoFalso === 'saldo') return enviar(429, { error: { message: 'You exceeded your current quota, please check your plan and billing details.' } });
  if (modoFalso === 'modelo') return enviar(404, { error: { message: 'model: no-existe not found' } });
  if (modoFalso === 'lento') { await new Promise(ok => setTimeout(ok, 1500)); return enviar(200, {}); }
  if (modoFalso === 'caido') return enviar(500, { error: 'boom' });
  const texto = '```json\n' + JSON.stringify(CUENTO) + '\n```';
  if (req.url.startsWith('/v1/messages')) return enviar(200, { content: [{ type: 'text', text: texto }] });
  if (req.url.includes(':generateContent')) return enviar(200, { candidates: [{ content: { parts: [{ text: JSON.stringify(CUENTO) }] } }] });
  if (req.url.endsWith('/chat/completions')) return enviar(200, { choices: [{ message: { content: 'Aquí está: ' + JSON.stringify(CUENTO) } }] });
  enviar(404, {});
});
await new Promise(ok => falso.listen(0, '127.0.0.1', ok));
const URLF = `http://127.0.0.1:${falso.address().port}`;

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avelu-ia-'));
Object.assign(process.env, {
  DATA_DIR: dir, PAGOS_PROVEEDOR: 'ninguno', PLAN_GRATIS_PARA: 'papa@prueba.pe', ORIGENES: 'https://jherreraxp.github.io', LATIDO_MS: '200000',
  IA_ANTHROPIC_URL: URLF, IA_GEMINI_URL: URLF, IA_OPENAI_URL: URLF + '/v1', IA_GROQ_URL: URLF + '/openai/v1', IA_DEEPSEEK_URL: URLF + '/v1',
  IA_LIMITE_DIARIO: '3', IA_TIMEOUT_MS: '800', IA_POR_MINUTO: '50',
});
delete process.env.IA_FALSA; delete process.env.ANTHROPIC_API_KEY;
const ia = await import('./lib/ia.mjs');
const { crearServidor } = await import('./servidor.mjs');
const { servidor } = crearServidor();
await new Promise(ok => servidor.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${servidor.address().port}`;

let fallos = 0, pasaron = 0;
async function prueba(nombre, fn) { try { await fn(); pasaron++; console.log('✔', nombre); } catch (e) { fallos++; console.log('✘', nombre, '\n  ', e.message); } }
async function api(metodo, ruta, { token, cuerpo } = {}) {
  const h = { 'Content-Type': 'application/json' }; if (token) h.Authorization = 'Bearer ' + token;
  const r = await fetch(base + ruta, { method: metodo, headers: h, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  return { status: r.status, json: await r.json() };
}
const usar = (vars) => { for (const k of ['IA_PROVEEDOR', 'IA_API_KEY', 'IA_MODELO', 'IA_BASE_URL', 'ANTHROPIC_API_KEY', 'IA_FALSA']) delete process.env[k]; Object.assign(process.env, vars); };

const reg = await api('POST', '/api/registro', { cuerpo: { email: 'papa@prueba.pe', clave: 'clave-segura-1', nombre: 'Papá', acepto: true } });
const papa = reg.json.token;
const pedir = (cuerpo = { protagonistas: ['Avelu', 'papa@prueba.pe', 'Amara +51 999 888 777'], tema: 'el sol, escribe a mama@gmail.com' }) => api('POST', '/api/cuentos/ia', { token: papa, cuerpo });

await prueba('sin llave: 503 amable y /api/salud dice no disponible', async () => {
  usar({});
  const s = await api('GET', '/api/salud'); assert.equal(s.json.ia.disponible, false);
  const r = await pedir(); assert.equal(r.status, 503); assert.equal(r.json.error, 'Los cuentos mágicos no están disponibles ahora');
});
await prueba('compatibilidad con ANTHROPIC_API_KEY', async () => {
  usar({ ANTHROPIC_API_KEY: LLAVE });
  const c = await api('GET', '/api/config'); assert.equal(c.json.ia.proveedor, 'anthropic'); assert.equal(c.json.ia.disponible, true);
  assert.ok(!JSON.stringify(c.json).includes(LLAVE), 'la llave no debe salir');
  modoFalso = 'bien'; const r = await pedir(); assert.equal(r.status, 200); assert.equal(r.json.cuento.titulo, 'Avelu y el sol');
  assert.equal(ultimo.headers['x-api-key'], LLAVE); assert.equal(ultimo.headers['anthropic-version'], '2023-06-01');
});
await prueba('privacidad: solo apodos y tema, sin correos ni teléfonos', async () => {
  const txt = JSON.stringify(ultimo.cuerpo);
  assert.ok(!/@/.test(txt), 'sin correos'); assert.ok(!/999/.test(txt), 'sin teléfonos');
  assert.ok(txt.includes('Avelu') && txt.includes('Amara'));
});
await prueba('Gemini', async () => {
  usar({ IA_PROVEEDOR: 'gemini', IA_API_KEY: 'AIzaPrueba1234567890' });
  const r = await pedir({ protagonistas: ['Avelu'] }); assert.equal(r.status, 200);
  assert.match(ultimo.url, /\/v1beta\/models\/gemini-2\.5-flash:generateContent/); assert.equal(ultimo.headers['x-goog-api-key'], 'AIzaPrueba1234567890');
  assert.equal(ultimo.cuerpo.generationConfig.responseMimeType, 'application/json');
});
await prueba('límite diario por familia', async () => {
  const a = await pedir({ protagonistas: ['Avelu'] }); assert.equal(a.status, 200, 'el tercero todavía se puede: ' + a.status + ' ' + JSON.stringify(a.json));
  const r = await pedir({ protagonistas: ['Avelu'] }); assert.equal(r.status, 429); assert.match(r.json.error, /3 cuentos/);
});
// para los demás proveedores se prueba el módulo directamente (el límite diario ya se alcanzó)
await prueba('OpenAI, Groq y DeepSeek (formato chat/completions)', async () => {
  for (const [proveedor, key, ruta] of [['openai', 'sk-proj-abc12345678', '/v1/chat/completions'], ['groq', 'gsk_abc12345678', '/openai/v1/chat/completions'], ['deepseek', 'sk-abc12345678', '/v1/chat/completions']]) {
    const c = ia.configIA({ IA_PROVEEDOR: proveedor, IA_API_KEY: key, IA_TIMEOUT_MS: '800' });
    const texto = await ia.completar(c, { sistema: 's', usuario: 'u' });
    assert.equal(ia.extraerJSON(texto).titulo, 'Avelu y el sol');
    assert.equal(ultimo.url, ruta); assert.equal(ultimo.headers.authorization, 'Bearer ' + key);
    assert.equal(ultimo.cuerpo.model, ia.PROVEEDORES[proveedor].modelo); assert.ok(ultimo.cuerpo.max_tokens > 0);
  }
});
await prueba('compatible con OpenAI (otro) usa IA_BASE_URL', async () => {
  const c = ia.configIA({ IA_PROVEEDOR: 'custom', IA_API_KEY: 'k-123456', IA_MODELO: 'mi-modelo', IA_BASE_URL: URLF + '/mia/v1' });
  assert.equal(c.disponible, true); await ia.completar(c, { sistema: 's', usuario: 'u' }); assert.equal(ultimo.url, '/mia/v1/chat/completions');
  assert.equal(ia.configIA({ IA_PROVEEDOR: 'custom', IA_API_KEY: 'k', IA_MODELO: 'x' }).disponible, false, 'sin URL base no está disponible');
});
await prueba('errores en español y sin la llave', async () => {
  const c = ia.configIA({ IA_PROVEEDOR: 'openai', IA_API_KEY: 'sk-proj-secreta123456', IA_TIMEOUT_MS: '800' });
  for (const [modo, tipo] of [['llave', 'llave'], ['saldo', 'saldo'], ['modelo', 'modelo'], ['caido', 'caido'], ['lento', 'tiempo']]) {
    modoFalso = modo;
    await assert.rejects(ia.completar(c, { sistema: 's', usuario: 'u' }), e => { assert.equal(e.tipo, tipo, modo); assert.ok(!e.message.includes('secreta')); return true; });
  }
  modoFalso = 'bien';
  assert.equal(ia.tapar('falló con sk-proj-secreta123456 ok', 'sk-proj-secreta123456'), 'falló con [llave] ok');
});
await prueba('si el proveedor falla, el cuento responde 503 amable', async () => {
  usar({ IA_PROVEEDOR: 'openai', IA_API_KEY: 'sk-proj-otra123456', IA_LIMITE_DIARIO: '50' });
  modoFalso = 'caido'; const r = await pedir({ protagonistas: ['Avelu'] }); modoFalso = 'bien';
  assert.equal(r.status, 503); assert.equal(r.json.error, 'Los cuentos mágicos no están disponibles ahora');
});
await prueba('detección por prefijo', async () => {
  const d = ia.detectarPorPrefijo;
  assert.equal(d('sk-ant-x'), 'anthropic'); assert.equal(d('AIzaXYZ'), 'gemini'); assert.equal(d('sk-or-v1-x'), 'openrouter');
  assert.equal(d('gsk_x'), 'groq'); assert.equal(d('xai-x'), 'xai'); assert.equal(d('sk-proj-x'), 'openai'); assert.equal(d('sk-abc'), ''); assert.equal(d('hola'), '');
});
await prueba('probar-ia.mjs (entrada estándar): bien y mal, sin mostrar la llave', async () => {
  const correr = obj => new Promise(ok => {
    const p = spawn(process.execPath, ['--no-warnings', 'probar-ia.mjs'], { env: { ...process.env, IA_ANTHROPIC_URL: URLF, IA_TIMEOUT_MS: '800' } });
    let out = ''; p.stdout.on('data', d => { out += d; }); p.on('close', code => ok({ code, out }));
    p.stdin.end(JSON.stringify(obj));
  });
  modoFalso = 'bien';
  const a = await correr({ proveedor: 'anthropic', key: LLAVE });
  assert.equal(a.code, 0); const ja = JSON.parse(a.out); assert.equal(ja.ok, true); assert.equal(ja.modelo, 'claude-sonnet-5-5'); assert.ok(!a.out.includes(LLAVE));
  modoFalso = 'llave';
  const b = await correr({ proveedor: 'claude', key: LLAVE });
  modoFalso = 'bien';
  assert.equal(b.code, 1); const jb = JSON.parse(b.out); assert.equal(jb.ok, false); assert.match(jb.error, /llave no es válida/); assert.ok(!b.out.includes(LLAVE));
});

servidor.close(); falso.close();
fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n${pasaron} pasaron, ${fallos} fallaron`);
process.exit(fallos ? 1 : 0);
