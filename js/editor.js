// Taller de Personajes: cambiar un personaje (estilo, carita, pelo, ropa, colores y cosas) o crear uno nuevo.
// Cada opción muestra su palabra en grande y separada en sílabas; al tocarla la voz la lee.
import * as THREE from 'three';
import { crearMundo, chispitas } from './mundo3d.js';
import { crearPersonaje, PERSONAJES, FIGURAS, ESTILOS, EMOJI, CARAS, nombrePersonaje, estiloActual,
  registrarPersonaje, borrarPersonaje, esPropio, datosPersonaje, vistaPrevia } from './personajes.js';

const J = window.Juego, P = J.progress;
const $ = s => document.querySelector(s);
const PRUEBA = location.hash === '#prueba';
const info = id => J.CHARS[id] || { name: nombrePersonaje(id), emoji: EMOJI[id] || '⭐' };
const humanos = () => PERSONAJES.filter(id => FIGURAS[id]);
const hexs = c => typeof c === 'number' ? '#' + c.toString(16).padStart(6, '0') : c;

// ---------- palabras con sílabas ----------
const silabas = w => w.split(' ').map(p => J.silabas(p).split('-'));
function palabraHTML(w) {
  return silabas(w).map(sy => sy.map(s => `<span class="s">${J.esc(s)}</span>`).join('<span class="g">-</span>')).join(' ');
}
// lee la palabra en voz alta y va iluminando cada sílaba (en el botón y en la palabra grande)
let leyendoT = [];
function leer(w, el, frase) {
  leyendoT.forEach(clearTimeout); leyendoT = [];
  const g = $('#grande'); g.innerHTML = palabraHTML(w); g.classList.add('ver');
  const grupos = [g, el && el.querySelector('.pal')].filter(Boolean);
  const n = g.querySelectorAll('.s').length;
  for (let i = 0; i < n; i++) leyendoT.push(setTimeout(() => grupos.forEach(x => x.querySelectorAll('.s').forEach((s, k) => s.classList.toggle('lee', k === i))), 120 + i * 360));
  leyendoT.push(setTimeout(() => grupos.forEach(x => x.querySelectorAll('.s').forEach(s => s.classList.remove('lee'))), 160 + n * 360));
  leyendoT.push(setTimeout(() => g.classList.remove('ver'), 1400 + n * 360));
  J.say(frase || w);
}
const op = (k, w, ico, on, extra = '') => `<button class="op ${on ? 'on' : ''}" data-k="${k}" ${extra}>${ico}<span class="pal">${palabraHTML(w)}</span></button>`;

