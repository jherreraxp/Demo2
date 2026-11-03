// Configuración: todo viene de variables de entorno (en la VM: /etc/avelu/avelu.env).
const lista = v => String(v || '').split(',').map(s => s.trim()).filter(Boolean);
const env = process.env;
export const VERSION = '1.0.0';
export const config = {
  puerto: Number(env.PORT || 8787),
  host: env.HOST || '127.0.0.1',
  origenes: lista(env.ORIGENES || 'https://jherreraxp.github.io'),
  dataDir: env.DATA_DIR || '/var/lib/avelu',
  // carpeta con las páginas del juego (copia de gh-pages); si está vacía, solo se sirve la API
  sitio: env.SITIO_DIR || '',
  anthropicKey: env.ANTHROPIC_API_KEY || '',
  claudeModel: env.CLAUDE_MODEL || 'claude-sonnet-5-5',
  iaFalsa: env.IA_FALSA === '1',
  pagos: (env.PAGOS_PROVEEDOR || 'ninguno').toLowerCase(),
  mp: {
    token: env.MP_ACCESS_TOKEN || '',
    precio: Number(env.MP_PLAN_PRECIO || 19.9),
    moneda: env.MP_MONEDA || 'PEN',
    backUrl: env.MP_BACK_URL || 'https://jherreraxp.github.io/Demo2/cuenta.html',
    api: env.MP_API || 'https://api.mercadopago.com',
  },
  paypal: {
    clientId: env.PAYPAL_CLIENT_ID || '',
    secret: env.PAYPAL_SECRET || '',
    planId: env.PAYPAL_PLAN_ID || '',
    modo: env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox',
    backUrl: env.PAYPAL_BACK_URL || env.MP_BACK_URL || 'https://jherreraxp.github.io/Demo2/cuenta.html',
    get api() { return env.PAYPAL_API || (this.modo === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'); },
  },
  google: {
    clientId: (env.GOOGLE_CLIENT_ID || '').trim(),
    jwksUrl: env.GOOGLE_JWKS_URL || 'https://www.googleapis.com/oauth2/v3/certs',
  },
  gratisPara: lista(env.PLAN_GRATIS_PARA).map(e => e.toLowerCase()),
  // límites
  // cuentos con IA por familia al día (IA_LIMITE_DIARIO; se sigue leyendo el antiguo LIMITE_IA_DIA)
  get limiteIaDia() { return Number(env.IA_LIMITE_DIARIO || env.LIMITE_IA_DIA || 10); },
  diasSesion: 60,
};
