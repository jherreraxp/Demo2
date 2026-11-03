// Inteligencia artificial para los cuentos: un solo módulo con adaptadores para varios proveedores.
// Todos reciben el mismo pedido (sistema + usuario) y devuelven el texto de la respuesta;
// así el resto del servidor (y cuento.html) no cambia al cambiar de proveedor.
// La llave nunca se escribe en errores ni en registros.

// proveedores compatibles con la API de OpenAI (chat/completions)
const COMPATIBLES = {
  openai:     { nombre: 'OpenAI',     base: 'https://api.openai.com/v1',       modelo: 'gpt-4.1-mini', json: true },
  openrouter: { nombre: 'OpenRouter', base: 'https://openrouter.ai/api/v1',    modelo: 'openai/gpt-4.1-mini', json: true },
  groq:       { nombre: 'Groq',       base: 'https://api.groq.com/openai/v1',  modelo: 'llama-3.3-70b-versatile', json: true },
  deepseek:   { nombre: 'DeepSeek',   base: 'https://api.deepseek.com/v1',     modelo: 'deepseek-chat', json: true },
  mistral:    { nombre: 'Mistral',    base: 'https://api.mistral.ai/v1',       modelo: 'mistral-small-latest', json: true },
  xai:        { nombre: 'xAI',        base: 'https://api.x.ai/v1',             modelo: 'grok-3-mini', json: false },
  ollama:     { nombre: 'Ollama',     base: 'http://localhost:11434/v1',       modelo: 'llama3.2', json: true, sinLlave: true },
  custom:     { nombre: 'Compatible con OpenAI', base: '', modelo: '', json: false },
};
export const PROVEEDORES = {
  anthropic: { nombre: 'Claude (Anthropic)', modelo: 'claude-sonnet-5-5' },
  gemini:    { nombre: 'Gemini (Google)',    modelo: 'gemini-2.5-flash' },
  ...COMPATIBLES,
};
const ALIAS = { claude: 'anthropic', google: 'gemini', otro: 'custom', compatible: 'custom' };
export const normalizarProveedor = p => { const k = String(p || '').toLowerCase().trim(); return PROVEEDORES[ALIAS[k] || k] ? (ALIAS[k] || k) : ''; };

// direcciones (se pueden cambiar con variables de entorno para las pruebas)
const URL_ANTHROPIC = () => process.env.IA_ANTHROPIC_URL || 'https://api.anthropic.com';
const URL_GEMINI = () => process.env.IA_GEMINI_URL || 'https://generativelanguage.googleapis.com';
const baseCompatible = (p, baseUrl) => (baseUrl || process.env['IA_' + p.toUpperCase() + '_URL'] || COMPATIBLES[p].base || '').replace(/\/+$/, '');

export class ErrorIA extends Error {
  constructor(tipo, mensaje, status = 0) { super(mensaje); this.tipo = tipo; this.status = status; }
}
const MENSAJES = {
  llave: 'La llave no es válida o no tiene permiso.',
  saldo: 'La cuenta del proveedor no tiene saldo o se acabó su cuota.',
  modelo: 'Ese modelo no existe o la llave no tiene acceso a él.',
  tiempo: 'El proveedor tardó demasiado en responder.',
  caido: 'El servicio del proveedor no respondió bien. Prueba más tarde.',
  config: 'Falta configurar el proveedor de IA.',
  formato: 'La respuesta de la IA no vino en el formato esperado.',
};
// quita la llave (y cosas que parezcan llaves) de cualquier texto antes de mostrarlo o guardarlo
export function tapar(texto, key) {
  let t = String(texto || '');
  if (key && key.length >= 6) t = t.split(key).join('[llave]');
  return t.replace(/\b(sk-[A-Za-z0-9_-]{8,}|sk-ant-[A-Za-z0-9_-]{8,}|AIza[0-9A-Za-z_-]{10,}|gsk_[A-Za-z0-9]{8,}|xai-[A-Za-z0-9]{8,})/g, '[llave]').slice(0, 300);
}
function clasificar(status, cuerpo) {
  const t = String(cuerpo || '').toLowerCase();
  if (/quota|credit|billing|insufficient|balance|saldo|payment|exceeded your current/.test(t) && (status === 402 || status === 429 || status === 403 || status === 400)) return 'saldo';
  if (status === 401 || status === 403 || /invalid.{0,20}(api.?key|key|token)|api key not valid|authentication|unauthorized/.test(t)) return 'llave';
  if (status === 402) return 'saldo';
  if (status === 404 || /model.{0,40}(not found|does not exist|not exist|unknown|invalid)|no such model|unknown model/.test(t)) return 'modelo';
  if (status === 429) return 'saldo';
  return 'caido';
}

// configuración activa a partir de las variables de entorno
export function configIA(env = process.env) {
  let proveedor = normalizarProveedor(env.IA_PROVEEDOR);
  let key = env.IA_API_KEY || '';
  if (!key && env.ANTHROPIC_API_KEY && (!proveedor || proveedor === 'anthropic')) { key = env.ANTHROPIC_API_KEY; proveedor = 'anthropic'; }
  if (!proveedor && key) proveedor = detectarPorPrefijo(key) || '';
  const modelo = env.IA_MODELO || (proveedor === 'anthropic' && env.CLAUDE_MODEL) || (PROVEEDORES[proveedor] || {}).modelo || '';
  const baseUrl = env.IA_BASE_URL || '';
  const falsa = env.IA_FALSA === '1';
  const sinLlave = proveedor && COMPATIBLES[proveedor] && COMPATIBLES[proveedor].sinLlave;
  const disponible = falsa || !!(proveedor && modelo && (key || sinLlave) && (proveedor !== 'custom' || baseUrl));
  return { proveedor, key, modelo, baseUrl, falsa, disponible, maxTokens: Number(env.IA_MAX_TOKENS || 1500), timeoutMs: Number(env.IA_TIMEOUT_MS || 30000) };
}
// lo que se puede mostrar (nunca la llave)
export const resumenIA = c => ({ disponible: !!c.disponible, proveedor: c.falsa ? 'prueba' : (c.proveedor || ''), nombre: c.falsa ? 'Modo de prueba' : ((PROVEEDORES[c.proveedor] || {}).nombre || ''), modelo: c.falsa ? '' : (c.modelo || '') });

