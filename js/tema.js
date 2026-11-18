// Tema visual: paletas de colores y una foto de fondo difuminada (por ejemplo, la foto de la familia).
// Se guarda en este aparato (localStorage) y se aplica solo en cada página.
(function () {
  'use strict';
  // Cada paleta puede traer, además de los colores de siempre, los del estilo «videojuego»:
  // sobre (texto encima del fondo), primario (botón principal) y su tinta/sombra, neon1/neon2 (brillos),
  // panel (tarjetas de portada) con panelTinta/panelSuave/panelBorde, chip/chipTinta y titulo/tituloSombra.
  // Si no los trae, se usan valores claros (el aspecto de antes). OJO: 'tinta' siempre es tinta oscura para
  // escribir sobre superficies claras; para texto sobre el fondo de la paleta se usa --tema-sobre.
  // Además: desc (para quién es, se muestra en el admin), escena (3 colores del escenario del menú en paletas
  // oscuras) y efecto: 'estrellas' (cielo de noche), 'calma' (sin brillos ni animaciones de adorno, colores
  // suaves y festejos chiquitos) o 'fiesta' (luces de colores que giran).
  const PALETAS = {
    epico:    { nombre: 'Épico', emoji: '⚡', desc: 'Azul y violeta con neón (el de siempre)', bg1: '#1c3fd7', bg2: '#7a2df2', bg3: '#3d2fe0', acento: '#7b3ff2', acento2: '#0b6fd0', tinta: '#1b1440', bloque: 'rgba(255,255,255,.07)',
                oscuro: true, sobre: '#ffffff', primario: '#ffe14d', primarioTinta: '#1b1440', primarioSombra: '#c79a00', neon1: '#3df2ff', neon2: '#ff4fd8',
                panel: 'rgba(14,20,72,.88)', panelTinta: '#ffffff', panelSuave: '#c9d4ff', panelBorde: '#3df2ff', chip: '#eef3ff', chipTinta: '#1b1440', titulo: '#ffffff', tituloSombra: '#0b0f3a' },
    noche:    { nombre: 'Azul noche', emoji: '🌙', desc: 'Azul oscuro con estrellas y luz de luna', bg1: '#0c1838', bg2: '#1b1648', bg3: '#122458', acento: '#3f6fe0', acento2: '#2b4bb0', tinta: '#141c3d', bloque: 'rgba(255,255,255,.03)',
                oscuro: true, efecto: 'estrellas', sobre: '#f2f5ff', primario: '#ffd166', primarioTinta: '#1a1f40', primarioSombra: '#c4962b', neon1: '#7fc8ff', neon2: '#8f7cf0',
                panel: 'rgba(13,20,52,.93)', panelTinta: '#ffffff', panelSuave: '#b7c3ea', panelBorde: '#7fc8ff', chip: '#e9eeff', chipTinta: '#141c3d', titulo: '#ffffff', tituloSombra: '#070b22',
                escena: ['#2f4fb0', '#16235e', '#090e2a'] },
    pastel:   { nombre: 'Pastel', emoji: '🌸', desc: 'Rosa, lila y celeste muy suaves', bg1: '#ffe4f1', bg2: '#e3dcff', bg3: '#dff3ff', acento: '#e0609d', acento2: '#8c74e0', tinta: '#4a3566', bloque: 'rgba(255,255,255,.4)',
                primario: '#8c63e0', primarioTinta: '#ffffff', primarioSombra: '#6846b5', neon1: '#ffb3d9', neon2: '#b9a6ff', chip: '#f6f0ff', chipTinta: '#4a3566' },
    bebe:     { nombre: 'Bebé', emoji: '👶', desc: 'Para los más chiquitos: mucho contraste, negro sobre amarillo', bg1: '#fff7cc', bg2: '#ffd21f', bg3: '#ffe873', acento: '#d81e1e', acento2: '#0b3fc4', tinta: '#000000', bloque: 'rgba(0,0,0,.05)',
                sobre: '#000000', primario: '#d81e1e', primarioTinta: '#ffffff', primarioSombra: '#8f0f0f', neon1: '#ffffff', neon2: '#ff7a00',
                panel: '#ffffff', panelTinta: '#000000', panelSuave: '#222222', panelBorde: '#000000', chip: '#ffffff', chipTinta: '#000000', titulo: '#000000' },
    calma:    { nombre: 'Calma', emoji: '🍃', desc: 'Neutro y tranquilo: sin brillos ni adornos que se mueven', bg1: '#f2eee6', bg2: '#e3e6dd', bg3: '#ebe8df', acento: '#5d8275', acento2: '#6f7f9c', tinta: '#2f3b3a', bloque: 'transparent',
                efecto: 'calma', primario: '#557a6e', primarioTinta: '#ffffff', primarioSombra: '#3c5a50', neon1: '#a9c2b8', neon2: '#c5c0d6', chip: '#f4f1ea', chipTinta: '#2f3b3a' },
    fiesta:   { nombre: 'Fiesta', emoji: '🎉', desc: 'Súper estimulante: colores fuertes y luces que giran', bg1: '#e8257f', bg2: '#4a22e0', bg3: '#b620d8', acento: '#e8257f', acento2: '#4a22e0', tinta: '#2a0f4a', bloque: 'rgba(255,255,255,.12)',
                oscuro: true, efecto: 'fiesta', sobre: '#ffffff', primario: '#fff03d', primarioTinta: '#2a0f4a', primarioSombra: '#d18b00', neon1: '#3dfff2', neon2: '#ffe14d',
                panel: 'rgba(52,12,96,.9)', panelTinta: '#ffffff', panelSuave: '#f0d4ff', panelBorde: '#3dfff2', chip: '#fff6c9', chipTinta: '#2a0f4a', titulo: '#ffffff', tituloSombra: '#2a0a52',
                escena: ['#ff5fc8', '#8a2be2', '#2a0a52'] },
    rosa:     { nombre: 'Rosa y lila', emoji: '💖', bg1: '#ffd6f0', bg2: '#c7b3ff', acento: '#ff5dab', acento2: '#8a5cf0', tinta: '#3a1f5c', bloque: 'rgba(255,255,255,.22)' },
    aqua:     { nombre: 'Aqua',        emoji: '🐬', bg1: '#5ff2e0', bg2: '#34c3e8', acento: '#1aa3d9', acento2: '#5b4fe0', tinta: '#123a52', bloque: 'rgba(255,255,255,.18)' },
    morado:   { nombre: 'Morado',      emoji: '🔮', bg1: '#b99cff', bg2: '#6b47d8', acento: '#ff7eb6', acento2: '#4a2fb3', tinta: '#2a1650', bloque: 'rgba(255,255,255,.14)' },
    arcoiris: { nombre: 'Arcoíris',    emoji: '🌈', bg1: '#ffe27a', bg2: '#ff9ad5', bg3: '#8fe3ff', acento: '#ff5d8f', acento2: '#3f8ee8', tinta: '#2b2a4a', bloque: 'rgba(255,255,255,.2)' },
    menta:    { nombre: 'Menta',       emoji: '🌿', bg1: '#c8f7dc', bg2: '#7fd8c2', acento: '#2fb38a', acento2: '#3f8ee8', tinta: '#15433a', bloque: 'rgba(255,255,255,.22)' },
  };
  const K_TEMA = 'bl-tema', K_FOTO = 'bl-foto', K_TODOS = 'bl-foto-todos';
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  // sin plan Familia (modo demostración) los colores se prueban solo en esta visita y la foto no se guarda
  const demo = () => !!(window.Cuenta && window.Cuenta.esDemo && window.Cuenta.esDemo());
  const avisar = t => { if (window.Cuenta && window.Cuenta.avisoDemo) window.Cuenta.avisoDemo(t); };
  let temaPrueba = null;
  const actual = () => temaPrueba && PALETAS[temaPrueba] ? temaPrueba : (PALETAS[get(K_TEMA)] ? get(K_TEMA) : 'epico');
  const esMenu = () => document.body && document.body.classList.contains('menu');

  const css = `
.tema-fondo { position: fixed; inset: -40px; z-index: -1; background-size: cover; background-position: center; filter: blur(14px) saturate(1.15); transform: scale(1.05); pointer-events: none; }
.tema-fondo::after { content: ""; position: absolute; inset: 0; background: linear-gradient(160deg, var(--tema-bg1), var(--tema-bg2)); opacity: .45; }
.tema-picker { position: fixed; z-index: 60; background: #fff; border-radius: 22px; padding: 12px; box-shadow: 0 12px 30px rgba(0,0,0,.25); display: grid; gap: 8px; font-family: "Baloo 2", system-ui, sans-serif; color: #23324a; width: min(336px, calc(100vw - 24px)); }
.tema-picker b { font-size: 18px; }
.tema-picker .tp-opts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; max-height: 52vh; overflow-y: auto; padding: 2px; }
.tema-picker .tp-opts button { min-height: 62px; padding: 4px 2px; border-radius: 16px; border: 3px solid rgba(35,50,74,.15); font: 800 12px/1.05 "Baloo 2", system-ui, sans-serif; cursor: pointer; box-shadow: 0 3px 0 rgba(0,0,0,.15); display: grid; justify-items: center; align-content: center; gap: 2px; }
.tema-picker .tp-opts button i { font-style: normal; font-size: 24px; line-height: 1; }
.tema-picker .tp-opts button.on { border-color: #23324a; box-shadow: 0 0 0 3px #ffd166, 0 3px 0 rgba(0,0,0,.15); }
.tema-picker small { font-size: 13px; opacity: .75; }
/* ----- efectos de algunas paletas (solo adornan el menú; los juegos no cambian) ----- */
:root[data-tema-efecto="estrellas"] body.menu::before, :root[data-tema-efecto="fiesta"] body.menu::before { content: ""; position: fixed; z-index: -1; pointer-events: none; }
:root[data-tema-efecto="estrellas"] body.menu::before { inset: 0; opacity: .9; animation: tema-titila 5s ease-in-out infinite alternate;
  background:
    radial-gradient(1.6px 1.6px at 12% 18%, #fff, transparent 60%), radial-gradient(1.2px 1.2px at 27% 62%, #cfe3ff, transparent 60%),
    radial-gradient(2px 2px at 41% 9%, #fff, transparent 60%), radial-gradient(1.2px 1.2px at 58% 41%, #fff, transparent 60%),
    radial-gradient(1.8px 1.8px at 73% 14%, #ffe9b0, transparent 60%), radial-gradient(1.2px 1.2px at 88% 55%, #fff, transparent 60%),
    radial-gradient(1.6px 1.6px at 66% 78%, #cfe3ff, transparent 60%), radial-gradient(1.2px 1.2px at 8% 84%, #fff, transparent 60%),
    radial-gradient(1.4px 1.4px at 35% 88%, #ffe9b0, transparent 60%), radial-gradient(1.2px 1.2px at 94% 90%, #fff, transparent 60%);
  background-size: 620px 520px; }
@keyframes tema-titila { from { opacity: .45; } to { opacity: .95; } }
:root[data-tema-efecto="fiesta"] body.menu::before { top: 50%; left: 50%; width: 170vmax; height: 170vmax; margin: -85vmax 0 0 -85vmax; opacity: .34; animation: tema-gira 26s linear infinite;
  background: repeating-conic-gradient(from 0deg, #ffe14d 0 9deg, transparent 9deg 30deg, #3dfff2 30deg 39deg, transparent 39deg 60deg, #ff7a1a 60deg 69deg, transparent 69deg 90deg);
  -webkit-mask-image: radial-gradient(circle, transparent 0, #000 55%); mask-image: radial-gradient(circle, transparent 0, #000 55%); }
@keyframes tema-gira { to { transform: rotate(360deg); } }
:root[data-tema-efecto="fiesta"] .seguir .play { animation-duration: .9s; }
body.con-foto::before { display: none !important; }
:root[data-tema-efecto="calma"] .seguir .play, :root[data-tema-efecto="calma"] .go { animation: none !important; }
:root[data-tema-efecto="calma"] .go::before, :root[data-tema-efecto="calma"] .seguir .play::before, :root[data-tema-efecto="calma"] .seguir::before, :root[data-tema-efecto="calma"] .est-tit::after { display: none; }
:root[data-tema-efecto="calma"] .carta, :root[data-tema-efecto="calma"] .seguir { filter: saturate(.62); }
:root[data-tema-efecto="calma"] .bichito { font-size: clamp(26px, 5vmin, 44px); }
@media (prefers-reduced-motion: reduce) { body.menu::before { animation: none !important; } }
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
    // estilo «videojuego» (las paletas claras conservan su tarjeta blanca)
    const v = {
      sobre: p.sobre || p.tinta, primario: p.primario || '#2f9e62', 'primario-tinta': p.primarioTinta || '#ffffff', 'primario-sombra': p.primarioSombra || '#1f7446',
      neon1: p.neon1 || p.acento, neon2: p.neon2 || p.acento2, panel: p.panel || '#ffffff', 'panel-tinta': p.panelTinta || '#23324a', 'panel-suave': p.panelSuave || '#5b6b82',
      'panel-borde': p.panelBorde || '#ffffff', chip: p.chip || '#eef6fb', 'chip-tinta': p.chipTinta || '#23324a', titulo: p.titulo || p.tinta, 'titulo-sombra': p.tituloSombra || 'rgba(255,255,255,0)',
    };
    for (const k in v) r.setProperty('--tema-' + k, v[k]);
    document.documentElement.dataset.tema = actual();
    const esc = p.escena || ['#6a45ff', '#2327a8', '#10134f'];
    esc.forEach((c, i) => r.setProperty('--tema-escena' + (i + 1), c));
    if (p.efecto) document.documentElement.dataset.temaEfecto = p.efecto; else delete document.documentElement.dataset.temaEfecto;
    if (p.oscuro) document.documentElement.dataset.temaOscuro = '1'; else delete document.documentElement.dataset.temaOscuro;
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
  function set(id) {
    if (!PALETAS[id]) return;
    if (demo()) { temaPrueba = id; aplicar(); avisar('Modo demostración: suscríbete al plan Familia para guardar tus colores.'); return; }
    temaPrueba = null; put(K_TEMA, id); aplicar();
  }
  // achica la foto a ~1280 px y la guarda como JPEG
  function setFoto(file) {
    if (demo()) { avisar('Modo demostración: suscríbete al plan Familia para poner tu foto de fondo.'); return Promise.reject(new Error('La foto de fondo es parte del plan Familia.')); }
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
      box.innerHTML = `<b>🎨 Colores</b><div class="tp-opts">${Object.entries(PALETAS).map(([k, p]) => `<button data-t="${k}" class="${k === actual() ? 'on' : ''}" title="${p.desc || p.nombre}" aria-label="${p.nombre}${p.desc ? ': ' + p.desc : ''}" aria-pressed="${k === actual()}" style="background:linear-gradient(135deg, ${p.bg1}, ${p.bg3 || p.bg2} 55%, ${p.bg2});color:${p.sobre || p.tinta}"><i>${p.emoji}</i>${p.nombre}</button>`).join('')}</div><small>La foto de fondo se pone en el modo admin (papás).</small>`;
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
  // ---------- extras que van en todas las páginas ----------
  // js/nav.js: menús que se manejan con flechas o mando. js/pwa.js: instalar como app (si existe; si no, no pasa nada).
  const BASE = (document.currentScript && document.currentScript.src || 'js/tema.js').replace(/tema\.js(\?.*)?$/, '');
  function extra(nombre) {
    if (document.querySelector(`script[data-extra="${nombre}"], script[src$="js/${nombre}"]`)) return;
    const s = document.createElement('script'); s.src = BASE + nombre; s.async = true; s.dataset.extra = nombre;
    s.onerror = () => s.remove();
    (document.head || document.documentElement).appendChild(s);
  }
  extra('nav.js'); extra('pwa.js');
  // ---------- enlaces legales en el pie de página ----------
  // Páginas con contenido normal: un pie al final. Juegos a pantalla completa: los enlaces van en la
  // pantalla de inicio del juego (portada), para no tapar los controles mientras se juega.
  function pieLegal() {
    if (document.querySelector('[data-pie-legal], a[href="privacidad.html"]')) return;
    const html = '<a href="privacidad.html">Política de privacidad</a> · <a href="terminos.html">Términos y condiciones</a>';
    const css = 'font:500 13px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--tema-sobre,#5b6b82);text-align:center;';
    const cssPortada = css.replace('color:var(--tema-sobre,#5b6b82)', 'color:var(--tema-panel-suave,#5b6b82)');
    const portada = document.querySelector('.portada-caja');
    const pantallaCompleta = document.querySelector('canvas.mundo, canvas#mundo, .tablero, .teclado') || getComputedStyle(document.body).overflow === 'hidden';
    const el = document.createElement(portada ? 'p' : 'footer');
    el.setAttribute('data-pie-legal', ''); el.innerHTML = html;
    if (portada) { el.style.cssText = cssPortada + 'margin:10px 0 0;font-size:12px;'; portada.appendChild(el); el.querySelectorAll('a').forEach(a => { a.style.color = 'inherit'; a.style.textDecoration = 'underline'; }); return; }
    // pantallas completas con un panel que se desplaza (hub del cuaderno, estudio mágico): el pie va dentro
    const panel = pantallaCompleta && document.querySelector('#hub, main');
    if (pantallaCompleta && !panel) return;
    // sobre un fondo oscuro (paleta Épico) el texto va en una pastilla clara para que se lea
    const oscuro = !!PALETAS[actual()].oscuro;
    if (oscuro) el.innerHTML = `<span style="display:inline-block;background:rgba(255,255,255,.92);color:#23324a;border-radius:999px;padding:3px 14px">${html}</span>`;
    el.style.cssText = css + 'padding:18px 16px calc(env(safe-area-inset-bottom,0px) + 18px);';
    (panel || document.querySelector('main') || document.body).appendChild(el);
    el.querySelectorAll('a').forEach(a => { a.style.color = oscuro ? '#3b2a8c' : 'var(--tema-sobre, var(--tema-acento, #6b47a8))'; a.style.textDecoration = 'underline'; a.style.fontWeight = '600'; });
  }
  function iniciar() { aplicar(); try { pieLegal(); } catch (e) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  addEventListener('storage', e => { if ([K_TEMA, K_FOTO, K_TODOS].includes(e.key)) aplicar(); });
})();
