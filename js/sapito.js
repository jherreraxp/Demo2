// El Camino del Sapito: la niña arma un programa con flechas y el sapito lo sigue paso a paso
// por los nenúfares. Si se cae al agua hace un gesto gracioso; si llega a la flor, ¡fiesta!
import * as THREE from 'three';
import { crearMundo, chispitas } from './mundo3d.js';
import { crearPersonaje, PERSONAJES, nombrePersonaje } from './personajes.js';

const J = window.Juego, P = J.progress;
const $ = s => document.querySelector(s);
const TEST = location.hash === '#prueba';

// ---------- niveles ----------
// S = salida, M = meta (la flor), o = nenúfar, R = piedra, . = agua
// max: cuántos bloques caben (obliga a usar 🔁); bloques: qué botones se ven
const NIVELES = [
  { mapa: ['SoM'], nombre: 'Dos saltitos', bloques: 'flechas' },
  { mapa: ['M', 'o', 'S'], nombre: 'Hacia arriba', bloques: 'flechas' },
  { mapa: ['..M', '..o', 'Soo'], nombre: 'Una curva', bloques: 'flechas' },
  { mapa: ['S...', 'o...', 'oooM'], nombre: 'Baja y camina', bloques: 'flechas' },
  { mapa: ['...M', '..oo', '.oo.', 'So..'], nombre: 'Escalerita', bloques: 'flechas' },
  { mapa: ['SoRoM'], nombre: '¡Una piedra! Salta 🦘', bloques: 'salto' },
  { mapa: ['..M', '..o', '..R', 'Soo'], nombre: 'Salta hacia arriba', bloques: 'salto' },
  { mapa: ['SooooM'], nombre: 'Repite 🔁', bloques: 'todo', max: 1 },
  { mapa: ['Sooo', '...o', '...o', '...M'], nombre: 'Repite y baja', bloques: 'todo', max: 2 },
  { mapa: ['SooRoo', '.....o', '.....M'], nombre: 'Piedra y repite', bloques: 'todo', max: 4 },
  { mapa: ['Mo...', '.o...', '.oooo', '....o', 'Soooo'], nombre: 'El caracol', bloques: 'todo', max: 5 },
  { mapa: ['ooRooM', 'o.....', 'o.....', 'S.....'], nombre: 'El gran camino', bloques: 'todo', max: 4 },
];
const DIRS = { arriba: [-1, 0, '⬆️'], abajo: [1, 0, '⬇️'], izquierda: [0, -1, '⬅️'], derecha: [0, 1, '➡️'] };
const MAX_SLOTS = 12;
// bloques divertidos: no mueven al personaje, solo hacen una gracia
const GRACIAS = { pirueta: { emoji: '🌀', dice: 'pirueta' }, bailar: { emoji: '💃', dice: 'baila' }, cantar: { emoji: '🎤', dice: 'canta' } };
const MAX_GRACIAS = 3;

// cuántos bloques de movimiento necesita (como mínimo) cada nivel: así se dibujan sus cuadraditos
function resolver(cfg) {
  const mapa = cfg.mapa, rows = mapa.length, cols = Math.max(...mapa.map(r => r.length));
  const cel = (r, c) => (r < 0 || c < 0 || r >= rows || c >= cols) ? '.' : (mapa[r][c] || '.');
  let start = [0, 0];
  mapa.forEach((row, r) => { const c = row.indexOf('S'); if (c >= 0) start = [r, c]; });
  const saltos = cfg.bloques !== 'flechas' ? [false, true] : [false];
  const reps = cfg.bloques === 'todo' ? 5 : 1;
  const visto = new Set([start.join()]);
  let frente = [start];
  for (let k = 1; k <= 30 && frente.length; k++) {
    const sig = [];
    for (const [r0, c0] of frente) for (const [dr, dc] of Object.values(DIRS)) for (const salto of saltos) {
      let r = r0, c = c0;
      for (let n = 1; n <= reps; n++) {
        const p = salto ? 2 : 1, nr = r + dr * p, nc = c + dc * p, x = cel(nr, nc);
        // el salto que cuenta es el de la piedra (saltar el agua no es la idea del nivel)
        if (salto && cel(r + dr, c + dc) !== 'R') break;
        if (x === '.' || x === 'R') break;
        if (x === 'M') return k;
        r = nr; c = nc;
        const key = r + ',' + c;
        if (!visto.has(key)) { visto.add(key); sig.push([r, c]); }
      }
    }
    frente = sig;
  }
  return MAX_SLOTS;
}
NIVELES.forEach(n => { n.pasos = resolver(n); });

// ---------- mundo ----------
const W = crearMundo($('#mundo'), { fog: null, fov: 45 });
const { scene, camera, sun, renderer } = W;
renderer.setClearColor(0x000000, 0);
const fx = chispitas(scene);
const CELL = 1.3;
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .5, ...o });
function mesh(geo, m, x = 0, y = 0, z = 0) { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; return me; }

// agua con olitas
const agua = new THREE.Mesh(new THREE.PlaneGeometry(60, 60, 60, 60), mat(0x4fc3f7, { roughness: .2, metalness: .1, transparent: true, opacity: .92 }));
agua.rotation.x = -Math.PI / 2; agua.receiveShadow = true; scene.add(agua);
const aguaPos = agua.geometry.attributes.position;
const fondo = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat(0x1f7fb8));
fondo.rotation.x = -Math.PI / 2; fondo.position.y = -1.2; scene.add(fondo);

