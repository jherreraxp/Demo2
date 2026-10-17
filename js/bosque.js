// Bosque de las Palabras — laberinto 3D con retos de lectura.
// Cada cajita de regalo guarda un reto escrito ("gato"). La niña lo lee, busca al animalito
// que pasea por las callecitas y lo guarda en su mochila.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { crearMundo, chispitas, esperaFuente, tarjeta } from './mundo3d.js';
import { crearPersonaje, crearObjeto } from './personajes.js';

const J = window.Juego, P = J.progress;
const $ = s => document.querySelector(s);
const C = 5;                       // tamaño de cada cuadra del laberinto
const PLAYER_R = .45, SPEED = 4.2;

// Niveles: las misiones están cerquita; poco a poco se borra el dibujo y la voz ayuda menos.
// fade: cuánto se borra el dibujo (0 = se ve, 1 = no hay). voz: 'ya' lee al abrir, 'luego' espera
// a que ella lea primero, 'poca' solo si pasa mucho rato, 'solo' = solo voz (escucha y busca).
const NIVELES = [
  { n: 6, objs: 5, missions: 3, tipo: 'palabra', fade: 0, voz: 'ya', nombre: 'Dibujo, palabra y voz' },
  { n: 7, objs: 6, missions: 3, tipo: 'palabra', fade: .55, voz: 'ya', nombre: 'El dibujo se borra un poquito' },
  { n: 7, objs: 6, missions: 4, tipo: 'palabra', fade: 1, voz: 'luego', nombre: 'Sin dibujo: lee tú primero' },
  { n: 8, objs: 7, missions: 4, tipo: 'silaba', fade: 1, voz: 'luego', nombre: '¿Con qué sílaba empieza?' },
  { n: 8, objs: 7, missions: 4, tipo: 'mezcla', fade: 1, voz: 'poca', nombre: 'Casi sin ayuda' },
  { n: 9, objs: 8, missions: 5, tipo: 'palabra', fade: 1, voz: 'solo', nombre: 'Solo voz: escucha y busca' },
];
let ITEMS = []; // [palabra, sílabas, emoji, modelo] (configurable en el modo admin)
// colores de las cajitas, con su nombre para la misión: "Busca la cajita" + "morada"
const CAJAS = [[0x9a6ee0, 'morada', '#9a6ee0'], [0xef5b5b, 'roja', '#ef5b5b'], [0x3f8ee8, 'azul', '#3f8ee8'], [0xf39a3b, 'naranja', '#f39a3b'], [0x4cb87a, 'verde', '#4cb87a'], [0xff7eb6, 'rosada', '#ff7eb6'], [0xf6c33b, 'amarilla', '#e0a800']];

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
  nivel: 0, maze: null, walls: [], boxes: [], objs: [], missions: [], mi: 0, brillos: 0, brillosObj: [], stage: 'caja', mochila: [],
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
function distances(cells, r0 = 0, c0 = 0) {
  const n = cells.length, d = Array.from({ length: n }, () => Array(n).fill(-1)), q = [[r0, c0]]; d[r0][c0] = 0;
  while (q.length) { const [r, c] = q.shift(); for (const [nr, nc] of neighbors(cells, r, c)) if (d[nr][nc] < 0) { d[nr][nc] = d[r][c] + 1; q.push([nr, nc]); } }
  return d;
}

// ---------- cajita de regalo ----------
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
function makeHada() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(.18, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfff6a8 })));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(.38, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfff6a8, transparent: true, opacity: .3 })));
  const wingM = new THREE.MeshBasicMaterial({ color: 0xc9f0ff, transparent: true, opacity: .75, side: THREE.DoubleSide });
  const wings = [-1, 1].map(sx => { const w = new THREE.Mesh(new THREE.CircleGeometry(.28, 16), wingM); w.position.set(sx * .25, .08, 0); w.scale.set(1, .6, 1); g.add(w); return w; });
  g.visible = false; scene.add(g);
  return { g, wings };
}

