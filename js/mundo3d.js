// Utilidades 3D compartidas: escena con luz bonita, ajuste de tamaño, bucle, letreros y chispitas.
import * as THREE from 'three';

export function crearMundo(canvas, { fog = 0xdff3ff, near = 40, far = 120, fov = 55, shadows = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  if (fog !== null) scene.fog = new THREE.Fog(fog, near, far);
  const camera = new THREE.PerspectiveCamera(fov, 1, .1, 400);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8fcf6a, 1.7));
  const sun = new THREE.DirectionalLight(0xfff2dc, 2.3);
  sun.position.set(6, 14, 8);
  sun.castShadow = shadows;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 });
  scene.add(sun, sun.target);
  const fns = [];
  const world = { THREE, renderer, scene, camera, sun, onFrame: f => fns.push(f), fovFor: a => fov };
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = world.fovFor(camera.aspect);
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();
  world.resize = resize;
  const clock = new THREE.Clock();
  function loop() {
    const dt = Math.min(clock.getDelta(), .05);
    fns.forEach(f => f(dt, clock.elapsedTime));
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  world.start = () => requestAnimationFrame(loop);
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
