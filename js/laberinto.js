// Laberinto del Lobo: come los quesos del jardín sin que te atrape el lobo (y luego los fantasmas).
// Las estrellas dan poder: el lobo se asusta y ahora tú lo haces correr. Algunos quesos tienen una sílaba:
// la voz pide "Come el queso que dice ma" y, si lo encuentras, ganas una estrella extra.
import * as THREE from 'three';
import { crearMundo, chispitas, esperaFuente, tarjeta } from './mundo3d.js';
import { crearPersonaje } from './personajes.js';

const J = window.Juego, P = J.progress;
const $ = s => document.querySelector(s);
const TEST = location.hash === '#prueba';
const C = 2;                       // tamaño de cada cuadrito del laberinto
const DIRS = { arriba: [0, -1], abajo: [0, 1], izquierda: [-1, 0], derecha: [1, 0] };
const LISTA_DIRS = Object.values(DIRS);

// Niveles: laberintos que crecen y más amigos traviesos que te persiguen
const NIVELES = [
  { w: 11, h: 11, enemigos: ['lobo'], nombre: 'El Lobo Feroz' },
  { w: 13, h: 11, enemigos: ['lobo', 'fantasma'], nombre: 'El lobo y un fantasma' },
  { w: 13, h: 13, enemigos: ['lobo', 'fantasma', 'fantasma'], nombre: 'Dos fantasmas' },
  { w: 15, h: 13, enemigos: ['lobo', 'fantasma', 'fantasma'], nombre: 'Un jardín más grande' },
  { w: 15, h: 15, enemigos: ['lobo', 'fantasma', 'fantasma', 'fantasma'], nombre: 'Tres fantasmas' },
  { w: 17, h: 15, enemigos: ['lobo', 'fantasma', 'fantasma', 'fantasma'], nombre: 'Más rápidos' },
  { w: 17, h: 17, enemigos: ['lobo', 'fantasma', 'fantasma', 'fantasma'], nombre: 'El gran laberinto' },
  { w: 19, h: 17, enemigos: ['lobo', 'fantasma', 'fantasma', 'fantasma'], nombre: '¡Experta del laberinto!' },
];
// cada dificultad: velocidad de ella y de ellos, segundos de poder, y qué parte de los quesos hay que comer
const MODOS = {
  peque: { pj: 3.4, en: 1.45, sube: .05, poder: 9, meta: .7, carteles: 3, cerca: 6, azar: .3 },
  grande: { pj: 3.8, en: 2.0, sube: .08, poder: 7, meta: 1, carteles: 4, cerca: 99, azar: .12 },
  experto: { pj: 4.2, en: 2.7, sube: .1, poder: 5.5, meta: 1, carteles: 5, cerca: 99, azar: 0 },
};
// forma de pensar de cada perseguidor (todos distintos y nunca imposibles)
const MENTES = ['perseguir', 'adelantar', 'pasear', 'patrullar'];
const COLORES_FANTASMA = [0xc9a2ff, 0xffa8d2, 0x9ff0d0, 0x9fd8ff];

// ---------- mundo ----------
const W = crearMundo($('#mundo'), { fog: 0xeaf7ff, near: 30, far: 80, fov: 50 });
const { scene, camera, sun } = W;
W.fovFor = a => a < .8 ? 62 : 48;
const fx = chispitas(scene);
const suelo = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: 0x9edb78 }));
suelo.rotation.x = -Math.PI / 2; suelo.receiveShadow = true; scene.add(suelo);

// números al azar que se repiten (cada nivel tiene siempre el mismo laberinto)
function semilla(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// laberinto de pasillos con vueltas (sin callejones sin salida, para poder escapar siempre)
function hacerLaberinto(w, h, rnd) {
  const g = Array.from({ length: h }, () => Array(w).fill(1));
  const pila = [[1, 1]]; g[1][1] = 0;
  while (pila.length) {
    const [x, y] = pila[pila.length - 1];
    const op = [[2, 0], [-2, 0], [0, 2], [0, -2]].filter(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx > 0 && ny > 0 && nx < w - 1 && ny < h - 1 && g[ny][nx]; });
    if (!op.length) { pila.pop(); continue; }
    const [dx, dy] = op[Math.floor(rnd() * op.length)];
    g[y + dy / 2][x + dx / 2] = 0; g[y + dy][x + dx] = 0; pila.push([x + dx, y + dy]);
  }
  const abiertos = (x, y) => LISTA_DIRS.filter(([dx, dy]) => !g[y + dy][x + dx]).length;
  // quitar callejones: cada punta abre una pared más
  for (let y = 1; y < h - 1; y += 2) for (let x = 1; x < w - 1; x += 2) {
    if (abiertos(x, y) !== 1) continue;
    const op = LISTA_DIRS.filter(([dx, dy]) => g[y + dy][x + dx] && x + dx * 2 > 0 && x + dx * 2 < w - 1 && y + dy * 2 > 0 && y + dy * 2 < h - 1);
    if (op.length) { const [dx, dy] = op[Math.floor(rnd() * op.length)]; g[y + dy][x + dx] = 0; }
  }
  // algunas paredes más se abren para tener más caminos
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (!g[y][x] || (x % 2) === (y % 2)) continue;
    const horiz = x % 2 === 0;
    const a = horiz ? g[y][x - 1] : g[y - 1][x], b = horiz ? g[y][x + 1] : g[y + 1][x];
    if (!a && !b && rnd() < .1) g[y][x] = 0;
  }
  return g;
}

