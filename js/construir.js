// Construye tu Mundo: bloques, casitas, objetos y personajes en un mundo 3D;
// luego se juega caminando con su personaje, juntando estrellitas y llegando a la meta.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { crearMundo, chispitas, esperaFuente } from './mundo3d.js';
import { crearPersonaje, crearObjeto, PERSONAJES, BUSCABLES, nombrePersonaje } from './personajes.js';

const J = window.Juego, P = J.progress;
const $ = s => document.querySelector(s);
const TEST = location.hash === '#prueba';
const N = 24, MIN = -12, MAX = 11, ALTO = 16;   // mundo de 24×24 cuadritos
const narrow = () => innerWidth < 760;

const W = crearMundo($('#mundo'), { fog: 0xdff4ff, near: 45, far: 110, fov: 50 });
const { scene, camera, sun, renderer } = W;
W.fovFor = a => a < .8 ? 62 : 50;
const fx = chispitas(scene);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, far: 70 });
sun.shadow.mapSize.set(2048, 2048);

// ---------- texturas ----------
function canvasTex(draw, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// bloque liso con bordecito suave (se tiñe con el color)
const texBloque = canvasTex((g, s) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
  const gr = g.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, 'rgba(255,255,255,.0)'); gr.addColorStop(1, 'rgba(0,0,0,.08)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = 6; g.strokeRect(3, 3, s - 6, s - 6);
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(8, s - 9); g.lineTo(8, 8); g.lineTo(s - 9, 8); g.stroke();
});
const texMadera = canvasTex((g, s) => {
  g.fillStyle = '#c98a55'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#b97a47' : '#d69a63'; g.fillRect(0, i * s / 4, s, s / 4 - 3); }
  g.strokeStyle = 'rgba(90,50,20,.35)'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { g.beginPath(); const y = Math.random() * s; g.moveTo(0, y); g.bezierCurveTo(s * .3, y + 4, s * .6, y - 4, s, y + 2); g.stroke(); }
  g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 6; g.strokeRect(3, 3, s - 6, s - 6);
});
const texLadrillo = canvasTex((g, s) => {
  g.fillStyle = '#efe3d6'; g.fillRect(0, 0, s, s);
  const h = s / 4;
  for (let r = 0; r < 4; r++) for (let c = -1; c < 3; c++) {
    const x = c * s / 2 + (r % 2) * s / 4;
    g.fillStyle = ['#e2725b', '#d9624d', '#ea8468'][(r + c + 3) % 3]; g.fillRect(x + 2, r * h + 2, s / 2 - 4, h - 4);
  }
});
const texPasto = canvasTex((g, s) => {
  g.fillStyle = '#7fd36b'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 160; i++) { g.fillStyle = Math.random() < .5 ? '#6cc45c' : '#93e07a'; g.fillRect(Math.random() * s, Math.random() * s, 3, 6); }
  g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 6; g.strokeRect(3, 3, s - 6, s - 6);
});
const texSeto = canvasTex((g, s) => {
  g.fillStyle = '#3fae5f'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 90; i++) { g.fillStyle = ['#4cc06e', '#2f9a50', '#5fd07c'][i % 3]; g.beginPath(); g.arc(Math.random() * s, Math.random() * s, 6 + Math.random() * 8, 0, 7); g.fill(); }
  for (let i = 0; i < 6; i++) { g.fillStyle = ['#ff7eb6', '#ffffff', '#ffd23f'][i % 3]; g.beginPath(); g.arc(Math.random() * s, Math.random() * s, 4, 0, 7); g.fill(); }
});

// colores y materiales de los bloques
const COLORES = {
  rosa:     { nombre: 'Rosado', css: '#ff8fc8', hex: 0xff8fc8 },
  fucsia:   { nombre: 'Fucsia', css: '#ff4fa3', hex: 0xff4fa3 },
  lila:     { nombre: 'Lila', css: '#c9a2ff', hex: 0xc9a2ff },
  morado:   { nombre: 'Morado', css: '#8a5cf0', hex: 0x8a5cf0 },
  aqua:     { nombre: 'Aqua', css: '#5fd8e8', hex: 0x5fd8e8 },
  azul:     { nombre: 'Azul', css: '#4f8ef5', hex: 0x4f8ef5 },
  amarillo: { nombre: 'Amarillo', css: '#ffd84a', hex: 0xffd84a },
  naranja:  { nombre: 'Naranja', css: '#ff9d4a', hex: 0xff9d4a },
  rojo:     { nombre: 'Rojo', css: '#f05a5a', hex: 0xf05a5a },
  menta:    { nombre: 'Menta', css: '#7fe3b0', hex: 0x7fe3b0 },
  blanco:   { nombre: 'Blanco', css: '#ffffff', hex: 0xffffff },
  negro:    { nombre: 'Negro', css: '#3a3550', hex: 0x3a3550 },
  madera:   { nombre: 'Madera', css: 'linear-gradient(#d69a63, #b97a47)', tex: texMadera },
  pasto:    { nombre: 'Pasto', css: 'linear-gradient(#93e07a, #6cc45c)', tex: texPasto },
  seto:     { nombre: 'Arbusto', css: 'radial-gradient(#5fd07c, #2f9a50)', tex: texSeto },
  ladrillo: { nombre: 'Ladrillo', css: 'repeating-linear-gradient(0deg, #e2725b 0 8px, #efe3d6 8px 10px)', tex: texLadrillo },
  vidrio:   { nombre: 'Vidrio', css: 'linear-gradient(135deg, #e6fbff, #9fe6ff)', hex: 0xbdf1ff, vidrio: true },
};
const mats = {};
function matDe(color) {
  if (mats[color]) return mats[color];
  const c = COLORES[color] || COLORES.rosa;
  const m = c.vidrio
    ? new THREE.MeshStandardMaterial({ color: c.hex, transparent: true, opacity: .45, roughness: .05, metalness: .1, depthWrite: false })
    : new THREE.MeshStandardMaterial({ color: c.tex ? 0xffffff : c.hex, map: c.tex || texBloque, roughness: .55 });
  return (mats[color] = m);
}
const matMarco = new THREE.MeshStandardMaterial({ color: 0xffffff, map: texBloque, roughness: .5 });
const matManija = new THREE.MeshStandardMaterial({ color: 0xffd23f, metalness: .5, roughness: .3 });

