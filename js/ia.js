// Estudio Mágico: llamadas a Claude o Gemini directo desde el navegador, dictado por voz,
// jueguitos creados con IA (guardados en este aparato o publicados en la web) y copias en Google Drive.
// Las llaves se guardan SOLO en este navegador (localStorage); nunca se publican.
(function () {
  'use strict';
  const J = window.Juego;
  const LS = {
    get: (k, d = '') => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } },
    set: (k, v) => { try { if (v === '' || v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { throw new Error('No hay espacio en este aparato'); } },
  };

  // ---------- configuración (la llena mamá o papá en el admin) ----------
  const MODELOS_CLAUDE = ['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-haiku-5-5'];
  function config() {
    return {
      claude: LS.get('bl-ia-claude'), claudeModelo: LS.get('bl-ia-claude-modelo', MODELOS_CLAUDE[0]) || MODELOS_CLAUDE[0],
      gemini: LS.get('bl-ia-gemini'), geminiModelo: LS.get('bl-ia-gemini-modelo', 'gemini-2.5-flash') || 'gemini-2.5-flash',
      proveedor: LS.get('bl-ia-proveedor', 'claude') || 'claude',
      limite: +LS.get('bl-ia-limite', '10') || 0,
      gasUrl: LS.get('bl-gas-url'), gasClave: LS.get('bl-gas-clave'),
    };
  }
  function proveedor(pref) {
    const c = config(), p = pref || c.proveedor;
    if (p === 'gemini' && c.gemini) return 'gemini';
    if (p === 'claude' && c.claude) return 'claude';
    return c.claude ? 'claude' : c.gemini ? 'gemini' : null;
  }
  const hayMagia = () => !!proveedor();
  const enmascarar = k => k ? k.slice(0, 7) + '•••••' + k.slice(-4) : '';

  // límite diario de creaciones para que no se gaste mucho sin querer
  function usosHoy() { const hoy = new Date().toISOString().slice(0, 10); let u = {}; try { u = JSON.parse(LS.get('bl-ia-usos', '{}')); } catch (e) {} return u.dia === hoy ? u.n : 0; }
  function contarUso() { const hoy = new Date().toISOString().slice(0, 10); LS.set('bl-ia-usos', JSON.stringify({ dia: hoy, n: usosHoy() + 1 })); }
  const quedan = () => { const l = config().limite; return l ? Math.max(0, l - usosHoy()) : Infinity; };

  // ---------- llamar a la IA ----------
  function errorAmable(status, texto) {
    if (status === 401 || status === 403) return 'La llave de la IA no funciona. Revísala en el admin.';
    if (status === 429) return 'La IA está cansada (demasiadas preguntas). Espera un ratito.';
    if (status === 400 && /model/i.test(texto)) return 'Ese modelo de IA no existe. Revisa el nombre en el admin.';
    if (status >= 500) return 'La IA no contesta ahora. Prueba en un momento.';
    return 'La IA no pudo contestar (' + status + ').';
  }
  async function llamar({ sistema, mensaje, json = false, maxTokens, pref, contar = true }) {
    const p = proveedor(pref), c = config();
    if (!p) throw new Error('Falta activar la magia: pon una llave de Claude o Gemini en el admin.');
    if (contar && quedan() <= 0) throw new Error('Ya se usó toda la magia de hoy. ¡Mañana hay más!');
    let r;
    try {
      if (p === 'claude') {
        r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': c.claude, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true', 'content-type': 'application/json' },
          body: JSON.stringify({ model: c.claudeModelo, max_tokens: maxTokens || (json ? 2000 : 12000), system: sistema, messages: [{ role: 'user', content: mensaje }] }),
        });
      } else {
        r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.geminiModelo)}:generateContent?key=${encodeURIComponent(c.gemini)}`, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ systemInstruction: { parts: [{ text: sistema }] }, contents: [{ role: 'user', parts: [{ text: mensaje }] }], generationConfig: json ? { responseMimeType: 'application/json' } : {} }),
        });
      }
    } catch (e) { throw new Error('No hay internet o la IA no se pudo alcanzar.'); }
    const txt = await r.text();
    if (!r.ok) throw new Error(errorAmable(r.status, txt));
    let data; try { data = JSON.parse(txt); } catch (e) { throw new Error('La IA contestó algo raro.'); }
    const out = p === 'claude'
      ? (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('')
      : ((data.candidates || [])[0]?.content?.parts || []).map(x => x.text || '').join('');
    if (!out) throw new Error('La IA no contestó nada. Prueba otra vez.');
    if (contar) contarUso();
    return out;
  }
  // saca el primer objeto JSON del texto (por si viene con ```json)
  function sacarJSON(t) {
    const m = t.match(/```(?:json)?\s*([\s\S]*?)```/); const s = m ? m[1] : t;
    const a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b < a) throw new Error('La IA no mandó el personaje bien. Prueba otra vez.');
    return JSON.parse(s.slice(a, b + 1));
  }

  // ---------- dictado por voz ----------
  const Reco = window.SpeechRecognition || window.webkitSpeechRecognition;
  const puedeDictar = !!Reco;
  // escuchar({ onParcial, onFin, onError }) → { parar() }
  function escuchar({ onParcial = () => {}, onFin = () => {}, onError = () => {} } = {}) {
    if (!Reco) { onError(new Error('Este aparato no puede escuchar. Escribe con el teclado.')); return { parar() {} }; }
    J.stopVoice && J.stopVoice();
    let texto = '', intentoES = false, rec;
    const empezar = lang => {
      const r = rec = new Reco(); r.lang = lang; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
      r.onresult = e => { texto = [...e.results].map(x => x[0].transcript).join(' ').trim(); onParcial(texto); };
      r.onerror = e => {
        if (e.error === 'language-not-supported' && !intentoES) { intentoES = true; r.onend = null; empezar('es-ES'); return; }
        if (e.error === 'no-speech' || e.error === 'aborted') return;
        onError(new Error(e.error === 'not-allowed' ? 'Falta dar permiso al micrófono.' : 'No te escuché bien. Prueba otra vez.'));
      };
      r.onend = () => { if (r === rec) onFin(texto); };
      try { r.start(); } catch (e) { onError(e); }
    };
    empezar('es-PE');
    return { parar() { try { rec.stop(); } catch (e) {} } };
  }

  // ---------- personajes con IA ----------
  const slug = t => J.strip(String(t)).toLowerCase().replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'pj';
  const hexNum = v => typeof v === 'number' ? v : /^#?[0-9a-f]{6}$/i.test(String(v || '')) ? parseInt(String(v).replace('#', ''), 16) : null;
  function limpiarColores(obj) { const out = {}; Object.entries(obj || {}).forEach(([k, v]) => { const n = hexNum(v); if (n !== null) out[k] = n; }); return out; }

  // ---------- jueguitos con IA (en este aparato) ----------
  const KEY_JUEGOS = 'bl-juegos-ia';
  function juegosLocales() { try { return JSON.parse(LS.get(KEY_JUEGOS, '[]')) || []; } catch (e) { return []; } }
  function guardarJuegos(l) { LS.set(KEY_JUEGOS, JSON.stringify(l)); }
  function guardarJuego(j) { const l = juegosLocales().filter(x => x.id !== j.id); l.unshift(j); guardarJuegos(l); return j; }
  function borrarJuego(id) { guardarJuegos(juegosLocales().filter(x => x.id !== id)); }
  const juegoLocal = id => juegosLocales().find(x => x.id === id);

  // separa "TITULO: …", "EMOJI: …" y el HTML de la respuesta
  function leerJuego(t) {
    const titulo = (t.match(/T[IÍ]TULO\s*:\s*(.+)/i) || [])[1]?.trim().replace(/[*_`]/g, '') || 'Jueguito mágico';
    const emoji = (t.match(/EMOJI\s*:\s*(\S+)/i) || [])[1]?.trim() || '✨';
    let html = (t.match(/```html\s*([\s\S]*?)```/i) || t.match(/```\s*(<!doctype[\s\S]*?)```/i) || [])[1];
    if (!html) { const a = t.search(/<!doctype html|<html/i); if (a >= 0) html = t.slice(a); }
    if (!html || !/<\/(html|body)>|<script/i.test(html)) throw new Error('La IA no terminó el jueguito. Prueba otra vez o pide uno más sencillo.');
    if (html.length > 400000) throw new Error('El jueguito salió demasiado grande. Pide uno más sencillo.');
    return { titulo: titulo.slice(0, 40), emoji: [...emoji].slice(0, 2).join(''), html: html.trim() };
  }

  // el jueguito corre aislado: sin acceso a este sitio (llaves, progreso) y sin internet
  const CSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; form-action 'none'">`;
  function documentoSeguro(html) {
    if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, m => m + CSP);
    if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, m => m + '<head>' + CSP + '</head>');
    return CSP + html;
  }
  function montarJuego(cont, html, titulo = 'Jueguito') {
    const f = document.createElement('iframe');
    f.setAttribute('sandbox', 'allow-scripts');
    f.setAttribute('title', titulo);
    f.setAttribute('allow', 'autoplay');
    f.referrerPolicy = 'no-referrer';
    f.srcdoc = documentoSeguro(html);
    f.style.cssText = 'width:100%;height:100%;border:0;display:block;background:#fff';
    cont.innerHTML = ''; cont.appendChild(f);
    return f;
  }

  // ---------- publicar jueguitos en la web (rama gh-pages) ----------
  async function leerRemoto(path) {
    const H = window.Herr; if (!H || !H.token()) return null;
    try {
      const r = await fetch(`https://api.github.com/repos/${H.OWNER}/${H.REPO}/contents/${path}?ref=gh-pages`, { headers: { Authorization: 'Bearer ' + H.token(), Accept: 'application/vnd.github+json' } });
      if (!r.ok) return null;
      const f = await r.json();
      return JSON.parse(decodeURIComponent(escape(atob(f.content.replace(/\n/g, '')))));
    } catch (e) { return null; }
  }
  async function publicarJuego(id, onProgress = () => {}) {
    const H = window.Herr; if (!H) throw new Error('Falta la herramienta de publicar.');
    if (!H.token()) throw new Error('Primero pon la llave de GitHub en el admin (sección Publicar).');
    const j = juegoLocal(id); if (!j) throw new Error('No encontré ese jueguito.');
    const lista = (await leerRemoto('juegos-ia/lista.json')) || [];
    const meta = { id: j.id, titulo: j.titulo, emoji: j.emoji, fecha: j.fecha, pedido: j.pedido || '' };
    const nueva = [meta, ...lista.filter(x => x.id !== id)];
    await H.publicar({ files: [{ path: `juegos-ia/${id}.html`, text: j.html }, { path: 'juegos-ia/lista.json', text: JSON.stringify(nueva, null, 1) }], message: 'Jueguito mágico: ' + j.titulo, onProgress });
    j.publicado = true; guardarJuego(j);
    return true;
  }
  async function juegosPublicados() {
    try { const r = await fetch('juegos-ia/lista.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return []; const l = await r.json(); return Array.isArray(l) ? l : []; } catch (e) { return []; }
  }

  // ---------- copia en Google Drive (Apps Script de la familia) ----------
  const CLAVES_COPIA = ['bloques-letras', 'bl-mundos', 'bl-mundo-actual', KEY_JUEGOS, 'bl-tema', 'bl-foto-todos'];
  function datosCopia() { const d = {}; CLAVES_COPIA.forEach(k => { const v = LS.get(k, null); if (v !== null) d[k] = v; }); return d; }
  async function gas(body) {
    const c = config(); if (!c.gasUrl) throw new Error('Falta la dirección del Apps Script.');
    let r;
    try { r = await fetch(c.gasUrl, { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ clave: c.gasClave, ...body }) }); }
    catch (e) { throw new Error('No se pudo llegar al Apps Script. Revisa la dirección y que esté publicado para "Cualquier persona".'); }
    let data; try { data = JSON.parse(await r.text()); } catch (e) { throw new Error('El Apps Script contestó algo raro. ¿Está bien publicado?'); }
    if (!data.ok) throw new Error(data.error || 'El Apps Script dijo que no.');
    return data;
  }
  const probarDrive = () => gas({ accion: 'ping' });
  const guardarEnDrive = () => gas({ accion: 'guardar', datos: datosCopia(), dispositivo: navigator.userAgent.slice(0, 80) });
  async function traerDeDrive() {
    const r = await gas({ accion: 'cargar' });
    const d = r.datos || {};
    Object.entries(d).forEach(([k, v]) => { if (CLAVES_COPIA.includes(k) && typeof v === 'string') LS.set(k, v); });
    return r;
  }

  window.IA = {
    config, proveedor, hayMagia, enmascarar, MODELOS_CLAUDE, LS, quedan, usosHoy,
    llamar, sacarJSON, puedeDictar, escuchar,
    slug, hexNum, limpiarColores,
    juegosLocales, guardarJuego, borrarJuego, juegoLocal, leerJuego, montarJuego, documentoSeguro,
    publicarJuego, juegosPublicados,
    probarDrive, guardarEnDrive, traerDeDrive, datosCopia,
  };
})();
