// Personajes estilo "minifigura de bloques" (diseños originales del juego).
// Minifiguras: pies, piernas que giran en la cadera, torso trapecio, brazos con manos en "C",
// cabeza cilíndrica con botón arriba y peinados de pieza. Animales armados con bloques.
// crearPersonaje(id) → { group, update(dt, modo, extra), parts, setPose(nombre), setTutu(bool) }
//   modos: 'quieto' | 'correr' | 'festejar' | 'bailar' | 'ballet' | 'saludar'
import * as THREE from 'three';

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .38, metalness: 0, ...o });
function mesh(geo, m, x = 0, y = 0, z = 0) { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; return me; }
const tagger = parts => (m, part) => { m.userData.part = part; (parts[part] = parts[part] || []).push(m); return m; };
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
// prisma trapecio (torso de minifigura): ancho arriba, ancho abajo, alto, profundidad
function trap(wt, wb, h, d) {
  const g = new THREE.CylinderGeometry(wt / Math.SQRT2, wb / Math.SQRT2, h, 4, 1);
  g.rotateY(Math.PI / 4); g.scale(1, 1, d / ((wt + wb) / 2)); return g;
}
const stud = (r = .07, h = .05) => new THREE.CylinderGeometry(r, r, h, 16);

// ---------- personajes ----------
// colores de cada parte; "pelo" = estilo de pieza de pelo
export const FIGURAS = {
  nieve:    { nombre: 'Princesa Nieve', piel: 0xffe0c8, pelo: { c: 0xf6efd9, e: 'trenza' }, ropa: 'vestido', corona: 'hielo', capa: 0xd6f2ff,
              c: { blusa: 0x8fd3f4, vestido: 0x8fd3f4, mangas: 0xd6f2ff, guantes: 0xd6f2ff, cinturon: 0xffffff, zapatos: 0xcff3ff, corona: 0xd8f7ff, collar: 0xffffff } },
  ana:      { nombre: 'Princesa Ana', piel: 0x8d5a3b, pelo: { c: 0x2b1b14, e: 'afro' }, ropa: 'vestido', corona: 'oro', mono: true,
              c: { blusa: 0xf6c33b, vestido: 0xf6c33b, mangas: 0xfff1b8, guantes: 0xffffff, cinturon: 0xef5b8a, 'moño': 0xef5b8a, zapatos: 0xef5b8a, corona: 0xffd23f, collar: 0xffffff } },
  estrella: { nombre: 'Estrella Pop', piel: 0xf3cfae, pelo: { c: 0x8a5bd8, e: 'trenza', larga: true }, ropa: 'falda', corona: 'estrella', microfono: true,
              c: { blusa: 0xffffff, falda: 0xffffff, mangas: 0xffffff, guantes: 0xf3cfae, cinturon: 0xe0b84a, pantalon: 0xf3cfae, zapatos: 0xffffff, corona: 0xffd23f, collar: 0xe0b84a } },
  zoe:      { nombre: 'Zoe', piel: 0xf3cfae, pelo: { c: 0x1d1d2b, e: 'mono' }, ropa: 'pantalon', gorra: false,
              c: { blusa: 0xffffff, mangas: 0xffffff, guantes: 0xf3cfae, cinturon: 0xe0b84a, pantalon: 0xffffff, zapatos: 0xe0b84a, collar: 0xe0b84a } },
  mira:     { nombre: 'Mira', piel: 0xf0c8a6, pelo: { c: 0xe8384f, e: 'coletas' }, ropa: 'falda',
              c: { blusa: 0xffffff, falda: 0xffffff, mangas: 0xffffff, guantes: 0xf0c8a6, cinturon: 0xe0b84a, pantalon: 0xf0c8a6, zapatos: 0xe0b84a, collar: 0xe0b84a } },
  raton:    { nombre: 'Ratoncito Pipo', piel: 0xa7afb9, cabeza: 'raton', ropa: 'pantalon',
              c: { blusa: 0xef5b5b, mangas: 0xa7afb9, guantes: 0xffffff, pantalon: 0x3f8ee8, zapatos: 0xffd23f, orejas: 0xffb6c8, cinturon: 0x3f8ee8 } },
  rojito:   { nombre: 'Monstruito Rojo', piel: 0xe8303c, cabeza: 'monstruo', ropa: 'pantalon', peludo: true,
              c: { blusa: 0xe8303c, mangas: 0xe8303c, guantes: 0xe8303c, pantalon: 0xe8303c, zapatos: 0xff9a2b, nariz: 0xff9a2b, cinturon: 0xe8303c } },
};
const ANIMALES = {
  llama: { nombre: 'Llamita Lula', c: { pelaje: 0xf6efe2, panza: 0xffffff, orejas: 0xf6efe2, nariz: 0xe8d9c3, manta: 0xe63946, pompones: 0xff5d8f }, tipo: 'llama' },
  zorro: { nombre: 'Zorrito', c: { pelaje: 0xf08a3c, panza: 0xffffff, orejas: 0xf08a3c, nariz: 0xffffff, cola: 0xffffff }, tipo: 'zorro' },
  lobo:  { nombre: 'Lobito', c: { pelaje: 0x8c95a3, panza: 0xe4e8ee, orejas: 0x6c7480, nariz: 0xe4e8ee, cola: 0x8c95a3 }, tipo: 'lobo' },
  toro:  { nombre: 'Torito', c: { pelaje: 0x8a5a3c, panza: 0xd8b48f, orejas: 0x8a5a3c, nariz: 0xf3b6a4, cuernos: 0xfff4dc, cola: 0x5a3a24 }, tipo: 'toro' },
};
export const PERSONAJES = ['nieve', 'ana', 'estrella', 'zoe', 'mira', 'llama', 'rojito', 'raton', 'zorro', 'lobo', 'toro'];
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

