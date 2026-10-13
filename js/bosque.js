// Bosque de las Palabras — laberinto 3D con misiones de lectura.
// Se lee la palabra de la misión y hay que encontrar el animalito u objeto escondido
// en una cajita, un árbol o un arbusto, caminando por las callecitas.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { crearMundo, chispitas, esperaFuente, tarjeta } from './mundo3d.js';
import { crearPersonaje, crearObjeto, BUSCABLES } from './personajes.js';

const J = window.Juego, P = J.progress;
const $ = s => document.querySelector(s);
const C = 5;                       // tamaño de cada cuadra del laberinto
const PLAYER_R = .45, SPEED = 4.2;

// Niveles: cada vez más grande y con más pistas que leer
const NIVELES = [
  { n: 4, spots: 4, missions: 3, tipo: 'palabra', dibujo: true },
  { n: 5, spots: 5, missions: 3, tipo: 'palabra', dibujo: false },
  { n: 6, spots: 6, missions: 3, tipo: 'palabra', dibujo: false },
  { n: 6, spots: 6, missions: 3, tipo: 'silaba' },
  { n: 7, spots: 7, missions: 4, tipo: 'palabra', dibujo: false },
  { n: 8, spots: 8, missions: 4, tipo: 'mezcla' },
];
const ITEMS = BUSCABLES.map(w => J.WORDS.find(x => x[0] === w)).filter(Boolean); // [palabra, sílabas, emoji]

// ---------- mundo ----------
const W = crearMundo($('#mundo'), { fog: 0xe9f8ff, near: 30, far: 75, fov: 50 });
const { scene, camera, sun } = W;
W.fovFor = a => a < .8 ? 62 : 50;
const fx = chispitas(scene);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: 0x8fd46a }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

function tex(w, h, draw, rep = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); return t;
}
const hedgeTex = tex(128, 128, (g, w, h) => {
  g.fillStyle = '#3f9b4a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { g.fillStyle = ['#4cb85a', '#358a3f', '#5ccb68', '#2f7d38'][i % 4]; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 5 + Math.random() * 7, 0, 7); g.fill(); }
});
const pathTex = tex(128, 128, (g, w, h) => {
  g.fillStyle = '#efe2c4'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) { g.fillStyle = ['#e3d2ac', '#f6ecd4', '#dcc89c'][i % 3]; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 8 + Math.random() * 8, 6 + Math.random() * 6, Math.random() * 3, 0, 7); g.fill(); }
});

