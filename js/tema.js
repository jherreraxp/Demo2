// Tema visual: paletas de colores y una foto de fondo difuminada (por ejemplo, la foto de la familia).
// Se guarda en este aparato (localStorage) y se aplica solo en cada página.
(function () {
  'use strict';
  const PALETAS = {
    rosa:     { nombre: 'Rosa y lila', emoji: '💖', bg1: '#ffd6f0', bg2: '#c7b3ff', acento: '#ff5dab', acento2: '#8a5cf0', tinta: '#3a1f5c', bloque: 'rgba(255,255,255,.22)' },
    aqua:     { nombre: 'Aqua',        emoji: '🐬', bg1: '#5ff2e0', bg2: '#34c3e8', acento: '#1aa3d9', acento2: '#5b4fe0', tinta: '#123a52', bloque: 'rgba(255,255,255,.18)' },
    morado:   { nombre: 'Morado',      emoji: '🔮', bg1: '#b99cff', bg2: '#6b47d8', acento: '#ff7eb6', acento2: '#4a2fb3', tinta: '#2a1650', bloque: 'rgba(255,255,255,.14)' },
    arcoiris: { nombre: 'Arcoíris',    emoji: '🌈', bg1: '#ffe27a', bg2: '#ff9ad5', bg3: '#8fe3ff', acento: '#ff5d8f', acento2: '#3f8ee8', tinta: '#2b2a4a', bloque: 'rgba(255,255,255,.2)' },
    menta:    { nombre: 'Menta',       emoji: '🌿', bg1: '#c8f7dc', bg2: '#7fd8c2', acento: '#2fb38a', acento2: '#3f8ee8', tinta: '#15433a', bloque: 'rgba(255,255,255,.22)' },
  };
  const K_TEMA = 'bl-tema', K_FOTO = 'bl-foto', K_TODOS = 'bl-foto-todos';
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  const actual = () => (PALETAS[get(K_TEMA)] ? get(K_TEMA) : 'rosa');
  const esMenu = () => document.body && document.body.classList.contains('menu');

  const css = `
.tema-fondo { position: fixed; inset: -40px; z-index: -1; background-size: cover; background-position: center; filter: blur(14px) saturate(1.15); transform: scale(1.05); pointer-events: none; }
.tema-fondo::after { content: ""; position: absolute; inset: 0; background: linear-gradient(160deg, var(--tema-bg1), var(--tema-bg2)); opacity: .45; }
.tema-picker { position: fixed; z-index: 60; background: #fff; border-radius: 22px; padding: 12px; box-shadow: 0 12px 30px rgba(0,0,0,.25); display: grid; gap: 8px; font-family: "Baloo 2", system-ui, sans-serif; color: #23324a; width: min(300px, calc(100vw - 24px)); }
.tema-picker b { font-size: 18px; }
.tema-picker .tp-opts { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
.tema-picker .tp-opts button { aspect-ratio: 1; border-radius: 16px; border: 3px solid transparent; font-size: 24px; cursor: pointer; box-shadow: 0 3px 0 rgba(0,0,0,.15); }
.tema-picker .tp-opts button.on { border-color: #23324a; }
.tema-picker small { font-size: 13px; opacity: .75; }
`;
  function estilo() {
    if (document.getElementById('tema-css')) return;
    const s = document.createElement('style'); s.id = 'tema-css'; s.textContent = css;
    document.head.appendChild(s);
  }
  function aplicar() {
    const p = PALETAS[actual()], r = document.documentElement.style;
    r.setProperty('--tema-bg1', p.bg1); r.setProperty('--tema-bg2', p.bg2); r.setProperty('--tema-bg3', p.bg3 || p.bg2);
    r.setProperty('--tema-acento', p.acento); r.setProperty('--tema-acento2', p.acento2);
    r.setProperty('--tema-tinta', p.tinta); r.setProperty('--tema-bloque', p.bloque);
    document.documentElement.dataset.tema = actual();
    if (document.head) estilo();
    if (document.body) fondo();
  }
  // capa con la foto difuminada: siempre en el menú; en los juegos solo si se pidió y la página no es 3D
  function fondo() {
    let el = document.querySelector('.tema-fondo');
    const foto = get(K_FOTO);
    const ver = foto && (esMenu() || (get(K_TODOS) === '1' && !document.querySelector('canvas.mundo')));
    if (!ver) { if (el) el.remove(); document.body.classList.remove('con-foto'); return; }
    if (!el) { el = document.createElement('div'); el.className = 'tema-fondo'; el.setAttribute('aria-hidden', 'true'); document.body.prepend(el); }
    el.style.backgroundImage = `url("${foto}")`;
    document.body.classList.add('con-foto');
  }
  function set(id) { if (PALETAS[id]) { put(K_TEMA, id); aplicar(); } }
  // achica la foto a ~1280 px y la guarda como JPEG
  function setFoto(file) {
    return new Promise((ok, no) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, 1280 / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        let data = c.toDataURL('image/jpeg', .8);
        if (!put(K_FOTO, data)) { data = c.toDataURL('image/jpeg', .55); if (!put(K_FOTO, data)) return no(new Error('La foto es muy grande para guardarla')); }
        aplicar(); ok(data);
      };
      img.onerror = () => { URL.revokeObjectURL(url); no(new Error('No se pudo leer la foto')); };
      img.src = url;
    });
  }
  function quitarFoto() { put(K_FOTO, null); aplicar(); }
  const foto = () => get(K_FOTO);
  const fotoTodos = () => get(K_TODOS) === '1';
  function setFotoTodos(on) { put(K_TODOS, on ? '1' : '0'); aplicar(); }

  // cajita para elegir la paleta (botón 🎨 del menú)
  function picker(anchor) {
    const old = document.querySelector('.tema-picker'); if (old) { old.remove(); return; }
    estilo();
    const box = document.createElement('div'); box.className = 'tema-picker'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Colores');
    const pintar = () => {
      box.innerHTML = `<b>🎨 Colores</b><div class="tp-opts">${Object.entries(PALETAS).map(([k, p]) => `<button data-t="${k}" class="${k === actual() ? 'on' : ''}" title="${p.nombre}" aria-label="${p.nombre}" style="background:linear-gradient(135deg, ${p.bg1}, ${p.bg2})">${p.emoji}</button>`).join('')}</div><small>La foto de fondo se pone en el modo admin (papás).</small>`;
    };
    pintar();
    box.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; set(b.dataset.t); pintar(); window.Juego && window.Juego.sfx && window.Juego.sfx('pop'); });
    document.body.appendChild(box);
    const r = anchor ? anchor.getBoundingClientRect() : { left: 12, bottom: 60 };
    box.style.left = Math.max(12, Math.min(innerWidth - box.offsetWidth - 12, r.left)) + 'px';
    box.style.top = (r.bottom + 8) + 'px';
    setTimeout(() => document.addEventListener('pointerdown', function cerrar(e) { if (!box.contains(e.target) && e.target !== anchor) { box.remove(); document.removeEventListener('pointerdown', cerrar); } }), 0);
  }

  window.Tema = { PALETAS, aplicar, actual, set, setFoto, quitarFoto, foto, fotoTodos, setFotoTodos, picker };
  aplicar();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aplicar); else aplicar();
  addEventListener('storage', e => { if ([K_TEMA, K_FOTO, K_TODOS].includes(e.key)) aplicar(); });
})();
