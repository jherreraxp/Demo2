// Honda de Cuyes: estira la honda y lanza cuyes contra las torres de los loros y los lobos.
// Para aprender, cada loro o lobo tiene un letrero (vocal, sílaba o palabra) y la voz dice cuál tumbar.
// Física con matter-js (vendor/matter). Basado en el juego "Honda Andina" de la familia.
(() => {
'use strict';
const J = window.Juego, P = J.progress;
const { Engine, Bodies, Body, Composite, Events, Sleeping } = Matter;
const $ = s => document.querySelector(s);
const TEST = location.hash === '#prueba';

// ---------- mundo ----------
const W0 = 1920, H0 = 1080, SUELO = 980;
const HONDA = { x: 300, y: 745 };
const TIRO_MAX = 160, POTENCIA = 0.158, DT = 1000 / 60;
const G_PASO = 0.001 * DT * DT;

const MAT = {
  madera: { density: 0.0012, hp: 22, base: '#c98a4b', osc: '#8a5a2b', cla: '#e6b077', frag: ['#c98a4b', '#8a5a2b', '#e6b077'] },
  paja:   { density: 0.0007, hp: 9,  base: '#f2cf63', osc: '#c79a2e', cla: '#fff1a8', frag: ['#f2cf63', '#e0b23f', '#fff1a8'] },
  adobe:  { density: 0.0019, hp: 32, base: '#c96f4a', osc: '#8e4528', cla: '#e8a07c', frag: ['#c96f4a', '#8e4528', '#e8a07c'] },
  piedra: { density: 0.0032, hp: 60, base: '#9aa0a6', osc: '#676d73', cla: '#c9cdd1', frag: ['#9aa0a6', '#6b7075', '#c3c8cc'] },
};
// los cuyes que se lanzan
const CUYES = {
  cuy:      { nombre: 'Cuy',               r: 30, density: 0.0040, hab: null,       colores: ['#b8733a', '#f4ede1', '#6b3f1d'] },
  rapido:   { nombre: 'Cuy rápido',        r: 27, density: 0.0038, hab: 'rafaga',   colores: ['#f2b630', '#fff8e0', '#b07a10'], ayuda: '¡Toca para que vaya más rápido!' },
  trillizos:{ nombre: 'Cuyes trillizos',   r: 23, density: 0.0038, hab: 'triple',   colores: ['#e8a04a', '#fff8ec', '#a0601c'], ayuda: '¡Toca para que se separen en tres!' },
  pesado:   { nombre: 'Cuy grandote',      r: 38, density: 0.0080, hab: null,       colores: ['#3a3236', '#f6f0ea', '#151214'] },
};
// los que están en las torres
const BICHOS = {
  loro:  { nombre: 'loro', r: 30, hp: 8,  density: 0.0015 },
  lobo:  { nombre: 'lobo', r: 32, hp: 14, density: 0.0017 },
  jefe:  { nombre: 'lobo jefe', r: 42, hp: 30, density: 0.0020 },
};

// ---------- niveles ----------
// tipo: qué letreros tienen (vocal, sílaba o palabra); buenos: cuántos tienen la palabra que se busca
const NIVELES = [
  { nombre: 'La chacra del valle', tipo: 'vocal', buenos: 1, tiros: ['cuy', 'cuy', 'cuy'], build(b) {
      b.torre(1330, SUELO, { post: 'paja', tabla: 'madera', w: 200, h: 140, pisos: 1, bichos: [null], techo: 'loro' });
      b.torre(1690, SUELO, { post: 'madera', tabla: 'madera', w: 170, h: 120, pisos: 1, bichos: [null], techo: 'loro' });
  } },
  { nombre: 'El corral de paja', tipo: 'vocal', buenos: 1, tiros: ['cuy', 'rapido', 'cuy'], build(b) {
      b.torre(1260, SUELO, { post: 'paja', tabla: 'paja', w: 160, h: 130, pisos: 1, bichos: ['loro'], techo: null });
      b.torre(1500, SUELO, { post: 'madera', tabla: 'madera', w: 180, h: 120, pisos: 1, bichos: [null], techo: 'lobo' });
      b.torre(1750, SUELO, { post: 'paja', tabla: 'madera', w: 150, h: 110, pisos: 1, bichos: ['loro'], techo: null });
  } },
  { nombre: 'Terrazas de piedra', tipo: 'vocal', buenos: 1, tiros: ['cuy', 'trillizos', 'rapido'], build(b) {
      b.torre(1230, SUELO, { post: 'madera', tabla: 'madera', w: 160, h: 130, pisos: 2, bichos: ['loro', null], techo: null });
      b.torre(1480, SUELO, { post: 'piedra', tabla: 'madera', w: 180, h: 120, pisos: 2, bichos: ['lobo', null], techo: 'loro' });
      b.torre(1740, SUELO, { post: 'paja', tabla: 'paja', w: 150, h: 110, pisos: 1, bichos: ['loro'], techo: null });
  } },
  { nombre: 'La casa de adobe', tipo: 'silaba', buenos: 1, tiros: ['cuy', 'pesado', 'cuy'], build(b) {
      b.torre(1300, SUELO, { post: 'adobe', tabla: 'madera', w: 200, h: 140, pisos: 1, bichos: ['lobo'], techo: 'loro' });
      b.torre(1640, SUELO, { post: 'adobe', tabla: 'adobe', w: 200, h: 130, pisos: 1, bichos: ['loro'], techo: 'lobo' });
  } },
  { nombre: 'El cerro vigía', tipo: 'silaba', buenos: 1, tiros: ['trillizos', 'rapido', 'pesado', 'cuy'], build(b) {
      b.meseta(1500, 800, 460);
      b.torre(1500, 800, { post: 'madera', tabla: 'madera', w: 220, h: 140, pisos: 2, bichos: ['loro', 'lobo'], techo: 'loro' });
      b.torre(1130, SUELO, { post: 'paja', tabla: 'paja', w: 150, h: 120, pisos: 1, bichos: ['loro'], techo: null });
      b.torre(1830, SUELO, { post: 'piedra', tabla: 'madera', w: 140, h: 100, pisos: 1, bichos: ['lobo'], techo: null });
  } },
  { nombre: 'El granero', tipo: 'silaba', buenos: 1, tiros: ['rapido', 'pesado', 'trillizos'], build(b) {
      b.torre(1200, SUELO, { post: 'madera', tabla: 'madera', w: 150, h: 110, pisos: 1, bichos: [null], techo: 'loro' });
      b.torre(1460, SUELO, { post: 'piedra', tabla: 'madera', w: 240, h: 130, pisos: 3, bichos: ['lobo', 'loro', 'loro'], techo: 'lobo' });
      b.torre(1730, SUELO, { post: 'paja', tabla: 'paja', w: 160, h: 120, pisos: 2, bichos: ['loro', null], techo: 'lobo' });
  } },
  { nombre: 'Dos letreros iguales', tipo: 'silaba', buenos: 2, tiros: ['cuy', 'trillizos', 'rapido', 'pesado'], build(b) {
      b.torre(1180, SUELO, { post: 'adobe', tabla: 'madera', w: 170, h: 130, pisos: 1, bichos: ['loro'], techo: 'lobo' });
      b.torre(1460, SUELO, { post: 'madera', tabla: 'madera', w: 190, h: 130, pisos: 2, bichos: ['lobo', 'loro'], techo: null });
      b.torre(1760, SUELO, { post: 'paja', tabla: 'adobe', w: 170, h: 120, pisos: 1, bichos: ['loro'], techo: 'loro' });
  } },
  { nombre: 'El puente colgante', tipo: 'palabra', buenos: 1, tiros: ['cuy', 'rapido', 'trillizos'], build(b) {
      b.meseta(1250, 860, 220); b.meseta(1750, 820, 260);
      b.torre(1250, 860, { post: 'madera', tabla: 'madera', w: 180, h: 120, pisos: 1, bichos: ['loro'], techo: 'lobo' });
      b.bloque('paja', 1500, SUELO, 26, 200);
      b.torre(1750, 820, { post: 'piedra', tabla: 'madera', w: 200, h: 130, pisos: 1, bichos: ['lobo'], techo: 'loro' });
  } },
  { nombre: 'La fortaleza de adobe', tipo: 'palabra', buenos: 1, tiros: ['pesado', 'cuy', 'rapido', 'trillizos'], build(b) {
      b.torre(1260, SUELO, { post: 'adobe', tabla: 'adobe', w: 200, h: 140, pisos: 2, bichos: ['loro', 'lobo'], techo: 'loro' });
      b.bloque('piedra', 1420, SUELO, 30, 180);
      b.torre(1640, SUELO, { post: 'piedra', tabla: 'piedra', w: 220, h: 140, pisos: 2, bichos: ['lobo', 'loro'], techo: 'lobo' });
  } },
  { nombre: 'El mercado del pueblo', tipo: 'palabra', buenos: 2, tiros: ['trillizos', 'rapido', 'pesado', 'cuy'], build(b) {
      b.torre(1150, SUELO, { post: 'paja', tabla: 'madera', w: 160, h: 120, pisos: 1, bichos: ['loro'], techo: 'lobo' });
      b.torre(1400, SUELO, { post: 'madera', tabla: 'madera', w: 170, h: 130, pisos: 2, bichos: ['lobo', 'loro'], techo: null });
      b.torre(1650, SUELO, { post: 'adobe', tabla: 'madera', w: 170, h: 120, pisos: 1, bichos: ['loro'], techo: 'loro' });
      b.torre(1860, SUELO, { post: 'paja', tabla: 'paja', w: 120, h: 100, pisos: 1, bichos: ['lobo'], techo: null });
  } },
  { nombre: 'La cueva del lobo jefe', tipo: 'palabra', buenos: 1, tiros: ['pesado', 'trillizos', 'rapido', 'cuy'], build(b) {
      b.torre(1260, SUELO, { post: 'madera', tabla: 'madera', w: 200, h: 140, pisos: 2, bichos: ['loro', 'lobo'], techo: 'loro' });
      b.meseta(1660, 820, 380);
      b.torre(1660, 820, { post: 'piedra', tabla: 'piedra', w: 240, h: 140, pisos: 2, bichos: ['jefe', 'loro'], techo: 'lobo' });
  } },
  { nombre: 'La gran fiesta del pueblo', tipo: 'palabra', buenos: 2, tiros: ['cuy', 'trillizos', 'pesado', 'rapido', 'cuy'], build(b) {
      b.meseta(1180, 880, 220);
      b.torre(1180, 880, { post: 'adobe', tabla: 'madera', w: 180, h: 120, pisos: 2, bichos: ['loro', 'lobo'], techo: null });
      b.torre(1480, SUELO, { post: 'piedra', tabla: 'madera', w: 220, h: 130, pisos: 3, bichos: ['lobo', 'loro', 'loro'], techo: 'jefe' });
      b.torre(1780, SUELO, { post: 'paja', tabla: 'adobe', w: 180, h: 120, pisos: 2, bichos: ['loro', 'lobo'], techo: 'loro' });
  } },
];
const DESC_TIPO = { vocal: 'vocales', silaba: 'sílabas', palabra: 'palabras' };

// ---------- palabras de los letreros ----------
const VOCALES = ['a', 'e', 'i', 'o', 'u'];
const SILABAS_BASE = ['ma', 'me', 'mi', 'mo', 'mu', 'pa', 'pe', 'pi', 'po', 'pu', 'la', 'lo', 'sa', 'so', 'su', 'ta', 'te', 'no', 'na'];
function pool(tipo) {
  if (tipo === 'vocal') return VOCALES;
  if (tipo === 'silaba') { const l = J.palabras('memoria_silabas').map(w => w[0]).filter(s => s.length === 2); return l.length >= 6 ? l : SILABAS_BASE; }
  const l = J.palabras('globos').map(w => w[0]).filter(w => w.length <= 6);
  return l.length >= 6 ? l : ['gato', 'pato', 'casa', 'luna', 'sol', 'oso', 'mano', 'sopa'];
}

// ---------- estado ----------
const engine = Engine.create({ enableSleeping: true });
engine.world.gravity.y = 1;
const E = {
  estado: 'menu',   // menu | apuntar | vuelo | turno | fin
  modo: 'aprender', nivel: 0, monedas: 0,
  cola: [], activos: [], principal: null, habUsada: false,
  arrastrando: false, tiro: { ...HONDA }, turnoT: 0, quietoT: 0, victoriaT: -1, tick: 0, bannerT: 0, protegido: 0,
  objetivo: '', buenosVivos: 0, rastro: [], rastroPrev: [], sacudida: 0, sonidoT: 0,
};
let particulas = [], textos = [], porBorrar = new Set();

// ---------- construcción ----------
function crearBloque(mat, cx, abajo, w, h) {
  const m = MAT[mat];
  const b = Bodies.rectangle(cx, abajo - h / 2, w, h, { density: m.density, friction: 0.8, frictionStatic: 1.2, restitution: 0.04, slop: 0.02 });
  Object.assign(b, { tipo: 'bloque', mat, hp: m.hp * (w * h) / (24 * 150) * 0.6 + m.hp * 0.4, w, h });
  b.hpMax = b.hp; Composite.add(engine.world, b); return abajo - h;
}
let huecos = [];
function crearBicho(cx, abajo, clase) {
  const g = BICHOS[clase];
  const b = Bodies.circle(cx, abajo - g.r, g.r, { density: g.density, friction: 0.6, restitution: 0.15, frictionAir: 0.01 });
  Object.assign(b, { tipo: 'bicho', clase, hp: g.hp, hpMax: g.hp, r: g.r, parpadeo: Math.random() * 200, letrero: '', bueno: false });
  Composite.add(engine.world, b); huecos.push(b);
}
const constructor = {
  bloque: crearBloque, bicho: crearBicho,
  meseta(cx, arriba, w) {
    const h = SUELO - arriba + 40;
    const b = Bodies.rectangle(cx, arriba + h / 2, w, h, { isStatic: true, friction: 1 });
    Object.assign(b, { tipo: 'meseta', w, h }); Composite.add(engine.world, b);
  },
  torre(cx, abajo, o) {
    let base = abajo;
    for (let p = 0; p < o.pisos; p++) {
      crearBloque(o.post, cx - o.w / 2 + 12, base, 24, o.h);
      crearBloque(o.post, cx + o.w / 2 - 12, base, 24, o.h);
      if (o.bichos && o.bichos[p]) crearBicho(cx, base, o.bichos[p]);
      base = crearBloque(o.tabla, cx, base - o.h, o.w + 10, 24);
    }
    if (o.techo) crearBicho(cx, base, o.techo);
  },
};
function limpiarMundo() {
  Composite.clear(engine.world, false);
  const suelo = Bodies.rectangle(W0 / 2, SUELO + 150, 8000, 300, { isStatic: true, friction: 1 });
  suelo.tipo = 'suelo'; Composite.add(engine.world, suelo);
  particulas = []; textos = []; porBorrar.clear(); huecos = [];
}
// reparte los letreros: "buenos" tienen la palabra buscada; los demás, otras distintas
function repartirLetreros(cfg) {
  const lista = J.shuffle(pool(cfg.tipo).slice());
  E.objetivo = lista[0];
  const otras = lista.slice(1);
  const bichos = J.shuffle(huecos.slice());
  const nBuenos = E.modo === 'libre' ? bichos.length : Math.min(cfg.buenos, bichos.length);
  bichos.forEach((b, i) => {
    b.bueno = i < nBuenos;
    b.letrero = E.modo === 'libre' ? '' : b.bueno ? E.objetivo : otras[i % Math.max(1, otras.length)];
  });
  E.buenosVivos = nBuenos;
}
function cargarNivel(i) {
  limpiarMundo();
  const cfg = NIVELES[i];
  E.nivel = i; E.cola = cfg.tiros.slice(); E.activos = []; E.rastro = []; E.rastroPrev = [];
  E.victoriaT = -1; E.arrastrando = false; E.tiro = { ...HONDA };
  cfg.build(constructor);
  repartirLetreros(cfg);
  // se asienta la torre sin hacerse daño
  E.protegido = 1;
  for (let k = 0; k < 120; k++) Engine.update(engine, DT);
  Composite.allBodies(engine.world).forEach(b => { if (!b.isStatic) { Body.setVelocity(b, { x: 0, y: 0 }); Body.setAngularVelocity(b, 0); } });
  E.protegido = 30; E.estado = 'apuntar'; E.bannerT = 150;
  $('#nivel-num').textContent = i + 1;
  $('#fin').hidden = true;
  mostrarMision(); renderHud();
  decirMision();
}
function mostrarMision() {
  const m = $('#mision');
  if (E.modo === 'libre') { m.hidden = true; return; }
  m.hidden = false; $('#m-palabra').textContent = E.objetivo;
}
function decirMision() { if (E.modo === 'libre') J.say('¡Tumba a todos!'); else J.say(['Tumba al que dice', E.objetivo]); }
$('#m-say').onclick = () => decirMision();
function updatePlayer() { const p = J.player(); $('#jugador').innerHTML = `${J.CHARS[p.char]?.emoji || '⭐'} ${J.esc(p.name)} · ⭐ ${p.stars}`; }
function renderHud() {
  $('#monedas').textContent = E.monedas;
  const quedan = E.estado === 'apuntar' ? E.cola.length : E.cola.length;
  $('#cuyes').textContent = '🐹 ' + quedan;
  updatePlayer();
}

// ---------- daño y choques ----------
Events.on(engine, 'collisionStart', ev => {
  if (E.protegido > 0) return;
  for (const par of ev.pairs) {
    const a = par.bodyA.parent || par.bodyA, b = par.bodyB.parent || par.bodyB;
    const rv = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
    [a, b].forEach(h => { if (h.tipo === 'cuy') h.golpeo = true; });
    if (rv < 1.6) continue;
    impacto(a, b, rv); impacto(b, a, rv);
    if (rv > 4 && E.tick - E.sonidoT > 6) { E.sonidoT = E.tick; J.sfx('tick', Math.min(.6, rv / 20), .7 + Math.random() * .3); }
  }
});
function impacto(t, o, rv) {
  if (!(t.hp > 0)) return;
  const mo = o.isStatic ? t.mass * 3 : o.mass;
  const razon = Math.min(2.5, 2 * mo / (t.mass + mo));
  let d = (rv - 1.6) * razon * 4;
  if (o.tipo === 'cuy') d *= 1.35;
  if (t.tipo === 'bicho' && o.tipo === 'bloque') d *= 1.2;
  danar(t, d);
}
function danar(t, d) {
  if (!(t.hp > 0) || d <= 0) return;
  t.hp -= d;
  if (t.hp <= 0) destruir(t);
}
function texto(x, y, txt, color, tam = 44) { textos.push({ x, y, txt, color, vida: 80, tam }); }
function destruir(t) {
  if (porBorrar.has(t)) return;
  porBorrar.add(t);
  const x = t.position.x, y = t.position.y;
  if (t.tipo === 'bicho') {
    const col = t.clase === 'loro' ? ['#3aa655', '#d9434f', '#ffcf33'] : ['#8c95a3', '#5b616b', '#e4e8ee'];
    for (let i = 0; i < 20; i++) particula(x, y, col[i % 3], 6, 3 + Math.random() * 5);
    for (let i = 0; i < 8; i++) particula(x, y, 'rgba(255,255,255,0.8)', 3, 8 + Math.random() * 10, true);
    if (t.bueno) {
      E.buenosVivos--; E.monedas += 5;
      J.moneda(); J.festejo && J.festejo(3); J.addStar(); updatePlayer();
      texto(x, y - 40, E.modo === 'libre' ? '+5 🪙' : `¡${t.letrero}! +5 🪙`, '#ffcf33', 54);
      if (E.modo !== 'libre') J.say([t.letrero, J.pick(J.PRAISES)], { queue: true });
      else J.efecto('pop');
    } else {
      J.efecto('error');
      texto(x, y - 40, `¡Uy! Ese dice ${t.letrero}`, '#ffffff', 40);
    }
    renderHud();
  } else if (t.tipo === 'bloque') {
    const m = MAT[t.mat];
    const n = Math.min(22, 6 + Math.round((t.w * t.h) / 800));
    for (let i = 0; i < n; i++) particula(x + (Math.random() - .5) * t.w * .6, y + (Math.random() - .5) * t.h * .6, m.frag[i % 3], 5, 3 + Math.random() * 4);
    if (E.tick - E.sonidoT > 4) { E.sonidoT = E.tick; J.sfx('pop', .35, .6 + Math.random() * .4); }
  }
}
function particula(x, y, color, vel, tam, humo) {
  const a = Math.random() * Math.PI * 2, s = Math.random() * vel + 1;
  particulas.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (humo ? 1 : 3), color, tam, vida: humo ? 40 : 60 + Math.random() * 30, rot: Math.random() * 6, vr: (Math.random() - .5) * .3, humo });
}

