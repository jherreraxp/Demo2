// Construye tu Mundo: bloques, casitas, objetos y personajes en un mundo 3D;
// luego se juega caminando con su personaje, juntando estrellitas y llegando a la meta.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { crearMundo, chispitas, esperaFuente } from './mundo3d.js';
import { crearPersonaje, crearObjeto, PERSONAJES, BUSCABLES, nombrePersonaje } from './personajes.js';
import { iniciarEnLinea } from './enlinea.js';

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
// plano que "corta" techos y pisos de arriba cuando la niña entra a una casa (como mirar una casita de muñecas)
const corte = new THREE.Plane(new THREE.Vector3(0, -1, 0), 999);
renderer.localClippingEnabled = true;
function matDe(color) {
  if (mats[color]) return mats[color];
  const c = COLORES[color] || COLORES.rosa;
  const m = c.vidrio
    ? new THREE.MeshStandardMaterial({ color: c.hex, transparent: true, opacity: .45, roughness: .05, metalness: .1, depthWrite: false })
    : new THREE.MeshStandardMaterial({ color: c.tex ? 0xffffff : c.hex, map: c.tex || texBloque, roughness: .55 });
  m.clippingPlanes = [corte]; m.clipShadows = true;
  return (mats[color] = m);
}
const matMarco = new THREE.MeshStandardMaterial({ color: 0xffffff, map: texBloque, roughness: .5, clippingPlanes: [corte], clipShadows: true });
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
    { geo: caja(.72, 1.84, .1), hoja: true },
    { geo: new THREE.SphereGeometry(.07, 10, 8).translate(.22, .95, .08), mat: 'manija', hoja: true },
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
// hojas de las puertas: cada una gira sobre su bisagra y se abre sola al acercarse
const grupoPuertas = new THREE.Group(); scene.add(grupoPuertas);
const puertas = []; // { it, pivote, ang, abierta }
const geoHoja = caja(.72, 1.84, .1).translate(.36, 0, 0), geoManija = new THREE.SphereGeometry(.07, 10, 8).translate(.58, .95, .08);
function dibujarPuertas() {
  grupoPuertas.clear(); puertas.length = 0;
  items.forEach(it => {
    if (it.t !== 'b' || it.k !== 'puerta') return;
    const base = new THREE.Group(); base.position.set(it.x, it.y, it.z); base.rotation.y = -(it.r || 0) * Math.PI / 2;
    const pivote = new THREE.Group(); pivote.position.x = -.36; base.add(pivote);
    const hoja = new THREE.Mesh(geoHoja, matDe(it.c)); hoja.castShadow = true; hoja.userData.item = it; pivote.add(hoja);
    const man = new THREE.Mesh(geoManija, matManija); man.userData.item = it; pivote.add(man);
    grupoPuertas.add(base); puertas.push({ it, pivote, ang: 0, abierta: false });
  });
}
function moverPuertas(dt) {
  for (const p of puertas) {
    const cerca = (state.modo === 'jugar' && Math.hypot(p.it.x - jug.pos.x, p.it.z - jug.pos.z) < 1.7 && Math.abs(p.it.y - jug.pos.y) < 1.5) || !!(red && red.alguienCerca(p.it.x, p.it.y, p.it.z));
    if (cerca !== p.abierta) { p.abierta = cerca; J.efecto(cerca ? 'abrir' : 'pop'); }
    p.ang += ((cerca ? -1.75 : 0) - p.ang) * Math.min(1, dt * 7);
    p.pivote.rotation.y = p.ang;
  }
}
function dibujarBloques() {
  mallas.forEach(m => { grupoBloques.remove(m); m.dispose(); }); mallas = [];
  dibujarPuertas();
  detectarEspeciales();
  const grupos = new Map();
  items.forEach(it => {
    if (it.t !== 'b' || sueltos.has(it)) return;
    PIEZAS[it.k].partes.forEach((parte, pi) => {
      if (parte.hoja) return;
      const k = it.k + '|' + pi + '|' + (parte.mat || it.c);
      if (!grupos.has(k)) grupos.set(k, { parte, color: it.c, lista: [] });
      grupos.get(k).lista.push(it);
    });
  });
  instancia = new WeakMap();
  for (const { parte, color, lista } of grupos.values()) {
    const m = new THREE.InstancedMesh(parte.geo, matDeParte(parte, color), lista.length);
    lista.forEach((it, i) => {
      tmpQ.setFromAxisAngle(EJE_Y, -(it.r || 0) * Math.PI / 2);
      m.setMatrixAt(i, tmpM.compose(tmpP.set(it.x, it.y, it.z), tmpQ, tmpS));
      if (!instancia.has(it)) instancia.set(it, []);
      instancia.get(it).push([m, i]);
    });
    m.castShadow = !parte.mat || parte.mat === 'marco'; m.receiveShadow = true;
    m.userData.items = lista;
    m.computeBoundingSphere();
    grupoBloques.add(m); mallas.push(m);
  }
}
// ---------- piezas que juegan (modo jugar) ----------
// Cada tipo de pieza tiene su interacción en la tabla INTERACCIONES: al acercarse, al chocar, al pisar o al tocarla.
// Para agregar una nueva basta con una línea en tipoDe() y su entrada en la tabla.
const grupoAnim = new THREE.Group(); scene.add(grupoAnim);
const sueltos = new Set();          // bloques que se dibujan sueltos (no instanciados) porque se mueven solos
let instancia = new WeakMap();      // bloque instanciado → [[malla, índice]] para moverlo (hojas, tablones, rebotes)
const anim = { flores: [], rejas: [], ventanas: [], asientos: [], arboles: [], frutas: [], rebotes: [] };
const animDe = new Map();           // bloque → su animación (para tocarlo)
const geoPersiana = caja(.36, .72, .04).translate(.18, 0, 0);
const geoFruta = new THREE.SphereGeometry(.16, 12, 10), matFruta = new THREE.MeshStandardMaterial({ color: 0xef3b4f, roughness: .35 });
const tmpE = new THREE.Euler(), tmpV = new THREE.Vector3(), tmpB = new THREE.Vector3();
const enCelda = (x, y, z) => celdas.get(key(x, y, z));
function mallaSuelta(it) {
  const g = new THREE.Group(); g.position.set(it.x, it.y, it.z); g.rotation.y = -(it.r || 0) * Math.PI / 2;
  PIEZAS[it.k].partes.forEach(parte => { if (parte.hoja) return; const m = new THREE.Mesh(parte.geo, matDeParte(parte, it.c)); m.castShadow = !parte.mat; m.receiveShadow = true; m.userData.item = it; g.add(m); });
  return g;
}
function detectarEspeciales() {
  grupoAnim.clear(); sueltos.clear(); animDe.clear();
  for (const k of ['flores', 'rejas', 'ventanas', 'asientos', 'arboles', 'rebotes']) anim[k].length = 0;
  // columpios: un asiento (mitad) con su cadena (reja) encima y la viga 3 más arriba
  for (const it of items) {
    if (it.t !== 'b' || it.k !== 'medio') continue;
    const cad = enCelda(it.x, it.y + 1, it.z), viga = enCelda(it.x, it.y + 3, it.z);
    if (!cad || cad.k !== 'reja' || !viga || viga.t !== 'b') continue;
    const eje = (enCelda(it.x + 1, it.y + 3, it.z) || enCelda(it.x - 1, it.y + 3, it.z)) ? 'x' : 'z';
    const pivote = new THREE.Group(); pivote.position.set(it.x, it.y + 3, it.z); grupoAnim.add(pivote);
    const asiento = mallaSuelta(it); asiento.position.set(0, -3, 0); pivote.add(asiento);
    const cadena = mallaSuelta(cad); cadena.position.set(0, -2, 0); cadena.scale.y = 2.6; pivote.add(cadena);
    const sw = { tipo: 'asiento', it, cad, pivote, eje, amp: 0, t: 0 };
    sueltos.add(it); sueltos.add(cad); anim.asientos.push(sw); animDe.set(it, sw); animDe.set(cad, sw);
  }
  // árboles: tronco de madera con hojas (seto) encima
  for (const it of items) {
    if (it.t !== 'b' || it.c !== 'madera' || it.k !== 'cubo') continue;
    const abajo = enCelda(it.x, it.y - 1, it.z); if (abajo && abajo.c === 'madera') continue;
    let alto = 0; while (enCelda(it.x, it.y + alto, it.z)?.c === 'madera') alto++;
    if (enCelda(it.x, it.y + alto, it.z)?.c !== 'seto') continue;
    const hojas = items.filter(o => o.t === 'b' && o.c === 'seto' && Math.abs(o.x - it.x) <= 2 && Math.abs(o.z - it.z) <= 2 && o.y >= it.y + alto && o.y <= it.y + alto + 3);
    const ar = { tipo: 'arbol', it, hojas, e: 0, cd: 0, alto, cerca: false };
    anim.arboles.push(ar); animDe.set(it, ar); hojas.forEach(h => animDe.set(h, ar));
    for (let y = 0; y < alto; y++) animDe.set(enCelda(it.x, it.y + y, it.z), ar);
  }
  for (const it of items) {
    if (it.t !== 'b' || sueltos.has(it)) continue;
    if (it.k === 'flor' || it.k === 'reja') {
      const g = mallaSuelta(it); grupoAnim.add(g); sueltos.add(it);
      const a = { tipo: it.k, it, g, e: 0, t: Math.random() * 6, cerca: false };
      (it.k === 'flor' ? anim.flores : anim.rejas).push(a); animDe.set(it, a);
    } else if (it.k === 'ventana') {
      // persianas a los dos lados de la ventana: se abren cuando ella se acerca
      const base = new THREE.Group(); base.position.set(it.x, it.y + .14, it.z); base.rotation.y = -(it.r || 0) * Math.PI / 2; grupoAnim.add(base);
      const mat = matDe(it.c === 'blanco' ? 'lila' : it.c), hojas = [];
      for (const lado of [-1, 1]) for (const cara of [-1, 1]) {
        const piv = new THREE.Group(); piv.position.set(lado * .43, 0, cara * .53); piv.rotation.y = lado < 0 ? 0 : Math.PI; base.add(piv);
        const m = new THREE.Mesh(geoPersiana, mat); m.castShadow = true; m.userData.item = it; piv.add(m);
        hojas.push({ piv, lado, cara });
      }
      const v = { tipo: 'ventana', it, hojas, abre: 1, toque: 0 };
      anim.ventanas.push(v); animDe.set(it, v);
    }
  }
}
// ---- acciones (lo que hace cada pieza) ----
let chimeT = 0;
function chime(n = 0) { const a = performance.now(); if (a - chimeT < 140) return; chimeT = a; J.tones([[1047, 1175, 1319, 1568, 1760][n % 5]], .08, 'sine', .05); }
function bailarFlor(f) { if (f.e < .3) { chime(Math.round(f.it.x + f.it.z)); fx.burst(tmpB.set(f.it.x, f.it.y + .4, f.it.z), 5, .25); } f.e = 1; }
function sacudirReja(r) { if (r.e < .3) J.sfx('tick', .35, .8 + Math.random() * .4); r.e = 1; }
function sacudirArbol(a) {
  if (a.e < .3) J.sfx('pop', .4, .7);
  a.e = 1;
  if (a.cd <= 0 && Math.random() < .55) {
    // a veces cae una frutita para recoger
    a.cd = 5;
    const h = a.hojas[Math.floor(Math.random() * a.hojas.length)] || a.it;
    const m = new THREE.Mesh(geoFruta, matFruta); m.castShadow = true;
    m.position.set(a.it.x + (Math.random() - .5) * 2.2, h.y + .2, a.it.z + (Math.random() - .5) * 2.2);
    scene.add(m); anim.frutas.push({ m, vy: 0, piso: a.it.y + .16, vida: 25 });
  }
}
function empujarColumpio(sw) { sw.amp = Math.max(sw.amp, .7); J.sfx('jump', .4, .8); }
function abrirVentana(v) { v.toque = 4; J.efecto('abrir'); }
function rebotar(it) {
  if (!instancia.has(it) || anim.rebotes.some(r => r.it === it)) return;
  anim.rebotes.push({ it, t: 0 }); J.sfx('pop', .5, .8 + ((it.x * 7 + it.y * 3 + it.z) % 5) * .12);
  fx.burst(tmpB.set(it.x, it.y + 1, it.z), 6, .3);
}
const INTERACCIONES = {
  flor:     { radio: 1.3, alAcercarse: bailarFlor, alTocar: bailarFlor },
  reja:     { alChocar: sacudirReja, alTocar: sacudirReja },
  arbol:    { radio: 1.4, alAcercarse: sacudirArbol, alTocar: sacudirArbol },
  asiento:  { alChocar: sw => sentarse(sw), alTocar: empujarColumpio },
  ventana:  { alTocar: abrirVentana },
};
function interactuarBloque(it, como) {
  const a = animDe.get(it), f = a && INTERACCIONES[a.tipo] && INTERACCIONES[a.tipo][como];
  if (f) { f(a); return true; }
  if (como === 'alTocar') { rebotar(it); return true; }
  return false;
}
function moverInstancia(it, dx, dy, dz) {
  const lista = instancia.get(it); if (!lista) return;
  tmpQ.setFromAxisAngle(EJE_Y, -(it.r || 0) * Math.PI / 2);
  for (const [m, i] of lista) { m.setMatrixAt(i, tmpM.compose(tmpP.set(it.x + dx, it.y + dy, it.z + dz), tmpQ, tmpS)); m.instanceMatrix.needsUpdate = true; }
}
function moverPiezas(dt, t) {
  const jugando = state.modo === 'jugar', px = jug.pos.x, pz = jug.pos.z, py = jug.pos.y;
  const cerca = (it, r) => jugando && Math.abs(it.x - px) < r && Math.abs(it.z - pz) < r && Math.hypot(it.x - px, it.z - pz) < r && Math.abs(it.y - py) < 2;
  for (const f of anim.flores) {
    const c = cerca(f.it, INTERACCIONES.flor.radio); if (c && !f.cerca) bailarFlor(f); f.cerca = c;
    f.t += dt; f.e = Math.max(0, f.e - dt * .7);
    f.g.rotation.z = Math.sin(f.t * 9) * .3 * f.e + Math.sin(f.t * 1.4) * .04;
    f.g.rotation.x = Math.cos(f.t * 7) * .15 * f.e;
    f.g.scale.y = 1 + Math.abs(Math.sin(f.t * 10)) * .5 * f.e;
  }
  for (const r of anim.rejas) { if (r.e <= 0) continue; r.e = Math.max(0, r.e - dt * 1.8); r.t += dt; r.g.rotation.z = Math.sin(r.t * 38) * .12 * r.e; }
  for (const v of anim.ventanas) {
    v.toque -= dt;
    const quiere = !jugando || v.toque > 0 || cerca(v.it, 2.6) ? 1 : 0;   // en el juego se cierran cuando ella está lejos
    v.abre += (quiere - v.abre) * Math.min(1, dt * 5);
    for (const h of v.hojas) h.piv.rotation.y = (h.lado < 0 ? 0 : Math.PI) + h.lado * h.cara * -v.abre * 1.75;
  }
  for (const a of anim.arboles) {
    const c = cerca(a.it, INTERACCIONES.arbol.radio); if (c && !a.cerca) sacudirArbol(a); a.cerca = c;
    a.cd -= dt;
    if (a.e <= 0) continue;
    a.e = Math.max(0, a.e - dt * 1.2);
    const ox = Math.sin(t * 30) * .07 * a.e, oz = Math.cos(t * 26) * .05 * a.e;
    for (const h of a.hojas) moverInstancia(h, ox, 0, oz);
  }
  for (let i = anim.frutas.length - 1; i >= 0; i--) {
    const f = anim.frutas[i]; f.vida -= dt;
    if (f.m.position.y > f.piso) { f.vy -= 14 * dt; f.m.position.y = Math.max(f.piso, f.m.position.y + f.vy * dt); if (f.m.position.y === f.piso) J.sfx('land', .25, 1.4); }
    f.m.rotation.y += dt;
    const lejos = Math.hypot(f.m.position.x - px, f.m.position.z - pz);
    if ((jugando && lejos < .7 && Math.abs(f.m.position.y - py) < 1.2) || f.vida <= 0) {
      if (f.vida > 0) { J.sfx('coin'); fx.burst(f.m.position, 14, .4); state.estrellas++; $('#estrellas').textContent = state.estrellas; if (state.estrellas % 3 === 0) { J.addStar(); updatePlayer(); J.say('¡Una estrellita!'); } else J.say('¡Una fruta!'); }
      scene.remove(f.m); anim.frutas.splice(i, 1);
    }
  }
  for (const sw of anim.asientos) {
    const montada = jug.columpio === sw;
    sw.amp = montada ? Math.min(.85, sw.amp + dt * .7) : Math.max(0, sw.amp - dt * .25);
    sw.t += dt;
    sw.pivote.rotation[sw.eje === 'x' ? 'x' : 'z'] = sw.amp * Math.sin(sw.t * 2.6);
  }
  for (let i = anim.rebotes.length - 1; i >= 0; i--) {
    const r = anim.rebotes[i]; r.t += dt;
    const k = r.t < .45 ? Math.sin(r.t / .45 * Math.PI) * .35 : 0;
    moverInstancia(r.it, 0, k, 0);
    if (r.t >= .45) anim.rebotes.splice(i, 1);
  }
}
// sentarse en el columpio y mecerse
function sentarse(sw) {
  if (jug.columpio || jug.cdColumpio > 0 || jug.desliza) return;
  jug.columpio = sw; sw.t = 0; jug.vy = 0; jug.suelo = true;
  J.say('¡Más alto!'); J.sfx('jump', .4, 1.2);
}
function bajarseDelColumpio() {
  const sw = jug.columpio; if (!sw) return;
  jug.columpio = null; jug.cdColumpio = 1.5;
  const lado = Math.sin(sw.t * 2.6) >= 0 ? -1 : 1;
  const ox = sw.eje === 'x' ? 0 : lado * 1.3, oz = sw.eje === 'x' ? lado * 1.3 : 0;
  let x = sw.it.x + ox, z = sw.it.z + oz;
  if (topeEn(x, z, sw.it.y) === Infinity) { x = sw.it.x - ox; z = sw.it.z - oz; }
  jug.pos.set(x, sw.it.y + .4, z); jug.vy = 2; jug.suelo = false;
}
function montarColumpio(dt, entrada) {
  const sw = jug.columpio, L = 2.5, a = sw.amp * Math.sin(sw.t * 2.6);
  if (sw.eje === 'x') { jug.pos.set(sw.it.x, sw.it.y + 3 - L * Math.cos(a), sw.it.z - L * Math.sin(a)); jug.dir = 0; }
  else { jug.pos.set(sw.it.x + L * Math.sin(a), sw.it.y + 3 - L * Math.cos(a), sw.it.z); jug.dir = Math.PI / 2; }
  if (sw.t > 7 || (entrada > .5 && sw.t > 1.2) || jug.saltoPedido) { jug.saltoPedido = false; bajarseDelColumpio(); }
}
// tobogán (y techos): si pisa una rampa de techo, se resbala hacia abajo solita
const bajada = r => [[0, 1], [-1, 0], [0, -1], [1, 0]][((r || 0) % 4 + 4) % 4];   // dirección cuesta abajo de un techo según su giro
function techoBajo(x, z, y0) {
  const cx = Math.round(x), cz = Math.round(z);
  for (let y = Math.floor(y0) + 1; y >= Math.max(0, Math.floor(y0) - 2); y--) {
    const it = enCelda(cx, y, cz);
    if (it && it.t === 'b' && it.k === 'techo') { const [dx, dz] = bajada(it.r); return { it, alto: it.y + .5 - ((x - cx) * dx + (z - cz) * dz), dx, dz }; }
  }
  return null;
}
let chispaT = 0;
function deslizar(dt) {
  const d = jug.desliza;
  d.v = Math.min(d.v + dt * 8, 7.5);
  const nx = jug.pos.x + d.dx * d.v * dt, nz = jug.pos.z + d.dz * d.v * dt;
  if (fuera(nx, nz)) { jug.desliza = null; return; }
  const tb = techoBajo(nx, nz, jug.pos.y);
  if (tb && tb.alto <= jug.pos.y + .35 && tb.alto >= jug.pos.y - 1.2) { jug.pos.set(nx, Math.max(tb.it.y, tb.alto), nz); d.dx = tb.dx; d.dz = tb.dz; }
  else if (topeEn(nx, nz, jug.pos.y) === Infinity) { jug.desliza = null; J.sfx('land', .3); return; }
  else { jug.pos.x = nx; jug.pos.z = nz; jug.empuje = { dx: d.dx, dz: d.dz, v: d.v * .8, t: .6 }; jug.desliza = null; jug.suelo = false; jug.vy = 1; return; }
  jug.dir = Math.atan2(d.dx, d.dz);
  chispaT -= dt; if (chispaT <= 0) { chispaT = .09; fx.burst(tmpB.set(jug.pos.x, jug.pos.y + .2, jug.pos.z), 2, .25); }
}