// modelos de Kenney para decorar alrededor (casitas y árboles)
const loader = new GLTFLoader();
const glb = u => new Promise(ok => loader.load(u, g => ok(g), undefined, () => ok(null)));
const deco = {};
function fit(obj, height) {
  const b = new THREE.Box3().setFromObject(obj), s = height / (b.getSize(new THREE.Vector3()).y || 1);
  obj.scale.multiplyScalar(s);
  const b2 = new THREE.Box3().setFromObject(obj); obj.position.y -= b2.min.y;
  const g = new THREE.Group(); g.add(obj);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// ---------- estado ----------
const state = {
  nivel: 0, maze: null, walls: [], spots: [], missions: [], mi: 0, brillos: 0,
  pos: new THREE.Vector3(), dir: 0, path: [], joy: new THREE.Vector2(), keys: {}, moving: false,
  lastFound: 0, playing: false, celebrate: 0, hada: null, hadaOn: false,
};
let level = null;            // grupo con todo lo del nivel
let actors = [];             // personajes de los jugadores
const actor = () => actors[P.two ? P.turn % 2 : 0];

// ---------- laberinto ----------
function genMaze(n) {
  // walls[r][c] = { n, s, e, w } ; fila 0 = la más cercana a la cámara
  const cells = Array.from({ length: n }, () => Array.from({ length: n }, () => ({ n: true, s: true, e: true, w: true, seen: false })));
  const stack = [[0, 0]]; cells[0][0].seen = true;
  const dirs = [['n', 1, 0, 's'], ['s', -1, 0, 'n'], ['e', 0, 1, 'w'], ['w', 0, -1, 'e']];
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const opts = dirs.filter(([, dr, dc]) => cells[r + dr]?.[c + dc] && !cells[r + dr][c + dc].seen);
    if (!opts.length) { stack.pop(); continue; }
    const [d, dr, dc, back] = opts[Math.floor(Math.random() * opts.length)];
    cells[r][c][d] = false; cells[r + dr][c + dc][back] = false; cells[r + dr][c + dc].seen = true;
    stack.push([r + dr, c + dc]);
  }
  // abrir algunas paredes extra: caminos con vueltas, más fácil para niños
  for (let k = 0; k < Math.floor(n * n / 6); k++) {
    const r = 1 + Math.floor(Math.random() * (n - 2)), c = Math.floor(Math.random() * (n - 1));
    cells[r][c].e = false; cells[r][c + 1].w = false;
  }
  return cells;
}
const cellPos = (r, c, n) => new THREE.Vector3((c - (n - 1) / 2) * C, 0, ((n - 1) / 2 - r) * C);
const posCell = (p, n) => [Math.round((n - 1) / 2 - p.z / C), Math.round(p.x / C + (n - 1) / 2)];
function neighbors(cells, r, c) {
  const out = [], cl = cells[r][c];
  if (!cl.n) out.push([r + 1, c]); if (!cl.s) out.push([r - 1, c]);
  if (!cl.e) out.push([r, c + 1]); if (!cl.w) out.push([r, c - 1]);
  return out;
}
function bfs(cells, from, to) {
  const n = cells.length, key = (r, c) => r * n + c, prev = new Map([[key(...from), null]]), q = [from];
  while (q.length) {
    const [r, c] = q.shift();
    if (r === to[0] && c === to[1]) break;
    for (const [nr, nc] of neighbors(cells, r, c)) if (!prev.has(key(nr, nc))) { prev.set(key(nr, nc), [r, c]); q.push([nr, nc]); }
  }
  const path = []; let cur = to;
  while (cur) { path.unshift(cur); cur = prev.get(key(...cur)); }
  return path[0] && path[0][0] === from[0] && path[0][1] === from[1] ? path : [];
}
function distances(cells) {
  const n = cells.length, d = Array.from({ length: n }, () => Array(n).fill(-1)), q = [[0, 0]]; d[0][0] = 0;
  while (q.length) { const [r, c] = q.shift(); for (const [nr, nc] of neighbors(cells, r, c)) if (d[nr][nc] < 0) { d[nr][nc] = d[r][c] + 1; q.push([nr, nc]); } }
  return d;
}

// ---------- escondites ----------
function makeCaja(color) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, roughness: .5 });
  const rib = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .4 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, .9, 1.1), m); box.position.y = .45; g.add(box);
  [[.16, .92, 1.12], [1.12, .92, .16]].forEach(([x, y, z]) => { const r = new THREE.Mesh(new THREE.BoxGeometry(x, y, z), rib); r.position.y = .45; g.add(r); });
  const lid = new THREE.Group(); lid.position.set(0, .9, -.6); g.add(lid);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.25, .25, 1.25), m); top.position.set(0, .12, .6); lid.add(top);
  const bow = new THREE.Mesh(new THREE.TorusKnotGeometry(.14, .05, 40, 6), rib); bow.position.set(0, .36, .6); lid.add(bow);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { g, open: k => { lid.rotation.x = -k * 1.9; } };
}
function makeArbol() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.25, .35, 1.6, 10), new THREE.MeshStandardMaterial({ color: 0x8a5a3c })); trunk.position.y = .8; g.add(trunk);
  const crown = new THREE.Group(); crown.position.y = 2.1; g.add(crown);
  const leaf = new THREE.MeshStandardMaterial({ color: 0x4fb35b, roughness: .8 });
  [[0, 0, 0, 1.1], [.6, -.3, .2, .75], [-.6, -.2, -.1, .8], [0, .55, 0, .75], [.1, -.2, .6, .7]].forEach(([x, y, z, r]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), leaf); s.position.set(x, y, z); crown.add(s); });
  // manzanitas
  [[.5, .2, .8], [-.7, .1, .6], [.2, .6, .7]].forEach(p => { const a = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), new THREE.MeshStandardMaterial({ color: 0xef3b4a })); a.position.set(...p); crown.add(a); });
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { g, open: k => { crown.rotation.z = Math.sin(k * 20) * .15 * (1 - k); crown.scale.setScalar(1 + Math.sin(k * Math.PI) * .08); } };
}
function makeArbusto() {
  const g = new THREE.Group();
  const leaf = new THREE.MeshStandardMaterial({ color: 0x3fa64f, roughness: .85 });
  [[0, .5, 0, .7], [.5, .4, .1, .5], [-.5, .4, 0, .55], [0, .8, -.1, .5], [.2, .35, .45, .45]].forEach(([x, y, z, r]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), leaf); s.position.set(x, y, z); g.add(s); });
  const flowers = [0xff7eb6, 0xffd23f, 0xffffff];
  for (let i = 0; i < 7; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), new THREE.MeshStandardMaterial({ color: flowers[i % 3] })); const a = i * .9; f.position.set(Math.cos(a) * .6, .5 + (i % 3) * .2, Math.sin(a) * .5 + .1); g.add(f); }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { g, open: k => { g.rotation.z = Math.sin(k * 25) * .12 * (1 - k); g.scale.set(1 + Math.sin(k * Math.PI) * .15, 1 - Math.sin(k * Math.PI) * .1, 1); } };
}

