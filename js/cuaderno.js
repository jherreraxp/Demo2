// Mi Cuaderno: el cuaderno de la familia hecho juego. Calendario de 20 días, fines de semana, talleres,
// "¿Cuánto aprendí?" y diploma. Todo se dice con voz: la niña aún no lee; las palabras se muestran
// en MAYÚSCULAS para que las vaya reconociendo.
(() => {
  const J = window.Juego, P = J.progress, C = window.CUADERNO;
  const $ = s => document.querySelector(s);
  const DEF = { mama: 'Lupe', papa: 'José', hermana: 'Amara', idolo: 'Rumi' };
  const EMO = { yo: '👧', mama: '👩', papa: '👨', hermana: '🧒', idolo: '🎤' };
  P.cuaderno = P.cuaderno || { dias: {}, finde: {}, talleres: {}, eval: null };
  const Q = P.cuaderno;
  const fam = () => Object.assign({}, DEF, P.familia || {}, { yo: J.childName() });
  const norm = s => J.strip(String(s)).toLowerCase();
  // nombres de la familia en textos y dibujos
  const txt = s => String(s).replace(/\{(\w+)\}/g, (_, k) => fam()[k] || k);
  const dib = s => { const m = /^\{(\w+)\}$/.exec(s); return m ? EMO[m[1]] || '⭐' : s; };
  const W = s => txt(s).toUpperCase();
  const sil = p => J.silabas(norm(txt(p))).split('-');
  // los ejercicios que dependen de que un nombre rime ("Amara – cara") solo salen si el nombre es ese
  const vale = it => !it.siNombre || it.siNombre.split(',').every(par => { const [k, v] = par.split(':'); return norm(fam()[k]) === v; });
  const items = act => act.items.filter(vale);
  const decir = (partes, o) => J.say(partes.map(txt), o);
  const esperar = ms => new Promise(ok => setTimeout(ok, ms));

  // ---------- calendario ----------
  const diaN = d => (d.sem - 1) * 5 + d.dia;
  const hecho = n => !!Q.dias[n];
  const abierto = n => n === 1 || hecho(n - 1) || hecho(n);
  const semanaLista = s => [1, 2, 3, 4, 5].every(d => hecho((s - 1) * 5 + d));
  const totalHechos = () => Object.keys(Q.dias).length;

  function hub() {
    $('#act').hidden = true; $('#hub').hidden = false; J.stopVoice();
    const f = fam();
    $('#titulo').textContent = `El cuaderno de ${f.yo}`;
    $('#sub').textContent = `Jugamos con los sonidos · con ${f.mama}, ${f.papa}, ${f.hermana} y ${f.idolo}`;
    $('#semanas').innerHTML = C.semanas.map(s => {
      const dias = C.dias.filter(d => d.sem === s.n);
      const finde = C.finde.filter(d => d.sem === s.n);
      const talleres = C.talleres.filter(t => t.sem === s.n);
      return `<section class="semana" style="--c:${s.color}">
        <header><span class="num">${s.n}</span><span class="se-emo">${s.emoji}</span><div><h2>${txt(s.titulo)}</h2><small>Semana ${s.n}</small></div>
          <span class="medalla ${semanaLista(s.n) ? 'on' : ''}" title="Medalla de la semana">${semanaLista(s.n) ? '🏅' : '🥈'}</span></header>
        <div class="dias">${dias.map(d => { const n = diaN(d), ok = hecho(n), ab = abierto(n);
          return `<button class="dia ${ok ? 'ok' : ''}" data-dia="${n}" ${ab ? '' : 'disabled'} aria-label="Día ${n}: ${d.titulo}">
            <span class="n">Día ${n}</span><span class="e">${ab ? d.emoji : '🔒'}</span><b>${txt(d.titulo)}</b><span class="est">${ok ? '⭐' : '☆'}</span></button>`; }).join('')}</div>
        <div class="extras">
          ${talleres.map((t, i) => { const ab = hecho((s.n - 1) * 5 + t.trasDia), k = `${s.n}-${i}`;
            return `<button class="extra taller ${Q.talleres[k] ? 'ok' : ''}" data-taller="${C.talleres.indexOf(t)}" ${ab ? '' : 'disabled'}>${ab ? t.emoji : '🔒'} <span>Taller: ${txt(t.titulo)}</span>${Q.talleres[k] ? ' ⭐' : ''}</button>`; }).join('')}
          ${finde.map(d => `<button class="extra finde ${Q.finde[d.id] ? 'ok' : ''}" data-finde="${d.id}">${d.emoji} <span>${d.tipo === 'trazos' ? 'Sábado' : 'Domingo'}: ${d.titulo}</span>${Q.finde[d.id] ? ' ⭐' : ''}</button>`).join('')}
        </div>
      </section>`;
    }).join('');
    const listo = totalHechos() >= 20;
    $('#cierre').innerHTML = `
      <button class="extra grande" data-eval="1">📝 <span>¿Cuánto aprendí?${Q.eval ? ` · ${Q.eval.total}/8` : ''}</span></button>
      <button class="extra grande" data-diploma="1" ${listo ? '' : 'disabled'}>${listo ? '🎓' : '🔒'} <span>Diploma${listo ? '' : ` (${totalHechos()}/20 días)`}</span></button>`;
    $('#progreso').innerHTML = `${'⭐'.repeat(totalHechos())}${'☆'.repeat(20 - totalHechos())}`;
  }
  $('#hub').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    J.sfx('pop');
    if (b.dataset.dia) jugar(C.dias.find(d => diaN(d) === +b.dataset.dia), { dia: +b.dataset.dia });
    if (b.dataset.finde) jugar(C.finde.find(d => d.id === b.dataset.finde), { finde: b.dataset.finde });
    if (b.dataset.taller) taller(+b.dataset.taller);
    if (b.dataset.eval) evaluacion();
    if (b.dataset.diploma) diploma();
    if (b.dataset.familia !== undefined) J.pedirPin(familia);
  });

  // ---------- pantalla de actividad ----------
  let ses = null; // { act, items, i, fin, puntos }
  function abrirAct(titulo, emoji, consigna, lupe) {
    $('#hub').hidden = true; $('#act').hidden = false; $('#diploma').hidden = true;
    $('#a-titulo').innerHTML = `${emoji} ${J.esc(txt(titulo))}`;
    $('#a-consigna').textContent = txt(consigna).toUpperCase();
    $('#a-lupe').innerHTML = lupe ? `<b>👩 Para ${J.esc(fam().mama)}:</b> ${J.esc(txt(lupe))}` : '';
    $('#a-lupe').hidden = !lupe;
    scrollTo(0, 0);
  }
  function puntos() { $('#a-puntos').innerHTML = ses.items.map((_, k) => `<i class="${k < ses.i ? 'ok' : k === ses.i ? 'ahora' : ''}"></i>`).join(''); }
  function jugar(act, fin) {
    const lista = items(act);
    ses = { act, items: lista, i: 0, fin, intentos: 0 };
    abrirAct(act.titulo, act.emoji, act.consigna, act.lupe);
    decir([act.consigna]);
    setTimeout(siguiente, 300);
  }
  function siguiente() {
    puntos();
    if (ses.i >= ses.items.length) return terminar();
    const it = ses.items[ses.i];
    ses.intentos = 0;
    $('#escena').innerHTML = '';
    TIPOS[ses.act.tipo](it, $('#escena'));
  }
  // acierto de un ítem: festejo y al siguiente
  async function bien(dicho) {
    if (ses.ocupado) return; ses.ocupado = true;
    J.efecto('acierto'); J.cheer();
    if (dicho) decir(dicho, { queue: true });
    await esperar(1700);
    ses.ocupado = false; ses.i++; siguiente();
  }
  // nunca "no": se repite despacito y se prueba otra vez
  function casi(el, repetir) {
    ses.intentos++;
    J.boing();
    if (el) { el.classList.remove('mal'); void el.offsetWidth; el.classList.add('mal'); }
    decir([ses.intentos > 1 ? 'Escucha' : '¡Casi!', ...(repetir || []), 'Prueba otra vez']);
  }
  function terminar() {
    const f = ses.fin;
    if (f.dia) {
      const nuevo = !hecho(f.dia);
      Q.dias[f.dia] = Date.now(); if (nuevo) J.addStar();
      const s = Math.ceil(f.dia / 5);
      const medalla = nuevo && f.dia % 5 === 0 && semanaLista(s);
      J.save(); J.confetti(medalla ? 160 : 90);
      $('#escena').innerHTML = `<div class="final"><div class="grande">${medalla ? '🏅' : '⭐'}</div><h2>${medalla ? `¡Medalla de la semana ${s}!` : '¡Pintaste la estrella del día!'}</h2>
        <p>${f.dia < 20 ? `Mañana: <b>${txt(C.dias[f.dia].titulo)}</b>` : '¡Terminaste los 20 días! 🎓'}</p><button class="go" id="volver">📒 Al cuaderno</button></div>`;
      decir([medalla ? '¡Ganaste una medalla!' : '¡Pintaste la estrella del día!']);
      if (medalla) setTimeout(() => J.gift(hub), 1800);
    } else if (f.finde) {
      if (!Q.finde[f.finde]) J.addStar();
      Q.finde[f.finde] = Date.now(); J.save(); J.confetti(80);
      $('#escena').innerHTML = `<div class="final"><div class="grande">🌟</div><h2>¡Muy bien!</h2><button class="go" id="volver">📒 Al cuaderno</button></div>`;
      decir([J.pick(J.PRAISES)]);
    } else if (f.eval) return finEval();
    $('#volver') && ($('#volver').onclick = () => { J.sfx('pop'); hub(); });
    puntos();
  }
  $('#a-casa').onclick = () => { J.sfx('pop'); hub(); };
  $('#a-oir').onclick = () => { J.sfx('pop'); ses && decir([ses.act.consigna]); ses && TIPOS[ses.act.tipo].oir && TIPOS[ses.act.tipo].oir(); };

  // ---------- piezas de las actividades ----------
  const tarjeta = (wd, extra = '') => `<button class="tarjeta ${extra}" data-w="${J.esc(txt(wd.t))}"><span class="e">${dib(wd.e)}</span><b>${J.esc(W(wd.t))}</b></button>`;
  const cuadritos = (n, llenos) => `<div class="cuadritos">${Array.from({ length: n }, (_, k) => `<i class="${k < llenos ? 'ok' : ''}"></i>`).join('')}</div>`;
  const fila = frase => frase.map(p => `<span class="pal">${J.esc(W(p))}</span>`).join(' ');
  let oirActual = () => {};
  const TIPOS = {
    // un golpecito por palabra: cada toque dice la palabra que sigue y pinta un cuadrito
    golpecito(it, el) {
      let n = 0;
      const pintar = () => {
        el.innerHTML = `<div class="dibus">${it.dib.map(d => `<span class="d">${dib(d)}</span>`).join('')}</div>
          <p class="frase">${it.frase.map((p, k) => `<span class="pal ${k < n ? 'on' : ''}">${J.esc(W(p))}</span>`).join(' ')}</p>
          ${cuadritos(5, n)}<button class="tambor" id="tambor" aria-label="Dar un golpecito">👆<small>¡Golpecito!</small></button>`;
        $('#tambor').onclick = () => {
          if (n >= it.frase.length) return;
          J.sfx('pop', .8, 1 + n * .1); decir([it.frase[n]]); n++; pintar();
          if (n === it.frase.length) bien([...it.frase]);
        };
      };
      pintar(); oirActual = () => decir(it.frase); oirActual();
    },
    // ¿cuántas palabras? 1 2 3 4
    cuantas(it, el) {
      el.innerHTML = `<div class="dibus">${it.dib.map(d => `<span class="d">${dib(d)}</span>`).join('')}</div>
        <p class="frase">${fila(it.frase)}</p><div class="numeros">${[1, 2, 3, 4].map(k => `<button data-k="${k}">${k}</button>`).join('')}</div>`;
      el.querySelector('.numeros').onclick = async e => {
        const b = e.target.closest('[data-k]'); if (!b) return;
        if (+b.dataset.k === it.frase.length) {
          b.classList.add('bien');
          const pals = el.querySelectorAll('.pal');
          for (let k = 0; k < pals.length; k++) { pals[k].classList.add('on'); await esperar(330); }
          bien(it.frase);
        } else casi(b, it.frase);
      };
      oirActual = () => decir(it.frase); oirActual();
    },
    larga(it, el) {
      const par = J.shuffle([it.a, it.b]);
      el.innerHTML = `<div class="opciones dos">${par.map(x => tarjeta(x)).join('')}</div>`;
      const larga = sil(it.a.t).length > sil(it.b.t).length ? it.a : it.b;
      el.querySelector('.opciones').onclick = e => {
        const b = e.target.closest('.tarjeta'); if (!b) return;
        if (b.dataset.w === txt(larga.t)) { b.classList.add('bien'); bien(sil(larga.t)); } else casi(b, [txt(it.a.t), txt(it.b.t)]);
      };
      oirActual = () => decir([par[0].t, par[1].t]); oirActual();
    },
    // ordena la oración: toca los dibujos en orden
    ordena(it, el) {
      const orden = it.frase.map((p, k) => ({ p, d: it.dib[k], k }));
      let mezcla = J.shuffle(orden); if (mezcla.every((x, k) => x.k === k) && mezcla.length > 1) mezcla = mezcla.reverse();
      const puestos = [];
      const pintar = () => {
        el.innerHTML = `<div class="huecos">${orden.map((_, k) => `<span class="hueco ${puestos[k] ? 'lleno' : ''}">${puestos[k] ? `<span class="d">${dib(puestos[k].d)}</span><b>${J.esc(W(puestos[k].p))}</b>` : k + 1}</span>`).join('<i>→</i>')}</div>
          <div class="opciones">${mezcla.map(x => puestos.includes(x) ? '' : `<button class="tarjeta" data-k="${x.k}"><span class="e">${dib(x.d)}</span><b>${J.esc(W(x.p))}</b></button>`).join('')}</div>`;
        el.querySelector('.opciones').onclick = e => {
          const b = e.target.closest('[data-k]'); if (!b) return;
          const x = orden[+b.dataset.k];
          if (x.k === puestos.length) { puestos.push(x); J.sfx('pop'); decir([x.p]); pintar(); if (puestos.length === orden.length) bien(it.frase); }
          else casi(b, it.frase);
        };
      };
      pintar(); oirActual = () => decir(mezcla.map(x => x.p)); oirActual();
    },
    completa(it, el) {
      el.innerHTML = `<p class="frase">${fila(it.frase)} <span class="pal hueco-txt">______</span></p><div class="opciones">${J.shuffle(it.ops).map(o => tarjeta(o)).join('')}</div>`;
      el.querySelector('.opciones').onclick = e => {
        const b = e.target.closest('.tarjeta'); if (!b) return;
        if (b.dataset.w === txt(it.ok.t)) { el.querySelector('.hueco-txt').textContent = W(it.ok.t); b.classList.add('bien'); bien([...it.frase, it.ok.t]); }
        else casi(b, it.frase);
      };
      oirActual = () => decir(it.frase); oirActual();
    },
    // ¿suenan igual al final? carita feliz o carita seria
    suenan(it, el) {
      el.innerHTML = `<div class="opciones dos sin">${tarjeta(it.a)}${tarjeta(it.b)}</div><div class="caritas"><button data-r="1" aria-label="Sí riman">😀</button><button data-r="0" aria-label="No riman">😐</button></div>`;
      el.querySelector('.caritas').onclick = e => {
        const b = e.target.closest('[data-r]'); if (!b) return;
        if (!!+b.dataset.r === it.rima) { b.classList.add('bien'); bien(it.rima ? [it.a.t, it.b.t, '¡Riman!'] : [it.a.t, it.b.t]); }
        else casi(b, [it.a.t, it.b.t]);
      };
      oirActual = () => decir([it.a.t, it.b.t]); oirActual();
    },
    buscarima(it, el) {
      el.innerHTML = `<div class="grande-dib">${tarjeta(it.grande, 'grande')}</div><div class="opciones">${it.ops.map((o, k) => tarjeta(o, '').replace('class="tarjeta ', `data-k="${k}" class="tarjeta `)).join('')}</div>`;
      el.querySelector('.opciones').onclick = e => {
        const b = e.target.closest('.tarjeta'); if (!b) return;
        if (+b.dataset.k === it.ok) { b.classList.add('bien'); bien([it.grande.t, it.ops[it.ok].t, '¡Riman!']); }
        else casi(b, [it.grande.t, ...it.ops.map(o => o.t)]);
      };
      oirActual = () => decir([it.grande.t, ...it.ops.map(o => o.t)]); oirActual();
    },
    // parejas que riman: toca uno de la izquierda y su pareja de la derecha
    parejas(it, el) {
      const der = J.shuffle(it.der.map((x, k) => ({ x, k })));
      let elegido = null; const unidos = new Set();
      el.innerHTML = `<div class="columnas"><div class="col" id="izq">${it.izq.map((x, k) => tarjeta(x).replace('class="tarjeta ', `data-i="${k}" class="tarjeta `)).join('')}</div>
        <div class="col" id="der">${der.map(o => tarjeta(o.x).replace('class="tarjeta ', `data-d="${o.k}" class="tarjeta `)).join('')}</div></div>`;
      el.onclick = e => {
        const b = e.target.closest('.tarjeta'); if (!b || b.classList.contains('bien')) return;
        decir([b.dataset.w]);
        if (b.dataset.i !== undefined) { el.querySelectorAll('[data-i]').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); elegido = +b.dataset.i; return; }
        if (elegido === null) return;
        const izqB = el.querySelector(`[data-i="${elegido}"]`);
        if (+b.dataset.d === elegido) {
          unidos.add(elegido); [izqB, b].forEach(x => { x.classList.remove('sel'); x.classList.add('bien'); x.style.setProperty('--par', `hsl(${unidos.size * 67} 80% 88%)`); });
          J.efecto('acierto'); elegido = null;
          if (unidos.size === it.izq.length) { el.onclick = null; bien(['¡Todas riman!']); }
        } else casi(b, [it.izq[elegido].t]);
      };
      oirActual = () => decir(it.izq.map(x => x.t)); oirActual();
    },
    intrusa(it, el) {
      el.innerHTML = `<div class="opciones cuatro">${it.ops.map((o, k) => tarjeta(o).replace('class="tarjeta ', `data-k="${k}" class="tarjeta `)).join('')}</div>`;
      el.querySelector('.opciones').onclick = e => {
        const b = e.target.closest('.tarjeta'); if (!b) return;
        if (+b.dataset.k === it.ok) { b.classList.add('bien', 'tachada'); bien([it.ops[it.ok].t, 'no rima']); }
        else casi(b, it.ops.map(o => o.t));
      };
      oirActual = () => decir(it.ops.map(o => o.t)); oirActual();
    },
    // inventa la rima: ella la dice en voz alta; mamá o papá tocan "¡Lo dijo!"
    inventa(it, el) {
      el.innerHTML = `<div class="grande-dib">${tarjeta(it.p, 'grande')}</div>
        <p class="ayuda">🎤 Di una palabra que rime con <b>${J.esc(W(it.p.t))}</b></p>
        <div class="fila-btn"><button class="b-ayuda" id="ej">💡 Una idea</button><button class="go" id="dijo">✅ ¡Lo dijo!</button></div>`;
      $('#ej').onclick = () => { J.sfx('pop'); decir([it.p.t, it.ej]); $('#ej').textContent = `💡 ${W(it.p.t)} – ${it.ej.toUpperCase()}`; };
      $('#dijo').onclick = () => bien(['¡Qué buena rima!']);
      oirActual = () => decir(['Algo que rime con', it.p.t]); oirActual();
    },
    // palmadas: una por sílaba; cada palmada dice su pedacito
    palmadas(it, el) {
      const s = sil(it.t); let n = 0;
      const pintar = () => {
        el.innerHTML = `<div class="grande-dib">${tarjeta(it, 'grande')}</div>
          <p class="silabas">${s.map((x, k) => `<span class="${k < n ? 'on' : ''}">${J.esc(x.toUpperCase())}</span>`).join('<i>-</i>')}</p>
          ${cuadritos(Math.max(3, s.length + 1), n)}<button class="tambor" id="tambor" aria-label="Dar una palmada">👏<small>¡Palmada!</small></button>`;
        $('#tambor').onclick = () => {
          if (n >= s.length) return;
          J.sfx('pop', .9, 1.2 + n * .12); decir([s[n]]); n++; pintar();
          if (n === s.length) bien([txt(it.t)]);
        };
      };
      pintar(); oirActual = () => decir([it.t]); oirActual();
    },
    // cuántas palmadas tiene el nombre: 1 2 3
    nombres(it, el) {
      const s = sil(it.t);
      el.innerHTML = `<div class="grande-dib">${tarjeta(it, 'grande')}</div><div class="numeros">${[1, 2, 3].map(k => `<button data-k="${k}">${k}</button>`).join('')}</div>`;
      el.querySelector('.numeros').onclick = e => {
        const b = e.target.closest('[data-k]'); if (!b) return;
        if (+b.dataset.k === s.length) { b.classList.add('bien'); bien(s); } else casi(b, s);
      };
      oirActual = () => decir([it.t]); oirActual();
    },
    cuantasSil(it, el) { TIPOS.nombres(it, el); },
    empieza(it, el) {
      const ok = sil(it.p.t)[0];
      el.innerHTML = `<div class="grande-dib">${tarjeta(it.p, 'grande')}</div><div class="silops">${it.ops.map(o => `<button data-s="${o}">${o.toUpperCase()}</button>`).join('')}</div>`;
      el.querySelector('.silops').onclick = e => {
        const b = e.target.closest('[data-s]'); if (!b) return;
        decir([b.dataset.s]);
        if (b.dataset.s === ok) { b.classList.add('bien'); bien([it.p.t, 'empieza con', ok]); } else casi(b, [it.p.t]);
      };
      oirActual = () => decir([it.p.t]); oirActual();
    },
    // junta las sílabas: se dicen separadas y ella toca el dibujo
    junta(it, el) {
      const s = sil(it.p);
      el.innerHTML = `<p class="silabas sueltas">${s.map(x => `<span class="on">${J.esc(x.toUpperCase())}</span>`).join('<i>+</i>')}</p><div class="opciones">${J.shuffle(it.ops).map(o => tarjeta(o)).join('')}</div>`;
      el.querySelector('.opciones').onclick = e => {
        const b = e.target.closest('.tarjeta'); if (!b) return;
        if (norm(b.dataset.w) === norm(txt(it.p))) { b.classList.add('bien'); bien([it.p]); } else casi(b, s);
      };
      oirActual = () => decir(s); oirActual();
    },
    perdida(it, el) {
      const s = sil(it.p.t), ok = s[it.falta];
      el.innerHTML = `<div class="grande-dib">${tarjeta({ t: '', e: it.p.e }, 'grande sin-txt')}</div>
        <p class="silabas">${s.map((x, k) => k === it.falta ? '<span class="hueco-sil">?</span>' : `<span class="on">${J.esc(x.toUpperCase())}</span>`).join('<i>-</i>')}</p>
        <div class="silops">${it.ops.map(o => `<button data-s="${o}">${o.toUpperCase()}</button>`).join('')}</div>`;
      el.querySelector('.silops').onclick = e => {
        const b = e.target.closest('[data-s]'); if (!b) return;
        decir([b.dataset.s]);
        if (b.dataset.s === ok) { el.querySelector('.hueco-sil').textContent = ok.toUpperCase(); b.classList.add('bien'); bien([it.p.t]); }
        else casi(b, [it.p.t]);
      };
      oirActual = () => decir(s.map((x, k) => k === it.falta ? '…' : x)); oirActual();
    },
    quita(it, el) {
      const s = sil(it.p.t);
      el.innerHTML = `<div class="grande-dib">${tarjeta(it.p, 'grande')}</div>
        <p class="silabas">${s.map((x, k) => `<span class="${k ? 'on' : 'quitada'}">${J.esc(x.toUpperCase())}</span>`).join('<i>-</i>')}</p>
        <div class="opciones">${it.ops.map((o, k) => tarjeta(o).replace('class="tarjeta ', `data-k="${k}" class="tarjeta `)).join('')}</div>`;
      el.querySelector('.opciones').onclick = e => {
        const b = e.target.closest('.tarjeta'); if (!b) return;
        if (+b.dataset.k === it.ok) { b.classList.add('bien'); bien([it.p.t, it.ops[it.ok].t]); } else casi(b, [it.p.t]);
      };
      oirActual = () => decir([it.p.t]); oirActual();
    },
    // el primer sonido: dos de los tres empiezan igual que el grande
    primersonido(it, el) {
      const marcados = new Set();
      el.innerHTML = `<div class="grande-dib">${tarjeta(it.grande, 'grande')}</div><div class="opciones">${it.ops.map((o, k) => tarjeta(o).replace('class="tarjeta ', `data-k="${k}" class="tarjeta `)).join('')}</div>`;
      el.querySelector('.opciones').onclick = e => {
        const b = e.target.closest('.tarjeta'); if (!b || b.classList.contains('bien')) return;
        const k = +b.dataset.k;
        if (it.ok.includes(k)) { b.classList.add('bien'); marcados.add(k); decir([b.dataset.w]); J.sfx('pop'); if (marcados.size === it.ok.length) bien(['¡Empiezan igual!']); }
        else casi(b, [it.grande.t]);
      };
      oirActual = () => { J.sound(norm(txt(it.grande.t))[0]); decir([it.grande.t, ...it.ops.map(o => o.t)], { queue: true }); }; oirActual();
    },
    vocal(it, el) {
      const ok = norm(txt(it.p.t))[0];
      el.innerHTML = `<div class="grande-dib">${tarjeta(it.p, 'grande')}</div><div class="silops vocales">${it.ops.map(o => `<button data-s="${o}">${o.toUpperCase()}</button>`).join('')}</div>`;
      el.querySelector('.silops').onclick = e => {
        const b = e.target.closest('[data-s]'); if (!b) return;
        J.sound(b.dataset.s);
        if (b.dataset.s === ok) { b.classList.add('bien'); bien([it.p.t]); } else casi(b, [it.p.t]);
      };
      oirActual = () => { J.sound(ok); decir([it.p.t], { queue: true }); }; oirActual();
    },
    // palabras que conozco: reconocer de vista
    conozco(it, el) {
      el.innerHTML = `<p class="palabra-grande">${J.esc(W(it.p))}</p><div class="silops palabras">${J.shuffle(it.ops).map(o => `<button data-s="${J.esc(txt(o))}">${J.esc(W(o))}</button>`).join('')}</div>`;
      el.querySelector('.silops').onclick = e => {
        const b = e.target.closest('[data-s]'); if (!b) return;
        if (b.dataset.s === txt(it.p)) { b.classList.add('bien'); bien([it.p]); } else casi(b);
      };
      oirActual = () => decir([it.p]); oirActual();
    },
    // ¿qué falta? mira la fila, se tapa y se busca el que falta
    async quefalta(it, el) {
      const filaD = it.fila.map(dib);
      el.innerHTML = `<p class="ayuda">👀 Mira bien…</p><div class="memfila">${filaD.map(d => `<span class="d">${d}</span>`).join('')}</div>`;
      oirActual = () => decir(['Mira la fila']);
      await esperar(TEST ? 300 : 4500);
      if (!el.isConnected) return;
      el.innerHTML = `<p class="ayuda">🙈 ¿Qué dibujo falta?</p><div class="memfila">${filaD.map((d, k) => `<span class="d ${k === it.f ? 'falta' : ''}">${k === it.f ? '❓' : d}</span>`).join('')}</div>
        <div class="opciones">${J.shuffle(filaD.map((d, k) => ({ d, k }))).map(o => `<button class="tarjeta" data-k="${o.k}"><span class="e">${o.d}</span></button>`).join('')}</div>`;
      decir(['¿Qué falta?']);
      el.querySelector('.opciones').onclick = e => {
        const b = e.target.closest('[data-k]'); if (!b) return;
        if (+b.dataset.k === it.f) { el.querySelector('.falta').textContent = filaD[it.f]; el.querySelector('.falta').classList.add('on'); b.classList.add('bien'); bien(); } else casi(b);
      };
    },
    // trazos: seguir el camino con el dedo, de izquierda a derecha
    trazos(it, el) {
      el.innerHTML = `<div class="trazo"><span class="t-ini">${it.e}</span><canvas id="lienzo"></canvas><span class="t-fin">🏁</span></div><p class="ayuda">✍️ Desde el punto azul hasta la bandera</p>`;
      const cv = $('#lienzo'), g = cv.getContext('2d');
      const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = r.width * dpr; cv.height = r.height * dpr; g.scale(dpr, dpr);
      const Wd = r.width, H = r.height, m = 26, A = H * .28, cy = H / 2, N = 160, pts = [];
      for (let k = 0; k <= N; k++) {
        const u = k / N, x = m + u * (Wd - 2 * m); let y = cy;
        const ph = u * 8;
        if (it.f === 'ondas') y = cy + Math.sin(ph * Math.PI) * A;
        if (it.f === 'zigzag') y = cy + (Math.abs((ph % 2) - 1) * 2 - 1) * A;
        if (it.f === 'arcos') y = cy + A * .6 - Math.abs(Math.sin(ph * Math.PI)) * A * 1.3;
        if (it.f === 'palos') { const t = (u * 10) % 1; y = cy + (t < .5 ? -A + t * 4 * A : A - (t - .5) * 4 * A); }
        if (it.f === 'bucles') { const a = u * 5 * Math.PI * 2; pts.push([m + u * (Wd - 2 * m) * .9 + Math.sin(a) * A * .45, cy - Math.cos(a) * A * .9 + A * .3]); continue; }
        pts.push([x, y]);
      }
      const hechos = new Array(pts.length).fill(false);
      const dibujar = () => {
        g.clearRect(0, 0, Wd, H);
        g.lineWidth = 10; g.lineCap = 'round'; g.setLineDash([12, 12]); g.strokeStyle = '#b8bfd0';
        g.beginPath(); pts.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
        g.setLineDash([]); g.lineWidth = 14; g.strokeStyle = '#ff5dab';
        g.beginPath(); let on = false;
        pts.forEach(([x, y], k) => { if (hechos[k]) { on ? g.lineTo(x, y) : g.moveTo(x, y); on = true; } else on = false; }); g.stroke();
        g.fillStyle = '#4f7cff'; g.beginPath(); g.arc(pts[0][0], pts[0][1], 11, 0, 7); g.fill();
      };
      dibujar();
      let abajo = false, listo = false;
      const tocar = e => {
        const b = cv.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
        pts.forEach(([px, py], k) => { if (!hechos[k] && Math.hypot(px - x, py - y) < 30) hechos[k] = true; });
        dibujar();
        const pct = hechos.filter(Boolean).length / hechos.length;
        if (!listo && pct > .85 && hechos.slice(-8).some(Boolean)) { listo = true; bien(); }
      };
      cv.onpointerdown = e => { abajo = true; cv.setPointerCapture(e.pointerId); tocar(e); };
      cv.onpointermove = e => { if (abajo) tocar(e); };
      cv.onpointerup = cv.onpointercancel = () => { abajo = false; };
      ses.auto = () => { pts.forEach((_, k) => { hechos[k] = true; }); dibujar(); bien(); };
      oirActual = () => decir(['Sigue el camino']);
    },
    // memoria de rimas: dos tarjetas que riman son pareja
    memo(it, el) {
      const cartas = J.shuffle(it.pares.flatMap((p, k) => p.map(x => ({ x, k }))));
      let abiertas = [], parejas = 0, bloq = false;
      el.innerHTML = `<div class="memo">${cartas.map((c, i) => `<button class="carta" data-i="${i}"><span class="atras">⭐</span><span class="frente"><span class="e">${c.x.e}</span><b>${J.esc(W(c.x.t))}</b></span></button>`).join('')}</div>`;
      el.querySelector('.memo').onclick = e => {
        const b = e.target.closest('.carta'); if (!b || bloq || b.classList.contains('vuelta')) return;
        const c = cartas[+b.dataset.i]; b.classList.add('vuelta'); decir([c.x.t]); abiertas.push([b, c]);
        if (abiertas.length < 2) return;
        bloq = true;
        const [[b1, c1], [b2, c2]] = abiertas; abiertas = [];
        setTimeout(() => {
          if (c1.k === c2.k) { b1.classList.add('par'); b2.classList.add('par'); J.efecto('acierto'); parejas++; bloq = false; if (parejas === it.pares.length) bien(['¡Todas riman!']); }
          else { b1.classList.remove('vuelta'); b2.classList.remove('vuelta'); bloq = false; }
        }, 900);
      };
      ses.auto = () => { parejas = it.pares.length; bien(); };
      oirActual = () => decir(['Voltea dos tarjetas']);
    },
  };

  // ---------- taller: las palabras con palmadas y luego al juego ----------
  function taller(ix) {
    const t = C.talleres[ix];
    const act = { titulo: 'Taller: ' + t.titulo, emoji: '🎨', tipo: 'palmadas', items: t.palabras,
      consigna: 'Antes de jugar, di cada nombre con palmadas.', lupe: 'Regla del taller: antes de usar cada cosa, el nombre con palmadas. Después juegan en la parte del juego que se abre.' };
    jugar(act, { taller: ix });
    ses.fin = { taller: ix };
    ses.onFin = () => {
      const k = `${t.sem}-${C.talleres.filter(x => x.sem === t.sem).indexOf(t)}`;
      if (!Q.talleres[k]) J.addStar(); Q.talleres[k] = Date.now(); J.save(); J.confetti(70);
      $('#escena').innerHTML = `<div class="final"><div class="grande">${t.emoji}</div><h2>¡Ahora a jugar!</h2><p>${J.esc(txt(t.titulo))}</p>
        <div class="fila-btn"><a class="go" href="${t.url}">▶ Ir al taller</a><button class="b-ayuda" id="volver">📒 Al cuaderno</button></div></div>`;
      $('#volver').onclick = () => { J.sfx('pop'); hub(); };
      decir(['¡A jugar!']);
    };
  }
  const terminarBase = terminar;
  // eslint-disable-next-line no-func-assign
  terminar = function () { if (ses && ses.onFin) { puntos(); return ses.onFin(); } return terminarBase(); };

  // ---------- ¿cuánto aprendí? ----------
  function evaluacion() {
    const lista = C.evaluacion.map(e => ({ tipo: e.tipo, area: e.area, it: vale(e.it) ? e.it : (e.alt || e.it) }));
    let k = 0; const puntaje = { Palabras: 0, Rimas: 0, Sílabas: 0 };
    abrirAct('¿Cuánto aprendí?', '📝', 'Juegos que ya sé hacer.', 'Hazlo como un juego más, no como examen. Cuenta solo si acierta a la primera.');
    ses = { act: { tipo: 'eval' }, items: lista, i: 0, fin: { eval: true }, intentos: 0 };
    const uno = () => {
      ses.i = k; puntos();
      if (k >= lista.length) { ses.puntaje = puntaje; return finEval(); }
      const e = lista[k]; ses.intentos = 0;
      $('#escena').innerHTML = `<p class="area">${e.area}</p><div id="sub-escena"></div>`;
      const sub = $('#sub-escena');
      // se usa la misma actividad, pero al acertar se anota (a la primera) y sigue
      const bienAntes = ses.intentos;
      TIPOS[e.tipo](e.it, sub);
      ses.alAcertar = () => { if (ses.intentos === bienAntes) puntaje[e.area]++; k++; };
    };
    ses.siguienteEval = uno;
    uno();
  }
  function finEval() {
    const p = ses.puntaje || { Palabras: 0, Rimas: 0, Sílabas: 0 }, total = p.Palabras + p.Rimas + p.Sílabas;
    Q.eval = { ...p, total, fecha: Date.now() }; J.save(); J.confetti(100);
    const nivel = total >= 7 ? ['🌳', `${fam().yo} está lista para seguir con vocales y primeras consonantes (Nivel 2): prueben "Vocales y sonidos" y "Junta los sonidos".`]
      : total >= 4 ? ['🌿', 'Muy bien para 4 años. Repitan las semanas 3 y 4 otro mes y vuelvan a jugar esta página.']
      : ['🌱', 'Es normal a esta edad. Repitan el cuaderno desde la semana 1 con sesiones de 5 minutos.'];
    $('#escena').innerHTML = `<div class="final"><div class="grande">${nivel[0]}</div><h2>¡${total} de 8!</h2>
      <table class="tabla"><tr><td>Palabras</td><td>${p.Palabras} / 2</td></tr><tr><td>Rimas</td><td>${p.Rimas} / 2</td></tr><tr><td>Sílabas</td><td>${p.Sílabas} / 4</td></tr><tr><th>Total</th><th>${total} / 8</th></tr></table>
      <p class="nota-lupe">👩 <b>Para ${J.esc(fam().mama)}:</b> ${J.esc(nivel[1])}</p><button class="go" id="volver">📒 Al cuaderno</button></div>`;
    $('#volver').onclick = () => { J.sfx('pop'); hub(); };
    decir(['¡Jugaste muy bien!']);
  }
  // en la evaluación, "bien" anota el punto y pasa al siguiente ítem
  const bienBase = bien;
  // eslint-disable-next-line no-func-assign
  bien = async function (dicho) {
    if (ses && ses.siguienteEval) {
      if (ses.ocupado) return; ses.ocupado = true;
      ses.alAcertar && ses.alAcertar(); J.efecto('acierto'); if (dicho) decir(dicho, { queue: true });
      await esperar(1400); ses.ocupado = false; return ses.siguienteEval();
    }
    return bienBase(dicho);
  };

  // ---------- diploma ----------
  function diploma() {
    const f = fam();
    $('#hub').hidden = true; $('#act').hidden = true; $('#diploma').hidden = false;
    $('#diploma').innerHTML = `<div class="dip"><div class="dip-emo">👸 ⭐ 🎤</div><h1>DIPLOMA</h1><p class="dip-sub">Jugamos con los sonidos · Nivel 1</p><p>Se otorga a</p>
      <p class="dip-nombre">${J.esc(f.yo.toUpperCase())}</p><p>por jugar durante 20 días con las palabras, las rimas, las sílabas y los sonidos, y por estar cada día más cerca de leer.</p>
      <div class="dip-emo">🗣️ 🎵 👏 🔊</div><div class="firmas"><span>${new Date().toLocaleDateString('es-PE')}<small>Fecha</small></span><span>&nbsp;<small>Mamá ${J.esc(f.mama)}</small></span><span>&nbsp;<small>Papá ${J.esc(f.papa)}</small></span></div>
      <div class="fila-btn no-print"><button class="go" onclick="print()">🖨️ Imprimir</button><button class="b-ayuda" id="d-volver">📒 Al cuaderno</button></div></div>`;
    $('#d-volver').onclick = () => { $('#diploma').hidden = true; hub(); };
    J.confetti(150); J.fanfare(); decir(['¡Felicidades!', f.yo]);
  }

  // ---------- nombres de la familia (lo cambia mamá o papá) ----------
  function familia() {
    const f = fam(), d = document.createElement('div');
    d.className = 'modal'; d.innerHTML = `<div class="modal-caja"><h2>👨‍👩‍👧‍👧 La familia del cuaderno</h2>
      ${[['mama', 'Mamá'], ['papa', 'Papá'], ['hermana', 'Hermana o hermano'], ['idolo', 'Su cantante o personaje favorito']].map(([k, l]) => `<label>${l}<input data-k="${k}" value="${J.esc(f[k])}" maxlength="20"></label>`).join('')}
      <p class="mini">El nombre de la niña se cambia en el modo admin (jugadores).</p><div class="fila-btn"><button class="b-ayuda" data-x>Cancelar</button><button class="go" data-ok>Guardar</button></div></div>`;
    document.body.appendChild(d);
    d.onclick = e => {
      if (e.target.closest('[data-x]') || e.target === d) return d.remove();
      if (e.target.closest('[data-ok]')) {
        P.familia = {}; d.querySelectorAll('input').forEach(i => { const v = i.value.trim(); if (v) P.familia[i.dataset.k] = v; });
        J.save(); d.remove(); hub();
      }
    };
  }

  const TEST = location.hash === '#prueba';
  J.ready.then(() => {
    hub();
    J.refreshMusic();
    setTimeout(() => decir([`El cuaderno de ${fam().yo}`]), 600);
    if (TEST) window.__cq = {
      Q, C, hub, abrirDia: n => jugar(C.dias.find(d => diaN(d) === n), { dia: n }), abrirFinde: id => jugar(C.finde.find(d => d.id === id), { finde: id }),
      taller, evaluacion, diploma, get ses() { return ses; }, txt, sil,
    };
  });
})();