// ---------- construir un nivel ----------
async function buildLevel(i) {
  if (level) { scene.remove(level); level.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  level = new THREE.Group(); scene.add(level);
  const cfg = NIVELES[i], n = cfg.n;
  const cells = genMaze(n);
  Object.assign(state, { maze: cells, walls: [], boxes: [], objs: [], path: [], nivel: i, mi: 0, stage: 'caja', mochila: [] });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(n * C, n * C), new THREE.MeshLambertMaterial({ map: pathTex.clone() }));
  floor.material.map.repeat.set(n * 1.5, n * 1.5); floor.material.map.needsUpdate = true;
  floor.rotation.x = -Math.PI / 2; floor.position.y = .01; floor.receiveShadow = true; level.add(floor);

  // paredes de arbustos (instanciadas: rápido en tablets)
  const segs = [], half = (n * C) / 2;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const p = cellPos(r, c, n), cl = cells[r][c];
    if (cl.n) segs.push([p.x, p.z - C / 2, C + .8, .8]);
    if (cl.e) segs.push([p.x + C / 2, p.z, .8, C + .8]);
    if (r === 0 && cl.s && c !== 0) segs.push([p.x, p.z + C / 2, C + .8, .8]);
    if (c === 0 && cl.w) segs.push([p.x - C / 2, p.z, .8, C + .8]);
  }
  const H = 1.2;
  const hedge = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ map: hedgeTex }), segs.length);
  const m4 = new THREE.Matrix4();
  segs.forEach(([x, z, sx, sz], k) => {
    m4.compose(new THREE.Vector3(x, H / 2, z), new THREE.Quaternion(), new THREE.Vector3(sx, H, sz));
    hedge.setMatrixAt(k, m4);
    state.walls.push({ minX: x - sx / 2, maxX: x + sx / 2, minZ: z - sz / 2, maxZ: z + sz / 2 });
  });
  hedge.castShadow = true; hedge.receiveShadow = true; level.add(hedge);
  const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(.12, 8, 6), new THREE.MeshLambertMaterial({ color: 0xffffff }), segs.length * 2);
  const fcols = [0xff7eb6, 0xffd23f, 0xffffff, 0xb07de8];
  segs.forEach(([x, z, sx, sz], k) => { for (let j = 0; j < 2; j++) { m4.makeTranslation(x + (Math.random() - .5) * sx * .8, H + .05, z + (Math.random() - .5) * sz * .8); fl.setMatrixAt(k * 2 + j, m4); fl.setColorAt(k * 2 + j, new THREE.Color(fcols[(k + j) % 4])); } });
  level.add(fl);

  const start = cellPos(0, 0, n);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.4, .14, 10, 30, Math.PI), new THREE.MeshStandardMaterial({ color: 0xff7eb6 }));
  arch.position.set(start.x, 0, start.z + C / 2); level.add(arch);

  // casitas y árboles alrededor (el pueblo)
  const ring = [];
  for (let k = -half - 4; k <= half + 4; k += 4.5) ring.push([k, -half - 4.5], [k, half + 5], [-half - 4.5, k], [half + 4.5, k]);
  ring.forEach(([x, z], k) => {
    const key = ['houseA', 'houseB', 'houseC', 'treesTall', 'trees', 'treesTall'][k % 6];
    if (!deco[key]) return;
    const o = fit(deco[key].scene.clone(true), key.startsWith('house') ? 3.4 : 3.2);
    o.position.set(x, 0, z); o.lookAt(0, 0, 0); level.add(o);
  });

  // misiones cerquita: cada cajita está a pocos pasos de donde terminó la anterior,
  // y el animalito que pide está a pocos pasos de su cajita
  const used = new Set(['0,0', '0,1', '1,0']), key = (r, c) => r + ',' + c;
  const near = (from, min, max) => {
    const d = distances(cells, from.r, from.c), list = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!used.has(key(r, c)) && d[r][c] >= min) list.push({ r, c, d: d[r][c] });
    const ok = J.shuffle(list.filter(o => o.d <= max));
    const pick = ok[0] || list.sort((a, b) => a.d - b.d)[0];
    if (pick) used.add(key(pick.r, pick.c));
    return pick;
  };
  ITEMS = ITEMS.length >= 4 ? ITEMS : J.palabras('bosque');
  const pool = J.shuffle(ITEMS);
  const boxCells = [], objCells = [], words = [];
  let cur = { r: 0, c: 0 };
  for (let k = 0; k < cfg.missions; k++) {
    const b = near(cur, 2, 3); if (!b) break;
    const o = near(b, 1, 2); if (!o) break;
    boxCells.push(b); objCells.push(o); words.push(pool[k % pool.length]);
    cur = o;
  }
  // otros animalitos (distractores) por las calles cercanas
  const distract = pool.slice(boxCells.length);
  for (let k = 0; objCells.length < Math.max(cfg.objs, boxCells.length) && k < distract.length; k++) {
    const o = near(objCells[k % Math.max(1, boxCells.length)] || { r: 0, c: 0 }, 1, 3); if (!o) break;
    objCells.push(o); words.push(distract[k]);
  }

  // animalitos y cosas, visibles, paseando
  objCells.forEach((cell, k) => {
    const o = crearObjeto(words[k][0], words[k][2]);
    o.group.scale.setScalar(1.6);
    const home = cellPos(cell.r, cell.c, n);
    o.group.position.copy(home);
    level.add(o.group);
    state.objs.push({ word: words[k], o, home, phase: Math.random() * 6, got: false, cool: 0, fly: 0 });
  });

  // retos (uno por cajita)
  const tipo = cfg.tipo;
  const syl = w => J.strip(w[1].split('-')[0]);
  const cols = J.shuffle(CAJAS);
  state.missions = boxCells.map((_, k) => {
    const w = words[k];
    let t = tipo === 'mezcla' ? (k % 2 ? 'silaba' : 'palabra') : tipo;
    if (t === 'silaba' && words.filter(x => syl(x) === syl(w)).length > 1) t = 'palabra';
    return { word: w, tipo: t, fade: cfg.fade, voz: cfg.voz, caja: cols[k % cols.length] };
  });
  boxCells.forEach((cell, k) => {
    const p = cellPos(cell.r, cell.c, n);
    const closed = ['n', 's', 'e', 'w'].filter(d => cells[cell.r][cell.c][d]);
    const off = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[closed[0] || 'n'];
    const h = makeCaja(state.missions[k].caja[0]);
    h.g.position.set(p.x + off[0] * 1.3, 0, p.z + off[1] * 1.3);
    level.add(h.g);
    const ringM = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.35, 32), new THREE.MeshBasicMaterial({ color: 0xfff6a8, transparent: true, opacity: .55, side: THREE.DoubleSide }));
    ringM.rotation.x = -Math.PI / 2; ringM.position.set(h.g.position.x, .03, h.g.position.z); level.add(ringM);
    state.boxes.push({ h, ring: ringM, r: cell.r, c: cell.c, opened: false, openK: 0, card: null });
  });

  // estrellitas por los caminos
  state.brillosObj = [];
  const starGeo = new THREE.OctahedronGeometry(.25);
  const starMat = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x8a6a00, emissiveIntensity: .5, metalness: .3, roughness: .3 });
  for (let k = 0; k < n * 2; k++) {
    const r = Math.floor(Math.random() * n), c = Math.floor(Math.random() * n);
    if (r + c < 1) continue;
    const s2 = new THREE.Mesh(starGeo, starMat); s2.castShadow = true;
    const p = cellPos(r, c, n); s2.position.set(p.x + (Math.random() - .5) * 1.5, .7, p.z + (Math.random() - .5) * 1.5);
    level.add(s2); state.brillosObj.push(s2);
  }
  $('#metas').innerHTML = state.missions.map(() => '<span class="meta">⭐</span>').join('');
  renderMochila();
  state.pos.copy(start); state.pos.z += 1.2; state.dir = Math.PI;
  camera.position.set(state.pos.x, 12, state.pos.z + 9);
}

