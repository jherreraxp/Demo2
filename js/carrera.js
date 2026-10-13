// Carrera de Palabras — tu personaje corre por un camino de tres carriles y atrapa
// la burbuja con la palabra que escucha. Empieza lento y cada nivel es un poquito más difícil.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { chispitas, tarjeta, esperaFuente } from './mundo3d.js';
import { crearPersonaje } from './personajes.js';

const J = window.Juego, P = J.progress;
const $ = s => document.querySelector(s);
const TEST = location.hash === '#prueba';

// ---------- niveles ----------
const NIVELES = [
  { speed: 4.5, opts: 2, dibujo: true,  tipo: 'palabra',   nombre: 'Con dibujo, 2 palabras' },
  { speed: 5.2, opts: 3, dibujo: true,  tipo: 'palabra',   nombre: 'Con dibujo, 3 palabras' },
  { speed: 5.8, opts: 3, dibujo: false, tipo: 'palabra',   nombre: '¡Solo la palabra!' },
  { speed: 6.4, opts: 3, dibujo: false, tipo: 'parecidas', nombre: 'Palabras parecidas' },
  { speed: 7.0, opts: 3, dibujo: false, tipo: 'silaba',    nombre: 'Sílabas' },
  { speed: 7.6, opts: 3, dibujo: false, tipo: 'frase',     nombre: 'Frases cortas' },
];
const WIN_PER_LEVEL = 6;
const FRASES = [['el sol', '☀️'], ['la luna', '🌙'], ['mi gato', '🐱'], ['un pato', '🦆'], ['la casa', '🏠'], ['el oso', '🐻'], ['mi mamá', '👩'], ['una palta', '🥑'], ['el choclo', '🌽'], ['la llama', '🦙'], ['mi papá', '👨'], ['la nube', '☁️']];
const EASY = J.WORDS.filter(w => w[0].length <= 5);
const SYLS = ['ma', 'me', 'mi', 'mo', 'mu', 'pa', 'pe', 'pi', 'po', 'pu', 'la', 'le', 'li', 'lo', 'lu', 'sa', 'se', 'si', 'so', 'su', 'ta', 'te', 'to', 'na', 'no', 'da', 'do'];

const LANE_W = 2.2, ROAD_W = LANE_W * 3, LOOP = 150;
const ROW_START = TEST ? -18 : -60;

// ---------- escena ----------
const canvas = $('#mundo');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 300);
function resize() {
  const w = innerWidth, h = innerHeight, a = w / h;
  renderer.setSize(w, h, false);
  camera.aspect = a; camera.fov = a < 0.8 ? 74 : a < 1.2 ? 66 : 58; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
scene.add(new THREE.HemisphereLight(0xffffff, 0x7fbf5a, 1.6));
const sun = new THREE.DirectionalLight(0xfff4dd, 2.4);
sun.position.set(6, 14, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
scene.add(sun, sun.target);
const fx = chispitas(scene);

// tema: reino de nieve para la Princesa Nieve; pueblo verde para los demás
const SNOW = P.players[0].char === 'nieve';
document.body.style.background = SNOW ? 'linear-gradient(#a9dcff, #f2fbff 55%)' : '';
scene.fog = new THREE.Fog(SNOW ? 0xf2fbff : 0xdff3ff, 45, 115);

function canvasTexture(w, h, draw, repeatY = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, repeatY); t.anisotropy = 4; return t;
}
const ROAD_LEN = 220;
const roadTex = canvasTexture(256, 256, (g, w, h) => {
  g.fillStyle = SNOW ? '#9fb7d6' : '#5e6478'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .08})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  g.fillStyle = '#ffffff'; g.fillRect(6, 0, 7, h); g.fillRect(w - 13, 0, 7, h);
  [w / 3, 2 * w / 3].forEach(x => g.fillRect(x - 4, 20, 8, h / 2 - 40));
}, ROAD_LEN / 8);
const walkTex = canvasTexture(64, 64, (g, w, h) => { g.fillStyle = SNOW ? '#f4f9ff' : '#e4ddcf'; g.fillRect(0, 0, w, h); g.strokeStyle = SNOW ? '#d4e6f7' : '#c9bfae'; g.lineWidth = 3; g.strokeRect(0, 0, w, h); }, ROAD_LEN / 1.6);
const riverTex = canvasTexture(128, 128, (g, w, h) => {
  g.fillStyle = SNOW ? '#bfe6fb' : '#4fb3e8'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3;
  for (let i = 0; i < 7; i++) { const y = Math.random() * h, x = Math.random() * w; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 6, x + 22, y); g.stroke(); }
}, ROAD_LEN / 10);
function strip(width, x, tex, y = 0.01, color) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, ROAD_LEN), new THREE.MeshLambertMaterial(tex ? { map: tex } : { color }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, -ROAD_LEN / 2 + 20); m.receiveShadow = true; scene.add(m); return m;
}
strip(160, 0, null, -0.02, SNOW ? 0xf3f8ff : 0x86d160);
strip(ROAD_W, 0, roadTex, 0.02);
strip(1.6, -(ROAD_W / 2 + 0.8), walkTex, 0.04);
strip(1.6, ROAD_W / 2 + 0.8, walkTex, 0.04);
strip(7, -12, riverTex, 0.01);
strip(0.6, -8.2, null, 0.03, SNOW ? 0xd9ecfa : 0xb98b5a);
strip(0.6, -15.8, null, 0.03, SNOW ? 0xd9ecfa : 0xb98b5a);