// ---------- minifigura ----------
function cara(head, r, y, opts = {}) {
  const black = mat(0x1d2233, { roughness: .2 });
  const eyes = [-1, 1].map(sx => {
    const e = mesh(new THREE.CapsuleGeometry(opts.grandes ? .045 : .028, opts.grandes ? .05 : .04, 4, 8), black, sx * r * .38, y + .03, r * .96);
    head.add(e);
    if (opts.grandes) { const w = mesh(new THREE.SphereGeometry(.07, 12, 8), mat(0xffffff), sx * r * .38, y + .03, r * .9); head.add(w); }
    const hl = mesh(new THREE.SphereGeometry(.012, 6, 4), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: .7 }), sx * r * .38 + .012, y + .055, r * 1.0 + (opts.grandes ? .03 : 0)); head.add(hl);
    if (opts.pestanas) { const l = mesh(box(.05, .01, .01), black, sx * r * .46, y + .085, r * .95); l.rotation.z = -sx * .5; head.add(l); }
    return e;
  });
  const smile = mesh(new THREE.TorusGeometry(.055, .012, 6, 16, Math.PI), mat(opts.boca || 0xb3243f), 0, y - .06, r * .97); smile.rotation.z = Math.PI; head.add(smile);
  if (opts.mejillas !== false) [-1, 1].forEach(sx => { const c = mesh(new THREE.CircleGeometry(.03, 12), mat(0xff8fab, { transparent: true, opacity: .6 }), sx * r * .62, y - .04, r * .9); c.rotation.y = sx * .6; head.add(c); });
  eyes.cara = expresiones(head, { eyes, ex: r * .38, ey: y + .03, z: r * .97, my: y - .06, smile, boca: opts.boca || 0xb3243f, s: opts.grandes ? 1.4 : 1 });
  return eyes;
}
// ---------- caritas: feliz, triste, llora, enojada, sorpresa ----------
export const CARAS = {
  feliz:    { nombre: 'Feliz', emoji: '😊' },
  triste:   { nombre: 'Triste', emoji: '😢' },
  llora:    { nombre: 'Llora', emoji: '😭' },
  enojada:  { nombre: 'Enojada', emoji: '😠' },
  sorpresa: { nombre: 'Sorpresa', emoji: '😮' },
};
function expresiones(head, { eyes, ex, ey, z, my, smile = null, boca = 0xb3243f, s = 1 }) {
  const black = mat(0x1d2233, { roughness: .3 });
  const brows = [-1, 1].map(sx => { const b = mesh(box(.075 * s, .016, .012), black, sx * ex, ey + .075 * s, z + .006); b.visible = false; head.add(b); return b; });
  const mouths = {};
  if (smile) {
    mouths.feliz = smile;
    const sad = mesh(new THREE.TorusGeometry(.045, .012, 6, 16, Math.PI), mat(boca), 0, my - .035, z); head.add(sad); mouths.triste = sad;
    const o = mesh(new THREE.CircleGeometry(.05, 16), mat(0x5a1a2a), 0, my - .015, z + .004); o.scale.set(.8, 1.1, 1); head.add(o); mouths.abierta = o;
    const flat = mesh(box(.08, .014, .01), mat(boca), 0, my - .02, z + .004); head.add(flat); mouths.plana = flat;
  }
  const tearMat = mat(0x7fd3ff, { transparent: true, opacity: .85, emissive: 0x2a8ad8, emissiveIntensity: .3 });
  const tears = [-1, 1].map(sx => { const t = mesh(new THREE.SphereGeometry(.026 * s, 10, 8), tearMat, sx * (ex + .01), ey - .04, z + .01); t.scale.y = 1.5; t.visible = false; head.add(t); return t; });
  let cur = 'feliz', t = 0;
  const BOCA = { feliz: 'feliz', triste: 'triste', llora: 'abierta', enojada: 'plana', sorpresa: 'abierta' };
  function set(name) {
    cur = CARAS[name] ? name : 'feliz';
    Object.entries(mouths).forEach(([k, m]) => { m.visible = k === BOCA[cur]; });
    brows.forEach((b, i) => {
      const sx = i ? 1 : -1;
      b.visible = cur !== 'feliz';
      b.rotation.z = cur === 'enojada' ? sx * .5 : (cur === 'triste' || cur === 'llora') ? -sx * .4 : 0;
      b.position.y = ey + (cur === 'sorpresa' ? .1 : cur === 'enojada' ? .06 : .075) * s;
    });
    tears.forEach(tr => { tr.visible = cur === 'llora'; });
  }
  set('feliz');
  return {
    set, get actual() { return cur; },
    update(dt, closed) {
      t += dt;
      const k = { feliz: 1, triste: .8, llora: .3, enojada: .55, sorpresa: 1.35 }[cur];
      eyes.forEach(e => { e.scale.y = closed ? .2 : k; e.scale.x = cur === 'sorpresa' ? 1.2 : 1; });
      if (cur === 'llora') tears.forEach((tr, i) => { const ph = (t * 1.3 + i * .5) % 1; tr.position.y = ey - .04 - ph * .16; tr.scale.setScalar(1 - ph * .4); tr.scale.y *= 1.5; });
      if (cur === 'enojada') head.rotation.z = Math.sin(t * 18) * .03;
      else if (cur === 'llora') head.rotation.z = Math.sin(t * 9) * .04;
    },
  };
}
function minifig(id) {
  const cfg = FIGURAS[id];
  const C = cfg.c;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const parts = {}, tag = tagger(parts);
  const piel = () => mat(cfg.piel, cfg.peludo ? { roughness: .9 } : {});
  // piernas (giran en la cadera)
  const legs = [-1, 1].map(sx => {
    const hip = new THREE.Group(); hip.position.set(sx * .105, .58, 0); body.add(hip);
    hip.add(tag(mesh(box(.2, .46, .24), mat(C.pantalon || 0x3f8ee8), 0, -.25, 0), 'pantalon'));
    hip.add(tag(mesh(box(.2, .1, .3), mat(C.zapatos), 0, -.53, .03), 'zapatos'));
    return hip;
  });
  body.add(tag(mesh(box(.42, .12, .24), mat(C.cinturon || C.pantalon), 0, .62, 0), 'cinturon'));
  // vestido largo / falda corta / tutú de ballet
  let vestido = null, tutu = null;
  if (cfg.ropa === 'vestido') {
    const pts = [[0, 0], [.48, 0], [.46, .06], [.34, .4], [.25, .62], [0, .62]].map(([x, y]) => new THREE.Vector2(x, y));
    vestido = tag(mesh(new THREE.LatheGeometry(pts, 4), mat(C.vestido)), 'vestido');
    vestido.rotation.y = Math.PI / 4; vestido.scale.z = .75; vestido.position.y = .02; body.add(vestido);
    legs.forEach(l => { l.visible = false; });
  } else if (cfg.ropa === 'falda') {
    const f = tag(mesh(new THREE.CylinderGeometry(.24, .34, .2, 4, 1, true), mat(C.falda, { side: THREE.DoubleSide }), 0, .5, 0), 'falda');
    f.rotation.y = Math.PI / 4; f.scale.z = .8; body.add(f);
  }
  {
    // tutú (se muestra en el ballet)
    tutu = new THREE.Group(); tutu.visible = false; body.add(tutu);
    for (let k = 0; k < 3; k++) { const t = tag(mesh(new THREE.CylinderGeometry(.24, .5 - k * .06, .06, 24, 1, true), mat(C.vestido || C.falda || C.blusa, { side: THREE.DoubleSide, transparent: true, opacity: .85 }), 0, .6 - k * .04, 0), cfg.ropa === 'vestido' ? 'vestido' : 'falda'); tutu.add(t); }
  }
  // torso
  const torso = tag(mesh(trap(.4, .5, .5, .25), mat(C.blusa)), 'blusa'); torso.position.y = .93; body.add(torso);
  if (cfg.chaqueta) [-1, 1].forEach(sx => body.add(tag(mesh(box(.12, .48, .27), mat(C.chaqueta), sx * .17, .93, 0), 'chaqueta')));
  // detalle dorado de cantante (cuello en V y botones)
  if (C.collar) { const col = tag(mesh(new THREE.TorusGeometry(.1, .02, 6, 18, Math.PI), mat(C.collar, { metalness: .4, roughness: .3 }), 0, 1.13, .13), 'collar'); col.rotation.z = Math.PI; body.add(col); }
  if (cfg.mono) body.add(tag(mesh(new THREE.TorusKnotGeometry(.045, .018, 30, 6), mat(C['moño']), 0, 1.08, .14), 'moño'));
  if (cfg.capa) { const capa = tag(mesh(new THREE.PlaneGeometry(.55, 1.05), mat(cfg.capa, { transparent: true, opacity: .75, side: THREE.DoubleSide, emissive: 0x9fdcff, emissiveIntensity: .2 }), 0, .62, -.16), 'capa'); capa.rotation.x = .12; body.add(capa); }
  // brazos con mano en "C"
  const arms = [-1, 1].map(sx => {
    const sh = new THREE.Group(); sh.position.set(sx * .24, 1.1, 0); body.add(sh);
    const arm = tag(mesh(new THREE.CylinderGeometry(.065, .075, .36, 12), mat(C.mangas || C.blusa), 0, -.17, 0), 'mangas'); arm.rotation.z = sx * .12; sh.add(arm);
    const hand = tag(mesh(new THREE.TorusGeometry(.055, .028, 8, 16, Math.PI * 1.45), mat(C.guantes || cfg.piel)), cfg.c.guantes && cfg.c.guantes !== cfg.piel ? 'guantes' : 'piel');
    hand.position.set(sx * .03, -.38, .02); hand.rotation.set(Math.PI / 2, 0, Math.PI * .28); sh.add(hand);
    sh.rotation.z = sx * .08;
    return sh;
  });
  if (cfg.microfono) {
    const mic = new THREE.Group(); mic.position.set(.03, -.4, .05);
    mic.add(mesh(new THREE.CylinderGeometry(.022, .018, .16, 10), mat(0x2b2b38)));
    mic.add(mesh(new THREE.SphereGeometry(.04, 12, 8), mat(0xc9ccd6, { metalness: .6, roughness: .3 }), 0, .1, 0));
    mic.rotation.x = -.5; arms[1].add(mic);
  }
  // cuello y cabeza
  body.add(mesh(new THREE.CylinderGeometry(.08, .08, .06, 14), piel(), 0, 1.2, 0));
  const head = new THREE.Group(); head.position.y = 1.4; body.add(head);
  const R = .2;
  let eyes;
  if (cfg.cabeza === 'raton') {
    head.add(tag(mesh(new THREE.CylinderGeometry(R, R, .34, 24), piel()), 'piel'));
    head.add(mesh(stud(.1, .06), piel(), 0, .2, 0));
    const sn = tag(mesh(new THREE.SphereGeometry(.09, 12, 8), mat(0xe9e0d6), 0, -.06, .19), 'panza'); sn.scale.set(1.3, .8, .7); head.add(sn);
    head.add(tag(mesh(new THREE.SphereGeometry(.035, 8, 6), mat(0xff7eb6), 0, -.03, .26), 'nariz'));
    [-1, 1].forEach(sx => { const ear = tag(mesh(new THREE.CylinderGeometry(.16, .16, .04, 20), piel(), sx * .22, .22, -.02), 'piel'); ear.rotation.x = Math.PI / 2; head.add(ear);
      const inn = tag(mesh(new THREE.CylinderGeometry(.1, .1, .02, 18), mat(C.orejas), sx * .22, .22, .01), 'orejas'); inn.rotation.x = Math.PI / 2; head.add(inn); });
    eyes = cara(head, R, .04, { boca: 0x6b2b3a });
  } else if (cfg.cabeza === 'monstruo') {
    head.add(tag(mesh(new THREE.CylinderGeometry(R + .02, R + .02, .36, 24), piel()), 'piel'));
    for (let i = 0; i < 6; i++) { const tuft = tag(mesh(new THREE.ConeGeometry(.05, .12, 6), piel(), Math.cos(i) * .12, .22, Math.sin(i) * .1), 'piel'); tuft.rotation.z = Math.cos(i) * .4; head.add(tuft); }
    head.add(tag(mesh(new THREE.SphereGeometry(.07, 12, 8), mat(C.nariz), 0, -.02, R + .04), 'nariz'));
    eyes = cara(head, R + .02, .09, { grandes: true, boca: 0x5a0d15, mejillas: false });
  } else {
    head.add(tag(mesh(new THREE.CylinderGeometry(R, R, .34, 28), piel()), 'piel'));
    head.add(mesh(stud(.1, .06), piel(), 0, .2, 0));
    eyes = cara(head, R, 0, { pestanas: true });
    pelo(head, cfg, tag);
  }
  // corona
  if (cfg.corona === 'hielo') [[-.08, .14], [0, .2], [.08, .14]].forEach(([x, h]) => head.add(tag(mesh(new THREE.ConeGeometry(.035, h, 6), mat(C.corona, { emissive: 0x9fe6ff, emissiveIntensity: .6, transparent: true, opacity: .9 }), x, .34 + h / 2, .08), 'corona')));
  if (cfg.corona === 'oro') { head.add(tag(mesh(new THREE.CylinderGeometry(.13, .14, .07, 16, 1, true), mat(C.corona, { metalness: .5, roughness: .3, side: THREE.DoubleSide }), 0, .42, 0), 'corona')); [-2, -1, 0, 1, 2].forEach(i => head.add(tag(mesh(new THREE.ConeGeometry(.025, .08, 6), mat(C.corona, { metalness: .5 }), Math.sin(i * .6) * .13, .49, Math.cos(i * .6) * .13), 'corona'))); }
  if (cfg.corona === 'estrella') head.add(tag(mesh(new THREE.OctahedronGeometry(.06), mat(C.corona, { metalness: .5, roughness: .3, emissive: 0x6b5200, emissiveIntensity: .3 }), .17, .28, .1), 'corona'));
  return animarMinifig({ root, body, head, arms, legs, eyes, parts, vestido, tutu, braids: head.userData.braids || [] });
}
function pelo(head, cfg, tag) {
  const H = () => mat(cfg.pelo.c, { roughness: .45 });
  const cap = tag(mesh(new THREE.SphereGeometry(.235, 24, 14, 0, Math.PI * 2, 0, Math.PI * .5), H(), 0, .1, -.01), 'pelo'); cap.scale.y = .85; head.add(cap);
  // flequillo
  const bangs = tag(mesh(new THREE.CylinderGeometry(.215, .215, .09, 24, 1, true, -Math.PI * .45, Math.PI * .9), H(), 0, .13, 0), 'pelo'); bangs.material.side = THREE.DoubleSide; head.add(bangs);
  const back = tag(mesh(new THREE.CylinderGeometry(.225, .235, .34, 24, 1, true, Math.PI * .55, Math.PI * .9), H(), 0, -.02, 0), 'pelo'); back.material.side = THREE.DoubleSide; head.add(back);
  const braids = [];
  const chain = (x, y, z, n, r0, ang = 0) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.z = ang; head.add(g); braids.push(g);
    let node = g;
    for (let i = 0; i < n; i++) { const s = new THREE.Group(); s.position.y = i ? -.085 : 0; const sp = tag(mesh(new THREE.SphereGeometry(r0 - i * .003, 12, 8), H(), 0, -.04, 0), 'pelo'); sp.scale.set(1, 1.2, .9); s.add(sp); node.add(s); node = s; }
    return g;
  };
  const e = cfg.pelo.e;
  if (e === 'trenza') chain(0, -.05, -.24, cfg.pelo.larga ? 12 : 9, .075);
  if (e === 'coletas') { chain(-.2, .2, -.08, 12, .08, .35); chain(.2, .2, -.08, 12, .08, -.35); [-1, 1].forEach(sx => head.add(tag(mesh(new THREE.TorusGeometry(.05, .02, 6, 12), mat(0xe0b84a), sx * .2, .21, -.08), 'moño'))); }
  if (e === 'afro') { [-1, 1].forEach(sx => head.add(tag(mesh(new THREE.SphereGeometry(.13, 16, 12), H(), sx * .2, .25, -.03), 'pelo'))); const b = tag(mesh(new THREE.SphereGeometry(.27, 20, 14), H(), 0, .06, -.07), 'pelo'); b.scale.set(1, .95, .85); head.add(b); }
  if (e === 'mono') { head.add(tag(mesh(new THREE.SphereGeometry(.11, 16, 12), H(), 0, .3, -.1), 'pelo')); const bob = tag(mesh(new THREE.CylinderGeometry(.24, .26, .2, 24, 1, true, Math.PI * .4, Math.PI * 1.2), H(), 0, -.08, 0), 'pelo'); bob.material.side = THREE.DoubleSide; head.add(bob); }
  head.userData.braids = braids;
}
function animarMinifig(f) {
  let t = 0, blinkT = 2, target = null, cur = { armL: [0, .08], armR: [0, .08], legL: [0, 0], legR: [0, 0], y: 0 };
  const lerp = (a, b, k) => a + (b - a) * k;
  function update(dt, mode = 'quieto', extra = 1) {
    t += dt;
    // parpadeo
    blinkT -= dt; const closed = blinkT < 0 && blinkT > -.12; if (blinkT < -.12) blinkT = 2 + Math.random() * 3;
    if (f.eyes.cara) f.eyes.cara.update(dt, closed); else f.eyes.forEach(e => { e.scale.y = closed ? .2 : 1; });
    let pose = null, bob = 0, spin = 0, lean = 0, headTurn = 0;
    if (mode === 'correr') {
      const ph = t * 12 * extra, s = Math.sin(ph);
      pose = { armL: [s * 1.0, .12], armR: [-s * 1.0, .12], legL: [-s * .9, 0], legR: [s * .9, 0], y: 0 };
      bob = Math.abs(Math.cos(ph)) * .07; lean = .12;
    } else if (mode === 'festejar') {
      pose = { armL: [-.3, 2.7 + Math.sin(t * 14) * .2], armR: [-.3, 2.7 - Math.sin(t * 14) * .2], legL: [0, .15], legR: [0, .15], y: 0 };
      bob = Math.abs(Math.sin(t * 7)) * .35; spin = t * 5;
    } else if (mode === 'bailar') {
      const s = Math.sin(t * 5);
      pose = { armL: [-.3, 1.5 + s * .9], armR: [-.3, 1.5 - s * .9], legL: [s * .3, .1], legR: [-s * .3, .1], y: 0 };
      bob = Math.abs(Math.sin(t * 5)) * .08; spin = Math.sin(t * 2.5) * .6; headTurn = s * .3;
    } else if (mode === 'saludar') {
      pose = { armL: [0, .1], armR: [-.2, 2.6 + Math.sin(t * 10) * .35], legL: [0, 0], legR: [0, 0], y: 0 };
      headTurn = Math.sin(t * 2) * .15;
    } else if (mode === 'ballet') {
      pose = target || POSES.primera;
      if (pose.spin) spin = t * 7;
      if (pose.salto) bob = Math.abs(Math.sin(t * 5)) * .3;
      else bob = Math.sin(t * 2) * .01;
    } else {
      pose = { armL: [Math.sin(t * 1.4) * .05, .08], armR: [-Math.sin(t * 1.4) * .05, .08], legL: [0, 0], legR: [0, 0], y: 0 };
      bob = Math.sin(t * 2) * .01; headTurn = Math.sin(t * .7) * .25;
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
    // trenzas y coletas que se mueven
    f.braids.forEach((b, i) => {
      let n = b.children.find(c => c.isGroup), j = 1;
      const run = mode === 'correr';
      b.rotation.x = (run ? .5 + Math.sin(t * 6) * .15 : .15 + Math.sin(t * 1.6 + i) * .05) + (f.body.rotation.y ? .2 : 0);
      while (n) { n.rotation.x = Math.sin(t * 4 - j + i) * .06 + (run ? .05 : 0); n = n.children.find(c => c.isGroup); j++; }
    });
    if (f.capa) f.capa.rotation.x = .12 + (mode === 'correr' ? .5 : 0);
  }
  return {
    group: f.root, parts: f.parts, update, ballet: true,
    // puntos donde se pueden poner adornos (cuidar.html)
    anclas: { cabeza: f.head, cuerpo: f.body, mano: f.arms[1], alto: .36, cuello: 1.13, frente: .2 },
    setPose(name) { target = POSES[name] || POSES.primera; },
    setCara(name) { f.eyes.cara && f.eyes.cara.set(name); },
    get cara() { return f.eyes.cara ? f.eyes.cara.actual : 'feliz'; },
    setTutu(on) { if (f.tutu) f.tutu.visible = on; if (f.vestido) { f.vestido.visible = !on; f.legs.forEach(l => { l.visible = on; }); } },
  };
}

// ---------- animales de bloques ----------
function animal(id) {
  const cfg = ANIMALES[id], C = cfg.c, tipo = cfg.tipo;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const parts = {}, tag = tagger(parts);
  const fur = part => mat(C[part] || C.pelaje);
  const llama = tipo === 'llama';
  const L = llama ? .5 : tipo === 'toro' ? .32 : .3; // largo de patas
  const torso = tag(mesh(box(.5, .38, .85), fur('pelaje'), 0, L + .22, 0), 'pelaje'); body.add(torso);
  body.add(tag(mesh(box(.42, .1, .7), fur('panza'), 0, L + .04, 0), 'panza'));
  // botoncitos en el lomo
  for (const z of [-.2, .2]) for (const x of [-.12, .12]) body.add(tag(mesh(stud(.06, .04), fur('pelaje'), x, L + .43, z), 'pelaje'));
  if (llama) {
    body.add(tag(mesh(box(.56, .06, .5), mat(C.manta), 0, L + .44, 0), 'manta'));
    [-1, 1].forEach(sx => body.add(tag(mesh(box(.04, .22, .48), mat(C.manta), sx * .28, L + .33, 0), 'manta')));
  }
  // cuello y cabeza
  const neck = new THREE.Group(); neck.position.set(0, L + .3, .38); body.add(neck);
  if (llama) neck.add(tag(mesh(box(.22, .6, .22), fur('pelaje'), 0, .3, 0), 'pelaje'));
  const head = new THREE.Group(); head.position.set(0, llama ? .62 : .14, llama ? .05 : .12); neck.add(head);
  head.add(tag(mesh(box(.36, .32, .34), fur('pelaje')), 'pelaje'));
  const snout = tag(mesh(box(.22, .16, .18), fur('nariz'), 0, -.07, .24), 'nariz'); head.add(snout);
  head.add(mesh(box(.08, .05, .04), mat(0x2b1d1d), 0, -.02, .34));
  const eyes = [-1, 1].map(sx => { const e = mesh(box(.05, .07, .02), mat(0x1d2233), sx * .1, .06, .175); head.add(e); return e; });
  const cara = expresiones(head, { eyes, ex: .1, ey: .06, z: .172, my: -.1 });
  [-1, 1].forEach(sx => {
    const ear = tag(mesh(new THREE.ConeGeometry(.08, .2, 4), fur('orejas'), sx * .12, .25, -.02), 'orejas'); ear.rotation.y = Math.PI / 4; head.add(ear);
    if (tipo === 'toro') { const h = tag(mesh(new THREE.ConeGeometry(.045, .28, 8), mat(C.cuernos), sx * .25, .16, .02), 'cuernos'); h.rotation.z = -sx * .9; head.add(h); }
    if (llama) [0, 1, 2].forEach(i => head.add(tag(mesh(new THREE.SphereGeometry(.035, 8, 6), mat([C.pompones, 0xffb703, 0x2ec4b6][i]), sx * (.14 + i * .01), .33 + i * .04, -.02), 'pompones')));
  });
  // patas (bloques que giran)
  const legs = [[-.15, .28], [.15, .28], [-.15, -.28], [.15, -.28]].map(([x, z]) => {
    const g = new THREE.Group(); g.position.set(x, L + .05, z); body.add(g);
    g.add(tag(mesh(box(.13, L, .13), fur('pelaje'), 0, -L / 2, 0), 'pelaje'));
    g.add(mesh(box(.14, .06, .16), mat(0x3b2a20), 0, -L + .03, .01));
    return g;
  });
  // cola
  const tail = new THREE.Group(); tail.position.set(0, L + .32, -.42); body.add(tail);
  const bushy = tipo === 'zorro' || tipo === 'lobo';
  const tl = tag(mesh(box(bushy ? .16 : .06, bushy ? .16 : .06, bushy ? .45 : .3), fur('cola'), 0, .05, -.2), bushy ? 'cola' : 'pelaje'); tl.rotation.x = -.5; tail.add(tl);
  let t = 0, blinkT = 2;
  function update(dt, mode = 'quieto', speed = 1) {
    t += dt; blinkT -= dt; const closed = blinkT < 0 && blinkT > -.12; if (blinkT < -.12) blinkT = 2 + Math.random() * 3;
    cara.update(dt, closed);
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
  return { group: root, parts, update, setPose() {}, setTutu() {}, setCara: n => cara.set(n), get cara() { return cara.actual; }, anclas: { cabeza: head, cuerpo: body, mano: null, alto: .18, cuello: L + .3, frente: .18, animal: true } };
}

export async function crearPersonaje(id, base = '', { colores = true } = {}) {
  const ch = FIGURAS[id] ? minifig(id) : ANIMALES[id] ? animal(id) : minifig('nieve');
  ch.id = id;
  ch.group.scale.multiplyScalar(1.05);
  const saved = colores && window.Juego?.progress?.colors?.[id];
  if (saved) Object.entries(saved).forEach(([part, hex]) => pintarParte(ch, part, hex));
  const carita = window.Juego?.progress?.caras?.[id];
  if (carita && ch.setCara) ch.setCara(carita);
  return ch;
}
export function pintarParte(ch, part, hex) {
  (ch.parts[part] || []).forEach(m => {
    if (!m.userData.ownMat) { m.material = m.material.clone(); m.userData.ownMat = true; }
    m.material.color.set(hex);
  });
}
export function nombrePersonaje(id) { return (FIGURAS[id] || ANIMALES[id] || {}).nombre || id; }