// ---------- retos ----------
const syl0 = w => J.strip(w[1].split('-')[0]);
const activeBox = () => state.boxes[state.mi];
function showBoxStep() {
  // paso 1: ir a la cajita del color que dice la misión
  state.stage = 'caja';
  const m = state.missions[state.mi];
  state.boxes.forEach((b, k) => { b.ring.visible = k === state.mi; });
  const box = $('#mision');
  $('#m-etq').textContent = 'Busca la cajita'; $('#m-pic').textContent = '🎁'; $('#m-pic').style.opacity = '1';
  $('#m-word').textContent = m.caja[1]; $('#m-word').style.color = m.caja[2];
  box.hidden = false; box.classList.remove('nuevo'); void box.offsetWidth; box.classList.add('nuevo');
  state.lastFound = performance.now(); hideHada();
  J.say(['Busca la cajita', m.caja[1], 'y lee.']);
}
const missionText = m => m.tipo === 'silaba' ? syl0(m.word) : m.word[0];
function openBox(b) {
  b.opened = true; b.openK = .001; J.sfx('pop', .9);
  const m = state.missions[state.mi];
  const solo = m.voz === 'solo';
  const text = solo ? '' : m.tipo === 'silaba' ? syl0(m.word) + '…' : m.word[0];
  // el dibujo se va borrando con los niveles; en "solo voz" la tarjeta muestra una orejita
  const emoji = solo ? '👂' : m.fade < 1 ? m.word[2] : '';
  const card = new THREE.Sprite(new THREE.SpriteMaterial({ map: tarjeta(text, { emoji, emojiAlpha: solo ? 1 : 1 - m.fade, color: m.caja[2] }) }));
  card.scale.set(1.7, 1.7, 1); card.position.set(b.h.g.position.x, 1.2, b.h.g.position.z); card.userData.rise = 0;
  level.add(card); b.card = card;
  fx.burst(card.position.clone(), 30, .6);
  // paso 2: leer y atrapar al animalito que está cerquita
  state.stage = 'buscar';
  $('#m-etq').textContent = solo ? 'Escucha' : m.tipo === 'silaba' ? 'Empieza con' : 'Busca';
  $('#m-word').textContent = solo ? '' : missionText(m); $('#m-word').style.color = '';
  const pic = $('#m-pic');
  pic.textContent = solo ? '👂' : m.fade < 1 ? m.word[2] : '🔍';
  pic.style.opacity = solo || m.fade >= 1 ? '1' : String(1 - m.fade);
  const box = $('#mision'); box.classList.remove('nuevo'); void box.offsetWidth; box.classList.add('nuevo');
  state.lastFound = performance.now();
  // la voz ayuda cada vez menos: primero lee ella y luego, si hace falta, ayuda la voz
  const espera = { ya: 0, luego: 7000, poca: 14000, solo: 0 }[m.voz] ?? 0;
  if (!espera) sayMission(); else J.say('¿Qué dice la cajita?');
  clearTimeout(openBox.t);
  if (espera) openBox.t = setTimeout(() => { if (state.stage === 'buscar' && state.missions[state.mi] === m) sayMission(); }, espera);
}
function sayMission() {
  const m = state.missions[state.mi]; if (!m) return;
  if (state.stage === 'caja') return J.say(['Busca la cajita', m.caja[1], 'y lee.']);
  if (m.tipo === 'silaba') J.say(['Algo que empieza con', syl0(m.word)]);
  else J.say([`Busca ${J.art(m.word[0])}`, m.word[0]]);
}
$('#m-say').onclick = sayMission;
function message(text, secs = 1.8) {
  const el = $('#mensaje'); el.textContent = text;
  el.classList.remove('ver'); void el.offsetWidth; el.classList.add('ver');
  clearTimeout(message.t); message.t = setTimeout(() => el.classList.remove('ver'), secs * 1000);
}
const matches = (o, m) => m.tipo === 'silaba' ? syl0(o.word) === syl0(m.word) : o.word[0] === m.word[0];
function touch(o) {
  const m = state.missions[state.mi];
  if (!m || o.got) return;
  if (matches(o, m)) {
    o.got = true; o.fly = .001;
    state.celebrate = 2;
    J.cheer(); fx.burst(o.o.group.position.clone().add(new THREE.Vector3(0, 1, 0)), 50);
    message('¡A la mochila!');
    J.addStar(); updatePlayer();
    state.mochila.push(o.word[2]); renderMochila();
    $('#metas').children[state.mi].classList.add('on');
    const b = activeBox(); if (b && b.card) { level.remove(b.card); b.card = null; }
    J.say([o.word[0], J.pick(J.PRAISES)], { queue: true });
    state.mi++; state.stage = 'listo'; hideHada();
    if (state.mi >= state.missions.length) setTimeout(levelDone, 3000);
    else setTimeout(() => J.nextTurn(showBoxStep, { onShow: swapActor }), 2800);
  } else if (o.cool <= 0) {
    o.cool = 5; J.boing();
    message('¡Casi!', 1.2);
    J.say(m.tipo === 'silaba' ? ['Algo que empieza con', syl0(m.word)] : [`Busca ${J.art(m.word[0])}`, m.word[0]]);
  }
}
function renderMochila() { $('#mochila').innerHTML = '🎒 ' + (state.mochila || []).map(e => `<span>${e}</span>`).join(''); }
function levelDone() {
  state.playing = false;
  P.level.bosque = Math.max(P.level.bosque || 0, state.nivel + 1); J.save();
  J.gift(() => startLevel(Math.min(state.nivel + 1, NIVELES.length - 1)));
}

