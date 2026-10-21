// Personajes estilo "avatar de bloques" (diseños originales del juego): cabeza de cubo redondeado
// con carita dibujada (ojos grandes con brillos, pestañas, cejas, sonrisa y cachetes), polerón,
// brazos y piernas de bloque, peinados, gorras y audífonos. Animales de bloques con la misma carita.
// crearPersonaje(id) → { group, update(dt, modo, extra), parts, setPose(nombre), setTutu(bool), setCara(nombre), cara }
//   modos: 'quieto' | 'correr' | 'festejar' | 'bailar' | 'ballet' | 'saludar'
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .5, metalness: 0, ...o });
function mesh(geo, m, x = 0, y = 0, z = 0) { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; return me; }
const tagger = parts => (m, part) => { m.userData.part = part; (parts[part] = parts[part] || []).push(m); return m; };
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
// cubo de esquinas redondeadas (se guarda para no repetir la misma geometría)
const geoCache = new Map();
function rbox(w, h, d, r = .04) {
  const key = [w, h, d, r].join();
  if (geoCache.has(key)) return geoCache.get(key);
  r = Math.min(r, w / 2, h / 2, d / 2);
  const seg = 10, u0 = 2 / seg;
  let g = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
  const p = g.attributes.position, v = new THREE.Vector3(), inn = new THREE.Vector3();
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r, cl = (a, m) => Math.max(-m, Math.min(m, a));
  // reparte los vértices: el primer tramo es la parte plana y el resto va a la curva de la esquina
  const f = (a, half, m) => { const s = Math.sign(a), u = Math.abs(a) / half; return s * (u <= u0 ? u / u0 * m : m + (u - u0) / (1 - u0) * (half - m)); };
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    v.set(f(v.x, w / 2, hx), f(v.y, h / 2, hy), f(v.z, d / 2, hz));
    inn.set(cl(v.x, hx), cl(v.y, hy), cl(v.z, hz));
    v.sub(inn); if (v.lengthSq() > 1e-12) v.setLength(r); v.add(inn);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g); g.computeVertexNormals();
  geoCache.set(key, g);
  return g;
}
const stud = (r = .07, h = .05) => new THREE.CylinderGeometry(r, r, h, 16);
const hex = c => '#' + new THREE.Color(c).getHexString();
const oscuro = (c, k = .55) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString();

// ---------- personajes ----------
// colores de cada parte; "pelo" = peinado; ojos = color de los ojitos
export const FIGURAS = {
  nieve:    { nombre: 'Princesa Nieve', piel: 0xffe3cf, ojos: 0x3f8ee8, pelo: { c: 0xf7f0dc, e: 'trenza', larga: true }, ropa: 'vestido', corona: 'hielo', capa: 0xd6f2ff,
              c: { blusa: 0x8fd3f4, vestido: 0x8fd3f4, mangas: 0xd6f2ff, guantes: 0xd6f2ff, cinturon: 0xffffff, zapatos: 0xcff3ff, pantalon: 0xffe3cf, corona: 0xd8f7ff, collar: 0xffffff } },
  ana:      { nombre: 'Princesa Ana', piel: 0x8d5a3b, ojos: 0x5a3220, pelo: { c: 0x2b1b14, e: 'afro' }, ropa: 'vestido', corona: 'oro', mono: true,
              c: { blusa: 0xffc94a, vestido: 0xffc94a, mangas: 0xfff1b8, guantes: 0xffffff, cinturon: 0xff5fa2, 'moño': 0xff5fa2, zapatos: 0xff5fa2, pantalon: 0x8d5a3b, corona: 0xffd23f, collar: 0xffffff } },
  estrella: { nombre: 'Estrella Pop', piel: 0xf6d2b4, ojos: 0x8a4fd8, pelo: { c: 0x9b6ae8, e: 'larga' }, ropa: 'falda', audifonos: true, microfono: true, logo: 'estrella',
              c: { blusa: 0xff8cc6, falda: 0xffffff, mangas: 0xff8cc6, guantes: 0xf6d2b4, cinturon: 0xffd23f, pantalon: 0xf6d2b4, zapatos: 0xffffff, audifonos: 0xffffff, logo: 0xffffff, collar: 0xffd23f } },
  zoe:      { nombre: 'Zoe', piel: 0xf3cfae, ojos: 0x2b1d1d, pelo: { c: 0x1d1d2b, e: 'mono' }, ropa: 'pantalon', gorra: true, logo: 'rayo',
              c: { blusa: 0x2b2b3d, mangas: 0x2b2b3d, guantes: 0xf3cfae, cinturon: 0x2b2b3d, pantalon: 0xc9b6ff, zapatos: 0xffffff, gorra: 0x2b2b3d, logo: 0x7fe3ff } },
  mira:     { nombre: 'Mira', piel: 0xf0c8a6, ojos: 0x7a3b1f, pelo: { c: 0xff5d8f, e: 'coletas' }, ropa: 'falda', gorra: true, logo: 'corazon',
              c: { blusa: 0x2b2b3d, falda: 0xff8cc6, mangas: 0x2b2b3d, guantes: 0xf0c8a6, cinturon: 0xff5d8f, pantalon: 0xf0c8a6, zapatos: 0xff5d8f, gorra: 0x2b2b3d, logo: 0xff8cc6 } },
  amara:    { nombre: 'Amara', piel: 0xf7d6bf, ojos: 0x6b3a1f, pelo: { c: 0x6b3b22, e: 'larga' }, ropa: 'pantalon', gorra: true, audifonos: true, logo: 'corazon',
              c: { blusa: 0xff9bd0, mangas: 0xff9bd0, guantes: 0xf7d6bf, cinturon: 0xff9bd0, pantalon: 0xc9a2ff, zapatos: 0xffffff, gorra: 0xffffff, audifonos: 0xffffff, logo: 0xff5fa2 } },
  mama:     { nombre: 'Mamá', piel: 0xf0c8a6, ojos: 0x5a3220, pelo: { c: 0x4a2a1a, e: 'ondas' }, ropa: 'falda', aretes: true, logo: 'flor',
              c: { blusa: 0xb98cff, falda: 0xff8cc6, mangas: 0xb98cff, guantes: 0xf0c8a6, cinturon: 0xffd23f, pantalon: 0xf0c8a6, zapatos: 0xff5d8f, logo: 0xffffff } },
  papa:     { nombre: 'Papá', piel: 0xe6b994, ojos: 0x4a2a1a, pelo: { c: 0x2b1d14, e: 'corto' }, ropa: 'pantalon', barba: true, logo: 'rayo', chico: true,
              c: { blusa: 0x2b2b3d, mangas: 0x2b2b3d, guantes: 0xe6b994, cinturon: 0x3a4a6b, pantalon: 0x3f6fd8, zapatos: 0xffffff, logo: 0x3f8ee8 } },
  raton:    { nombre: 'Ratoncito Pipo', piel: 0xb7bec8, ojos: 0x1d2233, cabeza: 'raton', ropa: 'pantalon', chico: true,
              c: { blusa: 0xef5b5b, mangas: 0xb7bec8, guantes: 0xffffff, pantalon: 0x3f8ee8, zapatos: 0xffd23f, orejas: 0xffb6c8, cinturon: 0x3f8ee8, nariz: 0xff7eb6 } },
  rojito:   { nombre: 'Monstruito Rojo', piel: 0xe8303c, ojos: 0x2b8a3e, cabeza: 'monstruo', ropa: 'pantalon', peludo: true, chico: true,
              c: { blusa: 0xe8303c, mangas: 0xe8303c, guantes: 0xe8303c, pantalon: 0xe8303c, zapatos: 0xff9a2b, nariz: 0xff9a2b, cinturon: 0xe8303c } },
};
const ANIMALES = {
  llama: { nombre: 'Llamita Lula', ojos: 0x3b2a20, c: { pelaje: 0xf6efe2, panza: 0xffffff, orejas: 0xf6efe2, nariz: 0xe8d9c3, manta: 0xff5d8f, pompones: 0xb98cff }, tipo: 'llama' },
  zorro: { nombre: 'Zorrito', ojos: 0x3b2a20, c: { pelaje: 0xf08a3c, panza: 0xffffff, orejas: 0xf08a3c, nariz: 0xffffff, cola: 0xffffff }, tipo: 'zorro' },
  lobo:  { nombre: 'Lobito', ojos: 0x3f8ee8, c: { pelaje: 0x8c95a3, panza: 0xe4e8ee, orejas: 0x6c7480, nariz: 0xe4e8ee, cola: 0x8c95a3 }, tipo: 'lobo' },
  toro:  { nombre: 'Torito', ojos: 0x3b2a20, c: { pelaje: 0x8a5a3c, panza: 0xd8b48f, orejas: 0x8a5a3c, nariz: 0xf3b6a4, cuernos: 0xfff4dc, cola: 0x5a3a24 }, tipo: 'toro' },
};
export const PERSONAJES = ['nieve', 'ana', 'estrella', 'zoe', 'mira', 'amara', 'mama', 'papa', 'llama', 'rojito', 'raton', 'zorro', 'lobo', 'toro'];
export const PINTABLES = PERSONAJES;