// ---------- sapito de bloques ----------
function crearSapo() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const verde = mat(0x4cd964), panza = mat(0xc8f7a0), rosa = mat(0xff8fab), negro = mat(0x1d2233, { roughness: .2 }), blanco = mat(0xffffff, { roughness: .3 });
  body.add(mesh(new THREE.BoxGeometry(.7, .42, .62), verde, 0, .32, 0));
  body.add(mesh(new THREE.BoxGeometry(.56, .1, .5), panza, 0, .14, .04));
  body.add(mesh(new THREE.BoxGeometry(.5, .2, .06), panza, 0, .28, .31));
  // ojos grandes arriba
  const ojos = [], pupilas = [];
  [-1, 1].forEach(sx => {
    const g = new THREE.Group(); g.position.set(sx * .2, .6, .14); body.add(g);
    g.add(mesh(new THREE.SphereGeometry(.15, 16, 12), verde));
    g.add(mesh(new THREE.SphereGeometry(.12, 16, 12), blanco, 0, .02, .06));
    const pu = new THREE.Group(); pu.position.set(0, .03, .16); g.add(pu);
    pu.add(mesh(new THREE.SphereGeometry(.06, 12, 8), negro, .02, 0, 0));
    pu.add(mesh(new THREE.SphereGeometry(.02, 6, 4), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: .8 }), .04, .03, .045));
    ojos.push(g); pupilas.push(pu);
  });
  // boca y cachetes
  const boca = mesh(new THREE.TorusGeometry(.16, .025, 6, 20, Math.PI), mat(0x9b1d4a), 0, .34, .32); boca.rotation.z = Math.PI; body.add(boca);
  const bocaO = mesh(new THREE.CircleGeometry(.08, 16), mat(0x9b1d4a), 0, .3, .335); bocaO.visible = false; body.add(bocaO);
  [-1, 1].forEach(sx => body.add(mesh(new THREE.CircleGeometry(.06, 12), rosa, sx * .27, .36, .315)));
  // coronita rosada
  const corona = new THREE.Group(); corona.position.set(0, .56, -.05); body.add(corona);
  [-1, 0, 1].forEach(i => corona.add(mesh(new THREE.ConeGeometry(.04, .14, 5), mat(0xff5dab, { metalness: .3 }), i * .07, .07, 0)));
  // patitas
  const patas = [[-.32, .3], [.32, .3], [-.36, -.22], [.36, -.22]].map(([x, z], i) => {
    const g = new THREE.Group(); g.position.set(x, .14, z); body.add(g);
    g.add(mesh(new THREE.BoxGeometry(i < 2 ? .14 : .2, .14, i < 2 ? .16 : .3), verde, 0, -.04, i < 2 ? .02 : .05));
    g.add(mesh(new THREE.BoxGeometry(i < 2 ? .2 : .26, .04, .14), mat(0x2fb35a), 0, -.1, i < 2 ? .1 : .2));
    return g;
  });
  // estrellitas de mareo
  const mareo = new THREE.Group(); mareo.position.y = .95; mareo.visible = false; body.add(mareo);
  for (let i = 0; i < 4; i++) { const s = mesh(new THREE.OctahedronGeometry(.07), mat(0xffd23f, { emissive: 0x8a6a00, emissiveIntensity: .6 })); s.userData.a = i * Math.PI / 2; mareo.add(s); }
  // signo de pregunta
  const qc = document.createElement('canvas'); qc.width = qc.height = 128;
  const qg = qc.getContext('2d'); qg.font = '800 110px "Baloo 2", sans-serif'; qg.textAlign = 'center'; qg.textBaseline = 'middle';
  qg.fillStyle = '#fff'; qg.strokeStyle = '#9a6ee0'; qg.lineWidth = 12; qg.strokeText('?', 64, 70); qg.fillText('?', 64, 70);
  const tq = new THREE.CanvasTexture(qc); tq.colorSpace = THREE.SRGBColorSpace;
  const pregunta = new THREE.Sprite(new THREE.SpriteMaterial({ map: tq, depthTest: false })); pregunta.scale.set(.5, .5, 1); pregunta.position.y = 1.15; pregunta.visible = false; body.add(pregunta);
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { root, body, ojos, pupilas, boca, bocaO, patas, mareo, pregunta };
}
// el que salta: el sapito o cualquier personaje del juego (se recuerda en P.sapitoPj)
let sapo = crearSapo(); sapo.root.scale.setScalar(1.25); scene.add(sapo.root);
function adornosGesto(body, y) {
  const mareo = new THREE.Group(); mareo.position.y = y; mareo.visible = false; body.add(mareo);
  for (let i = 0; i < 4; i++) { const s = mesh(new THREE.OctahedronGeometry(.14), mat(0xffd23f, { emissive: 0x8a6a00, emissiveIntensity: .6 })); s.userData.a = i * Math.PI / 2; mareo.add(s); }
  mareo.scale.setScalar(1.4);
  const qc = document.createElement('canvas'); qc.width = qc.height = 128;
  const qg = qc.getContext('2d'); qg.font = '800 110px "Baloo 2", sans-serif'; qg.textAlign = 'center'; qg.textBaseline = 'middle';
  qg.fillStyle = '#fff'; qg.strokeStyle = '#9a6ee0'; qg.lineWidth = 12; qg.strokeText('?', 64, 70); qg.fillText('?', 64, 70);
  const tq = new THREE.CanvasTexture(qc); tq.colorSpace = THREE.SRGBColorSpace;
  const pregunta = new THREE.Sprite(new THREE.SpriteMaterial({ map: tq, depthTest: false })); pregunta.scale.set(.9, .9, 1); pregunta.position.y = y + .4; pregunta.visible = false; body.add(pregunta);
  return { mareo, pregunta };
}
async function ponerActor(id) {
  scene.remove(sapo.root);
  if (!id || id === 'sapo') { sapo = crearSapo(); sapo.root.scale.setScalar(1.25); }
  else {
    const ch = await crearPersonaje(id);
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.add(ch.group);
    ch.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const { mareo, pregunta } = adornosGesto(body, 2.5);
    const nada = new THREE.Object3D();
    sapo = { root, body, ojos: [], pupilas: [], boca: nada, bocaO: nada, patas: [], mareo, pregunta, ch, pq: ch.group.position.y };
    root.scale.setScalar(.6);
  }
  scene.add(sapo.root);
  sapo.root.userData.id = id || 'sapo';
  const q = document.querySelector('#m-quien'); if (q) q.textContent = !id || id === 'sapo' ? '🐸' : (J.CHARS[id]?.emoji || '⭐');
  if (board) colocarSapo();
}
// notitas que salen cuando canta
function notaSprite() {
  const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d');
  g.font = '800 80px "Baloo 2", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = J.pick(['#ff5dab', '#9a6ee0', '#3f8ee8', '#ffb703']); g.fillText(J.pick(['♪', '♫', '♬']), 48, 52);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); sp.scale.set(.45, .45, 1);
  return sp;
}
const notas = [];

