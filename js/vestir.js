// Vestir a la Muñeca: ropero en 3D. Modo libre, o "Pedidos": leer lo que pide la clienta y ponérselo.
// La muñeca es un personaje de prueba (vistaPrevia) armado con la ropa elegida; no se guarda como personaje.
import * as THREE from 'three';
import { crearMundo, chispitas } from './mundo3d.js';
import { crearPersonaje, vistaPrevia, ESTILOS } from './personajes.js';

const J = window.Juego, P = J.progress;
const $ = s => document.querySelector(s);
const PRUEBA = location.hash === '#prueba';

// ---------- palabras: colores (con su género) y prendas ----------
// color: [hex, masculino, femenino, masc. plural, fem. plural]
const COLORES = [
  ['#ff7eb6', 'rosado', 'rosada', 'rosados', 'rosadas'], ['#ef5b5b', 'rojo', 'roja', 'rojos', 'rojas'], ['#ffd23f', 'amarillo', 'amarilla', 'amarillos', 'amarillas'],
  ['#4cb87a', 'verde', 'verde', 'verdes', 'verdes'], ['#7fd3ff', 'celeste', 'celeste', 'celestes', 'celestes'], ['#3f8ee8', 'azul', 'azul', 'azules', 'azules'],
  ['#9a6ee0', 'morado', 'morada', 'morados', 'moradas'], ['#ffffff', 'blanco', 'blanca', 'blancos', 'blancas'], ['#2b2f45', 'negro', 'negra', 'negros', 'negras'],
  ['#f39a3b', 'naranja', 'naranja', 'naranjas', 'naranjas'],
];
const GEN = { m: 1, f: 2, mp: 3, fp: 4 };
const colorPal = (hex, g) => (COLORES.find(c => c[0] === hex) || COLORES[0])[GEN[g]];
// prenda: palabra, artículo, género, dibujo, categoría, parte que se pinta, cómo se pone y cómo se sabe si la lleva
const PRENDAS = {
  vestido:  { pal: 'vestido', art: 'el', g: 'm', ico: '👗', cat: 'abajo', parte: 'abajo', pon: l => { l.abajo = 'vestido'; }, tiene: l => l.abajo === 'vestido' },
  falda:    { pal: 'falda', art: 'la', g: 'f', ico: '🩱', cat: 'abajo', parte: 'abajo', pon: l => { l.abajo = 'falda'; }, tiene: l => l.abajo === 'falda' },
  short:    { pal: 'short', art: 'el', g: 'm', ico: '🩳', cat: 'abajo', parte: 'abajo', pon: l => { l.abajo = 'short'; }, tiene: l => l.abajo === 'short' },
  pantalon: { pal: 'pantalón', art: 'el', g: 'm', ico: '👖', cat: 'abajo', parte: 'abajo', pon: l => { l.abajo = 'pantalon'; }, tiene: l => l.abajo === 'pantalon' },
  polera:   { pal: 'polera', art: 'la', g: 'f', ico: '👕', cat: 'arriba', parte: 'blusa', pon: l => { l.arriba = 'polera'; }, tiene: l => l.arriba === 'polera' },
  top:      { pal: 'top', art: 'el', g: 'm', ico: '🎽', cat: 'arriba', parte: 'blusa', pon: l => { l.arriba = 'top'; }, tiene: l => l.arriba === 'top' },
  chompa:   { pal: 'chompa', art: 'la', g: 'f', ico: '🧶', cat: 'arriba', parte: 'blusa', pon: l => { l.arriba = 'chompa'; }, tiene: l => l.arriba === 'chompa' },
  chaqueta: { pal: 'chaqueta', art: 'la', g: 'f', ico: '🧥', cat: 'arriba', parte: 'mangas', alterna: true, pon: (l, on = !l.chaqueta) => { l.chaqueta = on; }, tiene: l => l.chaqueta },
  zapatos:  { pal: 'zapatos', art: 'los', g: 'mp', ico: '👟', cat: 'pies', parte: 'zapatos', pon: l => { l.calzado = 'zapatos'; }, tiene: l => l.calzado === 'zapatos' },
  botas:    { pal: 'botas', art: 'las', g: 'fp', ico: '👢', cat: 'pies', parte: 'zapatos', pon: l => { l.calzado = 'botas'; }, tiene: l => l.calzado === 'botas' },
  corona:   { pal: 'corona', art: 'la', g: 'f', ico: '👑', cat: 'cosas', acc: 1 },
  tiara:    { pal: 'tiara', art: 'la', g: 'f', ico: '💎', cat: 'cosas', acc: 1 },
  gorra:    { pal: 'gorra', art: 'la', g: 'f', ico: '🧢', cat: 'cosas', acc: 1 },
  lentes:   { pal: 'lentes', art: 'los', g: 'mp', ico: '🕶️', cat: 'cosas', acc: 1 },
  'moño':   { pal: 'moño', art: 'el', g: 'm', ico: '🎀', cat: 'cosas', acc: 1 },
  collar:   { pal: 'collar', art: 'el', g: 'm', ico: '📿', cat: 'cosas', acc: 1 },
  alitas:   { pal: 'alitas', art: 'las', g: 'fp', ico: '🧚', cat: 'cosas', acc: 1 },
  varita:   { pal: 'varita', art: 'la', g: 'f', ico: '🪄', cat: 'cosas', acc: 1 },
  audifonos: { pal: 'audífonos', art: 'los', g: 'mp', ico: '🎧', cat: 'cosas', acc: 1 },
  capa:     { pal: 'capa', art: 'la', g: 'f', ico: '🦸‍♀️', cat: 'cosas', acc: 1 },
  microfono: { pal: 'micrófono', art: 'el', g: 'm', ico: '🎤', cat: 'cosas', acc: 1 },
};
Object.entries(PRENDAS).forEach(([id, p]) => {
  p.id = id;
  if (p.acc) {
    p.alterna = true;
    p.pon = (l, on = !l.acc.has(id)) => { if (on) { l.acc.add(id); if (id === 'corona') { l.acc.delete('tiara'); l.acc.delete('gorra'); } if (id === 'tiara') { l.acc.delete('corona'); l.acc.delete('gorra'); } if (id === 'gorra') { l.acc.delete('corona'); l.acc.delete('tiara'); } } else l.acc.delete(id); };
    p.tiene = l => l.acc.has(id);
  }
});
const PEINADOS = [['trenza', 'trenza', '🪢'], ['larga', 'pelo largo', '💇‍♀️'], ['ondas', 'ondas', '🌊'], ['coletas', 'colitas', '👧'], ['mono', 'cola alta', '🎗️'], ['monos', 'moñitos', '🐻'], ['afro', 'afro', '☁️'], ['rizos', 'rizos', '🌀'], ['bob', 'melenita', '💁‍♀️'], ['corto', 'corto', '✂️']];
const PELOS = ['#6b3b22', '#1d1d2b', '#f0d48a', '#b98cff', '#ff7eb6', '#ef5b5b', '#7fd3ff'];
const CATS = [['abajo', '👗', 'Abajo'], ['arriba', '👚', 'Arriba'], ['pies', '👟', 'Pies'], ['cosas', '👑', 'Cosas'], ['pelo', '💇', 'Pelo'], ['color', '🎨', 'Color'], ['mis', '⭐', 'Mis looks']];
const PARTES = { abajo: 'la ropa de abajo', blusa: 'la polera', mangas: 'la chaqueta', zapatos: 'los zapatos', pelo: 'el pelo', capa: 'la capa' };