// ---------- lanzar ----------
function crearCuy(clase, x, y, f = 1) {
  const c = CUYES[clase], r = c.r * f;
  const b = Bodies.circle(x, y, r, { density: c.density, friction: 0.5, restitution: 0.3, frictionAir: 0.002 });
  Object.assign(b, { tipo: 'cuy', clase, r, golpeo: false, quieto: 0, nace: E.tick });
  Composite.add(engine.world, b); return b;
}
function lanzar() {
  const dx = HONDA.x - E.tiro.x, dy = HONDA.y - E.tiro.y;
  if (Math.hypot(dx, dy) < 22 || !E.cola.length) { E.tiro = { ...HONDA }; return; }
  const clase = E.cola.shift();
  const b = crearCuy(clase, E.tiro.x, E.tiro.y);
  Body.setVelocity(b, { x: dx * POTENCIA, y: dy * POTENCIA });
  Body.setAngularVelocity(b, 0.15);
  E.activos = [b]; E.principal = b; E.habUsada = false; E.turnoT = 0; E.quietoT = 0;
  E.rastroPrev = E.rastro; E.rastro = [];
  E.tiro = { ...HONDA }; E.estado = 'vuelo';
  J.efecto('salto'); renderHud();
  if (CUYES[clase].ayuda) mensaje(CUYES[clase].ayuda, 1.6);
}
function usarPoder() {
  const b = E.principal; if (!b || E.habUsada || porBorrar.has(b) || b.golpeo) return;
  const hab = CUYES[b.clase].hab; if (!hab) return;
  E.habUsada = true; J.sfx('pop', .7, 1.5);
  const v = b.velocity, sp = Math.hypot(v.x, v.y) || 1;
  if (hab === 'rafaga') {
    const f = Math.max(26, sp * 2.1) / sp; Body.setVelocity(b, { x: v.x * f, y: v.y * f });
    for (let i = 0; i < 12; i++) particula(b.position.x, b.position.y, '#ffe38a', 4, 4);
  } else if (hab === 'triple') {
    const ang = Math.atan2(v.y, v.x);
    [-0.22, 0.22].forEach(da => {
      const a = ang + da, nx = -Math.sin(ang) * da * 180, ny = Math.cos(ang) * da * 180;
      const c = crearCuy('trillizos', b.position.x + nx, b.position.y + ny);
      Body.setVelocity(c, { x: Math.cos(a) * sp, y: Math.sin(a) * sp }); E.activos.push(c);
    });
    for (let i = 0; i < 10; i++) particula(b.position.x, b.position.y, '#fff8ec', 4, 4);
  }
}
function despertar() { Composite.allBodies(engine.world).forEach(o => { if (!o.isStatic && o.isSleeping) Sleeping.set(o, false); }); }

