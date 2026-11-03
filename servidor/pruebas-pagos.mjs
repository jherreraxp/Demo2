// Pruebas de la suscripción con un Mercado Pago falso: node --no-warnings pruebas-pagos.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';

// Mercado Pago de mentira
const estados = {};
const mp = http.createServer((req, res) => {
  let b = ''; req.on('data', c => b += c); req.on('end', () => {
    assert.equal(req.headers.authorization, 'Bearer TEST-TOKEN');
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'POST' && req.url === '/preapproval') {
      const d = JSON.parse(b); estados.pre1 = { id: 'pre1', status: 'pending', external_reference: d.external_reference };
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
const api = async (m, r, token, cuerpo) => (await fetch(base + r, { method: m, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: cuerpo ? JSON.stringify(cuerpo) : undefined })).json();

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
servidor.close(); mp.close(); fs.rmSync(dir, { recursive: true, force: true });
process.exit(0);