// ---------- hada guía ----------
function makeHada() {
  const g = new THREE.Group();
  const glow = new THREE.Mesh(new THREE.SphereGeometry(.18, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfff6a8 }));
  g.add(glow);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(.38, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfff6a8, transparent: true, opacity: .3 }));
  g.add(halo);
  const wingM = new THREE.MeshBasicMaterial({ color: 0xc9f0ff, transparent: true, opacity: .75, side: THREE.DoubleSide });
  const wings = [-1, 1].map(sx => { const w = new THREE.Mesh(new THREE.CircleGeometry(.28, 16), wingM); w.position.set(sx * .25, .08, 0); w.scale.set(1, .6, 1); g.add(w); return w; });
  g.visible = false; scene.add(g);
  return { g, wings };
}

// ---------- construir un nivel ----------
async function buildLevel(i) {
  if (level) { scene.remove(level); level.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  level = new THREE.Group(); scene.add(level);
  const cfg = NIVELES[i];
  const n = cfg.n;
  const cells = genMaze(n);
  state.maze = cells; state.walls = []; state.spots = []; state.path = [];
  state.nivel = i;

  // piso de caminito
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(n * C, n * C), new THREE.MeshLambertMaterial({ map: pathTex.clone() }));
  floor.material.map.repeat.set(n * 1.5, n * 1.5); floor.material.map.needsUpdate = true;
  floor.rotation.x = -Math.PI / 2; floor.position.y = .01; floor.receiveShadow = true; level.add(floor);

  // paredes de arbustos (instanciadas para que vaya rápido en tablets)
  const segs = [];
  const half = (n * C) / 2;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const p = cellPos(r, c, n), cl = cells[r][c];
    if (cl.n) segs.push([p.x, p.z - C / 2, C + .8, .8]);
    if (cl.e) segs.push([p.x + C / 2, p.z, .8, C + .8]);
    if (r === 0 && cl.s && c !== 0) segs.push([p.x, p.z + C / 2, C + .8, .8]);
    if (c === 0 && cl.w) segs.push([p.x - C / 2, p.z, .8, C + .8]);
  }
  const H = 1.3;
  const hedge = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ map: hedgeTex }), segs.length);
  const m4 = new THREE.Matrix4();
  segs.forEach(([x, z, sx, sz], k) => {
    m4.compose(new THREE.Vector3(x, H / 2, z), new THREE.Quaternion(), new THREE.Vector3(sx, H, sz));
    hedge.setMatrixAt(k, m4);
    state.walls.push({ minX: x - sx / 2, maxX: x + sx / 2, minZ: z - sz / 2, maxZ: z + sz / 2 });
  });
  hedge.castShadow = true; hedge.receiveShadow = true; level.add(hedge);
  // florcitas encima de los arbustos
  const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(.12, 8, 6), new THREE.MeshLambertMaterial({ color: 0xffffff }), segs.length * 2);
  const fcols = [0xff7eb6, 0xffd23f, 0xffffff, 0xb07de8];
  segs.forEach(([x, z, sx, sz], k) => {
    for (let j = 0; j < 2; j++) {
      m4.makeTranslation(x + (Math.random() - .5) * sx * .8, H + .05, z + (Math.random() - .5) * sz * .8);
      fl.setMatrixAt(k * 2 + j, m4); fl.setColorAt(k * 2 + j, new THREE.Color(fcols[(k + j) % 4]));
    }
  });
  level.add(fl);

  // entrada con arco de colores
  const start = cellPos(0, 0, n);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.4, .14, 10, 30, Math.PI), new THREE.MeshStandardMaterial({ color: 0xff7eb6 }));
  arch.position.set(start.x, 0, start.z + C / 2); level.add(arch);

  // decoración alrededor: casitas y árboles (callecitas del pueblo)
  const ring = [];
  for (let k = -half - 4; k <= half + 4; k += 4.5) { ring.push([k, -half - 4.5], [k, half + 5], [-half - 4.5, k], [half + 4.5, k]); }
  ring.forEach(([x, z], k) => {
    const keys = ['houseA', 'houseB', 'houseC', 'treesTall', 'trees', 'treesTall'];
    const key = keys[k % keys.length];
    if (!deco[key]) return;
    const o = fit(deco[key].scene.clone(true), key.startsWith('house') ? 3.4 : 3.2);
    o.position.set(x, 0, z); o.lookAt(0, 0, 0); level.add(o);
  });

  // escondites: callejones sin salida, del más lejano al más cercano
  const dist = distances(cells);
  const dead = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (r === 0 && c === 0) continue;
    const cl = cells[r][c], open = ['n', 's', 'e', 'w'].filter(d => !cl[d]);
    dead.push({ r, c, d: dist[r][c], dead: open.length === 1, open });
  }
  dead.sort((a, b) => (b.dead - a.dead) || (b.d - a.d));
  // repartir: tomar de forma salteada para que no estén todos juntos
  const chosen = [];
  for (const cand of dead) {
    if (chosen.length >= cfg.spots) break;
    if (chosen.some(o => Math.abs(o.r - cand.r) + Math.abs(o.c - cand.c) < 2)) continue;
    chosen.push(cand);
  }
  for (const cand of dead) { if (chosen.length >= cfg.spots) break; if (!chosen.includes(cand)) chosen.push(cand); }

  const items = J.shuffle(ITEMS).slice(0, chosen.length);
  const kinds = ['caja', 'arbol', 'arbusto'];
  const boxCols = [0xef5b5b, 0x3f8ee8, 0x9a6ee0, 0xf39a3b, 0x4cb87a, 0xff7eb6];
  chosen.forEach((cand, k) => {
    const p = cellPos(cand.r, cand.c, n);
    // lado cerrado (contra la pared) para dejar libre el camino
    const closed = ['n', 's', 'e', 'w'].filter(d => cells[cand.r][cand.c][d]);
    const side = closed[0] || 'n';
    const off = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[side];
    const kind = kinds[k % 3];
    const h = kind === 'caja' ? makeCaja(boxCols[k % boxCols.length]) : kind === 'arbol' ? makeArbol() : makeArbusto();
    h.g.position.set(p.x + off[0] * 1.35, 0, p.z + off[1] * 1.35);
    level.add(h.g);
    const obj = crearObjeto(items[k][0]);
    obj.group.visible = false;
    obj.group.position.set(p.x - off[0] * .5 + (off[1] ? 1 : 0), 0, p.z - off[1] * .5 + (off[0] ? .8 : 0));
    obj.group.userData.size = 1.7;
    level.add(obj.group);
    // cartel con la palabra encima del animalito
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tarjeta(items[k][0], { color: '#ffd23f' }), depthTest: false }));
    label.scale.set(1.5, 1.5, 1); label.position.y = 2.6 / 1.7; label.renderOrder = 10;
    obj.group.add(label);
    // anillo brillante para marcar que hay algo
    const ringM = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.3, 32), new THREE.MeshBasicMaterial({ color: 0xfff6a8, transparent: true, opacity: .55, side: THREE.DoubleSide }));
    ringM.rotation.x = -Math.PI / 2; ringM.position.set(h.g.position.x, .03, h.g.position.z); level.add(ringM);
    state.spots.push({ r: cand.r, c: cand.c, word: items[k], kind, h, obj, ring: ringM, opened: false, openK: 0, found: false, center: p });
  });

  // estrellitas por los caminos
  state.brillosObj = [];
  const starGeo = new THREE.OctahedronGeometry(.25);
  const starMat = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x8a6a00, emissiveIntensity: .5, metalness: .3, roughness: .3 });
  for (let k = 0; k < n * 2; k++) {
    const r = Math.floor(Math.random() * n), c = Math.floor(Math.random() * n);
    if (r === 0 && c === 0) continue;
    if (state.spots.some(s => s.r === r && s.c === c)) continue;
    const s = new THREE.Mesh(starGeo, starMat); s.castShadow = true;
    const p = cellPos(r, c, n); s.position.set(p.x + (Math.random() - .5) * 1.5, .7, p.z + (Math.random() - .5) * 1.5);
    level.add(s); state.brillosObj.push(s);
  }

  // misiones
  const pool = state.spots.map(s => s.word);
  const tipo = cfg.tipo;
  state.missions = J.shuffle(pool).slice(0, cfg.missions).map((w, k) => {
    const t = tipo === 'mezcla' ? (k % 2 ? 'silaba' : 'palabra') : tipo;
    return { word: w, tipo: t, dibujo: !!cfg.dibujo };
  });
  // en misiones de sílaba, la sílaba inicial no debe repetirse en otro escondite
  state.missions.forEach(m => {
    if (m.tipo !== 'silaba') return;
    const syl = J.strip(m.word[1].split('-')[0]);
    if (state.spots.filter(s => J.strip(s.word[1].split('-')[0]) === syl).length > 1) m.tipo = 'palabra';
  });
  state.mi = 0;
  $('#metas').innerHTML = state.missions.map(() => '<span class="meta">⭐</span>').join('');

  // jugador en la entrada
  state.pos.copy(start); state.pos.z += 1.2; state.dir = Math.PI;
  camera.position.set(state.pos.x, 11, state.pos.z + 9);
}

