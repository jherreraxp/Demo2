// Personajes y objetos 3D hechos con formas simples (diseños originales del juego).
// crearPersonaje(id) → { group, update(dt, modo, velocidad), parts }
//   modos: 'quieto' | 'correr' | 'festejar' | 'bailar'
// crearObjeto(palabra) → { group, update(dt) } para los animalitos y cosas escondidas.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: 0, ...o });
function mesh(geo, m, x = 0, y = 0, z = 0, part) {
  const me = new THREE.Mesh(geo, m);
  me.position.set(x, y, z);
  me.castShadow = true; me.receiveShadow = true;
  if (part) me.userData.part = part;
  return me;
}
const S = (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h);

// ---------- cara ----------
function face(parent, y, r, z0 = 0, opts = {}) {
  const black = mat(0x1d2233, { roughness: .2 });
  const white = mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: .6 });
  const eyes = [];
  [-1, 1].forEach(sx => {
    const e = mesh(S(r * .17, 14, 10), black, sx * r * .36, y + r * .05, z0 + r * .88);
    e.scale.set(1, 1.3, .6);
    const hl = mesh(S(r * .06, 8, 6), white, r * .05, r * .07, r * .12);
    e.add(hl);
    parent.add(e); eyes.push(e);
    if (opts.blush !== false) {
      const b = mesh(S(r * .13, 12, 8), mat(0xff9db5, { transparent: true, opacity: .75 }), sx * r * .58, y - r * .2, z0 + r * .78);
      b.scale.set(1, .6, .3); parent.add(b);
    }
  });
  const mouth = mesh(new THREE.TorusGeometry(r * .14, r * .03, 8, 16, Math.PI), mat(opts.mouth || 0xc0395a), 0, y - r * .25, z0 + r * .93);
  mouth.rotation.z = Math.PI;
  parent.add(mouth);
  return eyes;
}

function blinker(eyes) {
  let next = 2 + Math.random() * 3, t = 0;
  return dt => {
    t += dt;
    const closing = t > next && t < next + .14;
    eyes.forEach(e => { e.scale.y = closing ? .15 : 1.3; });
    if (t > next + .14) { t = 0; next = 2 + Math.random() * 3; }
  };
}