// ---------- poses de ballet ----------
// brazo: [adelante, lado] en radianes; pierna: [adelante, lado]; y: subir/bajar el cuerpo
const P = (armL, armR, legL, legR, y = 0, extra = {}) => ({ armL, armR, legL, legR, y, ...extra });
export const POSES = {
  primera:   { nombre: 'Primera posición',  estrellas: 0,  ...P([-.45, .15], [-.45, .15], [0, .06], [0, .06]) },
  segunda:   { nombre: 'Segunda posición',  estrellas: 0,  ...P([0, 1.35], [0, 1.35], [0, .28], [0, .28]) },
  tercera:   { nombre: 'Tercera posición',  estrellas: 5,  ...P([-1, .35], [0, 1.35], [0, .05], [0, .05]) },
  cuarta:    { nombre: 'Cuarta posición',   estrellas: 10, ...P([-1, .35], [0, 2.75], [-.25, 0], [.2, 0]) },
  quinta:    { nombre: 'Quinta posición',   estrellas: 15, ...P([-.2, 2.6], [-.2, 2.6], [0, 0], [0, 0]) },
  demiplie:  { nombre: 'Demi plié',         estrellas: 20, ...P([0, 1.15], [0, 1.15], [-.2, .35], [-.2, .35], -.1) },
  tendu:     { nombre: 'Battement tendu',   estrellas: 25, ...P([0, 1.3], [0, 1.3], [0, .05], [0, .55]) },
  releve:    { nombre: 'Relevé',            estrellas: 30, ...P([-.2, 2.6], [-.2, 2.6], [0, 0], [0, 0], .12) },
  pirueta:   { nombre: 'Pirueta',           estrellas: 40, ...P([-1.2, .35], [-1.2, .35], [0, 0], [-1.3, .2], .1, { spin: true }) },
  saute:     { nombre: 'Sauté (saltito)',   estrellas: 50, ...P([-.45, .2], [-.45, .2], [0, .2], [0, .2], 0, { salto: true }) },
  arabesca:  { nombre: 'Arabesca',          estrellas: 60, ...P([-1.7, .2], [0, 1.4], [0, 0], [1.1, 0], .05) },
  grandplie: { nombre: 'Grand plié',        estrellas: 70, ...P([0, 1.35], [0, 1.35], [-.35, .7], [-.35, .7], -.22) },
};