// ---------- piezas 3D ----------
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .55, ...o });
function caja(w, h, d, m, x = 0, y = 0, z = 0) { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); me.castShadow = true; return me; }
function bola(r, m, x = 0, y = 0, z = 0) { const me = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m); me.position.set(x, y, z); return me; }
function ojos(grupo, sep, y, z, r = .11) {
  // ojos grandes con brillito (se ven también cuando el amiguito vuelve a su casita)
  const blanco = mat(0xffffff, { roughness: .2 }), negro = mat(0x1d2233, { roughness: .2 });
  const pupilas = [];
  [-1, 1].forEach(s => {
    grupo.add(bola(r, blanco, s * sep, y, z));
    const p = bola(r * .5, negro, s * sep, y, z + r * .75); grupo.add(p); pupilas.push(p);
    grupo.add(bola(r * .18, mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: .8 }), s * sep + r * .2, y + r * .25, z + r * 1.05));
  });
  return pupilas;
}
// el Lobo Feroz: de bloques, más chistoso que asustador
function crearLobo() {
  const g = new THREE.Group(), cuerpo = new THREE.Group(), vista = new THREE.Group(); g.add(cuerpo, vista);
  const piel = mat(0x8c95a3), claro = mat(0xe4e8ee), oscuro = mat(0x4b5260);
  const mats = [piel, claro];
  cuerpo.add(caja(.62, .5, .9, piel, 0, .55, 0));
  cuerpo.add(caja(.5, .3, .7, claro, 0, .38, .02));
  const cabeza = new THREE.Group(); cabeza.position.set(0, .95, .42); cuerpo.add(cabeza);
  cabeza.add(caja(.56, .48, .5, piel));
  cabeza.add(caja(.32, .22, .3, claro, 0, -.1, .34));
  cabeza.add(bola(.06, mat(0x1d2233), 0, -.02, .5));
  cabeza.add(caja(.04, .06, .03, mat(0xffffff), -.07, -.2, .48)); cabeza.add(caja(.04, .06, .03, mat(0xffffff), .07, -.2, .48));
  [-1, 1].forEach(s => { const o = new THREE.Mesh(new THREE.ConeGeometry(.1, .28, 4), piel); o.position.set(s * .18, .34, -.02); o.castShadow = true; cabeza.add(o);
    const ce = caja(.16, .04, .03, oscuro, s * .12, .17, .26); ce.rotation.z = s * .35; cabeza.add(ce); });
  const patas = [[-.2, .3], [.2, .3], [-.2, -.3], [.2, -.3]].map(([x, z]) => { const p = caja(.16, .32, .16, piel, x, .16, z); cuerpo.add(p); return p; });
  const cola = caja(.14, .14, .5, piel, 0, .7, -.6); cola.rotation.x = .6; cuerpo.add(cola);
  const vOjos = new THREE.Group(); vOjos.position.copy(cabeza.position); vista.add(vOjos);
  const pupilas = ojos(vOjos, .13, .08, .26, .1);
  return { g, cuerpo, vista, mats, patas, cola, pupilas, tipo: 'lobo', alto: 1.3 };
}
// fantasmita de sábana con ojitos (de colores pastel)
function crearFantasma(color) {
  const g = new THREE.Group(), cuerpo = new THREE.Group(), vista = new THREE.Group(); g.add(cuerpo, vista);
  const m = mat(color, { transparent: true, opacity: .92, roughness: .35, emissive: color, emissiveIntensity: .15 });
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(.42, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2), m); cabeza.position.y = .9; cuerpo.add(cabeza);
  const falda = new THREE.CylinderGeometry(.42, .5, .6, 22, 1, true);
  const pos = falda.attributes.position;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0) { const a = Math.atan2(pos.getZ(i), pos.getX(i)); pos.setY(i, pos.getY(i) + Math.sin(a * 6) * .08); }
  falda.computeVertexNormals();
  const fm = new THREE.Mesh(falda, m); fm.material.side = THREE.DoubleSide; fm.position.y = .6; cuerpo.add(fm);
  [-1, 1].forEach(s => { const c = bola(.06, mat(0xff8fab, { transparent: true, opacity: .7 }), s * .22, .78, .36); c.scale.z = .4; cuerpo.add(c); });
  const brazos = [-1, 1].map(s => { const b = bola(.1, m, s * .46, .66, .05); cuerpo.add(b); return b; });
  const vOjos = new THREE.Group(); vOjos.position.set(0, .95, .3); vista.add(vOjos);
  const pupilas = ojos(vOjos, .14, 0, .06, .1);
  return { g, cuerpo, vista, mats: [m], patas: brazos, pupilas, tipo: 'fantasma', alto: 1.35 };
}
// queso: un trocito triangular con huequitos
const quesoGeo = (() => {
  const s = new THREE.Shape(); s.moveTo(-.3, -.18); s.lineTo(.32, -.18); s.lineTo(-.3, .2); s.lineTo(-.3, -.18);
  const g = new THREE.ExtrudeGeometry(s, { depth: .22, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 2 });
  g.center(); return g;
})();
const quesoMat = mat(0xffd23f, { roughness: .45, emissive: 0x6b5200, emissiveIntensity: .15 });
const estrellaGeo = (() => {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? .2 : .48, a = i / 10 * Math.PI * 2 + Math.PI / 2; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
  const g = new THREE.ExtrudeGeometry(s, { depth: .16, bevelEnabled: true, bevelSize: .05, bevelThickness: .05, bevelSegments: 2 }); g.center(); return g;
})();
const estrellaMat = mat(0xffe27a, { emissive: 0xffb703, emissiveIntensity: .7, metalness: .3, roughness: .25 });