// ---------- el look de la muñeca ----------
const lookBase = () => ({ abajo: 'pantalon', arriba: 'polera', chaqueta: false, calzado: 'zapatos', acc: new Set(), pelo: 'larga',
  col: { abajo: '#3f8ee8', blusa: '#ffffff', mangas: '#9a6ee0', zapatos: '#ffffff', pelo: '#6b3b22', capa: '#ef5b5b' } });
const state = { modo: 'pedidos', nivel: 0, look: lookBase(), cat: 'abajo', parte: 'abajo', estilo: 'muneca', orden: null, hechas: 0, jugando: false, yaw: 0, yawT: 0, festejo: 0, pasarela: 0 };
function aSpec(l) {
  const a = id => l.acc.has(id);
  const c = { blusa: l.col.blusa, mangas: l.chaqueta ? l.col.mangas : l.col.blusa, vestido: l.col.abajo, falda: l.col.abajo, pantalon: l.col.abajo, zapatos: l.col.zapatos, cinturon: l.col.abajo, corona: '#ffd23f', 'moño': '#ff7eb6', gorra: l.col.blusa === '#ffffff' ? '#ff7eb6' : l.col.blusa };
  if (l.abajo === 'vestido') c.blusa = l.col.abajo, c.mangas = l.chaqueta ? l.col.mangas : l.col.abajo;
  return { nombre: 'Muñeca', emoji: '👗', base: 'amara', estilo: state.estilo, fig: {
    ropa: l.abajo, crop: l.arriba === 'top', mangaLarga: l.arriba === 'chompa' || l.chaqueta, botas: l.calzado === 'botas', logo: null,
    corona: a('corona') ? 'oro' : a('tiara') ? 'tiara' : null, gorra: a('gorra'), lentes: a('lentes'), lazo: a('moño'), collar: a('collar'), alitas: a('alitas'), varita: a('varita'),
    audifonos: a('audifonos'), microfono: a('microfono'), capa: a('capa') ? l.col.capa : null, espada: false, aretes: false,
    pelo: { e: l.pelo, c: l.col.pelo, larga: false }, c } };
}
const guardarLook = l => ({ ...l, acc: [...l.acc], col: { ...l.col } });
const abrirLook = g => ({ ...lookBase(), ...g, acc: new Set(g.acc || []), col: { ...lookBase().col, ...(g.col || {}) } });