// ---------- princesas ----------
function princesa(style) {
  const nieve = style === 'nieve';
  const P = nieve
    ? { skin: 0xf8dcc8, hair: 0xf4ecd6, dress: 0x8fd3f4, dress2: 0xd6f2ff, eyes: 0x1d2233 }
    : { skin: 0xf0c7a0, hair: 0x7b4bd0, dress: 0x5a3fa8, dress2: 0xffd23f, eyes: 0x1d2233 };
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const parts = {};
  const tag = (m, part) => { m.userData.part = part; (parts[part] = parts[part] || []).push(m); return m; };

  // vestido / falda (perfil de campana)
  const prof = nieve
    ? [[0, 0], [.55, 0], [.53, .08], [.4, .45], [.24, .8], [.17, .98], [0, .98]]
    : [[0, .42], [.42, .42], [.4, .48], [.3, .72], [.2, .9], [0, .9]];
  const dressMat = mat(P.dress, nieve ? { emissive: 0x2a6f9a, emissiveIntensity: .15 } : {});
  body.add(tag(mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 28), dressMat), 'vestido'));
  // torso
  body.add(tag(mesh(new THREE.CylinderGeometry(.15, .18, .32, 18), mat(nieve ? P.dress : 0xb07de8), 0, 1.08, 0), nieve ? 'vestido' : 'blusa'));
  if (nieve) {
    // brillitos de hielo en el vestido
    const sparkle = mat(0xffffff, { emissive: 0xbfefff, emissiveIntensity: 1 });
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2, h = Math.random() * .7;
      const rr = .55 - h * .45;
      body.add(mesh(new THREE.OctahedronGeometry(.025), sparkle, Math.sin(a) * rr, h + .05, Math.cos(a) * rr));
    }
    // capa transparente
    const capa = mesh(new THREE.CylinderGeometry(.2, .62, 1.15, 24, 1, true, Math.PI * .55, Math.PI * .9), mat(P.dress2, { transparent: true, opacity: .72, side: THREE.DoubleSide, emissive: 0x9fdcff, emissiveIntensity: .25 }), 0, .68, -.02);
    body.add(tag(capa, 'capa'));
  } else {
    // piernas y botas
    [-1, 1].forEach(sx => {
      body.add(tag(mesh(new THREE.CylinderGeometry(.06, .06, .38, 10), mat(P.skin), sx * .11, .3, 0), 'piel'));
    });
    // chaqueta corta amarilla con hombreras
    body.add(tag(mesh(new THREE.CylinderGeometry(.19, .2, .22, 18, 1, true), mat(P.dress2, { side: THREE.DoubleSide }), 0, 1.14, 0), 'chaqueta'));
    [-1, 1].forEach(sx => body.add(tag(mesh(S(.09), mat(P.dress2), sx * .21, 1.22, 0), 'chaqueta')));
  }
  // pies
  const feet = [-1, 1].map(sx => {
    const f = tag(mesh(S(.08, 12, 8), mat(nieve ? 0xcff3ff : 0xffffff), sx * .12, .06, .06), 'zapatos');
    f.scale.set(1, .7, 1.5);
    if (!nieve) { f.position.y = .08; f.scale.set(1.1, 1.3, 1.5); }
    body.add(f); return f;
  });
  // cuello y cabeza
  body.add(tag(mesh(new THREE.CylinderGeometry(.06, .07, .12, 10), mat(P.skin), 0, 1.28, 0), 'piel'));
  const head = new THREE.Group(); head.position.y = 1.55; body.add(head);
  head.add(tag(mesh(S(.3, 28, 20), mat(P.skin)), 'piel'));
  const eyes = face(head, 0, .3);
  // pelo
  const hairMat = mat(P.hair, { roughness: .45 });
  const cap = tag(mesh(new THREE.SphereGeometry(.325, 28, 18, 0, Math.PI * 2, 0, Math.PI * .52), hairMat, 0, .02, -.02), 'pelo');
  cap.rotation.x = -.35; head.add(cap);
  head.add(tag(mesh(S(.31, 24, 16), hairMat, 0, -.02, -.07), 'pelo'));
  [[-.16, .17], [-.05, .2], [.07, .2], [.17, .16]].forEach(([x, y]) => {
    const b = tag(mesh(S(.1, 12, 8), hairMat, x, y, .22), 'pelo'); b.scale.set(1, .8, .7); head.add(b);
  });
  // trenza
  const braid = new THREE.Group();
  braid.position.set(nieve ? -.12 : 0, -.08, -.26);
  head.add(braid);
  const segs = nieve ? 8 : 11;
  let node = braid;
  for (let i = 0; i < segs; i++) {
    const g = new THREE.Group(); g.position.y = i ? -.1 : 0;
    const r = (nieve ? .09 : .1) - i * .004;
    const sph = tag(mesh(S(r, 12, 8), hairMat, (i % 2 ? .02 : -.02), -.05, -.03), 'pelo');
    sph.scale.set(1, 1.15, .9);
    g.add(sph); node.add(g); node = g;
  }
  const tie = mesh(new THREE.TorusGeometry(.05, .02, 8, 14), mat(nieve ? 0xbfefff : 0xffd23f), 0, -.12, -.03);
  tie.rotation.x = Math.PI / 2; node.add(tie);
  // corona o accesorios
  if (nieve) {
    const ice = mat(0xd8f7ff, { emissive: 0x9fe6ff, emissiveIntensity: .7, transparent: true, opacity: .9 });
    [[-.1, .22], [0, .28], [.1, .22]].forEach(([x, h]) => head.add(tag(mesh(new THREE.ConeGeometry(.04, h * .5, 6), ice, x, .3 + h * .15, .08), 'corona')));
  } else {
    // estrellita en el pelo y aretes dorados
    const gold = mat(0xffd23f, { metalness: .5, roughness: .3, emissive: 0x6b5200, emissiveIntensity: .3 });
    head.add(tag(mesh(new THREE.OctahedronGeometry(.07), gold, .2, .2, .15), 'corona'));
    [-1, 1].forEach(sx => head.add(mesh(S(.03, 8, 6), gold, sx * .3, -.08, 0)));
  }
  // brazos
  const arms = [-1, 1].map(sx => {
    const a = new THREE.Group(); a.position.set(sx * .2, 1.2, 0);
    a.add(tag(mesh(new THREE.CylinderGeometry(.045, .05, .36, 10), mat(nieve ? P.skin : P.dress2), 0, -.18, 0), nieve ? 'piel' : 'chaqueta'));
    a.add(tag(mesh(S(.06, 10, 8), mat(P.skin), 0, -.38, 0), 'piel'));
    a.rotation.z = sx * .18;
    body.add(a); return a;
  });
  if (!nieve) {
    // micrófono en la mano derecha
    const mic = new THREE.Group(); mic.position.set(0, -.42, .06);
    mic.add(mesh(new THREE.CylinderGeometry(.025, .02, .16, 10), mat(0x2b2b38), 0, 0, 0));
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
    else bob = Math.sin(t * 2) * .015;
    body.position.y = bob;
    body.rotation.y = spin;
    body.rotation.z = mode === 'bailar' ? Math.sin(t * 5) * .1 : 0;
    arms.forEach((a, i) => {
      const sx = i ? 1 : -1;
      a.rotation.x = -swing * .9 * sx;
      a.rotation.z = sx * (.18 + armUp * 2.4);
    });
    feet.forEach((f, i) => { f.position.z = .06 + (mode === 'correr' ? Math.sin(t * 11 * speed + i * Math.PI) * .13 : 0); });
    braid.rotation.x = .25 + (mode === 'correr' ? .35 + Math.sin(t * 5.5 * speed) * .12 : Math.sin(t * 1.6) * .05);
    braid.rotation.z = Math.sin(t * (mode === 'correr' ? 5.5 : 1.3)) * .12;
    let n = braid.children[0], k = 1;
    while (n) { n.rotation.x = Math.sin(t * 4 - k) * .05 + (mode === 'correr' ? .04 : 0); n = n.children.find(c => c.isGroup); k++; }
    head.rotation.y = mode === 'quieto' ? Math.sin(t * .7) * .15 : 0;
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
function llama(opts = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const parts = {};
  const tag = (m, part) => { m.userData.part = part; (parts[part] = parts[part] || []).push(m); return m; };
  const wool = mat(opts.wool || 0xf6efe2, { roughness: .9 });
  const torso = tag(mesh(S(.34, 22, 16), wool, 0, .78, 0), 'lana'); torso.scale.set(1, .85, 1.45); body.add(torso);
  if (opts.manta !== false) {
    const manta = tag(mesh(new THREE.BoxGeometry(.6, .06, .6), mat(0xffffff, { map: mantaTexture() }), 0, 1.06, -.02), 'manta');
    body.add(manta);
    [-1, 1].forEach(sx => { const f = tag(mesh(new THREE.BoxGeometry(.04, .26, .58), mat(0xffffff, { map: mantaTexture() }), sx * .31, .95, -.02), 'manta'); body.add(f); });
  }
  const neck = new THREE.Group(); neck.position.set(0, .9, .38); body.add(neck);
  neck.add(tag(mesh(new THREE.CylinderGeometry(.13, .16, .55, 14), wool, 0, .25, 0), 'lana'));
  const head = new THREE.Group(); head.position.set(0, .58, .05); neck.add(head);
  const hd = tag(mesh(S(.19, 20, 14), wool), 'lana'); hd.scale.set(1, 1.05, 1.2); head.add(hd);
  const snout = tag(mesh(S(.11, 14, 10), mat(0xe8d9c3), 0, -.05, .17), 'lana'); snout.scale.set(1.1, .8, .9); head.add(snout);
  head.add(mesh(S(.018, 6, 6), mat(0x4a3b33), -.04, -.02, .26)); head.add(mesh(S(.018, 6, 6), mat(0x4a3b33), .04, -.02, .26));
  const eyes = face(head, .04, .19, .02, { blush: true, mouth: 0x8a4b3a });
  const pomCols = [0xff5d8f, 0xffb703, 0x2ec4b6];
  [-1, 1].forEach(sx => {
    const ear = mesh(new THREE.ConeGeometry(.05, .2, 10), wool, sx * .1, .2, -.02); ear.rotation.z = -sx * .25; head.add(ear);
    pomCols.forEach((c, i) => head.add(tag(mesh(S(.04, 10, 8), mat(c), sx * (.13 + i * .015), .3 + i * .05, -.02), 'pompones')));
  });
  const legs = [[-.17, .3], [.17, .3], [-.17, -.3], [.17, -.3]].map(([x, z]) => {
    const l = new THREE.Group(); l.position.set(x, .55, z);
    l.add(tag(mesh(new THREE.CylinderGeometry(.06, .055, .5, 10), wool, 0, -.25, 0), 'lana'));
    l.add(mesh(S(.06, 10, 8), mat(0x5b4636), 0, -.5, .01));
    body.add(l); return l;
  });
  body.add(tag(mesh(S(.09, 12, 8), wool, 0, .9, -.5), 'lana'));
  const blink = blinker(eyes);
  let t = 0;
  function update(dt, mode = 'quieto', speed = 1) {
    t += dt; blink(dt);
    const run = mode === 'correr';
    const ph = t * 10 * speed;
    legs.forEach((l, i) => { l.rotation.x = run ? Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI)) * .7 : 0; });
    body.position.y = run ? Math.abs(Math.sin(ph)) * .06 : mode === 'festejar' ? Math.abs(Math.sin(t * 7)) * .3 : 0;
    body.rotation.y = mode === 'festejar' ? t * 4 : mode === 'bailar' ? Math.sin(t * 3) * .5 : 0;
    neck.rotation.x = run ? -.15 + Math.sin(ph) * .05 : Math.sin(t * 1.5) * .06;
    head.rotation.z = mode === 'bailar' ? Math.sin(t * 5) * .25 : Math.sin(t * .9) * .06;
  }
  return { group: root, update, parts };
}