// ---------- colores con su nombre (se dice en femenino o plural según la parte) ----------
const COLORES = [
  ['#ef5b5b', 'rojo'], ['#f39a3b', 'naranja'], ['#ffd23f', 'amarillo'], ['#4cb87a', 'verde'], ['#2fb3a8', 'turquesa'], ['#8fd3f4', 'celeste'],
  ['#3f8ee8', 'azul'], ['#9a6ee0', 'morado'], ['#c9a2ff', 'lila'], ['#ff7eb6', 'rosado'], ['#ffffff', 'blanco'], ['#9a6a43', 'marrón'],
  ['#23263a', 'negro'], ['#ffc83d', 'dorado'], ['#c9ccd6', 'plateado'],
];
const PARTES = {
  blusa: ['la blusa', 'f', '👚'], mangas: ['la chaqueta', 'f', '🧥'], vestido: ['el vestido', 'm', '👗'], falda: ['la falda', 'f', '👗'], pantalon: ['el pantalón', 'm', '👖'],
  zapatos: ['las botas', 'fp', '👢'], cinturon: ['el cinturón', 'm', '🎀'], gorra: ['la gorra', 'f', '🧢'], audifonos: ['los audífonos', 'mp', '🎧'], corona: ['la corona', 'f', '👑'],
  logo: ['el dibujito', 'm', '⭐'], guantes: ['los guantes', 'mp', '🧤'], collar: ['el collar', 'm', '📿'], 'moño': ['el moño', 'm', '🎀'], lentes: ['los lentes', 'mp', '🕶️'],
  alas: ['las alas', 'fp', '🧚'], espada: ['la espada', 'f', '✨'], capa: ['la capa', 'f', '🦸'],
};
function colorWord(name, g) {
  const fem = g[0] === 'f', pl = g.length > 1;
  let w = name;
  if (name.endsWith('o') && name !== 'marrón') w = fem ? name.slice(0, -1) + 'a' : name;
  if (pl) w = /[aeiou]$/.test(w) ? w + 's' : name === 'marrón' ? 'marrones' : name === 'azul' ? 'azules' : w + 'es';
  return w;
}
const PIELES = [['#ffe3cf', 'clarita'], ['#f6d2b4', 'rosadita'], ['#f0c8a6', 'trigueña'], ['#d9a47c', 'canela'], ['#a8714d', 'morena'], ['#8d5a3b', 'oscura'], ['#5e3a26', 'chocolate']];
const OJOS = [['#5a3220', 'café'], ['#2b1d1d', 'negro'], ['#3f8ee8', 'azul'], ['#4cb87a', 'verde'], ['#8a4fd8', 'morado'], ['#9a6a43', 'miel']];
const PELO_C = [['#1d1d2b', 'negro'], ['#4a2a1a', 'café'], ['#9a6a43', 'castaño'], ['#f4e3a1', 'rubio'], ['#f4eedd', 'platinado'], ['#e8473c', 'rojo'], ['#ff7eb6', 'rosado'], ['#c2255c', 'fucsia'], ['#b98cff', 'lila'], ['#7fd3ff', 'celeste'], ['#4cb87a', 'verde']];