// copos de nieve
let snow = null;
if (SNOW) {
  const N = 600, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * 50; pos[i * 3 + 1] = Math.random() * 20; pos[i * 3 + 2] = -Math.random() * 90 + 10; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  snow = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: .18, transparent: true, opacity: .9 }));
  scene.add(snow);
}

// ---------- modelos de decoración (Kenney, CC0) ----------
const loader = new GLTFLoader();
const loadGLB = url => new Promise(ok => loader.load(url, g => ok(g), undefined, () => ok(null)));
function fit(obj, height) {
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3());
  obj.scale.multiplyScalar(height / (size.y || 1));
  const b2 = new THREE.Box3().setFromObject(obj); obj.position.y -= b2.min.y;
  const wrap = new THREE.Group(); wrap.add(obj); return wrap;
}
function shadows(obj, cast = true) { obj.traverse(o => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = true; } }); return obj; }
const M = 'assets/modelos/';
const MODELS = {
  cloud: M + 'kenney-plataformas/cloud.glb', flag: M + 'kenney-plataformas/flag.glb',
  grass: M + 'kenney-plataformas/grass.glb', grass2: M + 'kenney-plataformas/grass-small.glb',
  trees: M + 'kenney-ciudad/grass-trees.glb', treesTall: M + 'kenney-ciudad/grass-trees-tall.glb',
  houseA: M + 'kenney-ciudad/building-small-a.glb', houseB: M + 'kenney-ciudad/building-small-b.glb',
  houseC: M + 'kenney-ciudad/building-small-c.glb', houseD: M + 'kenney-ciudad/building-small-d.glb',
  fountain: M + 'kenney-ciudad/pavement-fountain.glb',
};
const G = {};
const props = [], clouds = [];
let actors = [];
const actor = () => actors[P.two ? P.turn % 2 : 0];