// ---------- simulación ----------
function paso() {
  E.tick++;
  if (E.protegido > 0) E.protegido--;
  Engine.update(engine, DT);
  Composite.allBodies(engine.world).forEach(b => {
    if (b.isStatic) return;
    if (b.position.y > H0 + 300 || b.position.x < -400 || b.position.x > W0 + 400) {
      if (b.tipo === 'bicho' && b.hp > 0) { b.hp = 0; destruir(b); } else porBorrar.add(b);
    }
  });
  if (porBorrar.size) {
    porBorrar.forEach(b => { Composite.remove(engine.world, b); const i = E.activos.indexOf(b); if (i >= 0) E.activos.splice(i, 1); });
    porBorrar.clear(); despertar();
  }
  particulas.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += p.humo ? -0.02 : 0.35; p.vx *= 0.98; p.rot += p.vr; p.vida--; });
  particulas = particulas.filter(p => p.vida > 0);
  textos.forEach(t => { t.y -= 0.9; t.vida--; }); textos = textos.filter(t => t.vida > 0);
  if (E.sacudida > 0) E.sacudida--;
  if (E.estado === 'vuelo') pasoVuelo();
}
function pasoVuelo() {
  E.turnoT++;
  const p = E.principal;
  if (p && !porBorrar.has(p) && E.activos.includes(p) && E.turnoT % 3 === 0 && !p.golpeo) E.rastro.push({ x: p.position.x, y: p.position.y });
  E.activos.slice().forEach(b => {
    const v = Math.hypot(b.velocity.x, b.velocity.y);
    b.quieto = v < 0.35 ? b.quieto + 1 : 0;
    if (b.quieto > 50 || E.tick - b.nace > 900) { porBorrar.add(b); for (let i = 0; i < 8; i++) particula(b.position.x, b.position.y, 'rgba(255,255,255,0.8)', 3, 10, true); }
  });
  if (E.buenosVivos <= 0) {
    if (E.victoriaT < 0) E.victoriaT = 90;
    if (--E.victoriaT <= 0) ganarNivel();
    return;
  }
  const calma = Composite.allBodies(engine.world).every(b => b.isStatic || b.isSleeping || (b.speed < 0.3 && Math.abs(b.angularVelocity) < 0.02));
  E.quietoT = (E.activos.length === 0 && calma) ? E.quietoT + 1 : 0;
  if (E.quietoT > 30 || E.turnoT > 900) finTurno();
}
function finTurno() {
  E.activos.forEach(b => porBorrar.add(b));
  if (E.buenosVivos <= 0) return;
  if (!E.cola.length) { perderNivel(); return; }
  if (P.two) {
    E.estado = 'turno';
    J.nextTurn(() => { E.estado = 'apuntar'; renderHud(); decirMision(); }, { onShow: updatePlayer });
  } else { E.estado = 'apuntar'; renderHud(); }
}

