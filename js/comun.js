// Bloques de Letras — utilidades compartidas: palabras, progreso, voz, música, sonidos, confeti y regalos.
(function () {
  'use strict';

  // ---------- palabras (palabra, sílabas, dibujo) ----------
  // Palabras con vocabulario peruano (palta, choclo, llama, papa)
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
  ];

  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

  // ---------- progreso y ajustes (se guardan en este navegador) ----------
  const KEY = 'bloques-letras';
  const CHARS = { nieve: { name: 'Princesa Nieve', emoji: '👸' }, estrella: { name: 'Estrella Pop', emoji: '🎤' }, llama: { name: 'Llamita Lula', emoji: '🦙' }, zorro: { name: 'Zorrito', emoji: '🦊' } };
  function load() {
    let d;
    try { d = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { d = {}; }
    d = Object.assign({ level: {}, music: true, two: false, turn: 0, sessionMin: 15, rate: 0.8 }, d);
    if (!Array.isArray(d.players)) d.players = [{ name: 'Avelu', char: 'nieve', stars: d.stars || 0 }, { name: 'Mamá', char: 'estrella', stars: 0 }];
    return d;
  }
  function save(data) { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  const progress = load();
  const player = () => progress.players[progress.two ? progress.turn % 2 : 0];
  Object.defineProperty(progress, 'stars', { get: () => player().stars, set: v => { player().stars = v; }, enumerable: false });
  const childName = () => progress.players[0].name || 'Avelu';
  function addStar(n = 1) { player().stars += n; save(progress); return player().stars; }

  // ---------- voz ----------
  let voice = null;
  const hasTTS = 'speechSynthesis' in window;
  function loadVoice() {
    if (!hasTTS) return;
    const vs = speechSynthesis.getVoices().filter(v => /^es/i.test(v.lang));
    voice = vs.find(v => /es-PE/i.test(v.lang)) || vs.find(v => /es-(US|MX|419|CO)/i.test(v.lang)) || vs.find(v => /es-ES/i.test(v.lang)) || vs[0] || null;
  }
  if (hasTTS) { loadVoice(); speechSynthesis.onvoiceschanged = loadVoice; }

  let speaking = 0;
  function say(parts, opts = {}) {
    if (!hasTTS) return;
    if (!opts.queue) speechSynthesis.cancel();
    (Array.isArray(parts) ? parts : [parts]).forEach(t => {
      const u = new SpeechSynthesisUtterance(t);
      u.lang = voice ? voice.lang : 'es-MX';
      if (voice) u.voice = voice;
      u.rate = (opts.rate || 0.8) * (progress.rate / 0.8);
      u.pitch = opts.pitch || 1.15;
      u.onstart = () => { speaking++; duck(true); };
      u.onend = u.onerror = () => { speaking = Math.max(0, speaking - 1); if (!speaking) duck(false); };
      if (opts.onboundary) u.onboundary = opts.onboundary;
      if (opts.onend) u.addEventListener('end', opts.onend);
      speechSynthesis.speak(u);
    });
  }
  function stopVoice() { if (hasTTS) speechSynthesis.cancel(); speaking = 0; duck(false); }

  // ---------- audio ----------
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

  // Sonidos de Kenney (CC0), convertidos a mp3
  const base = (document.currentScript && document.currentScript.src) ? new URL('../assets/sonidos/', document.currentScript.src).href : 'assets/sonidos/';
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

  function tones(freqs, dur = 0.12, type = 'sine', vol = 0.25, out) {
    const c = audio(); if (!c) return;
    freqs.forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = f;
      const t = c.currentTime + i * dur;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.6);
      o.connect(g).connect(out || master); o.start(t); o.stop(t + dur * 1.8);
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

  // Aplausos (ruido filtrado en ráfagas) + corneta de fiesta + grito de niños con la voz
  function applause(seconds = 1.6) {
    const c = audio(); if (!c) return;
    const len = Math.floor(c.sampleRate * 0.05);
    const noise = c.createBuffer(1, len, c.sampleRate), d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const claps = Math.floor(seconds * 28);
    for (let i = 0; i < claps; i++) {
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
    o.type = 'sawtooth'; o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(640, t + 0.15); o.frequency.setValueAtTime(640, t + 0.5);
    f.type = 'lowpass'; f.frequency.value = 2200;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.03); g.gain.setValueAtTime(0.12, t + 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + 0.62);
  }
  const SHOUTS = ['¡Yupiii!', '¡Bravooo!', '¡Wiii!', '¡Hurraaa!', '¡Siii!', '¡Olé!'];
  function cheer(big = false) {
    ding(); partyHorn();
    if (big) { applause(2.2); setTimeout(fanfare, 250); }
    else applause(1.1);
    say(pick(SHOUTS), { pitch: 1.7, rate: 1.05, queue: true });
  }

  // ---------- música alegre (composición original, sintetizada en el navegador) ----------
  // Do mayor, 120 bpm, I–V–vi–IV. Corcheas: 8 por compás, 8 compases.
  const MELODY = [
    76,79,81,79,76,79,84,0,  74,71,67,71,74,71,67,0,  72,69,64,69,72,74,76,0,  77,76,74,72,71,72,74,0,
    76,76,79,79,81,81,79,0,  79,79,74,74,71,74,79,0,  81,79,76,74,72,76,81,0,  77,76,74,72,74,0,72,0,
  ];
  const CHORDS = [[48,[60,64,67]], [43,[59,62,67]], [45,[57,60,64]], [41,[57,60,65]]];
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  let musicOn = progress.music !== false, step = 0, nextTime = 0, timer = null, hatNoise = null;
  const STEP = 0.25; // corchea a 120 bpm

  function note(freq, t, dur, type, vol, dest) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.02);
  }
  function schedule() {
    while (nextTime < ctx.currentTime + 0.15) {
      const t = nextTime, bar = Math.floor(step / 8) % 8, beat = step % 8;
      const [root, chord] = CHORDS[bar % 4];
      const m = MELODY[step % MELODY.length];
      if (m) note(midi(m), t, STEP * 0.9, 'square', 0.05, musicGain);
      if (m) note(midi(m + 12), t, STEP * 0.6, 'sine', 0.025, musicGain); // brillo de campanita
      note(midi(beat % 2 ? root + 12 : root), t, STEP * 0.8, 'triangle', 0.18, musicGain); // bajo saltarín
      if (beat === 1 || beat === 3 || beat === 5 || beat === 7) chord.forEach(n => note(midi(n), t, STEP * 0.5, 'triangle', 0.035, musicGain));
      if (beat % 2 === 0) { // bombo
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
        g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
        o.connect(g).connect(musicGain); o.start(t); o.stop(t + 0.16);
      } else { // platillo
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = hatNoise; f.type = 'highpass'; f.frequency.value = 7000; g.gain.value = 0.08;
        s.connect(f).connect(g).connect(musicGain); s.start(t);
      }
      step++; nextTime += STEP;
    }
  }
  function startMusic() {
    if (!musicOn || timer) return;
    const c = audio(); if (!c) return;
    if (!hatNoise) {
      hatNoise = c.createBuffer(1, Math.floor(c.sampleRate * 0.04), c.sampleRate);
      const d = hatNoise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    }
    nextTime = c.currentTime + 0.05;
    musicGain.gain.cancelScheduledValues(c.currentTime);
    musicGain.gain.setTargetAtTime(speaking ? 0.12 : 0.45, c.currentTime, 0.3);
    timer = setInterval(schedule, 25);
  }
  function stopMusic() {
    if (!timer) return;
    clearInterval(timer); timer = null;
    if (ctx) musicGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
  }
  function duck(on) { if (ctx && timer) musicGain.gain.setTargetAtTime(on ? 0.12 : 0.45, ctx.currentTime, 0.15); }
  function setMusic(on) { musicOn = on; progress.music = on; save(progress); on ? startMusic() : stopMusic(); updateMusicButtons(); }
  function updateMusicButtons() {
    document.querySelectorAll('[data-musica]').forEach(b => { b.textContent = musicOn ? '🎵' : '🔇'; b.setAttribute('aria-label', musicOn ? 'Apagar música' : 'Prender música'); });
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopMusic(); else if (musicOn && ctx) startMusic(); });

  // Primer toque: desbloquear audio, cargar sonidos y arrancar la música
  function unlock() { audio(); loadSfx(); startMusic(); }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, unlock, { once: true, passive: true }));
  document.addEventListener('click', e => { const b = e.target.closest('[data-musica]'); if (b) setMusic(!musicOn); });
  document.addEventListener('DOMContentLoaded', updateMusicButtons);

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
  // Muestra una caja de regalo; al abrirla elige entre el cuento y el lienzo arcoíris.
  function gift(onContinue, root = '') {
    const wrap = document.createElement('div');
    wrap.className = 'regalo';
    wrap.innerHTML = `
      <div class="regalo-caja" role="dialog" aria-label="Regalo">
        <button class="regalo-abrir" aria-label="Abrir regalo">🎁</button>
        <p class="regalo-titulo">¡Ganaste un regalo!</p>
        <p class="regalo-sub">Toca la caja para abrirla</p>
        <div class="regalo-opciones" hidden>
          <a class="regalo-op op-cuento" href="${root}cuento.html"><span>📖</span>Un cuento</a>
          <a class="regalo-op op-pintar" href="${root}pintar.html"><span>🌈</span>Pintar</a>
          <button class="regalo-op op-seguir"><span>▶️</span>Seguir jugando</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    cheer(true); confetti(160);
    say('¡Ganaste un regalo! Toca la caja para abrirla.', { queue: true });
    const box = wrap.querySelector('.regalo-abrir');
    box.onclick = () => {
      box.classList.add('abierta'); box.textContent = '✨';
      sparkle(); confetti(80);
      wrap.querySelector('.regalo-sub').hidden = true;
      wrap.querySelector('.regalo-opciones').hidden = false;
      say('¿Quieres un cuento, o pintar con colores del arcoíris?');
    };
    wrap.querySelector('.op-seguir').onclick = () => { wrap.remove(); stopVoice(); onContinue && onContinue(); };
  }

  // estilos del regalo (se comparten entre páginas)
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
  @keyframes regalo-bote{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-12px) rotate(4deg)}}
  @keyframes regalo-in{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}
  @media (prefers-reduced-motion: reduce){.regalo-abrir,.regalo-caja{animation:none}}`;
  document.head.appendChild(css);


  // ---------- turnos (modo 2 jugadores) ----------
  // Muestra "¡Turno de …!" y llama a cb. En modo de 1 jugador llama a cb directamente.
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
    sfx('pop'); say('¡Turno de ' + p.name + '!');
    setTimeout(() => { w.classList.add('fuera'); setTimeout(() => { w.remove(); cb && cb(); }, 300); }, opts.ms || 1700);
    if (opts.onShow) opts.onShow(p);
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- sonidos de las letras (método fonético) ----------
  // Si mamá o papá grabaron el sonido, se usa la grabación; si no, la voz del dispositivo.
  const SOUNDS = {
    a: 'a', e: 'e', i: 'i', o: 'o', u: 'u',
    m: 'mmmm', s: 'ssss', n: 'nnnn', f: 'ffff', l: 'llll',
    p: 'pa', t: 'ta', d: 'da', c: 'ca', g: 'ga', b: 'ba', r: 'ra', ñ: 'ña', j: 'ja', ch: 'cha', ll: 'lla', v: 'va',
  };
  // ejemplo de palabra para cada sonido
  const SOUND_WORD = { a: 'abeja', e: 'elefante', i: 'isla', o: 'oso', u: 'uva', m: 'mamá', s: 'sapo', n: 'nube', f: 'flor', l: 'luna',
    p: 'papá', t: 'taza', d: 'dedo', c: 'casa', g: 'gato', b: 'bota', r: 'rana', ñ: 'piña', j: 'jugo', ch: 'choclo', ll: 'llama', v: 'vaca' };
  const RECORDABLE = ['a', 'e', 'i', 'o', 'u', 'm', 's', 'l', 'n', 'f', 'p', 't', 'd', 'c', 'g', 'b', 'r', 'ch', 'll', 'ñ', 'j', 'bravo', 'nombre'];

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
  const tx = (mode, fn) => openDB().then(d => new Promise((ok, no) => { const t = d.transaction('sonidos', mode); const st = t.objectStore('sonidos'); const r = fn(st); t.oncomplete = () => ok(r && r.result); t.onerror = () => no(t.error); }));
  const voices = {
    get: k => tx('readonly', st => st.get(k)).catch(() => null),
    set: (k, blob) => tx('readwrite', st => st.put(blob, k)),
    del: k => tx('readwrite', st => st.delete(k)),
    keys: () => tx('readonly', st => st.getAllKeys()).catch(() => []),
  };
  // 1) grabaciones de este navegador (IndexedDB)  2) grabaciones públicas del repositorio (assets/voz/lista.json)
  const cache = {}, publicVoice = {};
  voices.keys().then(ks => (ks || []).forEach(k => voices.get(k).then(b => { if (b) cache[k] = URL.createObjectURL(b); })));
  const vozBase = base.replace(/sonidos\/$/, 'voz/');
  fetch(vozBase + 'lista.json').then(r => r.ok ? r.json() : {}).then(list => { Object.entries(list || {}).forEach(([k, f]) => { publicVoice[k] = vozBase + f; }); }).catch(() => {});
  voices.refresh = k => voices.get(k).then(b => { if (cache[k]) URL.revokeObjectURL(cache[k]); if (b) cache[k] = URL.createObjectURL(b); else delete cache[k]; });
  voices.has = k => !!cache[k];
  voices.hasPublic = k => !!publicVoice[k];
  // exportar todas las grabaciones en un solo archivo .json (audio en base64)
  voices.export = async () => {
    const out = {};
    for (const k of await voices.keys()) {
      const b = await voices.get(k); if (!b) continue;
      out[k] = { type: b.type, data: await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(b); }) };
    }
    return out;
  };
  voices.import = async obj => {
    for (const [k, v] of Object.entries(obj || {})) {
      if (!RECORDABLE.includes(k) || !v || !v.data) continue;
      const blob = await (await fetch(v.data)).blob();
      await voices.set(k, blob); await voices.refresh(k);
    }
  };
  let playing = null;
  function playRec(k) {
    const url = cache[k] || publicVoice[k];
    if (!url) return false;
    try { if (playing) playing.pause(); stopVoice(); playing = new Audio(url); duck(true); playing.onended = () => duck(false); playing.play(); return true; } catch (e) { return false; }
  }
  // sonido de una letra: grabación o voz del dispositivo
  function sound(letter, opts = {}) {
    if (playRec(letter)) { if (opts.then) setTimeout(() => say(opts.then, { queue: true }), 900); return; }
    say([SOUNDS[letter] || letter].concat(opts.then ? [opts.then] : []), { rate: 0.7 });
  }
  function praiseVoice(text) { if (!playRec('bravo')) say(text, { queue: true }); }

  // ---------- descanso ----------
  const T0 = (() => { try { const v = +sessionStorage.getItem('bl-inicio'); if (v) return v; const n = Date.now(); sessionStorage.setItem('bl-inicio', n); return n; } catch (e) { return Date.now(); } })();
  let restShown = false;
  setInterval(() => {
    if (restShown || !progress.sessionMin || Date.now() - T0 < progress.sessionMin * 60000) return;
    restShown = true;
    const w = document.createElement('div');
    w.className = 'regalo';
    w.innerHTML = `<div class="regalo-caja"><div style="font-size:90px">😴🌙</div><p class="regalo-titulo">¡Jugaste muy bien, ${esc(childName())}!</p><p class="regalo-sub">Es hora de descansar los ojitos.</p><div class="regalo-opciones"><button class="regalo-op op-seguir"><span>👩</span>Mamá: 5 minutos más</button></div></div>`;
    document.body.appendChild(w);
    say(`¡Jugaste muy bien, ${childName()}! Es hora de descansar.`);
    w.querySelector('button').onclick = () => { w.remove(); try { sessionStorage.setItem('bl-inicio', Date.now() - (progress.sessionMin - 5) * 60000); } catch (e) {} setTimeout(() => { restShown = false; }, 1000); };
  }, 30000);

  const css2 = document.createElement('style');
  css2.textContent = `
  .turno{position:fixed;inset:0;z-index:45;display:grid;place-items:center;background:radial-gradient(circle,#fff6c8,#ffc2dd);animation:regalo-in .3s ease-out;font-family:"Baloo 2",system-ui,sans-serif;color:#23324a;text-align:center;transition:opacity .3s}
  .turno.fuera{opacity:0}
  .turno-cara{font-size:120px;line-height:1;animation:regalo-bote 1s ease-in-out infinite}
  .turno p{margin:0;font-size:34px;font-weight:800}
  .turno .turno-nombre{font-size:56px;line-height:1.1}`;
  document.head.appendChild(css2);

  window.Juego = { CHARS, player, childName, nextTurn, showTurn, esc, SOUNDS, SOUND_WORD, RECORDABLE, voices, sound, praiseVoice, playRec, refreshMusic: updateMusicButtons, isMusicOn: () => musicOn, WORDS, pick, shuffle, strip, progress, save: () => save(progress), addStar, say, stopVoice,
    sfx, tones, ding, boing, fanfare, sparkle, cheer, applause, confetti, gift, startMusic, setMusic, audio };
})();
