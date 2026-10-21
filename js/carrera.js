// Carrera de Palabras — tu personaje corre por un camino de tres carriles. Vienen filas de animalitos
// y cosas (como monedas) con un globito de texto encima. Si atrapa los de la palabra que escuchó, salen
// moneditas; si atrapa otros, queda una popó en el camino. Con los niveles el dibujo se va borrando
// hasta que solo queda el texto, y todo va más rápido.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { chispitas, tarjeta, esperaFuente } from './mundo3d.js';
import { crearPersonaje, crearObjeto, crearPopo, crearMoneda } from './personajes.js';

const J = window.Juego, P = J.progress;
const $ = s => document.querySelector(s);
const TEST = location.hash === '#prueba';

// ---------- niveles ----------
// fade: 0 = se ve el dibujo 3D completo; 1 = solo el globito con el texto
const NIVELES = [
  { speed: 6.0,  fila: 3, opts: 2, fade: 0,   meta: 12, tiempo: 100, tipo: 'palabra',   nombre: 'Con dibujo, 2 caminos' },
  { speed: 7.0,  fila: 3, opts: 3, fade: .35, meta: 14, tiempo: 95,  tipo: 'palabra',   nombre: 'El dibujo se borra un poquito' },
  { speed: 8.0,  fila: 4, opts: 3, fade: .7,  meta: 16, tiempo: 90,  tipo: 'palabra',   nombre: 'Casi solo la palabra' },
  { speed: 9.0,  fila: 4, opts: 3, fade: 1,   meta: 18, tiempo: 85,  tipo: 'parecidas', nombre: 'Solo el texto: palabras parecidas' },
  { speed: 10,   fila: 4, opts: 3, fade: 1,   meta: 18, tiempo: 80,  tipo: 'silaba',    nombre: '¿Con qué empieza?' },
  { speed: 11,   fila: 5, opts: 3, fade: 1,   meta: 20, tiempo: 75,  tipo: 'parecidas', nombre: '¡Súper rápido! Solo la palabra' },
];
let EASY = [];   // [palabra, sílabas, dibujo, modelo] — se carga de la configuración (modo admin)
const syl0 = w => J.strip(w[1].split('-')[0]);

const LANE_W = 2.2, ROAD_W = LANE_W * 3, LOOP = 150;
const ROW_START = TEST ? -24 : -58;
const SPACING = 2.2;   // distancia entre animalitos de una fila

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

// ---------- animalitos con globito de texto ----------
// globito con el dibujito (que se va borrando con los niveles) y la palabra sin artículo
function bubbleTex(text, emoji = '', alpha = 0) {
  const pic = emoji && alpha > .02;
  const c = document.createElement('canvas'); c.width = 512; c.height = pic ? 420 : 300; const g = c.getContext('2d');
  const top = pic ? 14 : 14, h = pic ? 330 : 210;
  g.fillStyle = '#ffffff'; g.strokeStyle = '#9a6ee0'; g.lineWidth = 14;
  g.beginPath(); g.roundRect(14, top, 484, h, 90); g.fill(); g.stroke();
  const tip = top + h - 4;
  g.beginPath(); g.moveTo(226, tip); g.lineTo(256, tip + 68); g.lineTo(290, tip); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ffffff'; g.fillRect(230, tip - 14, 56, 18);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (pic) {
    g.globalAlpha = alpha;
    g.font = '150px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    g.fillText(emoji, 256, top + 100);
    g.globalAlpha = 1;
  }
  g.fillStyle = '#23324a';
  g.font = `700 ${text.length > 7 ? 92 : 120}px Andika, "Century Gothic", sans-serif`; g.fillText(text, 256, pic ? top + 250 : 122);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData = { alto: c.height }; return t;
}
const texCache = {};
function makeItem(item, fade) {
  const g = new THREE.Group();
  const o = crearObjeto(item.obj, item.emoji);
  o.group.scale.setScalar(1.35);
  // el dibujo se va borrando con los niveles
  o.group.traverse(m => { if (m.material) { m.material = m.material.clone(); m.material.transparent = fade > 0; m.material.opacity = 1 - fade; m.castShadow = fade < .5; } });
  o.group.visible = fade < 1;
  g.add(o.group);
  const ck = item.text + '|' + (item.emoji || '') + '|' + fade;
  const tex = texCache[ck] || (texCache[ck] = bubbleTex(item.text, item.emoji, 1 - fade));
  const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
  const s = fade >= 1 ? 1.5 : 1.6;
  sign.scale.set(s, s * tex.userData.alto / 512, 1); sign.position.y = fade >= 1 ? 1.1 : 2.3;
  g.add(sign);
  g.userData = { item, o, sign, baseY: sign.position.y };
  return g;
}