// ---------- fin de nivel ----------
function estrellasDe(sobran) { return sobran >= 2 ? 3 : sobran === 1 ? 2 : 1; }
function ganarNivel() {
  E.estado = 'fin';
  const sobran = E.cola.length, est = estrellasDe(sobran);
  E.monedas += sobran * 3;
  P.level.lanzar = Math.max(P.level.lanzar || 0, Math.min(NIVELES.length, E.nivel + 1));
  P.lanzarEstrellas = P.lanzarEstrellas || {};
  P.lanzarEstrellas[E.nivel] = Math.max(P.lanzarEstrellas[E.nivel] || 0, est);
  J.save(); J.cheer(true); J.confetti(110); renderHud();
  const ultimo = E.nivel >= NIVELES.length - 1;
  const caja = $('#fin-caja');
  caja.innerHTML = `<h2>${ultimo ? '¡Ganaste todo el pueblo!' : '¡Nivel superado!'}</h2>
    <div class="estrellas">${'⭐'.repeat(est)}${'☆'.repeat(3 - est)}</div>
    <p>Te sobraron <b>${sobran}</b> ${sobran === 1 ? 'cuy' : 'cuyes'} · 🪙 ${E.monedas}</p>
    <div class="fila"><button data-f="otra">↺ Otra vez</button>${ultimo ? '' : '<button class="si" data-f="sig">Siguiente ▶</button>'}</div>`;
  $('#fin').hidden = false;
  J.say(est === 3 ? '¡Excelente!' : J.pick(J.PRAISES), { queue: true });
}
function perderNivel() {
  E.estado = 'fin';
  const caja = $('#fin-caja');
  caja.innerHTML = `<h2>¡Casi!</h2><p>Se acabaron los cuyes.<br>${E.modo === 'libre' ? '' : `Buscábamos <b style="font-family:Andika;font-size:28px">${J.esc(E.objetivo)}</b>.`}</p>
    <div class="fila"><button class="si" data-f="otra">↺ Probar otra vez</button></div>`;
  $('#fin').hidden = false;
  J.say('Prueba otra vez');
}
$('#fin').addEventListener('click', e => {
  const b = e.target.closest('[data-f]'); if (!b) return;
  J.sfx('pop');
  if (b.dataset.f === 'otra') { cargarNivel(E.nivel); return; }
  // cada 3 niveles hay regalo
  const sig = () => cargarNivel(Math.min(E.nivel + 1, NIVELES.length - 1));
  $('#fin').hidden = true;
  if ((E.nivel + 1) % 3 === 0) J.gift(sig); else sig();
});

// ---------- entrada ----------
const cv = $('#lienzo'), ctx = cv.getContext('2d');
let dpr = 1, escala = 1, offX = 0, offY = 0;
function redimensionar() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
  escala = Math.min(innerWidth / W0, innerHeight / H0);
  offX = (innerWidth - W0 * escala) / 2; offY = innerHeight - H0 * escala;
  // en celular vertical: el mundo se ve completo de ancho y el suelo queda a media pantalla (no pegado abajo)
  if (innerHeight > innerWidth) { escala = innerWidth / (W0 * 0.97); offX = (innerWidth - W0 * escala) / 2 - W0 * escala * 0.01; offY = innerHeight * 0.7 - SUELO * escala; }
}
addEventListener('resize', redimensionar); redimensionar();
function aMundo(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left - offX) / escala, y: (e.clientY - r.top - offY) / escala }; }
function limitarTiro(p) {
  let dx = p.x - HONDA.x, dy = p.y - HONDA.y; const d = Math.hypot(dx, dy);
  if (d > TIRO_MAX) { dx *= TIRO_MAX / d; dy *= TIRO_MAX / d; }
  return { x: HONDA.x + dx, y: Math.min(HONDA.y + dy, SUELO - 34) };
}
cv.addEventListener('pointerdown', e => {
  J.audio();
  const p = aMundo(e);
  // se puede tocar en cualquier parte de la mitad izquierda: no hace falta atinarle al cuy
  if (E.estado === 'apuntar' && p.x < 1000) {
    E.arrastrando = true; E.tiro = limitarTiro(p); cv.setPointerCapture(e.pointerId); J.sfx('tick', .4, 1.3);
  } else if (E.estado === 'vuelo') usarPoder();
});
cv.addEventListener('pointermove', e => { if (E.arrastrando) E.tiro = limitarTiro(aMundo(e)); });
cv.addEventListener('pointerup', () => { if (E.arrastrando) { E.arrastrando = false; if (E.estado === 'apuntar') lanzar(); } });
cv.addEventListener('pointercancel', () => { E.arrastrando = false; E.tiro = { ...HONDA }; });
addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && E.estado === 'vuelo') { e.preventDefault(); usarPoder(); } });
function mensaje(text, secs = 1.4) {
  const el = $('#mensaje'); el.textContent = text;
  el.classList.remove('ver'); void el.offsetWidth; el.classList.add('ver');
  clearTimeout(mensaje.t); mensaje.t = setTimeout(() => el.classList.remove('ver'), secs * 1000);
}