async function build() {
  const entries = await Promise.all(Object.entries(MODELS).map(async ([k, u]) => [k, await loadGLB(u)]));
  entries.forEach(([k, g]) => { G[k] = g; });
  const right = ['houseA', 'houseB', 'houseC', 'houseD', 'treesTall', 'fountain', 'houseA', 'trees'].filter(k => G[k]);
  const left = ['treesTall', 'trees', 'treesTall', 'flag'].filter(k => G[k]);
  const near = ['grass', 'grass2', 'flag', 'grass'].filter(k => G[k]);
  const size = { houseA: 3.4, houseB: 3.6, houseC: 3.2, houseD: 3.6, treesTall: 3.6, trees: 2.6, fountain: 1.4, flag: 1.6, grass: .5, grass2: .4 };
  const make = k => {
    const o = shadows(fit(G[k].scene.clone(true), size[k] || 2), !k.startsWith('grass'));
    if (SNOW) o.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.lerp(new THREE.Color(0xffffff), .45); } });
    return o;
  };
  for (let z = 15; z > 15 - LOOP; z -= 7.5) {
    if (right.length) addProp(make(J.pick(right)), 6.6 + Math.random() * 1.2, z + Math.random() * 2, true);
    if (right.length && Math.random() < .7) addProp(make(J.pick(['treesTall', 'trees'].filter(k => G[k]))), 11 + Math.random() * 4, z + 3, false);
    if (left.length) addProp(make(J.pick(left)), -6 - Math.random() * .8, z + 3 + Math.random() * 2, false);
    if (left.length) addProp(make(J.pick(left)), -19 - Math.random() * 6, z + Math.random() * 3, false);
    if (near.length && Math.random() < .6) addProp(make(J.pick(near)), (Math.random() < .5 ? -1 : 1) * (ROAD_W / 2 + 0.6 + Math.random()), z + 1.5, false);
  }
  for (let i = 0; i < 9; i++) {
    const c = G.cloud ? fit(G.cloud.scene.clone(true), 1.8 + Math.random() * 1.6) : new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 8), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    c.position.set((Math.random() - .5) * 60, 11 + Math.random() * 6, -20 - Math.random() * 100);
    c.scale.x *= 1.6;
    c.traverse(o => { if (o.isMesh && o.material && o.material.emissive) { o.material = o.material.clone(); o.material.emissive.set(0xffffff); o.material.emissiveIntensity = .55; } });
    scene.add(c); clouds.push(c);
  }
  // personajes de los jugadores
  const ids = P.two ? [P.players[0].char, P.players[1].char] : [P.players[0].char];
  for (const id of ids) { const a = await crearPersonaje(id); a.group.rotation.y = Math.PI; scene.add(a.group); actors.push(a); }
  swapActor();
}
function addProp(obj, x, z, faceRoad) {
  obj.position.set(x, 0, z);
  obj.rotation.y = faceRoad ? (x < 0 ? Math.PI / 2 : -Math.PI / 2) : Math.random() * Math.PI * 2;
  scene.add(obj); props.push(obj);
}
function swapActor() {
  actors.forEach(a => { a.group.visible = a === actor(); });
  const p = J.player();
  $('#jugador').innerHTML = `${J.CHARS[p.char]?.emoji || '⭐'} ${J.esc(p.name)} · ⭐ ${p.stars}`;
}

// ---------- burbujas de palabras ----------
const BORDERS = ['#ef5b5b', '#3f8ee8', '#4cb87a', '#9a6ee0', '#f39a3b'];
const bubbleGeo = new THREE.SphereGeometry(1.05, 28, 20);
function makeBubble(item, i, showPic) {
  const g = new THREE.Group();
  const tex = tarjeta(item.text, { emoji: showPic ? item.emoji : '', color: BORDERS[i % 5] });
  const card = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.45), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
  const bub = new THREE.Mesh(bubbleGeo, new THREE.MeshStandardMaterial({ color: 0xbfe9ff, transparent: true, opacity: .28, roughness: .1, metalness: .2, emissive: 0x6fc8ff, emissiveIntensity: .25 }));
  g.add(card, bub);
  g.userData = { item, card, bub, tex };
  return g;
}