// ---------- estado ----------
const state = {
  modo: (() => { try { return localStorage.getItem('bl-laberinto-modo') || 'peque'; } catch (e) { return 'peque'; } })(),
  nivel: 0, jugando: false, pausa: 0, g: null, w: 0, h: 0, quesos: [], estrellas: [], carteles: [], meta: 0, comidos: 0,
  vidas: 3, poder: 0, monedas: 0, mision: null, enemigos: [], pj: null, inicio: null, casita: null, t: 0,
};
let nivelGrupo = null, actors = [];
const actor = () => actors[P.two ? P.turn % 2 : 0];
const cfg = () => MODOS[state.modo];
const mundo = (x, y) => new THREE.Vector3((x - (state.w - 1) / 2) * C, 0, (y - (state.h - 1) / 2) * C);
const libre = (x, y) => y >= 0 && y < state.h && x >= 0 && x < state.w && !state.g[y][x];

function message(text, secs = 1.6) {
  const el = $('#mensaje'); el.textContent = text;
  el.classList.remove('ver'); void el.offsetWidth; el.classList.add('ver');
  clearTimeout(message.t); message.t = setTimeout(() => el.classList.remove('ver'), secs * 1000);
}
function updatePlayer() { const p = J.player(); $('#jugador').innerHTML = `${J.CHARS[p.char]?.emoji || '⭐'} ${J.esc(p.name)} · ⭐ ${p.stars}`; }
function hud() {
  $('#nivel-num').textContent = state.nivel + 1;
  $('#vidas').textContent = '❤️'.repeat(Math.max(0, state.vidas)) + '🤍'.repeat(Math.max(0, 3 - state.vidas));
  $('#quesos').textContent = Math.max(0, state.meta - state.comidos);
}