// ---------- formas de las piezas (cada una ocupa un cuadrito; base en y=0) ----------
const stud = (x, y, z) => new THREE.CylinderGeometry(.17, .17, .1, 16).translate(x, y + .05, z);
const caja = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);
function cuña() {
  // techo: alto atrás (z-) y bajo adelante (z+)
  const s = new THREE.Shape(); s.moveTo(-.5, 0); s.lineTo(.5, 0); s.lineTo(-.5, 1); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -.5); g.rotateY(-Math.PI / 2);
  return g.toNonIndexed();
}
const plain = g => (g.index ? g.toNonIndexed() : g);
const merge = list => mergeGeometries(list.map(plain));
const PIEZAS = {
  cubo:     { nombre: 'Cubo', emoji: '🟪', alto: 1, partes: [{ geo: merge([caja(1, 1, 1), stud(0, 1, 0)]) }] },
  medio:    { nombre: 'Mitad', emoji: '▬', alto: .5, partes: [{ geo: merge([caja(1, .5, 1), stud(0, .5, 0)]) }] },
  techo:    { nombre: 'Techo', emoji: '📐', alto: 1, rampa: true, partes: [{ geo: cuña() }] },
  escalera: { nombre: 'Escalera', emoji: '🪜', alto: 1, rampa: true, partes: [{ geo: merge([caja(1, .5, 1), caja(1, .5, .5, 0, .5, -.25)]) }] },
  puerta:   { nombre: 'Puerta', emoji: '🚪', alto: 2, pasa: true, partes: [
    { geo: merge([caja(.14, 2, .3, -.43), caja(.14, 2, .3, .43), caja(1, .16, .3, 0, 1.84)]), mat: 'marco' },
    { geo: caja(.72, 1.84, .1) },
    { geo: new THREE.SphereGeometry(.07, 10, 8).translate(.22, .95, .08), mat: 'manija' },
  ] },
  ventana:  { nombre: 'Ventana', emoji: '🪟', alto: 1, partes: [
    { geo: merge([caja(1, .14, 1), caja(1, .14, 1, 0, .86), caja(.14, .72, 1, -.43, .14), caja(.14, .72, 1, .43, .14), caja(.08, .72, .2, 0, .14)]) },
    { geo: caja(.72, .72, .9, 0, .14), mat: 'vidrio' },
  ] },
  reja:     { nombre: 'Reja', emoji: '🚧', alto: .75, partes: [{ geo: merge([caja(.14, .75, .14, -.4), caja(.14, .75, .14, .4), caja(.14, .75, .14), caja(1, .1, .1, 0, .5), caja(1, .1, .1, 0, .22)]) }] },
  columna:  { nombre: 'Columna', emoji: '🏛️', alto: 1, partes: [{ geo: merge([caja(.9, .14, .9), new THREE.CylinderGeometry(.3, .3, .72, 18).translate(0, .5, 0), caja(.9, .14, .9, 0, .86)]) }] },
  flor:     { nombre: 'Florcitas', emoji: '🌷', alto: .1, pasa: true, partes: [{ geo: merge([0, 1, 2, 3, 4].map(i => new THREE.SphereGeometry(.09, 8, 6).translate(Math.cos(i * 1.3) * .3, .15, Math.sin(i * 1.3) * .3))) }, { geo: caja(.9, .05, .9), mat: 'pastito' }] },
};
const matDeParte = (parte, color) => parte.mat === 'marco' ? matMarco : parte.mat === 'manija' ? matManija : parte.mat === 'vidrio' ? matDe('vidrio') : parte.mat === 'pastito' ? matDe('pasto') : matDe(color);

// ---------- el mundo ----------
// item: { t:'b', k:pieza, c:color, x,y,z, r }  |  { t:'o', w:palabra, e:emoji }  |  { t:'p', id }  |  { t:'s' } estrella  |  { t:'f' } meta
let items = [];
const celdas = new Map(); // "x,y,z" → item
const key = (x, y, z) => x + ',' + y + ',' + z;
const altoDe = it => it.t === 'b' ? Math.ceil(PIEZAS[it.k].alto) : it.t === 'p' ? 2 : 1;
function indexar() {
  celdas.clear();
  for (const it of items) for (let h = 0; h < altoDe(it); h++) celdas.set(key(it.x, it.y + h, it.z), it);
}
const libre = (x, y, z, h = 1) => { if (x < MIN || x > MAX || z < MIN || z > MAX || y < 0 || y + h > ALTO) return false; for (let i = 0; i < h; i++) if (celdas.has(key(x, y + i, z))) return false; return true; };

// bloques dibujados con InstancedMesh (uno por pieza+parte+color): rápido en tablets
const grupoBloques = new THREE.Group(); scene.add(grupoBloques);
const grupoCosas = new THREE.Group(); scene.add(grupoCosas);
let mallas = [];
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(1, 1, 1), tmpP = new THREE.Vector3(), EJE_Y = new THREE.Vector3(0, 1, 0);
function dibujarBloques() {
  mallas.forEach(m => { grupoBloques.remove(m); m.dispose(); }); mallas = [];
  const grupos = new Map();
  items.forEach(it => {
    if (it.t !== 'b') return;
    PIEZAS[it.k].partes.forEach((parte, pi) => {
      const k = it.k + '|' + pi + '|' + (parte.mat || it.c);
      if (!grupos.has(k)) grupos.set(k, { parte, color: it.c, lista: [] });
      grupos.get(k).lista.push(it);
    });
  });
  for (const { parte, color, lista } of grupos.values()) {
    const m = new THREE.InstancedMesh(parte.geo, matDeParte(parte, color), lista.length);
    lista.forEach((it, i) => {
      tmpQ.setFromAxisAngle(EJE_Y, -(it.r || 0) * Math.PI / 2);
      m.setMatrixAt(i, tmpM.compose(tmpP.set(it.x, it.y, it.z), tmpQ, tmpS));
    });
    m.castShadow = !parte.mat || parte.mat === 'marco'; m.receiveShadow = true;
    m.userData.items = lista;
    m.computeBoundingSphere();
    grupoBloques.add(m); mallas.push(m);
  }
}
// cosas sueltas: objetos 3D, personajes, estrellas y meta
const vivos = new Map(); // item → { group, update }
function hacerEstrella() {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? .18 : .42, a = i / 10 * Math.PI * 2 + Math.PI / 2; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
  const geo = new THREE.ExtrudeGeometry(s, { depth: .14, bevelEnabled: true, bevelSize: .04, bevelThickness: .04, bevelSegments: 2 }); geo.center();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x8a6a00, emissiveIntensity: .45, metalness: .3, roughness: .3 }));
  m.position.y = .6; m.castShadow = true; g.add(m);
  let t = Math.random() * 6;
  return { group: g, update(dt) { t += dt; m.rotation.y += dt * 2; m.position.y = .6 + Math.sin(t * 3) * .1; } };
}
function hacerMeta() {
  const g = new THREE.Group();
  const palo = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 2, 10), new THREE.MeshStandardMaterial({ color: 0xffffff })); palo.position.y = 1; g.add(palo);
  const tex = canvasTex((x, s) => { const q = s / 4; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { x.fillStyle = (r + c) % 2 ? '#23324a' : '#ffffff'; x.fillRect(c * q, r * q, q, q); } }, 64);
  const tela = new THREE.Mesh(new THREE.PlaneGeometry(.8, .55, 8, 1), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide })); tela.position.set(.42, 1.68, 0); g.add(tela);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.35, .4, .12, 20), new THREE.MeshStandardMaterial({ color: 0xff7eb6 })); base.position.y = .06; g.add(base);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const pos = tela.geometry.attributes.position, x0 = Float32Array.from(pos.array);
  let t = 0;
  return { group: g, update(dt) { t += dt; for (let i = 0; i < pos.count; i++) { const x = x0[i * 3]; pos.setZ(i, Math.sin(t * 5 + x * 6) * .06 * (x + .4)); } pos.needsUpdate = true; } };
}
async function crearCosa(it) {
  let v;
  if (it.t === 'o') { const o = crearObjeto(it.w, it.e); v = { group: o.group, update: (dt, feliz) => o.update(dt, feliz) }; }
  else if (it.t === 'p') { const ch = await crearPersonaje(it.id); escalarPersonaje(ch.group); v = { group: ch.group, update: (dt, modo) => ch.update(dt, modo || 'quieto'), ch }; }
  else if (it.t === 's') v = hacerEstrella();
  else if (it.t === 'f') v = hacerMeta();
  v.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.item = it; } });
  v.group.userData.item = it;
  return v;
}
function escalarPersonaje(g) {
  g.scale.setScalar(1); g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(g), h = b.max.y - b.min.y || 1;
  g.scale.setScalar(1.35 / h);
}
let sincronizando = Promise.resolve();
function dibujarCosas() {
  sincronizando = sincronizando.then(async () => {
    const quedan = new Set(items.filter(it => it.t !== 'b'));
    for (const [it, v] of vivos) if (!quedan.has(it)) { grupoCosas.remove(v.group); vivos.delete(it); }
    for (const it of quedan) {
      if (!vivos.has(it)) { const v = await crearCosa(it); if (!items.includes(it)) continue; vivos.set(it, v); grupoCosas.add(v.group); }
      const v = vivos.get(it);
      v.group.position.set(it.x, it.y, it.z); v.group.rotation.y = -(it.r || 0) * Math.PI / 2;
      v.group.visible = true;
    }
  });
  return sincronizando;
}
function redibujar() { indexar(); dibujarBloques(); dibujarCosas(); guardarActual(); }