const PEINADOS = { trenza: ['trenza', '🪢'], larga: ['pelo largo', '💁‍♀️'], ondas: ['ondas', '🌊'], coletas: ['colitas', '🎀'], mono: ['cola alta', '🐴'], monos: ['moñitos', '🍡'], afro: ['afro', '☁️'], rizos: ['rizos', '🌀'], bob: ['melenita', '💇‍♀️'], corto: ['corto', '💇‍♂️'] };
const ROPAS = { vestido: ['vestido', '👗'], falda: ['falda', '🩰'], short: ['short', '🩳'], pantalon: ['pantalón', '👖'] };
const COSAS = {
  corona: ['corona', '👑'], gorra: ['gorra', '🧢'], audifonos: ['audífonos', '🎧'], lentes: ['lentes', '🕶️'], lazo: ['moño', '🎀'], aretes: ['aretes', '💎'],
  collar: ['collar', '📿'], alitas: ['alitas', '🧚'], varita: ['varita', '🪄'], microfono: ['micrófono', '🎤'], espada: ['espada', '✨'], capa: ['capa', '🦸'], botas: ['botas', '👢'],
};
const CORONAS = { oro: ['de oro', '👑'], hielo: ['de hielo', '❄️'], estrella: ['de estrella', '⭐'], tiara: ['tiara', '💍'] };
// trajes listos (diseños propios)
const TRAJES = {
  princesa: { palabra: 'princesa', ico: '👸', fig: { ropa: 'vestido', corona: 'oro', capa: null, gorra: false, audifonos: false, microfono: false, espada: false, botas: false, collar: true, c: { vestido: '#ff9bd0', blusa: '#ff9bd0', mangas: '#ffd6ec', cinturon: '#ffd23f', zapatos: '#ffd6ec', corona: '#ffd23f', collar: '#ffffff' } } },
  cantante: { palabra: 'cantante', ico: '🎤', fig: { ropa: 'short', crop: true, microfono: true, botas: true, rayaBota: '#ff5d8f', corona: null, espada: false, c: { blusa: '#ffffff', mangas: '#ffc83d', pantalon: '#23263a', cinturon: '#ff5d8f', zapatos: '#23263a' } } },
  bailarina: { palabra: 'bailarina', ico: '🩰', fig: { ropa: 'falda', lazo: true, botas: false, microfono: false, espada: false, capa: null, gorra: false, c: { blusa: '#ffd6ec', mangas: '#ffd6ec', falda: '#ff9bd0', zapatos: '#ffd6ec', cinturon: '#ff9bd0', 'moño': '#ff7eb6' } } },
  deportista: { palabra: 'deportista', ico: '⚽', fig: { ropa: 'short', gorra: true, botas: false, crop: false, microfono: false, espada: false, corona: null, capa: null, logo: 'rayo', c: { blusa: '#3f8ee8', mangas: '#3f8ee8', pantalon: '#ffffff', zapatos: '#ffffff', gorra: '#3f8ee8', logo: '#ffd23f', cinturon: '#ffffff' } } },
  guerrera: { palabra: 'guerrera', ico: '⚔️', fig: { ropa: 'pantalon', espada: true, botas: true, rayaBota: '#ff5d8f', crop: false, corona: null, microfono: false, capa: null, c: { blusa: '#23263a', mangas: '#9a6ee0', pantalon: '#23263a', zapatos: '#23263a', cinturon: '#ff5d8f', espada: '#8fd3ff' } } },
  pijama: { palabra: 'pijama', ico: '🌙', fig: { ropa: 'pantalon', mangaLarga: true, botas: false, gorra: false, audifonos: false, microfono: false, espada: false, corona: null, capa: null, logo: 'estrella', c: { blusa: '#c9a2ff', mangas: '#c9a2ff', pantalon: '#c9a2ff', zapatos: '#ffd6ec', logo: '#ffd23f', cinturon: '#c9a2ff' } } },
  superheroina: { palabra: 'superheroína', ico: '🦸‍♀️', fig: { ropa: 'short', capa: '#ef5b5b', botas: true, logo: 'rayo', microfono: false, espada: false, corona: null, gorra: false, c: { blusa: '#3f8ee8', mangas: '#3f8ee8', pantalon: '#ef5b5b', zapatos: '#ef5b5b', cinturon: '#ffd23f', logo: '#ffd23f' } } },
};
const EMOJIS = ['👧', '👧🏽', '👧🏾', '👸', '💃', '🎤', '🧚', '🦸‍♀️', '🧜‍♀️', '👩‍🚀', '🥷', '🌟', '🌈', '🦄', '🐱', '👦', '👨', '👩'];

// ---------- estado ----------
const TABS = [['estilo', '🧱', 'Estilo'], ['cara', '😊', 'Cara'], ['pelo', '💇‍♀️', 'Pelo'], ['ropa', '👗', 'Ropa'], ['colores', '🎨', 'Colores'], ['cosas', '👑', 'Cosas'], ['nombre', '✏️', 'Nombre']];
const st = { editId: null, base: 'amara', spec: null, original: null, tab: 'estilo', cara: 'feliz', parte: 'blusa', yaw: 0, yawT: 0 };
const pedido = new URLSearchParams(location.search).get('p');

function cfgActual() {
  // datos mezclados (base + cambios) para saber qué está puesto
  const b = FIGURAS[st.spec.base] || FIGURAS.amara, f = st.spec.fig;
  return { ...b, ...f, c: { ...b.c, ...(f.c || {}) }, pelo: { ...(b.pelo || {}), ...(f.pelo || {}) } };
}
function empezar(id) {
  if (id && esPropio(id)) {
    const d = datosPersonaje(id);
    st.editId = id; st.spec = { nombre: d.nombre, emoji: d.emoji, base: d.base, estilo: d.estilo || estiloActual(), fig: d.fig || {} };
  } else {
    const base = id && FIGURAS[id] ? id : 'amara';
    st.editId = null;
    st.spec = { nombre: id ? 'Mi ' + info(base).name : 'Mi personaje', emoji: info(base).emoji || '⭐', base, estilo: estiloActual(), fig: {} };
  }
  // los colores que ya pintó en "Pinta tu personaje" también se copian
  const pint = P.colors?.[id];
  if (pint) st.spec.fig.c = { ...pint, ...(st.spec.fig.c || {}) };
  st.cara = P.caras?.[id] || 'feliz';
  st.original = JSON.parse(JSON.stringify(st.spec));
  $('#borrar').hidden = !st.editId;
  renderQuien(); renderTabs(); renderOpciones(); armar();
}