// ---------- construir un nivel ----------
async function armarNivel(i) {
  if (nivelGrupo) { scene.remove(nivelGrupo); nivelGrupo.traverse(o => { if (o.geometry && o.geometry !== quesoGeo && o.geometry !== estrellaGeo) o.geometry.dispose(); }); }
  nivelGrupo = new THREE.Group(); scene.add(nivelGrupo);
  const N = NIVELES[i], w = N.w, h = N.h, rnd = semilla(i * 7919 + 13);
  const g = hacerLaberinto(w, h, rnd);
  let cx = Math.floor(w / 2); if (cx % 2 === 0) cx--;
  let cy = Math.floor(h / 2); if (cy % 2 === 0) cy--;
  // casita de los perseguidores en el centro, y ella empieza abajo
  for (let x = cx - 1; x <= cx + 1; x++) g[cy][x] = 0;
  Object.assign(state, { g, w, h, nivel: i, quesos: [], estrellas: [], carteles: [], comidos: 0, poder: 0, mision: null, terminado: false });
  state.inicio = { x: cx, y: h - 2 }; state.casita = { x: cx, y: cy };

  // pasto con caminitos más claros y arbustos de flores como paredes
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(w * C, h * C), new THREE.MeshLambertMaterial({ color: 0xf6e7c1 }));
  piso.rotation.x = -Math.PI / 2; piso.position.y = .01; piso.receiveShadow = true; nivelGrupo.add(piso);
  const muros = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[y][x]) muros.push([x, y]);
  const muro = new THREE.InstancedMesh(new THREE.BoxGeometry(C * .98, 1.1, C * .98), new THREE.MeshLambertMaterial({ color: 0x4cb87a }), muros.length);
  const flores = new THREE.InstancedMesh(new THREE.SphereGeometry(.14, 8, 6), new THREE.MeshLambertMaterial({ color: 0xffffff }), muros.length * 2);
  const m4 = new THREE.Matrix4(), col = new THREE.Color(), cf = [0xff7eb6, 0xffd23f, 0xffffff, 0xb07de8];
  muros.forEach(([x, y], k) => {
    const p = mundo(x, y);
    m4.makeTranslation(p.x, .55, p.z); muro.setMatrixAt(k, m4);
    muro.setColorAt(k, col.setHSL(.36 + (rnd() - .5) * .04, .45, .42 + rnd() * .06));
    for (let j = 0; j < 2; j++) { m4.makeTranslation(p.x + (rnd() - .5) * 1.4, 1.14, p.z + (rnd() - .5) * 1.4); flores.setMatrixAt(k * 2 + j, m4); flores.setColorAt(k * 2 + j, col.set(cf[(k + j) % 4])); }
  });
  muro.castShadow = true; muro.receiveShadow = true; nivelGrupo.add(muro, flores);
  // casita de los perseguidores (una alfombra con techito)
  const cp = mundo(cx, cy);
  const alfombra = new THREE.Mesh(new THREE.PlaneGeometry(C * 3, C * .9), new THREE.MeshLambertMaterial({ color: 0xd7c4ff }));
  alfombra.rotation.x = -Math.PI / 2; alfombra.position.set(cp.x, .02, cp.z); nivelGrupo.add(alfombra);

  // estrellas de poder en las cuatro esquinas
  [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]].forEach(([x, y]) => {
    const e = new THREE.Mesh(estrellaGeo, estrellaMat); const p = mundo(x, y); e.position.set(p.x, .8, p.z); e.castShadow = true;
    nivelGrupo.add(e); state.estrellas.push({ x, y, mesh: e, comida: false });
  });
  // quesos en todos los caminos
  const lugares = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (g[y][x]) continue;
    if (y === cy && Math.abs(x - cx) <= 1) continue;
    if (x === state.inicio.x && y === state.inicio.y) continue;
    if (state.estrellas.some(e => e.x === x && e.y === y)) continue;
    lugares.push([x, y]);
  }
  const quesos = new THREE.InstancedMesh(quesoGeo, quesoMat, lugares.length);
  quesos.castShadow = true;
  lugares.forEach(([x, y], k) => { state.quesos.push({ x, y, k, comido: false, fase: rnd() * 6 }); });
  nivelGrupo.add(quesos); state.quesosMesh = quesos;
  // algunos quesos llevan un letrero con una sílaba (para leer)
  const silabas = J.shuffle(J.palabras('memoria_silabas').map(w => w[0]).filter(s => s.length >= 2));
  const lejos = J.shuffle(state.quesos.filter(q => Math.abs(q.x - state.inicio.x) + Math.abs(q.y - state.inicio.y) > 3));
  lejos.slice(0, Math.min(cfg().carteles, silabas.length)).forEach((q, k) => {
    q.silaba = silabas[k];
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tarjeta(q.silaba, { color: '#ff7eb6' }), depthTest: true }));
    const p = mundo(q.x, q.y); s.position.set(p.x, 1.7, p.z); s.scale.set(1.3, 1.3, 1);
    nivelGrupo.add(s); q.cartel = s; state.carteles.push(q);
  });
  state.meta = Math.max(1, Math.round(state.quesos.length * cfg().meta));
  dibujarQuesos();

  // los perseguidores
  state.enemigos.forEach(e => scene.remove(e.g));
  state.enemigos = N.enemigos.map((tipo, k) => {
    const e = tipo === 'lobo' ? crearLobo() : crearFantasma(COLORES_FANTASMA[(k - 1) % COLORES_FANTASMA.length]);
    e.mats.forEach(m => { m.userData.color = m.color.getHex(); });
    scene.add(e.g);
    return Object.assign(e, { mente: MENTES[k % MENTES.length], estado: 'casa', salida: (k * 3 + 2) * (state.modo === 'peque' ? 1.6 : 1), esquina: k, cambio: 0 });
  });
  colocarTodos();
  hud();
  const cam = mundo(state.inicio.x, state.inicio.y); camera.position.set(cam.x, 18, cam.z + 10); camera.lookAt(cam);
}
function dibujarQuesos() {
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
  for (const q of state.quesos) {
    const w = mundo(q.x, q.y);
    const t = state.t + q.fase;
    p.set(w.x, .45 + Math.sin(t * 2.4) * .06, w.z);
    q4.setFromEuler(e.set(-1.15, 0, t * .9));
    s.setScalar(q.comido ? 0 : q.silaba ? 1.5 : 1);
    state.quesosMesh.setMatrixAt(q.k, m4.compose(p, q4, s));
  }
  state.quesosMesh.instanceMatrix.needsUpdate = true;
}
// cada uno vuelve a su lugar de partida
function colocarTodos() {
  const pj = { x: state.inicio.x, y: state.inicio.y, dir: [0, 0], quiere: [0, -1], de: null, a: null, rot: Math.PI };
  state.pj = pj;
  state.enemigos.forEach((e, k) => {
    const x = state.casita.x + [0, -1, 1, 0][k % 4], y = state.casita.y;
    Object.assign(e, { x, y, dir: [0, 0], de: null, a: null, estado: e.estado === 'fuera' || e.estado === 'susto' || e.estado === 'vuelve' ? 'casa' : e.estado, espera: e.salida });
    const p = mundo(x, y); e.g.position.set(p.x, 0, p.z);
  });
}

