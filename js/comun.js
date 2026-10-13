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
    (Array.isArray(parts) ? parts : [parts]).filter(Boolean).forEach(t => queue.push({ t: String(t), opts }));
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
  const SFX = { coin: 'coin.mp3', jump: 'jump.mp3', land: 'land.mp3', pop: 'placement-a.mp3', pop2: 'placement-c.mp3', tick: 'toggle.mp3' };
  const buffers = {};
  function loadSfx() {
    const c = audio(); if (!c) return;
    Object.entries(SFX).forEach(([k, f]) => {
      if (buffers[k]) return;
      buffers[k] = 'loading';
      fetch(base + f).then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => c.decodeAudioData(b, ok, no)))
        .then(buf => { buffers[k] = buf; }).catch(() => { buffers[k] = null; });
    });
  }
  function sfx(name, vol = 0.8, rate = 1) {
    const c = audio(); if (!c) return;
    const buf = buffers[name];
    if (buf && buf !== 'loading') {
      const s = c.createBufferSource(), g = c.createGain();
      s.buffer = buf; s.playbackRate.value = rate; g.gain.value = vol;
      s.connect(g).connect(master); s.start();
    } else tones([880, 1320], 0.08, 'triangle', 0.2);
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
  const ding = () => tones([660, 880, 1175], 0.11, 'triangle');
  const boing = () => {
    const c = audio(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = 'sine'; o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.35);
    g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.42);
  };
  const fanfare = () => tones([523, 659, 784, 1047, 784, 1047, 1319], 0.12, 'triangle', 0.22);
  const sparkle = () => tones([1568, 2093, 2637, 3136], 0.05, 'sine', 0.08);
  function applause(seconds = 1.6) {
    const c = audio(); if (!c) return;
    const len = Math.floor(c.sampleRate * 0.05);
    const noise = c.createBuffer(1, len, c.sampleRate), d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    for (let i = 0; i < Math.floor(seconds * 28); i++) {
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = noise; f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 1800; f.Q.value = 1.2;
      const t = c.currentTime + Math.random() * seconds;
      g.gain.value = 0.25 * (1 - (t - c.currentTime) / seconds * 0.7);
      s.connect(f).connect(g).connect(master); s.start(t);
    }
  }
  function partyHorn() {
    const c = audio(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(), t = c.currentTime;
    o.type = 'sawtooth'; o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(640, t + 0.15);
    f.type = 'lowpass'; f.frequency.value = 2200;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.03); g.gain.setValueAtTime(0.12, t + 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + 0.62);
  }
  const SHOUTS = ['¡Yupi!', '¡Bravo!', '¡Wiii!', '¡Hurra!', '¡Sí!'];
  const PRAISES = ['¡Muy bien!', '¡Bravo!', '¡Genial!', '¡Súper!', '¡Excelente!', '¡Lo lograste!', '¡Qué lista eres!'];
  function cheer(big = false) {
    ding(); partyHorn();
    if (big) { applause(2.2); setTimeout(fanfare, 250); } else applause(1.1);
    say(pick(SHOUTS), { queue: true, pitch: 1.6, rate: 1.05 });
  }

  // ---------- música ----------
  // Si se publicó una canción (assets/voz/lista.json → "musica"), se usa; si no, una melodía original sintetizada.
  const NO_MUSIC = !!window.SIN_MUSICA;
  let musicOn = progress.music !== false && !NO_MUSIC, timer = null, songEl = null, step = 0, nextTime = 0, hatNoise = null, speakingDuck = false;
  const MELODY = [
    72,0,76,79,84,0,79,76, 74,0,77,81,86,0,81,77, 76,0,79,83,88,0,83,79, 77,79,81,79,77,76,74,0,
    72,72,76,76,79,79,81,79, 77,77,74,74,71,74,79,0, 81,79,77,76,74,76,77,79, 84,0,79,0,72,0,0,0,
  ];
  const CHORDS = [[48, [60, 64, 67]], [50, [62, 65, 69]], [52, [64, 67, 71]], [53, [65, 69, 72]], [48, [60, 64, 67]], [50, [62, 65, 69]], [55, [62, 67, 71]], [48, [60, 64, 67]]];
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const STEP = 60 / 132 / 2;
  function note(freq, t, dur, type, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(musicGain); o.start(t); o.stop(t + dur + 0.02);
  }
  function schedule() {
    while (nextTime < ctx.currentTime + 0.15) {
      const t = nextTime, bar = Math.floor(step / 8) % 8, beat = step % 8;
      const [root, chord] = CHORDS[bar];
      const m = MELODY[step % MELODY.length];
      if (m) { note(midi(m), t, STEP * 0.85, 'square', 0.04); note(midi(m + 12), t, STEP * 0.5, 'triangle', 0.03); }
      note(midi(beat % 2 ? root + 7 : root - 12), t, STEP * 0.9, 'triangle', 0.2);
      if (beat % 2) chord.forEach(n => note(midi(n), t, STEP * 0.6, 'square', 0.015));
      if (beat % 4 === 0) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
        g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
        o.connect(g).connect(musicGain); o.start(t); o.stop(t + 0.16);
      }
      if (beat % 4 === 2) { // palmas
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = hatNoise; f.type = 'bandpass'; f.frequency.value = 1500; g.gain.value = .25;
        s.connect(f).connect(g).connect(musicGain); s.start(t);
      }
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = hatNoise; f.type = 'highpass'; f.frequency.value = 7000; g.gain.value = beat % 2 ? .07 : .03;
      s.connect(f).connect(g).connect(musicGain); s.start(t);
      step++; nextTime += STEP;
    }
  }
  function startMusic() {
    if (!musicOn || NO_MUSIC) return;
    const c = audio(); if (!c) return;
    if (pub.musica) {
      if (!songEl) { songEl = new Audio(pub.musica); songEl.loop = true; songEl.volume = .35; }
      songEl.volume = speakingDuck ? .1 : .35;
      songEl.play().catch(() => {});
      return;
    }
    if (timer) return;
    if (!hatNoise) {
      hatNoise = c.createBuffer(1, Math.floor(c.sampleRate * 0.05), c.sampleRate);
      const d = hatNoise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    }
    nextTime = c.currentTime + 0.05;
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
    if (songEl) songEl.volume = on ? .1 : .35;
    if (ctx && timer) musicGain.gain.setTargetAtTime(on ? 0.12 : 0.42, ctx.currentTime, 0.15);
  }
  function setMusic(on) { musicOn = on && !NO_MUSIC; progress.music = on; save(progress); musicOn ? startMusic() : stopMusic(); updateMusicButtons(); }
  function updateMusicButtons() {
    document.querySelectorAll('[data-musica]').forEach(b => { b.textContent = musicOn ? '🎵' : '🔇'; b.setAttribute('aria-label', musicOn ? 'Apagar música' : 'Prender música'); });
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopMusic(); else if (musicOn && ctx) startMusic(); });
  function unlock() { audio(); loadSfx(); ready.then(startMusic); }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, unlock, { once: true, passive: true }));
  document.addEventListener('click', e => { const b = e.target.closest('[data-musica]'); if (b) setMusic(!musicOn); });
  document.addEventListener('DOMContentLoaded', updateMusicButtons);

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
  if (!NO_MUSIC) setInterval(() => {
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
      say('¿Quieres un cuento, pintar, o seguir jugando?');
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
  .op-cuento{background:#3f8ee8}.op-pintar{background:linear-gradient(135deg,#ef5b5b,#f6c33b,#4cb87a,#3f8ee8,#9a6ee0)}.op-seguir{background:#4cb87a}
  .turno{position:fixed;inset:0;z-index:45;display:grid;place-items:center;background:radial-gradient(circle,#fff6c8,#ffc2dd);animation:regalo-in .3s ease-out;font-family:"Baloo 2",system-ui,sans-serif;color:#23324a;text-align:center;transition:opacity .3s}
  .turno.fuera{opacity:0}
  .turno-cara{font-size:120px;line-height:1;animation:regalo-bote 1s ease-in-out infinite}
  .turno p{margin:0;font-size:34px;font-weight:800}
  .turno .turno-nombre{font-size:56px;line-height:1.1}
  @keyframes regalo-bote{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-12px) rotate(4deg)}}
  @keyframes regalo-in{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}
  @media (prefers-reduced-motion: reduce){.regalo-abrir,.regalo-caja,.turno-cara{animation:none}}`;
  document.head.appendChild(css);

  window.Juego = {
    WORDS, CHARS, pick, shuffle, strip, esc, norm, progress, save: () => save(progress), player, childName, addStar,
    say, stopVoice, sound, SOUNDS, SOUND_WORD, PRAISES, SHOUTS, voices, recUrl, ROOT,
    sfx, tones, ding, boing, fanfare, sparkle, cheer, applause, confetti, gift,
    startMusic, stopMusic, setMusic, refreshMusic: updateMusicButtons, isMusicOn: () => musicOn, audio,
    nextTurn, showTurn,
  };
})();
