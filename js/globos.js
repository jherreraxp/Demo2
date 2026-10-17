// Revienta Globos — suben globos con letras, sonidos, sílabas o palabras; hay que tocar el que se escucha.
import * as THREE from 'three';
import { crearMundo, chispitas, esperaFuente } from './mundo3d.js';
import { crearPersonaje } from './personajes.js';

const J = window.Juego, P = J.progress;
const $ = s => document.querySelector(s);

const VOC = ['a', 'e', 'i', 'o', 'u'];
const NIVELES = [
  { nombre: 'Vocales', tipo: 'vocal', speed: 1.1, max: 4 },
  { nombre: 'Sonidos m · s · l · n', tipo: 'sonido', pool: ['m', 's', 'l', 'n', 'a', 'o'], speed: 1.2, max: 4 },
  { nombre: 'Sílabas ma · pa · la · sa', tipo: 'silaba', pool: ['ma', 'me', 'mi', 'mo', 'mu', 'pa', 'pe', 'pi', 'po', 'pu', 'la', 'lo', 'sa', 'so'], speed: 1.4, max: 5 },
  { nombre: 'Más sílabas', tipo: 'silaba', pool: ['ta', 'te', 'to', 'na', 'ne', 'no', 'da', 'de', 'do', 'ma', 'pa', 'la', 'sa', 'su', 'lu'], speed: 1.6, max: 6 },
  { nombre: 'Palabras', tipo: 'palabra', speed: 1.6, max: 5 },
  { nombre: 'Palabras rápidas', tipo: 'palabra', speed: 2.1, max: 7 },
];
const WIN = 6;
let WORDS = J.WORDS.filter(w => w[0].length <= 5);

// ---------- mundo ----------
const W = crearMundo($('#mundo'), { fog: 0xffe1f0, near: 30, far: 90, fov: 50 });
const { scene, camera } = W;
W.fovFor = a => a < .8 ? 70 : 50;
camera.position.set(0, 3.2, 12); camera.lookAt(0, 3.6, 0);
const fx = chispitas(scene);

// colinas y castillo de fondo
const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 40), new THREE.MeshLambertMaterial({ color: 0x8fd46a }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
[[-18, -30, 14, 0x7cc95a], [16, -34, 16, 0x86d160], [0, -45, 20, 0x74c055]].forEach(([x, z, r, c]) => {
  const h = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12), new THREE.MeshLambertMaterial({ color: c })); h.position.set(x, -r * .6, z); h.scale.y = .6; scene.add(h);
});
function castle() {
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: 0xf6eefc, roughness: .7 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x9a6ee0, roughness: .5 });
  const pink = new THREE.MeshStandardMaterial({ color: 0xff8fc0, roughness: .5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 3), wall); body.position.y = 2.5; g.add(body);
  [[-4.5, 7, 1.3, roof], [4.5, 7, 1.3, roof], [-2, 9, 1, pink], [2, 9, 1, pink], [0, 11, 1.4, roof]].forEach(([x, h, r, m]) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), wall); t.position.set(x, h / 2, -.5); g.add(t);
    const c = new THREE.Mesh(new THREE.ConeGeometry(r * 1.3, r * 2.4, 16), m); c.position.set(x, h + r * 1.2, -.5); g.add(c);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(.8, .5), new THREE.MeshBasicMaterial({ color: 0xffd23f, side: THREE.DoubleSide })); f.position.set(x + .4, h + r * 2.4 + .3, -.5); g.add(f);
  });
  const door = new THREE.Mesh(new THREE.CircleGeometry(1.1, 20, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x8a5a3c })); door.position.set(0, 0, 1.52); g.add(door);
  const doorB = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), door.material); doorB.position.set(0, .0, 1.52); g.add(doorB);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
const cas = castle(); cas.position.set(0, 0, -22); scene.add(cas);

// ---------- globos ----------
const COLS = [0xef5b5b, 0x3f8ee8, 0x4cb87a, 0x9a6ee0, 0xf39a3b, 0xff7eb6, 0xf6c33b];
const balloonGeo = new THREE.SphereGeometry(.9, 28, 20);
const knotGeo = new THREE.ConeGeometry(.16, .25, 10);
function labelTex(text) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const fs = text.length > 4 ? 64 : text.length > 2 ? 86 : text.length > 1 ? 110 : 150;
  g.font = `700 ${fs}px Andika, "Century Gothic", sans-serif`;
  g.lineWidth = 14; g.strokeStyle = 'rgba(35,50,74,.85)'; g.lineJoin = 'round';
  g.strokeText(text, 128, 132); g.fillStyle = '#ffffff'; g.fillText(text, 128, 132);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const balloons = [];
