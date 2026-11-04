// Sol y Luna: juego de plataformas para dos en la misma pantalla (diseño original).
// Sol (niña sol) junta soles y no puede tocar el agua fría; Luna (niña luna) junta lunas y no puede tocar la miel caliente;
// el charco morado no le gusta a ninguna. Lleguen juntas a sus puertas. Modo educativo: juntan las sílabas de una palabra.
(() => {
const J = window.Juego, P = J.progress;
const $ = s => document.querySelector(s);
const TEST = location.hash === '#prueba';
const NIVELES = [
{
"nombre": "¡Hola, Sol y Luna!",
"filas": [
"                      ",
"                      ",
"                      ",
"                      ",
"                      ",
"                      ",
"                      ",
"                      ",
"                      ",
"             A  B     ",
"    o  c    -------   ",
"S L       o  c        "
],
"piso": "######################",
"dy": -3,
"par": 40
},
{
"nombre": "Miel y agua",
"filas": [
"                      ",
"                      ",
"                      ",
"                      ",
"                      ",
"                      ",
"                      ",
"                      ",
"                      ",
"                A  B  ",
"   o   c       ------ ",
"S L      o      c     "
],
"piso": "#####HHH###WWW########",
"dy": -3,
"par": 45
},
{
"nombre": "Subimos por las tablas",
"filas": [
"                      ",
"                      ",
"                      ",
"                      ",
"                      ",
"                A  B  ",
"              ------- ",
"                      ",
"        -----  o c    ",
"                      ",
"  ------  o  c        ",
"S L    C              "
],
"piso": "######################",
"dy": -3,
"par": 50
},
{
"nombre": "La cajita ayuda",
"filas": [
"                      ",
"                      ",
"                      ",
"                      ",
"                      ",
"                      ",
"                      ",
"              o A c B ",
"             #########",
"             #########",
"    o  c     #########",
"S L    K     #########"
],
"piso": "######################",
"dy": -3,
"par": 50
},
{
"nombre": "El botón ascensor",
"filas": [
"                      ",
"                      ",
"                      ",
"                      ",
"                      ",
"                      ",
"                 oAcB ",
"                 #####",
"                 #####",
"                 #####",
"   o c           #####",
"S L  K   P    MMM#####"
],
"piso": "######################",
"dy": -4,
"par": 60
},
{
"nombre": "La palanca mágica",
"filas": [
"                #     ",
"                #     ",
"                #     ",
"                #     ",
"                #     ",
"                #     ",
"                #     ",
"                #     ",
"                N     ",
"                N     ",
"  o   c         N     ",
"S L  o  c    V  N  A B"
],
"piso": "######################",
"dy": -3,
"par": 55
},
{
"nombre": "Charco morado",
"filas": [
"                      ",
"                      ",
"                      ",
"                      ",
"                      ",
"                      ",
"                      ",
"                      ",
"                      ",
"                 A  B ",
"     o    c     ------",
"S L           o  c    "
],
"piso": "####GGG###HHH###WWW###",
"dy": -3,
"par": 60
},
{
"nombre": "Dos ascensores",
"filas": [
"                      ",
"                      ",
"                      ",
"                      ",
"         o  c         ",
"         A  B         ",
"        ######        ",
"                      ",
"                      ",
"                      ",
" o c                  ",
"S L PMMM  K   MMM  P  "
],
"piso": "######################",
"dy": -5,
"par": 75
},
{
"nombre": "Puentecitos",
"filas": [
"                      ",
"                      ",
"                      ",
"                      ",
"                 A  B ",
"                ------",
"                      ",
"         -o c-        ",
"                      ",
"  -o c-               ",
"                      ",
"S L         C         "
],
"piso": "######HHH##WWW######GG",
"dy": -3,
"par": 70
},
{
"nombre": "La reja y la caja",
"filas": [
"               #      ",
"               #      ",
"               #      ",
"               #      ",
"               #      ",
"               #      ",
"               #      ",
"               #      ",
"               N      ",
"               N      ",
"  o c          N      ",
"S L   K   P  c N o A B"
],
"piso": "#######GG#############",
"dy": -3,
"par": 75
},
{
"nombre": "Hasta las nubes",
"filas": [
"                      ",
"                A  B  ",
"               ------ ",
"                      ",
"          -oc-        ",
"                      ",
"    -o--              ",
"                      ",
"          -c--        ",
"              C       ",
"    ----              ",
"S L                   "
],
"piso": "########WWW####HHH####",
"dy": -3,
"par": 90
},
{
"nombre": "El gran final",
"filas": [
"                  #   ",
"                  #   ",
"                  #   ",
"                  #   ",
"                  #   ",
"                  #   ",
"          -o c-   #   ",
"                  N   ",
"   -oc-           N   ",
"                  N   ",
"                  N   ",
"S L   K V   C     NA B"
],
"piso": "#####GG###HHH##WWW####",
"dy": -3,
"par": 100
}
];
// leyenda: # bloque · - tabla (se atraviesa desde abajo) · S/L salida de Sol y Luna · o sol · c luna · A/B puertas
// K caja · P botón · V palanca · C bandera (punto de regreso) · M ascensor (sube con botones o palanca) · N reja (se abre)
// piso: H miel caliente (Luna no) · W agua fría (Sol no) · G charco morado (ninguna)
const COLS = 24, FILAS = 14;
const GRAV = 32, VEL = 6.2, SALTO = 14.3, COYOTE = .11, BUFFER = .13;
const cv = $('#lienzo'), cx = cv.getContext('2d');
let T = 32, OX = 0, OY = 0;
function medir() {
  const dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const arriba = 56, abajo = matchMedia('(hover: none), (pointer: coarse)').matches ? 92 : 8;
  T = Math.max(10, Math.min((innerWidth - 8) / COLS, (innerHeight - arriba - abajo) / FILAS));
  OX = (innerWidth - T * COLS) / 2; OY = arriba + (innerHeight - arriba - abajo - T * FILAS) / 2;
}
addEventListener('resize', medir); medir();

// ---------- estado ----------
const E = { nivel: 0, modo: 'normal', mapa: [], piso: '', jug: [], gotas: [], cajas: [], plats: [], botones: [], palancas: [], banderas: [], puertas: {}, activo: false,
  t: 0, jugando: false, pausa: false, fin: false, palabra: null, sils: [], paso: 0, abiertas: false, humo: [], msgT: 0 };
const nombre = i => i === 0 ? 'Sol' : 'Luna';
function construir(i) {
  const lv = NIVELES[i];
  const filas = ['#'.repeat(COLS), ...lv.filas.map(f => '#' + f + '#'), '#' + lv.piso + '#'];
  Object.assign(E, { nivel: i, mapa: [], piso: filas[FILAS - 1], gotas: [], cajas: [], plats: [], botones: [], palancas: [], banderas: [], puertas: {}, activo: false, t: 0, fin: false, paso: 0, humo: [] });
  const spawn = {}, visto = new Set();
  for (let y = 0; y < FILAS; y++) {
    E.mapa[y] = [];
    for (let x = 0; x < COLS; x++) {
      const ch = filas[y][x];
      E.mapa[y][x] = ch === '#' ? '#' : ch === '-' ? '-' : 'HWG'.includes(ch) ? ch : ' ';
      if (ch === 'S' || ch === 'L') spawn[ch] = { x: x + .15, y: y + 1 - .92 };
      if (ch === 'o' || ch === 'c') E.gotas.push({ x, y, de: ch === 'o' ? 0 : 1, vivo: true, vuelve: 0, sil: '' });
      if (ch === 'A' || ch === 'B') E.puertas[ch] = { x, y };
      if (ch === 'K') E.cajas.push({ x, y, w: 1, h: 1, vx: 0, vy: 0, suelo: false });
      if (ch === 'P') E.botones.push({ x, y, on: false });
      if (ch === 'V') E.palancas.push({ x, y, on: false, dentro: [false, false] });
      if (ch === 'C') E.banderas.push({ x, y, toc: [false, false] });
      if ((ch === 'M' || ch === 'N') && !visto.has(x + ',' + y)) {
        // un ascensor es un grupo horizontal de M; una reja es un grupo vertical de N
        let w = 1, h = 1;
        if (ch === 'M') { while (filas[y][x + w] === 'M') { visto.add(x + w + ',' + y); w++; } }
        else { while (filas[y + h] && filas[y + h][x] === 'N') { visto.add(x + ',' + (y + h)); h++; } }
        visto.add(x + ',' + y);
        const p = ch === 'M' ? { x, y: y + .6, w, h: .4, ax: 0, ay: lv.dy - .6, tipo: 'ascensor' } : { x: x + .15, y, w: .7, h, ax: 0, ay: -h - .2, tipo: 'reja' };
        p.x0 = p.x; p.y0 = p.y; p.k = 0; p.dx = 0; p.dy = 0; E.plats.push(p);
      }
    }
  }
  E.jug = [0, 1].map(k => { const s = spawn[k ? 'L' : 'S']; return { k, x: s.x, y: s.y, w: .7, h: .92, vx: 0, vy: 0, suelo: false, sobre: null, coyote: 0, buffer: 0, cara: 1, sx: s.x, sy: s.y, muerto: 0, enPuerta: false, paso: 0, junto: 0 }; });
  // modo educativo: una palabra; las sílabas pares son de Sol y las impares de Luna
  E.palabra = null; E.sils = []; E.abiertas = E.modo !== 'edu';
  if (E.modo === 'edu') {
    const lista = J.palabras('tren').filter(w => w[2]);
    const largo = i < 6 ? 2 : 3;
    let pool = lista.filter(w => w[1].split('-').length === largo); if (!pool.length) pool = lista.filter(w => w[1].split('-').length >= 2);
    const usadas = E.usadas || (E.usadas = []);
    const w = J.pick(pool.filter(x => !usadas.includes(x[0])).length ? pool.filter(x => !usadas.includes(x[0])) : pool);
    usadas.push(w[0]); E.palabra = w; E.sils = w[1].split('-').map(s => s.toLowerCase());
    const otras = [...new Set(lista.flatMap(x => x[1].split('-').map(s => s.toLowerCase())))].filter(s => !E.sils.includes(s));
    for (const de of [0, 1]) {
      const mias = E.gotas.filter(g => g.de === de), buenas = E.sils.filter((_, j) => j % 2 === de);
      const etiquetas = J.shuffle([...buenas, ...J.shuffle(otras).slice(0, Math.max(0, mias.length - buenas.length))]);
      mias.forEach((g, j) => { g.sil = etiquetas[j] || J.pick(otras); });
      // si faltan gotas para las sílabas, se agregan junto a la salida
      for (let j = mias.length; j < buenas.length; j++) E.gotas.push({ x: E.jug[de].sx + 1 + j, y: E.jug[de].sy - .4, de, vivo: true, vuelve: 0, sil: buenas[j] });
    }
  }
  pintarPalabra();
  $('#nivel-num').textContent = i + 1;
}
// ---------- colisiones ----------
const solidoTile = (x, y) => { const c = E.mapa[y] && E.mapa[y][x]; return c === '#' ? 1 : 'HWG'.includes(c) && c ? 2 : c === '-' ? 3 : 0; };
function rectsSolidos(b, excluir) {
  const out = [], x0 = Math.floor(b.x) - 1, x1 = Math.floor(b.x + b.w) + 1, y0 = Math.floor(b.y) - 1, y1 = Math.floor(b.y + b.h) + 1;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const s = solidoTile(x, y);
    if (s === 1) out.push({ x, y, w: 1, h: 1 });
    else if (s === 2) out.push({ x, y: y + .35, w: 1, h: .65, charco: E.mapa[y][x] });   // charco: se pisa un poquito más abajo
    else if (s === 3) out.push({ x, y, w: 1, h: .25, tabla: true });
  }
  for (const p of E.plats) out.push(p);
  for (const c of E.cajas) if (c !== excluir) out.push(c);
  return out;
}
const choca = (a, b) => a.x < b.x + b.w - 1e-4 && a.x + a.w > b.x + 1e-4 && a.y < b.y + b.h - 1e-4 && a.y + a.h > b.y + 1e-4;
function mover(b, dt, esCaja) {
  // lo que lleva el piso donde está parada (ascensor o caja)
  if (b.sobre && (b.sobre.dx || b.sobre.dy)) { b.x += b.sobre.dx; b.y += b.sobre.dy; }
  const fondoAntes = b.y + b.h;
  // horizontal
  b.x += b.vx * dt;
  for (const r of rectsSolidos(b, esCaja ? b : null)) {
    if (r.tabla || !choca(b, r)) continue;
    // escalón chiquito (charco, ascensor quieto): se sube solo
    if (b.y + b.h - r.y < .42 && b.suelo) { b.y = r.y - b.h; continue; }
    if (!esCaja && E.cajas.includes(r)) {
      // empujar la caja
      const antes = r.x; r.x += b.vx > 0 ? (b.x + b.w) - r.x : -(r.x + r.w - b.x);
      let bloqueada = false;
      for (const s of rectsSolidos(r, r)) if (!s.tabla && choca(r, s) && !(r.y + r.h - s.y < .42)) { bloqueada = true; break; }
      if (!bloqueada) { b.empuja = .2; continue; }
      r.x = antes;
    }
    if (b.vx > 0) b.x = r.x - b.w; else if (b.vx < 0) b.x = r.x + r.w;
    b.vx = 0;
  }
  // vertical
  b.vy = Math.min(b.vy + GRAV * dt, 22);
  b.y += b.vy * dt;
  b.suelo = false; b.sobre = null; b.charco = null;
  for (const r of rectsSolidos(b, esCaja ? b : null)) {
    if (!choca(b, r)) continue;
    if (r.tabla && (b.vy < 0 || fondoAntes > r.y + .06)) continue;
    if (b.vy >= 0 && fondoAntes <= r.y + .45) { b.y = r.y - b.h; b.vy = 0; b.suelo = true; b.sobre = r.dx !== undefined || E.cajas.includes(r) ? r : null; if (r.charco) b.charco = r.charco; }
    else if (b.vy < 0) { b.y = r.y + r.h; b.vy = 0; }
  }
}
// ---------- controles ----------
const teclas = {}, pad = [{}, {}];
addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); if (['arrowup', 'arrowleft', 'arrowright', 'arrowdown', ' '].includes(k)) e.preventDefault();
  if (!teclas[k]) { if (k === 'arrowup') E.jug[0] && (E.jug[0].buffer = BUFFER); if (k === 'w' || k === 't') E.jug[1] && (E.jug[1].buffer = BUFFER); }
  teclas[k] = true;
  if (k === 'p' || k === 'escape') pausar();
});
addEventListener('keyup', e => { teclas[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in teclas) teclas[k] = false; pad.forEach(p => { p.izq = p.der = false; }); });
document.querySelectorAll('.pad button').forEach(b => {
  const j = +b.dataset.j, q = b.dataset.b;
  const on = e => { e.preventDefault(); b.classList.add('on'); if (q === 'salto') { if (E.jug[j]) E.jug[j].buffer = BUFFER; } else pad[j][q] = true; J.audio(); };
  const off = e => { e.preventDefault(); b.classList.remove('on'); pad[j][q] = false; };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
});
const entrada = j => j === 0
  ? { izq: teclas.arrowleft || pad[0].izq, der: teclas.arrowright || pad[0].der, salto: teclas.arrowup || false }
  : { izq: teclas.a || teclas.f || pad[1].izq, der: teclas.d || teclas.h || pad[1].der, salto: teclas.w || teclas.t || false };