// ---------- tablero ----------
let board = null;
const state = { nivel: 0, programa: [], salto: false, corriendo: false, paso: -1, r: 0, c: 0, dir: 0, anim: null, cola: [], gesto: null, gestoT: 0, ganado: false };
const cellXZ = (r, c) => new THREE.Vector3((c - (board.cols - 1) / 2) * CELL, 0, (r - (board.rows - 1) / 2) * CELL);
const celda = (r, c) => (board.mapa[r] || '')[c] || '.';
function nenufar(r, c, tipo) {
  const g = new THREE.Group();
  const p = cellXZ(r, c); g.position.copy(p);
  const hoja = mesh(new THREE.CylinderGeometry(.56, .58, .1, 28, 1, false, .35, Math.PI * 2 - .7), mat(tipo === 'S' ? 0x7be08a : 0x5cc96a, { roughness: .6 }), 0, .05, 0);
  hoja.rotation.y = Math.random() * 6; g.add(hoja);
  g.add(mesh(new THREE.CylinderGeometry(.5, .5, .02, 24), mat(0x8fe89a), 0, .11, 0));
  if (Math.random() < .35 && tipo === 'o') { const fl = mesh(new THREE.SphereGeometry(.06, 8, 6), mat(0xffffff), .3, .16, .2); g.add(fl); }
  g.userData.fase = Math.random() * 6;
  return g;
}
function flor() {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) { const p = mesh(new THREE.SphereGeometry(.18, 12, 8), mat(0xff7eb6)); p.scale.set(1, .4, .6); const a = i / 6 * Math.PI * 2; p.position.set(Math.cos(a) * .2, .32, Math.sin(a) * .2); p.rotation.y = -a; g.add(p); }
  g.add(mesh(new THREE.SphereGeometry(.13, 12, 8), mat(0xffd23f, { emissive: 0x6b5200, emissiveIntensity: .3 }), 0, .36, 0));
  // mosquita que vuela encima
  const mosca = new THREE.Group(); mosca.position.y = .9; g.add(mosca);
  mosca.add(mesh(new THREE.SphereGeometry(.07, 10, 8), mat(0x3b2a5a)));
  [-1, 1].forEach(sx => { const a = mesh(new THREE.SphereGeometry(.07, 8, 6), mat(0xffffff, { transparent: true, opacity: .7 }), sx * .07, .05, 0); a.scale.set(1, .3, .6); a.userData.ala = sx; mosca.add(a); });
  g.userData.mosca = mosca;
  return g;
}
function piedra() {
  const g = new THREE.Group();
  const s = mesh(new THREE.DodecahedronGeometry(.42, 0), mat(0x9aa3b5, { roughness: .9 }), 0, .32, 0); s.scale.set(1, .8, 1); g.add(s);
  g.add(mesh(new THREE.DodecahedronGeometry(.2, 0), mat(0x7d8597, { roughness: .9 }), .3, .15, .2));
  return g;
}
function buildLevel(i) {
  if (board) { scene.remove(board.group); }
  const cfg = NIVELES[i];
  const mapa = cfg.mapa, rows = mapa.length, cols = Math.max(...mapa.map(r => r.length));
  board = { mapa, rows, cols, group: new THREE.Group(), pads: [] };
  scene.add(board.group);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const ch = celda(r, c);
    if (ch === '.') continue;
    const pad = nenufar(r, c, ch); board.group.add(pad); board.pads.push(pad);
    if (ch === 'M') { const f = flor(); pad.add(f); board.flor = f; board.meta = [r, c]; }
    if (ch === 'R') pad.add(piedra());
    if (ch === 'S') board.start = [r, c];
  }
  // juncos y piedritas alrededor
  for (let k = 0; k < 14; k++) {
    const a = k / 14 * Math.PI * 2, rad = Math.max(rows, cols) * CELL * .5 + 1.4 + Math.random() * 1.5;
    const j = new THREE.Group(); j.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad * .8);
    for (let n = 0; n < 3; n++) { const t = mesh(new THREE.CylinderGeometry(.03, .04, .9 + Math.random() * .6, 5), mat(0x3fa34d), (n - 1) * .1, .45, 0); t.rotation.z = (n - 1) * .15; j.add(t); }
    if (k % 3 === 0) j.add(mesh(new THREE.CapsuleGeometry(.06, .25, 4, 8), mat(0x8a5a3c), 0, 1.05, 0));
    board.group.add(j);
  }
  state.programa = []; state.salto = false;
  colocarSapo();
  encuadre();
}
function colocarSapo() {
  const [r, c] = board.start;
  state.r = r; state.c = c; state.corriendo = false; state.paso = -1; state.anim = null; state.cola = []; state.gesto = null; state.ganado = false;
  const first = board.mapa[r][c + 1] && board.mapa[r][c + 1] !== '.' ? 'derecha' : (board.mapa[r - 1] || '')[c] && board.mapa[r - 1][c] !== '.' ? 'arriba' : 'abajo';
  state.dir = ang(first);
  sapo.root.position.copy(cellXZ(r, c)).setY(.12);
  sapo.root.rotation.set(0, state.dir, 0); sapo.body.rotation.set(0, 0, 0); sapo.body.position.set(0, 0, 0); sapo.body.scale.set(1, 1, 1);
  sapo.mareo.visible = false; sapo.pregunta.visible = false; sapo.boca.visible = true; sapo.bocaO.visible = false;
  sapo.pupilas.forEach(p => p.position.set(0, .03, .16));
  if (sapo.ch && sapo.ch.setCara) sapo.ch.setCara('feliz');
}
const ang = d => ({ abajo: 0, derecha: Math.PI / 2, arriba: Math.PI, izquierda: -Math.PI / 2 })[d];
const narrow = () => innerWidth / innerHeight < .8;
function encuadre() {
  const H = innerHeight, Wd = innerWidth, aspect = Wd / H, tf = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  // el tablero va en la franja libre entre la misión (arriba) y los bloques (abajo)
  const top = Math.max(110, ($('#mision').hidden ? 70 : $('#mision').getBoundingClientRect().bottom) + 8);
  const bottom = $('.panel').getBoundingClientRect().top || H * .7;
  const usable = Math.max(.3, (bottom - top) / H);
  const bw = Math.max(board.cols, 3) * CELL + 1, bh = Math.max(board.rows, 2) * CELL + .8;
  const el = THREE.MathUtils.degToRad(56);
  const dist = Math.max(bw / (2 * tf * aspect), (bh * Math.sin(el) + .5) / (2 * tf * usable)) * 1.05;
  camera.position.set(0, Math.sin(el) * dist, Math.cos(el) * dist);
  camera.lookAt(0, .2, 0);
  // corre la imagen para que el centro del tablero quede en el centro de la franja libre
  camera.setViewOffset(Wd, H, 0, H / 2 - (top + bottom) / 2, Wd, H);
  camera.updateProjectionMatrix();
}
addEventListener('resize', () => board && setTimeout(encuadre, 0));