// ---------- movimiento por cuadritos ----------
function pos(ent) {
  if (!ent.a) return { x: ent.x, y: ent.y };
  return { x: ent.de.x + (ent.a.x - ent.de.x) * ent.k, y: ent.de.y + (ent.a.y - ent.de.y) * ent.k };
}
function avanzar(ent, vel, dt, decidir) {
  let paso = vel * dt;
  for (let guard = 0; guard < 4 && paso > 0; guard++) {
    if (!ent.a) {
      const d = decidir(ent);
      if (!d || !libre(ent.x + d[0], ent.y + d[1])) { ent.dir = [0, 0]; return; }
      ent.dir = d; ent.de = { x: ent.x, y: ent.y }; ent.a = { x: ent.x + d[0], y: ent.y + d[1] }; ent.k = 0;
    }
    const falta = 1 - ent.k;
    if (paso < falta) { ent.k += paso; return; }
    paso -= falta; ent.x = ent.a.x; ent.y = ent.a.y; ent.a = null;
    if (ent.alLlegar) ent.alLlegar(ent);
  }
}
// ella: gira apenas puede hacia donde pidió (el giro se guarda un ratito)
function decidirPj(pj) {
  if (pj.quiere && libre(pj.x + pj.quiere[0], pj.y + pj.quiere[1])) return pj.quiere;
  if (libre(pj.x + pj.dir[0], pj.y + pj.dir[1])) return pj.dir;
  return null;
}
function pedirDir(d) {
  const pj = state.pj; if (!pj) return;
  pj.quiere = d;
  // dar media vuelta en medio del pasillo
  if (pj.a && d[0] === -pj.dir[0] && d[1] === -pj.dir[1] && (d[0] || d[1])) {
    const de = pj.de; pj.de = pj.a; pj.a = de; pj.k = 1 - pj.k; pj.dir = d; pj.x = pj.de.x; pj.y = pj.de.y;
  }
}
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
function decidirEnemigo(e) {
  const pj = pos(state.pj);
  const op = LISTA_DIRS.filter(d => libre(e.x + d[0], e.y + d[1]));
  let cand = op.filter(d => !(d[0] === -e.dir[0] && d[1] === -e.dir[1]));
  if (!cand.length) cand = op;
  if (!cand.length) return null;
  let meta;
  if (e.estado === 'vuelve') meta = state.casita;
  else if (e.estado === 'susto') {
    // escapa: elige el camino que lo aleja más de ella
    return cand.slice().sort((a, b) => dist2({ x: e.x + b[0], y: e.y + b[1] }, pj) - dist2({ x: e.x + a[0], y: e.y + a[1] }, pj))[0];
  } else {
    const c = cfg();
    const lejos = Math.sqrt(dist2(e, pj)) > c.cerca;
    if (Math.random() < c.azar || e.mente === 'pasear' || (lejos && e.mente === 'perseguir' && state.modo === 'peque')) return cand[Math.floor(Math.random() * cand.length)];
    if (e.mente === 'adelantar') { const d = state.pj.dir; meta = { x: pj.x + d[0] * 3, y: pj.y + d[1] * 3 }; }
    else if (e.mente === 'patrullar') {
      const es = [[1, 1], [state.w - 2, 1], [state.w - 2, state.h - 2], [1, state.h - 2]][e.esquina % 4];
      meta = Math.sqrt(dist2(e, pj)) < 4 ? pj : { x: es[0], y: es[1] };
    } else meta = pj;
  }
  return cand.slice().sort((a, b) => dist2({ x: e.x + a[0], y: e.y + a[1] }, meta) - dist2({ x: e.x + b[0], y: e.y + b[1] }, meta))[0];
}