// ---------- vista 3D ----------
const W = crearMundo($('#mundo'), { fog: null });
const { scene, camera } = W;
W.fovFor = a => a < .8 ? 40 : 30;
const fx = chispitas(scene);
const ped = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1, .18, 40), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .35 }));
ped.position.y = -.09; ped.receiveShadow = true; scene.add(ped);
const aro = new THREE.Mesh(new THREE.TorusGeometry(.95, .03, 8, 48), new THREE.MeshStandardMaterial({ color: 0xff9bd0, emissive: 0xff7eb6, emissiveIntensity: .3 }));
aro.rotation.x = Math.PI / 2; aro.position.y = .01; scene.add(aro);
let ch = null, armando = 0, festejo = 0;
async function armar(brillo = false) {
  const n = ++armando;
  const nuevo = await crearPersonaje(vistaPrevia(st.spec), '', { estilo: st.spec.estilo, colores: false });
  if (n !== armando) return;
  if (ch) scene.remove(ch.group);
  ch = nuevo; ch.setCara && ch.setCara(st.cara);
  if (st.tab === 'ropa' || st.tab === 'cosas') ch.setTutu && ch.setTutu(false);
  scene.add(ch.group);
  encuadre();
  if (brillo) { fx.burst(new THREE.Vector3(0, 1.2, .3), 26, .6); festejo = 1.1; }
}
function encuadre() {
  const box = new THREE.Box3().setFromObject(ch.group), h = Math.max(1.6, box.max.y);
  const cerca = st.tab === 'cara' || st.tab === 'pelo';
  const ty = cerca ? h * .86 : h * .52, d = cerca ? 2.1 : h * 2.1 + .8;
  camera.position.set(0, ty + (cerca ? .05 : .25), d); camera.lookAt(0, ty, 0);
}
addEventListener('resize', () => ch && encuadre());
let arrastre = null;
$('#mundo').addEventListener('pointerdown', e => { arrastre = e.clientX; });
addEventListener('pointermove', e => { if (arrastre === null) return; st.yawT += (e.clientX - arrastre) * .012; arrastre = e.clientX; });
addEventListener('pointerup', () => { arrastre = null; });
$('#g-izq').onclick = () => { st.yawT -= .9; J.sfx('pop'); };
$('#g-der').onclick = () => { st.yawT += .9; J.sfx('pop'); };
let quieto = 0;
W.onFrame((dt, t) => {
  if (!ch) return;
  quieto = arrastre === null ? quieto + dt : 0;
  if (quieto > 3) st.yawT += dt * .35; // da vueltitas sola
  st.yaw += (st.yawT - st.yaw) * Math.min(1, dt * 6);
  ch.group.rotation.y = st.yaw;
  festejo -= dt;
  ch.update(dt, festejo > 0 ? 'festejar' : 'quieto');
  fx.update(dt);
});

