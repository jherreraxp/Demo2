// Aplasta Gusanos — los gusanitos salen de sus hoyos con un letrero; hay que tocar el que se escucha.
import * as THREE from 'three';
import { crearMundo, chispitas, esperaFuente, tarjeta } from './mundo3d.js';
import { crearPersonaje } from './personajes.js';

const J = window.Juego, P = J.progress;
const $ = s => document.querySelector(s);

const VOC = ['a', 'e', 'i', 'o', 'u'];
const NIVELES = [
  { nombre: 'Vocales', tipo: 'vocal', ver: true, stay: 3.2, max: 2 },
  { nombre: 'Sonidos m · s · l · n', tipo: 'sonido', pool: ['m', 's', 'l', 'n', 'a', 'o'], ver: false, stay: 3, max: 3 },
  { nombre: 'Sílabas (mirando)', tipo: 'silaba', pool: ['ma', 'me', 'mi', 'mo', 'mu', 'pa', 'pe', 'pi', 'po', 'pu', 'la', 'lo', 'sa', 'so'], ver: true, stay: 2.8, max: 3 },
  { nombre: 'Sílabas (escuchando)', tipo: 'silaba', pool: ['ta', 'te', 'to', 'na', 'ne', 'no', 'da', 'de', 'do', 'ma', 'pa', 'la', 'sa', 'su', 'lu'], ver: false, stay: 2.6, max: 4 },
  { nombre: 'Palabras', tipo: 'palabra', ver: false, stay: 2.6, max: 4 },
  { nombre: 'Palabras rápidas', tipo: 'palabra', ver: false, stay: 2, max: 5 },
];
const WIN = 8;
let WORDS = J.WORDS.filter(w => w[0].length <= 5).map(w => w[0]);

// ---------- jardín ----------
const W = crearMundo($('#mundo'), { fog: 0xf2fbe6, near: 25, far: 70, fov: 45 });
const { scene, camera } = W;
W.fovFor = a => a < .8 ? 64 : 42;
const fx = chispitas(scene);
const narrow = () => innerWidth / innerHeight < .8;
function placeCamera() { if (narrow()) { camera.position.set(0, 15.5, 11); camera.lookAt(0, 0, .9); } else { camera.position.set(0, 7, 8.6); camera.lookAt(0, .3, .2); } }
addEventListener('resize', placeCamera); placeCamera();

const grassTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#7fcc5a'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 300; i++) { g.fillStyle = ['#8fd46a', '#6fbd4c', '#9add77'][i % 3]; g.fillRect(Math.random() * 128, Math.random() * 128, 3, 6); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(20, 20); return t; })();
const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48), new THREE.MeshLambertMaterial({ map: grassTex }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
// cerquita de madera y flores
const fence = new THREE.Group(); scene.add(fence);
const wood = new THREE.MeshStandardMaterial({ color: 0xc98b55, roughness: .8 });
for (let x = -9; x <= 9; x += 1.2) { const p = new THREE.Mesh(new THREE.BoxGeometry(.2, 1.1, .12), wood); p.position.set(x, .55, -5.5); p.castShadow = true; fence.add(p); }
const rail = new THREE.Mesh(new THREE.BoxGeometry(18.5, .12, .1), wood); rail.position.set(0, .8, -5.5); fence.add(rail);
const fcols = [0xff7eb6, 0xffd23f, 0xffffff, 0xb07de8, 0xef5b5b];
for (let i = 0; i < 40; i++) {
  const f = new THREE.Group(); const a = Math.random() * Math.PI * 2, r = 5 + Math.random() * 7;
  f.position.set(Math.cos(a) * r, 0, Math.sin(a) * r * .6 - 1);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .4, 5), new THREE.MeshLambertMaterial({ color: 0x3f9b4a })); stem.position.y = .2; f.add(stem);
  const h = new THREE.Mesh(new THREE.SphereGeometry(.1, 8, 6), new THREE.MeshLambertMaterial({ color: fcols[i % 5] })); h.position.y = .42; f.add(h);
  scene.add(f);
}

