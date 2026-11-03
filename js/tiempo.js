// Control de tiempo para mamá y papá: minutos por sesión, descanso entre sesiones, límite diario,
// horario permitido (lunes a viernes y fin de semana), hora de dormir y uso por día, niña y juego.
// Se configura en tiempo.html (con PIN). Desbloquear o dar más tiempo siempre pide el PIN.
(function () {
  'use strict';
  const J = window.Juego; if (!J) return;
  const P = J.progress;
  // páginas de mamá y papá: no se bloquean ni cuentan tiempo
  const LIBRES = ['tiempo', 'admin', 'voces', 'cuenta', 'privacidad', 'terminos', 'suscripcion-lista', 'papas'];
  const PAGINA = (location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
  const libre = LIBRES.includes(PAGINA);

  // ---------- configuración ----------
  const BASE = {
    activo: true,
    sesion: 15,          // minutos de juego seguidos (0 = sin límite)
    descanso: 10,        // minutos de descanso entre sesiones
    diario: 60,          // minutos por día (0 = sin límite)
    horario: { on: false, semana: ['08:00', '20:00'], finde: ['09:00', '20:30'] },
    dormir: { on: false, hora: '20:30', hasta: '06:30' },
    porNino: false,      // false = las mismas reglas para todos; true = reglas de cada niño en ninos[nombre]
    ninos: {},
  };
  const PRESETS = {
    suave: { nombre: 'Suave', emoji: '🌤️', sesion: 20, descanso: 10, diario: 60 },
    escolar: { nombre: 'Escolar', emoji: '🎒', sesion: 15, descanso: 10, diario: 45 },
    finde: { nombre: 'Fin de semana', emoji: '🎉', sesion: 30, descanso: 10, diario: 90 },
  };
  const copia = o => JSON.parse(JSON.stringify(o));
  function cfgGeneral() {
    if (!P.tiempo) { P.tiempo = copia(BASE); if (P.sessionMin != null) P.tiempo.sesion = +P.sessionMin; }
    const t = P.tiempo;
    for (const [k, v] of Object.entries(BASE)) if (t[k] === undefined) t[k] = copia(v);
    t.horario = Object.assign(copia(BASE.horario), t.horario); t.dormir = Object.assign(copia(BASE.dormir), t.dormir);
    return t;
  }
  const nino = () => (J.player() && J.player().name) || 'niña';
  // reglas que valen ahora para la niña que juega
  function cfg(nombre = nino()) {
    const t = cfgGeneral();
    if (!t.porNino || !t.ninos[nombre]) return t;
    const n = t.ninos[nombre];
    return Object.assign({}, t, n, { horario: Object.assign({}, t.horario, n.horario), dormir: Object.assign({}, t.dormir, n.dormir) });
  }

  // ---------- fechas ----------
  const ahora = () => Date.now();
  const hoyKey = (d = new Date(ahora())) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const minDelDia = (d = new Date(ahora())) => d.getHours() * 60 + d.getMinutes();
  const aMin = hhmm => { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const esFinde = (d = new Date(ahora())) => d.getDay() === 0 || d.getDay() === 6;

  // ---------- uso (minutos activos por día, niño y juego; 30 días) ----------
  function usoDe(dia = hoyKey()) {
    P.uso = P.uso || {};
    if (!P.uso[dia]) P.uso[dia] = { total: 0, ninos: {}, juegos: {} };
    return P.uso[dia];
  }
  function limpiarUso() {
    const dias = Object.keys(P.uso || {}).sort();
    while (dias.length > 30) delete P.uso[dias.shift()];
  }
  const usadoHoy = (nombre = nino()) => (P.uso && P.uso[hoyKey()] && P.uso[hoyKey()].ninos[nombre]) || 0;

  // ---------- estado de la sesión (compartido entre páginas) ----------
  const KEY = 'bl-tiempo-estado';
  function leer() {
    let e; try { e = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (er) { e = {}; }
    if (e.dia !== hoyKey()) e = { dia: hoyKey(), sesion: {}, extra: {}, bloqueado: false, descansoHasta: 0, perdon: 0 };
    e.sesion = e.sesion || {}; e.extra = e.extra || {};
    return e;
  }
  function escribir(e) { try { localStorage.setItem(KEY, JSON.stringify(e)); } catch (er) {} }
  const extraHoy = (nombre = nino()) => leer().extra[nombre] || 0;

  // ---------- reglas: ¿se puede jugar ahora? ----------
  // devuelve null si se puede, o { tipo, ... } con la razón del bloqueo
  function razon() {
    const c = cfg(), e = leer(), n = nino();
    if (!c.activo) return e.bloqueado ? { tipo: 'bloqueado' } : null;
    if (e.bloqueado) return { tipo: 'bloqueado' };
    if (e.perdon > ahora()) return null;  // papá o mamá desbloquearon un ratito
    const m = minDelDia();
    if (c.dormir.on) {
      const ini = aMin(c.dormir.hora), fin = aMin(c.dormir.hasta);
      const dormido = ini > fin ? (m >= ini || m < fin) : (m >= ini && m < fin);
      if (dormido) return { tipo: 'dormir' };
    }
    if (c.horario.on) {
      const [a, b] = esFinde() ? c.horario.finde : c.horario.semana;
      if (m < aMin(a) || m >= aMin(b)) return { tipo: 'horario', desde: a, hasta: b };
    }
    if (e.descansoHasta > ahora()) return { tipo: 'descanso', hasta: e.descansoHasta };
    if (c.diario && usadoHoy(n) >= c.diario + extraHoy(n)) return { tipo: 'diario' };
    return null;
  }
  // minutos que quedan antes del próximo descanso o del fin del día
  function quedan() {
    const c = cfg(), e = leer(), n = nino();
    const q = [];
    if (c.activo && c.sesion) q.push(c.sesion - (e.sesion[n] || 0));
    if (c.activo && c.diario) q.push(c.diario + extraHoy(n) - usadoHoy(n));
    return q.length ? Math.max(0, Math.min(...q)) : Infinity;
  }

  // ---------- contar minutos activos ----------
  let ultimoToque = ahora();
  ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(ev => addEventListener(ev, () => { ultimoToque = ahora(); }, { passive: true, capture: true }));
  const PASO = 15000; // cada 15 segundos
  function contar() {
    if (libre || document.visibilityState !== 'visible' || ahora() - ultimoToque > 120000 || capa) return;
    const n = nino(), min = PASO / 60000, u = usoDe();
    u.total = +(u.total + min).toFixed(3);
    u.ninos[n] = +((u.ninos[n] || 0) + min).toFixed(3);
    u.juegos[PAGINA] = +((u.juegos[PAGINA] || 0) + min).toFixed(3);
    const e = leer();
    e.sesion[n] = +((e.sesion[n] || 0) + min).toFixed(3);
    const c = cfg();
    // terminó la sesión: empieza el descanso y la sesión vuelve a cero
    if (c.activo && c.sesion && e.sesion[n] >= c.sesion && !(e.perdon > ahora())) {
      e.sesion[n] = 0;
      if (c.descanso) e.descansoHasta = ahora() + c.descanso * 60000;
    }
    escribir(e);
    limpiarUso();
    J.save();
  }

  // ---------- avisos y pantallas ----------
  let avisado = false, capa = null, capaTipo = '';
  const css = document.createElement('style');
  css.textContent = `
  .tmp-aviso{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);transform:translateX(-50%);z-index:44;background:#fff;color:#23324a;border-radius:999px;padding:8px 18px;font:800 18px/1.2 'Baloo 2',system-ui,sans-serif;box-shadow:0 6px 0 rgba(0,0,0,.18);display:flex;gap:8px;align-items:center;animation:tmp-baja .5s cubic-bezier(.3,1.5,.5,1)}
  @keyframes tmp-baja{from{transform:translate(-50%,-120%)}}
  .tmp-capa{position:fixed;inset:0;z-index:45;display:grid;place-items:center;padding:16px;background:linear-gradient(160deg,#c9b6ff,#ffd6ec 60%,#fff4fb);overflow:auto;font-family:'Baloo 2',system-ui,sans-serif;color:#23324a}
  .tmp-capa.noche{background:radial-gradient(circle at 70% 20%,#3b3f8f,#1b1d4a 60%,#0e0f2b);color:#fff}
  .tmp-caja{max-width:520px;width:100%;text-align:center;display:flex;flex-direction:column;gap:12px;align-items:center}
  .tmp-dibujo{font-size:min(28vw,150px);line-height:1;animation:tmp-flota 3.5s ease-in-out infinite}
  @keyframes tmp-flota{50%{transform:translateY(-12px) scale(1.04)}}
  .tmp-titulo{font-size:clamp(28px,7vw,44px);font-weight:800;line-height:1.05;margin:0}
  .tmp-sub{font-size:clamp(18px,4.5vw,24px);margin:0;opacity:.9;font-family:Andika,'Baloo 2',sans-serif}
  .tmp-reloj{font-size:clamp(44px,13vw,80px);font-weight:800;font-variant-numeric:tabular-nums;line-height:1;background:rgba(255,255,255,.7);border-radius:28px;padding:6px 26px;color:#6b4fd8}
  .noche .tmp-reloj{background:rgba(255,255,255,.12);color:#ffe27a}
  .tmp-ideas{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
  .tmp-ideas span{background:rgba(255,255,255,.75);border-radius:18px;padding:8px 14px;font-size:18px;font-weight:700;animation:tmp-flota 4s ease-in-out infinite}
  .noche .tmp-ideas span{background:rgba(255,255,255,.12)}
  .tmp-ideas span:nth-child(2){animation-delay:-1.3s}.tmp-ideas span:nth-child(3){animation-delay:-2.6s}
  .tmp-btns{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:6px}
  .tmp-btn{border:0;border-radius:999px;padding:12px 22px;font:800 19px 'Baloo 2',system-ui,sans-serif;background:#fff;color:#23324a;box-shadow:0 5px 0 rgba(0,0,0,.2);cursor:pointer;min-height:52px}
  .tmp-btn.si{background:#6b4fd8;color:#fff;box-shadow:0 5px 0 #4a2fb0}
  .tmp-btn:active{transform:translateY(3px);box-shadow:0 2px 0 rgba(0,0,0,.2)}
  .tmp-estrellas{position:absolute;inset:0;pointer-events:none;overflow:hidden}
  .tmp-estrellas i{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;animation:tmp-brilla 2.4s ease-in-out infinite}
  @keyframes tmp-brilla{50%{opacity:.2}}
  @media (prefers-reduced-motion: reduce){.tmp-dibujo,.tmp-ideas span,.tmp-estrellas i{animation:none}}`;
  document.head.appendChild(css);

  const reloj = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function aviso(texto) {
    document.querySelectorAll('.tmp-aviso').forEach(x => x.remove());
    const a = document.createElement('div'); a.className = 'tmp-aviso'; a.setAttribute('role', 'status');
    a.innerHTML = `⏰ <span>${texto}</span>`;
    document.body.appendChild(a); setTimeout(() => a.remove(), 9000);
  }
  const PANTALLAS = {
    descanso: () => ({
      dibujo: '🧘‍♀️', titulo: `¡A descansar, ${J.esc(nino())}!`, sub: 'Los ojitos descansan un ratito. Volvemos a jugar en:',
      ideas: ['💧 Toma agua', '🙆‍♀️ Estírate', '🤸 Salta 5 veces'], voz: ['¡Jugaste muy bien!', nino(), 'Es hora de descansar.'], reloj: true,
    }),
    diario: () => ({
      dibujo: '🌈', titulo: `¡Jugaste muy bien hoy, ${J.esc(nino())}!`, sub: 'Por hoy terminamos. Mañana seguimos jugando.',
      ideas: ['📖 Leer un cuento', '🎨 Dibujar en papel', '🧸 Jugar con juguetes'], voz: ['¡Jugaste muy bien!', 'Por hoy terminamos. Mañana seguimos.'],
    }),
    horario: r => ({
      dibujo: '🕰️', titulo: 'Ahora no es hora de jugar', sub: `Se juega de ${r.desde} a ${r.hasta}.`,
      ideas: ['🍎 Comer rico', '🛝 Jugar afuera', '📚 Mirar libros'], voz: ['Ahora no es hora de jugar.'],
    }),
    dormir: () => ({
      dibujo: '🌙', titulo: `Buenas noches, ${J.esc(nino())}`, sub: 'Es hora de dormir. Mañana jugamos más.', noche: true,
      ideas: ['🦷 Lavarse los dientes', '🧸 Abrazar al peluche', '😴 A la cama'], voz: ['Buenas noches.', nino(), 'Es hora de dormir.'], cancion: true,
    }),
    bloqueado: () => ({
      dibujo: '🔒', titulo: 'Un ratito de pausa', sub: 'Papá o mamá pausaron el juego.',
      ideas: ['🤗 Dar un abrazo', '💧 Tomar agua'], voz: ['Un ratito de pausa.'],
    }),
  };
  function mostrar(r) {
    if (capa && capaTipo === r.tipo) return actualizarReloj(r);
    quitar();
    J.save();                                     // nada se pierde: se guarda todo antes de pausar
    try { J.stopMusic(); J.stopVoice && J.stopVoice(); } catch (e) {}
    window.JUEGO_PAUSADO = true; dispatchEvent(new CustomEvent('tiempo-pausa', { detail: r }));
    const d = PANTALLAS[r.tipo](r);
    capa = document.createElement('div'); capaTipo = r.tipo;
    capa.className = 'tmp-capa' + (d.noche ? ' noche' : ''); capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-modal', 'true'); capa.setAttribute('aria-label', d.titulo.replace(/<[^>]+>/g, ''));
    capa.innerHTML = `${d.noche ? `<div class="tmp-estrellas">${Array.from({ length: 40 }, () => `<i style="left:${Math.random() * 100}%;top:${Math.random() * 70}%;animation-delay:${-Math.random() * 3}s"></i>`).join('')}</div>` : ''}
      <div class="tmp-caja"><div class="tmp-dibujo">${d.dibujo}</div><h2 class="tmp-titulo">${d.titulo}</h2><p class="tmp-sub">${d.sub}</p>
      ${d.reloj ? '<div class="tmp-reloj" id="tmp-reloj">0:00</div>' : ''}
      <div class="tmp-ideas">${d.ideas.map(i => `<span>${i}</span>`).join('')}</div>
      <div class="tmp-btns">${d.cancion ? '<button class="tmp-btn" data-t="cancion">🎵 Canción de cuna</button>' : ''}<button class="tmp-btn" data-t="papas">👩 Papá o mamá</button></div></div>`;
    document.body.appendChild(capa);
    capa.addEventListener('click', e => {
      const b = e.target.closest('[data-t]'); if (!b) return;
      if (b.dataset.t === 'cancion') cancionDeCuna();
      if (b.dataset.t === 'papas') J.pedirPin(opcionesPapas, { siempre: true, z: 60 });
    });
    actualizarReloj(r);
    setTimeout(() => J.say(d.voz), 400);
  }
  function actualizarReloj(r) {
    const el = capa && capa.querySelector('#tmp-reloj');
    if (el && r.hasta) el.textContent = reloj(r.hasta - ahora());
  }
  function quitar() {
    if (!capa) return;
    capa.remove(); capa = null; capaTipo = '';
    window.JUEGO_PAUSADO = false; dispatchEvent(new CustomEvent('tiempo-sigue'));
    parar && parar();
  }
  function opcionesPapas() {
    const w = document.createElement('div'); w.className = 'regalo'; w.style.zIndex = 60;
    w.innerHTML = `<div class="regalo-caja"><p class="regalo-titulo">⏰ Control de tiempo</p><div class="tmp-btns" style="flex-direction:column">
      <button class="tmp-btn si" data-o="10">➕ 10 minutos más</button><button class="tmp-btn" data-o="30">➕ 30 minutos más</button>
      <button class="tmp-btn" data-o="libre">🔓 Desbloquear</button><a class="tmp-btn" data-o="config" href="${J.ROOT || ''}tiempo.html" style="text-decoration:none">⚙️ Cambiar las reglas</a>
      <button class="tmp-btn" data-o="cerrar">Cerrar</button></div></div>`;
    document.body.appendChild(w);
    w.addEventListener('click', e => {
      const b = e.target.closest('[data-o]'); if (!b) return;
      const o = b.dataset.o;
      if (o === 'config') return;
      if (o === '10' || o === '30') extra(+o);
      if (o === 'libre') desbloquear();
      w.remove(); revisar();
    });
  }

  // ---------- canción de cuna (Estrellita, melodía tradicional) ----------
  let parar = null;
  function cancionDeCuna() {
    if (parar) { parar(); return; }
    const c = J.audio(); if (!c) return;
    const N = { C: 523.25, D: 587.33, E: 659.25, F: 698.46, G: 783.99, A: 880 };
    const mel = 'C C G G A A G- F F E E D D C- G G F F E E D- G G F F E E D- C C G G A A G- F F E E D D C-'.split(' ');
    let t = c.currentTime + .1; const g = c.createGain(); g.gain.value = .12; g.connect(c.destination);
    const osc = [];
    for (const n of mel) {
      const d = n.endsWith('-') ? 1.3 : .65, f = N[n[0]];
      const o = c.createOscillator(), e = c.createGain(); o.type = 'sine'; o.frequency.value = f / 2;
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(1, t + .05); e.gain.exponentialRampToValueAtTime(.001, t + d * .95);
      o.connect(e).connect(g); o.start(t); o.stop(t + d); osc.push(o); t += d;
    }
    const fin = setTimeout(() => { parar = null; }, (t - c.currentTime) * 1000);
    parar = () => { clearTimeout(fin); osc.forEach(o => { try { o.stop(); } catch (e) {} }); g.disconnect(); parar = null; };
  }

  // ---------- acciones de mamá y papá ----------
  function extra(min) { const e = leer(), n = nino(); e.extra[n] = (e.extra[n] || 0) + min; e.descansoHasta = 0; e.bloqueado = false; e.sesion[n] = 0; e.perdon = 0; escribir(e); avisado = false; }
  function desbloquear(min = 30) { const e = leer(); e.bloqueado = false; e.descansoHasta = 0; e.sesion[nino()] = 0; e.perdon = ahora() + min * 60000; escribir(e); avisado = false; }
  function bloquear() { const e = leer(); e.bloqueado = true; escribir(e); }
  function reiniciarHoy() { const e = leer(); escribir({ dia: e.dia, sesion: {}, extra: {}, bloqueado: false, descansoHasta: 0, perdon: 0 }); if (P.uso) delete P.uso[hoyKey()]; J.save(); avisado = false; }

  // ---------- revisión cada pocos segundos ----------
  function revisar() {
    if (libre) return;
    const r = razon();
    if (r) { mostrar(r); return; }
    quitar();
    const q = quedan();
    if (q <= 2 && q > 0 && !avisado) { avisado = true; aviso('En 2 minutos descansamos'); J.say('En dos minutos descansamos.'); }
    if (q > 2.5) avisado = false;
  }
  setInterval(contar, PASO);
  setInterval(revisar, 3000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', revisar); else setTimeout(revisar, 50);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') revisar(); });
  addEventListener('storage', e => { if (e.key === KEY) revisar(); });   // otra pestaña cambió el estado

  window.Tiempo = {
    BASE, PRESETS, cfg, cfgGeneral, guardar() { J.save(); revisar(); }, razon, quedan, leer, usadoHoy, usoDe, hoyKey,
    extra(min) { extra(min); revisar(); }, desbloquear(min) { desbloquear(min); revisar(); }, bloquear() { bloquear(); revisar(); }, reiniciarHoy() { reiniciarHoy(); revisar(); },
    contar, revisar, PAGINA,
  };
})();
