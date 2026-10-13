// Personajes y objetos 3D hechos con formas simples (diseños originales del juego).
// crearPersonaje(id) → { group, update(dt, modo, velocidad), parts }
//   modos: 'quieto' | 'correr' | 'festejar' | 'bailar'
//   parts: { vestido: [mallas], falda: [...] } — cada parte se puede pintar por separado.
// crearObjeto(palabra) → { group, update(dt, feliz) } para animalitos y cosas que se buscan o atrapan.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: 0, ...o });
function mesh(geo, m, x = 0, y = 0, z = 0) {
  const me = new THREE.Mesh(geo, m);
  me.position.set(x, y, z);
  me.castShadow = true; me.receiveShadow = true;
  return me;
}
const S = (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h);
const V2 = pts => pts.map(([x, y]) => new THREE.Vector2(x, y));

// registra una malla como parte pintable
function tagger(parts) {
  return (m, part) => { m.userData.part = part; (parts[part] = parts[part] || []).push(m); return m; };
}

// ---------- cara ----------
function face(parent, y, r, z0 = 0, opts = {}) {
  const black = mat(0x1d2233, { roughness: .2 });
  const white = mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: .6 });
  const eyes = [];
  [-1, 1].forEach(sx => {
    if (opts.big) {
      const w = mesh(S(r * .3, 16, 12), mat(0xffffff), sx * r * .32, y + r * .35, z0 + r * .78); parent.add(w);
      const e = mesh(S(r * .14, 12, 8), black, sx * r * .32, y + r * .38, z0 + r * 1.02); parent.add(e); eyes.push(e);
      return;
    }
    const e = mesh(S(r * .17, 14, 10), black, sx * r * .36, y + r * .05, z0 + r * .88);
    e.scale.set(1, 1.3, .6);
    e.add(mesh(S(r * .06, 8, 6), white, r * .05, r * .07, r * .12));
    parent.add(e); eyes.push(e);
    if (opts.blush !== false) {
      const b = mesh(S(r * .13, 12, 8), mat(0xff9db5, { transparent: true, opacity: .7 }), sx * r * .58, y - r * .2, z0 + r * .78);
      b.scale.set(1, .6, .3); parent.add(b);
    }
    if (opts.lashes) {
      const l = mesh(new THREE.BoxGeometry(r * .2, r * .03, r * .02), black, sx * r * .44, y + r * .28, z0 + r * .86);
      l.rotation.z = -sx * .4; parent.add(l);
    }
  });
  const mouth = mesh(new THREE.TorusGeometry(r * .14, r * .03, 8, 16, Math.PI), mat(opts.mouth || 0xc0395a), 0, y - r * .25, z0 + r * .93);
  mouth.rotation.z = Math.PI;
  parent.add(mouth);
  return eyes;
}
function blinker(eyes) {
  let next = 2 + Math.random() * 3, t = 0;
  const base = eyes.map(e => e.scale.y);
  return dt => {
    t += dt;
    const closing = t > next && t < next + .14;
    eyes.forEach((e, i) => { e.scale.y = closing ? .15 : base[i]; });
    if (t > next + .14) { t = 0; next = 2 + Math.random() * 3; }
  };
}

