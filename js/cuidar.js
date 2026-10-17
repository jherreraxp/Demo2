// Cuida a tu personaje: decorarlo con adornos, limpiarle el barro, bañarlo con espuma y jugar con él.
// El fondo es un parque difuminado (js/parque.js).
import * as THREE from 'three';
import { crearMundo, chispitas } from './mundo3d.js';
import { crearPersonaje, PERSONAJES, CARAS } from './personajes.js';
import { pintarParque } from './parque.js';

const J = window.Juego, P = J.progress;
const $ = s => document.querySelector(s);
const TEST = location.hash === '#prueba';
pintarParque($('#parque'));

const pedido = new URLSearchParams(location.search).get('p');
const id = PERSONAJES.includes(pedido) ? pedido : PERSONAJES.includes(J.player().char) ? J.player().char : 'nieve';
P.adornos = P.adornos || {};

const W = crearMundo($('#mundo'), { fog: null });
const { scene, camera } = W;
W.fovFor = a => a < .8 ? 62 : 40;
const fx = chispitas(scene);
const narrow = () => innerWidth / innerHeight < .8;
function encuadre() { const n = narrow(); camera.position.set(0, n ? 1.5 : 1.25, n ? 4.4 : 3.5); camera.lookAt(0, n ? .55 : .62, 0); }
encuadre(); addEventListener('resize', encuadre);

// piso de pasto redondo
const piso = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.8, .2, 40), new THREE.MeshStandardMaterial({ color: 0x8fd46a, roughness: .9 }));
piso.position.y = -.1; piso.receiveShadow = true; scene.add(piso);

const ch = await crearPersonaje(id);
ch.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
scene.add(ch.group);
const A = ch.anclas || { cabeza: ch.group, cuerpo: ch.group, alto: .3, cuello: 1, frente: .2 };
const cuerpoMeshes = [];
ch.group.traverse(o => { if (o.isMesh) cuerpoMeshes.push(o); });
const nombre = J.CHARS[id]?.name || id;

const state = { modo: null, yaw: 0, yawT: 0, accion: null, accionT: 0, adornos: new Set(P.adornos[id] || []), manchas: [], espuma: [], espumaHecha: 0, ducha: false, pelota: null, tool: 'jabon' };
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .4, ...o });
const m3 = (geo, m, x = 0, y = 0, z = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; return me; };

function message(text, secs = 1.6) {
  const el = $('#mensaje'); el.textContent = text;
  el.classList.remove('ver'); void el.offsetWidth; el.classList.add('ver');
  clearTimeout(message.t); message.t = setTimeout(() => el.classList.remove('ver'), secs * 1000);
}
function hacer(mode, secs = 2) { state.accion = mode; state.accionT = secs; }
function updatePlayer() { const p = J.player(); $('#jugador').innerHTML = `${J.CHARS[id]?.emoji || '⭐'} ${J.esc(p.name)} · ⭐ ${p.stars}`; }
function premio() { J.addStar(); updatePlayer(); }