// ---------- suelo y alrededores ----------
const sueloTex = canvasTex((g, s) => {
  g.fillStyle = '#8fdc74'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 70; i++) { g.fillStyle = Math.random() < .5 ? '#86d46b' : '#9be680'; g.fillRect(Math.random() * s, Math.random() * s, 2, 5); }
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.strokeRect(0, 0, s, s);
}, 64);
sueloTex.wrapS = sueloTex.wrapT = THREE.RepeatWrapping; sueloTex.repeat.set(N, N);
const suelo = new THREE.Mesh(new THREE.BoxGeometry(N, .4, N), [null, null, new THREE.MeshStandardMaterial({ map: sueloTex, roughness: .9 }), null, null, null].map(m => m || new THREE.MeshStandardMaterial({ color: 0xb98a5a })));
suelo.position.set((MIN + MAX) / 2, -.2, (MIN + MAX) / 2); suelo.receiveShadow = true; scene.add(suelo);
const isla = new THREE.Mesh(new THREE.CylinderGeometry(N * .82, N * .6, 3, 40), new THREE.MeshStandardMaterial({ color: 0xc79a6c }));
isla.position.set(-.5, -1.95, -.5); scene.add(isla);
const agua = new THREE.Mesh(new THREE.CircleGeometry(160, 48), new THREE.MeshStandardMaterial({ color: 0x7fd3ff, roughness: .2, metalness: .1 }));
agua.rotation.x = -Math.PI / 2; agua.position.y = -2.2; scene.add(agua);
// nubes de bloques
for (let i = 0; i < 9; i++) {
  const n = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  for (let j = 0; j < 4; j++) { const b = new THREE.Mesh(new THREE.BoxGeometry(2 + Math.random() * 2, 1, 1.6 + Math.random()), mat); b.position.set(j * 1.4 - 2, Math.random() * .5, Math.random() - .5); n.add(b); }
  const a = i / 9 * Math.PI * 2; n.position.set(Math.cos(a) * (30 + Math.random() * 12), 14 + Math.random() * 6, Math.sin(a) * (30 + Math.random() * 12)); n.userData.v = .3 + Math.random() * .4;
  scene.add(n); (scene.userData.nubes = scene.userData.nubes || []).push(n);
}

// ---------- cámara: girar, acercar y mover ----------
const cam = { target: new THREE.Vector3(-.5, 0, -.5), theta: .7, phi: 1.0, r: narrow() ? 30 : 24 };
function aplicarCamara() {
  cam.phi = Math.max(.25, Math.min(1.45, cam.phi)); cam.r = Math.max(6, Math.min(48, cam.r));
  cam.target.x = Math.max(MIN, Math.min(MAX, cam.target.x)); cam.target.z = Math.max(MIN, Math.min(MAX, cam.target.z));
  camera.position.set(cam.target.x + cam.r * Math.sin(cam.phi) * Math.sin(cam.theta), cam.target.y + cam.r * Math.cos(cam.phi), cam.target.z + cam.r * Math.sin(cam.phi) * Math.cos(cam.theta));
  camera.lookAt(cam.target);
}
aplicarCamara();
function pan(dx, dy) {
  const k = cam.r / 600, s = Math.sin(cam.theta), c = Math.cos(cam.theta);
  cam.target.x += (-dx * c - dy * s) * k; cam.target.z += (dx * s - dy * c) * k;
}

// ---------- estado del editor ----------
const state = { modo: 'construir', tool: 'poner', tab: 'bloques', pieza: 'cubo', color: 'rosa', sel: { t: 'b' }, giro: 0, estrellas: 0, metaOk: false };
const historia = [];
const foto = () => JSON.stringify(items);
function recordar() { historia.push(foto()); if (historia.length > 60) historia.shift(); }
function deshacer() {
  if (!historia.length) { J.boing(); return; }
  items = JSON.parse(historia.pop()); vivos.forEach(v => grupoCosas.remove(v.group)); vivos.clear(); redibujar(); J.sfx('pop2');
}
function guardarActual() { try { localStorage.setItem('bl-mundo-actual', foto()); } catch (e) {} }
function message(text, secs = 1.6) {
  const el = $('#mensaje'); el.textContent = text;
  el.classList.remove('ver'); void el.offsetWidth; el.classList.add('ver');
  clearTimeout(message.t); message.t = setTimeout(() => el.classList.remove('ver'), secs * 1000);
}
function updatePlayer() { const p = P.players[0]; $('#jugador').innerHTML = `${J.CHARS[p.char]?.emoji || '⭐'} ${J.esc(p.name)} · ⭐ ${p.stars}`; }

// ---------- poner, borrar, pintar y girar ----------
function nuevoItem(x, y, z) {
  const s = state.sel, r = state.giro;
  if (s.t === 'b') return { t: 'b', k: state.pieza, c: state.color, x, y, z, r };
  if (s.t === 'o') return { t: 'o', w: s.w, e: s.e, x, y, z, r };
  if (s.t === 'p') return { t: 'p', id: s.id, x, y, z, r: r || 0 };
  if (s.t === 's') return { t: 's', x, y, z };
  if (s.t === 'f') return { t: 'f', x, y, z, r };
  return null;
}
let ultimoSonido = 0;
function poner(x, y, z, silencio = false) {
  if (state.sel.t === 'a') return ponerArmado(state.sel.id, x, y, z);
  const it = nuevoItem(x, y, z); if (!it) return false;
  if (!libre(x, y, z, altoDe(it))) { if (!silencio) J.boing(); return false; }
  if (!silencio) recordar();
  items.push(it);
  if (!silencio) {
    redibujar(); fx.burst(new THREE.Vector3(x, y + .6, z), 10, .3);
    const now = performance.now(); if (now - ultimoSonido > 60) { J.efecto('pop'); ultimoSonido = now; }
    if (it.t === 'p') J.say(['¡Hola!', nombrePersonaje(it.id)]);
    if (Math.random() < .04) J.say(J.pick(['¡Qué lindo!', '¡Muy bien!', '¡Bravo!']));
  }
  return true;
}
function borrar(it) {
  recordar();
  items = items.filter(x => x !== it); redibujar();
  fx.burst(new THREE.Vector3(it.x, it.y + .5, it.z), 16, .4); J.efecto('pum');
}
function pintar(it) {
  if (it.t !== 'b' || it.c === state.color) return;
  recordar(); it.c = state.color; redibujar(); J.sfx('pop', .7, 1.3); fx.burst(new THREE.Vector3(it.x, it.y + .6, it.z), 8, .3);
}
function girar(it) { recordar(); it.r = ((it.r || 0) + 1) % 4; redibujar(); J.sfx('tick'); }