// lo que hace cada animalito o personaje puesto en el mundo cuando ella juega
const vidas = new WeakMap();
function vidaDe(it) { let s = vidas.get(it); if (!s) { s = { sigue: false, cd: 0, salto: 0, baile: 0, cerca: false, y: it.y }; vidas.set(it, s); } return s; }
function tocarCosa(it) {
  const s = vidaDe(it);
  if (it.t === 'o') {
    s.sigue = !s.sigue; s.salto = .8;
    J.say(s.sigue ? ['¡Ven!', it.w] : ['¡Quédate aquí!']); J.sfx('pop', .6, 1.4);
  } else if (it.t === 'p') {
    s.sigue = !s.sigue;
    if (s.sigue) { s.baile = 3; jug.baile = 3; J.say(['¡Vamos!', nombrePersonaje(it.id)]); J.efecto('festejo'); }
    else { J.say('¡Aquí me quedo!'); J.sfx('pop', .6, 1.1); }
  } else if (it.t === 'f') { J.confetti(40); J.sfx('coin', .5, 1.2); }
  else if (it.t === 's') J.sparkle();
}
function tocarEnJuego(cx, cy) {
  const a = apuntar(cx, cy); if (!a || !a.item) return;
  const it = a.item;
  if (it.t === 'b') interactuarBloque(it, 'alTocar'); else tocarCosa(it);
}
function soltarCosas() {
  // al volver a construir, todos vuelven a su lugar
  for (const [it, v] of vivos) { const s = vidas.get(it); if (s) { s.sigue = false; s.salto = 0; s.y = it.y; } v.group.position.set(it.x, it.y, it.z); v.group.rotation.y = -(it.r || 0) * Math.PI / 2; }
  jug.columpio = null; jug.desliza = null; jug.empuje = null; jug.baile = 0; jug.modoAnim = null;
  anim.frutas.forEach(f => scene.remove(f.m)); anim.frutas.length = 0;
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
// jugar con amigos (js/enlinea.js): cada cambio propio se manda a la sala
let red = null;
function redibujar() { indexar(); dibujarBloques(); dibujarCosas(); guardarActual(); if (red) red.cambio(); }

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
  const lista = ARMADOS[id].hacer(), grupoId = id + '-' + Date.now().toString(36);
  recordar();
  let n = 0;
  for (const p of lista) {
    const it = Array.isArray(p) ? { t: 'b', k: p[0], c: p[1], x: x0 + p[2], y: y0 + p[3], z: z0 + p[4], r: p[5] || 0 } : { ...p, x: x0 + p.x, y: y0 + p.y, z: z0 + p.z };
    it.a = id; it.g = grupoId;   // a qué armado pertenece (tobogán, columpio, árbol…)
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
  const hits = ray.intersectObjects([...mallas, ...grupoPuertas.children, ...grupoAnim.children, ...grupoCosas.children, suelo], true);
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
    if (gesto.d0) { if (state.modo === 'jugar') { jcam.r *= gesto.d0 / Math.max(10, d); jcam.toque = 2; } else { cam.r *= gesto.d0 / Math.max(10, d); pan(mx - gesto.mx, my - gesto.my); aplicarCamara(); } }
    gesto.d0 = d; gesto.mx = mx; gesto.my = my;
    return;
  }
  gesto.mov += Math.abs(dx) + Math.abs(dy);
  if (gesto.mov > 10) {
    if (state.modo === 'jugar') { cam.theta -= dx * .008; jcam.phi -= dy * .006; jcam.toque = 2.5; return; }
    if (gesto.boton === 2 || gesto.shift) pan(dx, dy); else { cam.theta -= dx * .008; cam.phi -= dy * .006; }
    aplicarCamara(); ghost.visible = false;
  }
});
function soltar(e) {
  const p = punteros.get(e.pointerId); punteros.delete(e.pointerId);
  if (!p || !gesto) return;
  if (gesto.tipo === 'toque' && gesto.mov <= 10 && state.modo === 'construir' && gesto.boton === 0) accionEn(e.clientX, e.clientY);
  else if (gesto.tipo === 'toque' && gesto.mov <= 10 && state.modo === 'jugar') tocarEnJuego(e.clientX, e.clientY);
  if (!punteros.size) gesto = null;
}
canvas.addEventListener('pointerup', soltar);
canvas.addEventListener('pointercancel', e => { punteros.delete(e.pointerId); if (!punteros.size) gesto = null; });
canvas.addEventListener('pointerleave', () => { if (!punteros.size) ghost.visible = false; });
canvas.addEventListener('wheel', e => { e.preventDefault(); if (state.modo === 'jugar') { jcam.r *= 1 + Math.sign(e.deltaY) * .1; return; } cam.r *= 1 + Math.sign(e.deltaY) * .1; aplicarCamara(); }, { passive: false });

