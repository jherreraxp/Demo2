// Utilidades 3D compartidas: escena con luz bonita, cielo, ajuste de tamaño, bucle, letreros y chispitas.
//
// crearMundo(canvas, opciones) — opciones (todas opcionales):
//   fog, near, far, fov, shadows   como siempre (fog: null = sin niebla)
//   cielo: 'dia' | 'atardecer' | 'noche' | false
//          cúpula de cielo degradado + nubes + colinas lejanas. Sin indicar se conserva el fondo de la página
//          (el lienzo es transparente) y, si el juego usa niebla, solo se añaden unas nubes suaves; si la
//          página no tiene fondo propio se pone el cielo de día.
//   nubes: true | false | número      colinas: true | false      particulas: 'polen' | 'brillos' | 'nieve'
//   tonos: 'suave' (por defecto) | 'aces' | false      exposicion: número (1 por defecto)
//          'suave' deja los colores planos tal cual y solo redondea las luces altas (el blanco ya no se quema);
//          'aces' es el mapeo de cine completo de three.js: más contraste, pero apaga los colores pastel.
//   calidad: 'fija' (no bajar la calidad aunque vaya lento)
// Los juegos también pueden usar sueltos: cieloDegradado(scene, colores), nubes(scene), colinas(scene),
// particulas(scene).
import * as THREE from 'three';

const EXPOSICION = 1;
// Mapeo de tonos «suave»: igual hasta 0.72 y de ahí hacia arriba una curva de hombro (como la de cine), más un
// pelín de saturación. El ACES completo dejaba el pasto y la piel descoloridos con estos colores planos.
THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(
  'vec3 CustomToneMapping( vec3 color ) { return color; }',
  `vec3 CustomToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	const float k = 0.72;
	vec3 alto = k + ( 1.0 - k ) * ( 1.0 - exp( - ( color - k ) / ( 1.0 - k ) ) );
	color = mix( color, alto, step( k, color ) );
	float l = dot( color, vec3( 0.2126, 0.7152, 0.0722 ) );
	return clamp( mix( vec3( l ), color, 1.08 ), 0.0, 1.0 );
}`);
const esMovil = () => { try { return matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 600; } catch (e) { return false; } };
const col = c => (c && c.isColor) ? c : new THREE.Color(c);

// Los materiales sin luz (tarjetas, letreros, emojis, chispitas) ya traen su color final: no pasan por el
// mapeo de tonos, para que el blanco siga blanco. (material.userData.tonos = true lo vuelve a activar.)
const vistos = new WeakSet();
THREE.Object3D.prototype.onBeforeRender = function (r, s, c, g, m) {
  if (!m || vistos.has(m)) return;
  vistos.add(m);
  if ((m.isMeshBasicMaterial || m.isSpriteMaterial || m.isPointsMaterial || m.isLineBasicMaterial) && !(m.userData && m.userData.tonos)) m.toneMapped = false;
};

// ---------- cielo ----------
const CIELOS = {
  dia:       { arriba: 0x3f9df0, medio: 0x8fd4ff, horizonte: 0xe4f6ff, sol: 0xfff0d6, solI: 2.8, hemiCielo: 0xf2f8ff, hemiSuelo: 0x8fcf6a, hemiI: 1.3, nube: 0xffffff, colina: 0x7fd08a },
  atardecer: { arriba: 0x3a2b9c, medio: 0xff6fb1, horizonte: 0xffd08a, sol: 0xffc48a, solI: 2.7, hemiCielo: 0xffd9ec, hemiSuelo: 0x9a78d0, hemiI: 1.25, nube: 0xffd9e6, colina: 0x8a6fd8 },
  noche:     { arriba: 0x0a0f3d, medio: 0x2a2f96, horizonte: 0x7a62e0, sol: 0xc4d2ff, solI: 1.7, hemiCielo: 0x9fb0ff, hemiSuelo: 0x3a3f8a, hemiI: 1.15, nube: 0x9aa6f0, colina: 0x3d3aa0, estrellas: true },
};