// ---------- hada guía ----------
const hada = makeHada();
let hadaPath = [];
function showHada() {
  const m = state.missions[state.mi]; if (!m) return;
  const n = state.maze.length;
  let to, end;
  if (state.stage === 'caja') { const b = activeBox(); to = [b.r, b.c]; end = b.h.g.position.clone(); }
  else { const o = state.objs.find(x => !x.got && matches(x, m)); if (!o) return; to = posCell(o.o.group.position, n); end = o.o.group.position.clone(); }
  const from = posCell(state.pos, n).map(v => Math.max(0, Math.min(n - 1, v)));
  hadaPath = bfs(state.maze, from, to.map(v => Math.max(0, Math.min(n - 1, v)))).map(([r, c]) => cellPos(r, c, n));
  if (!hadaPath.length) return;
  hadaPath.push(end);
  hada.g.visible = true; state.hadaOn = true;
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
const ray = new THREE.Raycaster(), v2 = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
$('#mundo').addEventListener('pointerdown', e => {
  if (!state.playing) return;
  v2.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(v2, camera);
  if (!ray.ray.intersectPlane(plane, hit)) return;
  const n = state.maze.length, to = posCell(hit, n), from = posCell(state.pos, n);
  if (to[0] < 0 || to[1] < 0 || to[0] >= n || to[1] >= n) return;
  const cells = bfs(state.maze, from, to).map(([r, c]) => cellPos(r, c, n));
  cells.shift(); cells.push(hit.clone());
  state.path = cells;
  fx.burst(hit.clone().setY(.2), 8, .3);
});
function collide(x, z) {
  for (const w of state.walls) if (x > w.minX - PLAYER_R && x < w.maxX + PLAYER_R && z > w.minZ - PLAYER_R && z < w.maxZ + PLAYER_R) return true;
  return false;
}
function updatePlayer() { const p = J.player(); $('#jugador').innerHTML = `${J.CHARS[p.char]?.emoji || '⭐'} ${J.esc(p.name)} · ⭐ ${p.stars}`; }
function swapActor() { actors.forEach(a => { a.group.visible = a === actor(); }); updatePlayer(); }

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
    else if (state.path.length) { tmp.copy(state.path[0]).sub(state.pos); tmp.y = 0; if (tmp.length() < .35) state.path.shift(); else { tmp.normalize(); mx = tmp.x; mz = tmp.z; } }
  }
  const len = Math.hypot(mx, mz);
  state.moving = len > .15;
  if (state.moving) {
    if (len > 1) { mx /= len; mz /= len; }
    const nx = state.pos.x + mx * SPEED * dt, nz = state.pos.z + mz * SPEED * dt;
    if (!collide(nx, state.pos.z)) state.pos.x = nx;
    if (!collide(state.pos.x, nz)) state.pos.z = nz;
    let d = Math.atan2(mx, mz) - state.dir; d = Math.atan2(Math.sin(d), Math.cos(d));
    state.dir += d * Math.min(1, dt * 12);
  }
  const a = actor();
  if (a) {
    a.group.position.copy(state.pos); a.group.rotation.y = state.dir;
    state.celebrate -= dt;
    a.update(dt, state.celebrate > 0 ? 'festejar' : state.moving ? 'correr' : 'quieto', .8);
  }
  // cajitas
  state.boxes.forEach((b, k) => {
    if (b.openK > 0 && b.openK < 1) { b.openK = Math.min(1, b.openK + dt * 1.6); b.h.open(b.openK); }
    if (b.card) { b.card.userData.rise = Math.min(1, b.card.userData.rise + dt * 1.5); b.card.position.y = 1.2 + b.card.userData.rise * 1.5 + Math.sin(t * 2) * .08; }
    b.ring.material.opacity = .35 + Math.sin(t * 4) * .25;
    if (state.playing && state.stage === 'caja' && k === state.mi && !b.opened && Math.hypot(b.h.g.position.x - state.pos.x, b.h.g.position.z - state.pos.z) < 2) openBox(b);
  });
  // animalitos que pasean en su calle
  for (const o of state.objs) {
    const g = o.o.group;
    if (o.fly) {
      // vuela a la mochila
      o.fly += dt; tmp.copy(state.pos); tmp.y = 1.4;
      g.position.lerp(tmp, Math.min(1, dt * 4)); g.scale.multiplyScalar(.93);
      if (o.fly > .9) { g.visible = false; o.fly = 0; }
      continue;
    }
    if (o.got) continue;
    o.cool -= dt;
    const px = o.home.x + Math.cos(t * .35 + o.phase) * 1.1, pz = o.home.z + Math.sin(t * .35 + o.phase) * 1.1;
    const dx = px - g.position.x, dz = pz - g.position.z;
    g.position.set(px, 0, pz);
    if (Math.abs(dx) + Math.abs(dz) > 1e-4) g.rotation.y = Math.atan2(dx, dz);
    o.o.update(dt, false);
    if (state.playing && state.stage === 'buscar' && Math.hypot(px - state.pos.x, pz - state.pos.z) < 1.7) touch(o);
  }
  for (const st of state.brillosObj) {
    if (!st.visible) continue;
    st.rotation.y += dt * 2; st.position.y = .7 + Math.sin(t * 3 + st.position.x) * .1;
    if (Math.hypot(st.position.x - state.pos.x, st.position.z - state.pos.z) < 1) { st.visible = false; state.brillos++; $('#brillos').textContent = state.brillos; J.sfx('coin', .5, 1 + (state.brillos % 5) * .06); }
  }
  if (state.playing && !state.hadaOn && (state.stage === 'caja' || state.stage === 'buscar') && performance.now() - state.lastFound > 35000) showHada();
  if (hada.g.visible && hadaPath.length) {
    const n = state.maze.length, here = posCell(state.pos, n);
    let idx = hadaPath.findIndex(p => { const [r, c] = posCell(p, n); return r === here[0] && c === here[1]; });
    idx = Math.min(hadaPath.length - 1, (idx < 0 ? 0 : idx) + 1);
    tmp.copy(hadaPath[idx]); tmp.y = 1.8 + Math.sin(t * 4) * .2;
    hada.g.position.lerp(tmp, Math.min(1, dt * 2.5));
    hada.wings.forEach((w, i) => { w.rotation.y = (i ? 1 : -1) * (.4 + Math.sin(t * 25) * .5); });
    if (Math.random() < .3) fx.burst(hada.g.position.clone(), 1, .2);
  }
  fx.update(dt);
  const narrow = innerWidth / innerHeight < .8;
  tmp.set(state.pos.x, narrow ? 14 : 11.5, state.pos.z + (narrow ? 8.5 : 8.5));
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
  P.two ? J.showTurn(showBoxStep, { onShow: swapActor }) : showBoxStep();
}

function renderLevels() {
  const unlocked = Math.min(NIVELES.length, (P.level.bosque || 0) + 1);
  let sel = Math.min(unlocked - 1, P.level.bosque || 0);
  const box = $('#niveles');
  box.innerHTML = NIVELES.map((n, i) => `<button data-i="${i}" title="${n.nombre}" ${i >= unlocked ? 'disabled aria-label="Nivel bloqueado"' : ''} class="${i === sel ? 'on' : ''}">${i < unlocked ? i + 1 : '🔒'}</button>`).join('');
  box.onclick = e => { const b = e.target.closest('[data-i]'); if (!b || b.disabled) return; sel = +b.dataset.i; [...box.children].forEach((c, k) => c.classList.toggle('on', k === sel)); $('#nivel-desc').textContent = NIVELES[sel].nombre; J.sfx('pop'); };
  $('#nivel-desc').textContent = NIVELES[sel].nombre;
  return () => sel;
}

(async () => {
  await esperaFuente();
  await J.ready;
  ITEMS = J.palabras('bosque');
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