// ---------- preguntas según el nivel ----------
function makeQuestion(cfg) {
  const asItem = w => ({ text: w[0], emoji: w[2], obj: w[3] || w[0], key: w[0] });
  if (cfg.tipo === 'silaba') {
    const cand = EASY.filter(x => /^[^aeiou]?[aeiou]$/.test(syl0(x)));
    const w = J.pick(cand.length ? cand : EASY), t = asItem(w); t.syl = syl0(w);
    return { target: t, show: t.syl, pool: () => J.shuffle(EASY.filter(x => syl0(x) !== t.syl)).slice(0, cfg.opts - 1).map(asItem), say: ['Algo que empieza con', t.syl] };
  }
  const w = J.pick(EASY), t = asItem(w);
  return {
    target: t, say: [`Atrapa ${J.art(w[0])}`, w[0]],
    pool: () => {
      let pool = EASY.filter(x => x[0] !== w[0]);
      if (cfg.tipo === 'parecidas') { const near = pool.filter(x => J.strip(x[0])[0] === J.strip(w[0])[0] || x[0].slice(-2) === w[0].slice(-2)); if (near.length >= cfg.opts - 1) pool = near; }
      else pool = pool.filter(x => J.strip(x[0])[0] !== J.strip(w[0])[0]);
      return J.shuffle(pool).slice(0, cfg.opts - 1).map(asItem);
    },
  };
}

// ---------- estado ----------
const state = { running: false, lane: 0, x: 0, hopT: 1, scroll: 0, nivel: 0, coins: 0, items: [], popos: [], monedas: [], q: null, celebrate: 0, wave: null, tiempo: 0, mochila: [], fallos: 0 };
const cfgN = () => NIVELES[state.nivel];
const speed = () => cfgN().speed * (1 + Math.min(.25, state.fallos * .03));

function newWave() {
  // una ola: en un carril vienen los de la palabra; en los otros, otros animalitos
  const cfg = cfgN();
  state.q = makeQuestion(cfg);
  const q = state.q;
  const others = q.pool();
  const lanes = J.shuffle([-1, 0, 1]).slice(0, cfg.opts);
  const kinds = [q.target, ...others];
  state.wave = { left: 0, key: q.target.key };
  lanes.forEach((lane, i) => {
    for (let k = 0; k < cfg.fila; k++) {
      const g = makeItem(kinds[i], cfg.fade);
      g.position.set(lane * LANE_W, 0, ROW_START - k * SPACING - (i % 2) * .6);
      g.userData.lane = lane; g.userData.good = i === 0;
      scene.add(g); state.items.push(g); state.wave.left++;
    }
  });
  showTarget();
}
function showTarget() {
  const q = state.q, cfg = cfgN();
  $('#m-etq').textContent = q.target.syl ? 'Empieza con' : 'Atrapa';
  const pic = $('#m-pic');
  pic.textContent = q.target.emoji || '🔊'; pic.style.opacity = String(1 - cfg.fade); pic.hidden = cfg.fade >= 1;
  $('#m-word').textContent = q.show || q.target.text;
  const box = $('#mision'); box.hidden = false; box.classList.remove('nuevo'); void box.offsetWidth; box.classList.add('nuevo');
  J.say(q.say);
}
$('#m-say').onclick = () => state.q && J.say(state.q.say);
function message(text, secs = 1.2) {
  const el = $('#mensaje'); el.textContent = text;
  el.classList.remove('ver'); void el.offsetWidth; el.classList.add('ver');
  clearTimeout(message.t); message.t = setTimeout(() => el.classList.remove('ver'), secs * 1000);
}
function renderHud() {
  const c = cfgN();
  $('#monedas').textContent = `${state.coins} / ${c.meta}`;
  $('#nivel-num').textContent = state.nivel + 1;
  const pct = Math.max(0, state.tiempo / c.tiempo);
  $('#reloj-barra').style.width = (pct * 100) + '%';
  $('#reloj-barra').style.background = pct < .25 ? '#ef5b5b' : pct < .5 ? '#f6c33b' : '#4cb87a';
}
function renderMochila() { $('#mochila').innerHTML = '🎒 ' + state.mochila.slice(-8).map(e => `<span>${e}</span>`).join(''); }