function spawn(value, label) {
  const g = new THREE.Group();
  const col = J.pick(COLS);
  const m = new THREE.MeshStandardMaterial({ color: col, roughness: .25, metalness: .05, emissive: col, emissiveIntensity: .12 });
  const b = new THREE.Mesh(balloonGeo, m); b.scale.set(1, 1.15, 1); b.castShadow = true; g.add(b);
  const k = new THREE.Mesh(knotGeo, m); k.position.y = -1.1; k.rotation.x = Math.PI; g.add(k);
  const shine = new THREE.Mesh(new THREE.SphereGeometry(.18, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .7 })); shine.position.set(-.35, .45, .7); g.add(shine);
  const str = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1.2, 0), new THREE.Vector3(.1, -2, 0), new THREE.Vector3(-.1, -2.8, 0)]), new THREE.LineBasicMaterial({ color: 0x666666 }));
  g.add(str);
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: labelTex(label), transparent: true, depthWrite: false }));
  lab.position.z = .92; g.add(lab);
  const narrow = innerWidth / innerHeight < .8;
  const spanX = narrow ? 2.6 : 6.5;
  let x = (Math.random() * 2 - 1) * spanX;
  for (let tries = 0; tries < 6 && balloons.some(o => Math.abs(o.g.position.x - x) < 1.9 && o.g.position.y < 1.5); tries++) x = (Math.random() * 2 - 1) * spanX;
  g.position.set(x, -2.5, -Math.random() * 2);
  scene.add(g);
  const o = { g, value, label, wob: 0, phase: Math.random() * 6, pop: 0 };
  balloons.push(o); return o;
}
function removeBalloon(o) { scene.remove(o.g); o.g.traverse(m => { if (m.material) { m.material.map?.dispose(); m.material.dispose(); } }); balloons.splice(balloons.indexOf(o), 1); }

// ---------- juego ----------
const state = { nivel: 0, wins: 0, target: null, running: false, nextSpawn: 0, bigCase: false, celebrate: 0 };
let actors = [];
const actor = () => actors[P.two ? P.turn % 2 : 0];
function swapActor() {
  actors.forEach(a => { a.group.visible = a === actor(); });
  const p = J.player(); $('#jugador').innerHTML = `${J.CHARS[p.char]?.emoji || '⭐'} ${J.esc(p.name)} · ⭐ ${p.stars}`;
}
const cfg = () => NIVELES[state.nivel];
function pool() {
  const c = cfg();
  if (c.tipo === 'vocal') return VOC;
  if (c.tipo === 'palabra') return WORDS.map(w => w[0]);
  return c.pool;
}
const show = v => (cfg().tipo === 'vocal' || cfg().tipo === 'sonido') && state.bigCase ? v.toUpperCase() : v;
function newTarget() {
  // en cada ronda, todas las letras grandes o todas chiquitas (nunca juntas)
  state.bigCase = Math.random() < .5;
  let t; do { t = J.pick(pool()); } while (t === state.target && pool().length > 1);
  state.target = t;
  balloons.slice().forEach(o => { o.leaving = true; });
  const c = cfg();
  $('#m-etq').textContent = 'Revienta';
  // en vocales se muestra la letra; en lo demás solo se escucha (así se practica leer)
  $('#m-word').textContent = c.tipo === 'vocal' ? show(t) : '🔊';
  const box = $('#mision'); box.hidden = false; box.classList.remove('nuevo'); void box.offsetWidth; box.classList.add('nuevo');
  sayTarget();
}
function sayTarget() {
  const c = cfg(), t = state.target;
  if (c.tipo === 'vocal') J.say(['Revienta la', t, state.bigCase ? 'grande' : 'chiquita']);
  else if (c.tipo === 'sonido') { J.say('Revienta la letra que suena'); J.sound(t, { queue: true }); }
  else J.say(['Revienta', t]);
}
$('#m-say').onclick = sayTarget;
function message(text, secs = 1.4) {
  const el = $('#mensaje'); el.textContent = text; el.classList.remove('ver'); void el.offsetWidth; el.classList.add('ver');
  clearTimeout(message.t); message.t = setTimeout(() => el.classList.remove('ver'), secs * 1000);
}
function renderMetas() { $('#metas').innerHTML = Array.from({ length: WIN }, (_, i) => `<span class="meta ${i < state.wins ? 'on' : ''}">⭐</span>`).join(''); }

