// Salón de Uñas: una mano dibujada con 5 uñas. Pasos: limpiar, limar, crema, pintar, decorar, secar y ¡lista!
// Cada paso muestra su palabra en grande separada en sílabas; la voz dice los colores ("uña rosada").
(() => {
  const J = window.Juego, P = J.progress;
  const $ = s => document.querySelector(s);
  const PASOS = [
    { id: 'limpiar', emoji: '🧼', palabra: 'limpiar', ayuda: 'Frota las manchitas.' },
    { id: 'limar', emoji: '💅', palabra: 'limar', ayuda: 'Elige la forma de las uñas.' },
    { id: 'crema', emoji: '🧴', palabra: 'crema', ayuda: 'Frota la mano con crema.' },
    { id: 'pintar', emoji: '🎨', palabra: 'pintar', ayuda: 'Elige un color y toca una uña.' },
    { id: 'decorar', emoji: '💎', palabra: 'decorar', ayuda: 'Pon stickers en las uñas.' },
    { id: 'secar', emoji: '💨', palabra: 'secar', ayuda: 'Sopla para secar.' },
    { id: 'lista', emoji: '✨', palabra: 'lista', ayuda: '¡Qué lindas uñas!' },
  ];
  // colores con su nombre en femenino (la uña) y plural (las uñas)
  const COLORES = [
    ['#ff7eb6', 'rosada', 'rosadas'], ['#ef5b5b', 'roja', 'rojas'], ['#f39a3b', 'naranja', 'naranjas'], ['#ffd23f', 'amarilla', 'amarillas'],
    ['#4cb87a', 'verde', 'verdes'], ['#8fd3f4', 'celeste', 'celestes'], ['#3f8ee8', 'azul', 'azules'], ['#9a6ee0', 'morada', 'moradas'],
    ['#c9a2ff', 'lila', 'lilas'], ['#ffffff', 'blanca', 'blancas'], ['#23324a', 'negra', 'negras'], ['#e0b84a', 'dorada', 'doradas'], ['#c9ccd6', 'plateada', 'plateadas'],
  ];
  const EFECTOS = [['normal', '🎨', 'Liso'], ['brillo', '✨', 'Brillo'], ['degradado', '🌅', 'Degradado'], ['arcoiris', '🌈', 'Arcoíris']];
  const FORMAS = [['redonda', '⚪', 'Redonda'], ['cuadrada', '⬜', 'Cuadrada'], ['almendra', '🥚', 'Almendra'], ['punta', '🔺', 'Punta']];
  const TONOS = ['#ffe0c7', '#f5c9a3', '#e0a878', '#c68a5a', '#9a6440', '#6e4428'];
  const nombre = J.childName ? J.childName() : 'Avelu';
  const STICKERS = ['⭐', '💖', '🌸', '💎', '🦋', '🍓', '🌙', '🌈', ...[...new Set([...nombre.toUpperCase()].filter(c => /[A-ZÁÉÍÓÚÑ]/.test(c)))].slice(0, 6)];

  // ---------- estado ----------
  const manoVacia = () => ({ tono: TONOS[1], forma: 'redonda', crema: 0, seca: 0, unas: Array.from({ length: 5 }, () => ({ color: null, efecto: 'normal', stickers: [], manchas: Array.from({ length: 3 + Math.floor(Math.random() * 3) }, () => [Math.random() * 1.2 - .6, Math.random() * 1.2 - .6]) })) });
  const state = { lado: 'derecha', manos: { derecha: manoVacia(), izquierda: manoVacia() }, paso: 0, hecho: new Set(), color: 0, efecto: 'normal', sticker: '⭐', modo: 'libre', modelo: null, chispas: [], historia: [], soplando: 0 };
  const mano = () => state.manos[state.lado];
  const recordar = () => { state.historia.push(JSON.stringify(state.manos)); if (state.historia.length > 40) state.historia.shift(); };

  // ---------- dibujo ----------
  const cv = $('#mano'), g = cv.getContext('2d');
  let esc = 1, ox = 0, oy = 0;
  function medir() {
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    esc = Math.min(r.width / 400, r.height / 450) * dpr; ox = (cv.width - 400 * esc) / 2; oy = (cv.height - 450 * esc) / 2;
  }
  addEventListener('resize', medir);
  // dedos de la mano derecha vista desde arriba (el pulgar a la izquierda)
  const DEDOS = [{ x: 104, y: 300, l: 96, w: 46, a: -.78 }, { x: 150, y: 236, l: 140, w: 41, a: -.12 }, { x: 199, y: 228, l: 158, w: 42, a: 0 }, { x: 246, y: 236, l: 142, w: 40, a: .1 }, { x: 288, y: 256, l: 108, w: 35, a: .25 }];
  const dedo = i => { const d = DEDOS[i], s = state.lado === 'izquierda' ? -1 : 1; return { x: s < 0 ? 400 - d.x : d.x, y: d.y, l: d.l, w: d.w, a: d.a * s }; };
  function una(i) {
    const d = dedo(i), tx = d.x + Math.sin(d.a) * d.l, ty = d.y - Math.cos(d.a) * d.l;
    const back = d.w * .62;
    return { x: tx - Math.sin(d.a) * back, y: ty + Math.cos(d.a) * back, w: d.w * .74, h: d.w * .92, a: d.a };
  }
  function oscuro(hex, k) { const n = parseInt(hex.slice(1), 16); const f = c => Math.max(0, Math.min(255, Math.round(c * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
  function formaUna(ctx, u, forma) {
    const w = u.w / 2, h = u.h / 2, alto = forma === 'punta' ? h * 1.55 : forma === 'almendra' ? h * 1.3 : h * 1.08;
    ctx.beginPath();
    if (forma === 'cuadrada') { ctx.roundRect(-w, -alto, w * 2, h + alto, [w * .35, w * .35, w * .55, w * .55]); return; }
    ctx.moveTo(-w, h * .6);
    ctx.bezierCurveTo(-w, h * 1.05, w, h * 1.05, w, h * .6);
    if (forma === 'redonda') { ctx.lineTo(w, -h * .2); ctx.bezierCurveTo(w, -alto * 1.25, -w, -alto * 1.25, -w, -h * .2); }
    else { ctx.bezierCurveTo(w * 1.02, -alto * .35, w * .35, -alto * .85, 0, -alto); ctx.bezierCurveTo(-w * .35, -alto * .85, -w * 1.02, -alto * .35, -w, h * .6); }
    ctx.closePath();
  }
  function pintarUnaEn(ctx, u, datos, forma, t) {
    ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(u.a);
    formaUna(ctx, u, forma);
    const w = u.w / 2, h = u.h;
    if (datos.color) {
      let fill = datos.color;
      if (datos.efecto === 'arcoiris') { const gr = ctx.createLinearGradient(0, -h, 0, h * .6); ['#ff5d8f', '#ffb347', '#ffe27a', '#7be0a0', '#7fd3ff', '#c9a2ff'].forEach((c, k) => gr.addColorStop(k / 5, c)); fill = gr; }
      if (datos.efecto === 'degradado') { const gr = ctx.createLinearGradient(0, -h, 0, h * .6); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, datos.color); fill = gr; }
      ctx.fillStyle = fill;
    } else ctx.fillStyle = 'rgba(255,232,236,.95)';
    ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(160,90,90,.35)'; ctx.stroke();
    ctx.save(); ctx.clip();
    if (datos.efecto === 'brillo' && datos.color) for (let k = 0; k < 14; k++) { ctx.fillStyle = `rgba(255,255,255,${.5 + .5 * Math.sin(t * 4 + k)})`; ctx.beginPath(); ctx.arc(Math.sin(k * 7.3) * w * .8, Math.cos(k * 5.1) * h * .7 - h * .1, 1.6, 0, 7); ctx.fill(); }
    // manchitas por limpiar
    for (const [mx, my] of datos.manchas) { ctx.fillStyle = 'rgba(120,84,52,.75)'; ctx.beginPath(); ctx.arc(mx * w, my * h * .6 - h * .15, w * .28, 0, 7); ctx.fill(); }
    // brillo de la uña
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(-w * .35, -h * .25, w * .18, h * .35, -.2, 0, 7); ctx.fill();
    ctx.restore();
    datos.stickers.forEach((s, k) => {
      const pos = [[0, -h * .25], [-w * .35, h * .15], [w * .35, h * .15]][k] || [0, 0];
      ctx.font = `${/[A-ZÁÉÍÓÚÑ]/.test(s) ? '700 ' : ''}${w * (/[A-ZÁÉÍÓÚÑ]/.test(s) ? 1 : .85)}px Andika, "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#23324a'; ctx.lineWidth = 2;
      if (/[A-ZÁÉÍÓÚÑ]/.test(s)) ctx.strokeText(s, pos[0], pos[1]);
      ctx.fillText(s, pos[0], pos[1]);
    });
    ctx.restore();
  }
  function dibujar(t) {
    const m = mano();
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    g.setTransform(esc, 0, 0, esc, ox, oy);
    // sombra
    g.fillStyle = 'rgba(90,60,140,.12)'; g.beginPath(); g.ellipse(200, 438, 120, 12, 0, 0, 7); g.fill();
    const piel = m.tono, borde = oscuro(m.tono, .82);
    g.lineCap = 'round'; g.lineJoin = 'round';
    // muñeca y palma
    g.fillStyle = piel; g.strokeStyle = borde; g.lineWidth = 3;
    g.beginPath(); g.roundRect(142, 380, 120, 64, 26); g.fill(); g.stroke();
    g.beginPath(); g.roundRect(state.lado === 'izquierda' ? 108 : 112, 222, 180, 182, 58); g.fill(); g.stroke();
    // dedos (cápsulas)
    for (let i = 0; i < 5; i++) {
      const d = dedo(i), tx = d.x + Math.sin(d.a) * d.l, ty = d.y - Math.cos(d.a) * d.l;
      g.strokeStyle = borde; g.lineWidth = d.w + 5; g.beginPath(); g.moveTo(d.x, d.y + 20); g.lineTo(tx, ty); g.stroke();
      g.strokeStyle = piel; g.lineWidth = d.w; g.beginPath(); g.moveTo(d.x, d.y + 20); g.lineTo(tx, ty); g.stroke();
      // nudillo
      const kx = d.x + Math.sin(d.a) * d.l * .48, ky = d.y - Math.cos(d.a) * d.l * .48;
      g.strokeStyle = oscuro(piel, .9); g.lineWidth = 2; g.beginPath(); g.moveTo(kx - d.w * .2, ky); g.lineTo(kx + d.w * .2, ky); g.stroke();
    }
    g.fillStyle = piel; g.beginPath(); g.roundRect(state.lado === 'izquierda' ? 112 : 116, 230, 172, 150, 50); g.fill();
    // crema: brillito sobre la mano
    if (m.crema > 0) { g.fillStyle = `rgba(255,255,255,${Math.min(.35, m.crema / 200)})`; g.beginPath(); g.roundRect(120, 236, 164, 140, 44); g.fill(); }
    for (let i = 0; i < 5; i++) pintarUnaEn(g, una(i), m.unas[i], m.forma, t);
    // chispitas
    for (const c of state.chispas) { g.globalAlpha = Math.max(0, c.v); g.font = `${c.s}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign = 'center'; g.fillText(c.e, c.x, c.y); }
    g.globalAlpha = 1;
    // aire del secador
    if (state.soplando > 0) { g.strokeStyle = 'rgba(127,211,255,.8)'; g.lineWidth = 4; for (let k = 0; k < 5; k++) { const y = 40 + k * 22 + Math.sin(t * 8 + k) * 6; g.beginPath(); g.moveTo(20 + ((t * 300 + k * 60) % 120), y); g.lineTo(80 + ((t * 300 + k * 60) % 120), y + 6); g.stroke(); } }
    // cursor del paso
    if (puntero.ver) { g.font = '34px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.fillText({ limpiar: '🧽', limar: '💅', crema: '🧴' }[PASOS[state.paso].id] || '', puntero.x, puntero.y); }
  }
  let antes = performance.now();
  function cuadro(ahora) {
    const dt = Math.min(.05, (ahora - antes) / 1000); antes = ahora;
    for (const c of state.chispas) { c.y += c.vy * dt; c.x += c.vx * dt; c.v -= dt * .8; }
    state.chispas = state.chispas.filter(c => c.v > 0);
    if (state.soplando > 0) { state.soplando -= dt; secar(dt); }
    if (PASOS[state.paso].id === 'lista' && Math.random() < .2) chispa(80 + Math.random() * 240, 40 + Math.random() * 260, '✨');
    dibujar(ahora / 1000);
    requestAnimationFrame(cuadro);
  }
  const chispa = (x, y, e = '✨', s = 22) => state.chispas.push({ x, y, e, s, vx: (Math.random() - .5) * 40, vy: -30 - Math.random() * 40, v: 1 });

  // ---------- palabra del paso, con sílabas ----------
  function mostrarPalabra(w) {
    const sil = (J.silabas ? J.silabas(w) : w).split('-');
    $('#palabra').innerHTML = sil.map((s, k) => `<span class="sil" data-k="${k}">${J.esc(s)}</span>`).join('<span class="guion">-</span>');
    $('#palabra').dataset.w = w;
  }
  $('#palabra').onclick = () => {
    const w = $('#palabra').dataset.w; if (!w) return;
    J.say(w);
    const sils = [...document.querySelectorAll('#palabra .sil')];
    sils.forEach((s, k) => setTimeout(() => { sils.forEach(x => x.classList.remove('on')); s.classList.add('on'); if (k === sils.length - 1) setTimeout(() => s.classList.remove('on'), 500); }, k * 380));
  };

  // ---------- pasos y herramientas ----------
  function pintarPasos() {
    $('#pasos').innerHTML = PASOS.map((p, i) => `<button data-p="${i}" class="${i === state.paso ? 'on' : ''} ${state.hecho.has(p.id) ? 'hecho' : ''}" aria-label="${p.palabra}">${p.emoji}<small>${p.palabra}</small></button>`).join('');
  }
  function ir(i, silencio = false) {
    state.paso = i; const p = PASOS[i];
    pintarPasos(); mostrarPalabra(p.palabra); herramientas();
    if (!silencio) { J.sfx('pop'); J.say([p.palabra[0].toUpperCase() + p.palabra.slice(1), p.ayuda]); }
    if (p.id === 'lista') terminar();
  }
  $('#pasos').onclick = e => { const b = e.target.closest('[data-p]'); if (b) ir(+b.dataset.p); };
  function listo(id) {
    if (state.hecho.has(id)) return;
    state.hecho.add(id); pintarPasos(); J.efecto('acierto'); message('¡Muy bien!');
    for (let k = 0; k < 10; k++) chispa(120 + Math.random() * 160, 120 + Math.random() * 140, '✨');
    const i = PASOS.findIndex(p => p.id === id);
    if (i === state.paso && i < PASOS.length - 1) setTimeout(() => { if (state.paso === i) ir(i + 1); }, 1100);
  }
  function herramientas() {
    const p = PASOS[state.paso].id, f1 = $('#fila1'), f2 = $('#fila2');
    const manos = `<button data-lado="izquierda" class="txt ${state.lado === 'izquierda' ? 'on' : ''}">🤚 Izquierda</button><button data-lado="derecha" class="txt ${state.lado === 'derecha' ? 'on' : ''}">✋ Derecha</button><button data-a="deshacer" class="txt">↶ Atrás</button><button data-a="limpio" class="txt">🧹 Empezar</button>`;
    f2.innerHTML = manos;
    if (p === 'limpiar') f1.innerHTML = TONOS.map(t => `<button class="color ${mano().tono === t ? 'on' : ''}" data-tono="${t}" style="background:${t}" aria-label="Color de piel"></button>`).join('');
    else if (p === 'limar') f1.innerHTML = FORMAS.map(([k, e, n]) => `<button class="txt ${mano().forma === k ? 'on' : ''}" data-forma="${k}">${e} ${n}</button>`).join('');
    else if (p === 'crema') f1.innerHTML = `<span class="txt" style="font-weight:800;color:#5b6b82;padding:10px">🧴 Frota la mano con el dedo</span>`;
    else if (p === 'pintar') f1.innerHTML = COLORES.map(([c, n], i) => `<button class="color ${state.color === i ? 'on' : ''}" data-color="${i}" style="background:${c}" aria-label="${n}"></button>`).join('') + EFECTOS.map(([k, e, n]) => `<button class="txt ${state.efecto === k ? 'on' : ''}" data-efecto="${k}">${e} ${n}</button>`).join('') + `<button class="txt" data-a="todas">💅 Todas</button>`;
    else if (p === 'decorar') f1.innerHTML = STICKERS.map(s => `<button class="${state.sticker === s ? 'on' : ''}" data-sticker="${J.esc(s)}">${J.esc(s)}</button>`).join('') + `<button class="txt" data-a="sin-stickers">🧽 Quitar</button>`;
    else if (p === 'secar') f1.innerHTML = `<button class="txt" data-a="soplar" style="min-width:160px;font-size:20px">💨 ¡Soplar!</button><span class="txt" style="font-weight:800;color:#5b6b82;padding:10px">${Math.round(mano().seca)}%</span>`;
    else f1.innerHTML = `<button class="txt" data-a="foto">📸 Foto</button><button class="txt" data-a="favorita">❤️ Guardar</button><button class="txt" data-a="nueva">🔁 Nuevas uñas</button>${favoritas().length ? `<button class="txt" data-a="ver-fav">⭐ Mis favoritas (${favoritas().length})</button>` : ''}`;
  }
  const favoritas = () => { try { return JSON.parse(localStorage.getItem('bl-unas-fav') || '[]'); } catch (e) { return []; } };
  $('#herr').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset, m = mano();
    if (d.lado) { state.lado = d.lado; J.sfx('pop'); J.say(d.lado === 'izquierda' ? 'izquierda' : 'derecha'); }
    else if (d.tono) { recordar(); m.tono = d.tono; J.sfx('pop'); }
    else if (d.forma) { recordar(); m.forma = d.forma; for (let k = 0; k < 4; k++) setTimeout(() => J.sfx('tick', .4, 1.4 + k * .1), k * 90); J.say(['uña', FORMAS.find(f => f[0] === d.forma)[2].toLowerCase()]); listo('limar'); }
    else if (d.color) { state.color = +d.color; J.sfx('pop'); J.say(COLORES[state.color][1]); }
    else if (d.efecto) { state.efecto = d.efecto; J.sfx('pop'); J.say(EFECTOS.find(x => x[0] === d.efecto)[2].toLowerCase()); }
    else if (d.sticker) { state.sticker = d.sticker; J.sfx('pop'); if (/[A-ZÁÉÍÓÚÑ]/.test(d.sticker)) J.sound ? J.sound(d.sticker.toLowerCase()) : J.say(d.sticker); }
    else if (d.a === 'todas') { recordar(); m.unas.forEach(u => { u.color = COLORES[state.color][0]; u.efecto = state.efecto; }); J.efecto('pop'); J.say(['uñas', COLORES[state.color][2]]); listo('pintar'); }
    else if (d.a === 'sin-stickers') { recordar(); m.unas.forEach(u => { u.stickers = []; }); J.sfx('pop'); }
    else if (d.a === 'soplar') soplar();
    else if (d.a === 'deshacer') { const h = state.historia.pop(); if (h) { state.manos = JSON.parse(h); J.sfx('pop'); } }
    else if (d.a === 'limpio') { recordar(); state.manos[state.lado] = manoVacia(); state.hecho.clear(); J.sfx('pop'); ir(0, true); }
    else if (d.a === 'foto') foto();
    else if (d.a === 'favorita') { const f = favoritas(); f.unshift({ fecha: Date.now(), mano: m }); try { localStorage.setItem('bl-unas-fav', JSON.stringify(f.slice(0, 12))); } catch (e2) {} J.efecto('acierto'); message('❤️ ¡Guardada!'); }
    else if (d.a === 'ver-fav') { const f = favoritas(); if (f.length) { recordar(); state.verFav = ((state.verFav || 0) + 1) % f.length; state.manos[state.lado] = JSON.parse(JSON.stringify(f[state.verFav].mano)); J.sfx('pop'); } }
    else if (d.a === 'nueva') { state.manos = { derecha: manoVacia(), izquierda: manoVacia() }; state.hecho.clear(); if (state.modo === 'copia') nuevoModelo(); ir(0); return; }
    herramientas();
  });

  // ---------- tocar y frotar sobre la mano ----------
  const puntero = { x: 0, y: 0, ver: false, abajo: false };
  const aLogico = e => { const r = cv.getBoundingClientRect(), dpr = cv.width / r.width; return [((e.clientX - r.left) * dpr - ox) / esc, ((e.clientY - r.top) * dpr - oy) / esc]; };
  const unaEn = (x, y) => { for (let i = 0; i < 5; i++) { const u = una(i); if (Math.hypot(x - u.x, y - u.y) < u.h * .9) return i; } return -1; };
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); puntero.abajo = true; mover(e, true); });
  cv.addEventListener('pointermove', e => mover(e, false));
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => cv.addEventListener(ev, () => { puntero.abajo = false; puntero.ver = false; }));
  function mover(e, toque) {
    const [x, y] = aLogico(e); puntero.x = x; puntero.y = y;
    const p = PASOS[state.paso].id, m = mano();
    puntero.ver = ['limpiar', 'limar', 'crema'].includes(p);
    if (!puntero.abajo) return;
    if (p === 'limpiar') {
      let quedan = 0;
      m.unas.forEach((u, i) => {
        const un = una(i);
        u.manchas = u.manchas.filter(([mx, my]) => {
          const c = Math.cos(un.a), s = Math.sin(un.a), lx = mx * un.w / 2, ly = my * un.h * .6 - un.h * .15;
          const wx = un.x + lx * c - ly * s, wy = un.y + lx * s + ly * c;
          if (Math.hypot(x - wx, y - wy) < 16) { chispa(wx, wy, '🫧', 18); J.sfx('pop', .25, 1.6); return false; }
          return true;
        });
        quedan += u.manchas.length;
      });
      if (!quedan) listo('limpiar');
    } else if (p === 'limar' && toque && unaEn(x, y) >= 0) { J.sfx('tick', .4, 1.5); chispa(x, y - 10, '✨', 16); }
    else if (p === 'crema' && y > 200 && y < 440) { m.crema = Math.min(100, m.crema + 1.2); if (Math.random() < .3) chispa(x, y, '🤍', 16); if (m.crema >= 100) listo('crema'); }
    else if (toque && p === 'pintar') {
      const i = unaEn(x, y); if (i < 0) return;
      recordar(); const c = COLORES[state.color];
      m.unas[i].color = c[0]; m.unas[i].efecto = state.efecto; J.efecto('pop'); J.say(['uña', c[1]]);
      for (let k = 0; k < 6; k++) chispa(una(i).x, una(i).y, '✨', 16);
      if (m.unas.every(u => u.color)) listo('pintar');
    } else if (toque && p === 'decorar') {
      const i = unaEn(x, y); if (i < 0) return;
      recordar(); const st = m.unas[i].stickers;
      if (st.length >= 3) st.shift(); st.push(state.sticker); J.sfx('pop', .8, 1.3);
      if (m.unas.filter(u => u.stickers.length).length >= 2) listo('decorar');
    }
  }
  function soplar() { state.soplando = 1.2; J.sfx('pop', .3, .6); J.say('¡Fuuu!'); }
  function secar(dt) { const m = mano(); m.seca = Math.min(100, m.seca + dt * 40); if (Math.random() < .3) chispa(140 + Math.random() * 120, 120 + Math.random() * 60, '💨', 18); if (m.seca >= 100) { listo('secar'); } herramientasSecar(); }
  const herramientasSecar = () => { const s = $('#fila1 span'); if (s && PASOS[state.paso].id === 'secar') s.textContent = Math.round(mano().seca) + '%'; };

  // ---------- final, foto y modelo para copiar ----------
  function terminar() {
    J.confetti(80); J.efecto('festejo'); J.say(['¡Qué lindas uñas!', J.pick(J.PRAISES)]);
    if (state.modo === 'copia' && state.modelo) {
      const m = mano(); let ok = 0;
      state.modelo.forEach((t, i) => { const u = m.unas[i]; if (u.color === t.color) ok++; if (t.sticker ? u.stickers.includes(t.sticker) : !u.stickers.length) ok += .5; });
      const est = ok >= 7 ? 3 : ok >= 4.5 ? 2 : 1;
      message('⭐'.repeat(est) + ' ¡Muy bien!', 2.4); J.addStar(est); P.level.unas = Math.max(P.level.unas || 0, 1); J.save(); updatePlayer();
      state.copias = (state.copias || 0) + 1;
      if (state.copias % 3 === 0) setTimeout(() => J.gift(() => {}), 2600);
    } else { J.addStar(); updatePlayer(); }
  }
  function foto() {
    const a = document.createElement('a'); a.download = 'mis-unas.png'; a.href = cv.toDataURL('image/png'); a.click();
    J.sfx('pop'); message('📸 ¡Foto!');
  }
  function nuevoModelo() {
    state.modelo = Array.from({ length: 5 }, () => ({ color: J.pick(COLORES.slice(0, 9))[0], sticker: Math.random() < .5 ? J.pick(STICKERS.slice(0, 6)) : null }));
    const mc = $('#mini'), x = mc.getContext('2d'); x.clearRect(0, 0, mc.width, mc.height);
    state.modelo.forEach((t, i) => {
      const u = { x: 22 + i * 35, y: 100 + Math.abs(i - 2) * 12, w: 28, h: 36, a: 0 };
      pintarUnaEn(x, u, { color: t.color, efecto: 'normal', stickers: t.sticker ? [t.sticker] : [], manchas: [] }, 'redonda', 0);
    });
    $('#modelo').hidden = false;
  }
  function message(text, secs = 1.4) {
    const el = $('#mensaje'); el.textContent = text;
    el.classList.remove('ver'); void el.offsetWidth; el.classList.add('ver');
    clearTimeout(message.t); message.t = setTimeout(() => el.classList.remove('ver'), secs * 1000);
  }
  function updatePlayer() { const p = J.player(); $('#jugador').innerHTML = `${J.CHARS[p.char]?.emoji || '⭐'} ${J.esc(p.name)} · ⭐ ${p.stars}`; }

  function empezar(modo) {
    state.modo = modo; $('#portada').hidden = true; $('#modelo').hidden = true;
    if (modo === 'copia') nuevoModelo();
    J.audio(); J.startMusic && J.startMusic();
    medir(); ir(0);
  }
  $('#op-modo').onclick = e => { const b = e.target.closest('[data-modo]'); if (b) empezar(b.dataset.modo); };

  (async () => {
    await J.ready;
    updatePlayer(); J.refreshMusic && J.refreshMusic(); medir(); pintarPasos(); mostrarPalabra('limpiar'); herramientas();
    requestAnimationFrame(cuadro);
    setTimeout(() => J.say('¡Bienvenida al salón de uñas!'), 400);
    if (location.hash === '#prueba') window.__un = { state, ir, empezar, listo, PASOS, una, mano };
  })();
})();