// ---------- chicas (princesas y cantantes) ----------
// cfg: piel, pelo {color, estilo: trenza|afro|corto|coleta}, ropa: vestido|falda|pantalon, colores de cada parte y extras
const CHICAS = {
  nieve: { piel: 0xf8dcc8, pelo: { color: 0xf4ecd6, estilo: 'trenza' }, ropa: 'vestido', corona: 'hielo', capa: true, guantes: true, brillos: true,
    c: { vestido: 0x8fd3f4, blusa: 0x8fd3f4, mangas: 0xd6f2ff, capa: 0xd6f2ff, guantes: 0xd6f2ff, cinturon: 0xffffff, zapatos: 0xcff3ff, corona: 0xd8f7ff } },
  ana: { piel: 0x8d5a3b, pelo: { color: 0x2b1b14, estilo: 'afro' }, ropa: 'vestido', corona: 'oro', collar: true, guantes: true, mono: true,
    c: { vestido: 0xf6c33b, blusa: 0xf6c33b, mangas: 0xfff1b8, guantes: 0xffffff, cinturon: 0xef5b8a, moño: 0xef5b8a, collar: 0xffffff, zapatos: 0xef5b8a, corona: 0xffd23f } },
  estrella: { piel: 0xf0c7a0, pelo: { color: 0x7b4bd0, estilo: 'trenza', larga: true }, ropa: 'falda', corona: 'estrella', microfono: true, chaqueta: true,
    c: { falda: 0x5a3fa8, blusa: 0xb07de8, chaqueta: 0xffd23f, mangas: 0xffd23f, cinturon: 0x23324a, zapatos: 0xffffff, corona: 0xffd23f } },
  zoe: { piel: 0xf3cfb0, pelo: { color: 0x1d1d2b, estilo: 'corto', mecha: 0x3f8ee8 }, ropa: 'pantalon', gorra: true, chaqueta: true, collar: true,
    c: { pantalon: 0x23324a, blusa: 0xffffff, chaqueta: 0x4cb87a, mangas: 0x4cb87a, gorra: 0x3f8ee8, collar: 0xffd23f, zapatos: 0xffffff } },
  mira: { piel: 0xe9bf98, pelo: { color: 0xff4fa3, estilo: 'coleta' }, ropa: 'falda', chaqueta: true, collar: true, guantes: true,
    c: { falda: 0xef3b4a, blusa: 0x23324a, chaqueta: 0x23324a, mangas: 0x23324a, guantes: 0x23324a, cinturon: 0xffd23f, collar: 0xffd23f, zapatos: 0x23324a } },
};
function chica(id) {
  const cfg = CHICAS[id] || CHICAS.nieve;
  const C = cfg.c;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const parts = {}, tag = tagger(parts);
  const skin = () => mat(cfg.piel);
  const larga = cfg.ropa === 'vestido';

  // falda o vestido (perfil de campana)
  if (larga) {
    body.add(tag(mesh(new THREE.LatheGeometry(V2([[0, 0], [.55, 0], [.53, .08], [.4, .45], [.26, .78], [.18, .95], [0, .95]]), 30), mat(C.vestido, cfg.brillos ? { emissive: 0x2a6f9a, emissiveIntensity: .12 } : {})), 'vestido'));
    // volantes en el borde
    const volante = tag(mesh(new THREE.TorusGeometry(.53, .035, 8, 40), mat(C.mangas), 0, .05, 0), 'mangas');
    volante.rotation.x = Math.PI / 2; body.add(volante);
  } else if (cfg.ropa === 'falda') {
    body.add(tag(mesh(new THREE.LatheGeometry(V2([[0, .5], [.4, .5], [.38, .56], [.26, .8], [.2, .93], [0, .93]]), 28), mat(C.falda)), 'falda'));
  } else {
    // pantalón
    [-1, 1].forEach(sx => body.add(tag(mesh(new THREE.CylinderGeometry(.085, .075, .62, 12), mat(C.pantalon), sx * .1, .42, 0), 'pantalon')));
    body.add(tag(mesh(new THREE.CylinderGeometry(.17, .19, .2, 16), mat(C.pantalon), 0, .78, 0), 'pantalon'));
  }
  // piernas (si no hay vestido largo)
  if (!larga) {
    if (cfg.ropa === 'falda') [-1, 1].forEach(sx => body.add(tag(mesh(new THREE.CylinderGeometry(.06, .06, .4, 10), skin(), sx * .11, .32, 0), 'piel')));
  }
  // cinturón
  if (C.cinturon) body.add(tag(mesh(new THREE.CylinderGeometry(.165, .175, .05, 18), mat(C.cinturon, { metalness: .2 }), 0, .93, 0), 'cinturon'));
  // blusa / torso
  body.add(tag(mesh(new THREE.CylinderGeometry(.15, .17, .32, 18), mat(C.blusa), 0, 1.1, 0), 'blusa'));
  if (cfg.chaqueta) {
    body.add(tag(mesh(new THREE.CylinderGeometry(.185, .195, .26, 18, 1, true, -Math.PI * .85, Math.PI * 1.7), mat(C.chaqueta, { side: THREE.DoubleSide }), 0, 1.12, 0), 'chaqueta'));
    [-1, 1].forEach(sx => body.add(tag(mesh(S(.085), mat(C.chaqueta), sx * .2, 1.22, 0), 'chaqueta')));
  }
  if (cfg.mono) { const m = tag(mesh(new THREE.TorusKnotGeometry(.05, .02, 30, 6), mat(C.moño), 0, .96, .17), 'moño'); body.add(m); }
  if (cfg.collar) for (let i = 0; i < 9; i++) { const a = -1.1 + i * .275; body.add(tag(mesh(S(.022, 8, 6), mat(C.collar, { metalness: .3, roughness: .3 }), Math.sin(a) * .13, 1.22 - Math.abs(Math.cos(a)) * .01 - (1 - Math.abs(a) / 1.1) * .05, Math.cos(a) * .13), 'collar')); }
  // capa
  if (cfg.capa) body.add(tag(mesh(new THREE.CylinderGeometry(.2, .62, 1.15, 24, 1, true, Math.PI * .55, Math.PI * .9), mat(C.capa, { transparent: true, opacity: .75, side: THREE.DoubleSide, emissive: 0x9fdcff, emissiveIntensity: .2 }), 0, .68, -.02), 'capa'));
  if (cfg.brillos) {
    const sp = mat(0xffffff, { emissive: 0xbfefff, emissiveIntensity: 1 });
    for (let i = 0; i < 16; i++) { const a = Math.random() * Math.PI * 2, h = Math.random() * .7; const rr = .55 - h * .45; body.add(mesh(new THREE.OctahedronGeometry(.022), sp, Math.sin(a) * rr, h + .05, Math.cos(a) * rr)); }
  }
  // zapatos / botas
  const feet = [-1, 1].map(sx => {
    const f = tag(mesh(S(.08, 12, 8), mat(C.zapatos), sx * .11, .06, .05), 'zapatos');
    f.scale.set(1, .7, 1.5);
    if (!larga) { f.position.y = .08; f.scale.set(1.15, 1.3, 1.5); }
    body.add(f); return f;
  });
  // cuello y cabeza
  body.add(tag(mesh(new THREE.CylinderGeometry(.06, .07, .12, 10), skin(), 0, 1.28, 0), 'piel'));
  const head = new THREE.Group(); head.position.y = 1.55; body.add(head);
  head.add(tag(mesh(S(.3, 28, 20), skin()), 'piel'));
  const eyes = face(head, 0, .3, 0, { lashes: true });
  // pelo
  const hairM = () => mat(cfg.pelo.color, { roughness: .45 });
  const cap = tag(mesh(new THREE.SphereGeometry(.325, 28, 18, 0, Math.PI * 2, 0, Math.PI * .52), hairM(), 0, .02, -.02), 'pelo');
  cap.rotation.x = -.35; head.add(cap);
  const est = cfg.pelo.estilo;
  if (est !== 'corto') head.add(tag(mesh(S(.31, 24, 16), hairM(), 0, -.02, -.07), 'pelo'));
  [[-.16, .17], [-.05, .2], [.07, .2], [.17, .16]].forEach(([x, y]) => { const b = tag(mesh(S(.1, 12, 8), hairM(), x, y, .22), 'pelo'); b.scale.set(1, .8, .7); head.add(b); });
  let braid = null;
  if (est === 'trenza' || est === 'coleta') {
    braid = new THREE.Group();
    braid.position.set(est === 'trenza' && id === 'nieve' ? -.12 : 0, est === 'coleta' ? .22 : -.08, -.26);
    head.add(braid);
    const segs = est === 'coleta' ? 12 : cfg.pelo.larga ? 11 : 8;
    let node = braid;
    for (let i = 0; i < segs; i++) {
      const g = new THREE.Group(); g.position.y = i ? -.1 : 0;
      const r = (est === 'coleta' ? .11 : .095) - i * .004;
      const sph = tag(mesh(S(r, 12, 8), hairM(), est === 'trenza' ? (i % 2 ? .02 : -.02) : 0, -.05, -.03), 'pelo');
      sph.scale.set(1, 1.15, .9); g.add(sph); node.add(g); node = g;
    }
    const tie = tag(mesh(new THREE.TorusGeometry(.06, .022, 8, 14), mat(C.moño || C.corona || 0xffd23f), 0, est === 'coleta' ? .1 : -.12, -.03), 'moño');
    tie.rotation.x = Math.PI / 2; (est === 'coleta' ? braid : node).add(tie);
  } else if (est === 'afro') {
    // dos moñitos esponjosos y volumen
    [-1, 1].forEach(sx => head.add(tag(mesh(S(.17, 16, 12), hairM(), sx * .26, .27, -.04), 'pelo')));
    const back = tag(mesh(S(.36, 22, 16), hairM(), 0, .02, -.1), 'pelo'); back.scale.set(1.05, 1, .9); head.add(back);
  } else if (est === 'corto') {
    const bob = tag(mesh(new THREE.CylinderGeometry(.33, .35, .38, 24, 1, true, Math.PI * .3, Math.PI * 1.4), hairM(), 0, -.08, -.02), 'pelo');
    bob.material.side = THREE.DoubleSide; head.add(bob);
    if (cfg.pelo.mecha) head.add(tag(mesh(new THREE.BoxGeometry(.06, .3, .05), mat(cfg.pelo.mecha), .2, 0, .22), 'pelo'));
  }
  // corona, gorra
  if (cfg.corona === 'hielo') {
    const ice = mat(C.corona, { emissive: 0x9fe6ff, emissiveIntensity: .6, transparent: true, opacity: .9 });
    [[-.1, .22], [0, .28], [.1, .22]].forEach(([x, h]) => head.add(tag(mesh(new THREE.ConeGeometry(.04, h * .5, 6), ice.clone(), x, .3 + h * .15, .08), 'corona')));
  } else if (cfg.corona === 'oro') {
    const gold = mat(C.corona, { metalness: .5, roughness: .3, emissive: 0x6b5200, emissiveIntensity: .25 });
    head.add(tag(mesh(new THREE.CylinderGeometry(.14, .15, .08, 16, 1, true), gold, 0, .4, .02), 'corona'));
    [-2, -1, 0, 1, 2].forEach(i => head.add(tag(mesh(new THREE.ConeGeometry(.03, .1, 6), gold.clone(), Math.sin(i * .6) * .14, .48, .02 + Math.cos(i * .6) * .14), 'corona')));
  } else if (cfg.corona === 'estrella') {
    head.add(tag(mesh(new THREE.OctahedronGeometry(.07), mat(C.corona, { metalness: .5, roughness: .3, emissive: 0x6b5200, emissiveIntensity: .3 }), .2, .2, .15), 'corona'));
  }
  if (cfg.gorra) {
    const g = tag(mesh(new THREE.SphereGeometry(.335, 24, 14, 0, Math.PI * 2, 0, Math.PI * .45), mat(C.gorra), 0, .04, 0), 'gorra'); head.add(g);
    head.add(tag(mesh(S(.06, 10, 8), mat(C.gorra), 0, .36, 0), 'gorra'));
  }
  // brazos con mangas y guantes
  const arms = [-1, 1].map(sx => {
    const a = new THREE.Group(); a.position.set(sx * .2, 1.2, 0);
    a.add(tag(mesh(new THREE.CylinderGeometry(.05, .05, .16, 10), mat(C.mangas || C.blusa), 0, -.07, 0), 'mangas'));
    a.add(tag(mesh(new THREE.CylinderGeometry(.045, .045, .22, 10), cfg.guantes ? mat(C.guantes) : skin(), 0, -.25, 0), cfg.guantes ? 'guantes' : 'piel'));
    a.add(tag(mesh(S(.06, 10, 8), cfg.guantes ? mat(C.guantes) : skin(), 0, -.38, 0), cfg.guantes ? 'guantes' : 'piel'));
    a.rotation.z = sx * .18;
    body.add(a); return a;
  });
  if (cfg.microfono) {
    const mic = new THREE.Group(); mic.position.set(0, -.42, .06);
    mic.add(mesh(new THREE.CylinderGeometry(.025, .02, .16, 10), mat(0x2b2b38)));
    mic.add(mesh(S(.045, 12, 8), mat(0xc9ccd6, { metalness: .6, roughness: .3 }), 0, .1, 0));
    mic.rotation.x = -.6; arms[1].add(mic);
  }
  const blink = blinker(eyes);
  let t = 0;
  function update(dt, mode = 'quieto', speed = 1) {
    t += dt; blink(dt);
    let bob = 0, swing = 0, armUp = 0, spin = 0;
    if (mode === 'correr') { const ph = t * 11 * speed; bob = Math.abs(Math.sin(ph)) * .07; swing = Math.sin(ph); }
    else if (mode === 'festejar') { bob = Math.abs(Math.sin(t * 7)) * .35; armUp = 1; spin = t * 5; }
    else if (mode === 'bailar') { bob = Math.abs(Math.sin(t * 5)) * .08; armUp = .5 + Math.sin(t * 5) * .5; spin = Math.sin(t * 2.5) * .6; }
    else if (mode === 'ballet') {
      // pirueta cada 4 tiempos, luego brazos en corona y balanceo suave
      const beat = speed, ph = beat % 4;
      if (ph < 1.5) { spin = ph / 1.5 * Math.PI * 2; armUp = 1; bob = .1; }
      else { spin = Math.sin(beat * Math.PI / 2) * .35; armUp = .55 + Math.sin(beat * Math.PI) * .25; bob = Math.abs(Math.sin(beat * Math.PI)) * .06; }
    }
    else bob = Math.sin(t * 2) * .015;
    body.position.y = bob; body.rotation.y = spin;
    body.rotation.z = mode === 'bailar' ? Math.sin(t * 5) * .1 : 0;
    arms.forEach((a, i) => { const sx = i ? 1 : -1; a.rotation.x = -swing * .9 * sx; a.rotation.z = sx * (.18 + armUp * 2.4); });
    feet.forEach((f, i) => { f.position.z = .05 + (mode === 'correr' ? Math.sin(t * 11 * speed + i * Math.PI) * .13 : 0); });
    if (braid) {
      const coleta = est === 'coleta';
      braid.rotation.x = (coleta ? .6 : .25) + (mode === 'correr' ? .35 + Math.sin(t * 5.5 * speed) * .12 : Math.sin(t * 1.6) * .05);
      braid.rotation.z = Math.sin(t * (mode === 'correr' ? 5.5 : 1.3)) * .12;
      let n = braid.children.find(c => c.isGroup), k = 1;
      while (n) { n.rotation.x = Math.sin(t * 4 - k) * .05 + (mode === 'correr' ? .04 : 0) - (coleta && k < 3 ? .3 : 0); n = n.children.find(c => c.isGroup); k++; }
    }
    head.rotation.y = mode === 'quieto' ? Math.sin(t * .7) * .15 : 0;
  }
  return { group: root, update, parts, ballet: true };
}