// ---------- escena ----------
const W = crearMundo($('#mundo'), { fog: null, fov: 34 });
const { scene, camera, renderer } = W;
// la luz de abajo del mundo es verde pasto: aquí va rosada para que la piel no se vea verdosa
scene.traverse(o => { if (o.isHemisphereLight) o.groundColor.set(0xffd9ea); });
const fx = chispitas(scene);
const ped = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.1, .18, 40), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .35 }));
ped.position.y = -.09; ped.receiveShadow = true; scene.add(ped);
const aro = new THREE.Mesh(new THREE.TorusGeometry(1.05, .035, 8, 48), new THREE.MeshStandardMaterial({ color: 0xff9bd0, emissive: 0xff7eb6, emissiveIntensity: .35 }));
aro.rotation.x = Math.PI / 2; aro.position.y = .01; scene.add(aro);
let ch = null, armando = 0;
async function armar(brillo = false) {
  const n = ++armando;
  let nuevo;
  try { nuevo = await crearPersonaje(vistaPrevia(aSpec(state.look)), '', { estilo: state.estilo, colores: false }); } catch (e) { console.error(e); return; }
  if (n !== armando) return;
  if (ch) { scene.remove(ch.group); ch.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  ch = nuevo; ch.setTutu && ch.setTutu(false);
  ch.group.rotation.y = state.yaw; scene.add(ch.group);
  encuadre();
  if (brillo) fx.burst(new THREE.Vector3(0, 1.2, .3), 20, .5);
}
// la cámara deja a la muñeca entera debajo de la tarjeta del pedido (o del HUD) y encima del borde del lienzo
const cam = { y: 1, d: 6, listo: false };
function encuadre(dt = 1) {
  const cv = $('#mundo'), alto = cv.clientHeight || 1, pd = $('#pedido');
  const arriba = Math.min(.5, ((pd.hidden ? 60 : pd.getBoundingClientRect().bottom) + 14) / alto), abajo = .86, H = 2.15, PISO = -.22;
  const V = Math.max((H - PISO) / (abajo - arriba), 2.5 / camera.aspect), d = V / (2 * Math.tan(camera.fov * Math.PI / 360)), y = H - V / 2 + arriba * V;
  const k = cam.listo ? Math.min(1, dt * 5) : 1; cam.listo = true;
  cam.y += (y - cam.y) * k; cam.d += (d - cam.d) * k;
  camera.position.set(0, cam.y + .2, cam.d); camera.lookAt(0, cam.y, 0);
}
let arrastre = null;
$('#mundo').addEventListener('pointerdown', e => { arrastre = e.clientX; });
addEventListener('pointermove', e => { if (arrastre === null) return; state.yawT += (e.clientX - arrastre) * .012; arrastre = e.clientX; });
addEventListener('pointerup', () => { arrastre = null; });
W.onFrame((dt) => {
  encuadre(dt);
  if (!ch) return;
  state.festejo -= dt; state.pasarela -= dt;
  if (state.festejo > 0) state.yawT += dt * 5;
  state.yaw += (state.yawT - state.yaw) * Math.min(1, dt * 8);
  ch.group.rotation.y = state.yaw;
  ch.group.position.z = state.pasarela > 0 ? Math.sin((3 - state.pasarela) / 3 * Math.PI) * .6 : 0;
  ch.update(dt, state.festejo > 0 ? 'festejar' : state.pasarela > 0 ? 'bailar' : 'quieto');
  fx.update(dt);
});

// ---------- ropero ----------
function updatePlayer() { const p = J.player(); $('#jugador').innerHTML = `${J.CHARS[p.char]?.emoji || '⭐'} ${J.esc(p.name)} · ⭐ ${p.stars}`; }
function message(text, secs = 1.4) {
  const el = $('#mensaje'); el.textContent = text;
  el.classList.remove('ver'); void el.offsetWidth; el.classList.add('ver');
  clearTimeout(message.t); message.t = setTimeout(() => el.classList.remove('ver'), secs * 1000);
}
const looksGuardados = () => { try { return JSON.parse(localStorage.getItem('bl-vestir-looks') || '[]'); } catch (e) { return []; } };
function pintarRopero() {
  $('#cats').innerHTML = CATS.filter(c => c[0] !== 'mis' || state.modo === 'libre').map(([id, ico, n]) => `<button data-cat="${id}" class="${state.cat === id ? 'on' : ''}" aria-label="${n}">${ico}<small>${n}</small></button>`).join('');
  const l = state.look, box = $('#items');
  if (state.cat === 'pelo') {
    box.innerHTML = PEINADOS.map(([e, pal, ico]) => `<button class="item ${l.pelo === e ? 'on' : ''}" data-pelo="${e}"><span class="ico">${ico}</span><b>${pal}</b></button>`).join('') +
      `<div class="colores">${PELOS.map(h => `<button data-pelocolor="${h}" style="background:${h}" aria-label="color de pelo"></button>`).join('')}</div>`;
  } else if (state.cat === 'color') {
    const partes = ['abajo', 'blusa', ...(l.chaqueta ? ['mangas'] : []), 'zapatos', ...(l.acc.has('capa') ? ['capa'] : [])];
    if (!partes.includes(state.parte)) state.parte = 'abajo';
    const nomParte = p => p === 'abajo' ? PRENDAS[l.abajo].art + ' ' + PRENDAS[l.abajo].pal : p === 'zapatos' ? PRENDAS[l.calzado].art + ' ' + PRENDAS[l.calzado].pal : p === 'blusa' ? PRENDAS[l.arriba].art + ' ' + PRENDAS[l.arriba].pal : PARTES[p];
    box.innerHTML = `<div class="partes">${partes.map(p => `<button data-parte="${p}" class="${state.parte === p ? 'on' : ''}">${nomParte(p)}</button>`).join('')}</div>
      <div class="colores">${COLORES.map(c => `<button data-color="${c[0]}" style="background:${c[0]}" aria-label="${c[1]}"></button>`).join('')}</div>`;
  } else if (state.cat === 'mis') {
    const g = looksGuardados();
    box.innerHTML = `<div class="looks"><button data-look="guardar">💾 Guardar este look</button>${g.map((_, i) => `<button data-look="${i}">⭐ Look ${i + 1}</button>`).join('')}</div>
      <div class="partes">${Object.keys(ESTILOS || {}).map(e => `<button data-estilo="${e}" class="${state.estilo === e ? 'on' : ''}">${(ESTILOS[e].nombre || e)}</button>`).join('')}</div>`;
  } else {
    box.innerHTML = Object.values(PRENDAS).filter(p => p.cat === state.cat).map(p => `<button class="item ${p.tiene(l) ? 'on' : ''}" data-prenda="${p.id}"><span class="ico">${p.ico}</span><b>${p.pal}</b></button>`).join('');
  }
  $('#pie').innerHTML = state.modo === 'pedidos'
    ? `<button class="lista" id="b-lista">✅ ¡Lista!</button>`
    : `<button id="b-pasarela">💃 Pasarela</button><button id="b-foto">📸 Foto</button><button id="b-nueva">✨ De nuevo</button>`;
}
function poner(id, on) {
  const p = PRENDAS[id]; if (!p) return;
  p.alterna ? p.pon(state.look, on) : p.pon(state.look);
  if (p.parte) state.parte = p.parte;
  J.sfx('pop'); J.say(p.pal);
  pintarRopero(); armar(true);
}
function pintar(parte, hex) {
  state.look.col[parte] = hex; state.parte = parte;
  const l = state.look, pr = parte === 'abajo' ? PRENDAS[l.abajo] : parte === 'zapatos' ? PRENDAS[l.calzado] : parte === 'blusa' ? PRENDAS[l.arriba] : parte === 'mangas' ? PRENDAS.chaqueta : parte === 'capa' ? PRENDAS.capa : null;
  J.sfx('pop2'); J.say(pr ? [pr.art + ' ' + pr.pal, colorPal(hex, pr.g)] : colorPal(hex, 'm'));
  pintarRopero(); armar(true);
}
$('#cats').onclick = e => { const b = e.target.closest('[data-cat]'); if (!b) return; state.cat = b.dataset.cat; J.sfx('pop'); pintarRopero(); };
$('#items').onclick = e => {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if (d.prenda) return poner(d.prenda);
  if (d.pelo) { state.look.pelo = d.pelo; J.sfx('pop'); J.say(PEINADOS.find(p => p[0] === d.pelo)[1]); pintarRopero(); return armar(true); }
  if (d.pelocolor) { state.look.col.pelo = d.pelocolor; J.sfx('pop2'); pintarRopero(); return armar(true); }
  if (d.parte) { state.parte = d.parte; J.sfx('pop'); return pintarRopero(); }
  if (d.color) return pintar(state.parte, d.color);
  if (d.estilo) { state.estilo = d.estilo; J.sfx('pop'); pintarRopero(); return armar(true); }
  if (d.look === 'guardar') { const g = looksGuardados(); g.unshift(guardarLook(state.look)); try { localStorage.setItem('bl-vestir-looks', JSON.stringify(g.slice(0, 8))); } catch (er) {} J.efecto('acierto'); message('¡Guardado! ⭐'); return pintarRopero(); }
  if (d.look) { const g = looksGuardados()[+d.look]; if (g) { state.look = abrirLook(g); J.sfx('pop'); pintarRopero(); armar(true); } }
};
$('#pie').onclick = e => {
  const id = e.target.closest('button')?.id;
  if (id === 'b-lista') revisar();
  if (id === 'b-pasarela') pasarela();
  if (id === 'b-foto') foto();
  if (id === 'b-nueva') { state.look = lookBase(); J.sfx('pop2'); pintarRopero(); armar(true); }
};
function pasarela() { state.pasarela = 3; state.yawT += Math.PI * 2; J.efecto('festejo'); J.confetti(90); J.say('¡Qué linda quedó!'); }
function foto() {
  renderer.render(scene, camera);
  const a = document.createElement('a'); a.download = 'mi-muñeca.png'; a.href = renderer.domElement.toDataURL('image/png'); a.click();
  J.sfx('pop'); message('📸 ¡Foto!');
}

// ---------- pedidos ----------
// niveles: 1 una prenda con dibujo · 2 prenda y color · 3 dos prendas · 4 solo texto · 5 ocasiones
const NIVELES = [
  { nombre: 'Una prenda (con dibujo)', tipo: 'una' },
  { nombre: 'La prenda y su color', tipo: 'color' },
  { nombre: 'Dos prendas', tipo: 'dos' },
  { nombre: 'Solo leyendo (sin dibujos)', tipo: 'texto' },
  { nombre: '¿A dónde va? Elige la ropa', tipo: 'ocasion' },
];
const META = 5;
const ROPA = ['vestido', 'falda', 'short', 'pantalon', 'botas'], COSAS = ['corona', 'gorra', 'lentes', 'moño', 'collar', 'alitas', 'varita', 'capa'];
const CON_COLOR = ['vestido', 'falda', 'short', 'pantalon', 'botas', 'zapatos', 'polera', 'chaqueta'];
const OCASIONES = [
  { frase: ['Va a la', 'playa'], ico: '🏖️', pide: [['short'], ['lentes', 'gorra']], pista: 'short y lentes' },
  { frase: ['Va a una', 'fiesta'], ico: '🎉', pide: [['vestido'], ['corona', 'tiara', 'collar']], pista: 'vestido y corona' },
  { frase: ['Hace', 'frío'], ico: '❄️', pide: [['pantalon'], ['chompa', 'chaqueta'], ['botas']], pista: 'pantalón, chompa y botas' },
  { frase: ['Va a', 'bailar'], ico: '🩰', pide: [['falda'], ['moño']], pista: 'falda y moño' },
  { frase: ['Va a', 'cantar'], ico: '🎤', pide: [['microfono'], ['botas']], pista: 'micrófono y botas' },
  { frase: ['Va al', 'parque'], ico: '⚽', pide: [['short', 'pantalon'], ['gorra'], ['zapatos']], pista: 'short, gorra y zapatos' },
  { frase: ['Va a', 'dormir'], ico: '🌙', pide: [['pantalon'], ['chompa']], pista: 'pantalón y chompa' },
];
const CLIENTAS = ['🧚', '👸', '🦸‍♀️', '🧜‍♀️', '👩‍🎤', '🧙‍♀️', '👩‍🚀'];
function nuevaOrden() {
  const tipo = NIVELES[state.nivel].tipo, o = { tipo, req: [], cli: J.pick(CLIENTAS) };
  const conColor = () => { const id = J.pick(CON_COLOR), c = J.pick(COLORES); return { id, color: c[0] }; };
  if (tipo === 'una') o.req = [{ id: J.pick([...ROPA, ...COSAS]) }];
  else if (tipo === 'color') o.req = [conColor()];
  else if (tipo === 'dos') o.req = [{ id: J.pick(ROPA) }, { id: J.pick(COSAS) }];
  else if (tipo === 'texto') o.req = Math.random() < .5 ? [conColor(), { id: J.pick(COSAS) }] : [{ id: J.pick(ROPA) }, { id: J.pick(COSAS) }];
  else { let oc; do oc = J.pick(OCASIONES); while (state.orden && state.orden.oc === oc); o.oc = oc; }
  return o;
}
const cumple = (r, l) => PRENDAS[r.id].tiene(l) && (!r.color || l.col[PRENDAS[r.id].parte] === r.color);
const faltan = (o, l = state.look) => o.oc ? o.oc.pide.map((grupo, i) => grupo.some(id => PRENDAS[id].tiene(l)) ? -1 : i).filter(i => i >= 0) : o.req.map((r, i) => cumple(r, l) ? -1 : i).filter(i => i >= 0);
// lo que se muestra y lo que se dice (en trozos, para usar las grabaciones)
function textoOrden(o) {
  if (o.oc) return { html: `${o.oc.frase[0]} <b data-k="0">${o.oc.frase[1]}</b>. ¿Qué se pone?`, voz: [o.oc.frase.join(' ') + '.', '¿Qué se pone?'], dib: o.oc.ico };
  const partes = o.req.map((r, i) => { const p = PRENDAS[r.id]; return { html: `${p.art} <b data-k="${i}">${p.pal}${r.color ? ' ' + colorPal(r.color, p.g) : ''}</b>`, voz: [p.art + ' ' + p.pal, ...(r.color ? [colorPal(r.color, p.g)] : [])], dib: p.ico + (r.color ? `<span style="display:inline-block;width:.8em;height:.8em;border-radius:50%;background:${r.color};border:2px solid #23324a;vertical-align:middle"></span>` : '') }; });
  return { html: 'Ponle ' + partes.map(x => x.html).join(' y ') + '.', voz: ['Ponle', ...partes.flatMap((x, i) => i ? ['y', ...x.voz] : x.voz)], dib: partes.map(x => x.dib).join(' ') };
}
function mostrarOrden(hablar = true) {
  const o = state.orden, t = textoOrden(o), conDibujo = ['una', 'color', 'dos'].includes(o.tipo) || o.pistaVista;
  $('#p-cli').textContent = o.cli; $('#p-txt').innerHTML = t.html;
  $('#p-dib').innerHTML = conDibujo ? (o.oc ? o.oc.ico + ' ' + o.oc.pide.map(g => PRENDAS[g[0]].ico).join(' ') : t.dib) : (o.oc ? o.oc.ico : '');
  $('#p-puntos').innerHTML = Array.from({ length: META }, (_, k) => `<i class="${k < state.hechas ? 'on' : ''}"></i>`).join('');
  $('#pedido').hidden = false;
  // en el nivel de solo texto la voz no lo lee sola: primero lee ella (puede tocar 🔊)
  if (hablar && o.tipo !== 'texto') J.say(t.voz);
}
$('#p-oir').onclick = () => state.orden && J.say(textoOrden(state.orden).voz);
function siguienteOrden() {
  state.orden = nuevaOrden();
  // la muñeca empieza con ropa que no cumple el pedido
  let l, n = 0;
  do { l = lookBase(); l.abajo = J.pick(['pantalon', 'short', 'falda', 'vestido']); l.col.abajo = J.pick(COLORES)[0]; l.col.blusa = J.pick(COLORES)[0]; l.calzado = 'zapatos'; n++; }
  while (n < 30 && faltan(state.orden, l).length < (state.orden.oc ? state.orden.oc.pide.length : state.orden.req.length));
  state.look = l; state.jugando = true;
  pintarRopero(); armar(); mostrarOrden();
}
function revisar() {
  if (!state.jugando || !state.orden) return;
  const o = state.orden, f = faltan(o);
  if (!f.length) {
    state.jugando = false; state.hechas++;
    state.festejo = 1.6; ch && ch.emote && ch.emote(J.pick(['corazon', 'estrella', 'aplauso', 'saludo']));
    J.efecto('acierto'); J.addStar(); updatePlayer(); message(J.pick(['¡Muy bien!', '¡Qué linda!', '¡Bravo!']));
    J.say(J.pick(J.PRAISES)); mostrarOrden(false);
    setTimeout(() => {
      if (state.hechas >= META) return nivelListo();
      P.two ? J.nextTurn(siguienteOrden, { onShow: updatePlayer }) : siguienteOrden();
    }, 1900);
  } else {
    // ¡casi!: se resalta la palabra que falta y, en los niveles difíciles, aparece el dibujo como ayuda
    J.efecto('error'); message('¡Casi!', 1.1);
    o.pistaVista = true; mostrarOrden(false);
    f.forEach(i => { const b = $(`#p-txt b[data-k="${o.oc ? 0 : i}"]`); if (b) { b.classList.remove('falta'); void b.offsetWidth; b.classList.add('falta'); } });
    const primera = o.oc ? o.oc.pide[f[0]][0] : o.req[f[0]].id;
    J.say(o.oc ? ['¡Casi!', 'Le falta', PRENDAS[primera].art + ' ' + PRENDAS[primera].pal] : ['¡Casi!', ...textoOrden(o).voz]);
    const cat = PRENDAS[primera].tiene(state.look) ? 'color' : PRENDAS[primera].cat;
    state.cat = cat; if (cat === 'color') state.parte = PRENDAS[primera].parte;
    pintarRopero();
    const btn = $(`#items [data-prenda="${primera}"]`); if (btn) btn.classList.add('pista');
  }
}
function nivelListo() {
  $('#pedido').hidden = true;
  P.level.vestir = Math.max(P.level.vestir || 0, state.nivel + 1); J.save();
  pasarela();
  setTimeout(() => J.gift(() => { state.nivel = Math.min(state.nivel + 1, NIVELES.length - 1); empezar(); }), 3200);
}
function empezar() {
  state.hechas = 0; $('#nivel-num').textContent = state.nivel + 1;
  $('#nivel-pill').hidden = state.modo !== 'pedidos';
  if (state.modo === 'libre') { $('#pedido').hidden = true; state.orden = null; state.jugando = false; pintarRopero(); armar(); J.say('¡Viste a la muñeca!'); return; }
  P.two ? J.showTurn(siguienteOrden, { onShow: updatePlayer }) : siguienteOrden();
}
function start(nivel, modo = state.modo) {
  $('#portada').hidden = true; J.audio(); J.startMusic();
  state.modo = modo; state.nivel = nivel; state.cat = 'abajo';
  empezar();
}

// ---------- inicio ----------
(async () => {
  await J.ready;
  updatePlayer();
  await armar(); W.start(); J.refreshMusic();
  pintarRopero();
  const unlocked = Math.min(NIVELES.length, (P.level.vestir || 0) + 1);
  let sel = unlocked - 1;
  const box = $('#niveles');
  const pintarNiveles = () => {
    box.hidden = state.modo !== 'pedidos';
    box.innerHTML = NIVELES.map((n, i) => `<button data-i="${i}" title="${n.nombre}" ${i >= unlocked ? 'disabled aria-label="Nivel bloqueado"' : ''} class="${i === sel ? 'on' : ''}">${i < unlocked ? i + 1 : '🔒'}</button>`).join('');
    $('#nivel-desc').textContent = state.modo === 'pedidos' ? NIVELES[sel].nombre : 'Juega libre con toda la ropa';
  };
  pintarNiveles();
  box.onclick = e => { const b = e.target.closest('[data-i]'); if (!b || b.disabled) return; sel = +b.dataset.i; J.sfx('pop'); pintarNiveles(); };
  $('#modos').onclick = e => { const b = e.target.closest('[data-modo]'); if (!b) return; state.modo = b.dataset.modo; [...$('#modos').children].forEach(x => x.classList.toggle('on', x === b)); J.sfx('pop'); pintarNiveles(); };
  const go = $('#empezar'); go.disabled = false; go.textContent = '▶ ¡A vestir!';
  go.onclick = () => start(sel);
  if (PRUEBA) {
    // resolver(): pone lo que pide el pedido actual (para las pruebas automáticas)
    const resolver = () => { const o = state.orden; if (!o) return; if (o.oc) o.oc.pide.forEach(g => PRENDAS[g[0]].alterna ? PRENDAS[g[0]].pon(state.look, true) : PRENDAS[g[0]].pon(state.look)); else o.req.forEach(r => { const p = PRENDAS[r.id]; p.alterna ? p.pon(state.look, true) : p.pon(state.look); if (r.color) state.look.col[p.parte] = r.color; }); pintarRopero(); return armar(); };
    window.__v = { state, poner, pintar, revisar, resolver, faltan, start, NIVELES, PRENDAS, META };
    start(0, 'pedidos');
  }
})();
