import crypto from 'node:crypto';
// Suscripción mensual "familia" con Mercado Pago (preapproval) o PayPal (billing subscriptions).
// Nunca se cree lo que dice el aviso (webhook): siempre se consulta el estado a la API del proveedor.
import { config } from './config.mjs';
import { cuentaPorId, cuentaPorSuscripcion, guardarPlan, ajuste, eventoPago } from './db.mjs';
import { ErrorUsuario, log } from './util.mjs';

const GRACIA_DIAS = 3;
const masDias = (fecha, d) => new Date(new Date(fecha).getTime() + d * 86400000).toISOString();
const unMes = () => { const f = new Date(); f.setMonth(f.getMonth() + 1); return f.toISOString(); };

// ---------- errores del proveedor: se leen, se limpian y se traducen ----------
let ultimoError = null;
export const ultimoErrorPagos = () => ultimoError || ajuste('pagos_ultimo_error');
// quita correos, tokens y números largos antes de guardar o registrar nada
const limpiar = t => String(t || '')
  .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[correo]')
  .replace(/\b(TEST|APP_USR)-[\w-]{6,}/g, '[token]')
  .replace(/Bearer\s+\S+/gi, '[token]')
  .replace(/[<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240);
function detalleDe(json, texto) {
  const partes = [];
  if (json && typeof json === 'object') {
    for (const k of ['message', 'error', 'error_description', 'name']) if (typeof json[k] === 'string' && json[k]) partes.push(json[k]);
    const causas = Array.isArray(json.cause) ? json.cause : json.cause ? [json.cause] : [];
    for (const c of causas) partes.push(c && typeof c === 'object' ? [c.code, c.description].filter(v => v !== undefined && v !== null && v !== '').join(' ') : String(c));
    for (const d of Array.isArray(json.details) ? json.details : []) partes.push([d?.issue, d?.description].filter(Boolean).join(' '));
  } else if (texto && !/^\s*</.test(texto)) partes.push(texto.slice(0, 200));
  return limpiar([...new Set(partes.filter(Boolean))].join(' · '));
}
// mensaje claro en español para quien está pagando o configurando
export function mensajeDePago(status, detalle = '') {
  const d = detalle.toLowerCase();
  if (/payer.{0,40}collector.{0,40}(same|igual)|same user|cannot pay (to )?yourself|pay yourself|mism[oa] (usuario|cuenta)/.test(d))
    return 'No puedes suscribirte con la misma cuenta de Mercado Pago que cobra; usa otro correo.';
  if (/must be real or test|real or test users|test user|usuarios? de prueba/.test(d))
    return 'Estás usando credenciales de prueba: paga con un usuario de prueba de Mercado Pago (o usa el Access Token de producción).';
  if (/different countries|distintos pa[ií]ses/.test(d))
    return 'La cuenta que paga y la que cobra deben ser de Mercado Pago del mismo país (Perú).';
  if (/back_?url/.test(d))
    return 'Mercado Pago no acepta la dirección de regreso. Revisa MP_BACK_URL en el servidor: debe ser una dirección https completa (por ejemplo https://tu-dominio/cuenta.html).';
  if (/transaction_amount|currency|amount|monto|moneda/.test(d))
    return 'Mercado Pago no acepta el monto o la moneda. Revisa MP_PLAN_PRECIO (por ejemplo 19.90) y MP_MONEDA=PEN en el servidor.';
  if (status === 401 || status === 403 || /invalid (access )?token|unauthorized|forbidden|invalid credentials/.test(d))
    return 'El Access Token de Mercado Pago no es válido o no tiene permisos de Suscripciones.';
  if (status === 429) return 'El servicio de pagos está muy ocupado. Prueba en un minuto.';
  if (status >= 500 || !detalle) return 'El servicio de pagos no respondió bien. Prueba en un rato.';
  return 'El servicio de pagos no aceptó la suscripción: ' + detalle.slice(0, 140);
}
function anotarError(e) {
  ultimoError = { cuando: new Date().toISOString(), ...e };
  try { ajuste('pagos_ultimo_error', ultimoError); } catch {}
  log('pagos_error', e);
}
async function pedir(url, opts = {}, { proveedor = config.pagos, anotar = true } = {}) {
  const camino = url.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*/, '').replace(/\/[\w-]{12,}(?=\/|$)/g, '/…');
  let r, texto;
  try {
    r = await fetch(url, { ...opts, signal: AbortSignal.timeout(15000) });
    texto = await r.text();
  } catch (e) {
    const mensaje = 'No se pudo conectar con el servicio de pagos. Prueba en un rato.';
    if (anotar) anotarError({ proveedor, camino, status: 0, detalle: limpiar(e.name === 'TimeoutError' ? 'sin respuesta a tiempo' : 'sin conexión'), mensaje });
    throw new ErrorUsuario(mensaje, 502);
  }
  let json = null; try { json = JSON.parse(texto); } catch (e) {}
  if (!r.ok) {
    const detalle = detalleDe(json, texto), mensaje = mensajeDePago(r.status, detalle);
    if (anotar) anotarError({ proveedor, camino, status: r.status, detalle, mensaje });
    const err = new ErrorUsuario(mensaje, 502); err.detalle = detalle; err.statusProveedor = r.status;
    throw err;
  }
  return json || {};
}