// ---------- monstruito rojo y ratoncito (de pie) ----------
function furTexture(color) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) { g.strokeStyle = `rgba(0,0,0,${Math.random() * .18})`; g.lineWidth = 1.5; const x = Math.random() * 128, y = Math.random() * 128; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 4, y + 6); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
}
function bipedo(kind) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const parts = {}, tag = tagger(parts);
  const rojo = kind === 'rojito';
  const furC = rojo ? 0xe8303c : 0x9aa3ad;
  const fur = () => mat(furC, { roughness: .95, map: furTexture() });
  const torso = tag(mesh(S(.36, 22, 16), fur(), 0, .72, 0), 'pelaje'); torso.scale.set(1, 1.15, .9); body.add(torso);
  if (!rojo) {
    // overol azul
    const over = tag(mesh(S(.37, 22, 16, ), mat(0x3f8ee8), 0, .6, 0), 'pantalon'); over.scale.set(1.02, .8, .93); body.add(over);
    [-1, 1].forEach(sx => body.add(tag(mesh(new THREE.BoxGeometry(.05, .3, .04), mat(0x3f8ee8), sx * .14, .95, .3), 'pantalon')));
    [-1, 1].forEach(sx => body.add(tag(mesh(S(.035, 8, 6), mat(0xffd23f), sx * .14, .86, .33), 'botones')));
  } else {
    const panza = tag(mesh(S(.25, 16, 12), mat(0xff6a5c, { roughness: .95, map: furTexture() }), 0, .65, .17), 'panza'); panza.scale.set(1, 1.1, .6); body.add(panza);
  }
  const head = new THREE.Group(); head.position.y = 1.3; body.add(head);
  const hd = tag(mesh(S(.34, 24, 18), fur()), 'pelaje'); head.add(hd);
  let eyes;
  if (rojo) {
    eyes = face(head, -.02, .34, 0, { big: true, mouth: 0x5a0d15 });
    head.add(tag(mesh(S(.11, 14, 10), mat(0xff9a2b), 0, .02, .34), 'nariz'));
  } else {
    eyes = face(head, .02, .34, 0, { mouth: 0x6b2b3a });
    const sn = tag(mesh(S(.14, 14, 10), mat(0xe9e0d6), 0, -.08, .26), 'panza'); sn.scale.set(1.2, .8, .9); head.add(sn);
    head.add(tag(mesh(S(.05, 10, 8), mat(0x23324a), 0, -.04, .39), 'nariz'));
    [-1, 1].forEach(sx => {
      const ear = tag(mesh(new THREE.CylinderGeometry(.24, .24, .05, 24), fur(), sx * .3, .3, -.05), 'orejas'); ear.rotation.x = Math.PI / 2; head.add(ear);
      const inn = tag(mesh(new THREE.CylinderGeometry(.16, .16, .02, 20), mat(0xffb6c8), sx * .3, .3, -.02), 'orejas'); inn.rotation.x = Math.PI / 2; head.add(inn);
    });
  }
  const arms = [-1, 1].map(sx => {
    const a = new THREE.Group(); a.position.set(sx * .33, .95, 0);
    a.add(tag(mesh(new THREE.CapsuleGeometry(.07, .28, 6, 10), fur(), 0, -.18, 0), 'pelaje'));
    a.add(tag(mesh(S(.09, 12, 8), rojo ? fur() : mat(0xffffff), 0, -.4, 0), rojo ? 'pelaje' : 'guantes'));
    a.rotation.z = sx * .3; body.add(a); return a;
  });
  const legs = [-1, 1].map(sx => {
    const l = new THREE.Group(); l.position.set(sx * .15, .4, 0);
    l.add(tag(mesh(new THREE.CapsuleGeometry(.08, .2, 6, 10), rojo ? fur() : mat(0x3f8ee8), 0, -.15, 0), rojo ? 'pelaje' : 'pantalon'));
    const shoe = tag(mesh(S(.11, 12, 8), mat(rojo ? 0xff9a2b : 0xffd23f), 0, -.32, .06), 'zapatos'); shoe.scale.set(1, .7, 1.4); l.add(shoe);
    body.add(l); return l;
  });
  if (!rojo) { const tail = mesh(new THREE.TorusGeometry(.25, .025, 8, 20, Math.PI * 1.2), mat(0xffb6c8), 0, .5, -.4); tail.rotation.y = Math.PI / 2; body.add(tail); }
  const blink = blinker(eyes);
  let t = 0;
  function update(dt, mode = 'quieto', speed = 1) {
    t += dt; blink(dt);
    const run = mode === 'correr', ph = t * 11 * speed;
    legs.forEach((l, i) => { l.rotation.x = run ? Math.sin(ph + i * Math.PI) * .8 : 0; });
    arms.forEach((a, i) => { const sx = i ? 1 : -1; a.rotation.x = run ? -Math.sin(ph + i * Math.PI) * .8 : 0; a.rotation.z = sx * (mode === 'festejar' || mode === 'bailar' ? 2.4 + Math.sin(t * 8) * .3 : .3); });
    body.position.y = run ? Math.abs(Math.sin(ph)) * .08 : mode === 'festejar' ? Math.abs(Math.sin(t * 7)) * .35 : mode === 'bailar' ? Math.abs(Math.sin(t * 5)) * .1 : Math.sin(t * 2) * .02;
    body.rotation.y = mode === 'festejar' ? t * 5 : mode === 'bailar' ? Math.sin(t * 2.5) * .6 : 0;
    head.rotation.z = mode === 'bailar' ? Math.sin(t * 5) * .15 : 0;
  }
  return { group: root, update, parts };
}