// ---------- misiones ----------
const syl0 = w => J.strip(w[1].split('-')[0]);
function showMission() {
  const m = state.missions[state.mi];
  if (!m) return;
  const box = $('#mision');
  if (m.tipo === 'silaba') { $('#m-etq').textContent = 'Empieza con'; $('#m-word').textContent = syl0(m.word); $('#m-pic').textContent = '🔍'; }
  else { $('#m-etq').textContent = 'Busca'; $('#m-word').textContent = m.word[0]; $('#m-pic').textContent = m.dibujo ? m.word[2] : '🔍'; }
  box.hidden = false; box.classList.remove('nuevo'); void box.offsetWidth; box.classList.add('nuevo');
  state.lastFound = performance.now();
  hideHada();
  sayMission();
}
function sayMission() {
  const m = state.missions[state.mi]; if (!m) return;
  if (m.tipo === 'silaba') J.say(['Busca algo que empieza con', syl0(m.word)]);
  else J.say(['Busca:', m.word[1].split('-').join(', '), m.word[0]]);
}
$('#m-say').onclick = sayMission;

function message(text, secs = 1.8) {
  const el = $('#mensaje'); el.textContent = text;
  el.classList.remove('ver'); void el.offsetWidth; el.classList.add('ver');
  clearTimeout(message.t); message.t = setTimeout(() => el.classList.remove('ver'), secs * 1000);
}