// ---------- adornos ----------
const ADORNOS = {
  corona:   { emoji: '👑', nombre: 'Corona', quita: ['sombrero'], crear() {
    const g = new THREE.Group(), oro = mat(0xffd23f, { metalness: .5, roughness: .3, emissive: 0x6b5200, emissiveIntensity: .25 });
    g.add(m3(new THREE.CylinderGeometry(.15, .16, .08, 18, 1, true), oro));
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.add(m3(new THREE.ConeGeometry(.03, .1, 6), oro, Math.sin(a) * .15, .08, Math.cos(a) * .15)); }
    g.add(m3(new THREE.SphereGeometry(.03, 10, 8), mat(0xff4fa3, { emissive: 0x7a0036, emissiveIntensity: .4 }), 0, .02, .16));
    g.position.y = A.alto + .05; A.cabeza.add(g); return g; } },
  sombrero: { emoji: '🎩', nombre: 'Sombrero', quita: ['corona'], crear() {
    const g = new THREE.Group(), m = mat(0x9a6ee0);
    g.add(m3(new THREE.CylinderGeometry(.3, .3, .03, 28), m));
    g.add(m3(new THREE.CylinderGeometry(.17, .18, .24, 24), m, 0, .13, 0));
    g.add(m3(new THREE.CylinderGeometry(.185, .185, .05, 24), mat(0xffd23f), 0, .05, 0));
    g.position.y = A.alto + .02; A.cabeza.add(g); return g; } },
  mono:     { emoji: '🎀', nombre: 'Moño', crear() {
    const g = new THREE.Group(), m = mat(0xff4fa3);
    [-1, 1].forEach(sx => { const l = m3(new THREE.ConeGeometry(.07, .14, 12), m, sx * .07, 0, 0); l.rotation.z = sx * Math.PI / 2; g.add(l); });
    g.add(m3(new THREE.SphereGeometry(.04, 10, 8), m));
    g.position.set(.16, A.alto - .02, .02); g.rotation.z = -.4; A.cabeza.add(g); return g; } },
  lentes:   { emoji: '🕶️', nombre: 'Lentes', crear() {
    const g = new THREE.Group(), marco = mat(0xff4fa3), vidrio = mat(0x23324a, { transparent: true, opacity: .75, metalness: .3 });
    [-1, 1].forEach(sx => { g.add(m3(new THREE.TorusGeometry(.06, .015, 8, 20), marco, sx * .08, 0, 0)); g.add(m3(new THREE.CircleGeometry(.058, 20), vidrio, sx * .08, 0, -.002)); });
    g.add(m3(new THREE.BoxGeometry(.05, .015, .015), marco));
    g.position.set(0, A.animal ? .07 : .02, A.frente + .04); A.cabeza.add(g); return g; } },
  collar:   { emoji: '📿', nombre: 'Collar', crear() {
    const g = new THREE.Group(), perla = mat(0xffffff, { roughness: .15, metalness: .2 });
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; g.add(m3(new THREE.SphereGeometry(.025, 10, 8), perla, Math.sin(a) * .15, 0, Math.cos(a) * .13)); }
    g.add(m3(new THREE.OctahedronGeometry(.04), mat(0x8fd3f4, { emissive: 0x3f8ee8, emissiveIntensity: .3 }), 0, -.04, .15));
    if (A.animal) { g.position.set(0, -.18, 0); A.cabeza.add(g); } else { g.position.set(0, A.cuello, 0); A.cuerpo.add(g); }
    return g; } },
  alitas:   { emoji: '🧚', nombre: 'Alitas', crear() {
    const g = new THREE.Group(), m = mat(0xd6f2ff, { transparent: true, opacity: .7, side: THREE.DoubleSide, emissive: 0x9fdcff, emissiveIntensity: .35 });
    const forma = new THREE.Shape(); forma.moveTo(0, 0); forma.bezierCurveTo(.15, .35, .45, .4, .4, .1); forma.bezierCurveTo(.38, -.05, .2, -.2, 0, 0);
    g.userData.alas = [-1, 1].map(sx => { const piv = new THREE.Group(); const w = new THREE.Mesh(new THREE.ShapeGeometry(forma), m); w.scale.x = sx; piv.add(w); g.add(piv); return piv; });
    if (A.animal) { g.position.set(0, A.cuello + .15, -.1); g.rotation.x = -Math.PI / 2 + .3; } else g.position.set(0, .98, -.15);
    A.cuerpo.add(g); return g; } },
  varita:   { emoji: '🪄', nombre: 'Varita', soloFigura: true, crear() {
    const g = new THREE.Group();
    g.add(m3(new THREE.CylinderGeometry(.012, .012, .32, 8), mat(0xffffff), 0, .14, 0));
    const est = m3(new THREE.OctahedronGeometry(.06), mat(0xffd23f, { emissive: 0xffb000, emissiveIntensity: .6 }), 0, .32, 0); g.add(est); g.userData.est = est;
    g.position.set(.03, -.4, .06); g.rotation.x = .6; A.mano.add(g); return g; } },
};
const puestos = {};
function ponerAdorno(k, on, silencio = false) {
  const a = ADORNOS[k]; if (!a) return;
  if (on && !puestos[k]) {
    (a.quita || []).forEach(q => ponerAdorno(q, false, true));
    puestos[k] = a.crear(); state.adornos.add(k);
    if (!silencio) { fx.burst(new THREE.Vector3(0, 1.6, .3), 25, .5); J.sfx('pop'); hacer('festejar', 1.2); }
  } else if (!on && puestos[k]) {
    puestos[k].parent.remove(puestos[k]); delete puestos[k]; state.adornos.delete(k);
    if (!silencio) J.sfx('pop2');
  }
  P.adornos[id] = [...state.adornos]; J.save();
}
[...state.adornos].forEach(k => ponerAdorno(k, true, true));