function hitBalloon(o) {
  if (o.pop || !state.running) return;
  if (o.value === state.target) {
    o.pop = .001;
    fx.burst(o.g.position.clone(), 60, 1.2);
    J.sfx('pop', 1, .8); J.cheer();
    message(J.pick(['¡Pum! ¡Bien!', '¡Bravo!', '¡Genial!']));
    J.addStar(); swapActor();
    state.wins++; state.celebrate = 1.2; renderMetas();
    const c = cfg();
    if (c.tipo === 'sonido') J.sound(state.target, { queue: true }); else J.say(o.label, { queue: true });
    if (state.wins >= WIN) { state.running = false; setTimeout(levelUp, 1500); return; }
    state.running = false;
    setTimeout(() => J.nextTurn(() => { state.running = true; newTarget(); }, { onShow: swapActor }), 1500);
  } else {
    o.wob = 1; J.boing();
    message('¡Ese no!', 1);
    const c = cfg();
    if (c.tipo === 'sonido') { J.say('Ese suena'); J.sound(o.value, { queue: true }); }
    else J.say(['Ese dice', o.label]);
  }
}
function levelUp() {
  P.level.globos = Math.max(P.level.globos || 0, state.nivel + 1); J.save();
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
  for (const o of balloons) { const h = ray.intersectObject(o.g, true)[0]; if (h && h.distance < bd) { bd = h.distance; best = o; } }
  if (best) hitBalloon(best);
});

W.onFrame((dt, t) => {
  const c = cfg();
  if (state.running && state.target) {
    state.nextSpawn -= dt;
    const alive = balloons.filter(o => !o.pop && !o.leaving);
    if (state.nextSpawn <= 0 && alive.length < c.max) {
      // siempre hay al menos un globo correcto subiendo
      const hasTarget = alive.some(o => o.value === state.target);
      const v = !hasTarget || Math.random() < .3 ? state.target : J.pick(pool().filter(x => x !== state.target));
      spawn(v, show(v));
      state.nextSpawn = 1.6 / c.speed + Math.random() * .8;
    }
  }
  for (const o of balloons.slice()) {
    const g = o.g;
    if (o.pop) {
      o.pop += dt; g.scale.setScalar(1 + o.pop * 3);
      g.traverse(m => { if (m.material) { m.material.transparent = true; m.material.opacity = Math.max(0, 1 - o.pop * 5); } });
      if (o.pop > .25) removeBalloon(o);
      continue;
    }
    g.position.y += dt * c.speed * (o.leaving ? 3 : 1);
    g.position.x += Math.sin(t * 1.2 + o.phase) * dt * .3;
    g.rotation.z = Math.sin(t * 1.5 + o.phase) * .08 + (o.wob > 0 ? Math.sin(o.wob * 30) * o.wob * .4 : 0);
    o.wob = Math.max(0, o.wob - dt * 1.5);
    if (g.position.y > 11) removeBalloon(o);
  }
  const a = actor();
  if (a) { state.celebrate -= dt; a.update(dt, state.celebrate > 0 ? 'festejar' : 'bailar'); }
  fx.update(dt);
});

function start(n) {
  $('#portada').hidden = true;
  J.startMusic();
  state.nivel = n; state.wins = 0; renderMetas(); $('#nivel-num').textContent = n + 1;
  const go = () => { state.running = true; newTarget(); };
  if (P.two) J.showTurn(go, { onShow: swapActor }); else go();
}

(async () => {
  await esperaFuente();
  await J.ready;
  const conf = J.palabras('globos');
  if (conf.length >= 4) WORDS = conf;
  const ids = P.two ? [P.players[0].char, P.players[1].char] : [P.players[0].char];
  for (const id of ids) { const a = await crearPersonaje(id); const nar = innerWidth / innerHeight < .8; a.group.position.set(nar ? -2.3 : -5.2, 0, nar ? 4.5 : 3); a.group.scale.setScalar(nar ? .9 : 1.3); scene.add(a.group); actors.push(a); }
  swapActor();
  W.start(); J.refreshMusic();
  const unlocked = Math.min(NIVELES.length, (P.level.globos || 0) + 1);
  let sel = unlocked - 1;
  const box = $('#niveles');
  box.innerHTML = NIVELES.map((n, i) => `<button data-i="${i}" ${i >= unlocked ? 'disabled aria-label="Nivel bloqueado"' : ''} class="${i === sel ? 'on' : ''}">${i < unlocked ? i + 1 : '🔒'}</button>`).join('');
  box.onclick = e => { const b = e.target.closest('[data-i]'); if (!b || b.disabled) return; sel = +b.dataset.i; [...box.children].forEach((c, k) => c.classList.toggle('on', k === sel)); $('#nivel-desc').textContent = NIVELES[sel].nombre; J.sfx('pop'); };
  $('#nivel-desc').textContent = NIVELES[sel].nombre;
  const go = $('#empezar'); go.disabled = false; go.textContent = '▶ ¡A jugar!';
  go.onclick = () => start(sel);
  if (location.hash === '#prueba') start(0);
})();