// ---------- Mercado Pago ----------
const mpCabeceras = () => ({ Authorization: 'Bearer ' + config.mp.token, 'Content-Type': 'application/json' });
export const mpEsPrueba = () => /^TEST-/.test(config.mp.token);
// dirección a la que vuelve la familia después de pagar: siempre https. Si MP_BACK_URL sigue con la
// dirección de ejemplo (github.io) y el juego se abre desde otro sitio, se usa ese sitio.
export function backUrlDe(origen) {
  const conf = String(config.mp.backUrl || '');
  const o = String(origen || '');
  const propio = /^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(o) && !/github\.io$/i.test(o.replace(/:\d+$/, ''));
  if (propio && (!/^https:\/\//i.test(conf) || /github\.io/i.test(conf))) return o + '/suscripcion-lista.html';
  return conf;
}
async function mpCrear(c, { origen } = {}) {
  if (!config.mp.token) throw new ErrorUsuario('Los pagos aún no están configurados.', 503);
  const monto = Number(Number(config.mp.precio).toFixed(2));
  if (!(monto > 0)) throw new ErrorUsuario('El precio del plan no está bien configurado (MP_PLAN_PRECIO).', 503);
  const back = backUrlDe(origen);
  if (!/^https:\/\//i.test(back)) throw new ErrorUsuario('Falta la dirección de regreso de Mercado Pago (MP_BACK_URL debe empezar con https://).', 503);
  // con credenciales de prueba solo puede pagar un usuario de prueba
  const payer = mpEsPrueba() && config.mp.payerPrueba ? config.mp.payerPrueba : c.email;
  const r = await pedir(config.mp.api + '/preapproval', {
    method: 'POST', headers: mpCabeceras(),
    body: JSON.stringify({
      reason: 'Avelu y Amara · Plan familia (mensual)',
      external_reference: c.id,
      payer_email: payer,
      back_url: back,
      auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: monto, currency_id: String(config.mp.moneda || 'PEN').toUpperCase() },
      status: 'pending',
    }),
  }, { proveedor: 'mercadopago' });
  if (!r.init_point || !r.id) throw new ErrorUsuario('No se pudo crear la suscripción.', 502);
  guardarPlan(c.id, { plan: c.plan, hasta: c.plan_hasta, proveedor: 'mercadopago', suscripcionId: r.id, estado: r.status || 'pending' });
  eventoPago({ proveedor: 'mercadopago', ref: r.id, estado: r.status || 'pending', cuentaId: c.id, tipo: 'creada' });
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
  eventoPago({ proveedor: 'mercadopago', ref: id, estado: s.status || '', cuentaId: c.id, tipo: 'estado' });
  log('pago_mp', { cuenta: c.id, estado: s.status });
}
async function mpCancelar(c) {
  await pedir(config.mp.api + '/preapproval/' + encodeURIComponent(c.suscripcion_id), { method: 'PUT', headers: mpCabeceras(), body: JSON.stringify({ status: 'cancelled' }) });
  guardarPlan(c.id, { plan: c.plan, hasta: c.plan_hasta, estado: 'cancelled' });
  eventoPago({ proveedor: 'mercadopago', ref: c.suscripcion_id, estado: 'cancelled', cuentaId: c.id, tipo: 'cancelada' });
}
// diagnóstico para el panel: ¿el token sirve?, ¿es de prueba o de producción?, ¿la cuenta es de Perú?
export async function diagnosticoMercadoPago() {
  const d = { proveedor: config.pagos, configurado: !!config.mp.token, tipoToken: !config.mp.token ? 'sin token' : mpEsPrueba() ? 'prueba' : /^APP_USR-/.test(config.mp.token) ? 'producción' : 'desconocido',
    precio: Number(Number(config.mp.precio).toFixed(2)), moneda: config.mp.moneda, backUrl: config.mp.backUrl, firmaWebhook: !!config.mp.webhookSecret,
    payerPrueba: !!config.mp.payerPrueba, ultimoError: ultimoErrorPagos() };
  if (!config.mp.token) return d;
  try {
    const yo = await pedir(config.mp.api + '/users/me', { headers: mpCabeceras() }, { proveedor: 'mercadopago', anotar: false });
    d.tokenValido = true; d.siteId = yo.site_id || ''; d.paisOk = yo.site_id === 'MPE'; d.usuarioDePrueba = Array.isArray(yo.tags) ? yo.tags.includes('test_user') : undefined;
    d.cuentaCobro = yo.nickname ? String(yo.nickname).slice(0, 40) : '';
  } catch (e) { d.tokenValido = false; d.errorToken = e.message; }
  return d;
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
  eventoPago({ proveedor: 'paypal', ref: id, estado: s.status || '', cuentaId: c.id, tipo: 'estado' });
  log('pago_paypal', { cuenta: c.id, estado: s.status });
}
async function ppCancelar(c) {
  await pedir(config.paypal.api + '/v1/billing/subscriptions/' + encodeURIComponent(c.suscripcion_id) + '/cancel', { method: 'POST', headers: await ppCabeceras(), body: JSON.stringify({ reason: 'Cancelada por la familia' }) });
  guardarPlan(c.id, { plan: c.plan, hasta: c.plan_hasta, estado: 'CANCELLED' });
  eventoPago({ proveedor: 'paypal', ref: c.suscripcion_id, estado: 'CANCELLED', cuentaId: c.id, tipo: 'cancelada' });
}

// ---------- interfaz común ----------
export async function crearSuscripcion(c, opciones = {}) {
  if (config.pagos === 'mercadopago') return mpCrear(c, opciones);
  if (config.pagos === 'paypal') return ppCrear(c);
  throw new ErrorUsuario('Los pagos aún no están configurados.', 503);
}
export async function cancelarSuscripcion(c) {
  if (!c.suscripcion_id) throw new ErrorUsuario('No tienes una suscripción activa.');
  if (c.proveedor === 'mercadopago') return mpCancelar(c);
  if (c.proveedor === 'paypal') return ppCancelar(c);
  throw new ErrorUsuario('No tienes una suscripción activa.');
}
// firma de Mercado Pago: x-signature "ts=...,v1=..." = HMAC-SHA256(clave, "id:<data.id>;request-id:<x-request-id>;ts:<ts>;")
export function firmaMercadoPagoValida(cab, query, cuerpo, clave = config.mp.webhookSecret) {
  if (!clave) return true;
  const partes = Object.fromEntries(String(cab['x-signature'] || '').split(',').map(p => p.trim().split('=').map(x => (x || '').trim())));
  const ts = partes.ts, v1 = partes.v1;
  if (!ts || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) return false;
  let id = query.get('data.id') || cuerpo?.data?.id || '';
  id = String(id); if (/^[a-z0-9]+$/i.test(id)) id = id.toLowerCase();
  const rid = String(cab['x-request-id'] || '');
  let manifiesto = '';
  if (id) manifiesto += `id:${id};`;
  if (rid) manifiesto += `request-id:${rid};`;
  manifiesto += `ts:${ts};`;
  const esperado = crypto.createHmac('sha256', clave).update(manifiesto).digest();
  const recibido = Buffer.from(v1, 'hex');
  return recibido.length === esperado.length && crypto.timingSafeEqual(recibido, esperado);
}
// aviso del proveedor: se revisa la firma (si hay clave) y luego se verifica consultando su API
export async function webhook(query, cuerpo, cab = {}) {
  if (config.pagos === 'mercadopago') {
    if (!firmaMercadoPagoValida(cab, query, cuerpo)) { log('webhook_firma_mala', {}); return; }
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