// ---------- zorrito (modelo glTF de Khronos) ----------
const loader = new GLTFLoader();
let foxGLTF = null;
async function zorro(base) {
  if (!foxGLTF) foxGLTF = await new Promise(ok => loader.load(base + 'assets/modelos/zorro/Fox.glb', ok, undefined, () => ok(null)));
  if (!foxGLTF) return llama();
  const { clone } = await import('three/addons/utils/SkeletonUtils.js');
  const inner = clone(foxGLTF.scene);
  inner.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.part = 'pelo'; } });
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

export const PERSONAJES = ['nieve', 'estrella', 'llama', 'zorro'];
export async function crearPersonaje(id, base = '', { colores = true } = {}) {
  const ch = id === 'estrella' ? princesa('estrella') : id === 'llama' ? llama() : id === 'zorro' ? await zorro(base) : princesa('nieve');
  ch.id = id;
  // colores que la niña eligió en "Pinta a la princesa"
  const saved = colores && window.Juego?.progress?.colors?.[id];
  if (saved) Object.entries(saved).forEach(([part, hex]) => pintarParte(ch, part, hex));
  return ch;
}
export function pintarParte(ch, part, hex) {
  (ch.parts[part] || []).forEach(m => {
    if (!m.userData.ownMat) { m.material = m.material.clone(); m.userData.ownMat = true; }
    m.material.color.set(hex);
    if (m.material.map) m.material.color.lerp(new THREE.Color(0xffffff), .35);
  });
}