function matches(spot, m) {
  if (m.tipo === 'silaba') return syl0(spot.word) === syl0(m.word);
  return spot.word[0] === m.word[0];
}

function openSpot(s) {
  s.opened = true; s.openK = .001;
  s.obj.group.visible = true; s.obj.group.scale.setScalar(.01);
  J.sfx('pop', .8);
  check(s, true);
}
function check(s, fresh) {
  const m = state.missions[state.mi];
  if (!m || s.found) return;
  if (matches(s, m)) {
    s.found = true; s.ring.visible = false;
    state.celebrate = 2.2;
    J.cheer(); fx.burst(s.obj.group.position.clone().add(new THREE.Vector3(0, 1, 0)), 50);
    message('¡Lo encontraste!');
    J.addStar(); updatePlayer();
    $('#metas').children[state.mi].classList.add('on');
    setTimeout(() => J.say([`¡${s.word[1].split('-').join(', ')}! ¡${s.word[0]}!`, J.pick(['¡Muy bien!', '¡Bravo!', `¡Genial, ${J.player().name}!`])], { queue: true }), 600);
    state.mi++;
    hideHada();
    if (state.mi >= state.missions.length) setTimeout(levelDone, 3200);
    else setTimeout(() => J.nextTurn(showMission, { onShow: swapActor }), 3000);
  } else if (fresh) {
    message('¡Casi!', 1.2);
    J.boing();
    const what = s.word[0];
    setTimeout(() => J.say([`Aquí hay: ${what}.`, 'Sigue buscando.'].concat(m.tipo === 'silaba' ? ['Algo que empieza con ' + syl0(m.word)] : [m.word[0]])), 500);
  }
}
function levelDone() {
  state.playing = false;
  P.level.bosque = Math.max(P.level.bosque || 0, state.nivel + 1); J.save();
  J.gift(() => {
    const next = Math.min(state.nivel + 1, NIVELES.length - 1);
    startLevel(next);
  });
}