// ---------- barro (limpiar) ----------
const ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
const barroMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 1, transparent: true });
function ensuciar() {
  limpiarManchas();
  const box = new THREE.Box3().setFromObject(ch.group), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  let tries = 0;
  while (state.manchas.length < 9 && tries++ < 200) {
    const a = (Math.random() - .5) * 1.5 - state.yaw, y = box.min.y + size.y * (.08 + Math.random() * .85);
    const from = new THREE.Vector3(c.x + Math.sin(a) * 3, y, c.z + Math.cos(a) * 3);
    ray.set(from, new THREE.Vector3(c.x, y, c.z).sub(from).normalize());
    const hit = ray.intersectObjects(cuerpoMeshes, false)[0];
    if (!hit || !hit.face) continue;
    if (state.manchas.some(m => m.getWorldPosition(new THREE.Vector3()).distanceTo(hit.point) < .17)) continue;
    const m = new THREE.Mesh(new THREE.SphereGeometry(.06 + Math.random() * .04, 10, 8), barroMat.clone());
    m.scale.set(1, 1, .35); m.userData.sucio = 1;
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    m.position.copy(hit.point).addScaledVector(n, .01);
    m.lookAt(hit.point.clone().add(n));
    scene.add(m); hit.object.attach(m);
    state.manchas.push(m);
  }
  renderBarra();
}
function limpiarManchas() { state.manchas.forEach(m => m.parent && m.parent.remove(m)); state.manchas = []; }
function frotarBarro(p) {
  let algo = false;
  for (const m of state.manchas.slice()) {
    if (m.getWorldPosition(new THREE.Vector3()).distanceTo(p) > .2) continue;
    m.userData.sucio -= .12; algo = true;
    m.material.opacity = Math.max(0, m.userData.sucio);
    if (m.userData.sucio <= 0) {
      fx.burst(m.getWorldPosition(new THREE.Vector3()), 12, .3); J.sfx('pop', .6, 1.3);
      m.parent.remove(m); state.manchas.splice(state.manchas.indexOf(m), 1);
      if (!state.manchas.length) { message('¡Limpiecito! ✨'); J.say('¡Quedó limpiecito!'); J.efecto('festejo'); hacer('festejar', 2.5); premio(); }
    }
  }
  if (algo) renderBarra();
}