// ---------- juego ----------
function mensaje(t, s = 1.4) { const el = $('#mensaje'); el.textContent = t; el.classList.remove('ver'); void el.offsetWidth; el.classList.add('ver'); clearTimeout(mensaje.t); mensaje.t = setTimeout(() => el.classList.remove('ver'), s * 1000); }
function puff(x, y, color) { for (let i = 0; i < 18; i++) E.humo.push({ x, y, vx: (Math.random() - .5) * 5, vy: -Math.random() * 4, v: 1, c: color }); }
function morir(p, por) {
  if (p.muerto > 0) return;
  p.muerto = .8; puff(p.x + p.w / 2, p.y + p.h / 2, por === 'H' ? '#ffb347' : por === 'W' ? '#7fd3ff' : '#b06ee0');
  J.efecto('pop'); mensaje(p.k === 0 ? (por === 'W' ? '¡Brrr, agua fría!' : '¡Uy!') : (por === 'H' ? '¡Ay, qué caliente!' : '¡Uy!'), 1.2);
}
function revivir(p) {
  const b = [...E.banderas].reverse().find(f => f.toc[p.k]);
  p.x = b ? b.x + .15 : p.sx; p.y = b ? b.y + 1 - p.h - .02 : p.sy; p.vx = p.vy = 0; p.muerto = 0; p.sobre = null;
}
function pintarPalabra() {
  const el = $('#palabra');
  if (E.modo !== 'edu' || !E.palabra) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `<span class="emo">${E.palabra[2] || '🔊'}</span>${E.sils.map((s, j) => `<span class="slot ${j % 2 ? 'luna' : 'sol'} ${j < E.paso ? 'ok' : ''}">${j < E.paso ? J.esc(s) : (j % 2 ? '🌙' : '☀️')}</span>`).join('')}<button id="p-oir" aria-label="Escuchar la palabra">🔊</button>`;
  $('#p-oir').onclick = () => J.say(['Junten las sílabas de', E.palabra[0]]);
}
function recoger(g, p) {
  if (E.modo !== 'edu') { g.vivo = false; J.sfx('coin', .7, p.k ? 1.2 : 1); puff(g.x + .5, g.y + .5, p.k ? '#9fb6ff' : '#ffd23f'); return; }
  const toca = E.sils[E.paso], deQuien = E.paso % 2;
  if (g.sil === toca && p.k === deQuien) {
    g.vivo = false; E.paso++; J.sfx('coin', .7, 1 + E.paso * .1); J.say(g.sil); pintarPalabra();
    if (E.paso >= E.sils.length) { E.abiertas = true; J.efecto('abrir'); J.festejo(); setTimeout(() => J.say([E.palabra[0], '¡Las puertas se abrieron!']), 500); }
  } else {
    // no era la que toca: se va y vuelve en un ratito
    g.vivo = false; g.vuelve = 1.5; J.efecto('error'); mensaje('¡Casi! ' + (p.k === deQuien ? '' : (deQuien ? 'Ahora le toca a Luna 🌙' : 'Ahora le toca a Sol ☀️')), 1.6);
    J.say(['¡Casi!', toca]);
  }
}
function paso(dt) {
  if (!E.jugando || E.pausa || E.fin) return;
  E.t += dt;
  // interruptores: botones (con alguien o una caja encima) y palancas
  for (const b of E.botones) {
    const r = { x: b.x + .1, y: b.y + .75, w: .8, h: .3 };
    b.on = [...E.jug.filter(p => !p.muerto), ...E.cajas].some(o => choca(o, r));
  }
  const activo = E.botones.some(b => b.on) || E.palancas.some(v => v.on);
  if (activo !== E.activo) { E.activo = activo; J.efecto(activo ? 'abrir' : 'pop'); }
  for (const p of E.plats) {
    const k = Math.max(0, Math.min(1, p.k + (activo ? 1 : -1) * dt * 3 / Math.max(1, Math.abs(p.ay))));
    const nx = p.x0 + p.ax * k, ny = p.y0 + p.ay * k;
    p.dx = nx - p.x; p.dy = ny - p.y; p.x = nx; p.y = ny; p.k = k;
  }
  for (const c of E.cajas) { c.vx *= .6; mover(c, dt, true); c.vx = 0; }
  for (const p of E.jug) {
    if (p.muerto > 0) { p.muerto -= dt; if (p.muerto <= 0) revivir(p); continue; }
    const en = entrada(p.k);
    const quiere = (en.der ? 1 : 0) - (en.izq ? 1 : 0);
    p.vx += (quiere * VEL - p.vx) * Math.min(1, dt * (p.suelo ? 18 : 9));
    if (quiere) p.cara = quiere;
    p.coyote = p.suelo ? COYOTE : p.coyote - dt; p.buffer -= dt;
    if (p.buffer > 0 && p.coyote > 0) { p.vy = -SALTO; p.buffer = 0; p.coyote = 0; p.suelo = false; p.sobre = null; J.efecto('salto'); }
    if (!en.salto && p.vy < -4) p.vy += GRAV * dt * 1.2;   // salto cortito si suelta la tecla
    mover(p, dt, false);
    p.paso += Math.abs(p.vx) * dt;
    // charcos
    const charco = p.charco;
    if (charco === 'G' || (charco === 'H' && p.k === 1) || (charco === 'W' && p.k === 0)) morir(p, charco);
    if (p.y > FILAS + 2) morir(p, 'G');
    // gotas
    for (const g of E.gotas) if (g.vivo && g.de === p.k && choca(p, { x: g.x + .2, y: g.y + .2, w: .6, h: .6 })) recoger(g, p);
    // banderas
    for (const f of E.banderas) if (!f.toc[p.k] && choca(p, { x: f.x, y: f.y, w: 1, h: 1 })) { f.toc[p.k] = true; J.sfx('pop', .6, 1.4); mensaje('🚩 ¡Bandera!', 1); }
    // palancas: se mueven al pasar por ellas
    for (const v of E.palancas) {
      const dentro = choca(p, { x: v.x + .2, y: v.y + .3, w: .6, h: .7 });
      if (dentro && !v.dentro[p.k]) { v.on = !v.on; J.sfx('pop', .8, v.on ? 1.3 : .9); }
      v.dentro[p.k] = dentro;
    }
    // puertas
    const d = E.puertas[p.k ? 'B' : 'A'];
    p.enPuerta = E.abiertas && d && Math.abs(p.x + p.w / 2 - (d.x + .5)) < .45 && Math.abs(p.y + p.h - (d.y + 1)) < .35;
  }
  for (const g of E.gotas) if (!g.vivo && g.vuelve > 0) { g.vuelve -= dt; if (g.vuelve <= 0) g.vivo = true; }
  if (E.jug.every(p => p.enPuerta)) ganar();
  $('#reloj').textContent = Math.floor(E.t);
}
function ganar() {
  E.fin = true;
  const lv = NIVELES[E.nivel], todas = E.gotas.every(g => !g.vivo);
  const est = 1 + (todas ? 1 : 0) + (E.t <= lv.par ? 1 : 0);
  P.solunaEst = P.solunaEst || {}; P.solunaEst[E.nivel] = Math.max(P.solunaEst[E.nivel] || 0, est);
  P.level.soluna = Math.max(P.level.soluna || 0, E.nivel + 1); J.save();
  J.addStar(est); J.efecto('festejo'); J.confetti(110); J.festejo();
  J.say(['¡Lo lograron!', J.pick(J.PRAISES)]);
  const sigue = () => { $('#fin').hidden = true; empezar(Math.min(E.nivel + 1, NIVELES.length - 1)); };
  $('#fin-caja').innerHTML = `<h2>¡Lo lograron! 🌞🌙</h2><div class="estrellas">${'⭐'.repeat(est)}${'☆'.repeat(3 - est)}</div>
    <p>${todas ? 'Juntaron todo' : 'Quedaron soles o lunas por juntar'} · ${Math.floor(E.t)} segundos</p>
    <div class="fila"><button id="f-otra">↺ Otra vez</button>${E.nivel < NIVELES.length - 1 ? '<button class="si" id="f-sig">▶ Siguiente</button>' : ''}</div>`;
  setTimeout(() => {
    if ((E.nivel + 1) % 3 === 0) { J.gift(sigue); return; }
    $('#fin').hidden = false;
    $('#f-otra').onclick = () => { $('#fin').hidden = true; empezar(E.nivel); };
    const s = $('#f-sig'); if (s) s.onclick = () => { J.sfx('pop'); sigue(); };
  }, 900);
}
function empezar(i) {
  $('#portada').hidden = true; $('#fin').hidden = true;
  construir(i); E.jugando = true; E.pausa = false; $('#pausa').textContent = '⏸️';
  J.audio(); J.startMusic && J.startMusic();
  if (E.modo === 'edu') setTimeout(() => J.say(['Junten las sílabas de', E.palabra[0]]), 500);
  else if (i === 0) setTimeout(() => J.say('¡Lleguen juntas a sus puertas!'), 500);
}
function pausar() { if (!E.jugando || E.fin) return; E.pausa = !E.pausa; $('#pausa').textContent = E.pausa ? '▶️' : '⏸️'; mensaje(E.pausa ? '⏸️ Pausa' : '¡Seguimos!', 1); }
$('#pausa').onclick = pausar;
$('#otra').onclick = () => { if (E.jugando) { J.sfx('pop'); empezar(E.nivel); } };