// ---------- llamita peruana ----------
function mantaTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  const cols = ['#e63946', '#ffb703', '#2a9d8f', '#ff6fb5', '#3a86ff', '#ffb703', '#e63946'];
  cols.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * 64 / cols.length, 128, 64 / cols.length); });
  g.fillStyle = '#ffffff';
  for (let x = 4; x < 128; x += 16) { g.beginPath(); g.moveTo(x, 30); g.lineTo(x + 6, 24); g.lineTo(x + 12, 30); g.lineTo(x + 6, 36); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function llama() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const parts = {}, tag = tagger(parts);
  const wool = () => mat(0xf6efe2, { roughness: .9 });
  const torso = tag(mesh(S(.34, 22, 16), wool(), 0, .78, 0), 'lana'); torso.scale.set(1, .85, 1.45); body.add(torso);
  const mt = mantaTexture();
  body.add(tag(mesh(new THREE.BoxGeometry(.6, .06, .6), mat(0xffffff, { map: mt }), 0, 1.06, -.02), 'manta'));
  [-1, 1].forEach(sx => body.add(tag(mesh(new THREE.BoxGeometry(.04, .26, .58), mat(0xffffff, { map: mt }), sx * .31, .95, -.02), 'manta')));
  const neck = new THREE.Group(); neck.position.set(0, .9, .38); body.add(neck);
  neck.add(tag(mesh(new THREE.CylinderGeometry(.13, .16, .55, 14), wool(), 0, .25, 0), 'lana'));
  const head = new THREE.Group(); head.position.set(0, .58, .05); neck.add(head);
  const hd = tag(mesh(S(.19, 20, 14), wool()), 'lana'); hd.scale.set(1, 1.05, 1.2); head.add(hd);
  const snout = tag(mesh(S(.11, 14, 10), mat(0xe8d9c3), 0, -.05, .17), 'nariz'); snout.scale.set(1.1, .8, .9); head.add(snout);
  head.add(mesh(S(.018, 6, 6), mat(0x4a3b33), -.04, -.02, .26)); head.add(mesh(S(.018, 6, 6), mat(0x4a3b33), .04, -.02, .26));
  const eyes = face(head, .04, .19, .02, { mouth: 0x8a4b3a });
  const pomCols = [0xff5d8f, 0xffb703, 0x2ec4b6];
  [-1, 1].forEach(sx => {
    const ear = tag(mesh(new THREE.ConeGeometry(.05, .2, 10), wool(), sx * .1, .2, -.02), 'orejas'); ear.rotation.z = -sx * .25; head.add(ear);
    pomCols.forEach((c, i) => head.add(tag(mesh(S(.04, 10, 8), mat(c), sx * (.13 + i * .015), .3 + i * .05, -.02), 'pompones')));
  });
  const legs = [[-.17, .3], [.17, .3], [-.17, -.3], [.17, -.3]].map(([x, z]) => {
    const l = new THREE.Group(); l.position.set(x, .55, z);
    l.add(tag(mesh(new THREE.CylinderGeometry(.06, .055, .5, 10), wool(), 0, -.25, 0), 'lana'));
    l.add(tag(mesh(S(.06, 10, 8), mat(0x5b4636), 0, -.5, .01), 'zapatos'));
    body.add(l); return l;
  });
  body.add(tag(mesh(S(.09, 12, 8), wool(), 0, .9, -.5), 'lana'));
  const blink = blinker(eyes);
  let t = 0;
  function update(dt, mode = 'quieto', speed = 1) {
    t += dt; blink(dt);
    const run = mode === 'correr', ph = t * 10 * speed;
    legs.forEach((l, i) => { l.rotation.x = run ? Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI)) * .7 : 0; });
    body.position.y = run ? Math.abs(Math.sin(ph)) * .06 : mode === 'festejar' ? Math.abs(Math.sin(t * 7)) * .3 : 0;
    body.rotation.y = mode === 'festejar' ? t * 4 : mode === 'bailar' ? Math.sin(t * 3) * .5 : 0;
    neck.rotation.x = run ? -.15 + Math.sin(ph) * .05 : Math.sin(t * 1.5) * .06;
    head.rotation.z = mode === 'bailar' ? Math.sin(t * 5) * .25 : Math.sin(t * .9) * .06;
  }
  return { group: root, update, parts };
}