// ---------- programa ----------
const prog = $('#programa'), paleta = $('#paleta');
function cfgN() { return NIVELES[state.nivel]; }
// movimientos necesarios (los cuadraditos numerados); en niveles de 🔁 no caben más que esos
function necesarios() { return cfgN().pasos; }
function maxBloques() { return cfgN().max ? necesarios() : MAX_SLOTS; }
const movs = () => state.programa.filter(b => b.d).length;
const gracias = () => state.programa.filter(b => b.f).length;
function renderPaleta() {
  const b = cfgN().bloques;
  const flechas = ['izquierda', 'arriba', 'abajo', 'derecha'].map(d => `<button class="bloque flecha" data-d="${d}" aria-label="${d}">${DIRS[d][2]}</button>`).join('');
  const salto = b !== 'flechas' ? `<button class="bloque especial ${state.salto ? 'on' : ''}" data-x="salto" aria-label="Saltar">🦘</button>` : '';
  const repite = b === 'todo' ? `<button class="bloque especial" data-x="repite" aria-label="Repetir">🔁</button>` : '';
  const fun = Object.entries(GRACIAS).map(([k, g]) => `<button class="bloque divertido" data-f="${k}" aria-label="${g.dice}">${g.emoji}</button>`).join('');
  paleta.innerHTML = flechas + salto + repite + fun;
}
function renderPrograma() {
  const need = necesarios();
  let k = 0;
  const slots = state.programa.map((b, i) => {
    const num = b.d ? ++k : 0;
    const cara = b.f ? GRACIAS[b.f].emoji : DIRS[b.d][2];
    return `<button class="slot lleno ${b.f ? 'gracia' : ''} ${num > need ? 'extra' : ''} ${i === state.paso ? 'activo' : ''}" data-i="${i}" aria-label="Quitar bloque">${b.salto ? '<i class="mini">🦘</i>' : ''}${cara}${b.n > 1 ? `<b class="veces">×${b.n}</b>` : ''}</button>`;
  }).join('');
  // un cuadradito numerado por cada movimiento que falta
  const vacios = Array.from({ length: Math.max(0, need - k) }, (_, j) => `<span class="slot"><i class="num">${k + j + 1}</i></span>`).join('');
  prog.innerHTML = slots + vacios;
  prog.dataset.need = need;
  $('#correr').disabled = !state.programa.length || state.corriendo;
}
paleta.addEventListener('click', e => {
  const b = e.target.closest('.bloque'); if (!b || state.corriendo) return;
  J.audio();
  if (b.dataset.f) {
    if (gracias() >= MAX_GRACIAS) { J.boing(); mensaje('¡Ya no caben más!', 1.2); return; }
    state.programa.push({ f: b.dataset.f, n: 1 });
    J.sfx('pop', .8, 1.3); J.say(GRACIAS[b.dataset.f].dice);
    renderPrograma(); return;
  }
  if (b.dataset.x === 'salto') { state.salto = !state.salto; J.sfx('pop'); J.say('salta'); renderPaleta(); return; }
  if (b.dataset.x === 'repite') {
    const last = state.programa[state.programa.length - 1];
    if (!last) { J.boing(); return; }
    last.n = last.n >= 5 ? 1 : last.n + 1; J.sfx('pop', .8, 1 + last.n * .1); J.say(['repite', ['', 'una vez', 'dos veces', 'tres veces', 'cuatro veces', 'cinco veces'][last.n]]); renderPrograma(); return;
  }
  if (movs() >= maxBloques()) { J.boing(); mensaje('¡Ya no caben más!', 1.2); return; }
  state.programa.push({ d: b.dataset.d, n: 1, salto: state.salto });
  J.sfx('pop', .8, 1 + state.programa.length * .05);
  J.say(state.salto ? ['salta', b.dataset.d] : b.dataset.d);
  state.salto = false;
  renderPaleta(); renderPrograma();
});
prog.addEventListener('click', e => {
  const s = e.target.closest('.slot.lleno'); if (!s || state.corriendo) return;
  state.programa.splice(+s.dataset.i, 1); J.sfx('pop2', .6, .8); renderPrograma();
});
$('#borrar').onclick = () => { if (state.corriendo) return; state.programa = []; state.salto = false; J.sfx('pop2'); renderPaleta(); renderPrograma(); };
$('#correr').onclick = () => correr();
$('#m-say').onclick = () => J.say('¡Lleva al sapito a la flor!');