// ---------- armados (casita, árbol, puente, torre, tobogán, columpio, laberinto) ----------
const ARMADOS = {
  casita: { nombre: 'Casita', emoji: '🏠', hacer() {
    const L = [];
    const pared = (x, z) => Math.abs(x) === 2 || Math.abs(z) === 2;
    for (let y = 0; y < 2; y++) for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
      if (!pared(x, z)) continue;
      if (x === 0 && z === 2) { if (y === 0) L.push(['puerta', 'rosa', x, y, z, 0]); continue; }
      if (y === 1 && ((Math.abs(x) === 2 && z === 0) || (z === -2 && x === 0) || (z === 2 && Math.abs(x) === 1))) { L.push(['ventana', 'blanco', x, y, z, Math.abs(x) === 2 ? 1 : 0]); continue; }
      L.push(['cubo', (Math.abs(x) === 2 && Math.abs(z) === 2) ? 'blanco' : 'rosa', x, y, z]);
    }
    // techo de dos aguas, con alero
    for (let x = -3; x <= 3; x++) {
      for (let k = 0; k < 3; k++) {
        const y = 2 + k, borde = 3 - k;
        L.push(['techo', 'morado', x, y, borde, 0], ['techo', 'morado', x, y, -borde, 2]);
        for (let z = -borde + 1; z <= borde - 1; z++) L.push(['cubo', Math.abs(x) === 3 ? 'morado' : 'lila', x, y, z]);
      }
      L.push(['techo', 'morado', x, 5, 0, 0]);
    }
    L.push(['flor', 'rosa', -1, 0, 3], ['flor', 'amarillo', 1, 0, 3], ['flor', 'lila', -2, 0, 3], ['flor', 'rojo', 2, 0, 3]);
    return L;
  } },
  arbol: { nombre: 'Árbol', emoji: '🌳', hacer() {
    const L = [[ 'cubo', 'madera', 0, 0, 0], ['cubo', 'madera', 0, 1, 0], ['cubo', 'madera', 0, 2, 0]];
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) { L.push(['cubo', 'seto', x, 3, z]); if (!(x && z)) L.push(['cubo', 'seto', x, 4, z]); }
    L.push(['cubo', 'seto', 0, 5, 0], ['cubo', 'seto', -2, 3, 0], ['cubo', 'seto', 2, 3, 0], ['cubo', 'seto', 0, 3, -2], ['cubo', 'seto', 0, 3, 2]);
    return L;
  } },
  puente: { nombre: 'Puente', emoji: '🌉', hacer() {
    const L = [];
    for (const z of [0, 1]) { L.push(['escalera', 'madera', -3, 0, z, 1], ['escalera', 'madera', 3, 0, z, 3]); for (let x = -2; x <= 2; x++) L.push(['medio', 'madera', x, 1, z]); }
    for (let x = -2; x <= 2; x++) L.push(['reja', 'blanco', x, 2, -1], ['reja', 'blanco', x, 2, 2]);
    for (let x = -2; x <= 2; x++) for (const z of [0, 1]) L.push(['cubo', 'aqua', x, 0, z]);
    return L;
  } },
  torre: { nombre: 'Torre', emoji: '🏰', hacer() {
    const L = [];
    for (let y = 0; y < 6; y++) for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) {
      if (!x && !z) continue;
      if (y === 0 && x === 0 && z === 1) { L.push(['puerta', 'lila', x, y, z]); continue; }
      if (y === 1 && x === 0 && z === 1) continue;
      if (y % 2 === 1 && ((x === 0) !== (z === 0)) && y > 1) { L.push(['ventana', 'blanco', x, y, z, x ? 1 : 0]); continue; }
      L.push(['cubo', y === 5 ? 'lila' : 'ladrillo', x, y, z]);
    }
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) if ((x + z) % 2 === 0 && (x || z)) L.push(['cubo', 'morado', x, 6, z]);
    L.push(['columna', 'amarillo', 0, 0, 0], ['cubo', 'fucsia', 0, 6, 0]);
    return L;
  } },
  tobogan: { nombre: 'Tobogán', emoji: '🛝', hacer() {
    const L = [];
    for (let i = 0; i < 3; i++) { for (let y = 0; y < i; y++) L.push(['cubo', 'amarillo', -2 + i, y, 0]); L.push(['escalera', 'amarillo', -2 + i, i, 0, 1]); }
    L.push(['cubo', 'aqua', 1, 0, 0], ['cubo', 'aqua', 1, 1, 0], ['cubo', 'aqua', 1, 2, 0], ['medio', 'fucsia', 1, 3, 0], ['reja', 'blanco', 1, 3, 1], ['reja', 'blanco', 1, 3, -1]);
    for (let i = 0; i < 3; i++) { for (let y = 0; y < 2 - i; y++) L.push(['cubo', 'aqua', 2 + i, y, 0]); L.push(['techo', 'fucsia', 2 + i, 2 - i, 0, 3]); }
    return L;
  } },
  columpio: { nombre: 'Columpio', emoji: '🪢', hacer() {
    const L = [];
    for (const x of [-2, 2]) for (let y = 0; y < 3; y++) L.push(['columna', 'rojo', x, y, 0]);
    for (let x = -2; x <= 2; x++) L.push(['medio', 'rojo', x, 3, 0]);
    L.push(['medio', 'amarillo', -1, 0, 0], ['medio', 'aqua', 1, 0, 0], ['reja', 'blanco', -1, 1, 0], ['reja', 'blanco', 1, 1, 0]);
    return L;
  } },
  laberinto: { nombre: 'Laberinto', emoji: '🌀', hacer() {
    // laberinto de 4×4 caminos con paredes de arbusto de 2 de alto, estrellitas y una meta al final
    const n = 4, S = 2 * n + 1, muro = Array.from({ length: S }, () => Array(S).fill(true));
    const vis = Array.from({ length: n }, () => Array(n).fill(false));
    const pila = [[0, 0]]; vis[0][0] = true; muro[1][1] = false;
    while (pila.length) {
      const [r, c] = pila[pila.length - 1];
      const vec = [[0, 1], [1, 0], [0, -1], [-1, 0]].map(([dr, dc]) => [r + dr, c + dc, dr, dc]).filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n && !vis[a][b]);
      if (!vec.length) { pila.pop(); continue; }
      const [a, b, dr, dc] = vec[Math.floor(Math.random() * vec.length)];
      vis[a][b] = true; muro[2 * r + 1 + dr][2 * c + 1 + dc] = false; muro[2 * a + 1][2 * b + 1] = false; pila.push([a, b]);
    }
    muro[0][1] = false; muro[S - 1][S - 2] = false; // entrada y salida
    const L = [], h = (S - 1) / 2;
    for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) {
      const x = c - h, z = r - h;
      if (muro[r][c]) { L.push(['cubo', 'seto', x, 0, z], ['cubo', 'seto', x, 1, z]); }
    }
    L.push({ t: 'f', x: S - 2 - h, y: 0, z: S - 1 - h + 1 });
    for (let k = 0; k < 3; k++) { const r = 1 + 2 * Math.floor(Math.random() * n), c = 1 + 2 * Math.floor(Math.random() * n); L.push({ t: 's', x: c - h, y: 0, z: r - h }); }
    return L;
  } },
  jardin: { nombre: 'Jardín', emoji: '🌷', hacer() {
    const L = [];
    for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
      if (Math.abs(x) === 2 || Math.abs(z) === 2) { if (!(x === 0 && z === 2)) L.push(['reja', 'blanco', x, 0, z, Math.abs(x) === 2 ? 1 : 0]); }
      else L.push(['flor', ['rosa', 'amarillo', 'lila', 'rojo'][(x + z + 4) % 4], x, 0, z]);
    }
    return L;
  } },
};
function ponerArmado(id, x0, y0, z0) {
  const lista = ARMADOS[id].hacer();
  recordar();
  let n = 0;
  for (const p of lista) {
    const it = Array.isArray(p) ? { t: 'b', k: p[0], c: p[1], x: x0 + p[2], y: y0 + p[3], z: z0 + p[4], r: p[5] || 0 } : { ...p, x: x0 + p.x, y: y0 + p.y, z: z0 + p.z };
    if (it.t !== 'b') { it.x = Math.round(it.x); it.z = Math.round(it.z); }
    if (libre(it.x, it.y, it.z, altoDe(it))) { items.push(it); for (let h = 0; h < altoDe(it); h++) celdas.set(key(it.x, it.y + h, it.z), it); n++; }
  }
  if (!n) { historia.pop(); J.boing(); return false; }
  redibujar();
  fx.burst(new THREE.Vector3(x0, y0 + 2, z0), 60, 2); J.efecto('festejo');
  J.say(J.pick(['¡Qué lindo!', '¡Muy bien!', '¡Bravo!']));
  return true;
}