// ---------- baño ----------
const tina = new THREE.Group(); tina.visible = false; scene.add(tina);
{
  const blanco = mat(0xffffff, { roughness: .25, side: THREE.DoubleSide });
  tina.add(m3(new THREE.CylinderGeometry(.95, .8, .55, 36, 1, true), blanco, 0, .27, 0));
  const borde = m3(new THREE.TorusGeometry(.95, .06, 10, 40), blanco, 0, .55, 0); borde.rotation.x = Math.PI / 2; tina.add(borde);
  const agua = new THREE.Mesh(new THREE.CircleGeometry(.92, 36), mat(0x8fd3f4, { transparent: true, opacity: .75, roughness: .1 }));
  agua.rotation.x = -Math.PI / 2; agua.position.y = .42; tina.add(agua);
  [[-.7, .7], [.7, .7], [-.7, -.7], [.7, -.7]].forEach(([x, z]) => tina.add(m3(new THREE.SphereGeometry(.08, 10, 8), mat(0xffd23f), x * .85, .02, z * .7)));
}
const ducha = new THREE.Group(); ducha.visible = false; ducha.position.y = -.3; scene.add(ducha);
{
  const metal = mat(0xc9ccd6, { metalness: .7, roughness: .25 });
  ducha.add(m3(new THREE.CylinderGeometry(.03, .03, 2.5, 10), metal, -1.05, 1.25, -.3));
  const brazo = m3(new THREE.CylinderGeometry(.03, .03, .9, 10), metal, -.6, 2.5, -.3); brazo.rotation.z = Math.PI / 2; ducha.add(brazo);
  const cab = m3(new THREE.CylinderGeometry(.2, .1, .1, 20), metal, -.15, 2.42, -.2); ducha.add(cab);
}
const patito = new THREE.Group(); patito.visible = false; tina.add(patito);
{
  const am = mat(0xffd23f);
  patito.add(m3(new THREE.SphereGeometry(.12, 14, 10), am));
  patito.add(m3(new THREE.SphereGeometry(.08, 12, 8), am, .08, .1, 0));
  const pico = m3(new THREE.ConeGeometry(.03, .07, 8), mat(0xf39a3b), .17, .1, 0); pico.rotation.z = -Math.PI / 2; patito.add(pico);
  patito.position.set(.55, .45, .3); patito.scale.setScalar(1.2);
}
const burbujaGeo = new THREE.SphereGeometry(1, 12, 8);
const burbujaMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .45, roughness: .05, metalness: .1, emissive: 0xbfe6ff, emissiveIntensity: .25 });
const espumaMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .6 });
const burbujas = [], gotas = [];
const gotaGeo = new THREE.CylinderGeometry(.012, .012, .12, 5), gotaMat = new THREE.MeshBasicMaterial({ color: 0x8fd3f4, transparent: true, opacity: .8 });
function burbuja(p, r = .04 + Math.random() * .06) {
  const b = new THREE.Mesh(burbujaGeo, burbujaMat); b.scale.setScalar(r); b.position.copy(p);
  b.userData.v = new THREE.Vector3((Math.random() - .5) * .3, .4 + Math.random() * .4, (Math.random() - .5) * .3); b.userData.life = 2 + Math.random() * 2;
  scene.add(b); burbujas.push(b);
}
function enjabonar(hit) {
  if (state.espuma.length > 70) return;
  const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 0, 1);
  const f = new THREE.Mesh(burbujaGeo, espumaMat); f.scale.setScalar(.05 + Math.random() * .05);
  f.position.copy(hit.point).addScaledVector(n, .02);
  scene.add(f); hit.object.attach(f); f.userData.s = f.scale.x;
  state.espuma.push(f); state.espumaHecha++;
  if (Math.random() < .5) burbuja(hit.point);
  if (state.espumaHecha % 6 === 0) J.sfx('pop', .4, 1.4 + Math.random() * .4);
  if (state.espumaHecha === 25) { J.say('¡Abre la ducha!'); message('¡Ahora la ducha! 🚿'); }
  renderBarra();
}
function enjuagar(dt) {
  for (const f of state.espuma.slice()) {
    f.scale.multiplyScalar(1 - dt * (1.2 + Math.random()));
    if (f.scale.x < .01) { f.parent.remove(f); state.espuma.splice(state.espuma.indexOf(f), 1); }
  }
  if (!state.espuma.length && state.espumaHecha >= 15 && !state.banado) {
    state.banado = true; state.ducha = false; renderHerr();
    message('¡Qué rico baño! 🫧'); J.say('¡Qué rico baño!'); J.efecto('aplauso'); hacer('festejar', 3); premio();
    for (let k = 0; k < 25; k++) burbuja(new THREE.Vector3((Math.random() - .5) * 1.2, .5 + Math.random(), (Math.random() - .5) * .6), .05 + Math.random() * .08);
  }
  renderBarra();
}

