// Carrera de Palabras — el zorrito corre por un camino de tres carriles.
// Se escucha una palabra y hay que pasar por el cartel que tiene esa palabra.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const J = window.Juego;
const $ = s => document.querySelector(s);

// ---------- ajustes ----------
const LANE_W = 2.2;           // ancho de cada carril
const ROAD_W = LANE_W * 3;
const SPEED = 8;              // unidades por segundo (tranquilo, para niños pequeños)
const GATE_START = location.hash === '#prueba' ? -16 : -72;   // dónde aparece cada fila de carteles (≈ 9 s para decidir)
const LOOP = 150;             // largo del tramo que se recicla
const GIFT_EVERY = 6;         // palabras acertadas para ganar un regalo
const EASY = J.WORDS.filter(w => w[0].length <= 5 && !/[áéíóú]/.test(w[0]));

// ---------- escena ----------
const canvas = $('#mundo');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const HORIZON = 0xdff3ff;
scene.fog = new THREE.Fog(HORIZON, 45, 115);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 300);
function resize() {
  const w = innerWidth, h = innerHeight, a = w / h;
  renderer.setSize(w, h, false);
  camera.aspect = a;
  camera.fov = a < 0.8 ? 74 : a < 1.2 ? 66 : 58;   // en el celular vertical se ve más ancho
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

scene.add(new THREE.HemisphereLight(0xffffff, 0x7fbf5a, 1.6));
const sun = new THREE.DirectionalLight(0xfff4dd, 2.4);
sun.position.set(6, 14, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
scene.add(sun, sun.target);

// texturas dibujadas en canvas
function canvasTexture(w, h, draw, repeatY = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, repeatY);
  t.anisotropy = 4;
  return t;
}
const ROAD_LEN = 220;
const roadTex = canvasTexture(256, 256, (g, w, h) => {
  g.fillStyle = '#5e6478'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  g.fillStyle = '#ffffff';
  g.fillRect(6, 0, 7, h); g.fillRect(w - 13, 0, 7, h);                 // bordes
  [w / 3, 2 * w / 3].forEach(x => g.fillRect(x - 4, 20, 8, h / 2 - 40)); // líneas de carril
}, ROAD_LEN / 8);
const walkTex = canvasTexture(64, 64, (g, w, h) => {
  g.fillStyle = '#e4ddcf'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#c9bfae'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
}, ROAD_LEN / 1.6);
const riverTex = canvasTexture(128, 128, (g, w, h) => {
  g.fillStyle = '#4fb3e8'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 3;
  for (let i = 0; i < 7; i++) { const y = Math.random() * h, x = Math.random() * w; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 6, x + 22, y); g.stroke(); }
}, ROAD_LEN / 10);

function strip(width, x, tex, y = 0.01, color) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, ROAD_LEN), new THREE.MeshLambertMaterial(tex ? { map: tex } : { color }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, -ROAD_LEN / 2 + 20); m.receiveShadow = true;
  scene.add(m); return m;
}
strip(160, 0, null, -0.02, 0x86d160);                          // pasto
strip(ROAD_W, 0, roadTex, 0.02);                                // calle
strip(1.6, -(ROAD_W / 2 + 0.8), walkTex, 0.04);                 // aceras
strip(1.6, ROAD_W / 2 + 0.8, walkTex, 0.04);
const riverTexB = riverTex;
strip(7, -12, riverTexB, 0.01);                                 // río a la izquierda
strip(0.6, -8.2, null, 0.03, 0xb98b5a);                         // orillas
strip(0.6, -15.8, null, 0.03, 0xb98b5a);

// ---------- modelos ----------
const loader = new GLTFLoader();
const loadGLB = url => new Promise(ok => loader.load(url, g => ok(g), undefined, () => ok(null)));
function fit(obj, height) {
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3());
  const s = height / (size.y || 1);
  obj.scale.multiplyScalar(s);
  const b2 = new THREE.Box3().setFromObject(obj);
  obj.position.y -= b2.min.y;           // apoyado en el suelo
  const wrap = new THREE.Group(); wrap.add(obj);
  return wrap;
}
function shadows(obj, cast = true) { obj.traverse(o => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = true; } }); return obj; }

const M = 'assets/modelos/';
const MODELS = {
  fox: M + 'zorro/Fox.glb',
  coin: M + 'kenney-plataformas/coin.glb',
  cloud: M + 'kenney-plataformas/cloud.glb',
  flag: M + 'kenney-plataformas/flag.glb',
  grass: M + 'kenney-plataformas/grass.glb',
  grass2: M + 'kenney-plataformas/grass-small.glb',
  trees: M + 'kenney-ciudad/grass-trees.glb',
  treesTall: M + 'kenney-ciudad/grass-trees-tall.glb',
  houseA: M + 'kenney-ciudad/building-small-a.glb',
  houseB: M + 'kenney-ciudad/building-small-b.glb',
  houseC: M + 'kenney-ciudad/building-small-c.glb',
  houseD: M + 'kenney-ciudad/building-small-d.glb',
  fountain: M + 'kenney-ciudad/pavement-fountain.glb',
};
const G = {};