// ---------- preguntas según el nivel ----------
function makeRow(cfg, target) {
  // devuelve { target, items[] } donde cada item = { text, emoji, said, key }
  const asItem = w => ({ text: w[0], emoji: w[2], said: w[1].split('-').join(', ') + '. ¡' + w[0] + '!', key: w[0] });
  let t, others;
  if (cfg.tipo === 'silaba') {
    t = target || J.pick(SYLS);
    const near = SYLS.filter(s => s !== t && (s[0] === t[0] || s[1] === t[1]));
    others = J.shuffle(near).slice(0, cfg.opts - 1);
    const it = s => ({ text: s, emoji: '', said: s, key: s });
    return { target: it(t), items: J.shuffle([it(t), ...others.map(it)]), voice: s => ['Atrapa:', s] };
  }
  if (cfg.tipo === 'frase') {
    const f = target ? FRASES.find(x => x[0] === target) : J.pick(FRASES);
    others = J.shuffle(FRASES.filter(x => x !== f)).slice(0, cfg.opts - 1);
    const it = x => ({ text: x[0], emoji: x[1], said: x[0], key: x[0] });
    return { target: it(f), items: J.shuffle([it(f), ...others.map(it)]), voice: s => ['Atrapa:', s] };
  }
  const w = target ? J.WORDS.find(x => x[0] === target) : J.pick(EASY);
  let pool = EASY.filter(x => x[0] !== w[0]);
  if (cfg.tipo === 'parecidas') {
    const s0 = J.strip(w[1].split('-')[0]).slice(0, 1), end = w[0].slice(-2);
    const near = pool.filter(x => J.strip(x[0])[0] === s0 || x[0].endsWith(end));
    if (near.length >= cfg.opts - 1) pool = near;
  } else pool = pool.filter(x => J.strip(x[0])[0] !== J.strip(w[0])[0]);
  others = J.shuffle(pool).slice(0, cfg.opts - 1);
  return { target: asItem(w), items: J.shuffle([asItem(w), ...others.map(asItem)]), voice: s => ['Atrapa:', s] };
}

// ---------- estado ----------
const state = {
  running: false, lane: 0, x: 0, hopT: 1, scroll: 0, nivel: 0, wins: 0,
  row: null, q: null, missed: false, celebrate: 0,
};
const metas = $('#metas');
const speed = () => NIVELES[state.nivel].speed;

function newQuestion(keepTarget) {
  const cfg = NIVELES[state.nivel];
  state.q = makeRow(cfg, keepTarget ? state.q.target.key : null);
  showTarget();
}
function spawnRow() {
  const cfg = NIVELES[state.nivel];
  const q = state.q;
  // con 2 opciones, se usan 2 de los 3 carriles al azar
  const lanes = cfg.opts === 2 ? J.shuffle([-1, 0, 1]).slice(0, 2).sort() : [-1, 0, 1];
  const row = { z: ROW_START, bubbles: [], done: false };
  q.items.forEach((it, i) => {
    const b = makeBubble(it, i + Math.floor(Math.random() * 5), cfg.dibujo);
    b.position.set(lanes[i] * LANE_W, 1.35, ROW_START);
    b.userData.lane = lanes[i];
    b.userData.hint = state.missed && it.key === q.target.key;
    scene.add(b); row.bubbles.push(b);
  });
  state.row = row;
}
function showTarget() {
  const q = state.q, cfg = NIVELES[state.nivel];
  const box = $('#mision');
  $('#m-pic').textContent = cfg.dibujo ? q.target.emoji : '🔊';
  $('#m-word').textContent = q.target.text;
  box.hidden = false; box.classList.remove('nuevo'); void box.offsetWidth; box.classList.add('nuevo');
  sayTarget();
}
function sayTarget() { const q = state.q; if (q) J.say(q.voice(q.target.text)); }
$('#m-say').onclick = sayTarget;

function message(text, secs = 1.6) {
  const el = $('#mensaje'); el.textContent = text;
  el.classList.remove('ver'); void el.offsetWidth; el.classList.add('ver');
  clearTimeout(message.t); message.t = setTimeout(() => el.classList.remove('ver'), secs * 1000);
}
function renderMetas() { metas.innerHTML = Array.from({ length: WIN_PER_LEVEL }, (_, i) => `<span class="meta ${i < state.wins ? 'on' : ''}">⭐</span>`).join(''); }
function renderNivel() { $('#nivel-num').textContent = state.nivel + 1; }