// ---------- animales de cuatro patas (lobo, toro, gato, perro…) ----------
function quad({ color, belly = 0xffffff, ear = 'punta', tail = 'larga', snout, size = 1, horns = false, bushy = false }) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const parts = {}, tag = tagger(parts);
  const m = () => mat(color, { roughness: .8 });
  const torso = tag(mesh(S(.3, 20, 14), m(), 0, .42, 0), 'pelaje'); torso.scale.set(1, .85, 1.3); body.add(torso);
  const tum = tag(mesh(S(.22, 16, 10), mat(belly), 0, .36, .1), 'panza'); tum.scale.set(.9, .7, 1.2); body.add(tum);
  const head = new THREE.Group(); head.position.set(0, .78, .3); body.add(head);
  head.add(tag(mesh(S(.27, 22, 16), m()), 'pelaje'));
  if (snout) { const s = tag(mesh(S(.12, 14, 10), mat(snout), 0, -.08, .22), 'nariz'); s.scale.set(1.2, .8, .8); head.add(s); head.add(mesh(S(.035, 8, 6), mat(0x2b1d1d), 0, -.03, .32)); }
  const eyes = face(head, .03, .27, 0, { mouth: 0x6b2b3a });
  [-1, 1].forEach(sx => {
    let e;
    if (ear === 'punta') { e = mesh(new THREE.ConeGeometry(.09, .2, 4), m(), sx * .16, .25, 0); e.rotation.z = -sx * .3; }
    else if (ear === 'caida') { e = mesh(S(.1, 12, 8), mat(new THREE.Color(color).multiplyScalar(.7)), sx * .25, .02, -.02); e.scale.set(.6, 1.5, .8); }
    else if (ear === 'larga') { e = mesh(new THREE.CapsuleGeometry(.055, .3, 6, 10), m(), sx * .09, .38, 0); e.rotation.z = -sx * .12; e.add(mesh(new THREE.CapsuleGeometry(.03, .24, 4, 8), mat(0xffb6c8), 0, 0, .03)); }
    else e = mesh(S(.09, 12, 8), m(), sx * .19, .2, 0);
    head.add(tag(e, 'orejas'));
    if (horns) { const h = tag(mesh(new THREE.ConeGeometry(.06, .34, 10), mat(0xfff4dc), sx * .24, .3, .06), 'cuernos'); h.rotation.z = -sx * .55; head.add(h); }
  });
  const legs = [[-.14, .2], [.14, .2], [-.14, -.22], [.14, -.22]].map(([x, z]) => { const l = tag(mesh(new THREE.CylinderGeometry(.06, .06, .24, 8), m(), x, .12, z), 'pelaje'); body.add(l); return l; });
  const tailG = new THREE.Group(); tailG.position.set(0, .5, -.38); body.add(tailG);
  if (tail === 'larga') { const tl = tag(mesh(bushy ? new THREE.CapsuleGeometry(.08, .3, 6, 8) : new THREE.CapsuleGeometry(.04, .32, 6, 8), m(), 0, .16, -.04), 'pelaje'); tl.rotation.x = -.4; tailG.add(tl); }
  else if (tail === 'pompon') tailG.add(mesh(S(.08, 12, 8), mat(0xffffff)));
  else tailG.add(tag(mesh(S(.06, 10, 8), m()), 'pelaje'));
  root.scale.setScalar(size);
  const blink = blinker(eyes);
  let t = Math.random() * 5;
  function update(dt, mode, speed = 1) {
    if (mode === true) mode = 'feliz'; if (mode === false || mode === undefined) mode = 'quieto';
    t += dt; blink(dt);
    const run = mode === 'correr', happy = mode === 'feliz' || mode === 'festejar';
    tailG.rotation.z = Math.sin(t * (happy ? 14 : 5)) * .5;
    head.rotation.z = Math.sin(t * 1.3) * .1;
    const ph = t * 12 * speed;
    body.position.y = run ? Math.abs(Math.sin(ph)) * .08 : happy ? Math.abs(Math.sin(t * 6)) * .15 : 0;
    body.rotation.y = mode === 'festejar' ? t * 4 : mode === 'bailar' ? Math.sin(t * 3) * .5 : 0;
    legs.forEach((l, i) => { l.rotation.x = run ? Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI)) * .7 : happy ? Math.sin(t * 12 + i) * .3 : 0; });
  }
  return { group: root, update, parts };
}

// ---------- zorrito (modelo glTF de Khronos) ----------
const loader = new GLTFLoader();
let foxGLTF = null;
async function zorro(base) {
  if (!foxGLTF) foxGLTF = await new Promise(ok => loader.load(base + 'assets/modelos/zorro/Fox.glb', ok, undefined, () => ok(null)));
  if (!foxGLTF) return quad({ color: 0xf08a3c, ear: 'punta', bushy: true, snout: 0xffffff });
  const { clone } = await import('three/addons/utils/SkeletonUtils.js');
  const inner = clone(foxGLTF.scene);
  inner.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  const box = new THREE.Box3().setFromObject(inner), h = box.getSize(new THREE.Vector3()).y;
  inner.scale.multiplyScalar(1.1 / h);
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.add(inner);
  const mixer = new THREE.AnimationMixer(inner);
  const acts = {}; foxGLTF.animations.forEach(a => { acts[a.name] = mixer.clipAction(a); });
  let cur = null, t = 0;
  const use = n => { const a = acts[n]; if (!a || a === cur) return; a.reset().fadeIn(.25).play(); if (cur) cur.fadeOut(.25); cur = a; };
  return {
    group: root, parts: {},
    update(dt, mode = 'quieto', speed = 1) {
      t += dt;
      use(mode === 'correr' ? 'Run' : mode === 'quieto' ? 'Survey' : 'Walk');
      if (cur) cur.timeScale = mode === 'correr' ? speed : 1;
      body.position.y = mode === 'festejar' ? Math.abs(Math.sin(t * 7)) * .3 : 0;
      body.rotation.y = mode === 'festejar' ? t * 4 : 0;
      mixer.update(dt);
    },
  };
}

export const PERSONAJES = ['nieve', 'ana', 'estrella', 'zoe', 'mira', 'llama', 'rojito', 'raton', 'zorro', 'lobo', 'toro'];
export const PINTABLES = ['nieve', 'ana', 'estrella', 'zoe', 'mira', 'llama', 'rojito', 'raton', 'lobo', 'toro'];
export async function crearPersonaje(id, base = '', { colores = true } = {}) {
  let ch;
  if (CHICAS[id]) ch = chica(id);
  else if (id === 'llama') ch = llama();
  else if (id === 'rojito' || id === 'raton') ch = bipedo(id);
  else if (id === 'lobo') ch = quad({ color: 0x8c95a3, belly: 0xe4e8ee, ear: 'punta', tail: 'larga', bushy: true, snout: 0xe4e8ee, size: 1.25 });
  else if (id === 'toro') ch = quad({ color: 0x8a5a3c, belly: 0xd8b48f, ear: 'redonda', tail: 'larga', snout: 0xf3b6a4, horns: true, size: 1.3 });
  else if (id === 'zorro') ch = await zorro(base);
  else ch = chica('nieve');
  ch.id = id;
  const saved = colores && window.Juego?.progress?.colors?.[id];
  if (saved) Object.entries(saved).forEach(([part, hex]) => pintarParte(ch, part, hex));
  return ch;
}
export function pintarParte(ch, part, hex) {
  (ch.parts[part] || []).forEach(m => {
    if (!m.userData.ownMat) { m.material = m.material.clone(); m.userData.ownMat = true; }
    m.material.color.set(hex);
    if (m.material.map) m.material.color.lerp(new THREE.Color(0xffffff), .25);
  });
}