export function detectarPorPrefijo(key) {
  const k = String(key || '').trim();
  if (k.startsWith('sk-ant-')) return 'anthropic';
  if (k.startsWith('AIza')) return 'gemini';
  if (k.startsWith('sk-or-')) return 'openrouter';
  if (k.startsWith('gsk_')) return 'groq';
  if (k.startsWith('xai-')) return 'xai';
  if (k.startsWith('sk-proj-')) return 'openai';
  return ''; // "sk-" a secas puede ser OpenAI o DeepSeek: se pregunta
}

async function pedirHTTP(url, opciones, c) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), c.timeoutMs);
  let r, texto;
  try {
    r = await fetch(url, { ...opciones, signal: ctrl.signal });
    texto = await r.text();
  } catch (e) {
    if (e.name === 'AbortError') throw new ErrorIA('tiempo', MENSAJES.tiempo);
    throw new ErrorIA('caido', MENSAJES.caido);
  } finally { clearTimeout(t); }
  if (!r.ok) { const tipo = clasificar(r.status, texto); throw new ErrorIA(tipo, MENSAJES[tipo], r.status); }
  try { return JSON.parse(texto); } catch { throw new ErrorIA('formato', MENSAJES.formato); }
}

// pide un texto al proveedor: { sistema, usuario, maxTokens, json }
export async function completar(c, { sistema, usuario, maxTokens, json = true }) {
  if (!c.proveedor || !c.modelo) throw new ErrorIA('config', MENSAJES.config);
  const max = Math.min(maxTokens || c.maxTokens, 4000);
  if (c.proveedor === 'anthropic') {
    const j = await pedirHTTP(URL_ANTHROPIC() + '/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': c.key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: c.modelo, max_tokens: max, system: sistema, messages: [{ role: 'user', content: usuario }] }),
    }, c);
    return (j.content || []).map(b => b.text || '').join('');
  }
  if (c.proveedor === 'gemini') {
    const j = await pedirHTTP(`${URL_GEMINI()}/v1beta/models/${encodeURIComponent(c.modelo)}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': c.key, 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sistema }] },
        contents: [{ role: 'user', parts: [{ text: usuario }] }],
        generationConfig: { maxOutputTokens: max, ...(json ? { responseMimeType: 'application/json' } : {}) },
      }),
    }, c);
    return ((j.candidates || [])[0]?.content?.parts || []).map(p => p.text || '').join('');
  }
  const preset = COMPATIBLES[c.proveedor];
  if (!preset) throw new ErrorIA('config', MENSAJES.config);
  const base = baseCompatible(c.proveedor, c.proveedor === 'custom' ? c.baseUrl : (c.baseUrl || ''));
  if (!base) throw new ErrorIA('config', 'Falta la dirección (URL base) del proveedor.');
  const cuerpo = { model: c.modelo, max_tokens: max, messages: [{ role: 'system', content: sistema }, { role: 'user', content: usuario }] };
  if (json && preset.json) cuerpo.response_format = { type: 'json_object' };
  const headers = { 'content-type': 'application/json' };
  if (c.key) headers.authorization = 'Bearer ' + c.key;
  if (c.proveedor === 'openrouter') { headers['HTTP-Referer'] = 'https://abu.arcillita.com'; headers['X-Title'] = 'Avelu y Amara'; }
  const j = await pedirHTTP(base + '/chat/completions', { method: 'POST', headers, body: JSON.stringify(cuerpo) }, c);
  const m = (j.choices || [])[0]?.message?.content;
  return Array.isArray(m) ? m.map(x => x.text || '').join('') : String(m || '');
}

// saca el primer objeto JSON de un texto (con o sin ```json)
export function extraerJSON(texto) {
  const t = String(texto || '').replace(/```(?:json)?/gi, '').trim();
  const ini = t.indexOf('{');
  if (ini < 0) return null;
  let nivel = 0, enTexto = false, escape = false;
  for (let i = ini; i < t.length; i++) {
    const ch = t[i];
    if (enTexto) { if (escape) escape = false; else if (ch === '\\') escape = true; else if (ch === '"') enTexto = false; continue; }
    if (ch === '"') enTexto = true;
    else if (ch === '{') nivel++;
    else if (ch === '}' && --nivel === 0) { try { return JSON.parse(t.slice(ini, i + 1)); } catch { return null; } }
  }
  return null;
}

// prueba corta para validar una llave antes de guardarla
export async function probar(c) {
  const texto = await completar({ ...c, maxTokens: 30, timeoutMs: c.timeoutMs || 30000 }, {
    sistema: 'Responde solo con JSON.', usuario: 'Responde exactamente {"ok":true}', maxTokens: 30, json: true,
  });
  if (!texto) throw new ErrorIA('formato', MENSAJES.formato);
  return true;
}