// ---------- reglas ----------
function comer() {
  if (state.terminado) return;
  const pj = state.pj;
  for (const q of state.quesos) {
    if (q.comido || q.x !== pj.x || q.y !== pj.y) continue;
    q.comido = true; state.comidos++;
    J.sfx('pop', .5, 1.2 + (state.comidos % 6) * .05);
    if (q.cartel) { nivelGrupo.remove(q.cartel); q.cartel = null; probarSilaba(q); }
    hud();
    if (state.comidos >= state.meta) return nivelListo();
  }
  for (const e of state.estrellas) {
    if (e.comida || e.x !== pj.x || e.y !== pj.y) continue;
    e.comida = true; e.mesh.visible = false;
    darPoder();
  }
}
function darPoder() {
  state.poder = cfg().poder;
  J.efecto('festejo'); J.sparkle && J.sparkle();
  fx.burst(actor().group.position.clone().setY(1.4), 50, 1);
  message('⭐ ¡Ahora tú los asustas!', 2); J.say('¡Ahora tú los asustas!');
  state.enemigos.forEach(e => { if (e.estado === 'fuera') { e.estado = 'susto'; e.dir = [-e.dir[0], -e.dir[1]]; } });
  $('#poder').hidden = false;
}
function probarSilaba(q) {
  if (!state.mision) return;
  if (q.silaba === state.mision) {
    state.monedas += 10; J.festejo && J.festejo(6); J.moneda(); J.addStar(); updatePlayer();
    J.say([q.silaba, J.pick(J.PRAISES)]);
    message('¡' + q.silaba + '! ⭐', 1.6);
    nuevaMision();
  } else {
    J.say(['Ese dice', q.silaba]);
    if (!state.carteles.some(c => !c.comido && c.silaba === state.mision)) nuevaMision();
  }
}
function nuevaMision() {
  const quedan = state.carteles.filter(c => !c.comido);
  if (!quedan.length) { state.mision = null; $('#mision').hidden = true; return; }
  state.mision = J.pick(quedan).silaba;
  $('#m-word').textContent = state.mision;
  const box = $('#mision'); box.hidden = false; box.classList.remove('nuevo'); void box.offsetWidth; box.classList.add('nuevo');
  setTimeout(() => state.mision && J.say(['Come el queso que dice', state.mision]), 900);
}
$('#m-say').onclick = () => state.mision && J.say(['Come el queso que dice', state.mision]);

function choques() {
  const p = pos(state.pj);
  for (const e of state.enemigos) {
    if (e.estado === 'casa' || e.estado === 'vuelve') continue;
    const q = pos(e);
    if (dist2(p, q) > .42) continue;
    if (e.estado === 'susto') {
      // ¡lo mandó a su casita!
      e.estado = 'vuelve'; e.dir = [0, 0];
      state.monedas += 5; J.moneda(); fx.burst(e.g.position.clone().setY(1), 40, .8);
      J.say(e.tipo === 'lobo' ? '¡Auuu!' : '¡Buuu!'); message(e.tipo === 'lobo' ? '¡Auuu! 🐺' : '¡Buuu! 👻', 1.2);
    } else return atrapada();
  }
}
function atrapada() {
  state.jugando = false; state.vidas--;
  J.efecto('error'); J.say('¡Uy!'); message('¡Uy! 💫', 1.4);
  state.golpe = 1.2; hud();
  setTimeout(() => {
    if (state.vidas <= 0) {
      // sin sustos: se vuelve a empezar el nivel con todos los corazones
      J.say(['¡Casi!', 'Prueba otra vez']); message('¡Casi! Otra vez 💪', 2);
      state.vidas = 3; armarNivel(state.nivel).then(() => arrancar(true));
      return;
    }
    colocarTodos();
    const seguir = () => arrancar(false);
    P.two ? J.nextTurn(seguir, { onShow: swapActor }) : seguir();
  }, 1300);
}
function nivelListo() {
  if (state.terminado) return;
  state.terminado = true; state.jugando = false;
  J.cheer(true); J.confetti(120); actor().update && (state.fiesta = 3);
  message('¡Todos los quesos! 🧀', 2.4); J.say('¡Todos los quesos!');
  J.addStar(); updatePlayer();
  if (!state.regalo) { P.level.laberinto = Math.max(P.level.laberinto || 0, state.nivel + 1); J.save(); }
  state.regalo = false;
  setTimeout(() => J.gift(() => {
    const sig = Math.min(state.nivel + 1, NIVELES.length - 1);
    state.vidas = 3; armarNivel(sig).then(() => arrancar(true));
  }), 2400);
}
function arrancar(nuevo) {
  state.jugando = true; state.pausa = 1.2;
  if (nuevo) {
    message(NIVELES[state.nivel].nombre, 2);
    const hay = NIVELES[state.nivel].enemigos;
    J.say(hay.length > 1 ? ['¡Cuidado con el lobo!', '¡Un fantasma!'] : '¡Cuidado con el lobo!');
    setTimeout(nuevaMision, 2200);
  }
  hud();
}