let fox, mixer, actions = {};
const props = [], clouds = [], coins = [];

async function build() {
  const entries = await Promise.all(Object.entries(MODELS).map(async ([k, u]) => [k, await loadGLB(u)]));
  entries.forEach(([k, g]) => { G[k] = g; });

  // zorrito
  if (G.fox) {
    const inner = G.fox.scene;
    fox = fit(inner, 1.45);
    inner.rotation.y = Math.PI;          // mirando hacia el camino (lejos de la cámara)
    shadows(fox);
    mixer = new THREE.AnimationMixer(inner);
    G.fox.animations.forEach(a => { actions[a.name] = mixer.clipAction(a); });
    (actions.Survey || Object.values(actions)[0])?.play();
  } else {
    fox = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(.45, 1.1, 12), new THREE.MeshLambertMaterial({ color: 0xf08a3c }));
    body.position.y = .55; fox.add(shadows(body));
  }
  scene.add(fox);

  // decoración a los lados (se recicla al pasar)
  const right = ['houseA', 'houseB', 'houseC', 'houseD', 'treesTall', 'fountain', 'houseA', 'trees'].filter(k => G[k]);
  const left = ['treesTall', 'trees', 'treesTall', 'flag'].filter(k => G[k]);
  const near = ['grass', 'grass2', 'flag', 'grass'].filter(k => G[k]);
  const size = { houseA: 3.4, houseB: 3.6, houseC: 3.2, houseD: 3.6, treesTall: 3.6, trees: 2.6, fountain: 1.4, flag: 1.6, grass: .5, grass2: .4 };
  const make = k => { const o = fit(G[k].scene.clone(true), size[k] || 2); return shadows(o, !k.startsWith('grass')); };
  for (let z = 15; z > 15 - LOOP; z -= 7.5) {
    if (right.length) addProp(make(J.pick(right)), 6.6 + Math.random() * 1.2, z + Math.random() * 2, true);
    if (right.length && Math.random() < .7) addProp(make(J.pick(['treesTall', 'trees'].filter(k => G[k]))), 11 + Math.random() * 4, z + 3, false);
    if (left.length) addProp(make(J.pick(left)), -6 - Math.random() * .8, z + 3 + Math.random() * 2, false);
    if (left.length) addProp(make(J.pick(left)), -19 - Math.random() * 6, z + Math.random() * 3, false);
    if (near.length && Math.random() < .6) addProp(make(J.pick(near)), (Math.random() < .5 ? -1 : 1) * (ROAD_W / 2 + 0.6 + Math.random()), z + 1.5, false);
  }

  // nubes
  for (let i = 0; i < 9; i++) {
    const c = G.cloud ? fit(G.cloud.scene.clone(true), 1.8 + Math.random() * 1.6) : new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 8), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    c.position.set((Math.random() - .5) * 60, 11 + Math.random() * 6, -20 - Math.random() * 100);
    c.scale.x *= 1.6;
    c.traverse(o => { if (o.isMesh && o.material && o.material.emissive) { o.material = o.material.clone(); o.material.emissive.set(0xffffff); o.material.emissiveIntensity = .55; } });
    scene.add(c); clouds.push(c);
  }

  // monedas
  for (let i = 0; i < 24; i++) {
    const c = G.coin ? fit(G.coin.scene.clone(true), .7) : new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .08, 20), new THREE.MeshLambertMaterial({ color: 0xf6c33b }));
    shadows(c); c.visible = false; c.userData.free = true;
    scene.add(c); coins.push(c);
  }
}
function addProp(obj, x, z, faceRoad) {
  obj.position.set(x, 0, z);
  obj.rotation.y = faceRoad ? -Math.PI / 2 : Math.random() * Math.PI * 2;
  if (x < 0 && faceRoad) obj.rotation.y = Math.PI / 2;
  scene.add(obj); props.push(obj);
}

// ---------- carteles de palabras ----------
const BORDERS = ['#ef5b5b', '#3f8ee8', '#4cb87a', '#9a6ee0', '#f39a3b'];
function cardTexture(word, emoji, color) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  const r = 70;
  g.fillStyle = color;
  g.beginPath(); g.roundRect(8, 8, 496, 496, r); g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath(); g.roundRect(34, 34, 444, 444, r - 20); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '230px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  g.fillText(emoji, 256, 210);
  g.fillStyle = '#23324a';
  const size = word.length > 6 ? 92 : 112;
  g.font = `700 ${size}px Andika, "Century Gothic", sans-serif`;
  g.fillText(word, 256, 420);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const postMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