// ---------- dibujo ----------
const R = (x, y, w, h, r) => { cx.beginPath(); cx.roundRect(OX + x * T, OY + y * T, w * T, h * T, r * T); };
const nubes = Array.from({ length: 5 }, (_, i) => ({ x: Math.random() * COLS, y: 1 + Math.random() * 4, s: .6 + Math.random() * .8, v: .15 + Math.random() * .2 }));
function fondo(t) {
  const g = cx.createLinearGradient(0, 0, 0, innerHeight);
  g.addColorStop(0, '#ffd9ec'); g.addColorStop(.55, '#d9ecff'); g.addColorStop(1, '#e8ffd9');
  cx.fillStyle = g; cx.fillRect(0, 0, innerWidth, innerHeight);
  // montañas andinas suaves y un sol con luna al fondo
  cx.globalAlpha = .55;
  cx.fillStyle = '#c9b6ef'; cx.beginPath(); cx.moveTo(OX, OY + T * 10);
  for (let i = 0; i <= 12; i++) cx.lineTo(OX + i * 2 * T, OY + T * (i % 2 ? 6.2 : 8.4));
  cx.lineTo(OX + COLS * T, OY + T * 10); cx.fill();
  cx.fillStyle = '#9fd9b8'; cx.beginPath(); cx.moveTo(OX, OY + T * 11);
  for (let i = 0; i <= 8; i++) cx.lineTo(OX + i * 3 * T, OY + T * (i % 2 ? 8.6 : 10));
  cx.lineTo(OX + COLS * T, OY + T * 11); cx.fill();
  cx.globalAlpha = 1;
  for (const n of nubes) {
    n.x += n.v * .016; if (n.x > COLS + 2) n.x = -3;
    cx.fillStyle = 'rgba(255,255,255,.85)';
    for (const [dx, dy, r] of [[0, 0, .7], [.7, -.2, .8], [1.4, 0, .6]]) { cx.beginPath(); cx.arc(OX + (n.x + dx * n.s) * T, OY + (n.y + dy * n.s) * T, r * n.s * T, 0, 7); cx.fill(); }
  }
}
function tiles(t) {
  for (let y = 0; y < FILAS; y++) for (let x = 0; x < COLS; x++) {
    const c = E.mapa[y][x];
    if (c === '#') {
      const borde = x === 0 || x === COLS - 1 || y === 0;
      cx.fillStyle = borde ? '#b98a6a' : '#c99a72'; R(x + .02, y + .02, .96, .96, .18); cx.fill();
      if (!borde && y > 0 && E.mapa[y - 1][x] !== '#') { cx.fillStyle = '#7fd36b'; R(x + .02, y + .02, .96, .28, .12); cx.fill(); cx.fillStyle = '#ff8fb8'; if ((x * 7 + y) % 5 === 0) { cx.beginPath(); cx.arc(OX + (x + .5) * T, OY + (y + .06) * T, T * .08, 0, 7); cx.fill(); } }
      else { cx.fillStyle = 'rgba(255,255,255,.12)'; R(x + .12, y + .12, .3, .2, .08); cx.fill(); }
    } else if (c === '-') {
      cx.fillStyle = '#e0a868'; R(x, y, 1, .25, .08); cx.fill(); cx.fillStyle = '#b97d44'; cx.fillRect(OX + (x + .45) * T, OY + (y + .05) * T, T * .1, T * .15);
    } else if ('HWG'.includes(c) && c) {
      cx.fillStyle = '#c99a72'; R(x, y + .55, 1, .45, .1); cx.fill();
      const col = c === 'H' ? ['#ffb347', '#ff8a3d'] : c === 'W' ? ['#9ee3ff', '#4fb2f0'] : ['#c48ef0', '#8a4fd0'];
      cx.fillStyle = col[1]; cx.fillRect(OX + x * T, OY + (y + .38) * T, T, T * .3);
      cx.fillStyle = col[0]; cx.beginPath(); cx.moveTo(OX + x * T, OY + (y + .42) * T);
      for (let i = 0; i <= 8; i++) cx.lineTo(OX + (x + i / 8) * T, OY + (y + .38 + Math.sin(t * 4 + (x + i / 8) * 5) * .04) * T);
      cx.lineTo(OX + (x + 1) * T, OY + (y + .5) * T); cx.lineTo(OX + x * T, OY + (y + .5) * T); cx.fill();
      if (c === 'G' && Math.random() < .02) puff(x + Math.random(), y + .4, '#d7a8ff');
    }
  }
}
function objetos(t) {
  // puertas
  for (const [k, d] of Object.entries(E.puertas)) {
    const sol = k === 'A';
    cx.fillStyle = sol ? '#ffcf5a' : '#9fb6ff'; R(d.x + .08, d.y - .9, .84, 1.9, .42); cx.fill();
    cx.fillStyle = E.abiertas ? (sol ? '#fff3c4' : '#e3e9ff') : '#7a6a8f'; R(d.x + .2, d.y - .75, .6, 1.75, .3); cx.fill();
    cx.font = `${T * .5}px serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText(E.abiertas ? (sol ? '☀️' : '🌙') : '🔒', OX + (d.x + .5) * T, OY + (d.y - .2) * T);
    if (E.abiertas) { cx.globalAlpha = .25 + Math.sin(t * 4) * .15; cx.fillStyle = '#fff'; R(d.x + .08, d.y - .9, .84, 1.9, .42); cx.fill(); cx.globalAlpha = 1; }
  }
  for (const f of E.banderas) {
    cx.fillStyle = '#8a6a50'; cx.fillRect(OX + (f.x + .45) * T, OY + (f.y + .1) * T, T * .08, T * .9);
    cx.fillStyle = f.toc[0] || f.toc[1] ? '#4cb87a' : '#ff7eb6';
    cx.beginPath(); cx.moveTo(OX + (f.x + .53) * T, OY + (f.y + .12) * T); cx.lineTo(OX + (f.x + .95 + Math.sin(t * 6) * .04) * T, OY + (f.y + .28) * T); cx.lineTo(OX + (f.x + .53) * T, OY + (f.y + .45) * T); cx.fill();
  }
  for (const b of E.botones) { cx.fillStyle = '#6b6f86'; R(b.x + .1, b.y + .85, .8, .15, .05); cx.fill(); cx.fillStyle = b.on ? '#4cb87a' : '#ff5d8f'; R(b.x + .2, b.y + (b.on ? .8 : .7), .6, b.on ? .08 : .18, .06); cx.fill(); }
  for (const v of E.palancas) {
    cx.fillStyle = '#6b6f86'; R(v.x + .25, v.y + .78, .5, .22, .06); cx.fill();
    cx.save(); cx.translate(OX + (v.x + .5) * T, OY + (v.y + .82) * T); cx.rotate(v.on ? .6 : -.6);
    cx.fillStyle = '#8a6a50'; cx.fillRect(-T * .04, -T * .6, T * .08, T * .6); cx.fillStyle = v.on ? '#4cb87a' : '#ffd23f'; cx.beginPath(); cx.arc(0, -T * .6, T * .12, 0, 7); cx.fill(); cx.restore();
  }
  for (const p of E.plats) {
    if (p.tipo === 'reja') { cx.fillStyle = 'rgba(154,110,224,.9)'; R(p.x, p.y, p.w, p.h, .12); cx.fill(); cx.fillStyle = '#e3d4ff'; for (let i = .3; i < p.h; i += .5) cx.fillRect(OX + p.x * T, OY + (p.y + i) * T, p.w * T, T * .08); }
    else { cx.fillStyle = '#9aa3c2'; R(p.x, p.y, p.w, p.h, .12); cx.fill(); cx.fillStyle = '#ffd23f'; for (let i = .15; i < p.w; i += .5) cx.fillRect(OX + (p.x + i) * T, OY + (p.y + .08) * T, T * .2, T * .1); }
  }
  for (const c of E.cajas) { cx.fillStyle = '#d99a5b'; R(c.x, c.y, 1, 1, .12); cx.fill(); cx.strokeStyle = '#a86d38'; cx.lineWidth = T * .07; cx.beginPath(); cx.moveTo(OX + (c.x + .15) * T, OY + (c.y + .15) * T); cx.lineTo(OX + (c.x + .85) * T, OY + (c.y + .85) * T); cx.moveTo(OX + (c.x + .85) * T, OY + (c.y + .15) * T); cx.lineTo(OX + (c.x + .15) * T, OY + (c.y + .85) * T); cx.stroke(); }
  for (const g of E.gotas) {
    if (!g.vivo) continue;
    const yy = g.y + .5 + Math.sin(t * 3 + g.x) * .08;
    cx.font = `${T * .62}px serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText(g.de ? '🌙' : '☀️', OX + (g.x + .5) * T, OY + yy * T);
    if (g.sil) {
      cx.font = `700 ${T * .42}px Andika, sans-serif`;
      const w = cx.measureText(g.sil).width + T * .3;
      cx.fillStyle = '#fff'; cx.beginPath(); cx.roundRect(OX + (g.x + .5) * T - w / 2, OY + (yy - .95) * T, w, T * .5, T * .2); cx.fill();
      cx.fillStyle = '#23324a'; cx.fillText(g.sil, OX + (g.x + .5) * T, OY + (yy - .7) * T);
    }
  }
}
// niñas originales: Sol (carita amarilla con rayitos y vestido naranja) y Luna (carita lila con una lunita en el pelo y vestido azul)
function nina(p, t) {
  if (p.muerto > 0) return;
  const sol = p.k === 0, cxp = OX + (p.x + p.w / 2) * T, base = OY + (p.y + p.h) * T;
  const andar = p.suelo && Math.abs(p.vx) > .5 ? Math.sin(p.paso * 9) : 0, brinco = Math.abs(andar) * T * .04;
  cx.save(); cx.translate(cxp, base - brinco); cx.scale(p.cara, 1);
  // piernitas
  cx.strokeStyle = '#5a4a6a'; cx.lineWidth = T * .09; cx.lineCap = 'round';
  cx.beginPath(); cx.moveTo(-T * .12, -T * .25); cx.lineTo(-T * .12 + andar * T * .1, -T * .02); cx.moveTo(T * .12, -T * .25); cx.lineTo(T * .12 - andar * T * .1, -T * .02); cx.stroke();
  // vestido
  cx.fillStyle = sol ? '#ff8a3d' : '#6b7cf0';
  cx.beginPath(); cx.moveTo(-T * .3, -T * .22); cx.lineTo(T * .3, -T * .22); cx.lineTo(T * .18, -T * .55); cx.lineTo(-T * .18, -T * .55); cx.closePath(); cx.fill();
  // cabeza
  const hy = -T * .78, hr = T * .3;
  if (sol) { cx.fillStyle = '#ffb347'; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + t * .8; cx.beginPath(); cx.moveTo(Math.cos(a) * hr * .9, hy + Math.sin(a) * hr * .9); cx.lineTo(Math.cos(a + .18) * hr * 1.45, hy + Math.sin(a + .18) * hr * 1.45); cx.lineTo(Math.cos(a + .36) * hr * .9, hy + Math.sin(a + .36) * hr * .9); cx.fill(); } }
  else { cx.fillStyle = '#4b4f9c'; cx.beginPath(); cx.arc(0, hy - hr * .1, hr * 1.18, Math.PI * .9, Math.PI * 2.1); cx.fill(); }
  cx.fillStyle = sol ? '#ffe066' : '#dfe4ff'; cx.beginPath(); cx.arc(0, hy, hr, 0, 7); cx.fill();
  if (!sol) { cx.fillStyle = '#ffd23f'; cx.beginPath(); cx.arc(hr * .55, hy - hr * .85, hr * .3, 0, 7); cx.fill(); cx.fillStyle = '#4b4f9c'; cx.beginPath(); cx.arc(hr * .68, hy - hr * .95, hr * .26, 0, 7); cx.fill(); }
  // carita
  const parpadeo = (t * 1.3 + p.k) % 3 < .1;
  cx.fillStyle = '#23324a';
  if (parpadeo) { cx.fillRect(T * .02, hy - T * .05, T * .1, T * .025); cx.fillRect(T * .17, hy - T * .05, T * .08, T * .025); }
  else { cx.beginPath(); cx.arc(T * .07, hy - T * .04, T * .045, 0, 7); cx.arc(T * .2, hy - T * .04, T * .04, 0, 7); cx.fill(); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(T * .085, hy - T * .055, T * .015, 0, 7); cx.fill(); }
  cx.fillStyle = 'rgba(255,120,150,.55)'; cx.beginPath(); cx.arc(-T * .04, hy + T * .07, T * .05, 0, 7); cx.arc(T * .25, hy + T * .07, T * .04, 0, 7); cx.fill();
  cx.strokeStyle = '#b2452c'; cx.lineWidth = T * .035; cx.beginPath(); cx.arc(T * .14, hy + T * .06, T * .07, .2, Math.PI - .2); cx.stroke();
  cx.restore();
  if (p.enPuerta) { cx.font = `${T * .45}px serif`; cx.textAlign = 'center'; cx.fillText('✨', cxp, base - T * 1.45); }
}
function particulas(dt) {
  for (let i = E.humo.length - 1; i >= 0; i--) {
    const h = E.humo[i]; h.x += h.vx * dt; h.y += h.vy * dt; h.vy += 3 * dt; h.v -= dt * 1.4;
    if (h.v <= 0) { E.humo.splice(i, 1); continue; }
    cx.globalAlpha = Math.max(0, h.v); cx.fillStyle = h.c; cx.beginPath(); cx.arc(OX + h.x * T, OY + h.y * T, T * .12 * (1.4 - h.v * .4), 0, 7); cx.fill();
  }
  cx.globalAlpha = 1;
}
let antes = performance.now();
function cuadro(ahora) {
  requestAnimationFrame(cuadro);
  const dt = Math.min(.033, (ahora - antes) / 1000); antes = ahora;
  try {
    // pasos cortitos para que las colisiones no fallen en aparatos lentos
    const n = Math.ceil(dt / .009); for (let i = 0; i < n; i++) paso(dt / n);
    const t = ahora / 1000;
    fondo(t);
    if (E.mapa.length) { tiles(t); objetos(t); E.jug.forEach(p => nina(p, t)); particulas(dt); }
    if (E.pausa) { cx.fillStyle = 'rgba(35,50,74,.35)'; cx.fillRect(0, 0, innerWidth, innerHeight); }
  } catch (e) { if (!cuadro.err) { cuadro.err = 1; console.error('Error en Sol y Luna (sigue funcionando):', e); } }
}