// ---------- cosas y animalitos para buscar o atrapar ----------
function simple(build, anim) {
  const root = new THREE.Group(); build(root);
  let t = Math.random() * 5;
  return { group: root, update(dt, happy) { t += dt; anim && anim(root, t, happy === true || happy === 'feliz' || happy === 'festejar'); } };
}
function canvasTex(w, h, draw, rep = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); return t;
}
const bounce = (g, t, happy) => { g.position.y = happy ? Math.abs(Math.sin(t * 7)) * .3 : Math.abs(Math.sin(t * 2)) * .05; g.rotation.y = Math.sin(t * 1.2) * .3; };
const asQuad = q => ({ group: q.group, update: (dt, h) => q.update(dt, h ? 'feliz' : 'quieto') });

const OBJETOS = {
  gato: () => asQuad(quad({ color: 0xf2a65a, belly: 0xfff1de, ear: 'punta', tail: 'larga', snout: 0xfff1de })),
  perro: () => asQuad(quad({ color: 0xb8865b, belly: 0xf3dcc0, ear: 'caida', tail: 'corta', snout: 0xf3dcc0 })),
  oso: () => asQuad(quad({ color: 0x8a5a3c, belly: 0xd8b48f, ear: 'redonda', tail: 'corta', snout: 0xd8b48f, size: 1.1 })),
  conejo: () => asQuad(quad({ color: 0xf7f2ee, belly: 0xffffff, ear: 'larga', tail: 'pompon', snout: 0xffd6de, size: .9 })),
  vaca: () => asQuad(quad({ color: 0xffffff, belly: 0xffc9d6, ear: 'redonda', tail: 'larga', snout: 0xffb3c6, horns: true })),
  lobo: () => asQuad(quad({ color: 0x8c95a3, belly: 0xe4e8ee, ear: 'punta', tail: 'larga', bushy: true, snout: 0xe4e8ee })),
  toro: () => asQuad(quad({ color: 0x8a5a3c, belly: 0xd8b48f, ear: 'redonda', tail: 'larga', snout: 0xf3b6a4, horns: true, size: 1.1 })),
  mono: () => asQuad(quad({ color: 0x8a5a3c, belly: 0xf1d2b0, ear: 'redonda', tail: 'larga', snout: 0xf1d2b0, size: .95 })),
  llama: () => { const l = llama(); l.group.scale.setScalar(.75); return { group: l.group, update: (dt, h) => l.update(dt, h ? 'festejar' : 'quieto') }; },
  ratón: () => { const b = bipedo('raton'); b.group.scale.setScalar(.7); return { group: b.group, update: (dt, h) => b.update(dt, h ? 'festejar' : 'bailar') }; },
  pato: () => simple(g => {
    const y = mat(0xffd84d);
    const b = mesh(S(.28, 18, 12), y, 0, .32, 0); b.scale.set(1, .85, 1.25); g.add(b);
    const h = new THREE.Group(); h.position.set(0, .68, .18); g.add(h);
    h.add(mesh(S(.2, 18, 12), y)); face(h, .04, .2, 0, { mouth: 0xffd84d });
    const pico = mesh(S(.1, 12, 8), mat(0xff8c2b), 0, -.04, .2); pico.scale.set(1.1, .4, 1); h.add(pico);
    [-1, 1].forEach(sx => { const w = mesh(S(.14, 12, 8), y, sx * .26, .36, -.02); w.scale.set(.4, .8, 1.1); g.add(w); });
    [-1, 1].forEach(sx => { const f = mesh(S(.07, 8, 6), mat(0xff8c2b), sx * .1, .03, .1); f.scale.set(1, .3, 1.4); g.add(f); });
  }, (g, t, happy) => { g.rotation.z = Math.sin(t * (happy ? 12 : 4)) * .12; g.position.y = happy ? Math.abs(Math.sin(t * 8)) * .15 : 0; }),
  loro: () => simple(g => {
    const v = mat(0x2fbf5a);
    const b = mesh(S(.24, 16, 12), v, 0, .45, 0); b.scale.set(.9, 1.2, .9); g.add(b);
    const h = mesh(S(.18, 16, 12), mat(0xef3b4a), 0, .82, .05); g.add(h); face(g, .84, .18, .05, { blush: false, mouth: 0xef3b4a });
    const pico = mesh(new THREE.ConeGeometry(.06, .14, 8), mat(0xffd23f), 0, .78, .25); pico.rotation.x = Math.PI / 2.3; g.add(pico);
    const tail = mesh(new THREE.BoxGeometry(.12, .4, .04), mat(0x3f8ee8), 0, .2, -.2); tail.rotation.x = .4; g.add(tail);
    [-1, 1].forEach(sx => { const w = mesh(S(.14, 10, 8), mat(0xffd23f), sx * .22, .45, -.02); w.scale.set(.3, .9, .8); g.add(w); });
  }, (g, t, happy) => { g.position.y = happy ? Math.abs(Math.sin(t * 6)) * .4 : Math.sin(t * 2) * .03; g.rotation.y = Math.sin(t * 1.5) * .4; }),
  sapo: () => simple(g => {
    const v = mat(0x5cc36a);
    const b = mesh(S(.32, 18, 12), v, 0, .25, 0); b.scale.set(1.2, .7, 1); g.add(b);
    [-1, 1].forEach(sx => { g.add(mesh(S(.1, 12, 8), v, sx * .16, .45, .12)); g.add(mesh(S(.05, 8, 6), mat(0x1d2233), sx * .16, .48, .2)); });
    const m = mesh(new THREE.TorusGeometry(.14, .02, 8, 16, Math.PI), mat(0x2f6b3a), 0, .25, .3); m.rotation.z = Math.PI; g.add(m);
  }, (g, t, happy) => { g.position.y = Math.max(0, Math.sin(t * (happy ? 7 : 2.5))) * (happy ? .4 : .12); }),
  tortuga: () => simple(g => {
    const shell = mesh(new THREE.SphereGeometry(.34, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x3f9b4a, { map: canvasTex(64, 64, (x) => { x.fillStyle = '#4cb85a'; x.fillRect(0, 0, 64, 64); x.strokeStyle = '#2f7d38'; x.lineWidth = 3; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.beginPath(); x.arc(i * 16 + 8, j * 16 + 8, 6, 0, 7); x.stroke(); } }) }), 0, .15, 0);
    g.add(shell);
    const h = mesh(S(.13, 14, 10), mat(0x9fd67a), 0, .25, .38); g.add(h); face(g, .27, .13, .38, { mouth: 0x2f6b3a });
    [[-.22, .2], [.22, .2], [-.22, -.2], [.22, -.2]].forEach(([x, z]) => g.add(mesh(S(.08, 8, 6), mat(0x9fd67a), x, .08, z)));
  }, (g, t, happy) => { g.position.y = happy ? Math.abs(Math.sin(t * 6)) * .2 : 0; g.rotation.y = Math.sin(t * .8) * .4; }),
  abeja: () => simple(g => {
    const b = mesh(S(.25, 18, 12), mat(0xffffff, { map: canvasTex(64, 64, (x) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#23324a' : '#ffd23f'; x.fillRect(i * 8, 0, 8, 64); } }) }), 0, .6, 0);
    b.scale.set(.85, .85, 1.2); b.rotation.y = Math.PI / 2; g.add(b);
    face(g, .64, .2, .12, { mouth: 0x23324a });
    [-1, 1].forEach(sx => { const w = mesh(S(.16, 12, 8), mat(0xdff4ff, { transparent: true, opacity: .7 }), sx * .2, .85, -.05); w.scale.set(1, .5, .3); w.name = 'ala'; g.add(w); });
  }, (g, t, happy) => { g.position.y = Math.sin(t * 3) * .12 + (happy ? .3 : 0); g.children.filter(c => c.name === 'ala').forEach((w, i) => { w.rotation.z = Math.sin(t * 40) * .5 * (i ? 1 : -1); }); }),
  gusano: () => simple(g => {
    for (let i = 0; i < 5; i++) { const s = mesh(S(.13 - i * .01, 12, 8), mat(i % 2 ? 0x8fd14f : 0x6fc23a), 0, .13, -i * .18); s.name = 's' + i; g.add(s); }
    face(g, .18, .13, .02, { mouth: 0x2f6b3a });
  }, (g, t, happy) => { for (let i = 0; i < 5; i++) { const s = g.getObjectByName('s' + i); s.position.y = .13 + Math.max(0, Math.sin(t * (happy ? 9 : 4) - i)) * .1; } }),
  pez: () => simple(g => {
    g.add(mesh(S(.42, 24, 16), mat(0x9fdcff, { transparent: true, opacity: .35, roughness: .1 }), 0, .42, 0));
    const fish = new THREE.Group(); fish.name = 'pez'; fish.position.y = .45; g.add(fish);
    const b = mesh(S(.16, 16, 10), mat(0xff8c3a)); b.scale.set(.7, 1, 1.4); fish.add(b);
    const tail = mesh(new THREE.ConeGeometry(.1, .18, 4), mat(0xff6a1a), 0, 0, -.25); tail.rotation.x = Math.PI / 2; fish.add(tail);
    face(fish, .02, .12, .1, { blush: false, mouth: 0x9a2b1a });
  }, (g, t, happy) => { const f = g.getObjectByName('pez'); f.rotation.y = Math.sin(t * (happy ? 4 : 1.2)) * 1.2; f.position.y = .45 + Math.sin(t * 2) * .05; }),
  pelota: () => {
    const tex = canvasTex(128, 64, (x) => { ['#ef5b5b', '#ffffff', '#3f8ee8', '#ffffff', '#f6c33b', '#ffffff', '#4cb87a', '#ffffff'].forEach((col, i) => { x.fillStyle = col; x.fillRect(i * 16, 0, 16, 64); }); });
    return simple(g => { g.add(mesh(S(.3, 24, 16), mat(0xffffff, { map: tex }), 0, .3, 0)); }, (g, t, happy) => { g.children[0].position.y = .3 + Math.abs(Math.sin(t * (happy ? 6 : 3))) * (happy ? .6 : .2); g.children[0].rotation.x = t * 2; });
  },
  flor: () => simple(g => {
    g.add(mesh(new THREE.CylinderGeometry(.03, .03, .6, 8), mat(0x3f9b4a), 0, .3, 0));
    const h = new THREE.Group(); h.position.y = .68; g.add(h);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const p = mesh(S(.1, 12, 8), mat(0xff7eb6), Math.cos(a) * .14, Math.sin(a) * .14, 0); p.scale.set(1, 1, .4); h.add(p); }
    h.add(mesh(S(.09, 12, 8), mat(0xffd23f), 0, 0, .03)); face(h, 0, .09, 0, { blush: false, mouth: 0xa0522d });
    [-1, 1].forEach(sx => { const l = mesh(S(.08, 10, 6), mat(0x4cb87a), sx * .1, .25, 0); l.scale.set(1.4, .5, .6); g.add(l); });
  }, (g, t, happy) => { g.rotation.z = Math.sin(t * (happy ? 6 : 1.5)) * .12; }),
  palta: () => simple(g => {
    const p = mesh(S(.3, 20, 14), mat(0x3e6b25), 0, .38, 0); p.scale.set(1, 1.25, .7); g.add(p);
    const f = mesh(S(.26, 20, 14), mat(0xd7e57a), 0, .36, .06); f.scale.set(1, 1.25, .5); g.add(f);
    g.add(mesh(S(.11, 14, 10), mat(0x8a5a2b), 0, .28, .17));
    face(g, .55, .14, .05, { mouth: 0x3e6b25 });
  }, bounce),
  choclo: () => simple(g => {
    const tex = canvasTex(64, 64, (x) => { x.fillStyle = '#f2c94c'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#ffe58a'; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.beginPath(); x.arc(i * 8 + 4, j * 8 + 4, 3, 0, 7); x.fill(); } }, 3);
    g.add(mesh(new THREE.CapsuleGeometry(.16, .4, 8, 16), mat(0xffffff, { map: tex }), 0, .45, 0));
    [-1, 1].forEach(sx => { const l = mesh(S(.16, 12, 8), mat(0x6abf4b), sx * .12, .3, 0); l.scale.set(.35, 1.6, .5); l.rotation.z = sx * .35; g.add(l); });
    face(g, .55, .16, 0, { mouth: 0xa0522d });
  }, (g, t, happy) => { g.rotation.z = Math.sin(t * (happy ? 8 : 1.5)) * .15; }),
  carro: () => simple(g => {
    g.add(mesh(new THREE.BoxGeometry(.5, .2, .8), mat(0xef3b4a), 0, .24, 0));
    g.add(mesh(new THREE.BoxGeometry(.42, .2, .42), mat(0xef3b4a), 0, .44, -.05));
    g.add(mesh(new THREE.BoxGeometry(.4, .16, .02), mat(0x9fdcff), 0, .44, .17));
    [[-.27, .25], [.27, .25], [-.27, -.25], [.27, -.25]].forEach(([x, z]) => { const w = mesh(new THREE.CylinderGeometry(.1, .1, .08, 14), mat(0x2b2b38), x, .1, z); w.rotation.z = Math.PI / 2; g.add(w); });
  }, (g, t, happy) => { g.position.y = happy ? Math.abs(Math.sin(t * 10)) * .1 : 0; g.rotation.y = happy ? t * 3 : 0; }),
  sol: () => simple(g => {
    const c = new THREE.Group(); c.name = 'c'; c.position.y = .55; g.add(c);
    c.add(mesh(S(.3, 20, 14), mat(0xffd23f, { emissive: 0xffa000, emissiveIntensity: .35 })));
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const r = mesh(new THREE.ConeGeometry(.06, .16, 6), mat(0xffb703), Math.cos(a) * .4, Math.sin(a) * .4, 0); r.rotation.z = a - Math.PI / 2; c.add(r); }
    face(c, 0, .3, 0, { mouth: 0xc0392b });
  }, (g, t, happy) => { const c = g.getObjectByName('c'); c.rotation.z = t * (happy ? 3 : .5); c.children.slice(-5).forEach(() => {}); g.position.y = happy ? Math.abs(Math.sin(t * 6)) * .2 : 0; }),
  luna: () => simple(g => {
    const m = mesh(new THREE.TorusGeometry(.26, .12, 14, 30, Math.PI * 1.25), mat(0xfff3b0, { emissive: 0xfff3b0, emissiveIntensity: .3 }), 0, .55, 0);
    m.rotation.z = Math.PI * .4; g.add(m);
    face(g, .6, .12, .06, { mouth: 0xa0522d, blush: false });
  }, (g, t, happy) => { g.position.y = Math.sin(t * 2) * .05 + (happy ? Math.abs(Math.sin(t * 6)) * .25 : 0); g.rotation.z = Math.sin(t) * .1; }),
  nube: () => simple(g => {
    const w = mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: .15 });
    [[0, .5, 0, .28], [-.25, .42, 0, .2], [.25, .42, 0, .22], [.1, .66, 0, .2]].forEach(([x, y, z, r]) => g.add(mesh(S(r, 16, 12), w, x, y, z)));
    face(g, .48, .25, .05, { mouth: 0x5b6b82 });
  }, (g, t, happy) => { g.position.y = Math.sin(t * 2) * .06 + (happy ? .2 : 0); g.position.x = Math.sin(t) * .05; }),
  casa: () => simple(g => {
    g.add(mesh(new THREE.BoxGeometry(.7, .5, .6), mat(0xfff1d6), 0, .25, 0));
    const roof = mesh(new THREE.ConeGeometry(.55, .4, 4), mat(0xef5b5b), 0, .7, 0); roof.rotation.y = Math.PI / 4; g.add(roof);
    g.add(mesh(new THREE.BoxGeometry(.16, .26, .02), mat(0x8a5a3c), 0, .13, .31));
    [-1, 1].forEach(sx => g.add(mesh(new THREE.BoxGeometry(.14, .12, .02), mat(0x9fdcff), sx * .22, .3, .31)));
  }, (g, t, happy) => { g.scale.y = 1 + (happy ? Math.sin(t * 10) * .05 : 0); }),
  dado: () => simple(g => {
    const d = mesh(new THREE.BoxGeometry(.45, .45, .45), mat(0xffffff, { roughness: .3 }), 0, .3, 0); g.add(d);
    const dot = mat(0xef3b4a);
    [[0, 0, .23], [.12, .12, -.23], [-.12, -.12, -.23], [.23, .1, .1], [.23, -.1, -.1], [-.23, 0, 0]].forEach(([x, y, z]) => d.add(mesh(S(.045, 8, 6), dot, x, y, z)));
  }, (g, t, happy) => { g.children[0].rotation.y = t * (happy ? 4 : .6); g.children[0].rotation.x = happy ? t * 3 : 0; }),
  taza: () => simple(g => {
    g.add(mesh(new THREE.CylinderGeometry(.22, .18, .36, 20), mat(0x3f8ee8), 0, .18, 0));
    g.add(mesh(new THREE.CylinderGeometry(.19, .19, .02, 20), mat(0x6b3e26), 0, .35, 0));
    const h = mesh(new THREE.TorusGeometry(.1, .03, 8, 16), mat(0x3f8ee8), .25, .2, 0); g.add(h);
    face(g, .2, .2, .02, { mouth: 0x23324a });
  }, bounce),
  uva: () => simple(g => {
    const m = mat(0x8e44ad, { roughness: .3 });
    [[0, .62], [-.1, .52], [.1, .52], [-.15, .42], [0, .42], [.15, .42], [-.07, .32], [.07, .32], [0, .22]].forEach(([x, y]) => g.add(mesh(S(.08, 12, 8), m, x, y, (Math.random() - .5) * .05)));
    const l = mesh(S(.1, 10, 6), mat(0x4cb87a), .08, .72, 0); l.scale.set(1.5, .4, .8); g.add(l);
  }, bounce),
  pera: () => simple(g => {
    g.add(mesh(new THREE.LatheGeometry(V2([[0, 0], [.2, .05], [.24, .2], [.14, .42], [.1, .55], [0, .6]]), 20), mat(0xb5d33d), 0, .02, 0));
    g.add(mesh(new THREE.CylinderGeometry(.015, .015, .12, 6), mat(0x6b3e26), 0, .66, 0));
    face(g, .22, .18, .06, { mouth: 0x5b7a12 });
  }, bounce),
  tomate: () => simple(g => {
    const t = mesh(S(.28, 20, 14), mat(0xef3b2d, { roughness: .3 }), 0, .3, 0); t.scale.y = .85; g.add(t);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const l = mesh(new THREE.ConeGeometry(.04, .14, 4), mat(0x3f9b4a), Math.cos(a) * .06, .56, Math.sin(a) * .06); l.rotation.z = Math.PI / 2; l.rotation.y = -a; g.add(l); }
    face(g, .3, .28, 0, { mouth: 0x7a1a12 });
  }, bounce),
  papa: () => simple(g => {
    const p = mesh(S(.28, 14, 10), mat(0xc19a6b, { roughness: .95 }), 0, .26, 0); p.scale.set(1.2, .85, .9); g.add(p);
    for (let i = 0; i < 6; i++) g.add(mesh(S(.02, 6, 4), mat(0x8a6a43), (Math.random() - .5) * .5, .26 + (Math.random() - .5) * .3, .24));
    face(g, .3, .22, .04, { mouth: 0x6b4a2b });
  }, bounce),
  piña: () => simple(g => {
    const tex = canvasTex(64, 64, (x) => { x.fillStyle = '#f2b632'; x.fillRect(0, 0, 64, 64); x.strokeStyle = '#b07a12'; x.lineWidth = 2; for (let i = -64; i < 128; i += 12) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 64, 64); x.stroke(); x.beginPath(); x.moveTo(i + 64, 0); x.lineTo(i, 64); x.stroke(); } }, 2);
    const p = mesh(S(.26, 18, 14), mat(0xffffff, { map: tex }), 0, .32, 0); p.scale.y = 1.3; g.add(p);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const l = mesh(new THREE.ConeGeometry(.05, .3, 4), mat(0x3f9b4a), Math.cos(a) * .05, .78, Math.sin(a) * .05); l.rotation.z = Math.cos(a) * .4; l.rotation.x = Math.sin(a) * .4; g.add(l); }
    face(g, .36, .26, 0, { mouth: 0x7a4a12 });
  }, bounce),
};
export const BUSCABLES = Object.keys(OBJETOS);
export function tieneObjeto(word) { return !!OBJETOS[word]; }
export function crearObjeto(word) { return (OBJETOS[word] || OBJETOS.pelota)(); }