// ---------- hada ----------
const hada = makeHada();
let hadaPath = [], hadaT = 0;
function showHada() {
  const m = state.missions[state.mi]; if (!m) return;
  const target = state.spots.find(s => !s.found && matches(s, m)); if (!target) return;
  const n = state.maze.length;
  const from = posCell(state.pos, n).map(v => Math.max(0, Math.min(n - 1, v)));
  hadaPath = bfs(state.maze, from, [target.r, target.c]).map(([r, c]) => cellPos(r, c, n));
  if (!hadaPath.length) return;
  hadaPath.push(target.h.g.position.clone());
  hadaT = 0; hada.g.visible = true; state.hadaOn = true;
  J.sparkle(); J.say('¡Sigue al hada!');
}
function hideHada() { hada.g.visible = false; state.hadaOn = false; }
$('#ayuda').onclick = () => { J.sfx('pop'); showHada(); };

// ---------- controles ----------
const joy = $('#joy'), knob = $('#knob');
let joyId = null;
function joyMove(e) {
  const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = e.clientX - cx, dy = e.clientY - cy;
  const max = r.width / 2 - 10, len = Math.hypot(dx, dy);
  if (len > max) { dx *= max / len; dy *= max / len; }
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
  state.joy.set(dx / max, dy / max);
}
joy.addEventListener('pointerdown', e => { joyId = e.pointerId; joy.setPointerCapture(e.pointerId); state.path = []; joyMove(e); e.preventDefault(); });
joy.addEventListener('pointermove', e => { if (e.pointerId === joyId) joyMove(e); });
const joyEnd = () => { joyId = null; knob.style.transform = ''; state.joy.set(0, 0); };
joy.addEventListener('pointerup', joyEnd); joy.addEventListener('pointercancel', joyEnd);
addEventListener('keydown', e => { state.keys[e.key.toLowerCase()] = true; if (e.key.startsWith('Arrow')) e.preventDefault(); });
addEventListener('keyup', e => { state.keys[e.key.toLowerCase()] = false; });