// ---------- controles: flechas, deslizar el dedo y joystick ----------
const TECLAS = { arrowup: 'arriba', w: 'arriba', arrowdown: 'abajo', s: 'abajo', arrowleft: 'izquierda', a: 'izquierda', arrowright: 'derecha', d: 'derecha' };
addEventListener('keydown', e => { const k = TECLAS[e.key.toLowerCase()]; if (k) { e.preventDefault(); pedirDir(DIRS[k]); } });
let toque = null;
$('#mundo').addEventListener('pointerdown', e => { toque = { x: e.clientX, y: e.clientY }; });
$('#mundo').addEventListener('pointermove', e => {
  if (!toque) return;
  const dx = e.clientX - toque.x, dy = e.clientY - toque.y;
  if (Math.hypot(dx, dy) < 24) return;
  pedirDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIRS.derecha : DIRS.izquierda) : (dy > 0 ? DIRS.abajo : DIRS.arriba));
  toque = { x: e.clientX, y: e.clientY };
});
addEventListener('pointerup', () => { toque = null; });
const joy = $('#joy'), knob = $('#knob');
let joyId = null;
function joyMove(e) {
  const r = joy.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  const max = r.width / 2 - 10, len = Math.hypot(dx, dy); if (len > max) { dx *= max / len; dy *= max / len; }
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
  if (len > 14) pedirDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIRS.derecha : DIRS.izquierda) : (dy > 0 ? DIRS.abajo : DIRS.arriba));
}
joy.addEventListener('pointerdown', e => { joyId = e.pointerId; joy.setPointerCapture(e.pointerId); joyMove(e); });
joy.addEventListener('pointermove', e => { if (e.pointerId === joyId) joyMove(e); });
const joyFin = () => { joyId = null; knob.style.transform = ''; };
joy.addEventListener('pointerup', joyFin); joy.addEventListener('pointercancel', joyFin);

// ---------- cada cuadro ----------
const tmp = new THREE.Vector3();
W.onFrame((dt, t) => {
  if (!state.g) return;
  state.t = t;
  const pausado = window.JUEGO_PAUSADO || !state.jugando;
  if (!pausado && state.pausa > 0) state.pausa -= dt;
  const corre = !pausado && state.pausa <= 0;
  const c = cfg();
  // ella
  const pj = state.pj, a = actor();
  if (corre) { avanzar(pj, c.pj, dt, decidirPj); comer(); }
  const pp = pos(pj), wp = mundo(pp.x, pp.y);
  if (a) {
    a.group.position.set(wp.x, 0, wp.z);
    if (pj.dir[0] || pj.dir[1]) { const r = Math.atan2(pj.dir[0], pj.dir[1]); let d = r - a.group.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); a.group.rotation.y += d * Math.min(1, dt * 14); }
    if (state.golpe > 0) { state.golpe -= dt; a.group.rotation.y += dt * 12; }
    state.fiesta = (state.fiesta || 0) - dt;
    a.update(dt, state.fiesta > 0 ? 'festejar' : (corre && pj.a) ? 'correr' : 'quieto', .9);
  }
  // poder de estrella
  if (state.poder > 0 && corre) {
    state.poder -= dt;
    $('#poder-barra').style.width = Math.max(0, state.poder / c.poder * 100) + '%';
    if (state.poder <= 0) { state.enemigos.forEach(e => { if (e.estado === 'susto') e.estado = 'fuera'; }); $('#poder').hidden = true; J.say('¡Se acabó el poder!'); }
  }
  // perseguidores
  const vel = c.en + state.nivel * c.sube;
  for (const e of state.enemigos) {
    if (corre) {
      if (e.estado === 'casa') { e.espera -= dt; if (e.espera <= 0) e.estado = 'fuera'; }
      else {
        const v = e.estado === 'vuelve' ? vel * 2.2 : e.estado === 'susto' ? vel * .55 : vel;
        avanzar(e, v, dt, decidirEnemigo);
        if (e.estado === 'vuelve' && e.x === state.casita.x && e.y === state.casita.y && !e.a) { e.estado = 'casa'; e.espera = 2.5; }
      }
    }
    const ep = pos(e), w = mundo(ep.x, ep.y);
    e.g.position.x = w.x; e.g.position.z = w.z;
    if (e.dir[0] || e.dir[1]) e.g.rotation.y = Math.atan2(e.dir[0], e.dir[1]);
    // cómo se ve: normal, asustado (pálido y temblando) o solo ojitos volviendo a casa
    const susto = e.estado === 'susto', vuelve = e.estado === 'vuelve';
    const parpadea = susto && state.poder < 2 && Math.floor(t * 6) % 2;
    e.mats.forEach(m => m.color.setHex(susto ? (parpadea ? 0xffffff : 0xa9c8ff) : m.userData.color));
    e.cuerpo.visible = !vuelve;
    e.cuerpo.rotation.z = susto ? Math.sin(t * 30) * .08 : 0;
    if (e.tipo === 'fantasma') { e.g.position.y = .15 + Math.sin(t * 3 + e.esquina) * .1; e.patas.forEach((b, i) => { b.position.y = .66 + Math.sin(t * 5 + i * 3) * .06; }); }
    else { e.g.position.y = 0; e.patas.forEach((p, i) => { p.rotation.x = (corre && e.a) ? Math.sin(t * 12 + i * Math.PI) * .5 : 0; }); e.cola.rotation.y = Math.sin(t * 8) * .4; }
    // las pupilas miran hacia ella
    e.pupilas.forEach(pu => { pu.position.x = pu.userData.x0 ?? (pu.userData.x0 = pu.position.x); pu.position.x = pu.userData.x0 + Math.sign(wp.x - w.x) * .02; });
  }
  if (corre) choques();
  // quesos y estrellas que brillan
  dibujarQuesos();
  state.estrellas.forEach((s, i) => { s.mesh.rotation.y = t * 2 + i; s.mesh.position.y = .8 + Math.sin(t * 3 + i) * .12; });
  state.carteles.forEach(q => { if (q.cartel) q.cartel.position.y = 1.7 + Math.sin(t * 2.5 + q.fase) * .08; });
  fx.update(dt);
  // cámara que sigue desde arriba
  const narrow = innerWidth / innerHeight < .8;
  const alto = narrow ? 21 : 15, atras = narrow ? 8 : 9.5;
  tmp.set(wp.x * (narrow ? .9 : .8), alto, wp.z + atras);
  camera.position.lerp(tmp, Math.min(1, dt * 4));
  camera.lookAt(wp.x * (narrow ? .9 : .8), 0, wp.z - .5);
  sun.position.set(wp.x + 6, 16, wp.z + 8); sun.target.position.set(wp.x, 0, wp.z);
});