// ---------- dibujo ----------
function azar(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = s * 16807 % 2147483647) / 2147483647; }
const FONDO = (() => {
  const r = azar(7), lejos = [], medio = [], nubes = [], llamas = [];
  for (let x = -600; x <= 2600; x += 90) lejos.push([x, 360 + r() * 220]);
  for (let x = -600; x <= 2600; x += 40) medio.push([x, 760 + Math.sin(x / 260) * 55 + Math.sin(x / 90) * 14]);
  for (let i = 0; i < 6; i++) nubes.push({ x: r() * 2400 - 200, y: 90 + r() * 220, s: 0.7 + r() * 0.8, v: 0.12 + r() * 0.2 });
  for (let i = 0; i < 3; i++) llamas.push({ x: 500 + i * 520 + r() * 200, v: 0.15 + r() * 0.2, c: ['#f6efe2', '#c99566', '#8a5a3c'][i], fase: r() * 6 });
  return { lejos, medio, nubes, llamas };
})();
function dibujarFondo() {
  const g = ctx.createLinearGradient(0, 0, 0, innerHeight);
  g.addColorStop(0, '#5ea8e0'); g.addColorStop(0.55, '#a9daf5'); g.addColorStop(1, '#fde8c4');
  ctx.fillStyle = g; ctx.fillRect(0, 0, innerWidth, innerHeight);
}
function llama(l) {
  const y = 800 + Math.sin(l.x / 260) * 30, paso = Math.sin(E.tick / 8 + l.fase) * 6;
  ctx.save(); ctx.translate(l.x, y); ctx.scale(.9, .9);
  ctx.fillStyle = l.c; ctx.strokeStyle = 'rgba(60,40,30,.35)'; ctx.lineWidth = 2;
  [[-22, paso], [-8, -paso], [12, paso], [24, -paso]].forEach(([x, d]) => { ctx.fillRect(x + d * .3, 0, 7, 34); });
  ctx.beginPath(); ctx.ellipse(0, -4, 36, 20, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillRect(22, -52, 13, 50);
  ctx.beginPath(); ctx.ellipse(34, -56, 15, 10, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(26, -63); ctx.lineTo(24, -78); ctx.lineTo(31, -64); ctx.fill();
  ctx.beginPath(); ctx.moveTo(33, -64); ctx.lineTo(33, -79); ctx.lineTo(39, -64); ctx.fill();
  ctx.fillStyle = '#1d1128'; ctx.beginPath(); ctx.arc(39, -58, 2.5, 0, 7); ctx.fill();
  // mantita de colores
  ['#d9434f', '#ffcf33', '#3aa655'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(-18 + i * 12, -24, 12, 12); });
  ctx.restore();
}
function dibujarEscenario() {
  const sg = ctx.createRadialGradient(1640, 190, 10, 1640, 190, 200);
  sg.addColorStop(0, 'rgba(255,245,200,1)'); sg.addColorStop(0.3, 'rgba(255,220,120,0.9)'); sg.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(1640, 190, 200, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff4c7'; ctx.beginPath(); ctx.arc(1640, 190, 62, 0, 7); ctx.fill();
  FONDO.nubes.forEach(n => {
    n.x += n.v; if (n.x > 2500) n.x = -400;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    [[0, 0, 50], [45, -18, 42], [90, 0, 48], [45, 12, 46]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(n.x + dx * n.s, n.y + dy * n.s, r * n.s, 0, 7); ctx.fill(); });
  });
  ctx.save();
  ctx.beginPath(); ctx.moveTo(-800, 1000);
  FONDO.lejos.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(2800, 1000); ctx.closePath();
  const mg = ctx.createLinearGradient(0, 350, 0, 900); mg.addColorStop(0, '#8d7fb8'); mg.addColorStop(1, '#b7a9d6');
  ctx.fillStyle = mg; ctx.fill(); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.beginPath(); ctx.moveTo(-800, 0);
  FONDO.lejos.forEach(([x], i) => ctx.lineTo(x, 470 + Math.sin(i * 1.7) * 18)); ctx.lineTo(2800, 0); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.moveTo(-800, 1100);
  FONDO.medio.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(2800, 1100); ctx.closePath();
  ctx.fillStyle = '#7cbf5a'; ctx.fill();
  ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(60,120,40,0.35)'; ctx.lineWidth = 4;
  for (let y = 790; y < 980; y += 34) { ctx.beginPath(); ctx.moveTo(-800, y); for (let x = -800; x < 2800; x += 60) ctx.lineTo(x, y + Math.sin(x / 200 + y) * 6); ctx.stroke(); }
  ctx.restore();
  FONDO.llamas.forEach(l => { l.x += l.v; if (l.x > 2400) l.x = -200; llama(l); });
  ctx.fillStyle = '#8b5e3c'; ctx.fillRect(-3000, SUELO, 9000, 1500);
  ctx.fillStyle = '#6f4a2e'; for (let x = -600; x < 2600; x += 70) { ctx.beginPath(); ctx.arc(x + (x % 3) * 9, SUELO + 50 + (x % 5) * 8, 6, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#5fae45'; ctx.fillRect(-3000, SUELO - 4, 9000, 22);
  ctx.fillStyle = '#4c9636'; for (let x = -600; x < 2600; x += 22) { ctx.beginPath(); ctx.moveTo(x, SUELO - 3); ctx.lineTo(x + 6, SUELO - 14 - (x % 4) * 2); ctx.lineTo(x + 11, SUELO - 3); ctx.fill(); }
}
function dibujarMeseta(b) {
  const x = b.position.x - b.w / 2, y = b.position.y - b.h / 2;
  ctx.fillStyle = '#8b5e3c'; ctx.fillRect(x, y, b.w, b.h);
  ctx.fillStyle = '#7a5134'; for (let yy = y + 40; yy < SUELO; yy += 44) ctx.fillRect(x, yy, b.w, 5);
  ctx.strokeStyle = '#5c3b22'; ctx.lineWidth = 4; ctx.strokeRect(x, y, b.w, SUELO - y);
  ctx.fillStyle = '#5fae45'; ctx.fillRect(x - 6, y - 6, b.w + 12, 20);
}
function dibujarBloque(b) {
  const m = MAT[b.mat], w = b.w, h = b.h, r = azar(b.id * 9973 + 11);
  ctx.save(); ctx.translate(b.position.x, b.position.y); ctx.rotate(b.angle);
  ctx.fillStyle = m.base; ctx.fillRect(-w / 2, -h / 2, w, h);
  if (b.mat === 'madera') {
    ctx.strokeStyle = 'rgba(120,70,30,0.45)'; ctx.lineWidth = 2;
    const largo = w > h;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      if (largo) { const yy = -h / 2 + h * i / 4; ctx.moveTo(-w / 2 + 4, yy); ctx.bezierCurveTo(-w / 6, yy + 3, w / 6, yy - 3, w / 2 - 4, yy); }
      else { const xx = -w / 2 + w * i / 4; ctx.moveTo(xx, -h / 2 + 4); ctx.bezierCurveTo(xx + 3, -h / 6, xx - 3, h / 6, xx, h / 2 - 4); }
      ctx.stroke();
    }
    ctx.fillStyle = m.cla; ctx.fillRect(-w / 2, -h / 2, w, 3);
  } else if (b.mat === 'paja') {
    ctx.strokeStyle = 'rgba(160,110,20,0.6)'; ctx.lineWidth = 2;
    const n = Math.max(3, Math.round(Math.max(w, h) / 9));
    for (let i = 0; i < n; i++) { ctx.beginPath(); const k = -0.5 + (i + .5) / n; if (w > h) { ctx.moveTo(-w / 2, k * h); ctx.lineTo(w / 2, k * h + (r() - .5) * 6); } else { ctx.moveTo(k * w, -h / 2); ctx.lineTo(k * w + (r() - .5) * 6, h / 2); } ctx.stroke(); }
  } else if (b.mat === 'adobe') {
    ctx.strokeStyle = 'rgba(110,50,25,0.5)'; ctx.lineWidth = 2;
    for (let yy = -h / 2 + 18; yy < h / 2; yy += 18) { ctx.beginPath(); ctx.moveTo(-w / 2, yy); ctx.lineTo(w / 2, yy); ctx.stroke(); }
    ctx.fillStyle = 'rgba(240,200,150,.35)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc((r() - .5) * w * .8, (r() - .5) * h * .8, 2, 0, 7); ctx.fill(); }
  } else {
    for (let i = 0; i < Math.max(3, (w * h) / 500); i++) { ctx.fillStyle = r() > 0.5 ? m.osc : m.cla; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc((r() - .5) * (w - 8), (r() - .5) * (h - 8), 2 + r() * 3, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  const dano = 1 - b.hp / b.hpMax;
  if (dano > 0.2) {
    ctx.strokeStyle = 'rgba(40,20,10,0.7)'; ctx.lineWidth = 2;
    const n = dano > 0.6 ? 3 : dano > 0.4 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      let x = (r() - .5) * w * .6, y = (r() - .5) * h * .6; ctx.beginPath(); ctx.moveTo(x, y);
      for (let s = 0; s < 4; s++) { x += (r() - .5) * Math.min(w, 40); y += (r() - .5) * Math.min(h, 40); x = Math.max(-w / 2, Math.min(w / 2, x)); y = Math.max(-h / 2, Math.min(h / 2, y)); ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }
  ctx.strokeStyle = m.osc; ctx.lineWidth = 3; ctx.strokeRect(-w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3);
  ctx.restore();
}
function ojo(x, y, r, mx, my, parpado) {
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.1, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
  const px = x + mx * r * 0.35, py = y + my * r * 0.35;
  ctx.fillStyle = '#1d1128'; ctx.beginPath(); ctx.arc(px, py, r * 0.55, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px - r * 0.18, py - r * 0.22, r * 0.18, 0, 7); ctx.fill();
  if (parpado) { ctx.fillStyle = parpado; ctx.beginPath(); ctx.ellipse(x, y - r * 0.1, r * 1.12, r * 1.02, 0, Math.PI, 0); ctx.fill(); }
}
function degradado(r, c1, c2) { const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.15); g.addColorStop(0, c1); g.addColorStop(1, c2); return g; }
// loro: verde con pecho rojo, cresta y pico amarillo
function dibLoro(r, herido, cerrado) {
  ctx.fillStyle = '#d9434f';
  [-0.5, -0.15, 0.2].forEach((k, i) => { ctx.beginPath(); ctx.ellipse(k * r, -r * 0.95, r * 0.13, r * 0.32, -0.4 + i * 0.3, 0, 7); ctx.fill(); });
  ctx.fillStyle = '#2f8f4b'; ctx.beginPath(); ctx.moveTo(-r * 0.7, r * 0.5); ctx.lineTo(-r * 1.25, r * 1.05); ctx.lineTo(-r * 0.4, r * 0.75); ctx.fill();
  ctx.fillStyle = degradado(r, '#7ee08a', '#2f8f4b'); ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(20,70,30,.5)'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = '#ff8a5b'; ctx.beginPath(); ctx.ellipse(r * 0.05, r * 0.45, r * 0.55, r * 0.42, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#3aa0e0'; ctx.beginPath(); ctx.ellipse(-r * 0.62, r * 0.1, r * 0.3, r * 0.5, 0.3, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffcf33'; ctx.strokeStyle = '#c7901a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(r * 0.55, -r * 0.12); ctx.quadraticCurveTo(r * 1.25, -r * 0.18, r * 0.95, r * 0.42); ctx.quadraticCurveTo(r * 0.8, r * 0.12, r * 0.55, r * 0.14); ctx.closePath(); ctx.fill(); ctx.stroke();
  ojo(r * 0.28, -r * 0.3, r * 0.24, 0.6, 0.1, cerrado ? '#2f8f4b' : null);
  ctx.fillStyle = 'rgba(255,120,150,.55)'; ctx.beginPath(); ctx.arc(r * 0.55, r * 0.18, r * 0.1, 0, 7); ctx.fill();
  if (herido) { ctx.fillStyle = '#fff'; ctx.font = `${r * 0.7}px serif`; ctx.fillText('💫', -r * 0.9, -r * 0.7); }
}
// lobo: gris, orejas de punta, hocico claro
function dibLobo(r, herido, cerrado, jefe) {
  const piel = jefe ? '#5b616b' : '#8c95a3';
  ctx.fillStyle = piel;
  [[-1, -0.55], [1, 0.25]].forEach(([s, x]) => { ctx.beginPath(); ctx.moveTo(x * r - r * 0.3, -r * 0.6); ctx.lineTo(x * r - r * 0.05, -r * 1.35); ctx.lineTo(x * r + r * 0.35, -r * 0.55); ctx.closePath(); ctx.fill(); });
  ctx.fillStyle = '#e4b8c0';
  [[-0.55], [0.25]].forEach(([x]) => { ctx.beginPath(); ctx.moveTo(x * r - r * 0.15, -r * 0.65); ctx.lineTo(x * r - r * 0.03, -r * 1.12); ctx.lineTo(x * r + r * 0.2, -r * 0.62); ctx.closePath(); ctx.fill(); });
  ctx.fillStyle = degradado(r, jefe ? '#8a919c' : '#c3cad4', piel); ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(30,30,40,.45)'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = '#eef1f5'; ctx.beginPath(); ctx.ellipse(r * 0.42, r * 0.3, r * 0.55, r * 0.4, 0.1, 0, 7); ctx.fill();
  ctx.fillStyle = '#1d1128'; ctx.beginPath(); ctx.ellipse(r * 0.88, r * 0.14, r * 0.15, r * 0.11, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#1d1128'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(r * 0.35, r * 0.48); ctx.quadraticCurveTo(r * 0.6, r * 0.62, r * 0.82, r * 0.44); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(r * 0.5, r * 0.52); ctx.lineTo(r * 0.56, r * 0.68); ctx.lineTo(r * 0.62, r * 0.53); ctx.fill();
  ojo(-r * 0.12, -r * 0.2, r * 0.22, 0.6, 0.1, cerrado ? piel : null);
  ojo(r * 0.38, -r * 0.24, r * 0.2, 0.6, 0.1, cerrado ? piel : null);
  if (jefe) {
    // chullo de colores
    ctx.save(); ctx.beginPath(); ctx.moveTo(-r * 0.85, -r * 0.5); ctx.quadraticCurveTo(-r * 0.8, -r * 1.35, 0, -r * 1.4); ctx.quadraticCurveTo(r * 0.8, -r * 1.35, r * 0.85, -r * 0.5); ctx.closePath();
    ctx.fillStyle = '#d9434f'; ctx.fill(); ctx.clip();
    ctx.fillStyle = '#ffcf33'; ctx.fillRect(-r, -r * 0.78, r * 2, r * 0.18); ctx.fillStyle = '#fff'; ctx.fillRect(-r, -r * 1.05, r * 2, r * 0.08);
    ctx.restore(); ctx.fillStyle = '#ffcf33'; ctx.beginPath(); ctx.arc(0, -r * 1.45, r * 0.16, 0, 7); ctx.fill();
  }
  if (herido) { ctx.font = `${r * 0.7}px serif`; ctx.fillText('💫', -r * 0.9, -r * 0.7); }
}
function dibujarBicho(b) {
  const r = b.r, herido = b.hp < b.hpMax * 0.55;
  b.parpadeo = (b.parpadeo + 1) % 240;
  const cerrado = b.parpadeo < 8;
  ctx.save(); ctx.translate(b.position.x, b.position.y); ctx.rotate(b.angle);
  if (b.clase === 'loro') dibLoro(r, herido, cerrado); else dibLobo(r, herido, cerrado, b.clase === 'jefe');
  ctx.restore();
}
// letrero de madera sobre cada uno (siempre derechito, para leerlo bien)
function dibujarLetrero(b) {
  if (!b.letrero) return;
  const x = b.position.x, y = b.position.y - b.r - 54;
  ctx.font = "700 46px Andika, 'Century Gothic', sans-serif";
  const w = Math.max(74, ctx.measureText(b.letrero).width + 34), h = 58;
  ctx.fillStyle = '#7a4a22'; ctx.fillRect(x - 4, y + h / 2 - 4, 8, b.r + 30);
  ctx.fillStyle = '#fff8e8'; ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2b1740'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(b.letrero, x, y + 2);
  ctx.textBaseline = 'alphabetic';
}
// cuyes (proyectiles): cuerpo redondito, orejitas, bigotes
function dibCuy(r, [base, blanco, osc], clase) {
  ctx.fillStyle = '#f0a8a0';
  [[-0.45, 0.82], [0.45, 0.85]].forEach(([a, b]) => { ctx.beginPath(); ctx.ellipse(a * r, b * r, r * 0.2, r * 0.12, 0, 0, 7); ctx.fill(); });
  ctx.fillStyle = base; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.15, r * 0.9, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = blanco; ctx.beginPath(); ctx.ellipse(r * 0.6, r * 0.28, r * 0.62, r * 0.72, 0.3, 0, 7); ctx.fill();
  ctx.fillStyle = osc; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.ellipse(-r * 0.6, -r * 0.35, r * 0.48, r * 0.32, -0.4, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  if (clase === 'rapido') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.5); ctx.lineTo(-r * 0.2, -r * 0.1); ctx.lineTo(-r * 0.45, -r * 0.05); ctx.lineTo(-r * 0.1, r * 0.4); ctx.lineTo(-r * 0.6, -r * 0.05); ctx.lineTo(-r * 0.35, -r * 0.1); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(60,30,10,0.55)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.15, r * 0.9, 0, 0, 7); ctx.stroke();
  ctx.fillStyle = '#e99c94'; ctx.strokeStyle = osc; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(r * 0.32, -r * 0.74, r * 0.21, r * 0.15, -0.4, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1d1128'; ctx.beginPath(); ctx.arc(r * 0.64, -r * 0.2, r * 0.16, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * 0.6, -r * 0.26, r * 0.06, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,120,150,.5)'; ctx.beginPath(); ctx.arc(r * 0.78, r * 0.12, r * 0.12, 0, 7); ctx.fill();
  ctx.fillStyle = '#e0707a'; ctx.beginPath(); ctx.arc(r * 1.08, -r * 0.02, r * 0.1, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,10,0.6)'; ctx.lineWidth = 1.5;
  [-0.15, 0, 0.15].forEach(k => { ctx.beginPath(); ctx.moveTo(r * 0.98, r * 0.06); ctx.lineTo(r * 1.42, r * (0.04 + k)); ctx.stroke(); });
  ctx.strokeStyle = '#5a2a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r * 0.92, r * 0.14, r * 0.12, 0.2, 2.2); ctx.stroke();
  if (clase === 'pesado') {
    // chullo para el grandote
    ctx.save(); ctx.translate(-r * 0.05, -r * 0.62);
    ctx.beginPath(); ctx.moveTo(-r * 0.6, 0); ctx.quadraticCurveTo(-r * 0.5, -r * 0.75, 0, -r * 0.8); ctx.quadraticCurveTo(r * 0.5, -r * 0.75, r * 0.6, 0); ctx.closePath();
    ctx.fillStyle = '#6b2fb3'; ctx.fill(); ctx.fillStyle = '#ffcf33'; ctx.fillRect(-r * 0.6, -r * 0.2, r * 1.2, r * 0.12);
    ctx.fillStyle = '#ff7eb6'; ctx.beginPath(); ctx.arc(0, -r * 0.85, r * 0.13, 0, 7); ctx.fill(); ctx.restore();
  }
}
function dibujarCuy(x, y, clase, r, vx = 1, vy = 0) {
  const t = Math.hypot(vx, vy) > 2 ? Math.max(-0.7, Math.min(0.7, Math.atan2(vy, vx))) : 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(t);
  dibCuy(r, CUYES[clase].colores, clase);
  ctx.restore();
}
function dibujarHonda(atras) {
  const bx = HONDA.x, tipI = { x: bx - 26, y: HONDA.y - 6 }, tipD = { x: bx + 26, y: HONDA.y - 12 };
  if (atras) {
    ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 22; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx, SUELO); ctx.lineTo(bx, HONDA.y + 70); ctx.stroke();
    ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(bx, HONDA.y + 75); ctx.quadraticCurveTo(bx + 20, HONDA.y + 30, tipD.x, tipD.y); ctx.stroke();
    if (E.estado === 'apuntar') { ctx.strokeStyle = '#4a2a14'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(tipD.x, tipD.y); ctx.lineTo(E.tiro.x + 10, E.tiro.y); ctx.stroke(); }
  } else {
    if (E.estado === 'apuntar') { ctx.strokeStyle = '#5a3319'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(tipI.x, tipI.y); ctx.lineTo(E.tiro.x - 10, E.tiro.y); ctx.stroke(); }
    ctx.strokeStyle = '#8a5429'; ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx, HONDA.y + 75); ctx.quadraticCurveTo(bx - 20, HONDA.y + 30, tipI.x, tipI.y); ctx.stroke();
    ['#d9434f', '#ffcf33', '#3aa655', '#6b2fb3'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(bx - 11, HONDA.y + 100 + i * 12, 22, 7); });
  }
}
function dibujarTrayectoria() {
  const dx = HONDA.x - E.tiro.x, dy = HONDA.y - E.tiro.y;
  if (Math.hypot(dx, dy) < 22) return;
  let x = E.tiro.x, y = E.tiro.y, vx = dx * POTENCIA, vy = dy * POTENCIA;
  for (let i = 1; i <= 75; i++) {
    vx *= 0.998; vy = vy * 0.998 + G_PASO; x += vx; y += vy;
    if (y > SUELO) break;
    if (i % 5 === 0) { const a = 1 - i / 80; ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.arc(x, y, 7 * a + 3, 0, 7); ctx.fill(); }
  }
}
function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  dibujarFondo();
  const sx = E.sacudida > 0 ? (Math.random() - .5) * E.sacudida : 0;
  ctx.setTransform(dpr * escala, 0, 0, dpr * escala, dpr * (offX + sx), dpr * offY);
  dibujarEscenario();
  [[E.rastroPrev, 0.35], [E.rastro, 0.9]].forEach(([l, a]) => { ctx.fillStyle = `rgba(255,255,255,${a})`; l.forEach((p, i) => { ctx.beginPath(); ctx.arc(p.x, p.y, i % 2 ? 3 : 5, 0, 7); ctx.fill(); }); });
  const cuerpos = Composite.allBodies(engine.world);
  cuerpos.forEach(b => { if (b.tipo === 'meseta') dibujarMeseta(b); });
  if (E.estado !== 'menu') {
    dibujarHonda(true);
    const cola = E.estado === 'apuntar' ? E.cola.slice(1) : E.cola;
    cola.forEach((c, i) => { const r = CUYES[c].r * 0.85; dibujarCuy(215 - i * 70, SUELO - r + Math.sin(E.tick / 10 + i) * 2, c, r); });
  }
  cuerpos.forEach(b => { if (b.tipo === 'bloque') dibujarBloque(b); });
  cuerpos.forEach(b => { if (b.tipo === 'bicho') dibujarBicho(b); });
  cuerpos.forEach(b => { if (b.tipo === 'bicho') dibujarLetrero(b); });
  cuerpos.forEach(b => { if (b.tipo === 'cuy') dibujarCuy(b.position.x, b.position.y, b.clase, b.r, b.velocity.x, b.velocity.y); });
  if (E.estado === 'apuntar' && E.cola.length) {
    if (E.arrastrando) dibujarTrayectoria();
    dibujarCuy(E.tiro.x, E.tiro.y, E.cola[0], CUYES[E.cola[0]].r, HONDA.x - E.tiro.x + 0.01, HONDA.y - E.tiro.y);
    if (!E.arrastrando && E.tick % 120 < 60) {
      // manito que enseña a estirar la honda
      ctx.font = '64px serif'; ctx.fillText('👆', HONDA.x - 110 - (E.tick % 60), HONDA.y + 60 + (E.tick % 60) * .4);
    }
  }
  if (E.estado !== 'menu') dibujarHonda(false);
  particulas.forEach(p => {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.vida / 40)); ctx.fillStyle = p.color;
    if (p.humo) { ctx.beginPath(); ctx.arc(p.x, p.y, p.tam * (1.6 - p.vida / 40), 0, 7); ctx.fill(); }
    else { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.tam / 2, -p.tam / 2, p.tam, p.tam); ctx.restore(); }
  });
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  textos.forEach(t => {
    ctx.globalAlpha = Math.min(1, t.vida / 25); ctx.font = `800 ${t.tam}px 'Baloo 2', sans-serif`;
    ctx.strokeStyle = '#2b1740'; ctx.lineWidth = 7; ctx.strokeText(t.txt, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(t.txt, t.x, t.y);
  });
  ctx.globalAlpha = 1;
  if (E.bannerT > 0 && E.estado !== 'menu') {
    ctx.globalAlpha = Math.min(1, E.bannerT / 30); ctx.font = "800 64px 'Baloo 2', sans-serif";
    ctx.strokeStyle = '#2b1740'; ctx.lineWidth = 10; ctx.fillStyle = '#ffcf33';
    ctx.strokeText(`Nivel ${E.nivel + 1}`, W0 / 2, 330); ctx.fillText(`Nivel ${E.nivel + 1}`, W0 / 2, 330);
    ctx.font = "700 40px 'Baloo 2', sans-serif"; ctx.fillStyle = '#fff'; ctx.lineWidth = 8;
    ctx.strokeText(NIVELES[E.nivel].nombre, W0 / 2, 385); ctx.fillText(NIVELES[E.nivel].nombre, W0 / 2, 385);
    ctx.globalAlpha = 1;
  }
}
let ultimo = performance.now(), acum = 0;
function bucle(t) {
  acum += Math.min(100, t - ultimo); ultimo = t;
  let n = 0;
  while (acum >= DT && n < 4) {
    if (E.estado === 'apuntar' || E.estado === 'vuelo' || E.estado === 'turno') paso();
    else { E.tick++; particulas.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.vida--; }); particulas = particulas.filter(p => p.vida > 0); }
    acum -= DT; n++;
  }
  if (E.bannerT > 0) E.bannerT--;
  render();
  requestAnimationFrame(bucle);
}