// Cúpula de cielo con degradado (sigue a la cámara sola). colores: { arriba, medio, horizonte, abajo } o [arriba, medio, horizonte]
export function cieloDegradado(scene, colores = {}) {
  const c = Array.isArray(colores) ? { arriba: colores[0], medio: colores[1], horizonte: colores[2] } : colores;
  const hor = col(c.horizonte ?? 0xe4f6ff), top = col(c.arriba ?? 0x3f9df0);
  const mid = c.medio != null ? col(c.medio) : top.clone().lerp(hor, .5);
  const low = c.abajo != null ? col(c.abajo) : hor;
  const R = 100, geo = new THREE.SphereGeometry(R, 24, 16);
  const p = geo.attributes.position, cs = new Float32Array(p.count * 3), t = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const h = p.getY(i) / R;                       // -1 abajo … 1 arriba
    if (h <= 0) t.copy(hor).lerp(low, Math.min(1, -h * 3));
    else if (h < .32) t.copy(hor).lerp(mid, h / .32);
    else t.copy(mid).lerp(top, Math.min(1, (h - .32) / .55));
    cs[i * 3] = t.r; cs[i * 3 + 1] = t.g; cs[i * 3 + 2] = t.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cs, 3));
  const domo = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, depthTest: false, toneMapped: false }));
  domo.name = 'cielo'; domo.frustumCulled = false; domo.renderOrder = -10; domo.matrixAutoUpdate = false;
  domo.onBeforeRender = (r, s, cam) => {
    const e = cam.matrixWorld.elements, k = cam.far * .9 / R;
    domo.matrixWorld.makeScale(k, k, k).setPosition(e[12], e[13], e[14]);
  };
  if (c.estrellas) {
    const n = 220, ps = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, y = .12 + Math.random() * .88, r = Math.sqrt(1 - y * y) * R * .97;
      ps[i * 3] = Math.cos(a) * r; ps[i * 3 + 1] = y * R * .97; ps[i * 3 + 2] = Math.sin(a) * r;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(ps, 3));
    const est = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false, depthWrite: false, depthTest: false, toneMapped: false }));
    est.frustumCulled = false; est.renderOrder = -9; est.matrixAutoUpdate = false;
    est.onBeforeRender = () => { est.matrixWorld.copy(domo.matrixWorld); };
    domo.add(est);
  }
  scene.add(domo);
  return domo;
}