function makeCard(word, i) {
  const group = new THREE.Group();
  const tex = cardTexture(word[0], word[2], BORDERS[i % BORDERS.length]);
  const card = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
  card.position.y = 2.15;
  const postGeo = new THREE.CylinderGeometry(.05, .05, 1.3, 8);
  [-.8, .8].forEach(x => { const p = new THREE.Mesh(postGeo, postMat); p.position.set(x, .65, -.02); p.castShadow = true; group.add(p); });
  group.add(card);
  group.userData = { word, card, tex };
  return group;
}

// ---------- estado del juego ----------
const state = {
  running: false, lane: 0, x: 0, hopT: 1, coins: 0, wins: 0, scroll: 0,
  target: null, gate: null, missed: false, nextCoinZ: -20, msgTimer: 0,
};
$('#estrellas').textContent = J.progress.stars;
const metas = $('#metas');
metas.innerHTML = Array.from({ length: GIFT_EVERY }, () => '<span class="meta">⭐</span>').join('');

function chooseTarget() {
  let w; do { w = J.pick(EASY); } while (state.target && w[0] === state.target[0]);
  state.target = w;
}
function spawnGate() {
  const t = state.target;
  const others = J.shuffle(EASY.filter(w => J.strip(w[0])[0] !== J.strip(t[0])[0] && w[0] !== t[0])).slice(0, 2);
  const words = J.shuffle([t, ...others]);
  const color0 = Math.floor(Math.random() * 5);
  const gate = { z: GATE_START, cards: [], done: false };
  words.forEach((w, i) => {
    const card = makeCard(w, color0 + i);
    card.position.set((i - 1) * LANE_W, 0, GATE_START);
    card.userData.lane = i - 1;
    card.userData.hint = state.missed && w === t;   // si falló antes, el cartel correcto brilla
    scene.add(card); gate.cards.push(card);
  });
  state.gate = gate;
  showTarget();
}
function showTarget() {
  const t = state.target, box = $('#target');
  $('#t-pic').textContent = t[2]; $('#t-word').textContent = t[0];
  box.hidden = false; box.classList.remove('nuevo'); void box.offsetWidth; box.classList.add('nuevo');
  J.say(['¡Busca: ' + t[0] + '!']);
}
$('#t-say').onclick = () => state.target && J.say(['Busca: ' + state.target[0]]);

function message(text, secs = 1.6) {
  const m = $('#mensaje'); m.textContent = text;
  m.classList.remove('ver'); void m.offsetWidth; m.classList.add('ver');
  state.msgTimer = secs;
}

function judge(gate) {
  const lane = Math.round(state.x / LANE_W);
  const chosen = gate.cards.find(c => c.userData.lane === lane);
  const t = state.target;
  if (chosen && chosen.userData.word === t) {
    chosen.userData.fly = 1;
    J.cheer(); J.confetti(40);
    message(J.pick(['¡Muy bien!', '¡Bravo!', '¡Genial!', '¡Súper!']));
    $('#estrellas').textContent = J.addStar();
    state.wins++; state.missed = false;
    metas.children[(state.wins - 1) % GIFT_EVERY].classList.add('on');
    setTimeout(() => J.say([t[1].split('-').join(', ') + '. ¡' + t[0] + '!'], { queue: true }), 700);
    if (state.wins % GIFT_EVERY === 0) setTimeout(giftTime, 1500);
    chooseTarget();
  } else {
    J.boing();
    message('¡Casi!');
    state.missed = true;
    const said = chosen ? 'Ese es ' + chosen.userData.word[0] + '. ' : '';
    J.say([said + '¡Busca ' + t[0] + '!']);
  }
}

function giftTime() {
  state.running = false;
  play('Survey');
  J.gift(() => {
    [...metas.children].forEach(m => m.classList.remove('on'));
    state.running = true; play('Run');
    showTarget();
  });
}

// ---------- monedas ----------
function placeCoins() {
  const lane = Math.floor(Math.random() * 3) - 1;
  let placed = 0;
  for (const c of coins) {
    if (!c.userData.free) continue;
    c.userData.free = false; c.visible = true; c.userData.fly = 0;
    c.position.set(lane * LANE_W, .45, state.nextCoinZ - placed * 2);
    if (++placed === 5) break;
  }
}

// ---------- animación del zorro ----------
let current = null;
function play(name) {
  const a = actions[name]; if (!a || a === current) return;
  a.reset().fadeIn(.3).play();
  if (current) current.fadeOut(.3);
  current = a;
}