// ---------- portada ----------
function empezar(i, modo = E.modo) {
  E.modo = modo;
  $('#portada').hidden = true;
  J.audio(); J.startMusic();
  const go = () => cargarNivel(i);
  if (P.two) J.showTurn(go, { onShow: updatePlayer }); else go();
}
(async () => {
  await J.ready;
  updatePlayer(); renderHud();
  const unlocked = Math.min(NIVELES.length, (P.level.lanzar || 0) + 1);
  let sel = unlocked - 1;
  const est = P.lanzarEstrellas || {};
  const box = $('#niveles');
  const desc = () => { const n = NIVELES[sel]; $('#nivel-desc').textContent = `${n.nombre} · ${E.modo === 'libre' ? 'solo jugar' : DESC_TIPO[n.tipo]}`; };
  box.innerHTML = NIVELES.map((n, i) => `<button data-i="${i}" title="${n.nombre}" ${i >= unlocked ? 'disabled aria-label="Nivel bloqueado"' : ''} class="${i === sel ? 'on' : ''}">${i < unlocked ? i + 1 : '🔒'}${est[i] ? `<small style="display:block;font-size:10px;line-height:1">${'⭐'.repeat(est[i])}</small>` : ''}</button>`).join('');
  box.onclick = e => { const b = e.target.closest('[data-i]'); if (!b || b.disabled) return; sel = +b.dataset.i; [...box.children].forEach((c, k) => c.classList.toggle('on', k === sel)); desc(); J.sfx('pop'); };
  $('#modos').onclick = e => { const b = e.target.closest('[data-modo]'); if (!b) return; E.modo = b.dataset.modo; [...$('#modos').children].forEach(c => c.classList.toggle('on', c === b)); desc(); J.sfx('pop'); };
  desc();
  const go = $('#empezar'); go.disabled = false; go.textContent = '▶ ¡A lanzar!';
  go.onclick = () => empezar(sel);
  J.refreshMusic && J.refreshMusic();
  requestAnimationFrame(bucle);
  if (TEST) {
    window.__l = {
      E, NIVELES, engine, empezar, cargarNivel,
      // lanza con un ángulo (grados, hacia arriba) y fuerza (0 a 1)
      lanzarCon(ang, fuerza = 1) {
        if (E.estado !== 'apuntar') return false;
        const a = ang * Math.PI / 180, d = TIRO_MAX * Math.max(0, Math.min(1, fuerza));
        E.tiro = limitarTiro({ x: HONDA.x - Math.cos(a) * d, y: HONDA.y + Math.sin(a) * d }); lanzar(); return true;
      },
      // adelanta la física n pasos sin esperar (para pruebas)
      avanzar(n = 300) { for (let k = 0; k < n && (E.estado === 'vuelo' || E.estado === 'apuntar'); k++) paso(); return E.estado; },
      bichos: () => Composite.allBodies(engine.world).filter(b => b.tipo === 'bicho').map(b => ({ x: b.position.x, y: b.position.y, letrero: b.letrero, bueno: b.bueno, clase: b.clase })),
    };
    empezar(0, 'aprender');
  }
})();
})();
