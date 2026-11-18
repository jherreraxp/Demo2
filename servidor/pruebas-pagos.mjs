// Pruebas de la suscripción con un Mercado Pago falso: node --no-warnings pruebas-pagos.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';

// Mercado Pago de mentira
const estados = {};
let falla = null, ultimoCuerpo = null;   // para probar los errores de Mercado Pago
const mp = http.createServer((req, res) => {
  let b = ''; req.on('data', c => b += c); req.on('end', () => {
    assert.equal(req.headers.authorization, 'Bearer TEST-TOKEN');
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET' && req.url === '/users/me') return res.end(JSON.stringify({ id: 1, nickname: 'TIENDA', site_id: 'MPE', tags: ['test_user'] }));
    if (req.method === 'POST' && req.url === '/preapproval' && falla) { ultimoCuerpo = JSON.parse(b); res.statusCode = falla.status; return res.end(typeof falla.cuerpo === 'string' ? falla.cuerpo : JSON.stringify(falla.cuerpo)); }
    if (req.method === 'POST' && req.url === '/preapproval') {
      const d = JSON.parse(b); ultimoCuerpo = d; estados.pre1 = { id: 'pre1', status: 'pending', external_reference: d.external_reference };
      assert.equal(d.auto_recurring.frequency_type, 'months'); assert.equal(d.auto_recurring.currency_id, 'PEN');
      return res.end(JSON.stringify({ id: 'pre1', init_point: 'https://mp.test/pagar/pre1', status: 'pending' }));
    }
    const m = req.url.match(/^\/preapproval\/(\w+)$/);
    if (m && req.method === 'GET') return res.end(JSON.stringify(estados[m[1]] || {}));
    if (m && req.method === 'PUT') { estados[m[1]].status = 'cancelled'; return res.end('{}'); }
    res.statusCode = 404; res.end('{}');
  });
});
await new Promise(ok => mp.listen(0, '127.0.0.1', ok));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avelu-pagos-'));
Object.assign(process.env, { DATA_DIR: dir, PAGOS_PROVEEDOR: 'mercadopago', MP_ACCESS_TOKEN: 'TEST-TOKEN', MP_API: `http://127.0.0.1:${mp.address().port}` });
const { crearServidor } = await import('./servidor.mjs');
const { servidor } = crearServidor();
await new Promise(ok => servidor.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${servidor.address().port}`;
const api = async (m, r, token, cuerpo, mas = {}) => (await fetch(base + r, { method: m, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...mas }, body: cuerpo ? JSON.stringify(cuerpo) : undefined })).json();

const reg = await api('POST', '/api/registro', null, { email: 'fam@prueba.pe', clave: 'clave-segura', nombre: 'Familia', acepto: true });
const t = reg.token;
const crear = await api('POST', '/api/suscripcion/crear', t); assert.equal(crear.url, 'https://mp.test/pagar/pre1');
// un aviso falso que dice "autorizado" no sirve: se consulta a MP, que aún dice "pending"
await api('POST', '/api/pagos/webhook?type=subscription_preapproval&data.id=pre1', null, { type: 'subscription_preapproval', data: { id: 'pre1' }, status: 'authorized' });
assert.equal((await api('GET', '/api/yo', t)).cuenta.plan, 'gratis');
// MP confirma el pago
const prox = new Date(Date.now() + 30 * 86400000).toISOString();
Object.assign(estados.pre1, { status: 'authorized', next_payment_date: prox });
await api('POST', '/api/pagos/webhook?type=subscription_preapproval&data.id=pre1', null, {});
const yo = (await api('GET', '/api/yo', t)).cuenta; assert.equal(yo.plan, 'familia'); assert.ok(new Date(yo.planHasta) > new Date(prox));
// ya con plan, puede pedir cuentos premium
assert.equal((await api('GET', '/api/cuentos', t)).cuentos.filter(c => !c.bloqueado).length, 12);
// cancelar: sigue con familia hasta fin de periodo
await api('POST', '/api/suscripcion/cancelar', t);
assert.equal(estados.pre1.status, 'cancelled');
assert.equal((await api('GET', '/api/yo', t)).cuenta.plan, 'familia');
console.log('✔ suscripción Mercado Pago: crear, verificar aviso, activar y cancelar');
// ---------- firma de los webhooks (MP_WEBHOOK_SECRET) ----------
{
  const crypto = await import('node:crypto');
  const { firmaMercadoPagoValida } = await import('./lib/pagos.mjs');
  const clave = 'a'.repeat(64), q = new URLSearchParams('type=subscription_preapproval&data.id=ABC123');
  const ts = '1704908010', rid = 'req-1';
  const v1 = crypto.createHmac('sha256', clave).update(`id:abc123;request-id:${rid};ts:${ts};`).digest('hex');
  assert.equal(firmaMercadoPagoValida({ 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': rid }, q, {}, clave), true);
  assert.equal(firmaMercadoPagoValida({ 'x-signature': `ts=${ts},v1=${'0'.repeat(64)}`, 'x-request-id': rid }, q, {}, clave), false);
  assert.equal(firmaMercadoPagoValida({}, q, {}, clave), false);
  assert.equal(firmaMercadoPagoValida({}, q, {}, ''), true);
  console.log('✔ firma de webhooks de Mercado Pago');
}

// ---------- errores de Mercado Pago: mensaje claro en español y "último error" guardado ----------
{
  const { config } = await import('./lib/config.mjs');
  const { ultimoErrorPagos, backUrlDe, diagnosticoMercadoPago } = await import('./lib/pagos.mjs');
  const r2 = await api('POST', '/api/registro', null, { email: 'otra@prueba.pe', clave: 'clave-segura', nombre: 'Otra', acepto: true });
  const casos = [
    [{ status: 400, cuerpo: { message: 'Payer and collector cannot be the same user', status: 400 } }, /misma cuenta de Mercado Pago que cobra/],
    [{ status: 400, cuerpo: { message: 'Both payer and collector must be real or test users', status: 400 } }, /credenciales de prueba/],
    [{ status: 400, cuerpo: { message: 'Bad request', cause: [{ code: 2034, description: 'Invalid users involved: test user required' }] } }, /credenciales de prueba/],
    [{ status: 400, cuerpo: { message: 'Invalid value for back_url, must be a valid URL', status: 400 } }, /MP_BACK_URL/],
    [{ status: 400, cuerpo: { message: 'Cannot pay an amount lower than 2.00', cause: [{ code: 'transaction_amount', description: 'invalid transaction_amount' }] } }, /MP_PLAN_PRECIO.*MP_MONEDA=PEN/],
    [{ status: 400, cuerpo: { message: 'currency_id invalid for this site', status: 400 } }, /MP_MONEDA=PEN/],
    [{ status: 401, cuerpo: { message: 'invalid access token', error: 'unauthorized', status: 401 } }, /Access Token de Mercado Pago no es válido/],
    [{ status: 403, cuerpo: { message: 'At least one policy returned UNAUTHORIZED.', code: 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES' } }, /Access Token de Mercado Pago no es válido/],
    [{ status: 400, cuerpo: { message: 'Algo raro con fam@prueba.pe y TEST-1234567890-abc', status: 400 } }, /no aceptó la suscripción: Algo raro con \[correo\] y \[token\]/],
    [{ status: 500, cuerpo: '<html>caído</html>' }, /no respondió bien/],
  ];
  for (const [f, esperado] of casos) {
    falla = f;
    const r = await api('POST', '/api/suscripcion/crear', r2.token);
    assert.equal(r.ok, false); assert.match(r.error, esperado, r.error);
    const u = ultimoErrorPagos();
    assert.equal(u.status, f.status); assert.equal(u.mensaje, r.error);
    assert.ok(!/@|TEST-\d/.test(JSON.stringify(u)), 'el último error no guarda correos ni tokens');
  }
  // también queda guardado en la base (sobrevive a un reinicio)
  const { ajuste } = await import('./lib/db.mjs');
  assert.equal(ajuste('pagos_ultimo_error').status, 500);
  falla = null;
  console.log('✔ errores de Mercado Pago traducidos y guardados (sin correos ni tokens)');

  // monto con 2 decimales, moneda PEN, regreso https y comprador de prueba
  config.mp.precio = 19.899999; config.mp.payerPrueba = 'test_user_123@testuser.com';
  await api('POST', '/api/suscripcion/crear', r2.token, null, { Origin: 'https://abu.arcillita.com' });
  assert.equal(ultimoCuerpo.auto_recurring.transaction_amount, 19.9); assert.equal(typeof ultimoCuerpo.auto_recurring.transaction_amount, 'number');
  assert.equal(ultimoCuerpo.auto_recurring.currency_id, 'PEN');
  assert.equal(ultimoCuerpo.payer_email, 'test_user_123@testuser.com');
  assert.equal(ultimoCuerpo.back_url, 'https://abu.arcillita.com/suscripcion-lista.html');
  // sin comprador de prueba se usa el correo de la cuenta; desde github.io se respeta MP_BACK_URL
  config.mp.payerPrueba = '';
  await api('POST', '/api/suscripcion/crear', r2.token, null, { Origin: 'https://jherreraxp.github.io' });
  assert.equal(ultimoCuerpo.payer_email, 'otra@prueba.pe'); assert.equal(ultimoCuerpo.back_url, 'https://jherreraxp.github.io/Demo2/cuenta.html');
  assert.equal(backUrlDe('http://localhost:8765'), 'https://jherreraxp.github.io/Demo2/cuenta.html');
  config.mp.backUrl = 'https://mi-dominio.pe/cuenta.html';
  assert.equal(backUrlDe('https://abu.arcillita.com'), 'https://mi-dominio.pe/cuenta.html');
  config.mp.precio = 0;
  assert.match((await api('POST', '/api/suscripcion/crear', r2.token)).error, /MP_PLAN_PRECIO/);
  config.mp.precio = 19.9;
  const d = await diagnosticoMercadoPago();
  assert.equal(d.tipoToken, 'prueba'); assert.equal(d.tokenValido, true); assert.equal(d.siteId, 'MPE'); assert.equal(d.paisOk, true);
  console.log('✔ monto, moneda, regreso https, comprador de prueba y diagnóstico');
}

servidor.close(); mp.close(); fs.rmSync(dir, { recursive: true, force: true });
process.exit(0);