// ---------- jugar ----------
function texPelota() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  ['#ef5b5b', '#ffffff', '#3f8ee8', '#ffffff', '#f6c33b', '#ffffff'].forEach((col, i) => { g.fillStyle = col; g.fillRect(i * 256 / 6, 0, 256 / 6 + 1, 128); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const pelota = new THREE.Mesh(new THREE.SphereGeometry(.17, 24, 16), new THREE.MeshStandardMaterial({ map: texPelota(), roughness: .35 }));
pelota.castShadow = true; pelota.visible = false; scene.add(pelota);
const pel = { p: new THREE.Vector3(1.1, .17, .9), v: new THREE.Vector3(), vuela: false, golpe: false };
function lanzar() {
  pelota.visible = true;
  pel.p.set(narrow() ? .4 : 1.6, 1.6, 2.6);
  const target = new THREE.Vector3(0, 1.45, 0);
  const T = .7; pel.v.copy(target).sub(pel.p).divideScalar(T); pel.v.y += 4.9 * T;
  pel.vuela = true; pel.golpe = false;
  J.efecto('salto');
}
function saltar() { state.salto = .001; J.efecto('salto'); }
function cosquillas() { hacer('festejar', 1.6); J.say('¡Jajaja!'); J.sfx('pop', .7, 1.6); fx.burst(new THREE.Vector3(0, 1.2, .3), 18, .4); }

// ---------- modos y herramientas ----------
const MODOS = {
  caritas: { decir: '¿Cómo se siente?', herr() {
    return Object.entries(CARAS).map(([k, c]) => `<button data-c="${k}" class="${ch.cara === k ? 'on' : ''}">${c.emoji} ${c.nombre}</button>`).join('');
  } },
  decorar: { decir: '¡A decorar!', herr() {
    return Object.entries(ADORNOS).filter(([, a]) => !(a.soloFigura && A.animal)).map(([k, a]) => `<button data-a="${k}" class="${state.adornos.has(k) ? 'on' : ''}">${a.emoji} ${a.nombre}</button>`).join('');
  } },
  limpiar: { decir: '¡Uy, está sucio! Límpialo.', herr() {
    return `<span class="ayuda">🧽 Frota las manchitas</span><div class="barra"><i id="barra"></i></div><button data-h="ensuciar">🟤 Otra vez</button>`;
  } },
  banar: { decir: '¡A bañarse!', herr() {
    return `<button data-h="jabon" class="${!state.ducha ? 'on' : ''}">🧼 Jabón</button><button data-h="ducha" class="${state.ducha ? 'on' : ''}">🚿 Ducha</button><button data-h="patito">🦆 Patito</button><div class="barra"><i id="barra"></i></div>`;
  } },
  jugar: { decir: '¡A jugar!', herr() {
    return `<button data-h="pelota">⚽ Pelota</button><button data-h="saltar">🤸 Saltar</button><button data-h="bailar">💃 Bailar</button><button data-h="saludar">👋 Saludar</button><span class="ayuda">¡Tócalo y se ríe!</span>`;
  } },
};
function renderHerr() { $('#herr').innerHTML = state.modo ? MODOS[state.modo].herr() : ''; renderBarra(); }
function renderBarra() {
  const b = $('#barra'); if (!b) return;
  if (state.modo === 'limpiar') { const tot = 9, quedan = state.manchas.length; b.style.width = ((tot - quedan) / tot * 100) + '%'; }
  if (state.modo === 'banar') b.style.width = (state.ducha || state.banado ? (state.espumaHecha ? 100 - state.espuma.length / Math.max(1, state.espumaHecha) * 100 : 0) : Math.min(100, state.espumaHecha / 25 * 100)) + '%';
}
function setModo(m, silencio = false) {
  state.modo = m;
  [...$('#modos').children].forEach(b => b.classList.toggle('on', b.dataset.m === m));
  tina.visible = m === 'banar'; ducha.visible = m === 'banar';
  pelota.visible = m === 'jugar';
  if (m !== 'banar') { state.ducha = false; state.espuma.forEach(f => f.parent && f.parent.remove(f)); state.espuma = []; }
  if (m === 'banar') { state.espumaHecha = 0; state.banado = false; state.ducha = false; }
  if (m === 'limpiar') ensuciar(); else limpiarManchas();
  if (m === 'jugar') { pel.p.set(1.1, .17, .9); pel.v.set(0, 0, 0); pel.vuela = false; }
  renderHerr();
  if (!silencio) { J.sfx('pop'); J.say(MODOS[m].decir); }
}
$('#modos').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) setModo(b.dataset.m); });
$('#herr').addEventListener('click', e => {
  const a = e.target.closest('[data-a]');
  if (a) { const k = a.dataset.a, on = !puestos[k]; ponerAdorno(k, on); if (on) J.say(J.pick(['¡Qué bonito!', '¡Qué linda!'])); renderHerr(); return; }
  const c = e.target.closest('[data-c]');
  if (c) {
    // la carita se guarda y se usa en todos los juegos
    const k = c.dataset.c; ch.setCara && ch.setCara(k);
    P.caras = P.caras || {}; P.caras[id] = k; J.save();
    J.sfx('pop'); J.say(CARAS[k].nombre);
    hacer({ feliz: 'festejar', sorpresa: 'saludar' }[k] || 'quieto', 1.5);
    renderHerr(); return;
  }
  const h = e.target.closest('[data-h]'); if (!h) return;
  const k = h.dataset.h;
  if (k === 'ensuciar') { ensuciar(); J.sfx('pop2'); }
  if (k === 'jabon') { state.ducha = false; renderHerr(); J.sfx('pop'); }
  if (k === 'ducha') { state.ducha = !state.ducha; renderHerr(); J.efecto('abrir'); }
  if (k === 'patito') { patito.visible = !patito.visible; J.sfx('pop'); }
  if (k === 'pelota') lanzar();
  if (k === 'saltar') saltar();
  if (k === 'bailar') { hacer('bailar', 5); J.efecto('festejo'); }
  if (k === 'saludar') { hacer('saludar', 3); J.say(['¡Hola!', J.player().name]); }
});
$('#girar-izq').onclick = () => { state.yawT -= .9; J.sfx('pop'); };
$('#girar-der').onclick = () => { state.yawT += .9; J.sfx('pop'); };