function atrapar(g) {
  const ud = g.userData;
  if (ud.good) {
    ud.fly = .001;
    // monedita que sale volando
    const m = crearMoneda(); m.position.copy(g.position).add(new THREE.Vector3(0, 1.2, 0)); m.userData.t = 0; scene.add(m); state.monedas.push(m);
    J.moneda();
    state.coins++;
    if (state.coins % 3 === 0) { J.cheer(); message(J.pick(['¡Muy bien!', '¡Bravo!', '¡Súper!'])); state.celebrate = .8; J.addStar(); swapActor(); }
    if (ud.item.emoji) { state.mochila.push(ud.item.emoji); renderMochila(); }
    if (state.coins >= cfgN().meta) { state.running = false; setTimeout(levelUp, 900); }
  } else {
    // equivocado: queda una popó en el camino
    ud.bump = .001;
    const p = crearPopo(); p.position.set(g.position.x, 0, g.position.z + .3); scene.add(p); state.popos.push(p);
    J.efecto('popo'); state.fallos++;
    message('¡Uy, popó! 💩', 1);
    if (state.wave && !state.wave.dicho) { state.wave.dicho = true; J.say(['¡Uy, popó!', ...state.q.say]); }
  }
}
function levelUp() {
  P.level.carrera = Math.max(P.level.carrera || 0, state.nivel + 1); J.save();
  limpiar();
  J.gift(() => {
    state.nivel = Math.min(state.nivel + 1, NIVELES.length - 1);
    empezarNivel();
  });
}
function seAcaboElTiempo() {
  state.running = false; limpiar();
  message('¡Se acabó el tiempo!', 2.5);
  J.say('¡Uy! Se acabó el tiempo. ¡Otra vez!');
  setTimeout(empezarNivel, 2800);
}
function limpiar() {
  state.items.forEach(g => scene.remove(g)); state.items = [];
  state.popos.forEach(p => scene.remove(p)); state.popos = [];
  state.wave = null;
}
function empezarNivel() {
  state.coins = 0; state.fallos = 0; state.tiempo = cfgN().tiempo; state.mochila = [];
  renderHud(); renderMochila();
  message('Nivel ' + (state.nivel + 1), 1.6);
  const go = () => { state.running = true; newWave(); };
  if (P.two) J.showTurn(go, { onShow: swapActor }); else go();
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

  // reloj del nivel
  if (state.running) { state.tiempo -= dt; if (Math.floor(state.tiempo * 4) !== Math.floor((state.tiempo + dt) * 4)) renderHud(); if (state.tiempo <= 0) seAcaboElTiempo(); }
  // animalitos
  for (const g of state.items.slice()) {
    const ud = g.userData;
    g.position.z += dz;
    ud.o.update(dt, ud.fly > 0);
    ud.sign.position.y = ud.baseY + Math.sin(t * 3 + ud.lane + g.position.z) * .05;
    if (ud.fly) { ud.fly += dt; g.position.y += dt * 6; g.position.x += (state.x - g.position.x) * dt * 4; g.scale.multiplyScalar(.92); }
    else if (ud.bump) { ud.bump += dt; g.position.x += Math.sign(g.position.x - state.x || 1) * dt * 7; g.rotation.z += dt * 6; }
    else if (!ud.done && g.position.z >= -.4) {
      ud.done = true;
      if (Math.abs(g.position.x - state.x) < LANE_W * .55) atrapar(g);
    }
    if (g.position.z > 9 || g.scale.x < .05) {
      scene.remove(g); state.items.splice(state.items.indexOf(g), 1);
      if (state.wave) { state.wave.left--; if (state.wave.left <= 0 && state.running) { state.wave = null; if (P.two) { state.running = false; J.nextTurn(() => { swapActor(); state.running = true; newWave(); }, { onShow: swapActor }); } else newWave(); } }
    }
  }
  // popós que se quedan en el camino y moneditas que vuelan
  for (const p of state.popos.slice()) { p.position.z += dz; if (p.position.z > 10) { scene.remove(p); state.popos.splice(state.popos.indexOf(p), 1); } }
  for (const m of state.monedas.slice()) { m.userData.t += dt; m.position.y += dt * 4; m.rotation.y += dt * 12; m.scale.setScalar(Math.max(.01, 1 - m.userData.t)); if (m.userData.t > 1) { scene.remove(m); state.monedas.splice(state.monedas.indexOf(m), 1); } }
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
  state.nivel = nivel;
  empezarNivel();
}

(async () => {
  await esperaFuente();
  await J.ready;
  EASY = J.palabras('carrera');
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
  if (TEST) { window.__c = state; window.__cStart = start; start(0); }
})();
