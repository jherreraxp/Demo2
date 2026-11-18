// Panel de quien administra el servicio (panel.html). Habla con /api/admin/* del servidor:
// hace falta sesión, ser dueño del servicio (SUPERADMIN_EMAILS) y haber confirmado con la
// contraseña o con Google hace menos de 30 minutos (el PIN no alcanza).
(function () {
  'use strict';
  const C = window.Cuenta;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = t => String(t ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const fecha = iso => { if (!iso) return '—'; const d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  const soloDia = iso => { if (!iso) return '—'; const d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
  const hace = iso => {
    if (!iso) return 'nunca';
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (m < 2) return 'ahora'; if (m < 60) return `hace ${m} min`; if (m < 1440) return `hace ${Math.round(m / 60)} h`;
    const d = Math.round(m / 1440); return d === 1 ? 'ayer' : `hace ${d} días`;
  };
  const horas = min => (Math.round(min / 6) / 10).toLocaleString('es-PE');
  const dinero = (n, moneda) => (moneda === 'PEN' ? 'S/ ' : (moneda || '') + ' ') + Number(n || 0).toFixed(2);
  const estado = (t, mal) => { const e = $('#estado'); e.textContent = t || ''; e.style.color = mal ? 'var(--bad)' : ''; };
  const chapa = (texto, tipo = '') => `<span class="chapa ${tipo}">${esc(texto)}</span>`;

  // ---------- pedir al servidor con el pase de adulto; si falta o venció, se vuelve a confirmar ----------
  async function pedir(ruta, opts = {}, reintento = false) {
    if (!C.adultoToken() && !await C.confirmarAdulto({ titulo: 'Panel: confirma que eres tú' })) throw new Error('Hace falta confirmar con tu contraseña o con Google.');
    try { return await C.api(ruta, { ...opts, adulto: true }); }
    catch (e) {
      if (e.codigo === 'adulto' && !reintento) { C.olvidarAdulto(); return pedir(ruta, opts, true); }
      if (e.status === 401 && !e.codigo) setTimeout(() => location.reload(), 1500);
      throw e;
    }
  }

  // ---------- tabla ordenable ----------
  // cols: [{ t: 'Título', v: fila => valor para ordenar, h: fila => html, num: true }]
  function tabla(caja, cols, filas, { orden = -1, desc = true, vacio = 'No hay nada que mostrar.' } = {}) {
    const pintar = () => {
      const lista = [...filas];
      if (orden >= 0) {
        const v = cols[orden].v;
        lista.sort((a, b) => { const x = v(a), y = v(b); const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), 'es'); return desc ? -r : r; });
      }
      caja.innerHTML = `<table><thead><tr>${cols.map((c, i) => `<th scope="col" class="${c.num ? 'num' : ''}"${i === orden ? ` aria-sort="${desc ? 'descending' : 'ascending'}"` : ''}>${c.v ? `<button data-o="${i}">${esc(c.t)}${i === orden ? (desc ? ' ▼' : ' ▲') : ''}</button>` : `<span style="padding:4px">${esc(c.t)}</span>`}</th>`).join('')}</tr></thead><tbody>${
        lista.length ? lista.map((f, n) => `<tr data-n="${filas.indexOf(f)}">${cols.map(c => `<td class="${c.num ? 'num' : ''}">${c.h ? c.h(f) : esc(c.v(f))}</td>`).join('')}</tr>`).join('') : `<tr class="vacio"><td colspan="${cols.length}">${esc(vacio)}</td></tr>`}</tbody></table>`;
    };
    caja.onclick = e => {
      const b = e.target.closest('button[data-o]'); if (!b) return;
      const i = +b.dataset.o; if (i === orden) desc = !desc; else { orden = i; desc = !!cols[i].num; }
      pintar(); const nuevo = caja.querySelector(`button[data-o="${i}"]`); if (nuevo) nuevo.focus();
    };
    pintar();
  }

  // ---------- gráfico de barras (SVG): horas por día ----------
  function grafico(caja, dias) {
    const W = 720, H = 220, izq = 34, der = 6, arr = 12, aba = 24, altoG = H - arr - aba, anchoG = W - izq - der;
    const maxMin = Math.max(60, ...dias.map(d => d.minutos));
    // escala en horas con marcas redondas
    const pasoH = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500].find(p => maxMin / 60 / p <= 4) || 1000;
    const topeH = Math.ceil(maxMin / 60 / pasoH) * pasoH, y = min => arr + altoG - (min / 60 / topeH) * altoG;
    const paso = anchoG / dias.length, ancho = Math.max(3, Math.min(24, paso - 2));
    const cada = dias.length > 16 ? 5 : dias.length > 8 ? 2 : 1;
    const etiqueta = d => d.dia.slice(8) + '/' + d.dia.slice(5, 7);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Horas de juego por día. Total: ${horas(dias.reduce((n, d) => n + d.minutos, 0))} horas en ${dias.length} días.">`;
    for (let h = 0; h <= topeH + 1e-9; h += pasoH) s += `<line class="linea" x1="${izq}" x2="${W - der}" y1="${y(h * 60)}" y2="${y(h * 60)}"/><text class="eje" x="${izq - 6}" y="${y(h * 60) + 4}" text-anchor="end">${h.toLocaleString('es-PE')} h</text>`;
    dias.forEach((d, i) => {
      const x = izq + i * paso + (paso - ancho) / 2, alto = Math.max(d.minutos ? 2 : 0, arr + altoG - y(d.minutos)), r = Math.min(4, ancho / 2, alto);
      const yy = arr + altoG - alto;
      s += `<g><rect class="zona" tabindex="0" data-i="${i}" x="${izq + i * paso}" y="${arr}" width="${paso}" height="${altoG}" aria-label="${etiqueta(d)}: ${horas(d.minutos)} horas"/>`;
      // barra con las puntas de arriba redondeadas y la base recta sobre el eje
      if (alto > 0) s += `<path class="barra" d="M${x},${arr + altoG}V${yy + r}Q${x},${yy} ${x + r},${yy}H${x + ancho - r}Q${x + ancho},${yy} ${x + ancho},${yy + r}V${arr + altoG}Z"/>`;
      s += '</g>';
      if ((dias.length - 1 - i) % cada === 0) s += `<text class="eje" x="${izq + i * paso + paso / 2}" y="${H - 7}" text-anchor="middle">${etiqueta(d)}</text>`;
    });
    caja.innerHTML = s + '</svg><div class="globo" hidden></div>';
    const globo = caja.querySelector('.globo'), svg = caja.querySelector('svg');
    const ver = z => {
      const d = dias[+z.dataset.i], k = svg.getBoundingClientRect().width / W;
      const dia = new Date(d.dia + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });
      globo.innerHTML = `${esc(dia)}<br><b>${horas(d.minutos)} h</b> (${d.minutos} min) · ${d.cuentas} ${d.cuentas === 1 ? 'familia' : 'familias'}`;
      globo.hidden = false;
      const cx = (izq + (+z.dataset.i + .5) * paso) * k, mitad = globo.offsetWidth / 2;
      globo.style.left = Math.max(mitad, Math.min(caja.clientWidth - mitad, cx)) + 'px';
      globo.style.top = Math.max(globo.offsetHeight + 2, y(d.minutos) * k - 6) + 'px';
    };
    svg.addEventListener('pointermove', e => { const z = e.target.closest('.zona'); if (z) ver(z); });
    svg.addEventListener('focusin', e => { const z = e.target.closest('.zona'); if (z) ver(z); });
    svg.addEventListener('pointerleave', () => { globo.hidden = true; });
    svg.addEventListener('focusout', () => { globo.hidden = true; });
  }

  // ---------- Resumen ----------
  async function resumen() {
    const r = await pedir('/api/admin/resumen');
    const c = (t, n, d = '') => `<div class="cifra"><div class="t">${esc(t)}</div><div class="n">${esc(n)}</div><div class="d">${esc(d)}</div></div>`;
    $('#cifras').innerHTML =
      c('Cuentas', r.cuentas.total, `+${r.cuentas.nuevas7} en 7 días · +${r.cuentas.nuevas30} en 30`) +
      c('Activas hoy', r.activas.hoy, `${r.activas.semana} en la semana`) +
      c('Plan Familia', r.familia.activas, `${r.familia.pagando} pagando · ${r.familia.cortesia} de cortesía`) +
      c('Ingreso del mes', dinero(r.ingresoMes.monto, r.ingresoMes.moneda), 'estimado') +
      c('Horas de juego hoy', horas(r.uso.horasHoy * 60), `${horas(r.uso.horas7 * 60)} h en 7 días`) +
      c('Cuentos con IA', r.cuentosIA.hoy, `hoy · ${r.cuentosIA.mes} este mes`) +
      c('Voces grabadas', r.voces.cantidad, `${r.voces.mb.toLocaleString('es-PE')} MB`) +
      c('Salas en línea', r.salas.salas, `${r.salas.jugadores} jugando ahora`) +
      (r.cuentas.bloqueadas ? c('Bloqueadas', r.cuentas.bloqueadas) : '');
    grafico($('#g-resumen'), r.uso.dias);
  }

  // ---------- Uso ----------
  async function uso() {
    const u = await pedir('/api/admin/uso?dias=' + $('#uso-dias').value);
    grafico($('#g-uso'), u.dias);
    tabla($('#t-uso'), [
      { t: 'Familia', v: f => f.nombre, h: f => `${esc(f.nombre)}<span class="sub">${esc(f.email)}</span>` },
      { t: 'Horas', num: true, v: f => f.minutos, h: f => horas(f.minutos) },
      { t: 'Días con juego', num: true, v: f => f.diasActivos },
      { t: 'Niñas y niños', h: f => f.ninos.map(n => `${esc(n.nombre)} ${horas(n.minutos)} h`).join(' · ') || '—' },
      { t: 'Juego más usado', v: f => (f.juegos[0] || {}).juego || '', h: f => f.juegos[0] ? `${esc(f.juegos[0].juego)} (${horas(f.juegos[0].minutos)} h)` : '—' },
      { t: 'Última actividad', v: f => f.ultimaActividad || '', h: f => esc(hace(f.ultimaActividad)) },
    ], u.cuentas, { orden: 1, vacio: 'Todavía ninguna familia subió minutos de juego en este periodo.' });
    tabla($('#t-ninos'), [
      { t: 'Nombre', v: f => f.nombre }, { t: 'Familia', v: f => f.email },
      { t: 'Horas', num: true, v: f => f.minutos, h: f => horas(f.minutos) },
    ], u.ninos, { orden: 2, vacio: 'Sin datos.' });
    tabla($('#t-juegos'), [
      { t: 'Juego', v: f => f.juego }, { t: 'Horas', num: true, v: f => f.minutos, h: f => horas(f.minutos) },
      { t: 'Parte del total', num: true, v: f => f.minutos, h: f => u.total ? Math.round(f.minutos * 100 / u.total) + ' %' : '—' },
    ], u.juegos, { orden: 1, vacio: 'Sin datos.' });
  }
  async function bajarCSV() {
    const r = await pedir('/api/admin/uso?formato=csv&dias=' + $('#uso-dias').value, { raw: true });
    const a = document.createElement('a'); a.href = URL.createObjectURL(await r.blob());
    a.download = `avelu-uso-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  // ---------- Cuentas ----------
  const planChapa = f => f.plan === 'familia' ? chapa(f.cortesia ? 'Familia (cortesía)' : 'Familia', 'fam') : chapa('Gratis');
  let listaCuentas = [];
  async function cuentas() {
    const r = await pedir(`/api/admin/cuentas?q=${encodeURIComponent($('#c-buscar').value.trim())}&filtro=${$('#c-filtro').value}`);
    listaCuentas = r.cuentas;
    $('#c-total').textContent = r.total === 1 ? '1 cuenta' : `${r.total} cuentas` + (r.total > r.cuentas.length ? ` (se muestran ${r.cuentas.length})` : '');
    tabla($('#t-cuentas'), [
      { t: 'Familia', v: f => f.nombre, h: f => `${esc(f.nombre)}${f.superadmin ? ' ' + chapa('Admin', 'ojo') : ''}<span class="sub">${esc(f.email)}</span>` },
      { t: 'Plan', v: f => f.plan, h: f => planChapa(f) + (f.planHasta ? `<span class="sub">hasta ${esc(soloDia(f.planHasta))}</span>` : '') },
      { t: 'Estado', v: f => f.bloqueada ? 1 : 0, h: f => (f.bloqueada ? chapa('Bloqueada', 'mal') : chapa('Activa', 'bien')) + `<span class="sub">${f.google ? 'Google' : ''}${f.google && f.conClave ? ' + ' : ''}${f.conClave ? 'contraseña' : ''}</span>` },
      { t: 'Horas (30 d)', num: true, v: f => f.minutos30, h: f => horas(f.minutos30) },
      { t: 'Último ingreso', v: f => f.ultimoIngreso || '', h: f => esc(hace(f.ultimoIngreso)) },
      { t: 'Creada', v: f => f.creada, h: f => esc(soloDia(f.creada)) },
      { t: '', h: f => `<button data-ver="${esc(f.id)}" aria-label="Ver la cuenta de ${esc(f.nombre)}">Ver</button>` },
    ], listaCuentas, { vacio: 'No hay cuentas con ese filtro.' });
  }
  async function crearCuenta(e) {
    e.preventDefault();
    const caja = $('#n-resultado'); caja.innerHTML = '';
    try {
      const r = await pedir('/api/admin/cuentas', { body: { email: $('#n-email').value, nombre: $('#n-nombre').value, soloGoogle: $('#n-modo').value === 'google' } });
      caja.innerHTML = r.claveTemporal
        ? `<div class="aviso bien">Cuenta creada para <b>${esc(r.cuenta.email)}</b>. Contraseña temporal (solo se muestra esta vez):<br><span class="clave-temporal">${esc(r.claveTemporal)}</span></div>`
        : `<div class="aviso bien">Cuenta creada para <b>${esc(r.cuenta.email)}</b>. Entra con el botón de Google usando ese Gmail.</div>`;
      $('#n-email').value = ''; $('#n-nombre').value = ''; cuentas().catch(() => {});
    } catch (er) { caja.innerHTML = `<div class="aviso mal">${esc(er.message)}</div>`; }
  }

  // ficha de una cuenta: datos, uso y acciones
  const ficha = $('#ficha'), cuerpo = $('#ficha-cuerpo');
  async function verCuenta(id, aviso = '') {
    let d;
    try { d = await pedir('/api/admin/cuentas/' + id); } catch (e) { estado(e.message, true); return; }
    const c = d.cuenta, en30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    cuerpo.innerHTML = `
      <div class="fila centro"><h2 id="f-titulo" style="margin:0">${esc(c.nombre)}</h2>${planChapa(c)}${c.bloqueada ? chapa('Bloqueada', 'mal') : ''}${c.superadmin ? chapa('Admin', 'ojo') : ''}<button class="cerrar" data-a="cerrar" aria-label="Cerrar">✕</button></div>
      ${aviso}
      <dl class="datos">
        <dt>Correo</dt><dd>${esc(c.email)}</dd>
        <dt>Entra con</dt><dd>${[c.google ? 'Google' : '', c.conClave ? 'contraseña' : ''].filter(Boolean).join(' y ') || 'Google (aún no entró)'}</dd>
        <dt>Creada</dt><dd>${esc(fecha(c.creada))}</dd>
        <dt>Último ingreso</dt><dd>${esc(fecha(c.ultimoIngreso))} · actividad ${esc(hace(c.ultimaActividad))} · ${d.sesiones} ${d.sesiones === 1 ? 'sesión abierta' : 'sesiones abiertas'}</dd>
        <dt>Plan</dt><dd>${c.plan === 'familia' ? 'Familia' : 'Gratis'}${c.planHasta ? ' hasta ' + esc(soloDia(c.planHasta)) : ''}${c.cortesia ? ' (cortesía fija del servidor)' : ''}${c.suscripcionEstado ? ` · suscripción ${esc(c.proveedor)}: ${esc(c.suscripcionEstado)}` : ''}</dd>
        <dt>Perfiles</dt><dd>${c.perfiles.map(p => esc(p.nombre)).join(', ') || '—'}</dd>
        <dt>Juego (30 días)</dt><dd>${horas(c.minutos30)} h${d.uso.ninos.length ? ' · ' + d.uso.ninos.map(n => `${esc(n.nombre)} ${horas(n.minutos)} h`).join(' · ') : ''}</dd>
        <dt>Guardado</dt><dd>${d.voces.cantidad} voces (${d.voces.mb} MB) · ${d.cuentosIA} cuentos con IA</dd>
      </dl>
      <div class="grafico" id="g-ficha"></div>
      <form class="accion" data-f="familia"><h3 style="margin-top:0">Plan Familia a mano</h3><div class="fila">
        <label>Hasta <input type="date" name="hasta" value="${en30}" min="${new Date().toISOString().slice(0, 10)}"></label>
        <label style="flex:1 1 180px">Motivo <input type="text" name="motivo" maxlength="200" required placeholder="Cortesía, promoción, arreglo de pago…"></label>
        <button class="primario" type="submit" name="plan" value="familia">Dar Familia</button>
        ${c.plan === 'familia' && !c.cortesia ? '<button type="submit" name="plan" value="gratis">Quitar Familia</button>' : ''}</div></form>
      <div class="accion fila centro">
        <button data-a="bloquear">${c.bloqueada ? '🔓 Desbloquear' : '⛔ Bloquear'}</button>
        <button data-a="clave">🔑 Contraseña temporal</button>
        ${c.suscripcionEstado ? '<button data-a="revisar">💳 Revisar pago</button>' : ''}
        <span class="nota">${c.bloqueada ? 'Bloqueada: no puede entrar.' : 'Al bloquear se cierran sus sesiones y no puede entrar.'}</span>
      </div>
      <form class="accion" data-f="borrar"><h3 style="margin-top:0">Borrar la cuenta y todos sus datos</h3><div class="fila">
        <label style="flex:1 1 220px">Para confirmar, escribe su correo <input type="email" name="email" autocomplete="off" required placeholder="${esc(c.email)}"></label>
        <button class="peligro" type="submit">Borrar para siempre</button></div></form>
      ${d.auditoria.length ? `<div class="accion"><h3 style="margin-top:0">Historial</h3>${d.auditoria.map(a => `<div class="nota">${esc(fecha(a.cuando))} · ${esc(a.accion.replace(/_/g, ' '))}${a.detalle ? ' · ' + esc(a.detalle) : ''}</div>`).join('')}</div>` : ''}`;
    cuerpo.dataset.id = c.id; cuerpo.dataset.bloqueada = c.bloqueada ? '1' : '';
    if (!ficha.open) ficha.showModal();
    grafico($('#g-ficha'), d.uso.dias.map(x => ({ ...x, cuentas: x.minutos ? 1 : 0 })));
  }
  const avisoH = (t, tipo = 'bien') => `<div class="aviso ${tipo}" role="status">${t}</div>`;
  async function accionFicha(hacer) {
    const id = cuerpo.dataset.id;
    try { const a = await hacer(id); if (a !== false) await verCuenta(id, a || ''); cuentas().catch(() => {}); }
    catch (e) { const v = cuerpo.querySelector('.aviso'); if (v) v.remove(); cuerpo.querySelector('.fila').insertAdjacentHTML('afterend', avisoH(esc(e.message), 'mal')); }
  }
  cuerpo.addEventListener('click', e => {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'cerrar') return ficha.close();
    if (a === 'bloquear') return accionFicha(async id => { const bloquear = !cuerpo.dataset.bloqueada; await pedir(`/api/admin/cuentas/${id}/bloquear`, { body: { bloqueada: bloquear } }); return avisoH(bloquear ? 'Cuenta bloqueada.' : 'Cuenta desbloqueada.'); });
    if (a === 'clave') return accionFicha(async id => { const r = await pedir(`/api/admin/cuentas/${id}/clave`, { body: {} }); return avisoH(`Contraseña temporal (solo se muestra esta vez). Se cerraron sus sesiones.<br><span class="clave-temporal">${esc(r.claveTemporal)}</span>`); });
    if (a === 'revisar') return accionFicha(async id => { const r = await pedir('/api/admin/pagos/revisar/' + id, { body: {} }); return avisoH('Mercado Pago dice: ' + esc(r.cuenta.suscripcionEstado || 'sin estado')); });
  });
  cuerpo.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, datos = Object.fromEntries(new FormData(f));
    if (f.dataset.f === 'familia') {
      const plan = (e.submitter && e.submitter.value) || 'familia';
      accionFicha(async id => { const r = await pedir(`/api/admin/cuentas/${id}/plan`, { body: { plan, hasta: datos.hasta, motivo: datos.motivo } }); return avisoH(plan === 'familia' ? 'Plan Familia activado.' : 'Plan Familia quitado.') + (r.aviso ? avisoH(esc(r.aviso), 'ojo') : ''); });
    } else if (f.dataset.f === 'borrar') {
      accionFicha(async id => { const r = await pedir('/api/admin/cuentas/' + id, { method: 'DELETE', body: { email: datos.email } }); ficha.close(); estado('Cuenta borrada.' + (r.aviso ? ' ' + r.aviso : '')); return false; });
    }
  });

  // ---------- Pagos ----------
  const chapaEstado = e => chapa(e || 'sin estado', /^(authorized|ACTIVE)$/.test(e) ? 'bien' : /cancel|expired|suspend/i.test(e) ? 'mal' : 'ojo');
  function pintarError(u) {
    if (!u) return '<p class="nota">No hay errores de pago anotados.</p>';
    return `<div class="aviso ${Date.now() - new Date(u.cuando) < 86400000 ? 'mal' : 'ojo'}"><b>Último error de pagos</b> · ${esc(fecha(u.cuando))}<br>${esc(u.mensaje)}<br><span class="nota">${esc(u.proveedor)} respondió ${esc(u.status || 'sin conexión')}${u.detalle ? ': ' + esc(u.detalle) : ''}</span></div>`;
  }
  async function pagos() {
    const p = await pedir('/api/admin/pagos');
    if (!$('#pg-diag').innerHTML) $('#pg-diag').innerHTML = (p.proveedor === 'ninguno' ? avisoH('Los pagos no están configurados en el servidor (PAGOS_PROVEEDOR).', 'ojo') : '') + pintarError(p.ultimoError);
    tabla($('#t-subs'), [
      { t: 'Familia', v: f => f.nombre, h: f => `${esc(f.nombre)}<span class="sub">${esc(f.email)}</span>` },
      { t: 'Estado', v: f => f.estado, h: f => chapaEstado(f.estado) },
      { t: 'Proveedor', v: f => f.proveedor },
      { t: 'Monto', num: true, v: f => f.monto, h: f => esc(dinero(f.monto, f.moneda)) + '<span class="sub">al mes</span>' },
      { t: 'Próxima fecha', v: f => f.proxima || '', h: f => f.proxima ? esc(soloDia(f.proxima)) : (f.hasta && f.plan === 'familia' ? `<span class="sub">Familia hasta ${esc(soloDia(f.hasta))}</span>` : '—') },
      { t: '', h: f => `<div class="fila"><button data-revisar="${esc(f.id)}">Revisar con ${f.proveedor === 'paypal' ? 'PayPal' : 'Mercado Pago'}</button>${/cancel/i.test(f.estado) ? '' : `<button class="peligro" data-cancelar="${esc(f.id)}" data-quien="${esc(f.email)}">Cancelar</button>`}</div>` },
    ], p.suscripciones, { vacio: 'Todavía nadie inició una suscripción.' });
    tabla($('#t-eventos'), [
      { t: 'Cuándo', v: f => f.recibido, h: f => esc(fecha(f.recibido)) },
      { t: 'Familia', v: f => f.email || '', h: f => esc(f.email || '—') },
      { t: 'Qué pasó', v: f => f.tipo || '', h: f => esc({ creada: 'Empezó a suscribirse', cancelada: 'Canceló', estado: 'Aviso del proveedor' }[f.tipo] || 'Aviso del proveedor') },
      { t: 'Estado', v: f => f.estado, h: f => chapaEstado(f.estado) },
      { t: 'Proveedor', v: f => f.proveedor },
    ], p.eventos, { orden: 0, vacio: 'Sin movimientos todavía.' });
  }
  async function diagnostico() {
    const caja = $('#pg-diag'); caja.innerHTML = '<p class="nota">Preguntando a Mercado Pago…</p>';
    try {
      const d = (await pedir('/api/admin/pagos/diagnostico')).diagnostico;
      const si = (ok, t) => `<div>${ok ? '✅' : '❌'} ${t}</div>`;
      let h = '';
      if (d.proveedor !== 'mercadopago') h += avisoH(`El proveedor configurado es «${esc(d.proveedor)}».`, 'ojo');
      h += si(d.configurado, d.configurado ? 'Hay un Access Token guardado en el servidor.' : 'Falta el Access Token (MP_ACCESS_TOKEN).');
      if (d.configurado) {
        h += si(d.tokenValido, d.tokenValido ? `El token funciona${d.cuentaCobro ? ' (cuenta que cobra: ' + esc(d.cuentaCobro) + ')' : ''}.` : 'Mercado Pago rechazó el token: ' + esc(d.errorToken || ''));
        h += `<div>${d.tipoToken === 'producción' ? '✅' : '⚠️'} Tipo de token: <b>${esc(d.tipoToken)}</b>${d.tipoToken === 'prueba' ? ' — solo pueden pagar usuarios de prueba' + (d.payerPrueba ? ' (hay un comprador de prueba configurado).' : '; configura MP_PAYER_PRUEBA o usa el token de producción.') : '.'}</div>`;
        if (d.tokenValido) h += si(d.paisOk, d.paisOk ? 'La cuenta es de Mercado Pago Perú (MPE).' : `La cuenta es de «${esc(d.siteId || '?')}», no de Perú (MPE): no podrá cobrar en soles.`);
      }
      h += `<div>ℹ️ Precio: <b>${esc(dinero(d.precio, d.moneda))}</b> al mes · regreso: ${esc(d.backUrl || '—')}</div>`;
      h += `<div>${d.firmaWebhook ? '✅ Los avisos (webhooks) se verifican con firma.' : '⚠️ Los avisos no llevan firma (falta MP_WEBHOOK_SECRET); igual se confirma cada pago con Mercado Pago.'}</div>`;
      caja.innerHTML = `<div style="display:grid;gap:4px;margin-bottom:10px">${h}</div>` + pintarError(d.ultimoError);
    } catch (e) { caja.innerHTML = avisoH(esc(e.message), 'mal'); }
  }

  // ---------- Salud ----------
  async function salud() {
    const s = await pedir('/api/admin/salud');
    const t = seg => seg < 3600 ? Math.round(seg / 60) + ' min' : seg < 172800 ? Math.round(seg / 3600) + ' h' : Math.round(seg / 86400) + ' días';
    const viejo = s.respaldo && Date.now() - new Date(s.respaldo) > 2 * 86400000;
    const filas = [
      ['Versión', `${esc(s.version)} · Node ${esc(s.node)}`],
      ['Encendido hace', t(s.encendidoSeg)],
      ['Memoria', s.memoriaMB + ' MB'],
      ['Cuentos con IA', s.ia.disponible ? chapa('Lista', 'bien') + ` ${esc(s.ia.nombre)} ${esc(s.ia.modelo)}` : chapa('Sin configurar', 'ojo')],
      ['Pagos', (s.pagos.configurado ? chapa('Configurados', 'bien') : chapa('Sin configurar', 'ojo')) + ` ${esc(s.pagos.proveedor)}${s.pagos.firmaWebhook ? ' · avisos con firma' : ''}`],
      ['Entrar con Google', s.google ? chapa('Activo', 'bien') : chapa('Sin configurar', 'ojo')],
      ['Datos guardados', `${s.datos.mb} MB en ${s.datos.archivos} archivos`],
      ['Disco', s.disco ? `${s.disco.libreMB.toLocaleString('es-PE')} MB libres de ${s.disco.totalMB.toLocaleString('es-PE')}` + (s.disco.libreMB < 1024 ? ' ' + chapa('Poco espacio', 'mal') : '') : 'no se pudo leer'],
      ['Último respaldo', s.respaldo ? esc(fecha(s.respaldo)) + (viejo ? ' ' + chapa('Hace más de 2 días', 'ojo') : '') : 'no se puede ver desde el servidor (los respaldos están en /var/backups/avelu de la máquina)'],
      ['Cuentas y sesiones', `${s.cuentas} cuentas · ${s.sesiones} sesiones abiertas`],
      ['Salas en línea', `${s.salas.salas} salas · ${s.salas.jugadores} jugando`],
      ['Administradores', s.superadmins],
    ];
    $('#salud').innerHTML = filas.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('');
  }

  // ---------- Auditoría ----------
  async function auditoria() {
    const a = await pedir('/api/admin/auditoria?limite=300');
    tabla($('#t-auditoria'), [
      { t: 'Cuándo', v: f => f.cuando, h: f => esc(fecha(f.cuando)) },
      { t: 'Quién', v: f => f.quien },
      { t: 'Qué hizo', v: f => f.accion, h: f => esc(f.accion.replace(/_/g, ' ')) },
      { t: 'A quién', v: f => f.objetivo || '', h: f => esc(f.objetivo || '—') },
      { t: 'Detalle', h: f => esc(f.detalle || '') },
    ], a.registros, { orden: 0, vacio: 'Todavía no se hizo ningún cambio desde el panel.' });
  }

  // ---------- pestañas ----------
  const CARGAR = { resumen, uso, cuentas, pagos, salud, auditoria };
  async function abrir(nombre) {
    $$('.pestanas [role=tab]').forEach(b => { const s = b.id === 'p-' + nombre; b.setAttribute('aria-selected', s); b.tabIndex = s ? 0 : -1; });
    $$('[role=tabpanel]').forEach(s => { s.hidden = s.id !== 's-' + nombre; });
    try { history.replaceState(null, '', '#' + nombre); } catch (e) {}
    estado('Cargando…');
    try { await CARGAR[nombre](); estado(''); } catch (e) { estado(e.message, true); }
  }
  $('.pestanas').addEventListener('click', e => { const b = e.target.closest('[role=tab]'); if (b) abrir(b.id.slice(2)); });
  $('.pestanas').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const t = $$('.pestanas [role=tab]'), i = t.indexOf(document.activeElement); if (i < 0) return;
    const n = t[(i + (e.key === 'ArrowRight' ? 1 : t.length - 1)) % t.length]; n.focus(); abrir(n.id.slice(2));
  });
  const intenta = fn => async (...a) => { try { const m = await fn(...a); estado(typeof m === 'string' ? m : ''); } catch (e) { estado(e.message, true); } };
  $('#uso-dias').onchange = intenta(uso);
  $('#uso-csv').onclick = intenta(bajarCSV);
  let espera; $('#c-buscar').oninput = () => { clearTimeout(espera); espera = setTimeout(intenta(cuentas), 300); };
  $('#c-filtro').onchange = intenta(cuentas);
  $('#c-nueva-abrir').onclick = () => { const f = $('#c-nueva'); f.hidden = !f.hidden; if (!f.hidden) $('#n-email').focus(); };
  $('#c-nueva').onsubmit = crearCuenta;
  $('#t-cuentas').addEventListener('click', e => { const b = e.target.closest('[data-ver]'); if (b) verCuenta(b.dataset.ver); });
  $('#pg-probar').onclick = diagnostico;
  $('#t-subs').addEventListener('click', intenta(async e => {
    const r = e.target.closest('[data-revisar]'), c = e.target.closest('[data-cancelar]');
    if (r) { r.disabled = true; const d = await pedir('/api/admin/pagos/revisar/' + r.dataset.revisar, { body: {} }); await pagos(); return 'Estado actualizado: ' + (d.cuenta.suscripcionEstado || 'sin estado'); }
    if (c && confirm(`¿Cancelar la suscripción de ${c.dataset.quien}? Seguirá con el plan Familia hasta el fin del periodo pagado.`)) { c.disabled = true; await pedir('/api/admin/pagos/cancelar/' + c.dataset.cancelar, { body: {} }); await pagos(); }
  }));
  $('#cerrar-panel').onclick = () => { C.olvidarAdulto(); location.href = 'admin.html'; };

  // ---------- puerta de entrada ----------
  function puerta(titulo, texto, { boton, enlace } = {}) {
    $('#panel').hidden = true; $('#puerta').hidden = false;
    $('#puerta-titulo').textContent = titulo; $('#puerta-texto').textContent = texto;
    const b = $('#puerta-boton'); b.hidden = !boton; if (boton) { b.textContent = boton.t; b.onclick = boton.f; }
    $('#puerta-enlace').hidden = !enlace;
  }
  async function entrar() {
    if (!C || !C.servidor()) return puerta('Falta el servidor', 'Este panel necesita el servidor de Avelu y Amara. Configura su dirección en el modo papá (sección Servidor).');
    if (!C.token()) return puerta('Entra con tu cuenta', 'Primero inicia sesión con la cuenta que administra el servicio.', { enlace: true });
    const c = await C.yo(true);
    if (!c) return puerta('Entra con tu cuenta', 'Tu sesión terminó. Vuelve a entrar.', { enlace: true });
    $('#quien').textContent = c.email;
    if (!c.superadmin) return puerta('Solo para quien administra el servicio', 'Tu cuenta no está en la lista de administradores del servidor (SUPERADMIN_EMAILS).', { enlace: true });
    const pasar = async () => {
      if (!C.adultoToken() && !await C.confirmarAdulto({ titulo: 'Panel: confirma que eres tú' }))
        return puerta('Confirma que eres tú', 'Para abrir el panel hay que confirmar con tu contraseña o con tu Gmail. El PIN no alcanza aquí. La confirmación dura 30 minutos.', { boton: { t: 'Confirmar que soy yo', f: pasar } });
      $('#puerta').hidden = true; $('#panel').hidden = false; $('#cerrar-panel').hidden = false;
      const inicio = location.hash.slice(1);
      abrir(CARGAR[inicio] ? inicio : 'resumen');
    };
    pasar();
  }
  entrar();
})();
