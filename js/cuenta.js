// Cuenta de la familia en el servidor propio (ver servidor/API.md).
// Si no hay servidor configurado, el juego funciona igual que siempre, sin cuenta.
(function () {
  'use strict';
  const J = window.Juego;
  const LS = {
    get: k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
    set: (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} },
  };
  // si el juego se abre desde el dominio propio (la VM), el servidor es el mismo sitio
  const mismoSitio = () => /^https:/.test(location.protocol) && !/github\.io$|^localhost$|^127\./.test(location.hostname) ? location.origin : '';
  const servidor = () => (LS.get('bl-servidor').trim() || mismoSitio()).replace(/\/+$/, '');
  const token = () => LS.get('bl-cuenta-token');
  let cache = null;
  try { cache = JSON.parse(LS.get('bl-cuenta') || 'null'); } catch (e) { cache = null; }

  const ERRORES = {
    0: 'No pudimos conectar con el servidor. Revisa el internet o la dirección del servidor.',
    401: 'Tu sesión terminó. Vuelve a entrar.',
    402: 'Esto es parte del plan Familia.',
    403: 'No tienes permiso para esto.',
    404: 'No encontramos eso en el servidor.',
    413: 'El archivo es muy grande.',
    429: 'Muchos intentos seguidos. Espera un ratito.',
    500: 'El servidor tuvo un problema. Intenta otra vez.',
  };
  class ErrorCuenta extends Error { constructor(msg, status) { super(msg); this.status = status; } }

  // api('/api/yo') · api('/api/entrar', { body: {...} }) · api(ruta, { method: 'PUT', body: blob, raw: true })
  async function api(path, opts = {}) {
    const base = servidor();
    if (!base) throw new ErrorCuenta('Primero hay que poner la dirección del servidor.', 0);
    const headers = Object.assign({}, opts.headers || {});
    if (token()) headers.Authorization = 'Bearer ' + token();
    let body = opts.body;
    if (body !== undefined && !(body instanceof Blob) && !(body instanceof ArrayBuffer)) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
    let r;
    try { r = await fetch(base + path, { method: opts.method || (body !== undefined ? 'POST' : 'GET'), headers, body }); }
    catch (e) { throw new ErrorCuenta(ERRORES[0], 0); }
    if (opts.raw && r.ok) return r;
    let data = null;
    try { data = await r.json(); } catch (e) { data = null; }
    if (r.status === 401 && token()) { LS.set('bl-cuenta-token', ''); guardarCache(null); }
    if (!r.ok || !data || data.ok === false) throw new ErrorCuenta((data && data.error) || ERRORES[r.status] || ERRORES[500], r.status);
    return data;
  }
  function guardarCache(c) { cache = c; LS.set('bl-cuenta', c ? JSON.stringify(c) : ''); dispatchEvent(new CustomEvent('cuenta', { detail: c })); }

  async function yo(forzar = false) {
    if (!servidor() || !token()) return null;
    if (cache && !forzar) return cache;
    try { const d = await api('/api/yo'); guardarCache(d.cuenta); return d.cuenta; }
    catch (e) { if (e.status === 401) return null; return cache; } // sin internet: usamos lo último que sabíamos
  }
  const esFamilia = () => !!(cache && cache.plan === 'familia' && (!cache.planHasta || new Date(cache.planHasta) > new Date()));
  const conectado = () => !!(servidor() && token() && cache);

  async function entrar(email, clave) {
    const d = await api('/api/entrar', { body: { email, clave } });
    LS.set('bl-cuenta-token', d.token); guardarCache(d.cuenta);
    return d.cuenta;
  }
  async function registro(email, clave, nombre, acepto) {
    const d = await api('/api/registro', { body: { email, clave, nombre, acepto: !!acepto } });
    LS.set('bl-cuenta-token', d.token); guardarCache(d.cuenta);
    return d.cuenta;
  }
  async function salir() {
    try { if (token()) await api('/api/salir', { body: {} }); } catch (e) {}
    LS.set('bl-cuenta-token', ''); guardarCache(null);
  }
  async function guardarPerfiles(perfiles) { const d = await api('/api/perfiles', { method: 'PUT', body: { perfiles } }); guardarCache(d.cuenta); return d.cuenta; }
  async function borrarCuenta(clave) { await api('/api/cuenta', { method: 'DELETE', body: { clave } }); LS.set('bl-cuenta-token', ''); guardarCache(null); }

  // ---------- progreso en la nube ----------
  // se sube solo (con pausa) cuando cambia; al entrar se puede traer el de la nube
  let ultimoSubido = '', subirT = null;
  function subirProgreso(ahora = false) {
    if (!conectado() || !J) return;
    clearTimeout(subirT);
    subirT = setTimeout(async () => {
      const datos = JSON.stringify(J.progress);
      if (datos === ultimoSubido) return;
      try { await api('/api/progreso', { method: 'PUT', body: { datos: J.progress } }); ultimoSubido = datos; } catch (e) {}
    }, ahora ? 0 : 4000);
  }
  async function bajarProgreso() {
    const d = await api('/api/progreso');
    return d.datos || null;
  }
  function usarProgreso(datos) {
    if (!datos || !J) return;
    Object.keys(J.progress).forEach(k => delete J.progress[k]);
    Object.assign(J.progress, datos); J.save();
    ultimoSubido = JSON.stringify(J.progress);
  }
  if (J && J.save) {
    // cada vez que el juego guarda, subimos (con pausa) a la nube
    const guardar = J.save;
    J.save = function () { const r = guardar.apply(this, arguments); subirProgreso(); return r; };
    addEventListener('pagehide', () => { if (conectado()) { try { const datos = JSON.stringify(J.progress); if (datos !== ultimoSubido) fetch(servidor() + '/api/progreso', { method: 'PUT', keepalive: true, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() }, body: JSON.stringify({ datos: J.progress }) }); } catch (e) {} } });
  }

  // ---------- suscripción ----------
  async function abrirPago() {
    const d = await api('/api/suscripcion/crear', { body: {} });
    if (d.url) location.href = d.url;
    return d;
  }
  async function cancelarPlan() { await api('/api/suscripcion/cancelar', { body: {} }); return yo(true); }

  // ---------- voces en la nube (plan Familia) ----------
  // trae a este aparato las grabaciones de la cuenta que falten (las de este aparato mandan)
  async function bajarVoces(reemplazar = false) {
    if (!esFamilia() || !J || !J.voices) return 0;
    await J.voices.ready;
    const d = await api('/api/voces');
    const lista = d.lista || {}, ya = new Set(await J.voices.keys());
    let n = 0;
    for (const [k, url] of Object.entries(lista)) {
      if (ya.has(k) && !reemplazar) continue;
      const r = await api(String(url).replace(/^https?:\/\/[^/]+/, ''), { raw: true });
      await J.voices.set(k, await r.blob()); await J.voices.refresh(k); n++;
    }
    try { localStorage.setItem('bl-voces-nube-bajadas', String(Date.now())); } catch (e) {}
    return n;
  }
  function bajarVocesDeVezEnCuando() {
    let t = 0; try { t = +localStorage.getItem('bl-voces-nube-bajadas') || 0; } catch (e) {}
    if (Date.now() - t > 6 * 3600e3) bajarVoces().catch(() => {});
  }

  // ---------- WebSocket (jugar en línea) ----------
  function wsUrl() {
    const base = servidor(); if (!base || !token()) return '';
    return base.replace(/^http/, 'ws') + '/ws?token=' + encodeURIComponent(token());
  }

  window.Cuenta = {
    servidor, setServidor: v => { LS.set('bl-servidor', (v || '').trim().replace(/\/+$/, '')); },
    token, api, yo, esFamilia, conectado, actual: () => cache,
    entrar, registro, salir, guardarPerfiles, borrarCuenta,
    subirProgreso, bajarProgreso, usarProgreso, abrirPago, cancelarPlan, wsUrl, ErrorCuenta, bajarVoces,
  };
  // al abrir cualquier página, refrescamos el plan en silencio
  if (servidor() && token()) setTimeout(() => yo(true).then(() => { if (esFamilia()) bajarVocesDeVezEnCuando(); }), 800);
})();