// ---------- interfaz ----------
function renderQuien() {
  const propios = PERSONAJES.filter(esPropio);
  $('#quien').innerHTML = `<button class="nuevo" data-q="">➕ Nuevo</button>` +
    propios.map(id => `<button data-q="${id}" class="${st.editId === id ? 'on' : ''}"><span>${info(id).emoji}</span>${J.esc(info(id).name)} ✏️</button>`).join('') +
    humanos().filter(id => !esPropio(id)).map(id => `<button data-q="${id}" class="${!st.editId && st.spec.base === id && st.spec.nombre !== 'Mi personaje' ? 'on' : ''}"><span>${info(id).emoji}</span>${J.esc(info(id).name)}</button>`).join('');
}
function renderTabs() {
  $('#tabs').innerHTML = TABS.map(([k, ico, n]) => `<button role="tab" data-t="${k}" class="${st.tab === k ? 'on' : ''}" aria-selected="${st.tab === k}"><b>${ico}</b>${n}</button>`).join('');
}
function renderOpciones() {
  const c = cfgActual(), f = st.spec.fig, el = $('#opciones');
  if (st.tab === 'estilo') {
    el.innerHTML = Object.entries(ESTILOS).map(([k, e]) => op('estilo:' + k, e.nombre.toLowerCase(), `<span class="ico">${e.emoji}</span>`, st.spec.estilo === k)).join('');
  } else if (st.tab === 'cara') {
    el.innerHTML = Object.entries(CARAS).map(([k, e]) => op('cara:' + k, e.nombre.toLowerCase(), `<span class="ico">${e.emoji}</span>`, st.cara === k)).join('') +
      `<h3>La piel</h3>` + PIELES.map(([v, n]) => op('piel:' + v, n, `<span class="sw" style="background:${v}"></span>`, hexs(c.piel) === v)).join('') +
      `<h3>Los ojos</h3>` + OJOS.map(([v, n]) => op('ojos:' + v, n, `<span class="sw" style="background:${v}"></span>`, hexs(c.ojos) === v)).join('');
  } else if (st.tab === 'pelo') {
    el.innerHTML = Object.entries(PEINADOS).map(([k, [w, ico]]) => op('peinado:' + k, w, `<span class="ico">${ico}</span>`, c.pelo.e === k)).join('') +
      (c.pelo.e === 'trenza' ? op('larga', 'muy larga', '<span class="ico">📏</span>', !!c.pelo.larga) : '') +
      `<h3>El color del pelo</h3>` + PELO_C.map(([v, n]) => op('pelocolor:' + v, n, `<span class="sw" style="background:${v}"></span>`, hexs(c.pelo.c) === v)).join('');
  } else if (st.tab === 'ropa') {
    el.innerHTML = `<h3>Trajes</h3>` + Object.entries(TRAJES).map(([k, t]) => op('traje:' + k, t.palabra, `<span class="ico">${t.ico}</span>`, false)).join('') +
      `<h3>¿Qué se pone?</h3>` + Object.entries(ROPAS).map(([k, [w, ico]]) => op('ropa:' + k, w, `<span class="ico">${ico}</span>`, (c.ropa || 'pantalon') === k)).join('');
  } else if (st.tab === 'colores') {
    const partes = Object.keys(PARTES).filter(p => p === 'blusa' || p === 'mangas' || p === 'zapatos' || p === 'cinturon' || (p === 'vestido' && c.ropa === 'vestido') || (p === 'falda' && c.ropa === 'falda') || (p === 'pantalon' && (c.ropa === 'pantalon' || c.ropa === 'short')) ||
      (p === 'gorra' && c.gorra) || (p === 'audifonos' && c.audifonos) || (p === 'corona' && c.corona) || (p === 'logo' && c.logo) || (p === 'collar' && c.collar) || (p === 'moño' && (c.lazo || c.mono)) ||
      (p === 'lentes' && c.lentes) || (p === 'alas' && c.alitas) || (p === 'espada' && c.espada) || (p === 'capa' && c.capa) || p === 'guantes');
    if (!partes.includes(st.parte)) st.parte = partes[0];
    el.innerHTML = `<div class="chips">${partes.map(p => `<button data-parte="${p}" class="${st.parte === p ? 'on' : ''}">${PARTES[p][2]} <span class="pal" style="font-size:18px">${palabraHTML(PARTES[p][0])}</span></button>`).join('')}</div>` +
      `<div class="colores">${COLORES.map(([v, n]) => `<button data-color="${v}" aria-label="${n}" style="background:${v}" class="${hexs(st.parte === 'capa' ? c.capa : c.c[st.parte]) === v ? 'on' : ''}"></button>`).join('')}</div>`;
  } else if (st.tab === 'cosas') {
    el.innerHTML = Object.entries(COSAS).map(([k, [w, ico]]) => op('cosa:' + k, w, `<span class="ico">${ico}</span>`, k === 'botas' ? (c.botas !== undefined ? c.botas : c.ropa !== 'pantalon' && c.ropa !== 'vestido') : k === 'aretes' ? (c.aretes !== undefined ? c.aretes : !c.chico) : !!c[k])).join('') +
      (c.corona ? `<h3>La corona</h3>` + Object.entries(CORONAS).map(([k, [w, ico]]) => op('coronatipo:' + k, w, `<span class="ico">${ico}</span>`, c.corona === k)).join('') : '');
  } else if (st.tab === 'nombre') {
    el.innerHTML = `<div class="nombre"><label for="nom" class="pal">¿Cómo se llama?</label><input id="nom" maxlength="40" value="${J.esc(st.spec.nombre)}" autocomplete="off">
      <div class="pal" id="nom-sil" style="font-size:34px">${palabraHTML(st.spec.nombre)}</div>
      <button class="op" data-k="leer-nombre" style="min-height:0;flex-direction:row;gap:8px;padding:8px 14px"><span class="ico" style="font-size:26px">🔊</span><span class="pal">${palabraHTML('leer')}</span></button>
      <div class="emojis">${EMOJIS.map(e => `<button data-emoji="${e}" class="${st.spec.emoji === e ? 'on' : ''}">${e}</button>`).join('')}</div></div>`;
    const inp = $('#nom');
    inp.oninput = () => { st.spec.nombre = inp.value.trim() || 'Mi personaje'; $('#nom-sil').innerHTML = palabraHTML(st.spec.nombre); };
  }
}
const ponFig = (k, v) => { st.spec.fig[k] = v; };
const ponColor = (parte, v) => { st.spec.fig.c = { ...(st.spec.fig.c || {}), [parte]: v }; };
$('#quien').addEventListener('click', e => {
  const b = e.target.closest('[data-q]'); if (!b) return;
  J.sfx('pop'); empezar(b.dataset.q || null);
  leer(b.dataset.q ? info(b.dataset.q).name : 'nuevo', b);
});
$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-t]'); if (!b) return;
  st.tab = b.dataset.t; J.sfx('pop'); renderTabs(); renderOpciones(); if (ch) encuadre();
  const t = TABS.find(x => x[0] === st.tab); leer(t[2].toLowerCase(), b);
});
$('#opciones').addEventListener('click', e => {
  const parte = e.target.closest('[data-parte]');
  if (parte) { st.parte = parte.dataset.parte; J.sfx('pop'); renderOpciones(); leer(PARTES[st.parte][0], parte); return; }
  const col = e.target.closest('[data-color]');
  if (col) {
    const v = col.dataset.color, [nom, g] = PARTES[st.parte], cn = COLORES.find(x => x[0] === v)[1];
    if (st.parte === 'capa') ponFig('capa', v); else ponColor(st.parte, v);
    J.sparkle(); renderOpciones(); armar(true);
    leer(nom + ' ' + colorWord(cn, g), null, [nom, colorWord(cn, g)]);
    return;
  }
  const em = e.target.closest('[data-emoji]');
  if (em) { st.spec.emoji = em.dataset.emoji; J.sfx('pop'); renderOpciones(); return; }
  const b = e.target.closest('[data-k]'); if (!b) return;
  const [k, v] = b.dataset.k.split(':');
  const word = b.querySelector('.pal')?.textContent.replace(/-/g, '') || '';
  const c = cfgActual();
  if (k === 'leer-nombre') { leer(st.spec.nombre, b); return; }
  if (k === 'estilo') { st.spec.estilo = v; }
  if (k === 'cara') { st.cara = v; if (ch) { ch.setCara(v); festejo = v === 'feliz' ? 1 : 0; } renderOpciones(); leer(word, b); return; }
  if (k === 'piel') { ponFig('piel', v); if (!c.c.guantes || hexs(c.c.guantes) === hexs(c.piel)) ponColor('guantes', v); }
  if (k === 'ojos') ponFig('ojos', v);
  if (k === 'peinado') st.spec.fig.pelo = { ...(st.spec.fig.pelo || {}), e: v };
  if (k === 'larga') st.spec.fig.pelo = { ...(st.spec.fig.pelo || {}), larga: !c.pelo.larga };
  if (k === 'pelocolor') st.spec.fig.pelo = { ...(st.spec.fig.pelo || {}), c: v };
  if (k === 'traje') { const t = TRAJES[v].fig; Object.entries(t).forEach(([fk, fv]) => { if (fk === 'c') st.spec.fig.c = { ...(st.spec.fig.c || {}), ...fv }; else st.spec.fig[fk] = fv; }); }
  if (k === 'ropa') ponFig('ropa', v);
  if (k === 'cosa') {
    if (v === 'capa') ponFig('capa', c.capa ? null : '#ff7eb6');
    else if (v === 'corona') ponFig('corona', c.corona ? null : 'oro');
    else if (v === 'botas') ponFig('botas', !(c.botas !== undefined ? c.botas : c.ropa !== 'pantalon' && c.ropa !== 'vestido'));
    else if (v === 'aretes') ponFig('aretes', !(c.aretes !== undefined ? c.aretes : !c.chico));
    else ponFig(v, !c[v]);
    if (v === 'gorra' && !c.gorra && !c.c.gorra) ponColor('gorra', '#ff7eb6');
    if (v === 'audifonos' && !c.audifonos && !c.c.audifonos) ponColor('audifonos', '#ffffff');
  }
  if (k === 'coronatipo') ponFig('corona', v);
  J.sfx('pop'); renderOpciones(); armar(true); leer(word, b);
});