// hoyos: 3 x 3
const holes = [];
const holeMat = new THREE.MeshLambertMaterial({ color: 0x3b2618 }), moundMat = new THREE.MeshStandardMaterial({ color: 0x8a5a3c, roughness: .95 });
for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
  const x = (c - 1) * 2.8, z = (r - 1) * 2.2;
  const mound = new THREE.Mesh(new THREE.TorusGeometry(.62, .2, 10, 24), moundMat); mound.rotation.x = -Math.PI / 2; mound.position.set(x, .06, z); mound.receiveShadow = true; scene.add(mound);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(.6, 24), holeMat); hole.rotation.x = -Math.PI / 2; hole.position.set(x, .02, z); scene.add(hole);
  holes.push({ x, z, worm: null });
}

// ---------- gusanito ----------
const HATS = [0xef5b5b, 0x3f8ee8, 0xf6c33b, 0x9a6ee0, 0xff7eb6];
function makeWorm(label) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const green = [0x8fd14f, 0x6fc23a];
  for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.34 - i * .02, 16, 12), new THREE.MeshStandardMaterial({ color: green[i % 2], roughness: .6 })); s.position.y = i * .32; s.castShadow = true; body.add(s); }
  const head = new THREE.Group(); head.position.y = 1.3; body.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(.36, 18, 14), new THREE.MeshStandardMaterial({ color: 0x9add5f, roughness: .5 })));
  const black = new THREE.MeshStandardMaterial({ color: 0x1d2233 }), white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  [-1, 1].forEach(sx => { const e = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), black); e.position.set(sx * .13, .06, .32); e.scale.y = 1.3; head.add(e); const hl = new THREE.Mesh(new THREE.SphereGeometry(.025, 6, 4), white); hl.position.set(sx * .13 + .02, .1, .38); head.add(hl); });
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(.08, .018, 8, 14, Math.PI), new THREE.MeshStandardMaterial({ color: 0x2f6b3a })); mouth.rotation.z = Math.PI; mouth.position.set(0, -.1, .33); head.add(mouth);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(.22, .4, 14), new THREE.MeshStandardMaterial({ color: J.pick(HATS) })); hat.position.y = .42; hat.rotation.z = .2; head.add(hat);
  const pom = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff })); pom.position.set(.05, .62, 0); head.add(pom);
  // letrero que sostiene
  const tex = tarjeta(label, { color: '#ffd23f' });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  sign.position.set(0, .55, .4); body.add(sign);
  return { g, body, head, sign, tex };
}

// martillo de juguete
const hammer = new THREE.Group();
const hHead = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .8, 18), new THREE.MeshStandardMaterial({ color: 0xef3b4a, roughness: .4 }));
hHead.rotation.z = Math.PI / 2; hHead.position.y = 1.4; hammer.add(hHead);
[-1, 1].forEach(sx => { const cap = new THREE.Mesh(new THREE.CylinderGeometry(.33, .33, .08, 18), new THREE.MeshStandardMaterial({ color: 0xffd23f })); cap.rotation.z = Math.PI / 2; cap.position.set(sx * .42, 1.4, 0); hammer.add(cap); });
const handle = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 1.4, 10), new THREE.MeshStandardMaterial({ color: 0x3f8ee8 })); handle.position.y = .7; hammer.add(handle);
const hammerPivot = new THREE.Group(); hammerPivot.add(hammer); hammer.position.set(0, 0, 0); hammerPivot.visible = false; scene.add(hammerPivot);
let hammerT = 0;

// ---------- juego ----------
const state = { nivel: 0, wins: 0, target: null, running: false, spawnT: 0, bigCase: false, celebrate: 0 };
const cfg = () => NIVELES[state.nivel];
const pool = () => cfg().tipo === 'vocal' ? VOC : cfg().tipo === 'palabra' ? WORDS : cfg().pool;
const show = v => (cfg().tipo === 'vocal' || cfg().tipo === 'sonido') && state.bigCase ? v.toUpperCase() : v;
let actors = [];
const actor = () => actors[P.two ? P.turn % 2 : 0];
function swapActor() { actors.forEach(a => { a.group.visible = a === actor(); }); const p = J.player(); $('#jugador').innerHTML = `${J.CHARS[p.char]?.emoji || '⭐'} ${J.esc(p.name)} · ⭐ ${p.stars}`; }
function renderMetas() { $('#metas').innerHTML = Array.from({ length: WIN }, (_, i) => `<span class="meta ${i < state.wins ? 'on' : ''}">⭐</span>`).join(''); }
function message(text, secs = 1.3) { const el = $('#mensaje'); el.textContent = text; el.classList.remove('ver'); void el.offsetWidth; el.classList.add('ver'); clearTimeout(message.t); message.t = setTimeout(() => el.classList.remove('ver'), secs * 1000); }

