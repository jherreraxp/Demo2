// En Raya: 3 en raya (3×3), 4 en raya (6×7, las fichas caen) y 5 en raya (9×9).
// Las fichas son dibujos, letras, sílabas o palabras: la voz las lee al ponerlas.
(() => {
  const J = window.Juego, P = J.progress;
  const $ = s => document.querySelector(s);
  const JUEGOS = {
    3: { nombre: '3 en raya', filas: 3, cols: 3, k: 3, caer: false, emoji: '⭕' },
    4: { nombre: '4 en raya', filas: 6, cols: 7, k: 4, caer: true, emoji: '🔵' },
    5: { nombre: '5 en raya', filas: 9, cols: 9, k: 5, caer: false, emoji: '⭐' },
  };
  // cada juego de fichas: [ficha de la jugadora 1, ficha de la jugadora 2] = { t: lo que se ve, d: lo que dice, letra }
  const FICHAS = {
    dibujos: { nombre: 'Dibujos', ej: '☀️🌙', par: [{ t: '☀️', d: 'sol' }, { t: '🌙', d: 'luna' }] },
    letras: { nombre: 'Letras', ej: 'a m', par: [{ t: 'a', d: 'a' }, { t: 'm', d: 'm', letra: true }] },
    silabas: { nombre: 'Sílabas', ej: 'ma pa', par: [{ t: 'ma', d: 'ma' }, { t: 'pa', d: 'pa' }] },
    palabras: { nombre: 'Palabras', ej: 'sol luna', par: [{ t: 'sol', d: 'sol' }, { t: 'luna', d: 'luna' }] },
  };
  const NIVELES = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
  const recordar = (k, def) => { try { return localStorage.getItem('bl-enraya-' + k) || def; } catch (e) { return def; } };
  const guardar = (k, v) => { try { localStorage.setItem('bl-enraya-' + k, v); } catch (e) {} };
  const conf = { juego: +recordar('juego', '3'), fichas: recordar('fichas', 'dibujos'), modo: recordar('modo', 'compu'), nivel: recordar('nivel', 'facil') };
  const state = { tab: [], turno: 0, fin: true, puntos: [0, 0], partidas: 0, ganadasCompu: 0, pensando: false };
  const cfg = () => JUEGOS[conf.juego];
  const nombre = i => conf.modo === 'compu' && i === 1 ? 'La compu' : (P.players[i] && P.players[i].name) || (i ? 'Amara' : 'Avelu');

  function message(text, secs = 1.4) {
    const el = $('#mensaje'); el.textContent = text;
    el.classList.remove('ver'); void el.offsetWidth; el.classList.add('ver');
    clearTimeout(message.t); message.t = setTimeout(() => el.classList.remove('ver'), secs * 1000);
  }
  function updatePlayer() { const p = J.player(); $('#jugador').innerHTML = `${J.CHARS[p.char]?.emoji || '⭐'} ${J.esc(p.name)} · ⭐ ${p.stars}`; }
  const fichaHTML = (i, extra = '') => {
    const f = FICHAS[conf.fichas].par[i], largo = [...f.t].length;
    const fs = conf.fichas === 'dibujos' ? '.55' : largo <= 1 ? '.6' : largo <= 2 ? '.42' : largo <= 3 ? '.32' : '.26';
    return `<span class="ficha j${i} ${extra}" style="font-size:calc(var(--t) * ${fs})">${J.esc(f.t)}</span>`;
  };
  const decirFicha = i => { const f = FICHAS[conf.fichas].par[i]; if (f.letra) J.sound(f.d); else J.say(f.d); };

  // ---------- portada ----------
  function opciones() {
    $('#op-juego').innerHTML = Object.entries(JUEGOS).map(([k, j]) => `<button data-juego="${k}" class="${+k === conf.juego ? 'on' : ''}">${j.emoji} ${j.nombre}<small>${j.filas}×${j.cols}</small></button>`).join('');
    $('#op-fichas').innerHTML = Object.entries(FICHAS).map(([k, f]) => `<button data-fichas="${k}" class="${k === conf.fichas ? 'on' : ''}">${J.esc(f.ej)}<small>${f.nombre}</small></button>`).join('');
    $('#op-modo').innerHTML = `<button data-modo="compu" class="${conf.modo === 'compu' ? 'on' : ''}">🤖 Contra la compu</button><button data-modo="dos" class="${conf.modo === 'dos' ? 'on' : ''}">👭 Dos jugadoras</button>`;
    $('#op-nivel').hidden = conf.modo !== 'compu';
    $('#op-nivel').innerHTML = Object.entries(NIVELES).map(([k, n]) => `<button data-nivel="${k}" class="${k === conf.nivel ? 'on' : ''}">${{ facil: '🐣', medio: '🦊', dificil: '🦁' }[k]} ${n}</button>`).join('');
  }
  $('#portada').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    for (const k of ['juego', 'fichas', 'modo', 'nivel']) if (b.dataset[k]) { conf[k] = k === 'juego' ? +b.dataset[k] : b.dataset[k]; guardar(k, conf[k]); J.sfx('pop'); opciones(); }
    if (b.dataset.fichas) { decirFicha(0); }
  });

  // ---------- tablero ----------
  function medir() {
    const c = cfg(), zona = document.querySelector('.zona').getBoundingClientRect();
    const gap = c.cols > 7 ? 5 : 8;
    const t = Math.floor(Math.min((zona.width - 20 - gap * (c.cols + 1)) / c.cols, (zona.height - 10 - gap * (c.filas + 1)) / c.filas, 120));
    const tb = $('#tablero'); tb.style.setProperty('--t', Math.max(26, t) + 'px'); tb.style.setProperty('--gap', gap + 'px');
  }
  addEventListener('resize', () => { if (state.tab.length) medir(); });
  function dibujar(gana = []) {
    const c = cfg(), tb = $('#tablero');
    tb.className = 'tablero' + (c.caer ? ' gravedad' : '');
    tb.style.gridTemplateColumns = `repeat(${c.cols}, var(--t))`;
    const g = new Set(gana.map(([f, k]) => f * c.cols + k));
    tb.innerHTML = state.tab.map((v, i) => `<button class="casilla" data-i="${i}" aria-label="Casilla ${i + 1}">${v >= 0 ? fichaHTML(v, g.has(i) ? 'gana' : '') : ''}</button>`).join('');
    $('#turno').innerHTML = state.fin ? '' : `${fichaHTML(state.turno)}<span>Turno de ${J.esc(nombre(state.turno))}</span>`;
    $('#turno').hidden = state.fin;
    $('#marcador').textContent = `${state.puntos[0]} – ${state.puntos[1]}`;
  }
  // dónde cae la ficha en el 4 en raya (la casilla libre más baja de la columna)
  function destino(tab, i) {
    const c = cfg();
    if (tab[i] !== -1 && !c.caer) return -1;
    if (!c.caer) return i;
    const col = i % c.cols;
    for (let f = c.filas - 1; f >= 0; f--) if (tab[f * c.cols + col] === -1) return f * c.cols + col;
    return -1;
  }
  const libres = tab => { const c = cfg(), out = new Set(); for (let i = 0; i < tab.length; i++) { const d = destino(tab, i); if (d >= 0) out.add(d); } return [...out]; };
  // ¿hay línea ganadora que pase por i? devuelve las casillas de la línea
  function linea(tab, i) {
    const c = cfg(), v = tab[i]; if (v < 0) return null;
    const f0 = Math.floor(i / c.cols), k0 = i % c.cols;
    for (const [df, dk] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const l = [[f0, k0]];
      for (const s of [1, -1]) { let f = f0 + df * s, k = k0 + dk * s; while (f >= 0 && f < c.filas && k >= 0 && k < c.cols && tab[f * c.cols + k] === v) { l.push([f, k]); f += df * s; k += dk * s; } }
      if (l.length >= c.k) return l;
    }
    return null;
  }

  // ---------- la compu ----------
  function ganaCon(tab, quien) { for (const m of libres(tab)) { tab[m] = quien; const g = linea(tab, m); tab[m] = -1; if (g) return m; } return -1; }
  function minimax(tab, quien, prof) {
    const l = libres(tab); if (!l.length) return { s: 0 };
    let mejor = { s: quien === 1 ? -99 : 99, m: l[0] };
    for (const m of l) {
      tab[m] = quien;
      const s = linea(tab, m) ? (quien === 1 ? 10 - prof : prof - 10) : minimax(tab, 1 - quien, prof + 1).s;
      tab[m] = -1;
      if (quien === 1 ? s > mejor.s : s < mejor.s) mejor = { s, m };
    }
    return mejor;
  }
  // puntaje de una jugada: cuántas fichas propias y ajenas tiene alrededor en cada dirección
  function puntaje(tab, m) {
    const c = cfg(), f0 = Math.floor(m / c.cols), k0 = m % c.cols; let total = 0;
    for (const quien of [1, 0]) for (const [df, dk] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      let n = 0, abiertos = 0;
      for (const s of [1, -1]) {
        let f = f0 + df * s, k = k0 + dk * s, paso = 0;
        while (paso < c.k - 1 && f >= 0 && f < c.filas && k >= 0 && k < c.cols && tab[f * c.cols + k] === quien) { n++; f += df * s; k += dk * s; paso++; }
        if (f >= 0 && f < c.filas && k >= 0 && k < c.cols && tab[f * c.cols + k] === -1) abiertos++;
      }
      total += (quien === 1 ? 1.1 : 1) * (n * n * 4 + abiertos);
    }
    const centro = Math.abs(f0 - (c.filas - 1) / 2) + Math.abs(k0 - (c.cols - 1) / 2);
    return total - centro * .3;
  }
  function jugadaCompu() {
    const tab = state.tab.slice(), l = libres(tab), c = cfg();
    if (!l.length) return -1;
    const azar = () => J.pick(l);
    const gana = ganaCon(tab, 1), bloquea = ganaCon(tab, 0);
    if (conf.nivel === 'facil') {
      if (gana >= 0 && Math.random() < .6) return gana;
      if (bloquea >= 0 && Math.random() < .45) return bloquea;
      return azar();
    }
    if (gana >= 0) return gana;
    if (bloquea >= 0) return bloquea;
    if (conf.nivel === 'dificil' && c.filas === 3) return minimax(tab, 1, 0).m;
    if (conf.nivel === 'medio' && Math.random() < .35) return azar();
    // no regalar la jugada de encima en el 4 en raya
    let mejor = l[0], ms = -1e9;
    for (const m of l) {
      let s = puntaje(tab, m);
      if (c.caer && m - c.cols >= 0) { tab[m] = 1; const encima = m - c.cols; tab[encima] = 0; if (linea(tab, encima)) s -= 500; tab[encima] = -1; tab[m] = -1; }
      if (s > ms) { ms = s; mejor = m; }
    }
    return mejor;
  }

  // ---------- jugar ----------
  function poner(i) {
    if (state.fin || state.pensando) return false;
    const d = destino(state.tab, i); if (d < 0) { J.efecto('error'); return false; }
    state.tab[d] = state.turno; J.sfx('pop', .8, state.turno ? 1.2 : 1);
    decirFicha(state.turno);
    const g = linea(state.tab, d);
    if (g) { terminar(state.turno, g); return true; }
    if (!libres(state.tab).length) { terminar(-1, []); return true; }
    state.turno = 1 - state.turno; dibujar();
    if (conf.modo === 'compu' && state.turno === 1) {
      state.pensando = true;
      setTimeout(() => { state.pensando = false; const m = jugadaCompu(); if (m >= 0) poner(m); }, 650);
    }
    return true;
  }
  $('#tablero').addEventListener('click', e => {
    const b = e.target.closest('.casilla'); if (!b) return;
    if (conf.modo === 'compu' && state.turno === 1) return;
    poner(+b.dataset.i);
  });
  function terminar(ganador, gana) {
    state.fin = true; state.partidas++;
    dibujar(gana);
    let titulo, emoji, decir;
    if (ganador < 0) { titulo = '¡Empate!'; emoji = '🤝'; decir = '¡Empate! ¡Las dos jugaron muy bien!'; J.efecto('aplauso'); }
    else {
      state.puntos[ganador]++;
      const compuGana = conf.modo === 'compu' && ganador === 1;
      titulo = compuGana ? '¡Ganó la compu!' : `¡Ganó ${nombre(ganador)}!`;
      emoji = compuGana ? '🤖' : '🏆';
      decir = compuGana ? '¡Casi! ¡Otra vez!' : `¡Ganó ${nombre(ganador)}!`;
      if (!compuGana) {
        J.confetti(110); J.efecto('festejo'); J.festejo && J.festejo(6); J.addStar(); updatePlayer();
        if (conf.modo === 'compu') {
          state.ganadasCompu++;
          P.level.enraya = Math.max(P.level.enraya || 0, { facil: 1, medio: 2, dificil: 3 }[conf.nivel]); J.save();
        }
      } else J.efecto('error');
    }
    setTimeout(() => J.say(decir), 500);
    $('#marcador').textContent = `${state.puntos[0]} – ${state.puntos[1]}`;
    setTimeout(() => {
      const caja = document.createElement('div'); caja.className = 'fin';
      caja.innerHTML = `<div class="fin-caja"><div class="grande">${emoji}</div><h2>${J.esc(titulo)}</h2><p>${J.esc(nombre(0))} ${state.puntos[0]} – ${state.puntos[1]} ${J.esc(nombre(1))}</p>
        <div class="acciones"><button class="go" data-a="otra">▶ Otra vez</button><button data-a="menu">⚙️ Cambiar juego</button></div></div>`;
      document.body.appendChild(caja);
      caja.onclick = e2 => {
        const b = e2.target.closest('[data-a]'); if (!b) return;
        caja.remove(); J.sfx('pop');
        // cada 3 partidas ganadas a la compu, un regalo
        const seguir = () => b.dataset.a === 'otra' ? empezar(state.partidas % 2) : volverPortada();
        if (state.ganadasCompu && state.ganadasCompu % 3 === 0 && !state.regaloDado) { state.regaloDado = true; J.gift(seguir); } else { state.regaloDado = false; seguir(); }
      };
    }, 1700);
  }
  function empezar(quienEmpieza = 0) {
    const c = cfg();
    state.tab = Array(c.filas * c.cols).fill(-1); state.turno = quienEmpieza; state.fin = false; state.pensando = false;
    $('#portada').hidden = true; medir(); dibujar();
    J.say([c.nombre, 'Turno de', nombre(state.turno)]);
    if (conf.modo === 'compu' && state.turno === 1) { state.pensando = true; setTimeout(() => { state.pensando = false; const m = jugadaCompu(); if (m >= 0) poner(m); }, 900); }
  }
  function volverPortada() { state.fin = true; $('#turno').hidden = true; opciones(); $('#portada').hidden = false; }

  (async () => {
    await J.ready;
    updatePlayer(); J.refreshMusic && J.refreshMusic(); opciones();
    const go = $('#empezar'); go.disabled = false; go.textContent = '▶ ¡A jugar!';
    go.onclick = () => { J.audio(); J.startMusic && J.startMusic(); state.puntos = [0, 0]; empezar(0); };
    setTimeout(() => J.say('¡Pon tus fichas en raya!'), 400);
    if (location.hash === '#prueba') window.__er = { state, conf, poner, empezar, jugadaCompu, linea, JUEGOS };
  })();
})();