function judge(row) {
  const lane = Math.round(state.x / LANE_W);
  const got = row.bubbles.find(b => b.userData.lane === lane);
  const q = state.q;
  if (got && got.userData.item.key === q.target.key) {
    got.userData.pop = .001;
    fx.burst(got.position.clone(), 50);
    J.cheer();
    message(J.pick(['¡Muy bien!', '¡Bravo!', '¡Genial!', '¡Súper!']));
    J.addStar(); swapActor();
    state.wins++; state.missed = false; state.celebrate = 1.1;
    renderMetas();
    setTimeout(() => J.say([q.target.said], { queue: true }), 600);
    if (state.wins >= WIN_PER_LEVEL) { setTimeout(levelUp, 1600); return 'stop'; }
    if (P.two) { state.running = false; setTimeout(() => J.nextTurn(() => { swapActor(); state.running = true; newQuestion(); }, { onShow: swapActor }), 1700); return 'stop'; }
    newQuestion();
  } else {
    J.boing(); state.missed = true;
    if (got) { message('¡Casi!'); J.say([`Esa dice ${got.userData.item.text}.`, ...q.voice(q.target.text)]); }
    else { message('¡Uy!'); J.say(['¡Atrapa una burbuja!', ...q.voice(q.target.text)]); }
    newQuestion(true);
  }
}

function levelUp() {
  state.running = false;
  P.level.carrera = Math.max(P.level.carrera || 0, state.nivel + 1); J.save();
  J.gift(() => {
    state.nivel = Math.min(state.nivel + 1, NIVELES.length - 1);
    state.wins = 0; renderMetas(); renderNivel();
    message('Nivel ' + (state.nivel + 1) + ': ' + NIVELES[state.nivel].nombre, 2.6);
    J.say('Nivel ' + (state.nivel + 1) + '. ' + NIVELES[state.nivel].nombre);
    state.running = true; newQuestion();
  });
}

// ---------- controles ----------
function move(dir) {
  if (!state.running) return;
  const nl = Math.max(-1, Math.min(1, state.lane + dir));
  if (nl === state.lane) { J.tones([200], .08, 'sine', .15); return; }
  state.lane = nl; state.hopT = 0; J.sfx('jump', .6);
}
$('#izq').addEventListener('pointerdown', e => { e.preventDefault(); move(-1); });
$('#der').addEventListener('pointerdown', e => { e.preventDefault(); move(1); });
addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'a') move(-1); if (e.key === 'ArrowRight' || e.key === 'd') move(1); });
let sx = null, sy = null;
canvas.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
canvas.addEventListener('pointerup', e => {
  if (sx === null) return;
  const dx = e.clientX - sx, dy = e.clientY - sy;
  if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
  else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) move(e.clientX < innerWidth / 2 ? -1 : 1);
  sx = null;
});