let texNube = null;
function texturaNube() {
  if (texNube) return texNube;
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  const bola = (x, y, r, a) => { const gr = g.createRadialGradient(x, y, r * .15, x, y, r); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(.62, `rgba(255,255,255,${a * .82})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  [[62, 84, 38], [104, 62, 46], [150, 58, 44], [194, 80, 40], [128, 90, 44], [86, 92, 34], [170, 94, 34]].forEach(([x, y, r]) => bola(x, y, r, 1));
  texNube = new THREE.CanvasTexture(c); texNube.colorSpace = THREE.SRGBColorSpace;
  return texNube;
}
// Nubes suaves que pasan despacito, lejos y arriba. Llamar a update(dt, camera) en cada cuadro.
export function nubes(scene, { n = 9, radio = 120, altura = 38, color = 0xffffff, opacidad = .92, velocidad = 1 } = {}) {
  const grupo = new THREE.Group(); grupo.name = 'nubes';
  const lista = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.SpriteMaterial({ map: texturaNube(), color, transparent: true, opacity: opacidad * (.7 + Math.random() * .3), fog: false, depthWrite: false, toneMapped: false });
    const s = new THREE.Sprite(m), w = radio * (.26 + Math.random() * .2);
    s.scale.set(w, w * .5, 1);
    const d = { s, a: (i / n) * Math.PI * 2 + Math.random() * .5, r: radio * (.75 + Math.random() * .5), y: altura * (.8 + Math.random() * .7), v: (.006 + Math.random() * .006) * velocidad };
    lista.push(d); grupo.add(s);
  }
  const poner = () => lista.forEach(d => d.s.position.set(Math.cos(d.a) * d.r, d.y, Math.sin(d.a) * d.r));
  poner(); scene.add(grupo);
  return {
    grupo,
    update(dt, camera) {
      for (const d of lista) d.a += d.v * dt;
      poner();
      if (camera) { grupo.position.x = camera.position.x; grupo.position.z = camera.position.z; }
    },
    quitar() { scene.remove(grupo); lista.forEach(d => d.s.material.dispose()); },
  };
}

// Colinas lejanas de pocos polígonos, en dos anillos (las de atrás más clarito). update(dt, camera) las mantiene lejos.
export function colinas(scene, { n = 16, radio = 130, altura = 16, color = 0x7fd08a, horizonte = 0xe4f6ff } = {}) {
  const grupo = new THREE.Group(); grupo.name = 'colinas';
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const cerca = new THREE.MeshLambertMaterial({ color: col(color).clone().lerp(col(horizonte), .25), flatShading: true, fog: false });
  const lejos = new THREE.MeshLambertMaterial({ color: col(color).clone().lerp(col(horizonte), .6), flatShading: true, fog: false });
  let semilla = 7; const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
  for (let anillo = 0; anillo < 2; anillo++) {
    const k = anillo ? 1.3 : 1, cuantas = anillo ? n + 4 : n;
    for (let i = 0; i < cuantas; i++) {
      const a = (i / cuantas) * Math.PI * 2 + azar() * .3 + anillo * .2, w = radio * (.2 + azar() * .16) * k, h = altura * (.7 + azar() * .9) * k;
      const m = new THREE.Mesh(geo, anillo ? lejos : cerca);
      m.scale.set(w, h, w * .8); m.rotation.y = azar() * 6;
      m.position.set(Math.cos(a) * radio * k, -h * .28, Math.sin(a) * radio * k);
      grupo.add(m);
    }
  }
  scene.add(grupo);
  return {
    grupo,
    update(dt, camera) { if (camera) { grupo.position.x = camera.position.x; grupo.position.z = camera.position.z; } },
    quitar() { scene.remove(grupo); cerca.dispose(); lejos.dispose(); },
  };
}

let texPunto = null;
function texturaPunto() {
  if (texPunto) return texPunto;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  texPunto = new THREE.CanvasTexture(c); texPunto.colorSpace = THREE.SRGBColorSpace;
  return texPunto;
}
// Partículas de ambiente alrededor de la cámara: 'polen' (flota), 'brillos' (titilan) o 'nieve' (cae).
export function particulas(scene, tipo = 'polen', { n = esMovil() ? 40 : 70, caja = [26, 12, 26], color } = {}) {
  const T = { polen: { color: 0xfff6b8, tam: .2, vy: .18, op: .8 }, brillos: { color: 0xffffff, tam: .26, vy: .08, op: .95 }, nieve: { color: 0xffffff, tam: .22, vy: -.9, op: .9 } }[tipo] || { color: 0xfff6b8, tam: .2, vy: .18, op: .8 };
  const pos = new Float32Array(n * 3), fase = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - .5) * caja[0]; pos[i * 3 + 1] = Math.random() * caja[1]; pos[i * 3 + 2] = (Math.random() - .5) * caja[2]; fase[i] = Math.random() * 6.28; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: texturaPunto(), color: color ?? T.color, size: T.tam, transparent: true, opacity: T.op, depthWrite: false, toneMapped: false, blending: tipo === 'brillos' ? THREE.AdditiveBlending : THREE.NormalBlending });
  const puntos = new THREE.Points(geo, mat); puntos.name = 'particulas'; puntos.frustumCulled = false;
  scene.add(puntos);
  let t = 0;
  const vuelta = (v, c, lado) => { let r = (v - c + lado / 2) % lado; if (r < 0) r += lado; return c + r - lado / 2; };
  return {
    puntos,
    update(dt, camera) {
      t += dt;
      const cx = camera ? camera.position.x : 0, cz = camera ? camera.position.z : 0;
      for (let i = 0; i < n; i++) {
        const f = fase[i];
        pos[i * 3] = vuelta(pos[i * 3] + Math.sin(t * .6 + f) * .25 * dt, cx, caja[0]);
        let y = pos[i * 3 + 1] + T.vy * (.6 + (f % 1) * .8) * dt;
        if (y > caja[1]) y -= caja[1]; else if (y < 0) y += caja[1];
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = vuelta(pos[i * 3 + 2] + Math.cos(t * .5 + f * 1.7) * .25 * dt, cz, caja[2]);
      }
      geo.attributes.position.needsUpdate = true;
      if (tipo === 'brillos') mat.opacity = T.op * (.7 + .3 * Math.sin(t * 3));
    },
    quitar() { scene.remove(puntos); geo.dispose(); mat.dispose(); },
  };
}

// ¿la página no pintó nada detrás del lienzo? (ni color ni degradado en el lienzo, body o html)
function sinFondo(canvas) {
  try {
    return [canvas, document.body, document.documentElement].every(el => { const cs = getComputedStyle(el); return cs.backgroundImage === 'none' && /rgba\(.*, 0\)|transparent/.test(cs.backgroundColor); })
      && !document.querySelector('canvas.parque, .tema-fondo');
  } catch (e) { return false; }
}

export function crearMundo(canvas, opts = {}) {
  const { fog = 0xdff3ff, near = 40, far = 120, fov = 55, shadows = true } = opts;
  const movil = esMovil();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  let pr = Math.min(devicePixelRatio || 1, movil ? 1.75 : 2);
  renderer.setPixelRatio(pr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = opts.tonos === false ? THREE.NoToneMapping : opts.tonos === 'aces' ? THREE.ACESFilmicToneMapping : THREE.CustomToneMapping;
  renderer.toneMappingExposure = opts.exposicion ?? EXPOSICION;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  if (fog !== null) scene.fog = new THREE.Fog(fog, near, far);
  const camera = new THREE.PerspectiveCamera(fov, 1, .1, 400);
  // luz de cielo + sol cálido con sombra suave + una luz fría de contra para despegar a los personajes del fondo
  const hemi = new THREE.HemisphereLight(0xf2f8ff, 0x8fcf6a, 1.3);
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.8);
  sun.position.set(6, 14, 8);
  sun.castShadow = shadows;
  const mapa = movil ? 1024 : 2048;
  sun.shadow.mapSize.set(mapa, mapa);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = .03;
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 });
  const contra = new THREE.DirectionalLight(0xbcd6ff, .55);
  contra.position.set(-6, 5, -9);
  scene.add(hemi, sun, sun.target, contra);
  const fns = [];
  const world = { THREE, renderer, scene, camera, sun, hemi, contra, onFrame: f => fns.push(f), fovFor: a => fov, calidad: 'alta', cielo: null };
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = world.fovFor(camera.aspect);
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();
  world.resize = resize;

  // ---------- cielo, nubes, colinas y partículas ----------
  const extras = { domo: null, nubes: null, colinas: null, particulas: null };
  function ponerCielo(tipo, o = {}) {
    if (extras.domo) { scene.remove(extras.domo); extras.domo.geometry.dispose(); extras.domo.material.dispose(); extras.domo = null; }
    ['nubes', 'colinas'].forEach(k => { if (extras[k]) { extras[k].quitar(); extras[k] = null; } });
    world.cielo = tipo || null;
    if (!tipo) return;
    // 'auto': se conserva el fondo de la página y solo se añaden nubes
    const auto = tipo === 'auto', C = CIELOS[auto ? 'dia' : tipo] || CIELOS.dia;
    const hor = col(C.horizonte);
    if (!auto) {
      extras.domo = cieloDegradado(scene, C);
      if (scene.fog && opts.fog === undefined) scene.fog.color.copy(hor);
      sun.color.set(C.sol); sun.intensity = C.solI; hemi.color.set(C.hemiCielo); hemi.groundColor.set(C.hemiSuelo); hemi.intensity = C.hemiI;
    }
    const nn = o.nubes ?? opts.nubes;
    if (nn !== false) extras.nubes = nubes(scene, { n: typeof nn === 'number' ? nn : (movil ? 6 : 9), color: C.nube, opacidad: tipo === 'noche' ? .5 : auto ? .8 : .92 });
    const cc = o.colinas ?? opts.colinas;
    if (cc === true || (cc !== false && !auto)) extras.colinas = colinas(scene, { color: C.colina, horizonte: hor, radio: Math.min(150, Math.max(70, (scene.fog ? scene.fog.far : 120) * 1.15)) });
  }
  world.ponerCielo = ponerCielo;
  world.ponerParticulas = tipo => {
    if (extras.particulas) { extras.particulas.quitar(); extras.particulas = null; }
    if (tipo && nivel < 3) extras.particulas = particulas(scene, tipo === true ? 'polen' : tipo);
  };
  world.extras = extras;

  // ---------- regulador: si el aparato va lento (menos de ~28 cuadros por segundo durante 2 s) baja la calidad ----------
  let nivel = 0, tAcum = 0, cuadros = 0, tAntes = 0, tInicio = 0;
  const fija = opts.calidad === 'fija' || window.__calidadFija;
  function bajar() {
    while (nivel < 3) {
      nivel++;
      if (nivel === 1) { if (pr > 1.25) { pr = 1.25; renderer.setPixelRatio(pr); resize(); break; } }
      else if (nivel === 2) {
        let hizo = false;
        if (pr > 1) { pr = 1; renderer.setPixelRatio(pr); resize(); hizo = true; }
        if (sun.castShadow && sun.shadow.mapSize.x > 512) { sun.shadow.mapSize.set(512, 512); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } hizo = true; }
        if (hizo) break;
      } else {
        sun.castShadow = false; renderer.shadowMap.enabled = false;
        scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); });
        if (extras.particulas) { extras.particulas.quitar(); extras.particulas = null; }
      }
    }
    world.calidad = ['alta', 'media', 'baja', 'minima'][nivel];
  }
  function medir(ahora) {
    if (fija || nivel >= 3) return;
    const d = ahora - tAntes; tAntes = ahora;
    if (!tInicio) { tInicio = ahora; return; }
    if (document.hidden || d > 1000 || d <= 0 || ahora - tInicio < 3000) { tAcum = 0; cuadros = 0; return; }
    tAcum += d; cuadros++;
    if (tAcum >= 2000) { const fps = cuadros * 1000 / tAcum; tAcum = 0; cuadros = 0; if (fps < 28) bajar(); }
  }

  const clock = new THREE.Clock();
  // si una parte del juego falla en un cuadro, se anota y se sigue dibujando (antes el juego quedaba congelado)
  const avisados = new Set();
  const avisa = (k, e, txt) => { if (!avisados.has(k)) { avisados.add(k); console.error(txt, e); } };
  function loop(ahora) {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), .05);
    for (const f of fns) {
      try { f(dt, clock.elapsedTime); }
      catch (e) { avisa(String(e && e.stack || e).slice(0, 300), e, 'Error en el juego (sigue funcionando):'); }
    }
    try {
      if (extras.nubes) extras.nubes.update(dt, camera);
      if (extras.colinas) extras.colinas.update(dt, camera);
      if (extras.particulas) extras.particulas.update(dt, camera);
    } catch (e) { avisa('extras', e, 'Error en el cielo (sigue funcionando):'); }
    try { renderer.render(scene, camera); } catch (e) { avisa('render', e, 'Error al dibujar:'); }
    try { medir(ahora ?? performance.now()); } catch (e) {}
  }
  world.start = () => requestAnimationFrame(loop);

  try {
    const c = opts.cielo;
    if (c === 'dia' || c === 'atardecer' || c === 'noche') ponerCielo(c);
    else if (c === undefined && fog !== null) ponerCielo(sinFondo(canvas) ? 'dia' : 'auto');
    if (opts.particulas) world.ponerParticulas(opts.particulas);
  } catch (e) { console.error('No se pudo poner el cielo:', e); }
  return world;
}

// Tarjeta con dibujo y/o palabra para usar como textura
export function tarjeta(text, { emoji = '', color = '#3f8ee8', size = 512, bg = '#ffffff', ink = '#23324a', round = true, emojiAlpha = 1 } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const s = size / 512;
  if (round) {
    g.fillStyle = color; g.beginPath(); g.roundRect(8 * s, 8 * s, 496 * s, 496 * s, 80 * s); g.fill();
    g.fillStyle = bg; g.beginPath(); g.roundRect(34 * s, 34 * s, 444 * s, 444 * s, 60 * s); g.fill();
  }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (emoji) {
    g.font = `${(text ? 230 : 300) * s}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    g.globalAlpha = emojiAlpha; g.fillText(emoji, 256 * s, (text ? 205 : 262) * s); g.globalAlpha = 1;
  }
  if (text) {
    g.fillStyle = ink;
    const fs = (emoji ? (text.length > 6 ? 92 : 112) : (text.length > 7 ? 104 : text.length > 4 ? 136 : text.length > 2 ? 180 : 230)) * s;
    g.font = `700 ${fs}px Andika, "Century Gothic", sans-serif`;
    g.fillText(text, 256 * s, (emoji ? 420 : 262) * s);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// Chispitas de colores que salen de un punto (festejo en 3D)
export function chispitas(scene) {
  const pool = [];
  const geo = new THREE.OctahedronGeometry(.08);
  const cols = [0xef5b5b, 0xf39a3b, 0xf6c33b, 0x4cb87a, 0x3f8ee8, 0x9a6ee0, 0xff7eb6, 0xffffff];
  return {
    burst(pos, n = 40, spread = 1) {
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: cols[i % cols.length] }));
        m.position.copy(pos);
        m.userData.v = new THREE.Vector3((Math.random() - .5) * 6 * spread, Math.random() * 6 + 2, (Math.random() - .5) * 6 * spread);
        m.userData.life = 1.2 + Math.random() * .5;
        scene.add(m); pool.push(m);
      }
    },
    update(dt) {
      for (let i = pool.length - 1; i >= 0; i--) {
        const m = pool[i];
        m.userData.v.y -= 9 * dt;
        m.position.addScaledVector(m.userData.v, dt);
        m.rotation.x += dt * 8; m.rotation.y += dt * 6;
        m.userData.life -= dt;
        if (m.userData.life <= 0) { scene.remove(m); m.material.dispose(); pool.splice(i, 1); }
      }
    },
  };
}

export const esperaFuente = () => Promise.race([document.fonts.load('700 100px Andika'), new Promise(r => setTimeout(r, 2500))]).catch(() => {});