// ---------- animalitos y cosas para buscar ----------
function quad({ color, belly = 0xffffff, ear = 'punta', tail = 'larga', snout, size = 1 }) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const m = mat(color, { roughness: .8 });
  const torso = mesh(S(.3, 20, 14), m, 0, .42, 0); torso.scale.set(1, .85, 1.3); body.add(torso);
  const tum = mesh(S(.22, 16, 10), mat(belly), 0, .36, .1); tum.scale.set(.9, .7, 1.2); body.add(tum);
  const head = new THREE.Group(); head.position.set(0, .78, .3); body.add(head);
  head.add(mesh(S(.27, 22, 16), m));
  if (snout) { const s = mesh(S(.12, 14, 10), mat(snout), 0, -.08, .22); s.scale.set(1.2, .8, .8); head.add(s); head.add(mesh(S(.035, 8, 6), mat(0x2b1d1d), 0, -.03, .32)); }
  const eyes = face(head, .03, .27, 0, { mouth: 0x6b2b3a });
  [-1, 1].forEach(sx => {
    let e;
    if (ear === 'punta') { e = mesh(new THREE.ConeGeometry(.09, .2, 4), m, sx * .16, .25, 0); e.rotation.z = -sx * .3; }
    else if (ear === 'caida') { e = mesh(S(.1, 12, 8), mat(new THREE.Color(color).multiplyScalar(.7)), sx * .25, .02, -.02); e.scale.set(.6, 1.5, .8); }
    else if (ear === 'larga') { e = mesh(new THREE.CapsuleGeometry(.055, .3, 6, 10), m, sx * .09, .38, 0); e.rotation.z = -sx * .12; e.add(mesh(new THREE.CapsuleGeometry(.03, .24, 4, 8), mat(0xffb6c8), 0, 0, .03)); }
    else e = mesh(S(.09, 12, 8), m, sx * .19, .2, 0);
    head.add(e);
  });
  const legs = [[-.14, .2], [.14, .2], [-.14, -.22], [.14, -.22]].map(([x, z]) => { const l = mesh(new THREE.CylinderGeometry(.06, .06, .22, 8), m, x, .11, z); body.add(l); return l; });
  const tailG = new THREE.Group(); tailG.position.set(0, .5, -.38); body.add(tailG);
  if (tail === 'larga') { const tl = mesh(new THREE.CapsuleGeometry(.04, .32, 6, 8), m, 0, .16, -.04); tl.rotation.x = -.4; tailG.add(tl); }
  else if (tail === 'pompon') tailG.add(mesh(S(.08, 12, 8), mat(0xffffff)));
  else tailG.add(mesh(S(.06, 10, 8), m));
  root.scale.setScalar(size);
  const blink = blinker(eyes);
  let t = Math.random() * 5;
  return { group: root, update(dt, happy) { t += dt; blink(dt); tailG.rotation.z = Math.sin(t * (happy ? 14 : 5)) * .5; head.rotation.z = Math.sin(t * 1.3) * .1; body.position.y = happy ? Math.abs(Math.sin(t * 6)) * .15 : 0; legs.forEach((l, i) => { l.rotation.x = happy ? Math.sin(t * 12 + i) * .3 : 0; }); } };
}
function simple(build, anim) {
  const root = new THREE.Group(); build(root);
  let t = Math.random() * 5;
  return { group: root, update(dt, happy) { t += dt; anim && anim(root, t, happy); } };
}

