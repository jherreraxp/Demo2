// Suscripción mensual "familia" con Mercado Pago (preapproval) o PayPal (billing subscriptions).
// Nunca se cree lo que dice el aviso (webhook): siempre se consulta el estado a la API del proveedor.
import { config } from './config.mjs';
import { cuentaPorId, cuentaPorSuscripcion, guardarPlan, db } from './db.mjs';
import { ErrorUsuario, log } from './util.mjs';

const GRACIA_DIAS = 3;
const masDias = (fecha, d) => new Date(new Date(fecha).getTime() + d * 86400000).toISOString();
const unMes = () => { const f = new Date(); f.setMonth(f.getMonth() + 1); return f.toISOString(); };

async function pedir(url, opts = {}) {
  const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(15000) });
  const texto = await r.text();
  let json = null; try { json = JSON.parse(texto); } catch (e) {}
  if (!r.ok) { log('pagos_error', { url: url.replace(/\?.*/, ''), status: r.status }); throw new ErrorUsuario('El servicio de pagos no respondió bien. Prueba en un rato.', 502); }
  return json || {};
}

// ---------- Mercado Pago ----------
const mpCabeceras = () => ({ Authorization: 'Bearer ' + config.mp.token, 'Content-Type': 'application/json' });
async function mpCrear(c) {
  if (!config.mp.token) throw new ErrorUsuario('Los pagos aún no están configurados.', 503);
  const r = await pedir(config.mp.api + '/preapproval', {
    method: 'POST', headers: mpCabeceras(),
    body: JSON.stringify({
      reason: 'Avelu y Amara · Plan familia (mensual)',
      external_reference: c.id,
      payer_email: c.email,
      back_url: config.mp.backUrl,
      auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: config.mp.precio, currency_id: config.mp.moneda },
      status: 'pending',
    }),
  });
  if (!r.init_point || !r.id) throw new ErrorUsuario('No se pudo crear la suscripción.', 502);
  guardarPlan(c.id, { plan: c.plan, hasta: c.plan_hasta, proveedor: 'mercadopago', suscripcionId: r.id, estado: r.status || 'pending' });
  return r.init_point;
}
async function mpVerificar(id) {
  const s = await pedir(config.mp.api + '/preapproval/' + encodeURIComponent(id), { headers: mpCabeceras() });
  const cuentaId = s.external_reference;
  const c = (cuentaId && cuentaPorId(cuentaId)) || cuentaPorSuscripcion(id);
  if (!c) return;
  if (s.status === 'authorized') {
    const prox = s.next_payment_date || unMes();
    guardarPlan(c.id, { plan: 'familia', hasta: masDias(prox, GRACIA_DIAS), proveedor: 'mercadopago', suscripcionId: id, estado: 'authorized' });
  } else if (s.status === 'cancelled' || s.status === 'paused') {
    // sigue con "familia" hasta el fin del periodo pagado
    guardarPlan(c.id, { plan: c.plan, hasta: c.plan_hasta, estado: s.status });
  }
  db.prepare('INSERT INTO pagos_eventos (proveedor, ref, estado, recibido) VALUES (?, ?, ?, ?)').run('mercadopago', id, s.status || '', new Date().toISOString());
  log('pago_mp', { cuenta: c.id, estado: s.status });
}
async function mpCancelar(c) {
  await pedir(config.mp.api + '/preapproval/' + encodeURIComponent(c.suscripcion_id), { method: 'PUT', headers: mpCabeceras(), body: JSON.stringify({ status: 'cancelled' }) });
  guardarPlan(c.id, { plan: c.plan, hasta: c.plan_hasta, estado: 'cancelled' });
}

