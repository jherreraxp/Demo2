// Menús que se pueden manejar sin tocar la pantalla: flechas + Enter/Espacio del teclado, o un mando
// (cruceta o palanca para moverse, A para elegir, B para volver). Lo carga solo js/tema.js en todas las páginas.
//
// Solo actúa cuando hay un menú a la vista: la página del menú (<body class="menu"> o <body data-nav="menu">),
// una portada (.portada visible) o un cuadro de diálogo abierto ([role=dialog], .modal, .fin-…). Mientras se
// juega (portada escondida y sin diálogos) no toca ninguna tecla: las flechas son del juego. Con mando, mientras
// se juega, la cruceta manda las mismas flechas del teclado y A manda Espacio.
// Para excluir una zona: data-nav="no". Para elegir el botón por donde empezar: data-nav-inicio.
(function () {
  'use strict';
  if (window.Nav) return;
  const SEL = 'a[href], button, [role="button"], [role="tab"], [role="option"], select, summary, input[type="checkbox"], input[type="radio"], [tabindex]:not([tabindex="-1"])';
  const DIALOGOS = '[role="dialog"], dialog[open], [aria-modal="true"], .modal, .tema-picker, .fin, [class^="fin-"], [class*=" fin-"], [data-nav="dialogo"]';
  const J = () => window.Juego;
  const quieto = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

  // ---------- qué se ve ----------
  function seVe(el) {
    if (!el || !el.isConnected || el.closest('[hidden], [inert], [aria-hidden="true"], [data-nav="no"]')) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.pointerEvents !== 'none' && +cs.opacity > .05;
  }
  // el diálogo abierto que está más arriba (el último del documento que se ve)
  function dialogo() {
    const ds = [...document.querySelectorAll(DIALOGOS)].filter(seVe);
    return ds.length ? ds[ds.length - 1] : null;
  }
  const portada = () => [...document.querySelectorAll('.portada')].find(seVe) || null;
  const esMenu = () => !!document.body && (document.body.classList.contains('menu') || document.body.dataset.nav === 'menu');
  // raíz dentro de la que se navega, o null si se está jugando
  function raiz() { return dialogo() || portada() || (esMenu() ? document.body : null); }
  function candidatos(root) {
    return [...root.querySelectorAll(SEL)].filter(el => !el.disabled && el.getAttribute('aria-disabled') !== 'true' && el.tagName !== 'CANVAS' && seVe(el));
  }
  const escribe = el => !!el && (el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'CANVAS' || (el.tagName === 'INPUT' && !/^(checkbox|radio|button|submit)$/.test(el.type)));

  // ---------- anillo de foco animado ----------
  let anillo = null, conAnillo = false, cuadro = 0;
  function estilo() {
    if (document.getElementById('nav-css')) return;
    const s = document.createElement('style'); s.id = 'nav-css';
    s.textContent = `
.nav-anillo { position: fixed; left: 0; top: 0; z-index: 2147483000; pointer-events: none; box-sizing: border-box; border: 4px solid var(--tema-neon1, #3df2ff); border-radius: 18px;
  box-shadow: 0 0 0 3px rgba(11, 15, 58, .9), 0 0 0 6px var(--tema-primario, #ffe14d), 0 0 22px 4px var(--tema-neon1, #3df2ff), inset 0 0 0 2px rgba(11, 15, 58, .55);
  opacity: 0; transition: opacity .12s; will-change: transform, width, height; }
.nav-anillo.ver { opacity: 1; animation: nav-late 1.1s ease-in-out infinite; }
@keyframes nav-late { 50% { box-shadow: 0 0 0 3px rgba(11, 15, 58, .9), 0 0 0 9px var(--tema-primario, #ffe14d), 0 0 30px 8px var(--tema-neon1, #3df2ff), inset 0 0 0 2px rgba(11, 15, 58, .55); } }
html.nav-activo :focus-visible { outline-color: transparent !important; }
@media (prefers-reduced-motion: reduce) { .nav-anillo.ver { animation: none; } }`;
    document.head.appendChild(s);
  }
  function pintar() {
    cuadro = 0;
    const el = document.activeElement;
    if (!conAnillo || !anillo || !el || el === document.body || !seVe(el)) { if (anillo) anillo.classList.remove('ver'); return; }
    const r = el.getBoundingClientRect(), m = 6;
    anillo.style.width = (r.width + m * 2) + 'px'; anillo.style.height = (r.height + m * 2) + 'px';
    anillo.style.transform = `translate(${Math.round(r.left - m)}px, ${Math.round(r.top - m)}px)`;
    const br = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    anillo.style.borderRadius = Math.min(Math.max(12, br + m), (Math.min(r.width, r.height) + m * 2) / 2) + 'px';
    anillo.classList.add('ver');
    cuadro = requestAnimationFrame(pintar);          // sigue al botón mientras la página se desliza
  }
  function mostrarAnillo(on) {
    conAnillo = on;
    document.documentElement.classList.toggle('nav-activo', on);
    if (on) {
      estilo();
      if (!anillo) { anillo = document.createElement('div'); anillo.className = 'nav-anillo'; anillo.setAttribute('aria-hidden', 'true'); document.body.appendChild(anillo); }
      if (!cuadro) pintar();
    } else if (anillo) anillo.classList.remove('ver');
  }

  // ---------- sonidos cortitos ----------
  let hubo = false, tSon = 0;                         // el audio solo después del primer toque o tecla
  function son(tipo) {
    const j = J(); if (!j || !hubo) return;
    const ahora = performance.now(); if (tipo !== 'elegir' && ahora - tSon < 70) return; tSon = ahora;
    try {
      if (j.tones) {
        if (tipo === 'mover') j.tones([1040], .045, 'sine', .07);
        else if (tipo === 'pasar') j.tones([1320], .03, 'sine', .035);
        else j.tones([700, 1050], .055, 'triangle', .09);
      } else if (j.sfx) j.sfx('tick', tipo === 'elegir' ? .3 : .15);
    } catch (e) {}
  }

  // ---------- moverse ----------
  const DIR = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  function inicio(root, lista) {
    return lista.find(e => e.matches('[data-nav-inicio]')) || lista.find(e => e.matches('.go, .seguir, [autofocus]')) || lista.find(e => e.matches('.carta, .on')) || lista[0] || null;
  }
  function enfocar(el, conSonido = true) {
    if (!el) return false;
    mostrarAnillo(true);
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: quieto() ? 'auto' : 'smooth' }); } catch (e) {}
    if (conSonido) son('mover');
    if (!cuadro) pintar();
    return true;
  }
  // el botón más cercano en esa dirección (cuenta más quedar alineado que la distancia)
  // estricto: solo lo que queda de frente; así ← → no saltan a otra fila (al final de la fila no pasa nada).
  // Hacia arriba y abajo, si no hay nada de frente, se acepta lo más cercano en esa dirección.
  function vecino(desde, lista, dir) { return busca(desde, lista, dir, true) || (dir[1] ? busca(desde, lista, dir, false) : null); }
  function busca(desde, lista, [dx, dy], estricto) {
    const a = desde.getBoundingClientRect();
    let mejor = null, nota = Infinity;
    for (const el of lista) {
      if (el === desde || el.contains(desde)) continue;
      const b = el.getBoundingClientRect();
      const avance = dx ? (dx > 0 ? b.left - a.right : a.left - b.right) : (dy > 0 ? b.top - a.bottom : a.top - b.bottom);
      const centro = dx ? ((b.left + b.right) - (a.left + a.right)) / 2 * dx : ((b.top + b.bottom) - (a.top + a.bottom)) / 2 * dy;
      if (centro < 6 || avance < -Math.min(dx ? a.width : a.height, dx ? b.width : b.height) * .6) continue;
      const hueco = dx ? Math.max(0, b.top - a.bottom, a.top - b.bottom) : Math.max(0, b.left - a.right, a.left - b.right);
      // ← →: solo la misma fila. ↑ ↓: la misma columna o lo que cae dentro de un cono
      if (estricto && (dx ? hueco > 8 : (hueco > 0 && Math.max(0, avance) < hueco * 1.2))) continue;
      const desvio = dx ? Math.abs((b.top + b.bottom) - (a.top + a.bottom)) / 2 : Math.abs((b.left + b.right) - (a.left + a.right)) / 2;
      const n = Math.max(0, avance) + hueco * 3 + desvio * .35 + (el.contains(desde) ? 5000 : 0);
      if (n < nota) { nota = n; mejor = el; }
    }
    return mejor;
  }
  // devuelve true si movió el foco
  function mover(tecla) {
    const root = raiz(); if (!root) return false;
    const lista = candidatos(root); if (!lista.length) return false;
    const act = document.activeElement;
    if (!act || act === document.body || !root.contains(act) || !seVe(act)) return enfocar(inicio(root, lista));
    const v = vecino(act, lista, DIR[tecla]);
    return v ? enfocar(v) : false;
  }
  function elegir() {
    const root = raiz(), el = document.activeElement;
    if (!root) return false;
    if (!el || el === document.body || !root.contains(el)) return enfocar(inicio(root, candidatos(root)));
    son('elegir'); el.click(); return true;
  }
  function volver() {
    const d = dialogo();
    if (d) {
      const x = d.querySelector('[data-cerrar], .cerrar, [aria-label^="Cerrar" i]');
      if (x && seVe(x)) x.click(); else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
      son('elegir'); return true;
    }
    if (esMenu()) { window.scrollTo({ top: 0, behavior: quieto() ? 'auto' : 'smooth' }); return false; }
    if (!portada()) return false;
    const casa = document.querySelector('a.round-btn[href="index.html"], a[href="index.html"], a[href="./"]');
    son('elegir'); if (casa) casa.click(); else location.href = 'index.html';
    return true;
  }

  // ---------- teclado ----------
  addEventListener('keydown', e => {
    hubo = true;
    if (e.key === 'Tab') { if (raiz()) { mostrarAnillo(true); } return; }
    if (e.altKey || e.ctrlKey || e.metaKey || !e.isTrusted) return;
    const act = document.activeElement;
    if (DIR[e.key]) {
      if (escribe(act) || (act && act.closest && act.closest('[data-nav="no"]'))) return;
      if (act && act.tagName === 'SELECT' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) return;
      if (act && act.tagName === 'INPUT' && act.type === 'radio') return;
      if (!raiz()) return;                              // se está jugando: las flechas son del juego
      if (mover(e.key)) e.preventDefault();
    }
  }, true);
  // Espacio en enlaces y en cosas con role=button (Enter ya funciona solo); si la página ya lo atendió, no se repite
  addEventListener('keydown', e => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || !e.isTrusted) return;
    if (e.key !== ' ' && e.key !== 'Enter') return;
    const el = document.activeElement, root = raiz();
    if (!root) return;
    if (!el || el === document.body) { if (e.key === 'Enter' && !escribe(el)) { if (elegir()) e.preventDefault(); } return; }
    if (!root.contains(el) || escribe(el)) return;
    const nativo = el.tagName === 'BUTTON' || el.tagName === 'SELECT' || el.tagName === 'SUMMARY' || el.tagName === 'INPUT';
    if (nativo) { son('elegir'); return; }
    if (el.tagName === 'A' && e.key === 'Enter') { son('elegir'); return; }
    if (el.matches(SEL)) { e.preventDefault(); son('elegir'); el.click(); }
  });
  // con el dedo o el ratón el anillo se esconde
  ['pointerdown', 'wheel'].forEach(t => addEventListener(t, () => { hubo = hubo || t === 'pointerdown'; if (conAnillo) mostrarAnillo(false); }, { capture: true, passive: true }));
  addEventListener('focusin', () => { if (conAnillo && !cuadro) pintar(); });

  // sonido al pasar el ratón por encima de un botón (solo con ratón)
  let ultimo = null;
  addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse' || !e.target.closest) return;
    const el = e.target.closest('a.carta, a.seguir, button, [role="button"], .op, .fchip');
    if (!el || el === ultimo || el.disabled) { if (!el) ultimo = null; return; }
    ultimo = el;
    if (raiz()) son('pasar');
  }, { passive: true });

  // ---------- mando ----------
  const TECLA = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  let sondeo = 0, antes = { dir: null, a: false, b: false }, tRep = 0, enJuego = new Set();
  const tecla = (tipo, key) => window.dispatchEvent(new KeyboardEvent(tipo, { key, code: key === ' ' ? 'Space' : key, bubbles: true, cancelable: true }));
  function soltar() { enJuego.forEach(k => tecla('keyup', k)); enJuego.clear(); }
  function leer() {
    sondeo = 0;
    let gp = null;
    try { gp = [...navigator.getGamepads()].find(g => g && g.connected); } catch (e) {}
    if (!gp) { soltar(); return; }
    sondeo = requestAnimationFrame(leer);
    if (document.hidden) return;
    const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), ax = gp.axes || [];
    const dir = b(12) || ax[1] < -.55 ? 'ArrowUp' : b(13) || ax[1] > .55 ? 'ArrowDown' : b(14) || ax[0] < -.55 ? 'ArrowLeft' : b(15) || ax[0] > .55 ? 'ArrowRight' : null;
    const a = b(0), atras = b(1), ahora = performance.now();
    if (dir || a || atras) hubo = true;
    if (raiz()) {
      soltar();
      if (dir && (dir !== antes.dir || ahora > tRep)) { tRep = ahora + (dir !== antes.dir ? 380 : 150); mover(dir); }
      if (a && !antes.a) elegir();
      if (atras && !antes.b) volver();
    } else {
      // jugando: la cruceta son las flechas y A es Espacio
      const quiere = new Set(); if (dir) quiere.add(dir); if (a) quiere.add(' ');
      enJuego.forEach(k => { if (!quiere.has(k)) { tecla('keyup', k); enJuego.delete(k); } });
      quiere.forEach(k => { if (!enJuego.has(k)) { tecla('keydown', k); enJuego.add(k); } });
    }
    antes = { dir, a, b: atras };
  }
  const empezarMando = () => { if (!sondeo && navigator.getGamepads) sondeo = requestAnimationFrame(leer); };
  addEventListener('gamepadconnected', empezarMando);
  addEventListener('visibilitychange', () => { if (document.hidden) soltar(); else empezarMando(); });
  empezarMando();

  window.Nav = { activo: () => !!raiz(), mover, elegir, volver, enfocar, teclas: TECLA };
})();