// ---------- toques ----------
const cursor = document.createElement('div');
cursor.style.cssText = 'position:fixed;z-index:7;font-size:44px;pointer-events:none;transform:translate(-50%,-50%);display:none';
document.body.appendChild(cursor);
let down = false, lastX = 0, arrastre = 0;
function pick(e) { v2.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(v2, camera); }
function frotar(e) {
  pick(e);
  const hit = ray.intersectObjects(cuerpoMeshes, false)[0];
  if (!hit) return;
  if (state.modo === 'limpiar') frotarBarro(hit.point);
  if (state.modo === 'banar' && !state.ducha) enjabonar(hit);
}
const mundo = $('#mundo');
mundo.addEventListener('pointerdown', e => {
  down = true; lastX = e.clientX; arrastre = 0; mundo.setPointerCapture(e.pointerId);
  const frota = state.modo === 'limpiar' || (state.modo === 'banar' && !state.ducha);
  if (frota) { cursor.textContent = state.modo === 'limpiar' ? '🧽' : '🧼'; cursor.style.display = 'block'; cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; frotar(e); }
});
mundo.addEventListener('pointermove', e => {
  if (!down) return;
  const frota = state.modo === 'limpiar' || (state.modo === 'banar' && !state.ducha);
  if (frota) { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; frotar(e); }
  else { const dx = e.clientX - lastX; arrastre += Math.abs(dx); state.yawT += dx * .012; lastX = e.clientX; }
});
const soltar = e => {
  if (!down) return; down = false; cursor.style.display = 'none';
  if (arrastre < 8 && !(state.modo === 'limpiar' || state.modo === 'banar')) {
    pick(e);
    if (state.modo === 'jugar' && ray.intersectObject(pelota).length) lanzar();
    else if (ray.intersectObjects(cuerpoMeshes, false).length) {
      if (state.modo === 'jugar' || !state.modo) cosquillas();
      else if (state.modo === 'decorar') { hacer('saludar', 1.5); J.sfx('pop'); }
    }
  }
};
mundo.addEventListener('pointerup', soltar);
mundo.addEventListener('pointercancel', soltar);