// tocar el camino para caminar hasta ahí
const ray = new THREE.Raycaster(), v2 = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
$('#mundo').addEventListener('pointerdown', e => {
  if (!state.playing) return;
  v2.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(v2, camera);
  if (!ray.ray.intersectPlane(plane, hit)) return;
  const n = state.maze.length;
  const to = posCell(hit, n), from = posCell(state.pos, n);
  if (to[0] < 0 || to[1] < 0 || to[0] >= n || to[1] >= n) return;
  const cells = bfs(state.maze, from, to).map(([r, c]) => cellPos(r, c, n));
  cells.shift();
  cells.push(hit.clone());
  state.path = cells;
  fx.burst(hit.clone().setY(.2), 8, .3);
});

function collide(x, z) {
  for (const w of state.walls) {
    if (x > w.minX - PLAYER_R && x < w.maxX + PLAYER_R && z > w.minZ - PLAYER_R && z < w.maxZ + PLAYER_R) return true;
  }
  return false;
}

function updatePlayer() {
  const p = J.player();
  $('#jugador').innerHTML = `${J.CHARS[p.char]?.emoji || '⭐'} ${J.esc(p.name)} · ⭐ ${p.stars}`;
}
function swapActor() { actors.forEach((a, i) => { a.group.visible = a === actor(); }); updatePlayer(); }

// ---------- bucle ----------
const tmp = new THREE.Vector3();
W.onFrame((dt, t) => {
  if (!state.maze) return;
  let mx = 0, mz = 0;
  if (state.playing && state.celebrate <= 0) {
    const k = state.keys;
    mx = state.joy.x + ((k.arrowright || k.d) ? 1 : 0) - ((k.arrowleft || k.a) ? 1 : 0);
    mz = state.joy.y + ((k.arrowdown || k.s) ? 1 : 0) - ((k.arrowup || k.w) ? 1 : 0);
    if (mx || mz) state.path = [];
    else if (state.path.length) {
      tmp.copy(state.path[0]).sub(state.pos); tmp.y = 0;
      if (tmp.length() < .35) state.path.shift();
      else { tmp.normalize(); mx = tmp.x; mz = tmp.z; }
    }
  }
  const len = Math.hypot(mx, mz);
  state.moving = len > .15;
  if (state.moving) {
    if (len > 1) { mx /= len; mz /= len; }
    const nx = state.pos.x + mx * SPEED * dt, nz = state.pos.z + mz * SPEED * dt;
    if (!collide(nx, state.pos.z)) state.pos.x = nx;
    if (!collide(state.pos.x, nz)) state.pos.z = nz;
    const target = Math.atan2(mx, mz);
    let d = target - state.dir; d = Math.atan2(Math.sin(d), Math.cos(d));
    state.dir += d * Math.min(1, dt * 12);
  }
  const a = actor();
  if (a) {
    a.group.position.copy(state.pos);
    a.group.rotation.y = state.dir;
    state.celebrate -= dt;
    a.update(dt, state.celebrate > 0 ? 'festejar' : state.moving ? 'correr' : 'quieto', .8);
  }

  // escondites
  for (const s of state.spots) {
    const d = Math.hypot(s.h.g.position.x - state.pos.x, s.h.g.position.z - state.pos.z);
    if (state.playing && !s.opened && d < 2.1) openSpot(s);
    else if (state.playing && s.opened && !s.found && d < 2.1) check(s, false);
    if (s.openK > 0 && s.openK < 1) { s.openK = Math.min(1, s.openK + dt * 1.6); s.h.open(s.openK); }
    if (s.obj.group.visible) {
      const full = s.obj.group.userData.size || 1, sc = s.obj.group.scale.x;
      if (sc < full) s.obj.group.scale.setScalar(Math.min(full, sc + dt * 4));
      s.obj.update(dt, s.found);
    }
    s.ring.material.opacity = s.opened ? .15 : .35 + Math.sin(t * 3) * .2;
  }
  // estrellitas
  for (const st of state.brillosObj) {
    if (!st.visible) continue;
    st.rotation.y += dt * 2; st.position.y = .7 + Math.sin(t * 3 + st.position.x) * .1;
    if (Math.hypot(st.position.x - state.pos.x, st.position.z - state.pos.z) < 1) {
      st.visible = false; state.brillos++; $('#brillos').textContent = state.brillos;
      J.sfx('coin', .5, 1 + (state.brillos % 5) * .06);
    }
  }
  // hada: aparece sola si pasa mucho tiempo sin encontrar
  if (state.playing && !state.hadaOn && state.celebrate <= 0 && performance.now() - state.lastFound > 35000) showHada();
  if (hada.g.visible && hadaPath.length) {
    hadaT += dt * 1.2;
    // el hada va un poco adelante de la niña por el camino
    const n = state.maze.length, here = posCell(state.pos, n);
    let idx = hadaPath.findIndex(p => { const [r, c] = posCell(p, n); return r === here[0] && c === here[1]; });
    idx = Math.min(hadaPath.length - 1, (idx < 0 ? 0 : idx) + 1);
    tmp.copy(hadaPath[idx]); tmp.y = 1.8 + Math.sin(t * 4) * .2;
    hada.g.position.lerp(tmp, Math.min(1, dt * 2.5));
    hada.wings.forEach((w, i) => { w.rotation.y = (i ? 1 : -1) * (.4 + Math.sin(t * 25) * .5); });
    if (Math.random() < .3) fx.burst(hada.g.position.clone(), 1, .2);
  }
  fx.update(dt);

  // cámara desde arriba y atrás, siguiendo a la niña
  const narrow = innerWidth / innerHeight < .8;
  tmp.set(state.pos.x, narrow ? 13 : 10.5, state.pos.z + (narrow ? 8.5 : 8));
  camera.position.lerp(tmp, Math.min(1, dt * 4));
  camera.lookAt(state.pos.x, 0, state.pos.z - 1.2);
  sun.position.set(state.pos.x + 6, 14, state.pos.z + 8); sun.target.position.copy(state.pos);
});