$('#deshacer').onclick = () => { st.spec = JSON.parse(JSON.stringify(st.original)); J.sfx('pop2'); renderOpciones(); armar(); };
$('#guardar').onclick = () => {
  const id = registrarPersonaje(st.editId, st.spec);
  P.caras = P.caras || {}; P.caras[id] = st.cara; J.save();
  st.editId = id; st.original = JSON.parse(JSON.stringify(st.spec)); $('#borrar').hidden = false;
  renderQuien(); J.cheer(); festejo = 2;
  aviso(`<div style="font-size:60px">${J.esc(st.spec.emoji)}</div><div>¡Listo, <span class="pal" style="font-size:28px">${palabraHTML(st.spec.nombre)}</span>!</div>
    <button id="jugar-con">🎮 Jugar con ${J.esc(st.spec.nombre)}</button><button id="seguir" style="background:#9a6ee0">✏️ Seguir cambiando</button>`);
  J.say(['¡Listo!', st.spec.nombre], { queue: true });
  $('#jugar-con').onclick = () => { P.players[P.two ? P.turn % 2 : 0].char = id; J.save(); location.href = 'personajes.html'; };
  $('#seguir').onclick = cerrarAviso;
};
$('#borrar').onclick = () => {
  if (!st.editId) return;
  J.pedirPin(() => { const nom = st.spec.nombre; borrarPersonaje(st.editId); J.sfx('pop2'); empezar(null); aviso(`<div>🗑️ Se borró ${J.esc(nom)}</div><button id="seguir">Bien</button>`); $('#seguir').onclick = cerrarAviso; });
};
let avisoEl = null;
function aviso(html) { cerrarAviso(); avisoEl = document.createElement('div'); avisoEl.className = 'aviso'; avisoEl.innerHTML = html; document.body.appendChild(avisoEl); }
function cerrarAviso() { if (avisoEl) { avisoEl.remove(); avisoEl = null; } }

empezar(pedido && (FIGURAS[pedido] || esPropio(pedido)) ? pedido : (esPropio(P.players[0].char) ? P.players[0].char : null));
W.start(); J.refreshMusic();
setTimeout(() => J.say('¡Vamos a crear tu personaje!'), 400);
if (PRUEBA) window.__ed = { st, empezar, armar, guardar: () => $('#guardar').click(), get ch() { return ch; }, cfgActual };