// ---------- bucle ----------
const tmp = new THREE.Vector3();
let gotaT = 0, burbT = 0;
W.onFrame((dt, t) => {
  state.yaw += (state.yawT - state.yaw) * Math.min(1, dt * 6);
  ch.group.rotation.y = state.yaw;
  if (state.accionT > 0) { state.accionT -= dt; if (state.accionT <= 0) state.accion = null; }
  let mode = state.accion || (state.modo === 'banar' && state.ducha ? 'festejar' : 'quieto');
  if (state.modo === 'banar' && !state.accion) mode = 'quieto';
  ch.update(dt, mode, 1);
  // saltito
  if (state.salto) { state.salto += dt * 1.6; ch.group.position.y = Math.sin(Math.min(1, state.salto) * Math.PI) * .7; if (state.salto >= 1) { state.salto = 0; ch.group.position.y = 0; J.sfx('pop2', .5); } }
  else ch.group.position.y = state.modo === 'banar' ? .05 : 0;
  // adornos con vida
  if (puestos.alitas) puestos.alitas.userData.alas.forEach((w, i) => { w.rotation.y = (i ? -1 : 1) * (.5 + Math.sin(t * 9) * .35); });
  if (puestos.varita) { puestos.varita.userData.est.rotation.y += dt * 4; if (Math.random() < dt * 3) fx.burst(puestos.varita.userData.est.getWorldPosition(tmp).clone(), 2, .15); }
  // baño: burbujas y ducha
  if (state.modo === 'banar') {
    burbT -= dt; if (burbT <= 0) { burbT = .35; burbuja(new THREE.Vector3((Math.random() - .5) * 1.4, .45, (Math.random() - .5) * 1.2)); }
    if (state.ducha) {
      gotaT -= dt;
      while (gotaT <= 0) { gotaT += .012; const g = new THREE.Mesh(gotaGeo, gotaMat); g.position.set(-.15 + (Math.random() - .5) * .35, 2.05, -.2 + (Math.random() - .5) * .35); g.userData.v = new THREE.Vector3((Math.random() - .5) * .4, -3, .3 + Math.random() * .3); scene.add(g); gotas.push(g); }
      enjuagar(dt);
    }
    patito.position.y = .45 + Math.sin(t * 2) * .02; patito.rotation.y = Math.sin(t * .7) * .6;
  }
  for (const b of burbujas.slice()) {
    b.userData.life -= dt; b.position.addScaledVector(b.userData.v, dt); b.position.x += Math.sin(t * 3 + b.id) * dt * .1;
    if (b.userData.life <= 0) { scene.remove(b); burbujas.splice(burbujas.indexOf(b), 1); if (Math.random() < .3) J.sfx('pop', .25, 1.8); }
  }
  for (const g of gotas.slice()) {
    g.position.addScaledVector(g.userData.v, dt); g.userData.v.y -= 9 * dt;
    if (g.position.y < .45) { scene.remove(g); gotas.splice(gotas.indexOf(g), 1); }
  }
  // pelota
  if (state.modo === 'jugar') {
    if (pel.vuela) {
      pel.v.y -= 9.8 * dt; pel.p.addScaledVector(pel.v, dt);
      if (!pel.golpe && pel.p.distanceTo(tmp.set(0, 1.45, 0)) < .45) {
        pel.golpe = true; pel.v.set((Math.random() < .5 ? -1 : 1) * 1.6, 3.5, 1.4); hacer('festejar', 1.8);
        fx.burst(pel.p.clone(), 20, .4); J.efecto('pum'); J.say(J.pick(J.PRAISES));
        if (Math.random() < .3) premio();
      }
      if (pel.p.y <= .17) { pel.p.y = .17; pel.v.y = Math.abs(pel.v.y) * .5; pel.v.x *= .7; pel.v.z *= .7; if (pel.v.length() < .5) { pel.vuela = false; } }
      const r = Math.hypot(pel.p.x, pel.p.z); if (r > 1.7 && pel.p.y < .5) { pel.p.x *= 1.6 / r; pel.p.z *= 1.6 / r; pel.v.x *= -.5; pel.v.z *= -.5; }
      pelota.rotation.x += dt * 8; pelota.rotation.z += dt * 5;
    }
    pelota.position.copy(pel.p);
  }
  fx.update(dt);
});

updatePlayer(); J.refreshMusic(); W.start();
setTimeout(() => J.say(['¡Hola!', nombre]), 400);
setModo(TEST ? 'decorar' : 'jugar', true);
if (TEST) window.__cu = { state, setModo, ponerAdorno, lanzar, frotarBarro, enjabonar, ch, camera, cuerpoMeshes, THREE };