// ---------- caritas: feliz, triste, llora, enojada, sorpresa ----------
export const CARAS = {
  feliz:    { nombre: 'Feliz', emoji: '😊' },
  triste:   { nombre: 'Triste', emoji: '😢' },
  llora:    { nombre: 'Llora', emoji: '😭' },
  enojada:  { nombre: 'Enojada', emoji: '😠' },
  sorpresa: { nombre: 'Sorpresa', emoji: '😮' },
};
// La carita se dibuja en un lienzo (fondo transparente) que va pegado al frente de la cabeza.
// Se dibujan una vez todas las variantes y luego solo se cambia la textura.
const FW = 256, FH = 224;
const VARIANTES = ['feliz', 'feliz_b', 'guino', 'triste', 'triste_b', 'llora', 'llora2', 'enojada', 'enojada_b', 'sorpresa', 'sorpresa_b'];
function dibujarCara(g, v, o) {
  g.clearRect(0, 0, FW, FH);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const [expr, extra] = v.split('_');
  const e = expr === 'guino' ? 'feliz' : expr === 'llora2' ? 'llora' : expr;
  const blink = extra === 'b';
  const ink = '#2a1a2e', ex = [82, 174], ey = o.animal ? 92 : 98, rx = o.animal ? 27 : 33, ry = o.animal ? 31 : 40;
  // cachetes
  const blush = (x, y, a = .55) => { const gr = g.createRadialGradient(x, y, 2, x, y, 30); gr.addColorStop(0, `rgba(255,105,150,${a})`); gr.addColorStop(1, 'rgba(255,105,150,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 30, 18, 0, 0, Math.PI * 2); g.fill(); };
  if (o.hocico) { // hocico pintado de los animales y del ratón
    g.fillStyle = o.hocico; g.beginPath(); g.ellipse(128, 172, 62, 42, 0, 0, Math.PI * 2); g.fill();
  }
  blush(46, 158, e === 'enojada' ? .8 : .55); blush(210, 158, e === 'enojada' ? .8 : .55);
  // ojos
  const ojo = (x, sx, forma) => {
    if (forma === 'cerrado') { // feliz con ojitos cerrados: ^
      g.strokeStyle = ink; g.lineWidth = 8; g.beginPath(); g.moveTo(x - rx * .9, ey + 6); g.quadraticCurveTo(x, ey - ry * .9, x + rx * .9, ey + 6); g.stroke();
      if (o.pestanas) { g.lineWidth = 5; g.beginPath(); g.moveTo(x + sx * rx * .8, ey); g.lineTo(x + sx * (rx + 8), ey - 8); g.stroke(); }
      return;
    }
    if (forma === 'parpado') { // parpadeo: ∪
      g.strokeStyle = ink; g.lineWidth = 7; g.beginPath(); g.moveTo(x - rx, ey); g.quadraticCurveTo(x, ey + ry * .55, x + rx, ey); g.stroke();
      if (o.pestanas) { g.lineWidth = 4; [-.5, 0, .5].forEach(k => { g.beginPath(); g.moveTo(x + k * rx, ey + ry * .27); g.lineTo(x + k * rx * 1.2, ey + ry * .27 + 9); g.stroke(); }); }
      return;
    }
    const big = forma === 'grande', ky = big ? 1.12 : 1, kx = big ? 1.05 : 1;
    g.save();
    if (forma === 'enojado') { // párpado de arriba en diagonal
      g.beginPath(); g.moveTo(x - rx * 1.4, ey - ry * (sx < 0 ? .55 : .05)); g.lineTo(x + rx * 1.4, ey - ry * (sx < 0 ? .05 : .55)); g.lineTo(x + rx * 1.4, ey + ry * 2); g.lineTo(x - rx * 1.4, ey + ry * 2); g.closePath(); g.clip();
    }
    // blanco del ojo
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x, ey, rx * kx, ry * ky, 0, 0, Math.PI * 2); g.fill();
    // iris con degradado
    const ir = rx * (big ? .62 : .8), iry = ry * (big ? .66 : .82);
    const gr = g.createLinearGradient(x, ey - iry, x, ey + iry); gr.addColorStop(0, oscuro(o.ojos, .45)); gr.addColorStop(.6, hex(o.ojos)); gr.addColorStop(1, '#' + new THREE.Color(o.ojos).lerp(new THREE.Color(0xffffff), .45).getHexString());
    g.fillStyle = gr; g.beginPath(); g.ellipse(x + sx * 2, ey + 4, ir, iry, 0, 0, Math.PI * 2); g.fill();
    // pupila
    g.fillStyle = '#140a14'; g.beginPath(); g.ellipse(x + sx * 2, ey + 6, ir * .5, iry * .5, 0, 0, Math.PI * 2); g.fill();
    // brillitos
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x - ir * .38, ey - iry * .32, ir * .36, iry * .3, -.4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(x + ir * .36, ey + iry * .38, ir * .16, 0, Math.PI * 2); g.fill();
    if (e === 'triste' || e === 'llora') { g.globalAlpha = .9; g.beginPath(); g.ellipse(x, ey + iry * .75, ir * .8, iry * .22, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(170,225,255,.85)'; g.fill(); g.globalAlpha = 1; }
    // borde
    g.strokeStyle = ink; g.lineWidth = 4; g.beginPath(); g.ellipse(x, ey, rx * kx, ry * ky, 0, 0, Math.PI * 2); g.stroke();
    g.restore();
    // línea de arriba y pestañas
    g.strokeStyle = ink;
    if (forma === 'enojado') { g.lineWidth = 8; g.beginPath(); g.moveTo(x - rx * 1.05, ey - ry * (sx < 0 ? .5 : .1)); g.lineTo(x + rx * 1.05, ey - ry * (sx < 0 ? .1 : .5)); g.stroke(); }
    else {
      g.lineWidth = 7; g.beginPath(); g.ellipse(x, ey, rx * kx, ry * ky, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
      if (o.pestanas) { g.lineWidth = 5; const a0 = sx > 0 ? -.35 : Math.PI + .35; [0, .28].forEach(k => { const a = a0 + (sx > 0 ? -k : k); const px = x + Math.cos(a) * rx * kx, py = ey + Math.sin(a) * ry * ky; g.beginPath(); g.moveTo(px, py); g.lineTo(px + sx * 11, py - 9); g.stroke(); }); }
    }
  };
  const formaDe = sx => {
    if (blink) return 'parpado';
    if (expr === 'guino' && sx < 0) return 'cerrado';
    if (e === 'llora') return 'cerrado';
    if (e === 'enojada') return 'enojado';
    if (e === 'sorpresa') return 'grande';
    return 'normal';
  };
  ojo(ex[0], -1, formaDe(-1)); ojo(ex[1], 1, formaDe(1));
  // cejas
  g.strokeStyle = o.cejas; g.lineWidth = 9;
  const ceja = (x, sx) => {
    const top = ey - ry - 16;
    let a = 0, dy = 0;
    if (e === 'enojada') { a = .42; dy = 6; }
    if (e === 'triste' || e === 'llora') { a = -.38; }
    if (e === 'sorpresa') dy = -12;
    if (e === 'feliz' && !o.cejasSiempre) dy = -2;
    const L = 24, inner = x - sx * L, outer = x + sx * L;
    g.beginPath();
    g.moveTo(inner, top + dy + a * L); g.quadraticCurveTo(x, top + dy - 6, outer, top + dy - a * L * .4 + 2); g.stroke();
  };
  ceja(ex[0], -1); ceja(ex[1], 1);
  // nariz (animales y ratón)
  if (o.nariz) { g.fillStyle = o.nariz; g.beginPath(); g.ellipse(128, 150, 15, 10, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(123, 146, 5, 3, 0, 0, Math.PI * 2); g.fill(); }
  if (o.bigotes) { g.strokeStyle = ink; g.lineWidth = 3; [-1, 1].forEach(sx => [-6, 4].forEach(dy => { g.beginPath(); g.moveTo(128 + sx * 30, 162 + dy); g.lineTo(128 + sx * 70, 156 + dy * 2.2); g.stroke(); })); }
  // barba de papá (sombrita)
  if (o.barba) { const gb = g.createRadialGradient(128, 222, 10, 128, 222, 95); gb.addColorStop(0, 'rgba(60,40,30,.28)'); gb.addColorStop(1, 'rgba(60,40,30,0)'); g.fillStyle = gb; g.fillRect(20, 150, 216, 74); }
  // boca
  const my = o.animal ? 178 : 160;
  g.strokeStyle = ink; g.lineWidth = 4;
  const bocaAbierta = (w, h, top = 0) => {
    const path = () => { g.beginPath(); g.moveTo(128 - w, my + top - 4); g.quadraticCurveTo(128, my + top + 8, 128 + w, my + top - 4); g.quadraticCurveTo(128 + w * .92, my + h, 128, my + h + 2); g.quadraticCurveTo(128 - w * .92, my + h, 128 - w, my + top - 4); g.closePath(); };
    path(); g.fillStyle = '#7a1f35'; g.fill();
    g.save(); path(); g.clip();
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(128, my + top - 2, w * .95, h * .26, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ff6f91'; g.beginPath(); g.ellipse(128, my + h + 2, w * .6, h * .42, 0, 0, Math.PI * 2); g.fill();
    g.restore(); g.lineWidth = 4; g.strokeStyle = ink; path(); g.stroke();
  };
  if (e === 'feliz') bocaAbierta(o.animal ? 26 : 34, o.animal ? 26 : 34, -4);
  if (e === 'sorpresa') { g.beginPath(); g.ellipse(128, my + 14, 16, 20, 0, 0, Math.PI * 2); g.fillStyle = '#7a1f35'; g.fill(); g.stroke(); g.fillStyle = '#ff6f91'; g.beginPath(); g.ellipse(128, my + 26, 9, 6, 0, 0, Math.PI * 2); g.fill(); }
  if (e === 'triste') { g.lineWidth = 7; g.beginPath(); g.moveTo(104, my + 22); g.quadraticCurveTo(128, my + 4, 152, my + 22); g.stroke(); }
  if (e === 'llora') bocaAbierta(30, 38, 2);
  if (e === 'enojada') {
    g.beginPath(); g.roundRect(100, my + 8, 56, 22, 8); g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 4; g.stroke();
    g.lineWidth = 2.5; g.beginPath(); g.moveTo(100, my + 19); g.lineTo(156, my + 19); [114, 128, 142].forEach(x => { g.moveTo(x, my + 8); g.lineTo(x, my + 30); }); g.stroke();
  }
  // lágrimas
  if (e === 'llora' || (e === 'triste' && !blink)) {
    const fase = expr === 'llora2' ? 1 : 0;
    g.fillStyle = 'rgba(120,205,255,.92)'; g.strokeStyle = 'rgba(60,150,230,.9)'; g.lineWidth = 2;
    const gota = (x, y, r) => { g.beginPath(); g.moveTo(x, y - r * 1.8); g.quadraticCurveTo(x + r * 1.1, y, x, y + r); g.quadraticCurveTo(x - r * 1.1, y, x, y - r * 1.8); g.fill(); g.stroke(); };
    if (e === 'llora') {
      ex.forEach((x, i) => {
        const sx = i ? 1 : -1;
        g.fillStyle = 'rgba(120,205,255,.75)'; g.beginPath(); g.roundRect(x + sx * 8 - 6, ey + 6, 12, 110, 6); g.fill();
        g.fillStyle = 'rgba(120,205,255,.95)'; gota(x + sx * 14, ey + 40 + fase * 34, 9); gota(x + sx * 4, ey + 82 - fase * 24, 7);
      });
    } else gota(ex[1] + 10, ey + ry + 14, 8);
  }
}
// texturas de la carita: cada variante se dibuja la primera vez que se usa (ahorra memoria en tablets)
function texturasCara(o) {
  const cache = {};
  return new Proxy(cache, {
    get(_, v) {
      if (typeof v !== 'string' || !VARIANTES.includes(v)) return cache[v];
      if (!cache[v]) {
        const c = document.createElement('canvas'); c.width = FW; c.height = FH;
        dibujarCara(c.getContext('2d'), v, o);
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
        cache[v] = t;
      }
      return cache[v];
    },
    ownKeys: () => Reflect.ownKeys(cache), getOwnPropertyDescriptor: (_, k) => Reflect.getOwnPropertyDescriptor(cache, k),
  });
}
// pone la carita en la cabeza y devuelve el control de expresiones
function ponerCara(head, { w, h, z, y = 0, o }) {
  let tex = texturasCara(o);
  const m = new THREE.MeshStandardMaterial({ map: tex.feliz, transparent: true, roughness: .4, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  plane.position.set(0, y, z + .002); plane.renderOrder = 2; head.add(plane);
  let cur = 'feliz', t = 0, guinoT = 0;
  return {
    set(name) { cur = CARAS[name] ? name : 'feliz'; },
    get actual() { return cur; },
    // vuelve a dibujar (cuando se pinta el hocico o la nariz)
    redibujar(cambios) { Object.assign(o, cambios); const old = tex; tex = texturasCara(o); Object.keys(old).forEach(k => old[k].dispose()); m.map = tex.feliz; },
    update(dt, closed, mode) {
      t += dt;
      let v = cur;
      if (cur === 'llora') v = Math.floor(t * 4) % 2 ? 'llora2' : 'llora';
      else if (closed) v = cur + '_b';
      if (cur === 'feliz' && mode === 'festejar') { guinoT -= dt; if (guinoT < -1.2) guinoT = 1.6 + Math.random(); if (guinoT < 0) v = 'guino'; }
      if (m.map !== tex[v]) m.map = tex[v];
      if (cur === 'enojada') head.rotation.z = Math.sin(t * 18) * .03;
      else if (cur === 'llora') head.rotation.z = Math.sin(t * 9) * .04;
    },
  };
}

// ---------- logo del polerón (dibujitos originales) ----------
function logoMesh(forma, color) {
  const s = new THREE.Shape();
  if (forma === 'corazon') { s.moveTo(0, -.06); s.bezierCurveTo(-.09, .0, -.06, .07, 0, .035); s.bezierCurveTo(.06, .07, .09, .0, 0, -.06); }
  else if (forma === 'rayo') { s.moveTo(.02, .07); s.lineTo(-.04, -.005); s.lineTo(.0, -.005); s.lineTo(-.02, -.07); s.lineTo(.045, .01); s.lineTo(.005, .01); s.lineTo(.02, .07); }
  else if (forma === 'flor') { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; s.absarc(Math.cos(a) * .03, Math.sin(a) * .03, .025, 0, Math.PI * 2, false); } }
  else { for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i / 10 * Math.PI * 2, r = i % 2 ? .028 : .065; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } }
  return mesh(new THREE.ExtrudeGeometry(s, { depth: .012, bevelEnabled: false }), mat(color, { roughness: .35 }));
}

// ---------- figura humana de bloques ----------
const HW = .52, HH = .48, HD = .46; // cabeza grande y tierna
function figura(id) {
  const cfg = FIGURAS[id];
  const C = cfg.c;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const parts = {}, tag = tagger(parts);
  const piel = () => mat(cfg.piel, cfg.peludo ? { roughness: .95 } : { roughness: .55 });
  const ancho = cfg.chico ? 1.06 : 1;
  // piernas (giran en la cadera)
  const legs = [-1, 1].map(sx => {
    const hip = new THREE.Group(); hip.position.set(sx * .115 * ancho, .6, 0); body.add(hip);
    hip.add(tag(mesh(rbox(.2, .5, .22, .06), mat(C.pantalon || 0x3f8ee8), 0, -.26, 0), 'pantalon'));
    const shoe = tag(mesh(rbox(.22, .13, .3, .05), mat(C.zapatos)), 'zapatos'); shoe.position.set(0, -.53, .035); hip.add(shoe);
    hip.add(mesh(rbox(.23, .035, .31, .015), mat(0xffffff), 0, -.585, .035));
    return hip;
  });
  body.add(tag(mesh(rbox(.46 * ancho, .1, .26, .04), mat(C.cinturon || C.pantalon), 0, .64, 0), 'cinturon'));
  // vestido, falda y tutú
  let vestido = null, falda = null, tutu = null;
  if (cfg.ropa === 'vestido') {
    const pts = [[0, 0], [.42, 0], [.43, .04], [.36, .22], [.27, .5], [.24, .62], [0, .62]].map(([x, y]) => new THREE.Vector2(x, y));
    vestido = tag(mesh(new THREE.LatheGeometry(pts, 32), mat(C.vestido)), 'vestido'); vestido.scale.z = .72; vestido.position.y = .28; body.add(vestido);
  } else if (cfg.ropa === 'falda') {
    falda = tag(mesh(new THREE.CylinderGeometry(.25, .38, .24, 28, 1, true), mat(C.falda, { side: THREE.DoubleSide })), 'falda'); falda.position.y = .54; falda.scale.z = .75; body.add(falda);
    // vuelos de la falda
    const vuelo = tag(mesh(new THREE.TorusGeometry(.37, .025, 6, 28), mat(C.falda)), 'falda'); vuelo.rotation.x = Math.PI / 2; vuelo.scale.y = .75; vuelo.position.y = .42; body.add(vuelo);
  }
  tutu = new THREE.Group(); tutu.visible = false; body.add(tutu);
  for (let k = 0; k < 3; k++) tutu.add(tag(mesh(new THREE.CylinderGeometry(.25, .52 - k * .06, .06, 28, 1, true), mat(C.vestido || C.falda || C.blusa, { side: THREE.DoubleSide, transparent: true, opacity: .85 }), 0, .62 - k * .045, 0), cfg.ropa === 'vestido' ? 'vestido' : cfg.ropa === 'falda' ? 'falda' : 'blusa'));
  // torso: polerón de bloque con bolsillo y cordones
  const torso = tag(mesh(rbox(.5 * ancho, .52, .28, .07), mat(C.blusa)), 'blusa'); torso.position.y = .94; body.add(torso);
  if (cfg.ropa !== 'vestido') {
    body.add(tag(mesh(rbox(.3, .12, .03, .02), mat(C.blusa), 0, .8, .145), 'blusa'));
    [-1, 1].forEach(sx => { const cord = mesh(new THREE.CylinderGeometry(.008, .008, .13, 6), mat(0xffffff), sx * .05, 1.08, .148); body.add(cord); body.add(mesh(new THREE.SphereGeometry(.014, 8, 6), mat(0xffffff), sx * .05, 1.01, .15)); });
    // capucha atrás
    const cap = tag(mesh(rbox(.36, .16, .12, .05), mat(C.blusa)), 'blusa'); cap.position.set(0, 1.16, -.13); body.add(cap);
  } else if (C.collar) {
    const col = tag(mesh(new THREE.TorusGeometry(.1, .02, 6, 18, Math.PI), mat(C.collar, { metalness: .4, roughness: .3 }), 0, 1.13, .14), 'collar'); col.rotation.z = Math.PI; body.add(col);
  }
  if (cfg.logo) { const lg = tag(logoMesh(cfg.logo, C.logo || 0xffffff), 'logo'); lg.position.set(0, .98, .14); lg.scale.setScalar(1.2); body.add(lg); }
  if (cfg.mono) body.add(tag(mesh(new THREE.TorusKnotGeometry(.045, .018, 30, 6), mat(C['moño']), 0, 1.1, .15), 'moño'));
  let capa = null;
  if (cfg.capa) { capa = tag(mesh(new THREE.PlaneGeometry(.58, 1.0), mat(cfg.capa, { transparent: true, opacity: .75, side: THREE.DoubleSide, emissive: 0x9fdcff, emissiveIntensity: .2 }), 0, .64, -.17), 'capa'); capa.geometry.translate(0, -.0, 0); capa.rotation.x = .12; body.add(capa); }
  // brazos de bloque con manitos redondas
  const arms = [-1, 1].map(sx => {
    const sh = new THREE.Group(); sh.position.set(sx * .34 * ancho, 1.13, 0); body.add(sh);
    const arm = tag(mesh(rbox(.17, .44, .19, .065), mat(C.mangas || C.blusa)), 'mangas'); arm.position.y = -.19; sh.add(arm);
    const cuff = tag(mesh(rbox(.175, .05, .195, .02), mat(C.mangas || C.blusa)), 'mangas'); cuff.position.y = -.4; sh.add(cuff);
    const guante = C.guantes && C.guantes !== cfg.piel;
    const hand = tag(mesh(rbox(.15, .13, .16, .06), guante ? mat(C.guantes) : piel()), guante ? 'guantes' : 'piel'); hand.position.y = -.48; sh.add(hand);
    sh.rotation.z = sx * .08;
    return sh;
  });
  if (cfg.microfono) {
    const mic = new THREE.Group(); mic.position.set(0, -.5, .07);
    mic.add(mesh(new THREE.CylinderGeometry(.022, .018, .16, 10), mat(0x2b2b38)));
    mic.add(mesh(new THREE.SphereGeometry(.045, 12, 8), mat(0xc9ccd6, { metalness: .6, roughness: .3 }), 0, .1, 0));
    mic.rotation.x = -.5; arms[1].add(mic);
  }
  // cuello y cabeza
  body.add(mesh(new THREE.CylinderGeometry(.09, .1, .08, 14), piel(), 0, 1.22, 0));
  const head = new THREE.Group(); head.position.y = 1.5; body.add(head);
  let cara;
  const cejas = cfg.pelo ? oscuro(cfg.pelo.c, cfg.pelo.c === 0xf7f0dc ? .6 : .7) : oscuro(cfg.piel, .45);
  if (cfg.cabeza === 'raton') {
    head.add(tag(mesh(rbox(HW, HH, HD, .12), piel()), 'piel'));
    [-1, 1].forEach(sx => {
      const ear = tag(mesh(new THREE.CylinderGeometry(.15, .15, .05, 24), piel(), sx * .25, .24, -.03), 'piel'); ear.rotation.x = Math.PI / 2; head.add(ear);
      const inn = tag(mesh(new THREE.CylinderGeometry(.1, .1, .02, 20), mat(C.orejas), sx * .25, .24, .0), 'orejas'); inn.rotation.x = Math.PI / 2; head.add(inn);
    });
    cara = ponerCara(head, { w: HW - .1, h: HH - .08, z: HD / 2, o: { ojos: cfg.ojos, cejas, pestanas: false, hocico: '#ece5dc', nariz: hex(C.nariz), bigotes: true, animal: true } });
  } else if (cfg.cabeza === 'monstruo') {
    head.add(tag(mesh(rbox(HW + .04, HH + .02, HD, .1), piel()), 'piel'));
    for (let i = 0; i < 7; i++) { const tuft = tag(mesh(new THREE.ConeGeometry(.05, .14, 6), piel(), -.18 + i * .06, .25, Math.sin(i * 2) * .05), 'piel'); tuft.rotation.z = (i - 3) * -.12; head.add(tuft); }
    [-1, 1].forEach(sx => { const h = mesh(new THREE.ConeGeometry(.045, .16, 8), mat(0xfff4dc), sx * .2, .26, 0); h.rotation.z = -sx * .4; head.add(h); });
    head.add(tag(mesh(new THREE.SphereGeometry(.055, 14, 10), mat(C.nariz), 0, -.03, HD / 2 + .03), 'nariz'));
    cara = ponerCara(head, { w: HW - .06, h: HH - .06, z: HD / 2, o: { ojos: cfg.ojos, cejas: '#7a0d15', pestanas: false } });
  } else {
    head.add(tag(mesh(rbox(HW, HH, HD, .11), piel()), 'piel'));
    // orejitas
    [-1, 1].forEach(sx => head.add(tag(mesh(rbox(.05, .1, .08, .025), piel(), sx * (HW / 2 + .01), -.01, 0), 'piel')));
    cara = ponerCara(head, { w: HW - .1, h: HH - .08, z: HD / 2, o: { ojos: cfg.ojos, cejas, pestanas: !cfg.chico, barba: cfg.barba } });
    pelo(head, cfg, tag);
  }
  // gorra, audífonos, aretes y coronas
  const top = HH / 2;
  if (cfg.gorra) {
    const gc = mat(C.gorra);
    const dome = tag(mesh(new THREE.SphereGeometry(.34, 28, 14, 0, Math.PI * 2, 0, Math.PI * .5), gc, 0, top - .04, -.01), 'gorra'); dome.scale.set(1, .58, .92); head.add(dome);
    head.add(tag(mesh(rbox(.6, .06, HD + .08, .03), gc, 0, top - .02, -.01), 'gorra'));
    const visor = tag(mesh(rbox(.42, .035, .24, .015), gc), 'gorra'); visor.position.set(0, top - .01, HD / 2 + .08); visor.rotation.x = -.08; head.add(visor);
    const parche = tag(mesh(rbox(.13, .1, .02, .02), mat(C.logo || 0xff8cc6)), 'logo'); parche.position.set(0, top + .045, HD / 2 + .015); parche.rotation.x = -.42; head.add(parche);
  }
  if (cfg.audifonos) {
    const am = mat(C.audifonos, { roughness: .3 });
    const R = HW / 2 + .07;
    const band = tag(mesh(new THREE.TorusGeometry(R, .028, 8, 32, Math.PI), am), 'audifonos'); band.position.y = .02; head.add(band);
    [-1, 1].forEach(sx => {
      const cup = tag(mesh(new THREE.CylinderGeometry(.095, .095, .08, 22), am, sx * R, -.01, 0), 'audifonos'); cup.rotation.z = Math.PI / 2; head.add(cup);
      const pad = mesh(new THREE.CylinderGeometry(.065, .065, .085, 18), mat(0xff8cc6), sx * (R + .005), -.01, 0); pad.rotation.z = Math.PI / 2; head.add(pad);
    });
  }
  if (cfg.aretes) [-1, 1].forEach(sx => head.add(mesh(new THREE.SphereGeometry(.025, 10, 8), mat(0xffd23f, { metalness: .5, roughness: .3 }), sx * (HW / 2 + .03), -.08, .02)));
  if (cfg.corona === 'hielo') [[-.09, .14], [0, .2], [.09, .14]].forEach(([x, h]) => head.add(tag(mesh(new THREE.ConeGeometry(.038, h, 6), mat(C.corona, { emissive: 0x9fe6ff, emissiveIntensity: .6, transparent: true, opacity: .9 }), x, top + .06 + h / 2, .1), 'corona')));
  if (cfg.corona === 'oro') { head.add(tag(mesh(new THREE.CylinderGeometry(.14, .15, .07, 18, 1, true), mat(C.corona, { metalness: .5, roughness: .3, side: THREE.DoubleSide }), 0, top + .2, 0), 'corona')); [-2, -1, 0, 1, 2].forEach(i => head.add(tag(mesh(new THREE.ConeGeometry(.025, .08, 6), mat(C.corona, { metalness: .5 }), Math.sin(i * .6) * .14, top + .27, Math.cos(i * .6) * .14), 'corona'))); }
  return animar({ root, body, head, arms, legs, cara, parts, vestido, falda, tutu, capa, braids: head.userData.braids || [] });
}
function pelo(head, cfg, tag) {
  const H = () => mat(cfg.pelo.c, { roughness: .5 });
  const e = cfg.pelo.e, top = HH / 2;
  const add = (geo, x, y, z) => { const m = tag(mesh(geo, H(), x, y, z), 'pelo'); head.add(m); return m; };
  // casquete de pelo (arriba, atrás y a los lados), con flequillo
  if (!cfg.gorra) add(rbox(HW + .06, .17, HD + .06, .08), 0, top + .02, -.0);
  add(rbox(HW + .05, HH * .85, .1, .05), 0, .02, -HD / 2 - .02);
  [-1, 1].forEach(sx => add(rbox(.06, HH * .7, HD * .8, .03), sx * (HW / 2 + .015), .05, -.04));
  if (e !== 'corto') {
    // flequillo de mechones
    [[-.16, .13, .3], [-.02, .17, .1], [.15, .14, -.35]].forEach(([x, w, a]) => { const b = add(rbox(w, .11, .07, .045), x, top - .045, HD / 2 + .005); b.rotation.z = a; });
  } else add(rbox(HW + .03, .07, .08, .03), 0, top - .02, HD / 2 - .02);
  const braids = [];
  const chain = (x, y, z, n, r0, ang = 0) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.z = ang; head.add(g); braids.push(g);
    let node = g;
    for (let i = 0; i < n; i++) { const s = new THREE.Group(); s.position.y = i ? -.085 : 0; const sp = tag(mesh(new THREE.SphereGeometry(r0 - i * .003, 12, 8), H(), 0, -.04, 0), 'pelo'); sp.scale.set(1, 1.2, .9); s.add(sp); node.add(s); node = s; }
    return g;
  };
  if (e === 'trenza') { chain(0, -.1, -HD / 2 - .06, cfg.pelo.larga ? 11 : 8, .08); }
  if (e === 'larga' || e === 'ondas') {
    // melena larga hasta los hombros que se mueve
    const g = new THREE.Group(); g.position.set(0, .1, -HD / 2 - .03); head.add(g); braids.push(g);
    const m = tag(mesh(rbox(HW + .08, .62, .1, .05), H(), 0, -.3, 0), 'pelo'); g.add(m);
    [-1, 1].forEach(sx => { const s = tag(mesh(rbox(.09, .5, .14, .04), H(), sx * (HW / 2 + .02), -.25, .1), 'pelo'); g.add(s); if (e === 'ondas') s.rotation.z = sx * .06; });
    if (e === 'ondas') [-1, 0, 1].forEach(k => g.add(tag(mesh(new THREE.SphereGeometry(.09, 12, 8), H(), k * .16, -.6, .02), 'pelo')));
  }
  if (e === 'coletas') { [-1, 1].forEach(sx => { add(new THREE.SphereGeometry(.1, 14, 10), sx * .22, top + .02, -.05); chain(sx * .25, top - .02, -.06, 8, .075, sx * .35); }); }
  if (e === 'afro') {
    [-1, 1].forEach(sx => add(new THREE.SphereGeometry(.14, 16, 12), sx * .22, top + .04, -.04));
    const b = add(new THREE.SphereGeometry(.3, 20, 14), 0, .06, -.1); b.scale.set(1.02, 1, .8);
  }
  if (e === 'mono') { add(new THREE.SphereGeometry(.1, 16, 12), 0, top + .06, -.14); chain(0, top + .02, -.22, 6, .075); }
  head.userData.braids = braids;
}
function animar(f) {
  let t = 0, blinkT = 2, target = null;
  const cur = { armL: [0, .08], armR: [0, .08], legL: [0, 0], legR: [0, 0], y: 0 };
  const lerp = (a, b, k) => a + (b - a) * k;
  function update(dt, mode = 'quieto', extra = 1) {
    t += dt;
    blinkT -= dt; const closed = blinkT < 0 && blinkT > -.13; if (blinkT < -.13) blinkT = 2 + Math.random() * 3;
    f.cara.update(dt, closed, mode);
    let pose = null, bob = 0, spin = 0, lean = 0, headTurn = 0, headNod = 0;
    if (mode === 'correr') {
      const ph = t * 12 * extra, s = Math.sin(ph);
      pose = { armL: [s * 1.1, .14], armR: [-s * 1.1, .14], legL: [-s * .95, 0], legR: [s * .95, 0], y: 0 };
      bob = Math.abs(Math.cos(ph)) * .09; lean = .14; headNod = Math.sin(ph * 2) * .04;
    } else if (mode === 'festejar') {
      pose = { armL: [-.3, 2.7 + Math.sin(t * 14) * .2], armR: [-.3, 2.7 - Math.sin(t * 14) * .2], legL: [0, .15], legR: [0, .15], y: 0 };
      bob = Math.abs(Math.sin(t * 7)) * .35; spin = t * 5;
    } else if (mode === 'bailar') {
      const s = Math.sin(t * 5);
      pose = { armL: [-.3, 1.5 + s * .9], armR: [-.3, 1.5 - s * .9], legL: [s * .3, .1], legR: [-s * .3, .1], y: 0 };
      bob = Math.abs(Math.sin(t * 5)) * .08; spin = Math.sin(t * 2.5) * .6; headTurn = s * .3;
    } else if (mode === 'saludar') {
      pose = { armL: [0, .1], armR: [-.2, 2.6 + Math.sin(t * 10) * .35], legL: [0, 0], legR: [0, 0], y: 0 };
      headTurn = Math.sin(t * 2) * .15; headNod = .05;
    } else if (mode === 'ballet') {
      pose = target || POSES.primera;
      if (pose.spin) spin = t * 7;
      if (pose.salto) bob = Math.abs(Math.sin(t * 5)) * .3;
      else bob = Math.sin(t * 2) * .01;
    } else {
      pose = { armL: [Math.sin(t * 1.4) * .05, .08], armR: [-Math.sin(t * 1.4) * .05, .08], legL: [0, 0], legR: [0, 0], y: 0 };
      bob = Math.sin(t * 2) * .012; headTurn = Math.sin(t * .7) * .25;
    }
    const k = Math.min(1, dt * (mode === 'correr' ? 30 : 9));
    ['armL', 'armR', 'legL', 'legR'].forEach(key => { cur[key] = [lerp(cur[key][0], pose[key][0], k), lerp(cur[key][1], pose[key][1], k)]; });
    cur.y = lerp(cur.y, pose.y || 0, k);
    f.arms.forEach((a, i) => { const p = i ? cur.armR : cur.armL, sx = i ? 1 : -1; a.rotation.x = p[0]; a.rotation.z = sx * p[1]; });
    f.legs.forEach((l, i) => { const p = i ? cur.legR : cur.legL, sx = i ? 1 : -1; l.rotation.x = p[0]; l.rotation.z = sx * p[1]; });
    f.body.position.y = bob + cur.y;
    f.body.rotation.y = spin;
    f.body.rotation.x = lean;
    f.head.rotation.y = headTurn;
    f.head.rotation.x = headNod;
    // pelo, trenzas y coletas que se mueven
    const run = mode === 'correr';
    f.braids.forEach((b, i) => {
      let n = b.children.find(c => c.isGroup), j = 1;
      b.rotation.x = (run ? .5 + Math.sin(t * 6) * .15 : .12 + Math.sin(t * 1.6 + i) * .05) + (f.body.rotation.y ? .2 : 0);
      while (n) { n.rotation.x = Math.sin(t * 4 - j + i) * .06 + (run ? .05 : 0); n = n.children.find(c => c.isGroup); j++; }
    });
    if (f.capa) f.capa.rotation.x = .12 + (run ? .5 : 0) + Math.sin(t * 3) * .03;
    if (f.falda) f.falda.scale.x = 1 + (run ? Math.sin(t * 24) * .03 : 0);
  }
  return {
    group: f.root, parts: f.parts, update, ballet: true,
    // puntos donde se pueden poner adornos (cuidar.html)
    anclas: { cabeza: f.head, cuerpo: f.body, mano: f.arms[1], alto: HH / 2 + .1, cuello: 1.17, frente: HD / 2 },
    setPose(name) { target = POSES[name] || POSES.primera; },
    setCara(name) { f.cara.set(name); },
    get cara() { return f.cara.actual; },
    setTutu(on) { if (f.tutu) f.tutu.visible = on; if (f.vestido) f.vestido.visible = !on; if (f.falda) f.falda.visible = !on; },
  };
}

// ---------- animales de bloques ----------
function animal(id) {
  const cfg = ANIMALES[id], C = cfg.c, tipo = cfg.tipo;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const parts = {}, tag = tagger(parts);
  const fur = part => mat(C[part] || C.pelaje, { roughness: .8 });
  const llama = tipo === 'llama';
  const L = llama ? .5 : tipo === 'toro' ? .32 : .3; // largo de patas
  body.add(tag(mesh(rbox(.52, .4, .86, .12), fur('pelaje'), 0, L + .22, 0), 'pelaje'));
  body.add(tag(mesh(rbox(.42, .1, .66, .05), fur('panza'), 0, L + .05, 0), 'panza'));
  if (llama) {
    body.add(tag(mesh(rbox(.58, .07, .5, .03), mat(C.manta), 0, L + .44, 0), 'manta'));
    [-1, 1].forEach(sx => body.add(tag(mesh(rbox(.04, .22, .48, .015), mat(C.manta), sx * .29, L + .33, 0), 'manta')));
  }
  // cuello y cabeza
  const neck = new THREE.Group(); neck.position.set(0, L + .3, .38); body.add(neck);
  if (llama) neck.add(tag(mesh(rbox(.24, .62, .24, .08), fur('pelaje'), 0, .3, 0), 'pelaje'));
  const head = new THREE.Group(); head.position.set(0, llama ? .66 : .16, llama ? .06 : .14); neck.add(head);
  const hw = .42, hh = .38, hd = .38;
  head.add(tag(mesh(rbox(hw, hh, hd, .11), fur('pelaje')), 'pelaje'));
  const caraO = { ojos: cfg.ojos, cejas: oscuro(C.pelaje, .45), pestanas: llama, hocico: hex(C.nariz), nariz: tipo === 'toro' ? '#b5655a' : '#2b1d1d', animal: true };
  const cara = ponerCara(head, { w: hw - .08, h: hh - .06, z: hd / 2, o: caraO });
  // la parte "nariz" (hocico) está dibujada en la carita: se vuelve a dibujar al pintarla
  const hocico = tag(mesh(new THREE.SphereGeometry(.03, 10, 8), mat(C.nariz), 0, -.03, hd / 2 + .02), 'nariz'); hocico.visible = false; head.add(hocico);
  [-1, 1].forEach(sx => {
    const ear = tag(mesh(new THREE.ConeGeometry(.08, .2, 4), fur('orejas'), sx * .13, .26, -.02), 'orejas'); ear.rotation.y = Math.PI / 4; ear.rotation.z = -sx * .2; head.add(ear);
    if (tipo === 'toro') { const h = tag(mesh(new THREE.ConeGeometry(.045, .28, 8), mat(C.cuernos), sx * .27, .17, .02), 'cuernos'); h.rotation.z = -sx * .9; head.add(h); }
    if (llama) [0, 1, 2].forEach(i => head.add(tag(mesh(new THREE.SphereGeometry(.035, 8, 6), mat([C.pompones, 0xffd23f, 0x7fe3ff][i]), sx * (.15 + i * .01), .34 + i * .04, -.02), 'pompones')));
  });
  // patas (bloques que giran)
  const legs = [[-.15, .28], [.15, .28], [-.15, -.28], [.15, -.28]].map(([x, z]) => {
    const g = new THREE.Group(); g.position.set(x, L + .05, z); body.add(g);
    g.add(tag(mesh(rbox(.14, L, .14, .05), fur('pelaje'), 0, -L / 2, 0), 'pelaje'));
    g.add(mesh(rbox(.15, .07, .17, .03), mat(0x3b2a20), 0, -L + .035, .01));
    return g;
  });
  // cola
  const tail = new THREE.Group(); tail.position.set(0, L + .32, -.42); body.add(tail);
  const bushy = tipo === 'zorro' || tipo === 'lobo';
  const tl = tag(mesh(rbox(bushy ? .17 : .07, bushy ? .17 : .07, bushy ? .46 : .3, bushy ? .07 : .03), fur('cola'), 0, .05, -.2), bushy ? 'cola' : 'pelaje'); tl.rotation.x = -.5; tail.add(tl);
  let t = 0, blinkT = 2;
  function update(dt, mode = 'quieto', speed = 1) {
    t += dt; blinkT -= dt; const closed = blinkT < 0 && blinkT > -.13; if (blinkT < -.13) blinkT = 2 + Math.random() * 3;
    cara.update(dt, closed, mode);
    const run = mode === 'correr', happy = mode === 'festejar' || mode === 'feliz';
    const ph = t * 12 * speed;
    legs.forEach((l, i) => { l.rotation.x = run ? Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI)) * .75 : happy ? Math.sin(t * 12 + i) * .25 : 0; });
    body.position.y = run ? Math.abs(Math.sin(ph)) * .07 : happy ? Math.abs(Math.sin(t * 7)) * .3 : 0;
    body.rotation.y = mode === 'festejar' ? t * 4 : (mode === 'bailar' || mode === 'ballet') ? Math.sin(t * 3) * .5 : 0;
    tail.rotation.y = Math.sin(t * (happy || mode === 'bailar' ? 14 : 4)) * .5;
    neck.rotation.x = run ? -.1 : Math.sin(t * 1.5) * .05;
    if (mode === 'bailar' || mode === 'ballet') head.rotation.z = Math.sin(t * 5) * .2;
    else if (cara.actual !== 'enojada' && cara.actual !== 'llora') head.rotation.z = 0;
  }
  return {
    group: root, parts, update, setPose() {}, setTutu() {}, setCara: n => cara.set(n), get cara() { return cara.actual; },
    _repintar(part, c) { if (part === 'nariz') cara.redibujar({ hocico: hex(c) }); },
    anclas: { cabeza: head, cuerpo: body, mano: null, alto: hh / 2 + .02, cuello: L + .3, frente: hd / 2, animal: true },
  };
}

export async function crearPersonaje(id, base = '', { colores = true } = {}) {
  const ch = FIGURAS[id] ? figura(id) : ANIMALES[id] ? animal(id) : figura('nieve');
  ch.id = id;
  ch.group.scale.multiplyScalar(1.05);
  const saved = colores && window.Juego?.progress?.colors?.[id];
  if (saved) Object.entries(saved).forEach(([part, c]) => pintarParte(ch, part, c));
  const carita = window.Juego?.progress?.caras?.[id];
  if (carita && ch.setCara) ch.setCara(carita);
  return ch;
}
export function pintarParte(ch, part, c) {
  (ch.parts[part] || []).forEach(m => {
    if (!m.userData.ownMat) { m.material = m.material.clone(); m.userData.ownMat = true; }
    m.material.color.set(c);
  });
  if (ch._repintar) ch._repintar(part, c);
}
export function nombrePersonaje(id) { return (FIGURAS[id] || ANIMALES[id] || {}).nombre || id; }