// ---------- bucle ----------
const clock = new THREE.Clock(), camTarget = new THREE.Vector3();
function frame() {
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
  const v = state.running ? speed() : 0, dz = v * dt;
  const tx = state.lane * LANE_W;
  state.x += (tx - state.x) * Math.min(1, dt * 9);
  state.hopT = Math.min(1, state.hopT + dt * 3.2);
  const a = actor();
  if (a) {
    a.group.position.set(state.x, Math.sin(state.hopT * Math.PI) * .55, 0);
    a.group.rotation.z = (state.x - tx) * .12;
    state.celebrate -= dt;
    a.update(dt, state.celebrate > 0 ? 'festejar' : state.running ? 'correr' : 'quieto', .55 + speed() * .08);
  }
  state.scroll += dz;
  roadTex.offset.y = state.scroll / 8; walkTex.offset.y = state.scroll / 1.6; riverTex.offset.y = state.scroll / 10 + t * .05;
  for (const p of props) { p.position.z += dz; if (p.position.z > 18) p.position.z -= LOOP; }
  for (const c of clouds) { c.position.z += dz * .15; c.position.x += dt * .3; if (c.position.z > 10) { c.position.z -= 120; c.position.x = (Math.random() - .5) * 60; } }
  if (snow) {
    const pa = snow.geometry.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      let y = pa.getY(i) - dt * 1.5, z = pa.getZ(i) + dz;
      if (y < 0) y = 20; if (z > 12) z -= 100;
      pa.setY(i, y); pa.setZ(i, z); pa.setX(i, pa.getX(i) + Math.sin(t + i) * dt * .3);
    }
    pa.needsUpdate = true;
  }

  const row = state.row;
  if (row) {
    row.z += dz;
    for (const b of row.bubbles) {
      const ud = b.userData;
      b.position.z = row.z;
      b.position.y = 1.35 + Math.sin(t * 2 + ud.lane) * .08 + (ud.hint ? Math.abs(Math.sin(t * 5)) * .3 : 0);
      ud.card.rotation.y = Math.sin(t * 1.5 + ud.lane) * .25;
      if (ud.hint) ud.bub.material.emissiveIntensity = .4 + Math.abs(Math.sin(t * 5)) * .6;
      if (ud.pop) { ud.pop += dt; b.scale.setScalar(1 + ud.pop * 2); ud.bub.material.opacity = Math.max(0, .28 - ud.pop); ud.card.material.opacity = Math.max(0, 1 - ud.pop * 2); }
    }
    if (!row.done && row.z >= 0) { row.done = true; judge(row); }
    if (row.z > 9 || (row.done && !state.running && row.bubbles.some(b => b.userData.pop > .6))) {
      row.bubbles.forEach(b => { scene.remove(b); b.userData.tex.dispose(); b.userData.card.material.dispose(); b.userData.bub.material.dispose(); b.userData.card.geometry.dispose(); });
      state.row = null;
    }
  }
  if (!state.row && state.running && state.q) spawnRow();
  fx.update(dt);

  camera.position.set(state.x * .45, 4.4, 7.2);
  camTarget.set(state.x * .3, 1.2, -8); camera.lookAt(camTarget);
  sun.position.set(state.x + 6, 14, 6); sun.target.position.set(state.x, 0, -2);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function start(nivel) {
  $('#portada').hidden = true;
  J.audio(); J.startMusic();
  state.nivel = nivel; state.wins = 0; renderMetas(); renderNivel();
  const go = () => { state.running = true; newQuestion(); };
  if (P.two) J.showTurn(go, { onShow: swapActor }); else go();
}

(async () => {
  await esperaFuente();
  await build();
  J.refreshMusic();
  requestAnimationFrame(frame);
  // selector de nivel
  const unlocked = Math.min(NIVELES.length, (P.level.carrera || 0) + 1);
  let sel = unlocked - 1;
  const box = $('#niveles');
  box.innerHTML = NIVELES.map((n, i) => `<button data-i="${i}" title="${n.nombre}" ${i >= unlocked ? 'disabled aria-label="Nivel bloqueado"' : ''} class="${i === sel ? 'on' : ''}">${i < unlocked ? i + 1 : '🔒'}</button>`).join('');
  box.onclick = e => { const b = e.target.closest('[data-i]'); if (!b || b.disabled) return; sel = +b.dataset.i; [...box.children].forEach((c, k) => c.classList.toggle('on', k === sel)); $('#nivel-desc').textContent = NIVELES[sel].nombre; J.sfx('pop'); };
  $('#nivel-desc').textContent = NIVELES[sel].nombre;
  const go = $('#empezar');
  go.disabled = false; go.textContent = '▶ ¡A correr!';
  go.onclick = () => start(sel);
  if (TEST) start(0);
})();