// ---------- portada ----------
(async () => {
  await J.ready;
  const abiertos = () => Math.min(NIVELES.length, (P.level.soluna || 0) + 1);
  let sel = abiertos() - 1;
  const est = P.solunaEst || {};
  const box = $('#niveles');
  const pintar = () => {
    box.innerHTML = NIVELES.map((n, i) => `<button data-i="${i}" title="${n.nombre}" ${i >= abiertos() ? 'disabled aria-label="Nivel bloqueado"' : ''} class="${i === sel ? 'on' : ''}">${i < abiertos() ? i + 1 : '🔒'}</button>`).join('');
    $('#nivel-desc').textContent = NIVELES[sel].nombre + (est[sel] ? ' · ' + '⭐'.repeat(est[sel]) : '');
  };
  pintar();
  box.onclick = e => { const b = e.target.closest('[data-i]'); if (!b || b.disabled) return; sel = +b.dataset.i; J.sfx('pop'); pintar(); };
  $('#modos').onclick = e => { const b = e.target.closest('[data-modo]'); if (!b) return; E.modo = b.dataset.modo; [...$('#modos').children].forEach(x => x.classList.toggle('on', x === b)); J.sfx('pop'); };
  const go = $('#empezar'); go.disabled = false; go.textContent = '▶ ¡A jugar las dos!';
  go.onclick = () => empezar(sel);
  construir(sel); requestAnimationFrame(cuadro);
  if (TEST) {
    window.__sl = { E, NIVELES, empezar, construir, ganar,
      mover: (k, x, y) => { const p = E.jug[k]; p.x = x; p.y = y; p.vx = p.vy = 0; },
      aPuertas: () => { E.abiertas = true; for (const [k, d] of [[0, E.puertas.A], [1, E.puertas.B]]) { const p = E.jug[k]; p.x = d.x + .5 - p.w / 2; p.y = d.y + 1 - p.h - .01; p.vx = p.vy = 0; } },
      juntarTodo: () => { E.gotas.forEach(g => { g.vivo = false; }); if (E.modo === 'edu') { E.paso = E.sils.length; E.abiertas = true; pintarPalabra(); } } };
    empezar(0);
  }
})();
})();