// ---------- PayPal ----------
let ppToken = { valor: '', vence: 0 };
async function ppCabeceras() {
  if (!config.paypal.clientId || !config.paypal.secret) throw new ErrorUsuario('Los pagos aún no están configurados.', 503);
  if (Date.now() > ppToken.vence) {
    const r = await pedir(config.paypal.api + '/v1/oauth2/token', {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(config.paypal.clientId + ':' + config.paypal.secret).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });
    ppToken = { valor: r.access_token, vence: Date.now() + ((r.expires_in || 300) - 60) * 1000 };
  }
  return { Authorization: 'Bearer ' + ppToken.valor, 'Content-Type': 'application/json' };
}
async function ppCrear(c) {
  if (!config.paypal.planId) throw new ErrorUsuario('Los pagos aún no están configurados.', 503);
  const r = await pedir(config.paypal.api + '/v1/billing/subscriptions', {
    method: 'POST', headers: await ppCabeceras(),
    body: JSON.stringify({
      plan_id: config.paypal.planId, custom_id: c.id,
      application_context: { brand_name: 'Avelu y Amara', locale: 'es-PE', user_action: 'SUBSCRIBE_NOW', return_url: config.paypal.backUrl, cancel_url: config.paypal.backUrl },
    }),
  });
  const link = (r.links || []).find(l => l.rel === 'approve');
  if (!link || !r.id) throw new ErrorUsuario('No se pudo crear la suscripción.', 502);
  guardarPlan(c.id, { plan: c.plan, hasta: c.plan_hasta, proveedor: 'paypal', suscripcionId: r.id, estado: r.status || 'APPROVAL_PENDING' });
  return link.href;
}
async function ppVerificar(id) {
  const s = await pedir(config.paypal.api + '/v1/billing/subscriptions/' + encodeURIComponent(id), { headers: await ppCabeceras() });
  const c = (s.custom_id && cuentaPorId(s.custom_id)) || cuentaPorSuscripcion(id);
  if (!c) return;
  if (s.status === 'ACTIVE') {
    const prox = s.billing_info?.next_billing_time || unMes();
    guardarPlan(c.id, { plan: 'familia', hasta: masDias(prox, GRACIA_DIAS), proveedor: 'paypal', suscripcionId: id, estado: 'ACTIVE' });
  } else if (['CANCELLED', 'SUSPENDED', 'EXPIRED'].includes(s.status)) {
    guardarPlan(c.id, { plan: c.plan, hasta: c.plan_hasta, estado: s.status });
  }
  db.prepare('INSERT INTO pagos_eventos (proveedor, ref, estado, recibido) VALUES (?, ?, ?, ?)').run('paypal', id, s.status || '', new Date().toISOString());
  log('pago_paypal', { cuenta: c.id, estado: s.status });
}
async function ppCancelar(c) {
  await pedir(config.paypal.api + '/v1/billing/subscriptions/' + encodeURIComponent(c.suscripcion_id) + '/cancel', { method: 'POST', headers: await ppCabeceras(), body: JSON.stringify({ reason: 'Cancelada por la familia' }) });
  guardarPlan(c.id, { plan: c.plan, hasta: c.plan_hasta, estado: 'CANCELLED' });
}

// ---------- interfaz común ----------
export async function crearSuscripcion(c) {
  if (config.pagos === 'mercadopago') return mpCrear(c);
  if (config.pagos === 'paypal') return ppCrear(c);
  throw new ErrorUsuario('Los pagos aún no están configurados.', 503);
}
export async function cancelarSuscripcion(c) {
  if (!c.suscripcion_id) throw new ErrorUsuario('No tienes una suscripción activa.');
  if (c.proveedor === 'mercadopago') return mpCancelar(c);
  if (c.proveedor === 'paypal') return ppCancelar(c);
  throw new ErrorUsuario('No tienes una suscripción activa.');
}
// aviso del proveedor: solo se toma el id y se verifica consultando su API
export async function webhook(query, cuerpo) {
  if (config.pagos === 'mercadopago') {
    const tipo = query.get('type') || query.get('topic') || cuerpo?.type || cuerpo?.topic || '';
    const id = query.get('data.id') || query.get('id') || cuerpo?.data?.id || cuerpo?.id;
    if (id && /preapproval|subscription/.test(tipo) && /^[\w-]{4,80}$/.test(String(id))) await mpVerificar(String(id));
  } else if (config.pagos === 'paypal') {
    const id = cuerpo?.resource?.id;
    if (id && /^BILLING\.SUBSCRIPTION\./.test(cuerpo?.event_type || '') && /^[\w-]{4,80}$/.test(id)) await ppVerificar(id);
  }
}
// al volver de la página de pago, el juego puede pedir revisar el estado al instante
export async function revisar(c) {
  if (!c.suscripcion_id) return;
  if (c.proveedor === 'mercadopago') await mpVerificar(c.suscripcion_id);
  else if (c.proveedor === 'paypal') await ppVerificar(c.suscripcion_id);
}
