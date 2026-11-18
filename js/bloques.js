// Lluvia de Bloques: piezas que caen y filas que se llenan. En los modos de lectura cada pieza trae
// una sílaba (o una vocal); si la fila que se llena tiene la sílaba que sigue, la palabra de arriba se va armando.
(() => {
  const J = window.Juego, P = J.progress;
  const $ = s => document.querySelector(s);
  const PRUEBA = location.hash === '#prueba';

  // ---------- piezas ----------
  const FORMAS = {
    I: [[0, 0], [1, 0], [2, 0], [3, 0]], O: [[0, 0], [1, 0], [0, 1], [1, 1]], T: [[0, 0], [1, 0], [2, 0], [1, 1]],
    L: [[0, 0], [0, 1], [0, 2], [1, 2]], J: [[1, 0], [1, 1], [1, 2], [0, 2]], S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
    I3: [[0, 0], [1, 0], [2, 0]], L3: [[0, 0], [0, 1], [1, 1]], D2: [[0, 0], [1, 0]],
  };
  const COLOR = { I: '#35c9d6', O: '#ffd23f', T: '#b06cf0', L: '#ff9a3d', J: '#4f8cff', S: '#5fd17a', Z: '#ff5d7a', I3: '#35c9d6', L3: '#ff9a3d', D2: '#ff7eb6' };
  const TAM = {
    peque: { cols: 8, rows: 12, piezas: ['O', 'I3', 'L3', 'D2', 'I3', 'D2'], base: 1050, paso: 55, nombre: 'Tablero chico y piezas sencillas' },
    grande: { cols: 10, rows: 18, piezas: ['I', 'O', 'T', 'L', 'J', 'S', 'Z'], base: 850, paso: 65, nombre: 'Tablero grande con las 7 piezas' },
  };
  const VOC = ['a', 'e', 'i', 'o', 'u'];
  const NIVELES = 8;
  const girar = cells => { const my = Math.max(...cells.map(c => c[1])); return cells.map(([x, y]) => [my - y, x]); };

  const state = { modo: 'silabas', tam: 'peque', nivel: 0, grid: [], pieza: null, sigue: null, filas: 0, filasNivel: 0, hechasNivel: 0, meta: null, jugando: false, flash: null, caeT: 0, usadas: [] };
  const T = () => TAM[state.tam];
  let PALABRAS = [], celda = 30;

  // ---------- tamaño del tablero ----------
  const cv = $('#tablero'), cx = cv.getContext('2d'), sg = $('#sigue'), sx = sg.getContext('2d');
  function medir() {
    const t = T(), barra = $('#barra').getBoundingClientRect(), mandos = $('#mandos').getBoundingClientRect();
    const top = barra.bottom + 12, altoLibre = (mandos.top || innerHeight - 90) - top - 12, anchoLibre = innerWidth - 16;
    celda = Math.max(16, Math.floor(Math.min(anchoLibre / t.cols, altoLibre / t.rows, 46)));
    const dpr = Math.min(2, devicePixelRatio || 1), w = t.cols * celda, h = t.rows * celda;
    cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.style.top = top + 'px';
    cv.width = w * dpr; cv.height = h * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dibujar();
  }
  addEventListener('resize', medir);

  // ---------- palabra o vocales que se arman ----------
  function nuevaMeta() {
    if (state.modo === 'clasico') { state.meta = null; return pintarBarra(); }
    if (state.modo === 'letras') state.meta = { palabra: 'a e i o u', emoji: '🔤', partes: VOC.slice(), i: 0, otras: VOC };
    else {
      let pool = PALABRAS.filter(w => { const n = w[1].split('-').length; return w[2] && (state.nivel < 3 ? n === 2 : n >= 2 && n <= 3); });
      if (!pool.length) pool = PALABRAS;
      const frescas = pool.filter(w => !state.usadas.includes(w[0]));
      const w = J.pick(frescas.length ? frescas : pool); state.usadas.push(w[0]);
      const partes = w[1].split('-').map(s => s.toLowerCase());
      const otras = [...new Set(PALABRAS.flatMap(x => x[1].split('-').map(s => s.toLowerCase())))].filter(s => !partes.includes(s));
      state.meta = { palabra: w[0], emoji: w[2], partes, i: 0, otras: otras.length ? otras : ['ma', 'pe', 'lo'] };
    }
    pintarBarra(); decirMeta();
  }
  function decirMeta() {
    const m = state.meta; if (!m) return;
    if (state.modo === 'letras') J.say(['Junta las vocales', 'a, e, i, o, u']); else J.say(['Junta las sílabas de', m.palabra]);
  }
  $('#b-oir').onclick = decirMeta;
  function pintarBarra() {
    const m = state.meta;
    $('#b-oir').hidden = !m;
    if (!m) { $('#b-emo').textContent = '🎮'; $('#b-sils').innerHTML = Array.from({ length: 6 }, (_, k) => `<span class="${k < state.filasNivel ? 'ok' : ''}" style="min-width:20px">${k < state.filasNivel ? '⭐' : ''}</span>`).join(''); return; }
    $('#b-emo').textContent = m.emoji;
    $('#b-sils').innerHTML = m.partes.map((s, k) => `<span class="${k < m.i ? 'ok' : k === m.i ? 'sig' : ''}">${J.esc(s)}</span>`).join('');
  }

  // ---------- piezas en juego ----------
  function crearPieza() {
    const t = T(), forma = J.pick(t.piezas), cells = FORMAS[forma].map(c => c.slice()), m = state.meta;
    let sil = '';
    if (m) sil = Math.random() < .62 ? m.partes[m.i] : J.pick(m.otras.filter(s => s !== m.partes[m.i]).length ? m.otras.filter(s => s !== m.partes[m.i]) : m.otras);
    const ancho = Math.max(...cells.map(c => c[0])) + 1;
    return { forma, cells, color: COLOR[forma], sil, x: Math.floor((t.cols - ancho) / 2), y: 0 };
  }
  const choca = (p, dx = 0, dy = 0, cells = p.cells) => cells.some(([cxx, cyy]) => { const x = p.x + cxx + dx, y = p.y + cyy + dy; return x < 0 || x >= T().cols || y >= T().rows || (y >= 0 && state.grid[y][x]); });
  function sacarPieza() {
    state.pieza = state.sigue || crearPieza(); state.sigue = crearPieza(); state.caeT = 0;
    // sin sustos: si ya no cabe, se van las filas de abajo y seguimos
    let n = 0;
    while (choca(state.pieza) && n++ < 6) {
      for (let k = 0; k < 4; k++) { state.grid.pop(); state.grid.unshift(Array(T().cols).fill(null)); }
      if (n === 1) { message('¡Otra vez! 💪', 1.4); J.efecto('pop'); J.say('¡Otra vez!'); }
    }
    dibujarSigue();
  }
  function mover(dx) { const p = state.pieza; if (!p || state.flash || !activo()) return false; if (!choca(p, dx, 0)) { p.x += dx; J.sfx('tick', .25); dibujar(); return true; } return false; }
  function rotar() {
    const p = state.pieza; if (!p || state.flash || !activo()) return;
    const g = girar(p.cells);
    for (const k of [0, -1, 1, -2, 2]) if (!choca(p, k, 0, g)) { p.cells = g; p.x += k; J.sfx('pop', .35, 1.5); dibujar(); return; }
  }
  function bajar(suave = true) {
    const p = state.pieza; if (!p || state.flash || !activo()) return false;
    if (!choca(p, 0, 1)) { p.y++; state.caeT = 0; if (suave) dibujar(); return true; }
    fijar(); return false;
  }
  function caer() { if (!state.pieza || state.flash || !activo()) return; while (bajar(false)); }
  function fijar() {
    const p = state.pieza; if (!p) return;
    p.cells.forEach(([x, y]) => { if (p.y + y >= 0) state.grid[p.y + y][p.x + x] = { color: p.color, sil: p.sil }; });
    state.pieza = null; J.sfx('land', .4);
    const llenas = state.grid.map((f, r) => f.every(Boolean) ? r : -1).filter(r => r >= 0);
    if (llenas.length) { state.flash = { filas: llenas, t: .3 }; J.moneda(); }
    else sacarPieza();
    dibujar();
  }
  function quitarFilas() {
    const filas = state.flash.filas; state.flash = null;
    const sils = new Set(filas.flatMap(r => state.grid[r].map(c => c && c.sil).filter(Boolean)));
    state.grid = state.grid.filter((_, r) => !filas.includes(r));
    while (state.grid.length < T().rows) state.grid.unshift(Array(T().cols).fill(null));
    state.filas += filas.length; state.filasNivel += filas.length; $('#filas').textContent = state.filas;
    const m = state.meta;
    if (m) {
      let avance = 0;
      while (m.i < m.partes.length && sils.has(m.partes[m.i])) { m.i++; avance++; }
      if (avance) {
        J.efecto('acierto'); message(m.partes[m.i - 1], 1);
        if (m.i >= m.partes.length) return palabraLista();
        J.say(m.partes[m.i - 1]); pintarBarra();
      } else message(J.pick(['¡Fila!', '¡Bien!']), .8);
    } else {
      message(filas.length > 1 ? '¡' + filas.length + ' filas!' : '¡Fila!', .9); pintarBarra();
      if (state.filasNivel >= 6) return nivelListo();
    }
    sacarPieza(); dibujar();
  }
  function palabraLista() {
    const m = state.meta; pintarBarra();
    state.hechasNivel++; state.jugando = false;
    J.cheer(); J.festejo && J.festejo(5); J.addStar(); updatePlayer();
    message(state.modo === 'letras' ? '¡a e i o u!' : '¡' + m.palabra + '!', 1.8);
    J.say(state.modo === 'letras' ? ['a, e, i, o, u', J.pick(J.PRAISES)] : [m.palabra, J.pick(J.PRAISES)]);
    setTimeout(() => {
      if (state.hechasNivel >= (state.modo === 'letras' ? 1 : 2)) return nivelListo();
      state.jugando = true; nuevaMeta(); sacarPieza(); dibujar();
    }, 2000);
  }
  function nivelListo() {
    state.jugando = false;
    J.efecto('festejo'); J.confetti(90);
    if (state.modo === 'clasico') { J.addStar(); updatePlayer(); }
    P.level.bloques = Math.max(P.level.bloques || 0, state.nivel + 1); J.save();
    setTimeout(() => J.gift(() => { state.nivel = Math.min(state.nivel + 1, NIVELES - 1); empezarNivel(); }), 900);
  }

  // ---------- dibujo ----------
  function bloque(g, x, y, s, color, sil, alfa = 1) {
    g.globalAlpha = alfa;
    g.fillStyle = color; g.beginPath(); g.roundRect(x + 1, y + 1, s - 2, s - 2, s * .18); g.fill();
    // luz arriba a la izquierda y sombra abajo a la derecha: parecen bloques con volumen
    g.fillStyle = 'rgba(255,255,255,.38)'; g.beginPath(); g.moveTo(x + 2, y + 2); g.lineTo(x + s - 2, y + 2); g.lineTo(x + s * .78, y + s * .22); g.lineTo(x + s * .22, y + s * .22); g.lineTo(x + s * .22, y + s * .78); g.lineTo(x + 2, y + s - 2); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.moveTo(x + s - 2, y + s - 2); g.lineTo(x + 2, y + s - 2); g.lineTo(x + s * .22, y + s * .78); g.lineTo(x + s * .78, y + s * .78); g.lineTo(x + s * .78, y + s * .22); g.lineTo(x + s - 2, y + 2); g.closePath(); g.fill();
    g.fillStyle = color; g.fillRect(x + s * .22, y + s * .22, s * .56, s * .56);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + s * .22, y + s * .22, s * .56, s * .2);
    if (sil) {
      g.font = `700 ${Math.round(s * (sil.length > 2 ? .36 : sil.length > 1 ? .46 : .58))}px Andika, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = Math.max(2, s * .09); g.strokeStyle = 'rgba(20,18,60,.75)'; g.strokeText(sil, x + s / 2, y + s / 2 + 1);
      g.fillStyle = '#fff'; g.fillText(sil, x + s / 2, y + s / 2 + 1);
    }
    g.globalAlpha = 1;
  }
  function dibujar() {
    const t = T(), s = celda;
    cx.clearRect(0, 0, t.cols * s, t.rows * s);
    cx.strokeStyle = 'rgba(255,255,255,.07)'; cx.lineWidth = 1;
    for (let c = 1; c < t.cols; c++) { cx.beginPath(); cx.moveTo(c * s + .5, 0); cx.lineTo(c * s + .5, t.rows * s); cx.stroke(); }
    for (let r = 1; r < t.rows; r++) { cx.beginPath(); cx.moveTo(0, r * s + .5); cx.lineTo(t.cols * s, r * s + .5); cx.stroke(); }
    const sig = state.meta && state.meta.partes[state.meta.i];
    state.grid.forEach((f, r) => f.forEach((c, k) => { if (c) bloque(cx, k * s, r * s, s, c.color, c.sil, state.flash && state.flash.filas.includes(r) ? .45 + Math.abs(Math.sin(state.flash.t * 30)) * .55 : 1); }));
    const p = state.pieza;
    if (p) {
      // sombra de dónde va a caer
      let dy = 0; while (!choca(p, 0, dy + 1)) dy++;
      cx.strokeStyle = 'rgba(255,255,255,.7)'; cx.lineWidth = 2; cx.setLineDash([5, 4]);
      p.cells.forEach(([x, y]) => { cx.beginPath(); cx.roundRect((p.x + x) * s + 3, (p.y + y + dy) * s + 3, s - 6, s - 6, s * .16); cx.stroke(); });
      cx.setLineDash([]);
      p.cells.forEach(([x, y]) => bloque(cx, (p.x + x) * s, (p.y + y) * s, s, p.color, p.sil));
      // brillito si la pieza trae la sílaba que falta
      if (sig && p.sil === sig) { cx.strokeStyle = '#fff'; cx.lineWidth = 2.5; p.cells.forEach(([x, y]) => { cx.beginPath(); cx.roundRect((p.x + x) * s + 1.5, (p.y + y) * s + 1.5, s - 3, s - 3, s * .18); cx.stroke(); }); }
    }
  }
  function dibujarSigue() {
    sx.clearRect(0, 0, 64, 48); const p = state.sigue; if (!p) return;
    const w = Math.max(...p.cells.map(c => c[0])) + 1, h = Math.max(...p.cells.map(c => c[1])) + 1, s = Math.min(14, 60 / w, 44 / h);
    p.cells.forEach(([x, y]) => bloque(sx, (64 - w * s) / 2 + x * s, (48 - h * s) / 2 + y * s, s, p.color, ''));
  }

  // ---------- bucle ----------
  const activo = () => state.jugando && !window.JUEGO_PAUSADO;
  const ritmo = () => Math.max(170, T().base - state.nivel * T().paso) / 1000;
  let antes = performance.now();
  function cuadro(ahora) {
    const dt = Math.min(.1, (ahora - antes) / 1000); antes = ahora;
    if (state.flash) { state.flash.t -= dt; dibujar(); if (state.flash.t <= 0) quitarFilas(); }
    else if (activo() && state.pieza) { state.caeT += dt; if (state.caeT >= ritmo()) bajar(); }
    requestAnimationFrame(cuadro);
  }

  // ---------- controles ----------
  addEventListener('keydown', e => {
    if (!activo()) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') mover(-1); else if (k === 'arrowright' || k === 'd') mover(1);
    else if (k === 'arrowup' || k === 'w') rotar(); else if (k === 'arrowdown' || k === 's') bajar();
    else if (k === ' ') caer(); else return;
    e.preventDefault();
  });
  $('#mandos').addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-m]'); if (!b) return; e.preventDefault(); J.audio();
    ({ izq: () => mover(-1), der: () => mover(1), gira: rotar, baja: () => bajar(), cae: caer })[b.dataset.m]();
  });
  // en el tablero: arrastrar mueve la pieza con el dedo, un toque la gira y un deslizón rápido hacia abajo la suelta
  let dedo = null;
  cv.addEventListener('pointerdown', e => { dedo = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now(), movio: false }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => {
    if (!dedo) return;
    while (e.clientX - dedo.x > celda * .8) { mover(1); dedo.x += celda * .8; dedo.movio = true; }
    while (dedo.x - e.clientX > celda * .8) { mover(-1); dedo.x -= celda * .8; dedo.movio = true; }
    while (e.clientY - dedo.y > celda) { bajar(); dedo.y += celda; dedo.movio = true; }
  });
  cv.addEventListener('pointerup', e => {
    if (!dedo) return;
    const dt = performance.now() - dedo.t, dy = e.clientY - dedo.y0, dx = Math.abs(e.clientX - dedo.x0);
    if (dy > celda * 3 && dt < 280 && dx < celda * 2) caer(); else if (!dedo.movio && dt < 400) rotar();
    dedo = null;
  });
  cv.addEventListener('pointercancel', () => { dedo = null; });

  // ---------- inicio ----------
  function updatePlayer() { const p = J.player(); $('#jugador').innerHTML = `${J.CHARS[p.char]?.emoji || '⭐'} ${J.esc(p.name)} · ⭐ ${p.stars}`; }
  function message(text, secs = 1.2) {
    const el = $('#mensaje'); el.textContent = text;
    el.classList.remove('ver'); void el.offsetWidth; el.classList.add('ver');
    clearTimeout(message.t); message.t = setTimeout(() => el.classList.remove('ver'), secs * 1000);
  }
  function empezarNivel() {
    const t = T();
    state.grid = Array.from({ length: t.rows }, () => Array(t.cols).fill(null));
    state.filasNivel = 0; state.hechasNivel = 0; state.pieza = null; state.sigue = null; state.flash = null;
    $('#nivel-num').textContent = state.nivel + 1;
    medir(); nuevaMeta(); state.jugando = true; sacarPieza(); dibujar();
    if (state.modo === 'clasico') J.say('¡Llena las filas!');
  }
  function start(nivel, modo = state.modo, tam = state.tam) {
    $('#portada').hidden = true; J.audio(); J.startMusic();
    Object.assign(state, { nivel, modo, tam, filas: 0, usadas: [] }); $('#filas').textContent = '0';
    try { localStorage.setItem('bl-bloques', JSON.stringify({ modo, tam })); } catch (e) {}
    empezarNivel();
  }
  (async () => {
    await J.ready;
    PALABRAS = J.palabras('tren'); if (PALABRAS.length < 4) PALABRAS = J.WORDS;
    try { const g = JSON.parse(localStorage.getItem('bl-bloques') || '{}'); if (TAM[g.tam]) state.tam = g.tam; if (['silabas', 'letras', 'clasico'].includes(g.modo)) state.modo = g.modo; } catch (e) {}
    updatePlayer(); J.refreshMusic();
    state.grid = Array.from({ length: T().rows }, () => Array(T().cols).fill(null));
    medir(); pintarBarra(); requestAnimationFrame(cuadro);
    const unlocked = Math.min(NIVELES, (P.level.bloques || 0) + 1);
    let sel = unlocked - 1;
    const box = $('#niveles'), DESC = { silabas: 'Arma palabras con sílabas', letras: 'Junta las vocales a e i o u', clasico: 'Solo bloques: llena 6 filas' };
    const pintar = () => {
      box.innerHTML = Array.from({ length: NIVELES }, (_, i) => `<button data-i="${i}" ${i >= unlocked ? 'disabled aria-label="Nivel bloqueado"' : ''} class="${i === sel ? 'on' : ''}">${i < unlocked ? i + 1 : '🔒'}</button>`).join('');
      [...$('#modos').children].forEach(b => b.classList.toggle('on', b.dataset.modo === state.modo));
      [...$('#tamanos').children].forEach(b => b.classList.toggle('on', b.dataset.tam === state.tam));
      $('#nivel-desc').textContent = `${DESC[state.modo]} · ${T().nombre}`;
    };
    pintar();
    box.onclick = e => { const b = e.target.closest('[data-i]'); if (!b || b.disabled) return; sel = +b.dataset.i; J.sfx('pop'); pintar(); };
    $('#modos').onclick = e => { const b = e.target.closest('[data-modo]'); if (!b) return; state.modo = b.dataset.modo; J.sfx('pop'); pintar(); };
    $('#tamanos').onclick = e => { const b = e.target.closest('[data-tam]'); if (!b) return; state.tam = b.dataset.tam; J.sfx('pop'); pintar(); medir(); };
    const go = $('#empezar'); go.disabled = false; go.textContent = '▶ ¡A jugar!';
    go.onclick = () => start(sel);
    if (PRUEBA) {
      // llenarFila(sil): llena la fila de abajo con esa sílaba y la limpia (para pruebas automáticas)
      const llenarFila = sil => { state.grid[T().rows - 1] = Array.from({ length: T().cols }, () => ({ color: '#ff7eb6', sil: sil || '' })); state.flash = { filas: [T().rows - 1], t: .01 }; };
      window.__bq = { state, start, mover, rotar, bajar, caer, llenarFila, T };
      start(0, 'silabas', 'peque');
    }
  })();
})();