// ---------- controles ----------
function move(dir) {
  if (!state.running) return;
  const nl = Math.max(-1, Math.min(1, state.lane + dir));
  if (nl === state.lane) { J.tones([200], .08, 'sine', .15); return; }
  state.lane = nl; state.hopT = 0;
  J.sfx('jump', .6);
}
$('#izq').addEventListener('pointerdown', e => { e.preventDefault(); move(-1); });
$('#der').addEventListener('pointerdown', e => { e.preventDefault(); move(1); });
addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') move(-1);
  if (e.key === 'ArrowRight' || e.key === 'd') move(1);
});
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
const clock = new THREE.Clock();
const camTarget = new THREE.Vector3();
function frame() {
  const dt = Math.min(clock.getDelta(), .05);
  const t = clock.elapsedTime;
  const v = state.running ? SPEED : 0;
  const dz = v * dt;

  if (mixer) mixer.update(dt);

  // zorrito: cambio de carril con saltito
  const tx = state.lane * LANE_W;
  state.x += (tx - state.x) * Math.min(1, dt * 9);
  state.hopT = Math.min(1, state.hopT + dt * 3.2);
  if (fox) {
    fox.position.x = state.x;
    fox.position.y = Math.sin(state.hopT * Math.PI) * .55;
    fox.rotation.z = (state.x - tx) * .12;
  }

  // suelo que corre
  state.scroll += dz;
  roadTex.offset.y = state.scroll / 8;
  walkTex.offset.y = state.scroll / 1.6;
  riverTexB.offset.y = state.scroll / 10 + t * .05;

  for (const p of props) { p.position.z += dz; if (p.position.z > 18) p.position.z -= LOOP; }
  for (const c of clouds) { c.position.z += dz * .15; c.position.x += dt * .3; if (c.position.z > 10) { c.position.z -= 120; c.position.x = (Math.random() - .5) * 60; } }

  // monedas
  if (state.running) {
    state.nextCoinZ += dz;
    if (state.nextCoinZ > -25) { placeCoins(); state.nextCoinZ = -60; }
  }
  for (const c of coins) {
    if (c.userData.free) continue;
    c.position.z += dz;
    c.rotation.y += dt * 3;
    if (c.userData.fly) {
      c.userData.fly += dt; c.position.y += dt * 6; c.scale.multiplyScalar(.96);
      if (c.userData.fly > .5) { c.visible = false; c.userData.free = true; c.scale.setScalar(1); }
    } else if (Math.abs(c.position.z) < .7 && Math.abs(c.position.x - state.x) < .9) {
      c.userData.fly = .001;
      state.coins++; $('#monedas').textContent = state.coins;
      J.sfx('coin', .5, 1 + (state.coins % 5) * .05);
    } else if (c.position.z > 8) { c.visible = false; c.userData.free = true; }
  }

  // carteles
  const gate = state.gate;
  if (gate) {
    gate.z += dz;
    for (const card of gate.cards) {
      card.position.z = gate.z;
      const ud = card.userData;
      ud.card.position.y = 2.15 + Math.sin(t * 2 + ud.lane) * .06 + (ud.hint ? Math.abs(Math.sin(t * 5)) * .25 : 0);
      if (ud.fly) { ud.fly += dt; card.position.y += dt * 4; ud.card.rotation.y += dt * 10; }
    }
    if (!gate.done && gate.z >= 0) { gate.done = true; judge(gate); }
    if (gate.z > 9) {
      gate.cards.forEach(c => { scene.remove(c); c.userData.tex.dispose(); c.userData.card.material.dispose(); c.userData.card.geometry.dispose(); });
      state.gate = null;
      if (state.running) spawnGate();
    }
  }

  if (state.msgTimer > 0) { state.msgTimer -= dt; if (state.msgTimer <= 0) $('#mensaje').classList.remove('ver'); }

  // cámara detrás del zorrito, como en los juegos de correr
  camera.position.set(state.x * .45, 4.4, 7.2);
  camTarget.set(state.x * .3, 1.2, -8);
  camera.lookAt(camTarget);
  sun.position.set(state.x + 6, 14, 6); sun.target.position.set(state.x, 0, -2);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function start() {
  $('#portada').hidden = true;
  J.audio(); J.startMusic();
  state.running = true;
  play('Run');
  chooseTarget();
  spawnGate();
}

// ---------- inicio ----------
(async () => {
  try { await Promise.race([document.fonts.load('700 100px Andika'), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  await build();
  J.refreshMusic();
  requestAnimationFrame(frame);
  const go = $('#empezar');
  go.disabled = false; go.textContent = '▶ ¡A correr!';
  go.onclick = start;
})();