// ---------- biblioteca ----------
const OBJ_EMOJI = { gato: '🐱', perro: '🐶', oso: '🐻', conejo: '🐰', vaca: '🐮', lobo: '🐺', toro: '🐂', mono: '🐵', llama: '🦙', ratón: '🐭', pato: '🦆', loro: '🦜', sapo: '🐸', tortuga: '🐢', abeja: '🐝', gusano: '🐛', pez: '🐟', pelota: '⚽', flor: '🌸', palta: '🥑', choclo: '🌽', carro: '🚗', sol: '☀️', luna: '🌙', nube: '☁️', casa: '🏠', dado: '🎲', taza: '☕', uva: '🍇', pera: '🍐', tomate: '🍅', papa: '🥔', piña: '🍍' };
const EXTRA_OBJ = [['árbol', '🌳'], ['flor', '🌻'], ['regalo', '🎁'], ['torta', '🎂'], ['corazón', '💖'], ['arcoíris', '🌈'], ['helado', '🍦'], ['unicornio', '🦄']];
function iconoPieza(k, color) {
  const c = COLORES[color], bg = c.css;
  return `<span class="pieza" style="display:grid;place-items:center;border-radius:10px;background:${bg};box-shadow:inset 0 -6px 0 rgba(0,0,0,.15);font-size:22px">${PIEZAS[k].emoji}</span>`;
}
function render() {
  [...$('#tabs').children].forEach(b => b.classList.toggle('on', b.dataset.tab === state.tab));
  const L = $('#lista'), s = state.sel;
  if (state.tab === 'bloques') {
    L.innerHTML = `<h3>Color</h3><div class="colores">${Object.entries(COLORES).map(([k, c]) => `<button class="color ${k === state.color ? 'on' : ''}" data-color="${k}" style="background:${c.css}" aria-label="${c.nombre}" title="${c.nombre}"></button>`).join('')}</div>
      <h3>Piezas</h3><div class="grid">${Object.entries(PIEZAS).map(([k, p]) => `<button class="item ${s.t === 'b' && state.pieza === k ? 'on' : ''}" data-pieza="${k}">${iconoPieza(k, state.color)}<b>${p.nombre}</b></button>`).join('')}</div>`;
  } else if (state.tab === 'armados') {
    L.innerHTML = `<h3>Armados listos</h3><div class="grid">${Object.entries(ARMADOS).map(([k, a]) => `<button class="item ${s.t === 'a' && s.id === k ? 'on' : ''}" data-armado="${k}"><span>${a.emoji}</span><b>${a.nombre}</b></button>`).join('')}</div>
      <h3>Para jugar</h3><div class="grid"><button class="item ${s.t === 's' ? 'on' : ''}" data-especial="s"><span>⭐</span><b>Estrellita</b></button><button class="item ${s.t === 'f' ? 'on' : ''}" data-especial="f"><span>🏁</span><b>Meta</b></button></div>`;
  } else if (state.tab === 'objetos') {
    const lista = BUSCABLES.map(w => [w, OBJ_EMOJI[w] || '✨']).concat(EXTRA_OBJ);
    L.innerHTML = `<h3>Objetos y animalitos</h3><div class="grid">${lista.map(([w, e]) => `<button class="item ${s.t === 'o' && s.w === w ? 'on' : ''}" data-obj="${w}" data-emoji="${e}"><span>${e}</span><b>${w}</b></button>`).join('')}</div>`;
  } else {
    L.innerHTML = `<h3>Personajes</h3><div class="grid">${PERSONAJES.map(id => `<button class="item ${s.t === 'p' && s.id === id ? 'on' : ''}" data-pj="${id}"><span>${J.CHARS[id]?.emoji || '🙂'}</span><b>${J.esc(J.CHARS[id]?.name || nombrePersonaje(id))}</b></button>`).join('')}</div>`;
  }
  document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === state.tool));
}
function elegir(sel) { state.sel = sel; if (state.tool !== 'pintar' || sel.t !== 'b') state.tool = 'poner'; render(); J.sfx('pop', .5, 1.4); if (narrow()) $('#biblio').classList.remove('abierta'); }
$('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; state.tab = b.dataset.tab; render(); J.sfx('tick'); if (narrow()) $('#biblio').classList.add('abierta'); });
$('#lista').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.color) { state.color = b.dataset.color; if (state.sel.t !== 'b') state.sel = { t: 'b' }; render(); J.sfx('pop', .5, 1.2); return; }
  if (b.dataset.pieza) return elegir((state.pieza = b.dataset.pieza, { t: 'b' }));
  if (b.dataset.armado) return elegir({ t: 'a', id: b.dataset.armado });
  if (b.dataset.especial) return elegir({ t: b.dataset.especial });
  if (b.dataset.obj) return elegir({ t: 'o', w: b.dataset.obj, e: b.dataset.emoji });
  if (b.dataset.pj) return elegir({ t: 'p', id: b.dataset.pj });
});
$('#asa').onclick = () => { $('#biblio').classList.toggle('abierta'); J.sfx('tick'); };
$('#herramientas').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.tool) { state.tool = b.dataset.tool; if (state.tool === 'pintar') { state.tab = 'bloques'; } render(); J.sfx('tick'); ghost.visible = false; return; }
  const a = b.dataset.accion;
  if (a === 'deshacer') deshacer();
  if (a === 'limpiar') limpiarTodo();
  if (a === 'guardar') abrirGuardar();
  if (a === 'abrir') abrirLista();
});
let confirmaLimpiar = 0;
function limpiarTodo() {
  if (performance.now() - confirmaLimpiar > 3000) { confirmaLimpiar = performance.now(); message('¿Borrar todo? Toca otra vez.', 2.4); J.say('¿Borrar todo? Toca otra vez.'); return; }
  confirmaLimpiar = 0; recordar(); items = []; redibujar(); J.efecto('pum'); fx.burst(new THREE.Vector3(0, 2, 0), 80, 4);
}