const OBJETOS = {
  gato: () => quad({ color: 0xf2a65a, belly: 0xfff1de, ear: 'punta', tail: 'larga', snout: 0xfff1de }),
  perro: () => quad({ color: 0xb8865b, belly: 0xf3dcc0, ear: 'caida', tail: 'corta', snout: 0xf3dcc0 }),
  oso: () => quad({ color: 0x8a5a3c, belly: 0xd8b48f, ear: 'redonda', tail: 'corta', snout: 0xd8b48f, size: 1.1 }),
  conejo: () => quad({ color: 0xf7f2ee, belly: 0xffffff, ear: 'larga', tail: 'pompon', snout: 0xffd6de, size: .9 }),
  vaca: () => quad({ color: 0xffffff, belly: 0xffc9d6, ear: 'redonda', tail: 'larga', snout: 0xffb3c6 }),
  llama: () => { const l = llama(); l.group.scale.setScalar(.75); return { group: l.group, update: (dt, h) => l.update(dt, h ? 'festejar' : 'quieto') }; },
  pato: () => simple(g => {
    const y = mat(0xffd84d);
    const b = mesh(S(.28, 18, 12), y, 0, .32, 0); b.scale.set(1, .85, 1.25); g.add(b);
    const h = new THREE.Group(); h.position.set(0, .68, .18); g.add(h);
    h.add(mesh(S(.2, 18, 12), y)); face(h, .04, .2, 0, { mouth: 0xffd84d, blush: true });
    const pico = mesh(S(.1, 12, 8), mat(0xff8c2b), 0, -.04, .2); pico.scale.set(1.1, .4, 1); h.add(pico);
    [-1, 1].forEach(sx => { const w = mesh(S(.14, 12, 8), y, sx * .26, .36, -.02); w.scale.set(.4, .8, 1.1); g.add(w); });
    [-1, 1].forEach(sx => { const f = mesh(S(.07, 8, 6), mat(0xff8c2b), sx * .1, .03, .1); f.scale.set(1, .3, 1.4); g.add(f); });
  }, (g, t, happy) => { g.rotation.z = Math.sin(t * (happy ? 12 : 4)) * .12; g.position.y = happy ? Math.abs(Math.sin(t * 8)) * .15 : 0; }),
  sapo: () => simple(g => {
    const v = mat(0x5cc36a);
    const b = mesh(S(.32, 18, 12), v, 0, .25, 0); b.scale.set(1.2, .7, 1); g.add(b);
    [-1, 1].forEach(sx => { const e = mesh(S(.1, 12, 8), v, sx * .16, .45, .12); g.add(e); const p = mesh(S(.05, 8, 6), mat(0x1d2233), sx * .16, .48, .2); g.add(p); });
    const m = mesh(new THREE.TorusGeometry(.14, .02, 8, 16, Math.PI), mat(0x2f6b3a), 0, .25, .3); m.rotation.z = Math.PI; g.add(m);
  }, (g, t, happy) => { g.position.y = Math.max(0, Math.sin(t * (happy ? 7 : 2.5))) * (happy ? .4 : .12); }),
  pez: () => simple(g => {
    const bowl = mesh(S(.42, 24, 16), mat(0x9fdcff, { transparent: true, opacity: .35, roughness: .1 }), 0, .42, 0); g.add(bowl);
    const fish = new THREE.Group(); fish.name = 'pez'; fish.position.y = .45; g.add(fish);
    const b = mesh(S(.16, 16, 10), mat(0xff8c3a), 0, 0, 0); b.scale.set(.7, 1, 1.4); fish.add(b);
    const tail = mesh(new THREE.ConeGeometry(.1, .18, 4), mat(0xff6a1a), 0, 0, -.25); tail.rotation.x = Math.PI / 2; fish.add(tail);
    face(fish, .02, .12, .1, { blush: false, mouth: 0x9a2b1a });
  }, (g, t, happy) => { const f = g.getObjectByName('pez'); f.rotation.y = Math.sin(t * (happy ? 4 : 1.2)) * 1.2; f.position.y = .45 + Math.sin(t * 2) * .05; }),
  pelota: () => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d');
    ['#ef5b5b', '#ffffff', '#3f8ee8', '#ffffff', '#f6c33b', '#ffffff', '#4cb87a', '#ffffff'].forEach((col, i) => { x.fillStyle = col; x.fillRect(i * 16, 0, 16, 64); });
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    return simple(g => { g.add(mesh(S(.3, 24, 16), mat(0xffffff, { map: tex }), 0, .3, 0)); }, (g, t, happy) => { g.children[0].position.y = .3 + Math.abs(Math.sin(t * (happy ? 6 : 3))) * (happy ? .6 : .2); g.children[0].rotation.x = t * 2; });
  },
  flor: () => simple(g => {
    g.add(mesh(new THREE.CylinderGeometry(.03, .03, .6, 8), mat(0x3f9b4a), 0, .3, 0));
    const h = new THREE.Group(); h.name = 'h'; h.position.y = .68; g.add(h);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const p = mesh(S(.1, 12, 8), mat(0xff7eb6), Math.cos(a) * .14, Math.sin(a) * .14, 0); p.scale.set(1, 1, .4); h.add(p); }
    h.add(mesh(S(.09, 12, 8), mat(0xffd23f), 0, 0, .03)); face(h, 0, .09, .0, { blush: false, mouth: 0xa0522d });
    [-1, 1].forEach(sx => { const l = mesh(S(.08, 10, 6), mat(0x4cb87a), sx * .1, .25, 0); l.scale.set(1.4, .5, .6); g.add(l); });
  }, (g, t, happy) => { g.rotation.z = Math.sin(t * (happy ? 6 : 1.5)) * .12; }),
  palta: () => simple(g => {
    const p = mesh(S(.3, 20, 14), mat(0x3e6b25), 0, .38, 0); p.scale.set(1, 1.25, .7); g.add(p);
    const f = mesh(S(.26, 20, 14), mat(0xd7e57a), 0, .36, .06); f.scale.set(1, 1.25, .5); g.add(f);
    g.add(mesh(S(.11, 14, 10), mat(0x8a5a2b), 0, .28, .17));
    face(g, .55, .14, .05, { mouth: 0x3e6b25 });
  }, (g, t, happy) => { g.position.y = happy ? Math.abs(Math.sin(t * 7)) * .3 : 0; g.rotation.y = Math.sin(t * 1.2) * .3; }),
  choclo: () => simple(g => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#f2c94c'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#ffe58a';
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.beginPath(); x.arc(i * 8 + 4, j * 8 + 4, 3, 0, 7); x.fill(); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 3);
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
};
export const BUSCABLES = Object.keys(OBJETOS);
export function crearObjeto(word) { return (OBJETOS[word] || OBJETOS.pelota)(); }