// ---------- ejecutar ----------
function correr() {
  if (state.corriendo || !state.programa.length) return;
  colocarSapo();
  state.corriendo = true;
  // cada bloque se convierte en pasitos; recordamos de qué bloque viene cada uno
  state.cola = [];
  state.programa.forEach((b, i) => { for (let k = 0; k < b.n; k++) state.cola.push({ ...b, i }); });
  J.audio(); J.say('¡Vamos!');
  renderPrograma();
  setTimeout(siguiente, 450);
}
function siguiente() {
  if (!state.corriendo) return;
  const st = state.cola.shift();
  if (!st) { state.paso = -1; renderPrograma(); return confundido(); }
  state.paso = st.i; renderPrograma();
  if (st.f) return gracia(st.f);
  const [dr, dc] = DIRS[st.d];
  const pasos = st.salto ? 2 : 1;
  const r2 = state.r + dr * pasos, c2 = state.c + dc * pasos;
  const destino = celda(r2, c2);
  state.dir = ang(st.d);
  const from = sapo.root.position.clone(), to = (r2 >= 0 && c2 >= 0 && r2 < board.rows && c2 < board.cols) ? cellXZ(r2, c2) : cellXZ(state.r, state.c).add(new THREE.Vector3(dc * CELL * pasos, 0, dr * CELL * pasos));
  to.y = .12;
  if (destino === 'R') {
    // choca con la piedra y rebota
    const mid = from.clone().lerp(to, .4);
    state.anim = { t: 0, dur: .45, from, to: mid, alto: .3, fin: () => { J.efecto('pum'); state.anim = { t: 0, dur: .35, from: mid, to: from, alto: .15, fin: () => choque() }; } };
  } else {
    J.sfx('jump', .6, st.salto ? .8 : 1.1);
    state.anim = { t: 0, dur: st.salto ? .7 : .42, from, to, alto: st.salto ? 1.3 : .55, fin: () => {
      state.r = r2; state.c = c2;
      if (destino === '.') return caer();
      J.sfx('pop', .5, .7);
      fx.burst(to.clone().setY(.3), 6, .2);
      if (destino === 'M') return llegar();
      setTimeout(siguiente, 120);
    } };
  }
}
function gracia(f) {
  state.gesto = f; state.gestoT = 0;
  if (f === 'pirueta') { J.sfx('jump', .6, 1.3); J.tones([523, 659, 784, 1046], .09, 'triangle', .12); }
  if (f === 'bailar') { J.efecto('festejo'); }
  if (f === 'cantar') { J.tones([523, 523, 784, 784, 880, 880, 784], .18, 'sine', .14); }
  if (sapo.ch && sapo.ch.setCara) sapo.ch.setCara(f === 'cantar' ? 'sorpresa' : 'feliz');
  setTimeout(() => { if (state.gesto === f) { state.gesto = null; sapo.body.rotation.set(0, 0, 0); sapo.body.position.y = 0; if (sapo.ch && sapo.ch.setCara) sapo.ch.setCara('feliz'); } if (state.corriendo) siguiente(); }, 1400);
}
function splash(p) {
  const c = J.audio(); if (!c) return;
  const t = c.currentTime, n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  const buf = c.createBuffer(1, c.sampleRate * .6, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  n.buffer = buf; f.type = 'lowpass'; f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(300, t + .5);
  g.gain.value = .5; n.connect(f).connect(g).connect(c.destination); n.start(t);
  // gotas
  for (let k = 0; k < 5; k++) { const o = c.createOscillator(), og = c.createGain(), tt = t + .1 + k * .07; o.frequency.setValueAtTime(800 + Math.random() * 900, tt); o.frequency.exponentialRampToValueAtTime(1800, tt + .05); og.gain.setValueAtTime(.08, tt); og.gain.exponentialRampToValueAtTime(.0001, tt + .08); o.connect(og).connect(c.destination); o.start(tt); o.stop(tt + .1); }
  gotas(p);
}
const gotasArr = [];
function gotas(p) {
  for (let k = 0; k < 26; k++) {
    const m = mesh(new THREE.SphereGeometry(.05 + Math.random() * .05, 6, 4), mat(0xe0f7ff, { transparent: true, opacity: .9 }));
    m.position.copy(p).setY(.1);
    m.userData.v = new THREE.Vector3((Math.random() - .5) * 3, 2 + Math.random() * 3, (Math.random() - .5) * 3);
    m.userData.burbuja = false; scene.add(m); gotasArr.push(m);
  }
}
function burbujas(p) {
  for (let k = 0; k < 8; k++) {
    const m = mesh(new THREE.SphereGeometry(.06 + Math.random() * .06, 10, 8), mat(0xffffff, { transparent: true, opacity: .55, roughness: .1 }));
    m.position.copy(p).add(new THREE.Vector3((Math.random() - .5) * .5, -.4, (Math.random() - .5) * .5));
    m.userData.v = new THREE.Vector3(0, .5 + Math.random() * .5, 0); m.userData.burbuja = true; m.userData.t = Math.random() * -1.5;
    scene.add(m); gotasArr.push(m);
  }
}
function caer() {
  // ¡splash! se hunde girando, sale mareado y vuelve al inicio
  state.corriendo = false; state.paso = -1; renderPrograma();
  splash(sapo.root.position.clone());
  J.boing();
  state.gesto = 'caer'; state.gestoT = 0;
  sapo.boca.visible = false; sapo.bocaO.visible = true;
  if (sapo.ch && sapo.ch.setCara) sapo.ch.setCara('sorpresa');
  mensaje('¡Uy! ¡Al agua! 💦', 1.6);
  J.say(['¡Uy, se cayó al agua!', 'Prueba otra vez']);
  setTimeout(() => burbujas(sapo.root.position.clone()), 500);
}
function choque() {
  state.corriendo = false; state.paso = -1; renderPrograma();
  state.gesto = 'mareo'; state.gestoT = 0; sapo.mareo.visible = true;
  if (sapo.ch && sapo.ch.setCara) sapo.ch.setCara('llora');
  sapo.boca.visible = false; sapo.bocaO.visible = true;
  J.boing(); J.sfx('pop2', .6, .6);
  mensaje('¡Ay, una piedra! 🪨', 1.6);
  J.say(['¡Ay, una piedra!', 'Salta', 'Prueba otra vez']);
}
function confundido() {
  state.corriendo = false;
  state.gesto = 'duda'; state.gestoT = 0; sapo.pregunta.visible = true;
  if (sapo.ch && sapo.ch.setCara) sapo.ch.setCara('triste');
  J.tones([520, 440, 380], .14, 'triangle', .15);
  mensaje('¿Y ahora? 🤔', 1.6);
  J.say(['¿Y ahora?', 'Le faltan pasos.']);
}
function llegar() {
  state.corriendo = false; state.ganado = true; state.paso = -1; renderPrograma();
  state.gesto = 'fiesta'; state.gestoT = 0;
  if (sapo.ch && sapo.ch.setCara) sapo.ch.setCara('feliz');
  J.cheer(true); J.confetti(110); J.addStar(); updatePlayer();
  fx.burst(sapo.root.position.clone().setY(1), 70, 1.2);
  mensaje('¡Llegó! 🌸', 2);
  J.say(['¡Llegó!', J.pick(J.PRAISES)], { queue: true });
  P.level.sapito = Math.max(P.level.sapito || 0, state.nivel + 1); J.save();
  setTimeout(() => {
    const sig = () => empezarNivel(Math.min(state.nivel + 1, NIVELES.length - 1));
    // regalo cada 3 niveles y al final; si no, seguimos al siguiente
    if ((state.nivel + 1) % 3 === 0 || state.nivel === NIVELES.length - 1) J.gift(() => J.nextTurn(sig, { onShow: updatePlayer }));
    else J.nextTurn(sig, { onShow: updatePlayer });
  }, 2600);
}
function mensaje(text, secs = 1.4) {
  const el = $('#mensaje'); el.textContent = text;
  el.classList.remove('ver'); void el.offsetWidth; el.classList.add('ver');
  clearTimeout(mensaje.t); mensaje.t = setTimeout(() => el.classList.remove('ver'), secs * 1000);
}
function updatePlayer() { const p = J.player(); $('#jugador').innerHTML = `${J.CHARS[p.char]?.emoji || '⭐'} ${J.esc(p.name)} · ⭐ ${p.stars}`; }

// ---------- animación ----------
W.onFrame((dt, t) => {
  // olitas
  for (let i = 0; i < aguaPos.count; i++) aguaPos.setZ(i, Math.sin(aguaPos.getX(i) * .8 + t * 1.6) * .03 + Math.cos(aguaPos.getY(i) * .7 + t * 1.2) * .03);
  aguaPos.needsUpdate = true;
  if (board) {
    board.pads.forEach(p => { p.position.y = Math.sin(t * 1.5 + p.userData.fase) * .02; });
    if (board.flor) { const m = board.flor.userData.mosca; m.position.set(Math.cos(t * 2.2) * .35, .9 + Math.sin(t * 5) * .08, Math.sin(t * 2.2) * .35); m.children.forEach(c => { if (c.userData.ala) c.rotation.z = c.userData.ala * Math.sin(t * 60) * .6; }); }
  }
  // giro suave hacia donde va
  let d = state.dir - sapo.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
  sapo.root.rotation.y += d * Math.min(1, dt * 14);
  // salto en arco con estirón y aplastón
  if (state.anim) {
    const a = state.anim; a.t += dt; const k = Math.min(1, a.t / a.dur);
    sapo.root.position.lerpVectors(a.from, a.to, k);
    sapo.root.position.y = (a.from.y || .12) + Math.sin(k * Math.PI) * a.alto;
    sapo.body.scale.set(1 - Math.sin(k * Math.PI) * .1, 1 + Math.sin(k * Math.PI) * .25, 1);
    sapo.patas.forEach((p, i) => { p.rotation.x = (i < 2 ? -1 : 1) * Math.sin(k * Math.PI) * .8; });
    if (k >= 1) { state.anim = null; sapo.body.scale.set(1.15, .8, 1.15); a.fin && a.fin(); }
  } else if (!state.gesto) {
    sapo.body.scale.lerp(new THREE.Vector3(1, 1 + Math.sin(t * 3) * .03, 1), Math.min(1, dt * 10));
    sapo.patas.forEach(p => { p.rotation.x *= .8; });
  }
  // gestos graciosos
  if (state.gesto) {
    state.gestoT += dt; const g = state.gestoT;
    if (state.gesto === 'caer') {
      if (g < 1.4) { sapo.body.position.y = -Math.min(1, g / .5) * .9 + Math.max(0, g - .9) * 1.6; sapo.body.rotation.y = g * 14; sapo.body.rotation.z = Math.sin(g * 9) * .4; }
      else if (g < 3.2) {
        // sale mareado escupiendo agua con los ojitos dando vueltas
        sapo.body.position.y = Math.max(-.1, sapo.body.position.y); sapo.body.rotation.y *= .9; sapo.body.rotation.z = Math.sin(g * 6) * .25;
        sapo.mareo.visible = true;
        sapo.pupilas.forEach((p, i) => { p.position.set(Math.cos(g * 10 + i * 3) * .05, .03 + Math.sin(g * 10 + i * 3) * .05, .16); });
      } else { state.gesto = null; colocarSapo(); J.say('¡Inténtalo otra vez!'); }
    } else if (state.gesto === 'mareo') {
      sapo.body.rotation.z = Math.sin(g * 8) * .3; sapo.body.rotation.x = -.15;
      sapo.pupilas.forEach((p, i) => { p.position.set(Math.cos(g * 10 + i * 3) * .05, .03 + Math.sin(g * 10 + i * 3) * .05, .16); });
      if (g > 2.4) { state.gesto = null; colocarSapo(); }
    } else if (state.gesto === 'duda') {
      // se encoge de hombros: mira a un lado y al otro
      sapo.body.rotation.y = Math.sin(g * 5) * .6; sapo.body.position.y = Math.abs(Math.sin(g * 5)) * .05;
      sapo.ojos.forEach((o, i) => { o.position.y = .6 + Math.abs(Math.sin(g * 5 + i)) * .06; });
      if (g > 2.4) { state.gesto = null; colocarSapo(); }
    } else if (state.gesto === 'fiesta') {
      sapo.body.position.y = Math.abs(Math.sin(g * 8)) * .5; sapo.body.rotation.y = g * 6;
      if (Math.random() < .3) fx.burst(sapo.root.position.clone().setY(1.2), 3, .5);
      if (g > 2.5) { state.gesto = null; sapo.body.rotation.y = 0; sapo.body.position.y = 0; }
    } else if (state.gesto === 'pirueta') {
      sapo.body.rotation.y = Math.min(1, g / 1.1) * Math.PI * 4; sapo.body.position.y = Math.sin(Math.min(1, g / 1.1) * Math.PI) * .5;
      if (Math.random() < .3) fx.burst(sapo.root.position.clone().setY(.6), 2, .4);
    } else if (state.gesto === 'bailar') {
      sapo.body.rotation.y = Math.sin(g * 8) * .7; sapo.body.rotation.z = Math.sin(g * 8) * .15; sapo.body.position.y = Math.abs(Math.sin(g * 8)) * .15;
    } else if (state.gesto === 'cantar') {
      sapo.body.rotation.z = Math.sin(g * 4) * .12; sapo.body.scale.set(1, 1 + Math.abs(Math.sin(g * 9)) * .06, 1);
      if (Math.random() < dt * 5) { const n = notaSprite(); n.position.copy(sapo.root.position).add(new THREE.Vector3((Math.random() - .5) * .4, sapo.ch ? 1.3 : 1, 0)); n.userData.t = 0; scene.add(n); notas.push(n); }
    }
  }
  if (sapo.ch) {
    const g = state.gesto;
    const mode = state.anim ? 'correr' : g === 'fiesta' || g === 'bailar' ? 'bailar' : g === 'pirueta' ? 'festejar' : g === 'cantar' ? 'saludar' : g === 'caer' || g === 'mareo' ? 'quieto' : 'quieto';
    sapo.ch.update(dt, mode, 1);
  }
  for (const n of notas.slice()) { n.userData.t += dt; n.position.y += dt * .9; n.position.x += Math.sin(n.userData.t * 5) * dt * .3; n.material.opacity = Math.max(0, 1 - n.userData.t / 1.6); if (n.userData.t > 1.6) { scene.remove(n); notas.splice(notas.indexOf(n), 1); } }
  if (sapo.mareo.visible) sapo.mareo.children.forEach(s => { s.userData.a += dt * 6; s.position.set(Math.cos(s.userData.a) * .35, Math.sin(s.userData.a * 2) * .05, Math.sin(s.userData.a) * .35); s.rotation.y += dt * 5; });
  if (sapo.pregunta.visible) sapo.pregunta.position.y = 1.15 + Math.sin(t * 6) * .06;
  // gotas y burbujas
  for (const m of gotasArr.slice()) {
    const u = m.userData;
    if (u.burbuja) { u.t += dt; if (u.t < 0) { m.visible = false; continue; } m.visible = true; m.position.y += dt * u.v.y; m.position.x += Math.sin(u.t * 6) * dt * .2; if (m.position.y > .2) { scene.remove(m); gotasArr.splice(gotasArr.indexOf(m), 1); J.sfx('pop', .3, 1.6); } }
    else { u.v.y -= dt * 9.8; m.position.addScaledVector(u.v, dt); if (m.position.y < 0) { scene.remove(m); gotasArr.splice(gotasArr.indexOf(m), 1); } }
  }
  fx.update(dt);
  sun.position.set(4, 12, 6);
});

// ---------- inicio ----------
function empezarNivel(i) {
  state.nivel = i;
  buildLevel(i);
  $('#nivel-num').textContent = i + 1;
  $('#m-word').textContent = NIVELES[i].nombre;
  renderPaleta(); renderPrograma(); updatePlayer();
  $('#mision').hidden = false;
  encuadre();
  const box = $('#mision'); box.classList.remove('nuevo'); void box.offsetWidth; box.classList.add('nuevo');
  J.say(i === 0 ? ['¡Lleva al sapito a la flor!', 'Toca las flechas.'] : NIVELES[i].max ? ['¡Lleva al sapito a la flor!', 'Usa repite.'] : '¡Lleva al sapito a la flor!');
}
function start(i) {
  $('#portada').hidden = true;
  J.audio(); J.startMusic();
  P.two ? J.showTurn(() => empezarNivel(i), { onShow: updatePlayer }) : empezarNivel(i);
}

// ¿quién salta? el sapito o un personaje
function renderPjs() {
  const cur = P.sapitoPj || 'sapo';
  const ids = ['sapo', ...PERSONAJES];
  $('#pjs').innerHTML = ids.map(id => `<button data-pj="${id}" class="${id === cur ? 'on' : ''}" title="${id === 'sapo' ? 'Sapito' : nombrePersonaje(id)}">${id === 'sapo' ? '🐸' : (J.CHARS[id]?.emoji || '⭐')}</button>`).join('');
}
$('#pjs').addEventListener('click', async e => {
  const b = e.target.closest('[data-pj]'); if (!b) return;
  P.sapitoPj = b.dataset.pj; J.save(); J.sfx('pop'); renderPjs();
  J.say(b.dataset.pj === 'sapo' ? 'Sapito' : nombrePersonaje(b.dataset.pj));
  await ponerActor(b.dataset.pj);
});

(async () => {
  await J.ready;
  renderPjs();
  if (P.sapitoPj && P.sapitoPj !== 'sapo') await ponerActor(P.sapitoPj);
  buildLevel(0); renderPaleta(); renderPrograma(); updatePlayer();
  W.start(); J.refreshMusic();
  const unlocked = Math.min(NIVELES.length, (P.level.sapito || 0) + 1);
  let sel = unlocked - 1;
  const box = $('#niveles');
  box.innerHTML = NIVELES.map((n, i) => `<button data-i="${i}" title="${n.nombre}" ${i >= unlocked ? 'disabled aria-label="Nivel bloqueado"' : ''} class="${i === sel ? 'on' : ''}">${i < unlocked ? i + 1 : '🔒'}</button>`).join('');
  box.onclick = e => { const b = e.target.closest('[data-i]'); if (!b || b.disabled) return; sel = +b.dataset.i; [...box.children].forEach((c, k) => c.classList.toggle('on', k === sel)); $('#nivel-desc').textContent = NIVELES[sel].nombre; J.sfx('pop'); buildLevel(sel); };
  $('#nivel-desc').textContent = NIVELES[sel].nombre;
  buildLevel(sel);
  const go = $('#empezar'); go.disabled = false; go.textContent = '▶ ¡A jugar!';
  go.onclick = () => start(sel);
  if (TEST) {
    window.__s = {
      state, NIVELES, start, empezarNivel, correr,
      programa(list) { state.programa = list.map(x => typeof x === 'string' ? { d: x, n: 1, salto: false } : { n: 1, salto: false, ...x }); renderPrograma(); },
      get sapo() { return sapo; }, ponerActor, necesarios, renderPrograma,
    };
    start(0);
  }
})();