// ---------- modo jugar ----------
let heroe = null;
// cámara del juego: se puede girar arrastrando, acercar con dos dedos o la rueda, y cambiar de vista con 🎥
const VISTAS = {
  atras: { nombre: '🎥 Detrás', r: 7, phi: 1.12 },
  arriba: { nombre: '🦅 Desde arriba', r: 13, phi: .32 },
  lejos: { nombre: '🔭 De lejos', r: 15, phi: .95 },
  ojos: { nombre: '👀 Con sus ojos', r: 0, phi: 1.5 },
};
const jcam = { vista: 'atras', r: 7, phi: 1.12, toque: 0 };
function cambiarVista(v) {
  const ks = Object.keys(VISTAS);
  jcam.vista = v || ks[(ks.indexOf(jcam.vista) + 1) % ks.length];
  const d = VISTAS[jcam.vista]; jcam.r = d.r; jcam.phi = d.phi;
  if (jcam.vista === 'ojos') cam.theta = jug.dir + Math.PI;
  $('#vista').textContent = d.nombre.split(' ')[0]; message(d.nombre, 1.2); J.sfx('pop');
}
$('#vista').onclick = () => cambiarVista();
const rayoCam = new THREE.Raycaster(), dirCam = new THREE.Vector3(), cabeza = new THREE.Vector3();
function adentro() {
  // ¿hay techo encima? (está dentro de una casa, debajo de un puente…)
  // cuenta techo encima de ella y de sus 4 vecinos: una viga de columpio o un tablón solo no cuentan como casa
  const x = Math.round(jug.pos.x), z = Math.round(jug.pos.z);
  const techo = (cx, cz) => { for (let y = Math.floor(jug.pos.y + 1.4); y < ALTO; y++) { const it = celdas.get(key(cx, y, cz)); if (it && it.t === 'b' && !PIEZAS[it.k].pasa) return true; } return false; };
  if (!techo(x, z)) return false;
  return techo(x + 1, z) + techo(x - 1, z) + techo(x, z + 1) + techo(x, z - 1) >= 3;
}
const jug = { pos: new THREE.Vector3(), vy: 0, dir: 0, suelo: true, joy: new THREE.Vector2(), keys: {}, mov: false, fiesta: 0 };
const RADIO = .28, ALTO_PJ = 1.3, PASO = 1.05;
let choque = null, pasoT = 0, alto = false, tablon = null;
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
      choque = it;
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
  cam.theta = 0; cambiarVista('atras');
  J.say('¡A jugar!');
  if (red) red.modo();
}
function volverAConstruir() {
  state.modo = 'construir'; document.body.classList.remove('juego');
  $('#jugar').textContent = '▶ ¡Jugar!';
  if (heroe) heroe.group.visible = false;
  soltarCosas();
  corte.constant = 999; moverPuertas(1);
  items.forEach(it => { if (vivos.get(it)) vivos.get(it).group.visible = true; });
  cam.target.set(jug.pos.x, 0, jug.pos.z); cam.r = narrow() ? 30 : 24; cam.phi = 1.0; aplicarCamara();
  J.say('¡A construir!');
  if (red) red.modo();
}
$('#jugar').onclick = () => { J.audio(); J.sfx('pop'); state.modo === 'jugar' ? volverAConstruir() : empezarJuego(); };
function saltar() { if (state.modo === 'jugar' && jug.columpio) { jug.saltoPedido = true; return; } if (state.modo !== 'jugar' || !jug.suelo || jug.desliza) return; jug.vy = 7.2; jug.suelo = false; J.efecto('salto'); }
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
  jug.cdColumpio = (jug.cdColumpio || 0) - dt; jug.cdDesliza = (jug.cdDesliza || 0) - dt; jug.baile = (jug.baile || 0) - dt;
  if (jug.columpio) montarColumpio(dt, len);
  else if (jug.desliza) deslizar(dt);
  else {
  if (jug.empuje) {
    // sale volando un poquito al final del tobogán
    const e = jug.empuje, ex = jug.pos.x + e.dx * e.v * dt, ez = jug.pos.z + e.dz * e.v * dt;
    if (topeEn(ex, ez, jug.pos.y) !== Infinity && !fuera(ex, ez)) { jug.pos.x = ex; jug.pos.z = ez; }
    e.v *= 1 - dt * 2; e.t -= dt; if (e.t <= 0 || jug.suelo) jug.empuje = null;
  }
  if (jug.mov) {
    if (len > 1) { mx /= len; mz /= len; }
    const nx = jug.pos.x + mx * V * dt, nz = jug.pos.z + mz * V * dt;
    const y0 = jug.pos.y;
    choque = null;
    const px = topeEn(nx, jug.pos.z, jug.pos.y); if (px !== Infinity && !fuera(nx, jug.pos.z)) { jug.pos.x = nx; if (jug.suelo && px > jug.pos.y) jug.pos.y = px; }
    const pz = topeEn(jug.pos.x, nz, jug.pos.y); if (pz !== Infinity && !fuera(jug.pos.x, nz)) { jug.pos.z = nz; if (jug.suelo && pz > jug.pos.y) jug.pos.y = pz; }
    if (choque) interactuarBloque(choque, 'alChocar');
    // pasitos al subir escalones y rampas
    pasoT -= dt; if (jug.pos.y > y0 + .2 && pasoT <= 0) { pasoT = .18; J.sfx('tick', .3, 1.1 + jug.pos.y * .05); }
    // el columpio: si se acerca al asiento, se sienta
    for (const sw of anim.asientos) if (Math.hypot(sw.it.x - jug.pos.x, sw.it.z - jug.pos.z) < .95 && Math.abs(jug.pos.y - sw.it.y) < 1) sentarse(sw);
    let d = Math.atan2(mx, mz) - jug.dir; d = Math.atan2(Math.sin(d), Math.cos(d));
    jug.dir += d * Math.min(1, dt * 12);
  }
  // gravedad
  const piso = Math.max(0, topeEnPie());
  jug.vy -= 20 * dt; jug.pos.y += jug.vy * dt;
  if (jug.pos.y <= piso) {
    if (!jug.suelo && jug.vy < -6) J.sfx('land', .4);
    if (!jug.suelo && jug.trasTobogan) { jug.trasTobogan = false; if (Math.random() < .5) J.say('¡Otra vez!'); }
    jug.pos.y = piso; jug.vy = 0; jug.suelo = true;
  }
  else if (jug.pos.y > piso + .05) jug.suelo = false;
  // ¿pisó una rampa de techo (tobogán)? se resbala
  if (jug.suelo && jug.cdDesliza <= 0) {
    const tb = enCelda(Math.round(jug.pos.x), Math.round(jug.pos.y) - 1, Math.round(jug.pos.z));
    if (tb && tb.t === 'b' && tb.k === 'techo' && Math.abs(jug.pos.y - (tb.y + 1)) < .05) {
      const [dx, dz] = bajada(tb.r);
      jug.desliza = { dx, dz, v: 1.5 }; jug.cdDesliza = .8; jug.trasTobogan = true; J.say('¡Wiii!'); J.sfx('jump', .4, 1.5);
    }
  }
  // puente: los tablones se mecen al cruzar
  const bajo = jug.suelo ? enCelda(Math.round(jug.pos.x), Math.round(jug.pos.y - .5), Math.round(jug.pos.z)) : null;
  const tab = bajo && bajo.t === 'b' && bajo.k === 'medio' && bajo.y >= 1 && bajo.c === 'madera' && !sueltos.has(bajo) ? bajo : null;
  if (tablon && tablon !== tab) moverInstancia(tablon, 0, 0, 0);
  tablon = tab;
  if (tab) { const k = Math.abs(Math.sin(t * 9)) * -.06 * (jug.mov ? 1 : .3); moverInstancia(tab, 0, k, 0); jug.pos.y += k; if (jug.mov && pasoT <= 0) { pasoT = .3; J.sfx('tick', .2, .6); } }
  // en lo más alto de la torre
  if (jug.suelo && jug.pos.y >= 5.5 && !alto) { alto = true; J.say('¡Qué alto!'); fx.burst(tmpB.set(jug.pos.x, jug.pos.y + 1.5, jug.pos.z), 24, .6); jcam.r = Math.max(jcam.r, 13); }
  if (jug.pos.y < 3) alto = false;
  }
  // techo
  heroe.group.position.copy(jug.pos); heroe.group.rotation.y = jug.dir;
  jug.fiesta -= dt;
  jug.modoAnim = jug.desliza ? 'festejar' : jug.columpio ? 'quieto' : jug.baile > 0 ? 'bailar' : null;
  heroe.update(dt, jug.modoAnim || (jug.fiesta > 0 ? 'festejar' : !jug.suelo ? 'festejar' : jug.mov ? 'correr' : 'quieto'), .9);
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
  // cámara: sigue a la niña; dentro de una casa se "corta" el techo para que se vea dónde está
  const dentro = adentro();
  const corteT = dentro ? Math.floor(jug.pos.y + .01) + 2.02 : 999;
  corte.constant = corteT;
  jcam.toque -= dt;
  jcam.r = Math.max(2.5, Math.min(22, jcam.r)); jcam.phi = Math.max(.2, Math.min(1.5, jcam.phi));
  // en la vista "detrás", la cámara se acomoda sola detrás de ella cuando camina
  if (jcam.vista === 'atras' && jug.mov && jcam.toque <= 0) { let d = jug.dir + Math.PI - cam.theta; d = Math.atan2(Math.sin(d), Math.cos(d)); cam.theta += d * Math.min(1, dt * 1.6); }
  cabeza.set(jug.pos.x, jug.pos.y + 1.05, jug.pos.z);
  if (jcam.vista === 'ojos') {
    heroe.group.visible = false;
    if (jug.mov) cam.theta = jug.dir + Math.PI;
    camera.position.copy(cabeza).add(tmp.set(0, .1, 0));
    camera.lookAt(cabeza.x - Math.sin(cam.theta) * 5, cabeza.y - .3 + (1.1 - jcam.phi) * 3, cabeza.z - Math.cos(cam.theta) * 5);
  } else {
    heroe.group.visible = true;
    // dentro de la casa la cámara mira más desde arriba, como a una casita de muñecas
    const phi = dentro ? Math.min(jcam.phi, .6) : jcam.phi;
    let r = jcam.r;
    dirCam.set(Math.sin(phi) * Math.sin(cam.theta), Math.cos(phi), Math.sin(phi) * Math.cos(cam.theta));
    // si una pared tapa, la cámara se acerca (sin atravesar paredes)
    rayoCam.set(cabeza, dirCam); rayoCam.far = r;
    const choque = rayoCam.intersectObjects(mallas, false).find(h => h.point.y < corteT - .15);
    if (choque) r = Math.max(1.2, choque.distance - .3);
    tmp.copy(cabeza).addScaledVector(dirCam, r);
    camera.position.lerp(tmp, Math.min(1, dt * (choque ? 12 : 5)));
    camera.lookAt(cabeza.x, cabeza.y - .2, cabeza.z);
  }
  moverPuertas(dt);
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
  let nSigue = 0;
  for (const [it, v] of vivos) {
    if (it.t !== 'p' && it.t !== 'o') { v.update(dt, false); continue; }
    const jugando = state.modo === 'jugar', s = vidaDe(it), g = v.group;
    const d = Math.hypot(g.position.x - jug.pos.x, g.position.z - jug.pos.z);
    const cerca = jugando && d < (it.t === 'p' ? 2.5 : 1.8);
    s.cd -= dt; s.salto = Math.max(0, s.salto - dt); s.baile -= dt;
    // al acercarse: los animalitos saltan y dicen su nombre
    if (cerca && !s.cerca && it.t === 'o') { s.salto = .8; if (s.cd <= 0) { s.cd = 8; J.say(it.w); } }
    s.cerca = cerca;
    let corre = false;
    if (jugando && s.sigue) {
      // la sigue un poquito atrás (cada uno en su lugar)
      const k = nSigue++, ang = jug.dir + Math.PI + (k % 2 ? 1 : -1) * (.5 + .3 * Math.floor(k / 2));
      tmpV.set(jug.pos.x + Math.sin(ang) * 1.4, jug.pos.y, jug.pos.z + Math.cos(ang) * 1.4);
      const dx = tmpV.x - g.position.x, dz = tmpV.z - g.position.z, dist = Math.hypot(dx, dz);
      if (dist > .15) { const pasoS = Math.min(dist, 4.6 * dt); g.position.x += dx / dist * pasoS; g.position.z += dz / dist * pasoS; g.rotation.y = Math.atan2(dx, dz); corre = dist > .3; }
      s.y += (jug.pos.y - s.y) * Math.min(1, dt * 6);
    } else if (!jugando) { g.position.set(it.x, it.y, it.z); s.y = it.y; }
    g.position.y = s.y + (s.salto > 0 ? Math.abs(Math.sin(s.salto * Math.PI * 2.5)) * .45 : 0);
    if (it.t === 'p') {
      v.update(dt, s.baile > 0 ? 'bailar' : corre ? 'correr' : cerca ? 'saludar' : 'quieto');
      if (!s.sigue) g.rotation.y = cerca ? Math.atan2(jug.pos.x - g.position.x, jug.pos.z - g.position.z) : -(it.r || 0) * Math.PI / 2;
    } else v.update(dt, cerca || corre || s.salto > 0);
  }
  moverPiezas(dt, t);
  if (state.modo === 'jugar' && heroe) pasoJuego(dt, t);
  else { sun.position.set(cam.target.x + 8, 20, cam.target.z + 10); sun.target.position.copy(cam.target); moverPuertas(dt); }
  if (red) red.frame(dt);
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
  red = iniciarEnLinea({
    scene, jug, state, message, escalar: escalarPersonaje, heroe: () => heroe,
    items: () => items,
    setItems: l => { items = l; },
    // aplicar lo que llega de la sala sin volver a mandarlo
    aplicar: () => { indexar(); dibujarBloques(); dibujarCosas(); guardarActual(); },
  });
  W.start(); J.refreshMusic();
  setTimeout(() => J.say('¡A construir!'), 600);
  if (TEST) window.__w = {
    red: () => red,
    state, get items() { return items; }, poner, ponerArmado, borrar, pintar, girar, deshacer, empezarJuego, volverAConstruir, jug, celdas, key,
    elegir, guardar(nombre) { const m = leerMundos(); m[nombre] = items; escribirMundos(m); }, abrir(nombre) { const m = leerMundos(); items = (m[nombre] || []).map(x => ({ ...x })); vivos.forEach(v => grupoCosas.remove(v.group)); vivos.clear(); redibujar(); },
    limpiar() { items = []; redibujar(); }, listo: () => sincronizando,
    anim, tocar: it => (it.t === 'b' ? interactuarBloque(it, 'alTocar') : tocarCosa(it)), vidaDe, sentarse,
  };
})();