// ---------- guardar y abrir mundos ----------
const leerMundos = () => { try { return JSON.parse(localStorage.getItem('bl-mundos') || '{}'); } catch (e) { return {}; } };
function escribirMundos(m) { try { localStorage.setItem('bl-mundos', JSON.stringify(m)); return true; } catch (e) { message('¡Ya no cabe más!'); return false; } }
const modal = $('#modal'), mcaja = $('#modal-caja');
modal.addEventListener('click', e => { if (e.target === modal) modal.hidden = true; });
function abrirGuardar() {
  const m = leerMundos(); let n = Object.keys(m).length + 1, nombre = 'Mi mundo ' + n;
  while (m[nombre]) nombre = 'Mi mundo ' + (++n);
  mcaja.innerHTML = `<h2>💾 Guardar mundo</h2><input id="m-nombre" maxlength="30" value="${J.esc(state.nombre || nombre)}" aria-label="Nombre del mundo"><div class="fila"><button class="b" data-m="cerrar">Cancelar</button><b></b><button class="b si" data-m="guardar">💾 Guardar</button></div>`;
  modal.hidden = false;
}
function abrirLista() {
  const m = leerMundos(), nombres = Object.keys(m);
  mcaja.innerHTML = `<h2>📂 Mis mundos</h2>${nombres.length ? nombres.map(k => `<div class="fila"><b>🌍 ${J.esc(k)}</b><button class="b si" data-abrir="${J.esc(k)}">Abrir</button><button class="b" data-quitar="${J.esc(k)}" aria-label="Borrar ${J.esc(k)}">🗑️</button></div>`).join('') : '<p class="vacio">Todavía no hay mundos guardados.</p>'}<button class="b" data-m="cerrar">Cerrar</button>`;
  modal.hidden = false;
}
mcaja.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.m === 'cerrar') { modal.hidden = true; return; }
  if (b.dataset.m === 'guardar') {
    const nombre = ($('#m-nombre').value || '').trim() || 'Mi mundo';
    const m = leerMundos(); m[nombre] = items;
    if (escribirMundos(m)) { state.nombre = nombre; modal.hidden = true; message('¡Guardado! 💾'); J.efecto('acierto'); J.say('¡Mi mundo!'); }
    return;
  }
  if (b.dataset.abrir) { const m = leerMundos(); recordar(); items = (m[b.dataset.abrir] || []).map(x => ({ ...x })); state.nombre = b.dataset.abrir; vivos.forEach(v => grupoCosas.remove(v.group)); vivos.clear(); redibujar(); modal.hidden = true; J.efecto('abrir'); return; }
  if (b.dataset.quitar) {
    if (b.dataset.seguro !== '1') { b.dataset.seguro = '1'; b.textContent = '¿Seguro?'; return; }
    const m = leerMundos(); delete m[b.dataset.quitar]; escribirMundos(m); abrirLista(); J.efecto('pum');
  }
});