function newTarget() {
  state.bigCase = Math.random() < .5;
  let t; do { t = J.pick(pool()); } while (t === state.target && pool().length > 1);
  state.target = t;
  holes.forEach(h => { if (h.worm && !h.worm.hit) h.worm.leave = true; });
  $('#m-word').textContent = cfg().ver ? show(t) : '🔊';
  const box = $('#mision'); box.hidden = false; box.classList.remove('nuevo'); void box.offsetWidth; box.classList.add('nuevo');
  sayTarget();
  state.spawnT = .6;
}
function sayTarget() {
  const c = cfg(), t = state.target;
  if (c.tipo === 'sonido') { J.say('Aplasta al gusano que dice'); J.sound(t, { queue: true }); }
  else if (c.tipo === 'vocal') J.say(['Aplasta al gusano que dice', t, state.bigCase ? 'grande' : 'chiquita']);
  else J.say(['Aplasta al gusano que dice', t]);
}
$('#m-say').onclick = sayTarget;

function spawn() {
  const free = holes.filter(h => !h.worm);
  const alive = holes.filter(h => h.worm && !h.worm.leave && !h.worm.hit);
  if (!free.length || alive.length >= cfg().max) return;
  const h = J.pick(free);
  const hasTarget = alive.some(x => x.worm.value === state.target);
  const v = !hasTarget || Math.random() < .3 ? state.target : J.pick(pool().filter(x => x !== state.target));
  const w = makeWorm(show(v));
  w.g.position.set(h.x, -1.9, h.z);
  scene.add(w.g);
  h.worm = Object.assign(w, { value: v, label: show(v), t: 0, stay: cfg().stay + Math.random() * .8, leave: false, hit: 0, wob: 0 });
}
function removeWorm(h) { scene.remove(h.worm.g); h.worm.tex.dispose(); h.worm = null; }

