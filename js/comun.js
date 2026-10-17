// El Reino de las Letras — utilidades compartidas:
// palabras, progreso, jugadores y turnos, voz (grabaciones de la familia o voz del dispositivo),
// música, sonidos, confeti, regalos y publicación de grabaciones en GitHub.
(function () {
  'use strict';

  // ---------- palabras (palabra, sílabas, dibujo) ----------
  // Vocabulario peruano (palta, choclo, llama, papa). Las marcadas con 3D tienen modelo para buscar o atrapar.
  const WORDS = [
    ['oso','o-so','🐻'], ['uva','u-va','🍇'], ['ojo','o-jo','👁️'], ['isla','is-la','🏝️'], ['abeja','a-be-ja','🐝'], ['árbol','ár-bol','🌳'],
    ['mamá','ma-má','👩'], ['papá','pa-pá','👨'], ['mano','ma-no','✋'], ['mono','mo-no','🐒'], ['mapa','ma-pa','🗺️'],
    ['pato','pa-to','🦆'], ['papa','pa-pa','🥔'], ['pera','pe-ra','🍐'], ['piña','pi-ña','🍍'], ['palta','pal-ta','🥑'],
    ['pelota','pe-lo-ta','⚽'], ['perro','pe-rro','🐶'], ['pez','pez','🐟'],
    ['luna','lu-na','🌙'], ['lupa','lu-pa','🔍'], ['llama','lla-ma','🦙'], ['loro','lo-ro','🦜'], ['lobo','lo-bo','🐺'],
    ['sol','sol','☀️'], ['sopa','so-pa','🍲'], ['sapo','sa-po','🐸'],
    ['taza','ta-za','☕'], ['tomate','to-ma-te','🍅'], ['tortuga','tor-tu-ga','🐢'],
    ['nube','nu-be','☁️'], ['nariz','na-riz','👃'], ['dado','da-do','🎲'], ['dedo','de-do','☝️'],
    ['gato','ga-to','🐱'], ['casa','ca-sa','🏠'], ['vaca','va-ca','🐮'], ['bota','bo-ta','👢'], ['cama','ca-ma','🛏️'],
    ['carro','ca-rro','🚗'], ['choclo','cho-clo','🌽'], ['flor','flor','🌸'], ['conejo','co-ne-jo','🐰'],
    ['toro','to-ro','🐂'], ['ratón','ra-tón','🐭'], ['gusano','gu-sa-no','🐛'],
  ];

  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- progreso y ajustes (en este navegador) ----------
  const KEY = 'bloques-letras';
  const CHARS = {
    nieve: { name: 'Princesa Nieve', emoji: '👸' }, ana: { name: 'Princesa Ana', emoji: '👸🏾' },
    estrella: { name: 'Estrella Pop', emoji: '🎤' }, zoe: { name: 'Zoe', emoji: '🎧' }, mira: { name: 'Mira', emoji: '💃' },
    llama: { name: 'Llamita Lula', emoji: '🦙' }, rojito: { name: 'Monstruito Rojo', emoji: '❤️' }, raton: { name: 'Ratoncito Pipo', emoji: '🐭' },
    zorro: { name: 'Zorrito', emoji: '🦊' }, lobo: { name: 'Lobito', emoji: '🐺' }, toro: { name: 'Torito', emoji: '🐂' },
  };
  function load() {
    let d;
    try { d = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { d = {}; }
    d = Object.assign({ level: {}, music: true, two: false, turn: 0, sessionMin: 15, rate: 0.8, colors: {} }, d);
    if (!Array.isArray(d.players)) d.players = [{ name: 'Avelu', char: 'nieve', stars: d.stars || 0 }, { name: 'Mamá', char: 'estrella', stars: 0 }];
    return d;
  }
  function save(data) { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  const progress = load();
  const player = () => progress.players[progress.two ? progress.turn % 2 : 0];
  const childName = () => progress.players[0].name || 'Avelu';
  function addStar(n = 1) { player().stars += n; save(progress); return player().stars; }

  // ---------- audio base ----------
  let ctx = null, master = null, musicGain = null;
  function audio() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
        musicGain = ctx.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
      } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const script = document.currentScript && document.currentScript.src;
  const ROOT = script ? new URL('../', script).href : '';
  const base = ROOT + 'assets/sonidos/';
  const vozBase = ROOT + 'assets/voz/';

  // ---------- grabaciones de voz ----------
  // Clave de una frase: minúsculas, sin signos. "¡Busca: gato!" → "busca gato"
  const norm = t => String(t).toLowerCase().replace(/[¡!¿?.,:;"“”()…—–\-]/g, ' ').replace(/\s+/g, ' ').trim();
  let db = null;
  function openDB() {
    if (db) return Promise.resolve(db);
    return new Promise((ok, no) => {
      try {
        const r = indexedDB.open('bloques-letras-voces', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('sonidos');
        r.onsuccess = () => { db = r.result; ok(db); };
        r.onerror = () => no(r.error);
      } catch (e) { no(e); }
    });
  }
  const tx = (mode, fn) => openDB().then(d => new Promise((ok, no) => { const t = d.transaction('sonidos', mode); const r = fn(t.objectStore('sonidos')); t.oncomplete = () => ok(r && r.result); t.onerror = () => no(t.error); }));
  const local = {}, pub = {};
  const voices = {
    get: k => tx('readonly', st => st.get(k)).catch(() => null),
    set: (k, blob) => tx('readwrite', st => st.put(blob, k)),
    del: k => tx('readwrite', st => st.delete(k)),
    keys: () => tx('readonly', st => st.getAllKeys()).catch(() => []),
    refresh: k => voices.get(k).then(b => { if (local[k]) URL.revokeObjectURL(local[k]); if (b) local[k] = URL.createObjectURL(b); else delete local[k]; }),
    has: k => !!local[norm(k)] || !!local[k],
    hasPublic: k => !!pub[norm(k)] || !!pub[k],
    publicList: () => Object.assign({}, pub),
  };
  let lista = {};
  const ready = Promise.all([
    voices.keys().then(ks => Promise.all((ks || []).map(k => voices.get(k).then(b => { if (b) local[k] = URL.createObjectURL(b); })))),
    fetch(vozBase + 'lista.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).then(l => { lista = l || {}; Object.entries(lista).forEach(([k, f]) => { pub[k] = vozBase + f; }); }).catch(() => {}),
  ]);
  voices.ready = ready;
  voices.lista = () => lista;

  // ---------- configuración (modo admin) ----------
  // Lo que mamá y papá configuran: palabras por juego, canciones, nombres de personajes.
  // Se guarda en este navegador y se puede publicar en assets/config.json para todos los dispositivos.
  let publicConfig = {};
  const configReady = fetch(ROOT + 'assets/config.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).then(c => { publicConfig = c || {}; }).catch(() => {});
  const allReady = Promise.all([ready, configReady]).then(() => { Object.entries(config().nombres).forEach(([id, n]) => { if (CHARS[id] && n) CHARS[id].name = n; }); });
  const MODELOS = ['gato', 'perro', 'pato', 'oso', 'conejo', 'vaca', 'llama', 'sapo', 'pez', 'pelota', 'flor', 'palta', 'choclo', 'carro', 'sol', 'luna', 'nube', 'casa', 'dado', 'taza', 'uva', 'pera', 'tomate', 'papa', 'piña', 'abeja', 'tortuga', 'loro', 'mono', 'lobo', 'toro', 'ratón', 'gusano'];
  const EXTRA_EMOJI = { Zoe: '🎧', Mira: '💃', Ana: '👸🏾', Lula: '🦙', Avelu: '👧' };
  const JUEGOS_PALABRAS = {
    carrera: 'Carrera de Palabras', bosque: 'Bosque de las Palabras', globos: 'Revienta Globos', gusanos: 'Aplasta Gusanos',
    memoria: 'Memoria: figuras y palabras', memoria_letras: 'Memoria: vocales y letras', memoria_silabas: 'Memoria: vocales y sílabas', tren: 'Tren de sílabas', lectura: 'Lectura: Palabras',
  };
  const SEMILLAS = {
    carrera: MODELOS, bosque: MODELOS,
    globos: ['oso', 'uva', 'sol', 'pato', 'gato', 'casa', 'luna', 'mano', 'sopa', 'taza', 'papa', 'mamá', 'papá', 'nube', 'dedo', 'pelota'],
    gusanos: ['oso', 'uva', 'sol', 'pato', 'gato', 'casa', 'luna', 'mano', 'sopa', 'taza', 'papa', 'mamá', 'papá', 'nube', 'dedo', 'pelota'],
    memoria: ['perro', 'gato', 'pato', 'oso', 'llama', 'sol', 'luna', 'casa', 'Zoe', 'Mira', 'mamá', 'papá'],
    memoria_letras: ['a', 'e', 'i', 'o', 'u', 'm', 's', 'l', 'p'],
    memoria_silabas: ['a', 'e', 'i', 'o', 'u', 'ma', 'me', 'mi', 'mo', 'mu', 'pa', 'pe', 'pi', 'po', 'pu', 'la', 'lo', 'sa', 'so', 'su'],
    tren: ['gato', 'pato', 'casa', 'luna', 'sopa', 'taza', 'mano', 'palta', 'pelota', 'tomate', 'conejo', 'tortuga', 'papa', 'dado', 'vaca', 'bota'],
    lectura: ['oso', 'uva', 'ojo', 'mano', 'mono', 'mapa', 'pato', 'papa', 'pera', 'luna', 'lupa', 'loro', 'lobo', 'sopa', 'sapo', 'taza', 'nube', 'dado', 'dedo', 'gato', 'casa', 'vaca', 'bota', 'cama'],
  };
  // separar en sílabas (reglas simples del español)
  function silabas(w) {
    const V = 'aeiouáéíóúü', low = w.toLowerCase();
    const isV = c => V.includes(c);
    const insep = ['pr', 'br', 'tr', 'dr', 'cr', 'gr', 'fr', 'pl', 'bl', 'cl', 'gl', 'fl', 'ch', 'll', 'rr'];
    const out = []; let cur = '', i = 0;
    while (i < low.length) {
      cur += w[i];
      if (isV(low[i])) {
        // consonantes que siguen hasta la próxima vocal
        let j = i + 1; while (j < low.length && !isV(low[j])) j++;
        if (j >= low.length) { cur += w.slice(i + 1); out.push(cur); cur = ''; break; }
        const cons = low.slice(i + 1, j);
        // dos vocales juntas: diptongo (pia-no, hue-vo) se queda junto; hiato (Zo-e, le-ón) se separa
        if (!cons.length) { if ('iuü'.includes(low[i]) || 'iuü'.includes(low[j])) { i++; continue; } out.push(cur); cur = ''; i++; continue; }
        let take = 0;
        if (cons.length === 1) take = 0;
        else if (cons.length === 2) take = insep.includes(cons) ? 0 : 1;
        else take = insep.includes(cons.slice(-2)) ? cons.length - 2 : cons.length - 1;
        cur += w.slice(i + 1, i + 1 + take); out.push(cur); cur = ''; i = i + 1 + take; continue;
      }
      i++;
    }
    if (cur) out.length ? out[out.length - 1] += cur : out.push(cur);
    return out.join('-');
  }
  function itemDe(t) {
    if (typeof t === 'object' && t) return { t: t.t, s: t.s || silabas(t.t), e: t.e || '', m: t.m === undefined ? (MODELOS.includes(t.t) ? t.t : null) : t.m };
    const w = WORDS.find(x => x[0] === t);
    return { t, s: w ? w[1] : silabas(t), e: w ? w[2] : (EXTRA_EMOJI[t] || ''), m: MODELOS.includes(t) ? t : null };
  }
  function config() {
    const l = progress.config || {};
    return {
      palabras: Object.assign({}, publicConfig.palabras || {}, l.palabras || {}),
      canciones: Object.assign({ menu: 'reino', juegos: 'reino', ballet: 'cisnes', repetir: false }, publicConfig.canciones || {}, l.canciones || {}),
      nombres: Object.assign({}, publicConfig.nombres || {}, l.nombres || {}),
    };
  }
  function setConfig(seccion, clave, valor) {
    progress.config = progress.config || {};
    progress.config[seccion] = progress.config[seccion] || {};
    if (valor === undefined) delete progress.config[seccion][clave]; else progress.config[seccion][clave] = valor;
    save(progress);
  }
  // palabras de un juego en el formato [palabra, sílabas, dibujo, modelo3D]
  function palabras(juego) {
    const list = config().palabras[juego] || SEMILLAS[juego] || [];
    return list.map(itemDe).filter(x => x.t).map(x => [x.t, x.s, x.e, x.m]);
  }
  // artículo para frases más naturales: "Busca el" + "gato", "Busca la" + "casa"
  const FEM = ['mano', 'flor', 'nariz', 'mamá', 'luna', 'nube', 'sopa', 'llave'];
  const MASC = ['mapa', 'papá', 'día', 'sofá', 'oso', 'sol', 'pez', 'dado', 'dedo', 'tomate', 'choclo', 'ratón'];
  const art = w => FEM.includes(w) ? 'la' : MASC.includes(w) ? 'el' : /a$/.test(J_strip(w)) ? 'la' : 'el';
  function J_strip(x) { return strip(String(x)).toLowerCase(); }
  // URL de la grabación de una frase (primero la de este navegador, luego la publicada)
  function recUrl(text) {
    const k = norm(text);
    if (local[k]) return local[k];
    if (pub[k]) return pub[k];
    if (k && k === norm(childName())) return local.nombre || pub.nombre || null;
    return null;
  }

  // ---------- voz: cola de frases ----------
  // say(['Busca', 'gato']) reproduce cada trozo con la grabación de la familia si existe;
  // los trozos sin grabar se juntan y los dice la voz del dispositivo.
  let voice = null;
  const hasTTS = 'speechSynthesis' in window;
  function loadVoice() {
    if (!hasTTS) return;
    const vs = speechSynthesis.getVoices().filter(v => /^es/i.test(v.lang));
    voice = vs.find(v => /es-PE/i.test(v.lang)) || vs.find(v => /es-(US|MX|419|CO)/i.test(v.lang)) || vs.find(v => /es-ES/i.test(v.lang)) || vs[0] || null;
  }
  if (hasTTS) { loadVoice(); speechSynthesis.onvoiceschanged = loadVoice; }

  let queue = [], busy = false, run = 0, current = null;
  function say(parts, opts = {}) {
    if (!opts.queue) stopVoice();
    let list = (Array.isArray(parts) ? parts : [parts]).filter(Boolean).map(String);
    // si la familia grabó la frase completa ("busca el gato"), se usa esa grabación más fluida
    if (list.length > 1 && recUrl(list.join(' '))) list = [list.join(' ')];
    list.forEach(t => queue.push({ t, opts }));
    if (opts.onend) queue.push({ fn: opts.onend });
    pump();
  }
  function pump() {
    if (busy) return;
    const it = queue.shift();
    if (!it) { duck(false); return; }
    if (it.fn) { it.fn(); return pump(); }
    const id = run;
    busy = true; duck(true);
    const done = () => { if (id !== run) return; busy = false; current = null; pump(); };
    const url = it.url || recUrl(it.t);
    if (url) {
      current = new Audio(url);
      current.onended = done;
      current.onerror = () => { if (id !== run) return; current = null; tts(it.t, it.opts, done); };
      current.play().catch(() => { if (id !== run) return; current = null; tts(it.t, it.opts, done); });
      return;
    }
    // juntar los siguientes trozos que tampoco tienen grabación
    let text = it.t;
    while (queue[0] && !queue[0].fn && !queue[0].url && !recUrl(queue[0].t) && queue[0].opts === it.opts) text += ' ' + queue.shift().t;
    tts(text, it.opts, done);
  }
  function tts(text, opts, done) {
    if (!hasTTS) { setTimeout(done, 300); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice ? voice.lang : 'es-PE';
    if (voice) u.voice = voice;
    u.rate = (opts.rate || 0.85) * ((progress.rate || .8) / 0.8);
    u.pitch = opts.pitch || 1.1;
    if (opts.onboundary) u.onboundary = opts.onboundary;
    let fired = false;
    const fin = () => { if (fired) return; fired = true; done(); };
    u.onend = fin; u.onerror = fin;
    // algunos navegadores no avisan el final: seguro por tiempo
    setTimeout(fin, 1500 + text.length * 140);
    speechSynthesis.speak(u);
  }
  function stopVoice() {
    run++; queue = []; busy = false;
    if (current) { try { current.pause(); } catch (e) {} current = null; }
    if (hasTTS) speechSynthesis.cancel();
    duck(false);
  }

  // ---------- sonidos de las letras (método fonético) ----------
  const SOUNDS = {
    a: 'a', e: 'e', i: 'i', o: 'o', u: 'u',
    m: 'mmmm', s: 'ssss', n: 'nnnn', f: 'ffff', l: 'llll',
    p: 'pa', t: 'ta', d: 'da', c: 'ca', g: 'ga', b: 'ba', r: 'ra', ñ: 'ña', j: 'ja', ch: 'cha', ll: 'lla', v: 'va',
  };
  const SOUND_WORD = { a: 'abeja', e: 'elefante', i: 'isla', o: 'oso', u: 'uva', m: 'mamá', s: 'sapo', n: 'nube', f: 'flor', l: 'luna',
    p: 'papá', t: 'taza', d: 'dedo', c: 'casa', g: 'gato', b: 'bota', r: 'ratón', ñ: 'piña', j: 'jugo', ch: 'choclo', ll: 'llama', v: 'vaca' };
  function sound(letter, opts = {}) {
    // la grabación del sonido usa la clave "sonido m"; también vale una grabación vieja con clave "m"
    const url = local['sonido ' + letter] || pub['sonido ' + letter] || local[letter] || pub[letter];
    if (!opts.queue) stopVoice();
    queue.push(url ? { t: letter, url, opts: {} } : { t: SOUNDS[letter] || letter, opts: { rate: .7 } });
    if (opts.then) [].concat(opts.then).forEach(t => queue.push({ t, opts: {} }));
    pump();
  }

  // ---------- efectos ----------
  // Grupos de efectos. Mamá y papá pueden poner su propio sonido por grupo o por juego (modo admin):
  // se guarda como "efecto <grupo>" o "efecto <juego> <grupo>".
  const GRUPOS_EFECTOS = { acierto: '✅ Acierto', error: '❌ Error', moneda: '🪙 Moneda', salto: '🦘 Salto', pop: '🫧 Pop / tocar', festejo: '🎺 Festejo', aplauso: '👏 Aplausos', popo: '💩 Popó', pum: '🔨 ¡Pum!', abrir: '🎁 Abrir regalo' };
  const JUEGO = window.JUEGO || (location.pathname.split('/').pop() || 'index.html').replace('.html', '');
  const SFX = { coin: 'coin.mp3', jump: 'jump.mp3', land: 'land.mp3', pop: 'placement-a.mp3', pop2: 'placement-c.mp3', tick: 'toggle.mp3' };
  const buffers = {}, custom = {};
  function loadSfx() {
    const c = audio(); if (!c) return;
    Object.entries(SFX).forEach(([k, f]) => {
      if (buffers[k]) return;
      buffers[k] = 'loading';
      fetch(base + f).then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => c.decodeAudioData(b, ok, no)))
        .then(buf => { buffers[k] = buf; }).catch(() => { buffers[k] = null; });
    });
    allReady.then(() => Object.keys(GRUPOS_EFECTOS).forEach(g => [`efecto ${JUEGO} ${g}`, `efecto ${g}`].forEach(key => {
      const url = local[key] || pub[key]; if (!url || custom[key]) return;
      custom[key] = 'loading';
      fetch(url).then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => c.decodeAudioData(b, ok, no))).then(buf => { custom[key] = buf; }).catch(() => { delete custom[key]; });
    })));
  }
  function playBuf(buf, vol = .9, rate = 1) { const c = audio(); const s = c.createBufferSource(), g = c.createGain(); s.buffer = buf; s.playbackRate.value = rate; g.gain.value = vol; s.connect(g).connect(master); s.start(); }
  // efecto personalizado del grupo (si existe); devuelve true si sonó
  function efectoPropio(grupo) {
    const buf = custom[`efecto ${JUEGO} ${grupo}`] || custom[`efecto ${grupo}`];
    if (buf && buf !== 'loading') { playBuf(buf); return true; }
    return false;
  }
  const GRUPO_DE = { coin: 'moneda', jump: 'salto', pop: 'pop', pop2: 'pop', tick: 'pop', land: 'pum' };
  function sfx(name, vol = 0.8, rate = 1) {
    const c = audio(); if (!c) return;
    if (GRUPO_DE[name] && efectoPropio(GRUPO_DE[name])) return;
    if (name === 'coin') return moneda();
    if (name === 'pop' || name === 'pop2') return burbuja(rate);
    const buf = buffers[name];
    if (buf && buf !== 'loading') playBuf(buf, vol, rate);
    else tones([880, 1320], 0.08, 'triangle', 0.2);
  }
  function tones(freqs, dur = 0.12, type = 'sine', vol = 0.25) {
    const c = audio(); if (!c) return;
    freqs.forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = f;
      const t = c.currentTime + i * dur;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.6);
      o.connect(g).connect(master); o.start(t); o.stop(t + dur * 1.8);
    });
  }
  let nz = null;
  function noiseBuf() { const c = audio(); if (!nz) { nz = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = nz.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return nz; }
  function noiseHit(t, dur, type, freq, q, vol, sweepTo) {
    const c = audio(); const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf(); f.type = type; f.frequency.setValueAtTime(freq, t); if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur); f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  }
  function sweep(type, f0, f1, t, dur, vol) {
    const c = audio(); const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + .02); return o;
  }
  // moneda clásica: dos notas brillantes
  function moneda() { const c = audio(); if (!c) return; const t = c.currentTime; const o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.setValueAtTime(988, t); o.frequency.setValueAtTime(1319, t + .07); g.gain.setValueAtTime(.08, t); g.gain.setValueAtTime(.08, t + .07); g.gain.exponentialRampToValueAtTime(0.0001, t + .45); o.connect(g).connect(master); o.start(t); o.stop(t + .5); tones([2637, 3136], .04, 'sine', .03); }
  // burbuja que revienta
  function burbuja(rate = 1) { const c = audio(); if (!c) return; const t = c.currentTime; sweep('sine', 300 * rate, 1200 * rate, t, .07, .25); noiseHit(t, .03, 'highpass', 3000, .7, .12); }
  const ding = () => { if (efectoPropio('acierto')) return; tones([784, 988, 1319], 0.09, 'triangle', .2); tones([1568, 1976, 2637], 0.09, 'sine', .05); };
  const boing = () => {
    if (efectoPropio('error')) return;
    const c = audio(); if (!c) return;
    const t = c.currentTime, o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(380, t); o.frequency.exponentialRampToValueAtTime(110, t + .45);
    lfo.frequency.value = 18; lg.gain.value = 30; lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + .5);
    o.connect(g).connect(master); o.start(t); lfo.start(t); o.stop(t + .52); lfo.stop(t + .52);
  };
  const fanfare = () => { if (efectoPropio('festejo')) return; tones([523, 659, 784, 1047, 784, 1047, 1319], 0.12, 'triangle', 0.22); tones([262, 330, 392, 523], .24, 'square', .04); };
  const sparkle = () => tones([1568, 2093, 2637, 3136], 0.05, 'sine', 0.08);
  // aplausos: muchas palmas sueltas + murmullo de público
  function applause(seconds = 1.6) {
    if (efectoPropio('aplauso')) return;
    const c = audio(); if (!c) return;
    const t0 = c.currentTime;
    for (let i = 0; i < Math.floor(seconds * 45); i++) {
      const t = t0 + Math.random() * seconds, fade = 1 - (t - t0) / seconds * .75;
      noiseHit(t, .03 + Math.random() * .03, 'bandpass', 900 + Math.random() * 2200, 1 + Math.random(), .22 * fade);
    }
    noiseHit(t0, seconds + .4, 'bandpass', 700, .5, .05);
  }
  function partyHorn() {
    const c = audio(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(), t = c.currentTime;
    o.type = 'sawtooth'; o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(640, t + 0.15);
    f.type = 'lowpass'; f.frequency.value = 2200;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.03); g.gain.setValueAtTime(0.12, t + 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + 0.62);
  }
  // efectos con nombre: popó, ¡pum!, abrir regalo
  function efecto(grupo) {
    if (efectoPropio(grupo)) return;
    const c = audio(); if (!c) return; const t = c.currentTime;
    if (grupo === 'popo') { sweep('sine', 220, 60, t, .28, .35); noiseHit(t, .22, 'lowpass', 600, 1, .3, 150); sweep('triangle', 500, 900, t + .25, .12, .06); }
    else if (grupo === 'pum') { sweep('sine', 160, 40, t, .2, .5); noiseHit(t, .08, 'bandpass', 1800, 1, .3); sweep('triangle', 900, 300, t + .02, .15, .12); }
    else if (grupo === 'abrir') { sweep('triangle', 400, 1600, t, .25, .12); tones([1319, 1568, 2093], .06, 'sine', .07); }
    else if (grupo === 'moneda') moneda();
    else if (grupo === 'acierto') ding();
    else if (grupo === 'error') boing();
    else if (grupo === 'aplauso') applause();
    else if (grupo === 'festejo') fanfare();
    else if (grupo === 'pop') burbuja();
    else if (grupo === 'salto') sfx('jump');
  }
  const SHOUTS = ['¡Yupi!', '¡Bravo!', '¡Wiii!', '¡Hurra!', '¡Sí!'];
  const PRAISES = ['¡Muy bien!', '¡Bravo!', '¡Genial!', '¡Súper!', '¡Excelente!', '¡Lo lograste!', '¡Qué lista eres!'];
  function cheer(big = false) {
    ding(); if (!custom['efecto acierto'] && !custom[`efecto ${JUEGO} acierto`]) partyHorn();
    if (big) { applause(2.2); setTimeout(fanfare, 250); } else applause(1.1);
    say(pick(SHOUTS), { queue: true, pitch: 1.6, rate: 1.05 });
  }

  // ---------- música ----------
  // Arreglos propios, sintetizados en el navegador. Las melodías clásicas son de dominio público
  // (Chaikovski, Beethoven, canción tradicional); "El Reino" y "Estrella Pop" son composiciones originales.
  // Formato de melodía: "E5:2 A4:.5 R:1" = nota:duración en tiempos (R = silencio).
  const SONGS = {
    reino: { nombre: 'El Reino', emoji: '🏰', bpm: 132, bar: 4, beat: 'pop', inst: 'synth',
      chords: 'C Dm Em F C Dm G C',
      mel: 'C5:.5 R:.5 E5:.5 G5:.5 C6:.5 R:.5 G5:.5 E5:.5 D5:.5 R:.5 F5:.5 A5:.5 D6:.5 R:.5 A5:.5 F5:.5 E5:.5 R:.5 G5:.5 B5:.5 E6:.5 R:.5 B5:.5 G5:.5 F5:.5 G5:.5 A5:.5 G5:.5 F5:.5 E5:.5 D5:1 C5:.5 C5:.5 E5:.5 E5:.5 G5:.5 G5:.5 A5:.5 G5:.5 F5:.5 F5:.5 D5:.5 D5:.5 B4:.5 D5:.5 G5:1 A5:.5 G5:.5 F5:.5 E5:.5 D5:.5 E5:.5 F5:.5 G5:.5 C6:1 G5:1 C5:2' },
    cisnes: { nombre: 'El lago de los cisnes', autor: 'Chaikovski', emoji: '🦢', bpm: 92, bar: 4, beat: 'ballet', inst: 'cuerdas',
      chords: 'Am Am F Am Am Am Dm E Am Am F Am',
      mel: 'E5:2 A4:.5 B4:.5 C5:.5 D5:.5 E5:1.5 C5:.5 E5:1.5 C5:.5 E5:1.5 A4:.5 C5:.5 A4:.5 F4:.5 C5:.5 A4:4 ' +
           'E5:2 A4:.5 B4:.5 C5:.5 D5:.5 E5:1.5 C5:.5 E5:1.5 C5:.5 E5:1.5 A4:.5 D5:.5 A4:.5 F4:.5 D5:.5 B4:2 G#4:1 E4:1 ' +
           'E5:2 A4:.5 B4:.5 C5:.5 D5:.5 E5:1.5 C5:.5 E5:1.5 C5:.5 E5:1.5 A4:.5 C5:.5 A4:.5 F4:.5 C5:.5 A4:4' },
    hada: { nombre: 'Danza del Hada de Azúcar', autor: 'Chaikovski', emoji: '🍬', bpm: 104, bar: 4, beat: 'pop', inst: 'celesta',
      chords: 'Em D C B Em D C Em',
      mel: 'B4:.5 G4:.5 B4:.5 A#4:.5 R:2 A4:.5 F#4:.5 A4:.5 G#4:.5 R:2 G4:.5 E4:.5 G4:.5 F#4:.5 R:2 F#4:.5 D#4:.5 F#4:.5 E4:.5 E4:2 ' +
           'B5:.5 G5:.5 B5:.5 A#5:.5 R:2 A5:.5 F#5:.5 A5:.5 G#5:.5 R:2 G5:.5 E5:.5 G5:.5 F#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 E5:4' },
    elisa: { nombre: 'Para Elisa', autor: 'Beethoven', emoji: '🎹', bpm: 132, bar: 3, beat: 'vals', inst: 'piano',
      chords: 'Am E Am E Am E Am E Am',
      mel: 'R:2 E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1.5 C4:.5 E4:.5 A4:.5 B4:1.5 E4:.5 G#4:.5 B4:.5 C5:1.5 E4:.5 E5:.5 D#5:.5 ' +
           'E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1.5 C4:.5 E4:.5 A4:.5 B4:1.5 E4:.5 C5:.5 B4:.5 A4:3' },
    alegria: { nombre: 'Himno de la alegría', autor: 'Beethoven', emoji: '🎉', bpm: 120, bar: 4, beat: 'baile', inst: 'synth',
      chords: 'C G C G C G C GC',
      mel: 'E5:1 E5:1 F5:1 G5:1 G5:1 F5:1 E5:1 D5:1 C5:1 C5:1 D5:1 E5:1 E5:1.5 D5:.5 D5:2 E5:1 E5:1 F5:1 G5:1 G5:1 F5:1 E5:1 D5:1 C5:1 C5:1 D5:1 E5:1 D5:1.5 C5:.5 C5:2' },
    estrellapop: { nombre: 'Estrella Pop', autor: 'canción original', emoji: '🎤', bpm: 120, bar: 4, beat: 'baile', inst: 'synth',
      chords: 'Am F C G Am F C G',
      mel: 'E5:.5 E5:.5 D5:.5 E5:1 C5:.5 A4:1 A4:.5 C5:.5 D5:.5 E5:1 F5:.5 E5:1 G5:1 E5:.5 C5:.5 D5:1 E5:1 D5:.5 C5:.5 B4:.5 C5:.5 D5:2 ' +
           'E5:.5 E5:.5 D5:.5 E5:1 C5:.5 A4:1 A4:.5 C5:.5 F5:1 E5:.5 D5:.5 C5:1 E5:.5 G5:.5 A5:1 G5:.5 E5:.5 D5:1 C5:3 R:1' },
    estrellita: { nombre: 'Estrellita', autor: 'canción tradicional', emoji: '⭐', bpm: 96, bar: 4, beat: 'suave', inst: 'celesta',
      chords: 'C FC FC GC CF CG CF CG C FC FC GC',
      mel: 'C5:1 C5:1 G5:1 G5:1 A5:1 A5:1 G5:2 F5:1 F5:1 E5:1 E5:1 D5:1 D5:1 C5:2 G5:1 G5:1 F5:1 F5:1 E5:1 E5:1 D5:2 G5:1 G5:1 F5:1 F5:1 E5:1 E5:1 D5:2 C5:1 C5:1 G5:1 G5:1 A5:1 A5:1 G5:2 F5:1 F5:1 E5:1 E5:1 D5:1 D5:1 C5:2' },
  };
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const noteMidi = s => { const m = /^([A-G])(#|b)?(\d)$/.exec(s); return m ? 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) : 0; };
  // un compás puede tener dos acordes pegados ("GC" = medio compás G y medio C)
  const chordNotes = name => { const m = /^([A-G])(#|b)?(m|7)?$/.exec(name) || ['', 'C']; const root = 48 + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); return { root, tri: (m[3] === 'm' ? [0, 3, 7] : m[3] === '7' ? [0, 4, 7, 10] : [0, 4, 7]).map(x => root + 12 + x) }; };
  Object.values(SONGS).forEach(s => {
    s.notes = s.mel.trim().split(/\s+/).map(tok => { const [n, d] = tok.split(':'); return [n === 'R' ? 0 : noteMidi(n), +d]; });
    s.len = s.notes.reduce((a, [, d]) => a + d, 0);
    s.bars = s.chords.split(' ').map(c => c.match(/[A-G](#|b)?(m|7)?/g).map(chordNotes));
  });
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);

  let musicOn = progress.music !== false && !NO_MUSIC_PAGE(), timer = null, songEl = null, noise = null, speakingDuck = false;
  function NO_MUSIC_PAGE() { return !!window.SIN_MUSICA; }
  // canción según el lugar: menú, juegos o ballet (se configura en el modo admin)
  const PAGINA = location.pathname.split('/').pop() || 'index.html';
  const MUSICA_CTX = window.MUSICA_CTX || (PAGINA.startsWith('ballet') ? 'ballet' : PAGINA === 'index.html' ? 'menu' : 'juegos');
  let songId = 'reino', songChosen = false, tick = 0, nextTime = 0, melIdx = 0, melNext = 0, ended = false;
  const TICK = .25;

  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function osc(type, f, t, dur, peak, a = .01, dest = musicGain, detune = 0) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; o.detune.value = detune;
    env(g, t, a, peak, dur); o.connect(g).connect(dest); o.start(t); o.stop(t + a + dur + .05); return o;
  }
  function lowpass(freq) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; f.connect(musicGain); return f; }
  function instrument(inst, n, t, d) {
    const f = midi(n);
    if (inst === 'celesta') { osc('sine', f, t, Math.min(1.6, d + .6), .1); osc('sine', f * 2, t, .5, .045); osc('sine', f * 4, t, .2, .02); }
    else if (inst === 'piano') { osc('triangle', f, t, d + .4, .12, .005); osc('sine', f * 2, t, .35, .035, .005); }
    else if (inst === 'cuerdas') {
      const lp = lowpass(2400);
      [-6, 6].forEach(c => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = c;
        const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.2; lg.gain.value = 6; lfo.connect(lg).connect(o.detune);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.035, t + .08); g.gain.setValueAtTime(.035, t + Math.max(.09, d - .05)); g.gain.exponentialRampToValueAtTime(0.0001, t + d + .35);
        o.connect(g).connect(lp); o.start(t); lfo.start(t); o.stop(t + d + .4); lfo.stop(t + d + .4); });
      osc('sine', f / 2, t, d + .2, .03, .08);
    } else { // synth pop
      const lp = lowpass(3200);
      osc('square', f, t, Math.max(.12, d * .9), .035, .01, lp); osc('sawtooth', f, t, Math.max(.12, d * .9), .025, .01, lp, 9); osc('triangle', f * 2, t, .12, .02);
    }
  }
  function drum(kind, t, vol = 1) {
    if (kind === 'kick') { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .14); g.gain.setValueAtTime(.42 * vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + .18); o.connect(g).connect(musicGain); o.start(t); o.stop(t + .2); return; }
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noise;
    if (kind === 'clap') { f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = .8; [0, .012, .024].forEach(dt => { const s2 = ctx.createBufferSource(), g2 = ctx.createGain(); s2.buffer = noise; g2.gain.setValueAtTime(.22 * vol, t + dt); g2.gain.exponentialRampToValueAtTime(0.0001, t + dt + .09); s2.connect(f); f.connect(g2).connect(musicGain); s2.start(t + dt); }); return; }
    f.type = 'highpass'; f.frequency.value = kind === 'shaker' ? 5000 : 7500;
    g.gain.setValueAtTime((kind === 'ohat' ? .07 : .05) * vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'ohat' ? .18 : .05));
    s.connect(f).connect(g).connect(musicGain); s.start(t);
  }
  function backing(style, chord, inBar, t, spb, bar) {
    const on = x => Math.abs(inBar - x) < 1e-6;
    const half = inBar >= bar / 2 && chord.length > 1 ? chord[1] : chord[0];
    const ch = half;
    if (style === 'pop') {
      if (on(0) || on(2) || on(2.5)) drum('kick', t);
      if (on(1) || on(3)) drum('clap', t);
      if ((inBar * 2) % 1 === 0) drum('hat', t, inBar % 1 ? 1 : .6);
      if ((inBar * 2) % 1 === 0) osc('triangle', midi(ch.root - 12 + ((inBar * 2) % 2 ? 12 : 0)), t, spb * .45, .2);
      if (inBar % 1 === .5) ch.tri.forEach(n => osc('square', midi(n), t, spb * .25, .012));
    } else if (style === 'baile') {
      if (inBar % 1 === 0) drum('kick', t);
      if (on(1) || on(3)) drum('clap', t);
      if (inBar % 1 === .5) { drum('ohat', t); osc('sawtooth', midi(ch.root - 12), t, spb * .4, .06); osc('triangle', midi(ch.root - 12), t, spb * .4, .18); }
      if (on(0) || on(bar / 2) && chord.length > 1) ch.tri.forEach(n => osc('sawtooth', midi(n), t, spb * (chord.length > 1 ? bar / 2 : bar) * .9, .01, .05));
    } else if (style === 'vals') {
      if (on(0)) { drum('kick', t, .7); osc('triangle', midi(ch.root - 12), t, spb * .9, .22); }
      if (on(1) || on(2)) { drum('hat', t, .7); ch.tri.forEach(n => osc('triangle', midi(n), t, spb * .5, .03)); }
    } else if (style === 'ballet') {
      if (on(0)) { drum('kick', t, .8); ch.tri.forEach(n => instrumentPad(n, t, spb * bar)); }
      if (on(2)) drum('kick', t, .5);
      if (on(1) || on(3)) drum('clap', t, .45);
      drum('shaker', t, inBar % 1 ? .5 : .9);
      if (inBar % 1 === 0 || inBar % 1 === .5) osc('triangle', midi(ch.root - 12), t, spb * .4, .14);
    } else { // suave
      if (on(0)) { ch.tri.forEach(n => instrumentPad(n, t, spb * bar)); osc('sine', midi(ch.root - 12), t, spb * bar, .12, .1); }
      if (inBar % 1 === 0) drum('shaker', t, .6);
    }
  }
  function instrumentPad(n, t, d) {
    const lp = lowpass(1300);
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = midi(n);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.014, t + .3); g.gain.setValueAtTime(.014, t + d * .8); g.gain.linearRampToValueAtTime(0.0001, t + d + .3);
    o.connect(g).connect(lp); o.start(t); o.stop(t + d + .35);
  }
  function schedule() {
    const s = SONGS[songId] || SONGS.reino, spb = 60 / s.bpm;
    while (nextTime < ctx.currentTime + 0.15) {
      let b = tick * TICK;
      if (b >= s.len - 1e-6) {
        // al terminar: repetir o detenerse (según la configuración)
        if (!config().canciones.repetir) { ended = true; stopMusic(); updateMusicButtons(); return; }
        tick = 0; melIdx = 0; melNext = 0; b = 0;
      }
      const t = nextTime;
      while (melIdx < s.notes.length && melNext <= b + 1e-6) { const [n, d] = s.notes[melIdx]; if (n) instrument(s.inst, n, t + (melNext - b) * spb, d * spb); melNext += d; melIdx++; }
      const barIdx = Math.floor(b / s.bar + 1e-6), inBar = +(b - barIdx * s.bar).toFixed(3);
      backing(s.beat, s.bars[barIdx % s.bars.length], inBar, t, spb, s.bar);
      tick++; nextTime += TICK * spb;
    }
  }
  function currentSongUrl() { return songId === 'mia' ? pub.musica : songId === 'local' ? local['musica local'] : null; }
  function startMusic() {
    if (!musicOn || NO_MUSIC_PAGE()) return;
    const c = audio(); if (!c) return;
    if (!songChosen) songId = config().canciones[MUSICA_CTX] || 'reino';
    ended = false;
    const url = currentSongUrl();
    if (url) {
      if (timer) { clearInterval(timer); timer = null; musicGain.gain.setTargetAtTime(0, c.currentTime, .05); }
      if (!songEl || songEl.dataset.src !== url) { if (songEl) songEl.pause(); songEl = new Audio(url); songEl.dataset.src = url; songEl.onended = () => { ended = true; updateMusicButtons(); }; }
      songEl.loop = !!config().canciones.repetir;
      songEl.volume = speakingDuck ? .12 : .4;
      songEl.play().catch(() => {});
      return;
    }
    if (songEl) songEl.pause();
    if (timer) return;
    if (!noise) { noise = c.createBuffer(1, Math.floor(c.sampleRate * .2), c.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2); }
    tick = 0; melIdx = 0; melNext = 0;
    nextTime = c.currentTime + 0.08;
    musicGain.gain.cancelScheduledValues(c.currentTime);
    musicGain.gain.setTargetAtTime(speakingDuck ? 0.12 : 0.42, c.currentTime, 0.3);
    timer = setInterval(schedule, 25);
  }
  function stopMusic() {
    if (songEl) songEl.pause();
    if (!timer) return;
    clearInterval(timer); timer = null;
    if (ctx) musicGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
  }
  function duck(on) {
    speakingDuck = on;
    if (songEl) songEl.volume = on ? .12 : .4;
    if (ctx && timer) musicGain.gain.setTargetAtTime(on ? 0.12 : 0.42, ctx.currentTime, 0.15);
  }
  function setMusic(on) { musicOn = on && !NO_MUSIC_PAGE(); progress.music = on; save(progress); musicOn ? startMusic() : stopMusic(); updateMusicButtons(); }
  function setSong(id, { guardar = true } = {}) { songId = id; songChosen = true; if (guardar) setConfig('canciones', MUSICA_CTX, id); stopMusic(); musicOn = !NO_MUSIC_PAGE(); progress.music = true; save(progress); startMusic(); updateMusicButtons(); }
  function songList() {
    const l = Object.entries(SONGS).map(([id, s]) => ({ id, nombre: s.nombre, emoji: s.emoji, autor: s.autor || 'original' }));
    if (pub.musica) l.push({ id: 'mia', nombre: 'Canción de la familia', emoji: '📀', autor: 'publicada' });
    if (local['musica local']) l.push({ id: 'local', nombre: 'Mi canción (solo aquí)', emoji: '💾', autor: 'de este dispositivo' });
    return l;
  }
  // tiempo musical actual (en tiempos), para que el ballet baile al ritmo
  function musicBeat() { const s = SONGS[songId]; if (!ctx || !timer || !s) return performance.now() / 1000 * 2; return (ctx.currentTime - (nextTime - tick * TICK * 60 / s.bpm)) * s.bpm / 60; }
  function updateMusicButtons() {
    document.querySelectorAll('[data-musica]').forEach(b => { b.textContent = musicOn ? '🎵' : '🔇'; b.setAttribute('aria-label', 'Elegir música'); });
  }
  // menú de canciones al tocar el botón 🎵
  function musicMenu(anchor) {
    document.querySelector('.menu-musica')?.remove();
    const m = document.createElement('div');
    m.className = 'menu-musica';
    m.innerHTML = `<p>🎵 Elige la música</p>${songList().map(s => `<button data-song="${s.id}" class="${musicOn && s.id === songId ? 'on' : ''}"><span>${s.emoji}</span><b>${esc(s.nombre)}</b><small>${esc(s.autor)}</small></button>`).join('')}
      <button data-song="__add"><span>➕</span><b>Agregar canción de este dispositivo</b><small>no se publica</small></button>
      <button data-song="__off" class="${musicOn ? '' : 'on'}"><span>🔇</span><b>Sin música</b></button><input type="file" accept="audio/*" hidden>`;
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    const w = m.offsetWidth;
    m.style.top = Math.min(innerHeight - 40, r.bottom + 8) + 'px';
    m.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    const file = m.querySelector('input');
    m.addEventListener('click', e => {
      const b = e.target.closest('[data-song]'); if (!b) return;
      e.stopPropagation();
      const id = b.dataset.song;
      if (id === '__add') { file.click(); return; }
      if (id === '__off') setMusic(false); else setSong(id);
      m.remove();
    });
    file.onchange = async () => {
      const f = file.files[0]; if (!f) return;
      await voices.set('musica local', f); await voices.refresh('musica local');
      setSong('local'); m.remove();
    };
    setTimeout(() => document.addEventListener('click', function close(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('click', close); } }), 0);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopMusic(); else if (musicOn && ctx) startMusic(); });
  function unlock() { audio(); loadSfx(); allReady.then(startMusic); }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, unlock, { once: true, passive: true }));
  document.addEventListener('click', e => { const b = e.target.closest('[data-musica]'); if (b) { audio(); musicMenu(b); } });
  document.addEventListener('DOMContentLoaded', updateMusicButtons);

  // ---------- PIN de mamá y papá ----------
  const pin = () => progress.pin || '1234';
  function pedirPin(onOk) {
    try { if (+sessionStorage.getItem('bl-admin') > Date.now()) { onOk(); return; } } catch (e) {}
    const w = document.createElement('div'); w.className = 'regalo';
    w.innerHTML = `<div class="regalo-caja pin"><p class="regalo-titulo">🔒 Para mamá y papá</p><p class="regalo-sub">Escribe el PIN</p><div class="pin-dots"></div><div class="pin-teclas">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '✕', 0, '⌫'].map(k => `<button data-k="${k}">${k}</button>`).join('')}</div></div>`;
    document.body.appendChild(w);
    let v = '';
    const dots = w.querySelector('.pin-dots');
    const draw = () => { dots.textContent = '●'.repeat(v.length) + '○'.repeat(Math.max(0, 4 - v.length)); };
    draw();
    w.addEventListener('click', e => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      const k = b.dataset.k;
      if (k === '✕') { w.remove(); return; }
      if (k === '⌫') v = v.slice(0, -1); else v += k;
      draw();
      if (v.length >= pin().length) {
        if (v === pin()) { try { sessionStorage.setItem('bl-admin', Date.now() + 30 * 60000); } catch (er) {} w.remove(); onOk(); }
        else { v = ''; dots.textContent = '✗ Intenta otra vez'; setTimeout(draw, 900); }
      }
    });
  }

  // ---------- turnos (modo 2 jugadores) ----------
  function nextTurn(cb, opts = {}) {
    if (!progress.two) { cb && cb(); return; }
    progress.turn = (progress.turn + 1) % 2; save(progress);
    showTurn(cb, opts);
  }
  function showTurn(cb, opts = {}) {
    const p = player();
    const w = document.createElement('div');
    w.className = 'turno';
    w.innerHTML = `<div class="turno-caja"><div class="turno-cara">${CHARS[p.char]?.emoji || '⭐'}</div><p>¡Turno de</p><p class="turno-nombre">${esc(p.name)}!</p></div>`;
    document.body.appendChild(w);
    sfx('pop'); say(['¡Turno de', p.name + '!']);
    if (opts.onShow) opts.onShow(p);
    setTimeout(() => { w.classList.add('fuera'); setTimeout(() => { w.remove(); cb && cb(); }, 300); }, opts.ms || 1800);
  }

  // ---------- descanso ----------
  const T0 = (() => { try { const v = +sessionStorage.getItem('bl-inicio'); if (v) return v; const n = Date.now(); sessionStorage.setItem('bl-inicio', n); return n; } catch (e) { return Date.now(); } })();
  let restShown = false;
  if (!window.SIN_MUSICA) setInterval(() => {
    if (restShown || !progress.sessionMin || Date.now() - T0 < progress.sessionMin * 60000) return;
    restShown = true;
    const w = document.createElement('div');
    w.className = 'regalo';
    w.innerHTML = `<div class="regalo-caja"><div style="font-size:90px">😴🌙</div><p class="regalo-titulo">¡Jugaste muy bien, ${esc(childName())}!</p><p class="regalo-sub">Es hora de descansar los ojitos.</p><div class="regalo-opciones"><button class="regalo-op op-seguir"><span>👩</span>Mamá: 5 minutos más</button></div></div>`;
    document.body.appendChild(w);
    say(['¡Jugaste muy bien!', childName(), 'Es hora de descansar.']);
    w.querySelector('button').onclick = () => { w.remove(); try { sessionStorage.setItem('bl-inicio', Date.now() - (progress.sessionMin - 5) * 60000); } catch (e) {} setTimeout(() => { restShown = false; }, 1000); };
  }, 30000);

  // ---------- confeti ----------
  let cv = null, cx = null, bits = [], raf = null;
  function confetti(n = 60) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!cv) {
      cv = document.createElement('canvas');
      cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:50';
      document.body.appendChild(cv); cx = cv.getContext('2d');
    }
    cv.width = innerWidth; cv.height = innerHeight;
    const cols = ['#ef5b5b', '#f39a3b', '#f6c33b', '#4cb87a', '#3f8ee8', '#9a6ee0', '#ff7eb6'];
    for (let i = 0; i < n; i++) bits.push({ x: innerWidth / 2 + (Math.random() - .5) * 240, y: innerHeight * .45, vx: (Math.random() - .5) * 16, vy: -Math.random() * 15 - 4, r: Math.random() * 6 + 5, c: pick(cols), a: Math.random() * 6, life: 100, star: Math.random() < .25 });
    if (!raf) loop();
  }
  function loop() {
    cx.clearRect(0, 0, cv.width, cv.height);
    bits.forEach(b => {
      b.x += b.vx; b.y += b.vy; b.vy += .45; b.vx *= .99; b.a += .2; b.life--;
      cx.save(); cx.translate(b.x, b.y); cx.rotate(b.a); cx.fillStyle = b.c;
      if (b.star) { cx.font = `${b.r * 3}px serif`; cx.fillText('⭐', -b.r, b.r); } else cx.fillRect(-b.r / 2, -b.r / 2, b.r, b.r * 1.6);
      cx.restore();
    });
    bits = bits.filter(b => b.life > 0 && b.y < cv.height + 20);
    raf = bits.length ? requestAnimationFrame(loop) : (cx.clearRect(0, 0, cv.width, cv.height), null);
  }

  // ---------- regalo ----------
  function gift(onContinue) {
    const wrap = document.createElement('div');
    wrap.className = 'regalo';
    wrap.innerHTML = `
      <div class="regalo-caja" role="dialog" aria-label="Regalo">
        <button class="regalo-abrir" aria-label="Abrir regalo">🎁</button>
        <p class="regalo-titulo">¡Ganaste un regalo!</p>
        <p class="regalo-sub">Toca la caja para abrirla</p>
        <div class="regalo-opciones" hidden>
          <a class="regalo-op op-cuento" href="${ROOT}cuento.html"><span>📖</span>Un cuento</a>
          <a class="regalo-op op-pintar" href="${ROOT}princesa.html"><span>🎨</span>Pintar</a>
          <a class="regalo-op op-ballet" href="${ROOT}ballet.html"><span>🩰</span>Ballet</a>
          <button class="regalo-op op-seguir"><span>▶️</span>Seguir jugando</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    cheer(true); confetti(160);
    say(['¡Ganaste un regalo!', 'Toca la caja para abrirla.'], { queue: true });
    const box = wrap.querySelector('.regalo-abrir');
    box.onclick = () => {
      box.classList.add('abierta'); box.textContent = '✨';
      sparkle(); confetti(80);
      wrap.querySelector('.regalo-sub').hidden = true;
      wrap.querySelector('.regalo-opciones').hidden = false;
      say('¿Quieres un cuento, pintar, bailar, o seguir jugando?');
    };
    wrap.querySelector('.op-seguir').onclick = () => { wrap.remove(); stopVoice(); onContinue && onContinue(); };
  }

  const css = document.createElement('style');
  css.textContent = `
  .regalo{position:fixed;inset:0;z-index:40;display:grid;place-items:center;padding:16px;background:rgba(35,50,74,.55)}
  .regalo-caja{box-sizing:border-box;background:#fff;color:#23324a;border-radius:32px;padding:24px 20px;max-width:440px;width:100%;text-align:center;box-shadow:0 10px 0 rgba(35,50,74,.3);font-family:"Baloo 2",system-ui,sans-serif;animation:regalo-in .4s ease-out}
  .regalo-abrir{font-size:110px;line-height:1.1;background:none;border:0;cursor:pointer;animation:regalo-bote 1s ease-in-out infinite}
  .regalo-abrir.abierta{animation:none}
  .regalo-titulo{font-size:32px;font-weight:800;margin:4px 0}
  .regalo-sub{font-size:20px;margin:0}
  .regalo-opciones{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:12px;margin-top:12px}
  .regalo-op{display:flex;flex-direction:column;align-items:center;gap:2px;padding:12px 8px;border-radius:20px;border:0;font:inherit;font-size:20px;font-weight:800;color:#fff;text-decoration:none;cursor:pointer;box-shadow:0 6px 0 rgba(35,50,74,.3)}
  .regalo-op span{font-size:44px;line-height:1.1}
  .op-cuento{background:#3f8ee8}.op-pintar{background:linear-gradient(135deg,#ef5b5b,#f6c33b,#4cb87a,#3f8ee8,#9a6ee0)}.op-seguir{background:#4cb87a}.op-ballet{background:#ff7eb6}
  .turno{position:fixed;inset:0;z-index:45;display:grid;place-items:center;background:radial-gradient(circle,#fff6c8,#ffc2dd);animation:regalo-in .3s ease-out;font-family:"Baloo 2",system-ui,sans-serif;color:#23324a;text-align:center;transition:opacity .3s}
  .turno.fuera{opacity:0}
  .turno-cara{font-size:120px;line-height:1;animation:regalo-bote 1s ease-in-out infinite}
  .turno p{margin:0;font-size:34px;font-weight:800}
  .turno .turno-nombre{font-size:56px;line-height:1.1}
  .menu-musica{position:fixed;z-index:60;background:#fff;color:#23324a;border-radius:20px;padding:10px;box-shadow:0 10px 30px rgba(35,50,74,.3);display:flex;flex-direction:column;gap:6px;width:min(320px,calc(100vw - 32px));max-height:70vh;overflow-y:auto;font-family:"Baloo 2",system-ui,sans-serif}
  .menu-musica p{margin:0 6px;font-weight:800;font-size:18px}
  .menu-musica button{display:grid;grid-template-columns:36px 1fr;grid-template-rows:auto auto;align-items:center;text-align:left;border:0;background:#f3f6fb;border-radius:14px;padding:6px 10px;font:inherit;color:inherit;cursor:pointer;column-gap:8px}
  .menu-musica button span{grid-row:1/3;font-size:26px}
  .menu-musica button b{font-size:16px;line-height:1.1}
  .menu-musica button small{font-size:13px;opacity:.7;line-height:1.1}
  .menu-musica button.on{background:#ffe27a}
  .pin .pin-dots{font-size:30px;letter-spacing:.3em;margin:8px 0;min-height:1.2em}
  .pin-teclas{display:grid;grid-template-columns:repeat(3,64px);gap:10px;justify-content:center}
  .pin-teclas button{height:58px;border-radius:16px;border:0;background:#eef3fb;font:inherit;font-size:24px;font-weight:800;cursor:pointer;color:#23324a}
  @keyframes regalo-bote{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-12px) rotate(4deg)}}
  @keyframes regalo-in{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}
  @media (prefers-reduced-motion: reduce){.regalo-abrir,.regalo-caja,.turno-cara{animation:none}}`;
  document.head.appendChild(css);

  window.Juego = {
    WORDS, CHARS, pick, shuffle, strip, esc, norm, progress, save: () => save(progress), player, childName, addStar,
    say, stopVoice, sound, SOUNDS, SOUND_WORD, PRAISES, SHOUTS, voices, recUrl, ROOT,
    sfx, tones, ding, boing, fanfare, sparkle, cheer, applause, confetti, gift,
    startMusic, stopMusic, setMusic, setSong, songList, musicBeat, SONGS, currentSong: () => songId, refreshMusic: updateMusicButtons, isMusicOn: () => musicOn, isPlaying: () => !!timer || !!(songEl && !songEl.paused), audio,
    efecto, moneda, GRUPOS_EFECTOS, JUEGO, config, setConfig, palabras, silabas, art, SEMILLAS, JUEGOS_PALABRAS, MODELOS, itemDe, ready: allReady, pin, pedirPin, MUSICA_CTX,
    nextTurn, showTurn,
  };
})();