// ---------- personajes y portada ----------
async function hacerActores() {
  actors.forEach(a => scene.remove(a.group)); actors = [];
  const ids = P.two ? [P.players[0].char, P.players[1].char] : [P.players[0].char];
  for (const id of ids) {
    const a = await crearPersonaje(id);
    a.group.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(a.group), alto = (b.max.y - b.min.y) || 2;
    a.group.scale.multiplyScalar(1.5 / alto);
    a.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(a.group); actors.push(a);
  }
  swapActor();
}
function swapActor() { actors.forEach(a => { a.group.visible = a === actor(); }); updatePlayer(); }

async function empezar(i) {
  state.regalo = J.regaloActivo && J.regaloActivo('laberinto') === i && i > (P.level.laberinto || 0);
  if (state.regalo) J.usarRegalo('laberinto');
  $('#portada').hidden = true;
  J.audio(); J.startMusic();
  state.vidas = 3; state.monedas = 0;
  await armarNivel(i);
  const go = () => arrancar(true);
  P.two ? J.showTurn(go, { onShow: swapActor }) : go();
}
function portada() {
  const reg = J.regaloActivo ? J.regaloActivo('laberinto') : null;
  const unlocked = Math.min(NIVELES.length, Math.max((P.level.laberinto || 0) + 1, reg != null ? reg + 1 : 0));
  let sel = reg != null && reg < NIVELES.length ? reg : unlocked - 1;
  const box = $('#niveles');
  const pintar = () => {
    box.innerHTML = NIVELES.map((n, i) => `<button data-i="${i}" title="${n.nombre}" ${i >= unlocked ? 'disabled aria-label="Nivel bloqueado"' : ''} class="${i === sel ? 'on' : ''}">${i < unlocked ? i + 1 : '🔒'}</button>`).join('');
    $('#nivel-desc').textContent = NIVELES[sel].nombre + ' · ' + (NIVELES[sel].enemigos.length > 1 ? `el lobo y ${NIVELES[sel].enemigos.length - 1} fantasma${NIVELES[sel].enemigos.length > 2 ? 's' : ''}` : 'solo el lobo');
    [...$('#modos').children].forEach(b => b.classList.toggle('on', b.dataset.m === state.modo));
  };
  pintar();
  box.onclick = e => { const b = e.target.closest('[data-i]'); if (!b || b.disabled) return; sel = +b.dataset.i; pintar(); J.sfx('pop'); };
  $('#modos').onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; state.modo = b.dataset.m; try { localStorage.setItem('bl-laberinto-modo', state.modo); } catch (er) {} pintar(); J.sfx('pop'); };
  const go = $('#empezar'); go.disabled = false; go.textContent = '▶ ¡A jugar!';
  go.onclick = () => empezar(sel);
}

(async () => {
  await esperaFuente();
  await J.ready;
  await hacerActores();
  await armarNivel(0);
  W.start(); J.refreshMusic();
  portada();
  if (TEST) {
    window.__lab = {
      state, NIVELES, empezar, pedirDir, darPoder, armarNivel, pos,
      dir: DIRS,
      // lleva a la niña a un cuadrito
      ir(x, y) { Object.assign(state.pj, { x, y, a: null, dir: [0, 0] }); },
      comerTodo() { state.quesos.forEach(q => { if (!q.comido && !state.terminado) { state.pj.x = q.x; state.pj.y = q.y; state.pj.a = null; comer(); } }); },
      enemigoA(k, x, y, estado) { const e = state.enemigos[k]; Object.assign(e, { x, y, a: null, estado: estado || e.estado }); },
    };
    empezar(0);
  }
})();