function bonk(h) {
  const w = h.worm;
  if (!w || w.hit || !state.running) return;
  if (w.value === state.target) {
    w.hit = .001;
    hammerPivot.position.set(h.x + .9, 0, h.z); hammerPivot.visible = true; hammerT = 0;
    setTimeout(() => {
      J.sfx('land', 1, .8); J.sfx('pop', 1, .7);
      fx.burst(new THREE.Vector3(h.x, 1.2, h.z), 50);
    }, 160);
    J.cheer();
    message('¡Pum!');
    J.addStar(); swapActor();
    state.wins++; state.celebrate = 1.2; renderMetas();
    if (cfg().tipo === 'sonido') J.sound(state.target, { queue: true }); else J.say(w.label, { queue: true });
    state.running = false;
    if (state.wins >= WIN) { setTimeout(levelUp, 1500); return; }
    setTimeout(() => J.nextTurn(() => { state.running = true; newTarget(); }, { onShow: swapActor }), 1500);
  } else {
    w.wob = 1; J.boing();
    message('¡Ese no!', 1);
    if (cfg().tipo === 'sonido') { J.say('Ese suena'); J.sound(w.value, { queue: true }); }
    else J.say(['Ese dice', w.label]);
  }
}
function levelUp() {
  P.level.gusanos = Math.max(P.level.gusanos || 0, state.nivel + 1); J.save();
  J.gift(() => {
    state.nivel = Math.min(state.nivel + 1, NIVELES.length - 1); state.wins = 0; renderMetas();
    $('#nivel-num').textContent = state.nivel + 1;
    message('Nivel ' + (state.nivel + 1), 2); J.say(['Nivel', ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis'][state.nivel]]);
    state.running = true; newTarget();
  });
}

const ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
$('#mundo').addEventListener('pointerdown', e => {
  v2.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(v2, camera);
  let best = null, bd = Infinity;
  for (const h of holes) { if (!h.worm || h.worm.g.position.y < -1) continue; const hit = ray.intersectObject(h.worm.g, true)[0]; if (hit && hit.distance < bd) { bd = hit.distance; best = h; } }
  if (best) bonk(best);
});

W.onFrame((dt, t) => {
  if (state.running && state.target) { state.spawnT -= dt; if (state.spawnT <= 0) { spawn(); state.spawnT = .7 + Math.random() * .6; } }
  for (const h of holes) {
    const w = h.worm; if (!w) continue;
    w.t += dt;
    if (w.hit) {
      w.hit += dt;
      w.body.scale.y = Math.max(.25, 1 - w.hit * 4); w.head.rotation.y += dt * 10;
      if (w.hit > .9) { w.g.position.y -= dt * 4; if (w.g.position.y < -2) removeWorm(h); }
      continue;
    }
    const up = !w.leave && w.t < w.stay;
    const ty = up ? 0 : -2.1;
    w.g.position.y += (ty - w.g.position.y) * Math.min(1, dt * (up ? 9 : 6));
    w.g.rotation.z = Math.sin(t * 3 + h.x) * .06 + (w.wob > 0 ? Math.sin(w.wob * 30) * w.wob * .35 : 0);
    w.wob = Math.max(0, w.wob - dt * 1.4);
    if (!up && w.g.position.y < -2) removeWorm(h);
  }
  if (hammerPivot.visible) {
    hammerT += dt;
    hammer.rotation.z = hammerT < .16 ? hammerT / .16 * 1.5 : 1.5 - Math.min(1.5, (hammerT - .3) * 3);
    if (hammerT > .9) hammerPivot.visible = false;
  }
  const a = actor();
  if (a) { state.celebrate -= dt; a.update(dt, state.celebrate > 0 ? 'festejar' : 'bailar'); }
  fx.update(dt);
});

function start(n) {
  $('#portada').hidden = true; J.startMusic();
  state.nivel = n; state.wins = 0; renderMetas(); $('#nivel-num').textContent = n + 1;
  const go = () => { state.running = true; newTarget(); };
  if (P.two) J.showTurn(go, { onShow: swapActor }); else go();
}

(async () => {
  await esperaFuente();
  await J.ready;
  const conf = J.palabras('gusanos');
  if (conf.length >= 4) WORDS = conf.map(w => w[0]);
  const ids = P.two ? [P.players[0].char, P.players[1].char] : [P.players[0].char];
  for (const id of ids) { const a = await crearPersonaje(id); a.group.position.set(narrow() ? 0 : -5.4, 0, narrow() ? 4.6 : 1.2); a.group.rotation.y = .5; a.group.scale.setScalar(narrow() ? .9 : 1.2); scene.add(a.group); actors.push(a); }
  swapActor();
  W.start(); J.refreshMusic();
  const unlocked = Math.min(NIVELES.length, (P.level.gusanos || 0) + 1);
  let sel = unlocked - 1;
  const box = $('#niveles');
  box.innerHTML = NIVELES.map((n, i) => `<button data-i="${i}" ${i >= unlocked ? 'disabled aria-label="Nivel bloqueado"' : ''} class="${i === sel ? 'on' : ''}">${i < unlocked ? i + 1 : '🔒'}</button>`).join('');
  box.onclick = e => { const b = e.target.closest('[data-i]'); if (!b || b.disabled) return; sel = +b.dataset.i; [...box.children].forEach((c, k) => c.classList.toggle('on', k === sel)); $('#nivel-desc').textContent = NIVELES[sel].nombre; J.sfx('pop'); };
  $('#nivel-desc').textContent = NIVELES[sel].nombre;
  const go = $('#empezar'); go.disabled = false; go.textContent = '▶ ¡A jugar!';
  go.onclick = () => start(sel);
  if (location.hash === '#prueba') { window.__g = { state, holes, bonk }; start(0); }
})();