// ---------- inicio ----------
async function makeActors() {
  actors.forEach(a => scene.remove(a.group));
  actors = [];
  const ids = P.two ? [P.players[0].char, P.players[1].char] : [P.players[0].char];
  for (const id of ids) { const a = await crearPersonaje(id); a.group.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(a.group); actors.push(a); }
  swapActor();
}
async function startLevel(i) {
  $('#portada').hidden = true;
  await buildLevel(i);
  state.playing = true;
  J.startMusic();
  J.showTurn ? (P.two ? J.showTurn(showMission, { onShow: swapActor }) : showMission()) : showMission();
}

function renderLevels() {
  const unlocked = Math.min(NIVELES.length, (P.level.bosque || 0) + 1);
  let sel = Math.min(unlocked - 1, P.level.bosque || 0);
  const box = $('#niveles');
  box.innerHTML = NIVELES.map((_, i) => `<button data-i="${i}" ${i >= unlocked ? 'disabled aria-label="Nivel bloqueado"' : ''} class="${i === sel ? 'on' : ''}">${i < unlocked ? i + 1 : '🔒'}</button>`).join('');
  box.onclick = e => { const b = e.target.closest('[data-i]'); if (!b || b.disabled) return; sel = +b.dataset.i; [...box.children].forEach((c, k) => c.classList.toggle('on', k === sel)); J.sfx('pop'); };
  return () => sel;
}

(async () => {
  await esperaFuente();
  const keys = { houseA: 'kenney-ciudad/building-small-a.glb', houseB: 'kenney-ciudad/building-small-b.glb', houseC: 'kenney-ciudad/building-small-c.glb', trees: 'kenney-ciudad/grass-trees.glb', treesTall: 'kenney-ciudad/grass-trees-tall.glb' };
  await Promise.all(Object.entries(keys).map(async ([k, f]) => { deco[k] = await glb('assets/modelos/' + f); }));
  await makeActors();
  const getSel = renderLevels();
  // vista de fondo mientras se elige el nivel
  await buildLevel(0);
  W.start();
  J.refreshMusic();
  const go = $('#empezar');
  go.disabled = false; go.textContent = '▶ ¡A buscar!';
  go.onclick = () => startLevel(getSel());
  if (location.hash === '#prueba') { window.__b = state; startLevel(0); }
})();
