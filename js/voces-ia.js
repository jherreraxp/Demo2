/* Estudio de voz — voces y efectos profesionales con IA (ElevenLabs).
   - La llave de ElevenLabs es del papá o la mamá y se guarda SOLO en este navegador (localStorage 'bl-eleven-key').
     Nunca va al repositorio ni a nuestro servidor: el navegador le habla directo a api.elevenlabs.io.
   - Las voces generadas se guardan igual que las grabadas (J.voices.set), así el juego las usa sin cambiar nada.
   - Los efectos se guardan como 'efecto <grupo>', igual que los que se suben en el modo admin.
   Avisa a la página con el evento 'voces-cambio' para que repinte la lista. */
(() => {
  const J = window.Juego, $ = s => document.querySelector(s);
  if (!J || !$('#ia-card')) return;
  const API = 'https://api.elevenlabs.io/v1';
  const K = { llave: 'bl-eleven-key', voz: 'bl-eleven-voz', modelo: 'bl-eleven-modelo', ajustes: 'bl-eleven-ajustes', efectos: 'bl-eleven-efectos' };
  const MODELO = 'eleven_multilingual_v2', FORMATO = 'mp3_44100_128', A_LA_VEZ = 2, INTENTOS = 5;
  const ls = {
    get: k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
    del: k => { try { localStorage.removeItem(k); } catch (e) {} },
    json: (k, def) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || def; } catch (e) { return def; } }
  };
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = n => Math.round(n).toLocaleString('es-PE');
  const esDemo = () => !!(window.Cuenta && Cuenta.esDemo && Cuenta.esDemo());
  const llave = () => ls.get(K.llave).trim();
  const avisarCambio = () => dispatchEvent(new Event('voces-cambio'));
  const espera = (ms, signal) => new Promise((ok, no) => {
    const t = setTimeout(ok, ms);
    if (signal) signal.addEventListener('abort', () => { clearTimeout(t); no(new DOMException('cancelado', 'AbortError')); }, { once: true });
  });

  // ---------- hablar con ElevenLabs ----------
  class ErrorEL extends Error { constructor(msg, extra = {}) { super(msg); Object.assign(this, extra); } }
  function explicar(status, cuerpo, retryAfter) {
    const d = cuerpo && cuerpo.detail, cod = String((d && (d.status || d.code)) || (typeof d === 'string' ? d : '') || '').toLowerCase();
    const msg = (d && d.message) || (typeof d === 'string' ? d : '') || '';
    if (status === 402 || /quota|insufficient|credit|payment_required/.test(cod) && !/voice/.test(cod))
      return new ErrorEL('Tu cuenta de ElevenLabs se quedó sin créditos. Espera a que se renueven el próximo mes o sube de plan en elevenlabs.io. Lo ya generado quedó guardado.', { status, fatal: true, tipo: 'creditos' });
    if (/unusual_activity/.test(cod))
      return new ErrorEL('ElevenLabs bloqueó el plan gratis en esta conexión (suele pasar con VPN o redes compartidas). Prueba con otra red o con un plan de pago.', { status, fatal: true });
    if (/missing_permissions/.test(cod))
      return new ErrorEL('A tu llave le falta un permiso. Al crearla en ElevenLabs activa: Texto a voz, Efectos de sonido y Voces (lectura).', { status, fatal: true, tipo: 'permiso' });
    if (/free_users_not_allowed|voice_not_fine_tuned|can_not_use|library/.test(cod))
      return new ErrorEL('Esa voz necesita un plan de pago de ElevenLabs. Elige otra de la lista.', { status, fatal: true });
    if (status === 401 || status === 403 || /invalid_api_key/.test(cod))
      return new ErrorEL('La llave de ElevenLabs no es válida. Cópiala de nuevo o crea otra en elevenlabs.io → Developers → API Keys.', { status, fatal: true, tipo: 'llave' });
    if (status === 404 || /voice_not_found/.test(cod))
      return new ErrorEL('Esa voz ya no está en tu cuenta de ElevenLabs. Toca "Buscar voces" y elige otra.', { status, fatal: true });
    if (status === 429 || /too_many|rate_limit|system_busy/.test(cod))
      return new ErrorEL('ElevenLabs está ocupado ahora. Se intentará de nuevo.', { status, reintentar: true, retryAfter });
    if (status >= 500) return new ErrorEL('ElevenLabs tuvo un problema. Intenta de nuevo en un momento.', { status, reintentar: true });
    return new ErrorEL('ElevenLabs no aceptó el pedido' + (msg ? ': ' + msg : ` (error ${status}).`), { status });
  }
  async function pedir(ruta, { method = 'GET', body, signal, audio } = {}) {
    if (!llave()) throw new ErrorEL('Primero pega tu llave de ElevenLabs.', { fatal: true, tipo: 'llave' });
    let r;
    try {
      r = await fetch(API + ruta, {
        method, signal,
        headers: { 'xi-api-key': llave(), ...(body ? { 'Content-Type': 'application/json' } : {}), ...(audio ? { Accept: 'audio/mpeg' } : {}) },
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (e) {
      if (e && e.name === 'AbortError') throw e;
      throw new ErrorEL('No se pudo conectar con ElevenLabs. Revisa tu internet e intenta de nuevo.', { reintentar: true, red: true });
    }
    if (!r.ok) { let c = null; try { c = await r.json(); } catch (e) {} throw explicar(r.status, c, +r.headers.get('retry-after') || 0); }
    if (!audio) return r.json();
    const buf = await r.arrayBuffer();
    if (buf.byteLength < 200) throw new ErrorEL('ElevenLabs devolvió un audio vacío.', { reintentar: true });
    return new Blob([buf], { type: 'audio/mpeg' });
  }
  async function conReintentos(fn, signal) {
    for (let i = 0; ; i++) {
      try { return await fn(); }
      catch (e) {
        if (!e.reintentar || i >= INTENTOS - 1) throw e;
        await espera(e.retryAfter ? e.retryAfter * 1000 : Math.min(20000, 1000 * 2 ** i) + Math.random() * 400, signal);
      }
    }
  }
  const ajustes = () => ({ estabilidad: 0.5, parecido: 0.75, velocidad: 0.95, ...ls.json(K.ajustes, {}) });
  const vozElegida = () => ($('#el-voz-id').value.trim() || $('#el-voz').value || '').trim();
  const modelo = () => $('#el-modelo').value.trim() || MODELO;
  function hablar(texto, signal) {
    const a = ajustes(), voz = vozElegida();
    if (!voz) return Promise.reject(new ErrorEL('Elige una voz primero (toca "Buscar voces").', { fatal: true }));
    return pedir(`/text-to-speech/${encodeURIComponent(voz)}?output_format=${FORMATO}`, {
      method: 'POST', audio: true, signal,
      body: { text: texto, model_id: modelo(), voice_settings: { stability: a.estabilidad, similarity_boost: a.parecido, style: 0, use_speaker_boost: true, speed: a.velocidad } }
    });
  }
  const efectoIA = (texto, segundos, signal) => pedir(`/sound-generation?output_format=${FORMATO}`, {
    method: 'POST', audio: true, signal, body: { text: texto, duration_seconds: Math.max(0.5, Math.min(22, +segundos || 1)), prompt_influence: 0.4 }
  });
  let sonando = null;
  function tocar(fuente) {
    try { if (sonando) sonando.pause(); } catch (e) {}
    sonando = new Audio(typeof fuente === 'string' ? fuente : URL.createObjectURL(fuente));
    sonando.play().catch(() => {});
  }

  // ---------- llave ----------
  const estLlave = (html, clase = '') => { $('#el-llave-estado').innerHTML = clase ? `<span class="${clase}">${html}</span>` : html; };
  function pintarLlave() {
    const k = llave(), demo = esDemo();
    $('#ia-demo').hidden = !demo;
    $('#ia-cuerpo').hidden = demo;
    $('#ef-cuerpo').hidden = demo; $('#ef-demo').hidden = !demo;
    if (demo) return;
    $('#el-llave').value = '';
    $('#el-llave').placeholder = k ? 'Guardada: ' + k.slice(0, 3) + '••••••••' + k.slice(-4) : 'Pega aquí tu llave (sk_…)';
    $('#el-borrar').hidden = !k;
    document.querySelectorAll('[data-con-llave]').forEach(el => { el.hidden = !k; });
    if (!k) estLlave('Todavía no hay llave. Sin llave, el juego sigue usando tus grabaciones y la voz del aparato.');
  }
  async function guardarLlave() {
    const v = $('#el-llave').value.trim();
    if (esDemo()) return;
    if (!v) { if (llave()) cargarVoces(); else estLlave('Pega la llave primero.', 'err'); return; }
    if (v.length < 20 || /\s/.test(v)) { estLlave('Eso no parece una llave de ElevenLabs. Cópiala completa.', 'err'); return; }
    ls.set(K.llave, v); pintarLlave();
    estLlave('Revisando la llave…');
    await cargarVoces(true);
  }
  function borrarLlave() {
    ls.del(K.llave); voces = []; creditos = null;
    $('#el-voz').innerHTML = ''; pintarLlave(); pintarGrupos();
    estLlave('Llave borrada de este navegador.', 'ok');
  }

  // ---------- voces de la cuenta ----------
  let voces = [], creditos = null;
  const GENERO = { female: 'mujer', male: 'hombre', neutral: 'neutra' };
  const esEspanol = v => { const l = v.labels || {}; return /^es|spanish/i.test(l.language || '') || (v.verified_languages || []).some(x => /^es/i.test(x.language || '')); };
  async function cargarVoces(esNueva) {
    if (!llave()) return;
    $('#el-voces').disabled = true;
    try {
      const r = await conReintentos(() => pedir('/voices'));
      voces = (r.voices || []).slice().sort((a, b) => (esEspanol(b) - esEspanol(a)) || String(a.name).localeCompare(String(b.name)));
      const guardada = ls.get(K.voz);
      $('#el-voz').innerHTML = voces.map(v => {
        const l = v.labels || {}, extra = [GENERO[l.gender] || l.gender, l.accent, l.age === 'young' ? 'joven' : '', esEspanol(v) ? 'español' : ''].filter(Boolean).join(', ');
        return `<option value="${esc(v.voice_id)}" ${v.voice_id === guardada ? 'selected' : ''}>${esc(v.name)}${extra ? ' — ' + esc(extra) : ''}</option>`;
      }).join('');
      if (guardada && !voces.some(v => v.voice_id === guardada)) $('#el-voz-id').value = guardada;
      estLlave(voces.length ? `✅ Llave correcta. ${voces.length} voces en tu cuenta.` : '✅ Llave correcta, pero tu cuenta no tiene voces. Agrega una en elevenlabs.io → Voices.', 'ok');
      leerCreditos();
    } catch (e) {
      estLlave(esc(e.message), 'err');
      if (esNueva && e.tipo === 'llave') { ls.del(K.llave); pintarLlave(); estLlave(esc(e.message), 'err'); }
    }
    $('#el-voces').disabled = false;
    pintarGrupos();
  }
  async function leerCreditos() { // opcional: si la llave no tiene este permiso, simplemente no se muestra
    try { const s = await pedir('/user/subscription'); if (s && s.character_limit) creditos = Math.max(0, s.character_limit - (s.character_count || 0)); }
    catch (e) { creditos = null; }
    pintarGrupos();
  }

  // ---------- qué falta ----------
  const GRUPOS = window.FRASES || [];
  let local = new Set(), elegidos = null;
  const esLetras = gr => gr.items.length && gr.items.every(it => it.key.startsWith('sonido '));
  const falta = it => !local.has(it.key) && ($('#el-reemplazar').checked || !J.voices.hasPublic(it.key));
  const faltanDe = gr => gr.items.filter(falta);
  const letras = items => items.reduce((n, it) => n + String(it.texto).length, 0);
  function cola() { return GRUPOS.filter(gr => elegidos.has(gr.id)).flatMap(gr => faltanDe(gr)); }
  async function pintarGrupos() {
    if (esDemo()) return;
    local = new Set(await J.voices.keys());
    if (!elegidos) elegidos = new Set(GRUPOS.filter(gr => !esLetras(gr)).map(gr => gr.id));
    $('#el-grupos').innerHTML = GRUPOS.map(gr => {
      const f = faltanDe(gr);
      return `<label class="ia-grupo ${f.length ? '' : 'lleno'}"><input type="checkbox" data-id="${esc(gr.id)}" ${elegidos.has(gr.id) && f.length ? 'checked' : ''} ${f.length ? '' : 'disabled'}>
        <span><b>${esc(gr.nombre)}</b>${esLetras(gr) ? ' <i>(suele salir mejor con tu voz)</i>' : ''}<br><small>${f.length ? `faltan ${f.length} de ${gr.items.length} · ≈ ${num(letras(f))} caracteres` : 'completo ✔'}</small></span></label>`;
    }).join('');
    pintarEstimado();
    pintarEfectos();
    if (corrida) pintarCorrida();
  }
  function pintarEstimado() {
    const c = cola(), n = letras(c), b = $('#el-generar');
    if (corrida) return;
    b.disabled = !c.length || !llave();
    b.textContent = c.length ? `✨ Generar ${c.length} ${c.length === 1 ? 'frase' : 'frases'} que faltan` : '✨ Generar las que faltan';
    let t = c.length ? `Se van a generar <b>${c.length}</b> frases: gastan cerca de <b>${num(n)} caracteres</b> de tu plan de ElevenLabs.` : 'No falta ninguna frase en los grupos marcados. 🎉';
    if (c.length && creditos != null) t += creditos >= n ? ` Te quedan ${num(creditos)} este mes: alcanza.` : ` <span class="err">Solo te quedan ${num(creditos)} este mes: no alcanza para todo.</span> Se generará hasta donde llegue, o marca menos grupos.`;
    if (c.length && creditos == null) t += ' El plan gratis trae 10 000 al mes.';
    $('#el-estimado').innerHTML = t;
  }

  // ---------- generar las que faltan ----------
  let corrida = null;
  const estado = (html, clase = '') => { $('#el-estado').innerHTML = clase ? `<span class="${clase}">${html}</span>` : html; };
  function pintarCorrida() {
    const c = corrida, b = $('#el-barra');
    $('#el-pausa').hidden = $('#el-cancelar').hidden = b.hidden = !c;
    $('#el-generar').hidden = !!c;
    document.querySelectorAll('#el-grupos input, #el-reemplazar, #el-voz, #el-voz-id, #el-modelo').forEach(el => { el.disabled = !!c || (el.dataset.id && el.closest('.lleno')); });
    if (!c) return;
    b.max = c.total; b.value = c.hechos + c.fallos.length;
    $('#el-pausa').textContent = c.pausa ? '▶ Seguir' : '⏸ Pausar';
    estado(`${c.pausa ? 'En pausa' : 'Generando'}… ${c.hechos + c.fallos.length} de ${c.total}${c.ultimo ? ' · ' + esc(c.ultimo) : ''}${c.fallos.length ? ` · ${c.fallos.length} con error` : ''}`);
  }
  async function generar() {
    if (corrida || esDemo()) return;
    const lista = cola();
    if (!lista.length) return;
    if (!vozElegida()) { estado('Elige una voz primero (toca "Buscar voces").', 'err'); return; }
    ls.set(K.voz, vozElegida()); ls.set(K.modelo, modelo());
    const c = corrida = { ctrl: new AbortController(), pausa: false, total: lista.length, hechos: 0, gastados: 0, fallos: [], fatal: null, ultimo: '', i: 0 };
    pintarCorrida();
    let pinta = 0;
    const repintar = () => { pintarCorrida(); const t = Date.now(); if (t - pinta > 800) { pinta = t; avisarCambio(); } };
    const obrero = async () => {
      while (c.i < lista.length && !c.parar && !c.ctrl.signal.aborted) {
        while (c.pausa && !c.ctrl.signal.aborted) await espera(200).catch(() => {});
        if (c.ctrl.signal.aborted) break;
        const it = lista[c.i++];
        try {
          const blob = await conReintentos(() => hablar(it.texto, c.ctrl.signal), c.ctrl.signal);
          await J.voices.set(it.key, blob); await J.voices.refresh(it.key);
          c.hechos++; c.gastados += String(it.texto).length; c.ultimo = it.label || it.texto;
        } catch (e) {
          if (e && e.name === 'AbortError') break;
          if (e.fatal) { c.fatal = c.fatal || e; c.parar = true; break; } // sin créditos o llave mala: no se piden más (las que ya estaban en camino terminan)
          c.fallos.push({ it, e });
        }
        repintar();
      }
    };
    await Promise.all(Array.from({ length: Math.min(A_LA_VEZ, lista.length) }, obrero));
    corrida = null;
    if (creditos != null) creditos = Math.max(0, creditos - c.gastados);
    pintarCorrida(); await pintarGrupos(); avisarCambio();
    const hechas = c.hechos ? `Se guardaron <b>${c.hechos}</b> voces (≈ ${num(c.gastados)} caracteres).` : 'No se generó ninguna voz.';
    if (c.fatal) estado(`${esc(c.fatal.message)}<br><span style="font-weight:400">${hechas}</span>`, 'err');
    else if (c.cancelada) estado(`Cancelado. ${hechas} Puedes seguir después: solo se generan las que faltan.`);
    else if (c.fallos.length) estado(`${hechas} <span class="err">${c.fallos.length} no salieron</span> (${esc(c.fallos[0].e.message)}). Toca Generar otra vez para reintentarlas.`);
    else estado(`🎉 ¡Listo! ${hechas} Escúchalas en la lista de arriba; si alguna no te gusta, bórrala y grábala con tu voz.`, 'ok');
  }

  // ---------- efectos con IA ----------
  const EFECTOS = { // descripciones en inglés: así las entiende mejor el generador de efectos
    acierto: ['Short cheerful success chime with bright bells, positive ding for a children\'s game', 1],
    error: ['Soft friendly cartoon "oops" boing, gentle and not scary, wrong answer in a kids game', 0.8],
    moneda: ['Single shiny coin pickup, bright sparkle, classic arcade game', 0.6],
    salto: ['Cartoon jump, springy bouncy whoosh, kids game', 0.6],
    pop: ['Single soft cute bubble pop, very short', 0.5],
    festejo: ['Short triumphant fanfare with trumpets, level complete in a children\'s game, joyful', 3],
    aplauso: ['Small group of children clapping and cheering happily', 3],
    popo: ['Funny cartoon squishy splat with a silly toot, kids humor', 1],
    pum: ['Cartoon toy hammer bonk, squeaky and playful', 0.6],
    abrir: ['Magical gift box opening with sparkles and a soft twinkling chime', 2]
  };
  const grupoEf = () => J.GRUPOS_EFECTOS || {};
  const propios = () => ls.json(K.efectos, {});
  const pedidoEf = g => { const p = propios()[g] || {}, d = EFECTOS[g] || ['Short playful game sound effect', 1]; return { texto: p.texto || d[0], seg: p.seg || d[1] }; };
  let efOcupado = false;
  function pintarEfectos() {
    if (esDemo() || efOcupado) return;
    const foco = document.activeElement && document.activeElement.closest && document.activeElement.closest('#ef-lista');
    if (foco) return; // no borrar lo que se está escribiendo
    $('#ef-lista').innerHTML = Object.entries(grupoEf()).map(([g, nombre]) => {
      const p = pedidoEf(g), tiene = local.has('efecto ' + g);
      return `<div class="ia-ef" data-g="${esc(g)}">
        <b><span class="dot ${tiene ? 'local' : ''}"></span>${esc(nombre)}</b>
        <input type="text" data-c="texto" value="${esc(p.texto)}" aria-label="Descripción en inglés del efecto ${esc(nombre)}">
        <label class="seg"><input type="number" data-c="seg" min="0.5" max="10" step="0.1" value="${p.seg}" aria-label="Segundos"> s</label>
        <span class="btns"><button data-a="gen" ${llave() ? '' : 'disabled'}>✨ ${tiene ? 'Otra versión' : 'Generar'}</button><button data-a="oir" ${tiene ? '' : 'disabled'} aria-label="Oír ${esc(nombre)}">🔊</button><button data-a="del" ${tiene ? '' : 'disabled'} aria-label="Quitar ${esc(nombre)}">🗑</button></span>
        <small class="progreso" data-e></small></div>`;
    }).join('');
    const faltan = Object.keys(grupoEf()).filter(g => !local.has('efecto ' + g)).length;
    $('#ef-todos').disabled = !faltan || !llave();
    $('#ef-todos').textContent = faltan ? `✨ Generar los ${faltan} que faltan` : '✨ Todos los efectos ya tienen versión propia';
  }
  function guardarPedido(fila) {
    const g = fila.dataset.g, todo = propios(), d = EFECTOS[g] || [];
    const texto = fila.querySelector('[data-c=texto]').value.trim(), seg = +fila.querySelector('[data-c=seg]').value || d[1] || 1;
    if ((texto && texto !== d[0]) || seg !== d[1]) todo[g] = { texto, seg }; else delete todo[g];
    ls.set(K.efectos, JSON.stringify(todo));
    return { texto: texto || d[0], seg };
  }
  async function generarEfecto(g, signal) {
    const fila = document.querySelector(`.ia-ef[data-g="${g}"]`), out = fila.querySelector('[data-e]');
    const p = guardarPedido(fila);
    out.textContent = 'Generando…';
    try {
      const blob = await conReintentos(() => efectoIA(p.texto, p.seg, signal), signal);
      await J.voices.set('efecto ' + g, blob); await J.voices.refresh('efecto ' + g); local.add('efecto ' + g);
      out.innerHTML = '<span class="ok">¡Listo!</span>'; tocar(blob);
      fila.querySelector('.dot').classList.add('local');
      fila.querySelectorAll('[data-a=oir],[data-a=del]').forEach(b => { b.disabled = false; });
      return true;
    } catch (e) {
      if (!(e && e.name === 'AbortError')) out.innerHTML = `<span class="err">${esc(e.message)}</span>`;
      throw e;
    }
  }
  async function clicEfecto(ev) {
    const b = ev.target.closest('[data-a]'); if (!b || efOcupado) return;
    const fila = b.closest('.ia-ef'), g = fila.dataset.g, k = 'efecto ' + g;
    if (b.dataset.a === 'oir') { const blob = await J.voices.get(k); if (blob) tocar(blob); return; }
    if (b.dataset.a === 'del') { await J.voices.del(k); await J.voices.refresh(k); local.delete(k); document.activeElement && document.activeElement.blur(); pintarEfectos(); avisarCambio(); return; }
    efOcupado = true; b.disabled = true;
    try { await generarEfecto(g); } catch (e) {}
    efOcupado = false; b.disabled = false; b.textContent = '✨ Otra versión'; avisarCambio();
  }
  async function generarEfectosQueFaltan() {
    if (efOcupado) return;
    efOcupado = true; $('#ef-todos').disabled = true;
    const out = $('#ef-estado'); let n = 0;
    for (const g of Object.keys(grupoEf())) {
      if (local.has('efecto ' + g)) continue;
      out.textContent = `Generando ${grupoEf()[g]}…`;
      try { await generarEfecto(g); n++; } catch (e) { if (e.fatal) { out.innerHTML = `<span class="err">${esc(e.message)}</span>`; break; } }
      out.textContent = '';
    }
    efOcupado = false;
    if (!out.innerHTML) out.innerHTML = `<span class="ok">Se guardaron ${n} efectos.</span> Ya suenan en los juegos de este aparato.`;
    document.activeElement && document.activeElement.blur(); pintarEfectos(); avisarCambio();
  }

  // ---------- arranque ----------
  $('#el-modelo').value = ls.get(K.modelo) || MODELO;
  const a0 = ajustes();
  [['#el-estabilidad', 'estabilidad'], ['#el-parecido', 'parecido'], ['#el-velocidad', 'velocidad']].forEach(([s, k]) => {
    const el = $(s), out = $(s + '-v'); el.value = a0[k]; out.textContent = (+el.value).toFixed(2);
    el.oninput = () => { out.textContent = (+el.value).toFixed(2); ls.set(K.ajustes, JSON.stringify({ ...ajustes(), [k]: +el.value })); };
  });
  $('#el-guardar').onclick = guardarLlave;
  $('#el-llave').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); guardarLlave(); } };
  $('#el-borrar').onclick = borrarLlave;
  $('#el-voces').onclick = () => cargarVoces();
  $('#el-voz').onchange = () => { $('#el-voz-id').value = ''; ls.set(K.voz, $('#el-voz').value); };
  $('#el-voz-id').onchange = () => { if (vozElegida()) ls.set(K.voz, vozElegida()); };
  $('#el-modelo').onchange = () => ls.set(K.modelo, modelo());
  $('#el-muestra').onclick = () => {
    const v = voces.find(x => x.voice_id === vozElegida());
    if (v && v.preview_url) { tocar(v.preview_url); estado('Suena la muestra de la voz (en su idioma original, no gasta créditos).'); }
    else estado('Esa voz no trae muestra. Usa "Probar con una frase".');
  };
  $('#el-probar').onclick = async () => {
    const b = $('#el-probar'), frase = '¡Hola! Soy tu nueva voz. ¡Vamos a leer juntas!';
    b.disabled = true; estado('Generando la frase de prueba…');
    try { tocar(await conReintentos(() => hablar(frase))); if (creditos != null) creditos = Math.max(0, creditos - frase.length); estado(`Así suena en español (gastó ${frase.length} caracteres).`, 'ok'); pintarEstimado(); }
    catch (e) { estado(esc(e.message), 'err'); }
    b.disabled = false;
  };
  $('#el-grupos').onchange = e => { const id = e.target.dataset.id; if (!id) return; if (e.target.checked) elegidos.add(id); else elegidos.delete(id); pintarEstimado(); };
  $('#el-reemplazar').onchange = () => pintarGrupos();
  $('#el-generar').onclick = generar;
  $('#el-pausa').onclick = () => { if (corrida) { corrida.pausa = !corrida.pausa; pintarCorrida(); } };
  $('#el-cancelar').onclick = () => { if (corrida) { corrida.cancelada = true; corrida.ctrl.abort(); } };
  $('#ef-lista').onclick = clicEfecto;
  $('#ef-lista').onchange = e => { const f = e.target.closest('.ia-ef'); if (f) guardarPedido(f); };
  $('#ef-todos').onclick = generarEfectosQueFaltan;
  addEventListener('cuenta', () => { pintarLlave(); pintarGrupos(); });
  addEventListener('beforeunload', e => { if (corrida) { e.preventDefault(); e.returnValue = ''; } });

  (async () => {
    pintarLlave();
    try { await J.voices.ready; } catch (e) {}
    await pintarGrupos();
    if (llave() && !esDemo()) cargarVoces();
  })();

  window.VocesIA = { pintar: pintarGrupos, enCurso: () => !!corrida };
})();