// ---------- tocar el mundo: rayo, fantasma y gestos ----------
const ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
const ghost = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.02, 1.02), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35, depthWrite: false }));
ghost.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.04, 1.04, 1.04)), new THREE.LineBasicMaterial({ color: 0x9a6ee0 })));
ghost.visible = false; scene.add(ghost);
function apuntar(cx, cy) {
  v2.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1);
  ray.setFromCamera(v2, camera);
  const hits = ray.intersectObjects([...mallas, ...grupoCosas.children, suelo], true);
  for (const h of hits) {
    if (h.object === suelo) {
      if (h.point.y < -.05) continue;
      const x = Math.round(h.point.x), z = Math.round(h.point.z);
      if (x < MIN || x > MAX || z < MIN || z > MAX) return null;
      return { celda: [x, 0, z], item: null };
    }
    let it = null, n = null;
    if (h.object.isInstancedMesh) { it = h.object.userData.items[h.instanceId]; h.object.getMatrixAt(h.instanceId, tmpM); n = h.face.normal.clone().transformDirection(tmpM); }
    else { let o = h.object; while (o && !o.userData.item) o = o.parent; it = o && o.userData.item; n = new THREE.Vector3(0, 1, 0); }
    if (!it) continue;
    // la celda vecina según la cara tocada
    let cx2 = it.x, cy2 = it.y, cz2 = it.z;
    if (Math.abs(n.y) > .5) cy2 = n.y > 0 ? it.y + altoDe(it) : it.y - 1;
    else if (Math.abs(n.x) > Math.abs(n.z)) cx2 += Math.sign(n.x); else cz2 += Math.sign(n.z);
    if (it.t !== 'b' && n.y > .5) { cx2 = it.x; cz2 = it.z; cy2 = it.y + altoDe(it); }
    return { celda: [cx2, cy2, cz2], item: it };
  }
  return null;
}
function mostrarFantasma(cx, cy) {
  if (state.modo !== 'construir') { ghost.visible = false; return; }
  const a = apuntar(cx, cy);
  if (!a) { ghost.visible = false; return; }
  if (state.tool === 'poner') {
    const [x, y, z] = a.celda;
    const h = state.sel.t === 'b' ? PIEZAS[state.pieza].alto : state.sel.t === 'p' ? 2 : 1;
    ghost.scale.set(1, Math.max(.2, h), 1); ghost.position.set(x, y + Math.max(.2, h) / 2, z);
    ghost.material.color.set(state.sel.t === 'b' && COLORES[state.color].hex ? COLORES[state.color].hex : 0xffffff);
    ghost.visible = libre(x, y, z, Math.ceil(h)) || state.sel.t === 'a';
  } else if (a.item) {
    const it = a.item, h = it.t === 'b' ? PIEZAS[it.k].alto : altoDe(it);
    ghost.scale.set(1.06, Math.max(.2, h) + .06, 1.06); ghost.position.set(it.x, it.y + h / 2, it.z);
    ghost.material.color.set(state.tool === 'borrar' ? 0xff5d5d : state.tool === 'pintar' ? (COLORES[state.color].hex || 0xffffff) : 0x7fd3ff);
    ghost.visible = true;
  } else ghost.visible = false;
}
function accionEn(cx, cy) {
  const a = apuntar(cx, cy); if (!a) return;
  if (state.tool === 'poner') { const [x, y, z] = a.celda; poner(x, y, z); }
  else if (!a.item) return;
  else if (state.tool === 'borrar') borrar(a.item);
  else if (state.tool === 'pintar') pintar(a.item);
  else if (state.tool === 'girar') girar(a.item);
  mostrarFantasma(cx, cy);
}
// gestos: un dedo toca o gira; dos dedos acercan y mueven; ratón: arrastrar gira, botón derecho mueve, rueda acerca
const canvas = $('#mundo');
const punteros = new Map();
let gesto = null;
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  punteros.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
  if (punteros.size === 1) gesto = { tipo: 'toque', boton: e.button, shift: e.shiftKey, mov: 0 };
  else { gesto = { tipo: 'dos', d0: null }; ghost.visible = false; }
});
canvas.addEventListener('pointermove', e => {
  const p = punteros.get(e.pointerId);
  if (!p) { if (e.pointerType === 'mouse') mostrarFantasma(e.clientX, e.clientY); return; }
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (!gesto) return;
  if (gesto.tipo === 'dos' && punteros.size >= 2) {
    const [a, b] = [...punteros.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    if (gesto.d0) { cam.r *= gesto.d0 / Math.max(10, d); pan(mx - gesto.mx, my - gesto.my); aplicarCamara(); }
    gesto.d0 = d; gesto.mx = mx; gesto.my = my;
    return;
  }
  gesto.mov += Math.abs(dx) + Math.abs(dy);
  if (gesto.mov > 10) {
    if (state.modo === 'jugar') { cam.theta -= dx * .008; return; }
    if (gesto.boton === 2 || gesto.shift) pan(dx, dy); else { cam.theta -= dx * .008; cam.phi -= dy * .006; }
    aplicarCamara(); ghost.visible = false;
  }
});
function soltar(e) {
  const p = punteros.get(e.pointerId); punteros.delete(e.pointerId);
  if (!p || !gesto) return;
  if (gesto.tipo === 'toque' && gesto.mov <= 10 && state.modo === 'construir' && gesto.boton === 0) accionEn(e.clientX, e.clientY);
  if (!punteros.size) gesto = null;
}
canvas.addEventListener('pointerup', soltar);
canvas.addEventListener('pointercancel', e => { punteros.delete(e.pointerId); if (!punteros.size) gesto = null; });
canvas.addEventListener('pointerleave', () => { if (!punteros.size) ghost.visible = false; });
canvas.addEventListener('wheel', e => { e.preventDefault(); cam.r *= 1 + Math.sign(e.deltaY) * .1; aplicarCamara(); }, { passive: false });

// ---------- modo jugar ----------
let heroe = null;
const jug = { pos: new THREE.Vector3(), vy: 0, dir: 0, suelo: true, joy: new THREE.Vector2(), keys: {}, mov: false, fiesta: 0 };
const RADIO = .28, ALTO_PJ = 1.3, PASO = 1.05;
function topeEn(x, z, pie) {
  // altura del piso más alto en (x,z) que se pueda pisar desde "pie"; Infinity si es una pared
  let piso = 0;
  const xs = [Math.round(x - RADIO), Math.round(x + RADIO)], zs = [Math.round(z - RADIO), Math.round(z + RADIO)];
  for (const cx of new Set(xs)) for (const cz of new Set(zs)) {
    for (let y = Math.max(0, Math.floor(pie) - 1); y < Math.floor(pie + ALTO_PJ) + 1; y++) {
      const it = celdas.get(key(cx, y, cz));
      if (!it || it.t !== 'b' || PIEZAS[it.k].pasa) continue;
      const top = it.y + PIEZAS[it.k].alto;
      if (it.y >= pie + ALTO_PJ - .05) continue;      // está arriba de la cabeza
      if (top <= pie + .01) { piso = Math.max(piso, top); continue; }
      if (top - pie <= PASO && jug.suelo) { piso = Math.max(piso, top); continue; }
      if (top - pie <= .2) { piso = Math.max(piso, top); continue; }
      return Infinity;
    }
  }
  return piso;
}
function fuera(x, z) { return x < MIN - .45 || x > MAX + .45 || z < MIN - .45 || z > MAX + .45; }
async function empezarJuego() {
  state.modo = 'jugar'; document.body.classList.add('juego'); ghost.visible = false;
  $('#jugar').textContent = '🧱 Construir';
  if (!heroe) { heroe = await crearPersonaje(P.players[0].char); escalarPersonaje(heroe.group); heroe.group.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(heroe.group); }
  heroe.group.visible = true;
  // empieza en un lugar libre cerca del centro (o junto a la entrada del laberinto)
  let ini = null;
  for (let r = 0; r < 12 && !ini; r++) for (let x = -r; x <= r && !ini; x++) for (let z = -r; z <= r && !ini; z++) {
    if (Math.max(Math.abs(x), Math.abs(z)) !== r) continue;
    if (!celdas.has(key(x, 0, z + 3)) && !celdas.has(key(x, 1, z + 3)) && z + 3 <= MAX) ini = [x, z + 3];
  }
  ini = ini || [0, 0];
  jug.pos.set(ini[0], 0, ini[1]); jug.vy = 0; jug.dir = Math.PI; jug.suelo = true;
  state.estrellas = 0; state.metaOk = false; $('#estrellas').textContent = '0';
  items.forEach(it => { if (it.t === 's' && vivos.get(it)) vivos.get(it).group.visible = true; });
  cam.theta = 0; cam.phi = 1.05; cam.r = 9;
  J.say('¡A jugar!');
}
function volverAConstruir() {
  state.modo = 'construir'; document.body.classList.remove('juego');
  $('#jugar').textContent = '▶ ¡Jugar!';
  if (heroe) heroe.group.visible = false;
  items.forEach(it => { if (vivos.get(it)) vivos.get(it).group.visible = true; });
  cam.target.set(jug.pos.x, 0, jug.pos.z); cam.r = narrow() ? 30 : 24; cam.phi = 1.0; aplicarCamara();
  J.say('¡A construir!');
}
$('#jugar').onclick = () => { J.audio(); J.sfx('pop'); state.modo === 'jugar' ? volverAConstruir() : empezarJuego(); };
function saltar() { if (state.modo !== 'jugar' || !jug.suelo) return; jug.vy = 7.2; jug.suelo = false; J.efecto('salto'); }
$('#saltar').addEventListener('pointerdown', e => { e.preventDefault(); saltar(); });
addEventListener('keydown', e => {
  if (modal.hidden === false || e.target.tagName === 'INPUT') return;
  const k = e.key.toLowerCase(); jug.keys[k] = true;
  if (k === ' ' && state.modo === 'jugar') { e.preventDefault(); saltar(); }
  if (state.modo === 'construir' && (e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); deshacer(); }
  if (k.startsWith('arrow')) e.preventDefault();
});
addEventListener('keyup', e => { jug.keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { jug.keys = {}; });
const joy = $('#joy'), knob = $('#knob');
let joyId = null;
function joyMove(e) {
  const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = e.clientX - cx, dy = e.clientY - cy;
  const max = r.width / 2 - 10, len = Math.hypot(dx, dy);
  if (len > max) { dx *= max / len; dy *= max / len; }
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
  jug.joy.set(dx / max, dy / max);
}
joy.addEventListener('pointerdown', e => { joyId = e.pointerId; joy.setPointerCapture(e.pointerId); joyMove(e); });
joy.addEventListener('pointermove', e => { if (e.pointerId === joyId) joyMove(e); });
const joyEnd = () => { joyId = null; knob.style.transform = ''; jug.joy.set(0, 0); };
joy.addEventListener('pointerup', joyEnd); joy.addEventListener('pointercancel', joyEnd);

const tmp = new THREE.Vector3();
function pasoJuego(dt, t) {
  const k = jug.keys;
  let ix = jug.joy.x + ((k.arrowright || k.d) ? 1 : 0) - ((k.arrowleft || k.a) ? 1 : 0);
  let iz = jug.joy.y + ((k.arrowdown || k.s) ? 1 : 0) - ((k.arrowup || k.w) ? 1 : 0);
  // el joystick es relativo a la cámara
  const s = Math.sin(cam.theta), c = Math.cos(cam.theta);
  let mx = ix * c + iz * s, mz = -ix * s + iz * c;
  const len = Math.hypot(mx, mz);
  jug.mov = len > .15;
  const V = 4.2;
  if (jug.mov) {
    if (len > 1) { mx /= len; mz /= len; }
    const nx = jug.pos.x + mx * V * dt, nz = jug.pos.z + mz * V * dt;
    const px = topeEn(nx, jug.pos.z, jug.pos.y); if (px !== Infinity && !fuera(nx, jug.pos.z)) { jug.pos.x = nx; if (jug.suelo && px > jug.pos.y) jug.pos.y = px; }
    const pz = topeEn(jug.pos.x, nz, jug.pos.y); if (pz !== Infinity && !fuera(jug.pos.x, nz)) { jug.pos.z = nz; if (jug.suelo && pz > jug.pos.y) jug.pos.y = pz; }
    let d = Math.atan2(mx, mz) - jug.dir; d = Math.atan2(Math.sin(d), Math.cos(d));
    jug.dir += d * Math.min(1, dt * 12);
  }
  // gravedad
  const piso = Math.max(0, topeEnPie());
  jug.vy -= 20 * dt; jug.pos.y += jug.vy * dt;
  if (jug.pos.y <= piso) { if (!jug.suelo && jug.vy < -6) J.sfx('land', .4); jug.pos.y = piso; jug.vy = 0; jug.suelo = true; }
  else if (jug.pos.y > piso + .05) jug.suelo = false;
  // techo
  heroe.group.position.copy(jug.pos); heroe.group.rotation.y = jug.dir;
  jug.fiesta -= dt;
  heroe.update(dt, jug.fiesta > 0 ? 'festejar' : !jug.suelo ? 'festejar' : jug.mov ? 'correr' : 'quieto', .9);
  // estrellitas y meta
  for (const it of items) {
    const v = vivos.get(it); if (!v || !v.group.visible) continue;
    const dx = it.x - jug.pos.x, dz = it.z - jug.pos.z, dy = it.y - jug.pos.y;
    const cerca = Math.hypot(dx, dz) < .8 && Math.abs(dy) < 1.2;
    if (it.t === 's' && cerca) {
      v.group.visible = false; state.estrellas++; $('#estrellas').textContent = state.estrellas;
      J.sfx('coin'); fx.burst(new THREE.Vector3(it.x, it.y + .8, it.z), 30, .6);
      if (state.estrellas % 3 === 0) { J.addStar(); updatePlayer(); J.say('¡Una estrellita!'); }
    }
    if (it.t === 'f' && cerca && !state.metaOk) {
      state.metaOk = true; jug.fiesta = 3; J.cheer(true); J.confetti(120); fx.burst(new THREE.Vector3(it.x, it.y + 2, it.z), 90, 2);
      message('¡Llegaste! 🏁', 2.4); J.say('¡Llegaste a la meta!'); J.addStar(); updatePlayer();
    }
  }
  // cámara que sigue detrás
  const cr = 9, cp = 1.05;
  tmp.set(jug.pos.x + cr * Math.sin(cp) * Math.sin(cam.theta), jug.pos.y + 1 + cr * Math.cos(cp), jug.pos.z + cr * Math.sin(cp) * Math.cos(cam.theta));
  camera.position.lerp(tmp, Math.min(1, dt * 5));
  camera.lookAt(jug.pos.x, jug.pos.y + .8, jug.pos.z);
  sun.position.set(jug.pos.x + 8, 18, jug.pos.z + 8); sun.target.position.copy(jug.pos);
}
function topeEnPie() {
  // piso justo debajo de los pies (sin subir escalones)
  let piso = 0;
  const xs = new Set([Math.round(jug.pos.x - RADIO + .02), Math.round(jug.pos.x + RADIO - .02)]), zs = new Set([Math.round(jug.pos.z - RADIO + .02), Math.round(jug.pos.z + RADIO - .02)]);
  for (const cx of xs) for (const cz of zs) for (let y = Math.max(0, Math.floor(jug.pos.y) - 1); y <= Math.floor(jug.pos.y + .2); y++) {
    const it = celdas.get(key(cx, y, cz));
    if (!it || it.t !== 'b' || PIEZAS[it.k].pasa) continue;
    const top = it.y + PIEZAS[it.k].alto;
    if (top <= jug.pos.y + .21) piso = Math.max(piso, top);
  }
  return piso;
}

// ---------- bucle ----------
W.onFrame((dt, t) => {
  (scene.userData.nubes || []).forEach(n => { n.position.x += n.userData.v * dt; if (n.position.x > 50) n.position.x = -50; });
  for (const [it, v] of vivos) {
    if (it.t === 'p') {
      const cerca = state.modo === 'jugar' && Math.hypot(it.x - jug.pos.x, it.z - jug.pos.z) < 2.5;
      v.update(dt, cerca ? 'saludar' : 'quieto');
      if (cerca) v.group.rotation.y = Math.atan2(jug.pos.x - it.x, jug.pos.z - it.z);
      else v.group.rotation.y = -(it.r || 0) * Math.PI / 2;
    } else v.update(dt, state.modo === 'jugar' && Math.hypot(it.x - jug.pos.x, it.z - jug.pos.z) < 2);
  }
  if (state.modo === 'jugar' && heroe) pasoJuego(dt, t);
  else { sun.position.set(cam.target.x + 8, 20, cam.target.z + 10); sun.target.position.copy(cam.target); }
  fx.update(dt);
});
addEventListener('resize', () => { if (state.modo === 'construir') aplicarCamara(); });

// ---------- inicio ----------
(async () => {
  await esperaFuente();
  await J.ready;
  updatePlayer();
  try { const g = JSON.parse(localStorage.getItem('bl-mundo-actual') || 'null'); if (Array.isArray(g) && !TEST) items = g; } catch (e) {}
  if (!items.length && !TEST) {
    // un mundo de ejemplo para empezar: una casita y un árbol
    redibujar(); ponerArmado('casita', -4, 0, -3); ponerArmado('arbol', 4, 0, -4); historia.length = 0;
  }
  redibujar();
  render();
  W.start(); J.refreshMusic();
  setTimeout(() => J.say('¡A construir!'), 600);
  if (TEST) window.__w = {
    state, get items() { return items; }, poner, ponerArmado, borrar, pintar, girar, deshacer, empezarJuego, volverAConstruir, jug, celdas, key,
    elegir, guardar(nombre) { const m = leerMundos(); m[nombre] = items; escribirMundos(m); }, abrir(nombre) { const m = leerMundos(); items = (m[nombre] || []).map(x => ({ ...x })); vivos.forEach(v => grupoCosas.remove(v.group)); vivos.clear(); redibujar(); },
    limpiar() { items = []; redibujar(); }, listo: () => sincronizando,
  };
})();
