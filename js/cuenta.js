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
  class ErrorCuenta extends Error { constructor(msg, status, codigo) { super(msg); this.status = status; this.codigo = codigo || ''; } }

  // api('/api/yo') · api('/api/entrar', { body: {...} }) · api(ruta, { method: 'PUT', body: blob, raw: true })
  async function api(path, opts = {}) {
    const base = servidor();
    if (!base) throw new ErrorCuenta('Primero hay que poner la dirección del servidor.', 0);
    const headers = Object.assign({}, opts.headers || {});
    if (token()) headers.Authorization = 'Bearer ' + token();
    if (opts.adulto) headers['X-Adulto'] = adultoToken();   // panel: confirmación de adulto reciente
    let body = opts.body;
    if (body !== undefined && !(body instanceof Blob) && !(body instanceof ArrayBuffer)) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
    let r;
    try { r = await fetch(base + path, { method: opts.method || (body !== undefined ? 'POST' : 'GET'), headers, body }); }
    catch (e) { throw new ErrorCuenta(ERRORES[0], 0); }
    if (opts.raw && r.ok) return r;
    let data = null;
    try { data = await r.json(); } catch (e) { data = null; }
    // 401 con código = falló la confirmación de adulto (la sesión sigue viva); 401 sin código = la sesión terminó
    if (r.status === 401 && token() && !(data && data.codigo)) { LS.set('bl-cuenta-token', ''); guardarCache(null); }
    if (r.ok && data && data.necesitaAcepto) return data;
    if (!r.ok || !data || data.ok === false) throw new ErrorCuenta((data && data.error) || ERRORES[r.status] || ERRORES[500], r.status, data && data.codigo);
    return data;
  }
  function guardarCache(c) { cache = c; LS.set('bl-cuenta', c ? JSON.stringify(c) : ''); dispatchEvent(new CustomEvent('cuenta', { detail: c })); if (c) vocesDeLaCuenta(c).catch(() => {}); }

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
  // "Entrar con Google": el navegador recibe un token de Google y el servidor lo verifica
  let configCache = null;
  async function configServidor() {
    if (configCache) return configCache;
    if (!servidor()) return {};
    try { configCache = await api('/api/config'); } catch (e) { configCache = {}; }
    return configCache;
  }
  async function entrarGoogle(credential, acepto = false) {
    const d = await api('/api/google', { body: { credential, acepto: !!acepto } });
    if (d.necesitaAcepto) return { necesitaAcepto: true, nombre: d.nombre, email: d.email };
    LS.set('bl-cuenta-token', d.token); guardarCache(d.cuenta);
    return { cuenta: d.cuenta };
  }
  async function salir() {
    try { if (token()) await api('/api/salir', { body: {} }); } catch (e) {}
    LS.set('bl-cuenta-token', ''); guardarCache(null);
    // las grabaciones son de esa cuenta: se quitan de este aparato (siguen guardadas en el servidor)
    await borrarVocesLocales().catch(() => {}); LS.set('bl-voces-de', '');
  }
  async function guardarPerfiles(perfiles) { const d = await api('/api/perfiles', { method: 'PUT', body: { perfiles } }); guardarCache(d.cuenta); return d.cuenta; }
  async function borrarCuenta(clave) { await api('/api/cuenta', { method: 'DELETE', body: cache && cache.conClave === false ? { confirmo: clave } : { clave } }); LS.set('bl-cuenta-token', ''); guardarCache(null); await borrarVocesLocales().catch(() => {}); LS.set('bl-voces-de', ''); }

  // ---------- confirmación de adulto (modo papá con la cuenta, y panel de administración) ----------
  // El servidor da un pase de 30 minutos al confirmar con la contraseña o con Google. Se guarda solo
  // en esta pestaña (sessionStorage 'bl-adulto') y abre la misma ventana de 30 min que el PIN ('bl-admin').
  function adultoToken() {
    try { const d = JSON.parse(sessionStorage.getItem('bl-adulto') || 'null'); return d && d.t && d.h > Date.now() + 5000 && (!cache || d.c === cache.id) ? d.t : ''; } catch (e) { return ''; }
  }
  async function adulto(datos) {
    const d = await api('/api/adulto', { body: datos });
    const h = new Date(d.hasta).getTime() || Date.now() + 30 * 60000;
    try { sessionStorage.setItem('bl-adulto', JSON.stringify({ t: d.adultoToken, h, c: cache && cache.id })); sessionStorage.setItem('bl-admin', String(Math.min(h, Date.now() + 30 * 60000))); } catch (e) {}
    return d.adultoToken;
  }
  const olvidarAdulto = () => { try { sessionStorage.removeItem('bl-adulto'); } catch (e) {} };
  // ventanita "Confirma que eres tú": contraseña y/o botón de Google. Devuelve el pase, o '' si se cancela.
  function confirmarAdulto(opts = {}) {
    return new Promise(async fin => {
      if (!servidor() || !token()) return fin('');
      const c = cache || await yo();
      if (!c) return fin('');
      const esc = t => String(t || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
      const antes = document.activeElement;
      const w = document.createElement('div'); w.className = 'adulto-capa'; w.style.zIndex = opts.z || 2147483000;
      w.innerHTML = `<style>
        .adulto-capa{position:fixed;inset:0;display:grid;place-items:center;padding:16px;background:rgba(35,50,74,.6);overflow-y:auto;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
        .adulto-caja{box-sizing:border-box;width:min(380px,100%);background:#fff;color:#23324a;border-radius:22px;padding:22px 20px 16px;box-shadow:0 18px 50px rgba(20,30,50,.35);text-align:center}
        .adulto-caja h2{font-size:22px;margin:0 0 4px;line-height:1.2;font-weight:800}
        .adulto-caja .quien{margin:0 0 14px;color:#5b6b82;font-size:15px;overflow-wrap:anywhere}
        .adulto-caja form{display:flex;flex-direction:column;gap:10px;margin:0}
        .adulto-caja input{font:inherit;font-size:17px;padding:12px 14px;border:2px solid #dfe5ef;border-radius:14px;width:100%;box-sizing:border-box;color:#23324a;background:#fff}
        .adulto-caja input:focus-visible,.adulto-caja button:focus-visible{outline:3px solid #9b7bea;outline-offset:2px}
        .adulto-caja .entrar{font:inherit;font-size:17px;font-weight:800;border:0;border-radius:14px;padding:12px;background:#6b47a8;color:#fff;cursor:pointer;min-height:48px}
        .adulto-caja .entrar:disabled{opacity:.6;cursor:default}
        .adulto-caja .o{margin:12px 0 10px;color:#5b6b82;font-size:14px}
        .adulto-caja .google{display:flex;justify-content:center}
        .adulto-caja .msg{min-height:1.4em;margin:10px 0 4px;color:#c0392b;font-weight:600;font-size:15px}
        .adulto-caja .cerrar{font:inherit;background:none;border:0;color:#5b6b82;text-decoration:underline;cursor:pointer;padding:10px;min-height:44px}
      </style><div class="adulto-caja" role="dialog" aria-modal="true" aria-labelledby="adulto-t">
        <h2 id="adulto-t">${esc(opts.titulo || 'Confirma que eres tú')}</h2>
        <p class="quien">${esc(c.email)}</p>
        ${c.conClave !== false ? '<form><input type="password" autocomplete="current-password" placeholder="Tu contraseña" aria-label="Tu contraseña" maxlength="128"><button class="entrar" type="submit">Entrar</button></form>' : ''}
        <p class="o" hidden>${c.conClave !== false ? 'o confirma con tu Gmail' : 'Confirma con tu Gmail'}</p><div class="google"></div>
        <p class="msg" role="alert"></p>
        <button class="cerrar" type="button">Cancelar</button></div>`;
      document.body.appendChild(w);
      const msg = w.querySelector('.msg'), form = w.querySelector('form'), campo = w.querySelector('input');
      let cfgG = null;
      const cerrar = t => {
        removeEventListener('keydown', tecla, true); w.remove();
        // en cuenta.html el botón de Google es de la propia página: se le devuelve su función
        try { if (cfgG && window.__conGoogle) google.accounts.id.initialize({ client_id: cfgG, callback: r => window.__conGoogle(r.credential, false), ux_mode: 'popup', locale: 'es' }); } catch (e) {}
        try { antes && antes.focus && antes.focus(); } catch (e) {}
        fin(t || '');
      };
      const tecla = e => { if (e.key === 'Escape') { e.stopPropagation(); cerrar(''); } };
      addEventListener('keydown', tecla, true);
      const intentar = async datos => {
        msg.textContent = ''; const b = w.querySelector('.entrar'); if (b) b.disabled = true;
        try { cerrar(await adulto(datos)); }
        catch (e) { if (b) b.disabled = false; msg.textContent = e.message; if (e.status === 401 && !e.codigo) setTimeout(() => cerrar(''), 1800); else if (campo) { campo.value = ''; campo.focus(); } }
      };
      w.querySelector('.cerrar').onclick = () => cerrar('');
      if (form) { form.onsubmit = e => { e.preventDefault(); if (campo.value) intentar({ clave: campo.value }); else campo.focus(); }; setTimeout(() => campo.focus(), 50); }
      // botón de Google (solo si el servidor lo tiene configurado)
      try {
        const cfg = await configServidor();
        if (cfg && cfg.googleClientId && w.isConnected) {
          await new Promise((ok, no) => { if (window.google && google.accounts) return ok(); const sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client?hl=es'; sc.async = true; sc.onload = ok; sc.onerror = no; document.head.appendChild(sc); });
          if (window.google && google.accounts && google.accounts.id && w.isConnected) {
            cfgG = cfg.googleClientId;
            google.accounts.id.initialize({ client_id: cfgG, callback: r => intentar({ credential: r.credential }), ux_mode: 'popup', locale: 'es', login_hint: c.email });
            google.accounts.id.renderButton(w.querySelector('.google'), { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', locale: 'es', width: Math.min(320, w.querySelector('.adulto-caja').clientWidth - 40) });
            w.querySelector('.o').hidden = false;
          }
        } else if (c.conClave === false && w.isConnected) msg.textContent = 'El servidor no tiene configurado el ingreso con Google.';
      } catch (e) { if (c.conClave === false && w.isConnected) msg.textContent = 'No se pudo cargar el botón de Google. Revisa el internet.'; }
    });
  }

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

  // ---------- voces de cada cuenta (plan Familia) ----------
  // Cada grabación del Estudio de voz se guarda sola en la cuenta (en el servidor, privada).
  // En este aparato solo quedan las voces de la cuenta conectada; al cambiar de cuenta se cambian.
  let bajando = false;
  const subidas = () => { try { return JSON.parse(localStorage.getItem('bl-voces-nube') || '{}'); } catch (e) { return {}; } };
  const marcar = (k, v) => { const h = subidas(); if (v == null) delete h[k]; else h[k] = v; try { localStorage.setItem('bl-voces-nube', JSON.stringify(h)); } catch (e) {} };
  async function subirVoz(k, blob) {
    if (!conectado() || !esFamilia() || !blob || blob.size > 1e6) return false;
    await api('/api/voces/' + encodeURIComponent(k), { method: 'PUT', body: blob, headers: { 'Content-Type': blob.type || 'audio/wav' } });
    marcar(k, blob.size); return true;
  }
  async function subirPendientes() {
    if (!conectado() || !esFamilia() || !J || !J.voices) return 0;
    const h = subidas(); let n = 0;
    for (const k of await J.voices.keys()) { const b = await J.voices.get(k); if (b && h[k] !== b.size) { try { if (await subirVoz(k, b)) n++; } catch (e) {} } }
    return n;
  }
  async function borrarVocesLocales() {
    if (!J || !J.voices) return;
    for (const k of await J.voices.keys()) { await J.voices.del(k); await J.voices.refresh(k); }
    try { localStorage.removeItem('bl-voces-nube'); } catch (e) {}
  }
  if (J && J.voices) {
    // al grabar o borrar en el estudio, la cuenta se entera sola.
    // En modo demostración la grabación se escucha, pero solo vive en la memoria (no se guarda ni se sube).
    const get = J.voices.get, set = J.voices.set, del = J.voices.del, keys = J.voices.keys;
    const memoria = new Map();
    J.voices.get = k => memoria.has(k) ? Promise.resolve(memoria.get(k)) : get(k);
    J.voices.keys = async () => [...new Set([...(await keys()), ...memoria.keys()])];
    J.voices.set = async (k, blob) => {
      if (!bajando && esDemo()) { memoria.set(k, blob); return; }
      const r = await set(k, blob); if (!bajando) subirVoz(k, blob).catch(() => {}); return r;
    };
    J.voices.del = async k => {
      memoria.delete(k);
      const r = await del(k); if (!bajando && conectado() && esFamilia()) { api('/api/voces/' + encodeURIComponent(k), { method: 'DELETE' }).catch(() => {}); marcar(k, null); } return r;
    };
    J.voices.demo = () => esDemo();
  }
  async function vocesDeLaCuenta(c) {
    if (!J || !J.voices) return;
    const antes = LS.get('bl-voces-de');
    if (antes && antes !== c.id) await borrarVocesLocales();   // eran de otra cuenta
    if (antes !== c.id) { LS.set('bl-voces-de', c.id); try { localStorage.removeItem('bl-voces-nube-bajadas'); } catch (e) {} }
    if (!esFamilia()) return;
    if (!antes) await subirPendientes();                         // lo grabado antes de entrar pasa a la cuenta
    bajarVocesDeVezEnCuando();
  }
  // trae a este aparato las grabaciones de la cuenta que falten
  async function bajarVoces(reemplazar = false) {
    if (!esFamilia() || !J || !J.voices) return 0;
    await J.voices.ready;
    const d = await api('/api/voces');
    const lista = d.lista || {}, ya = new Set(await J.voices.keys());
    let n = 0;
    bajando = true;
    try {
      for (const [k, url] of Object.entries(lista)) {
        if (ya.has(k) && !reemplazar) continue;
        const r = await api(String(url).replace(/^https?:\/\/[^/]+/, ''), { raw: true });
        const b = await r.blob();
        await J.voices.set(k, b); await J.voices.refresh(k); marcar(k, b.size); n++;
      }
    } finally { bajando = false; }
    try { localStorage.setItem('bl-voces-nube-bajadas', String(Date.now())); } catch (e) {}
    return n;
  }
  function bajarVocesDeVezEnCuando() {
    let t = 0; try { t = +localStorage.getItem('bl-voces-nube-bajadas') || 0; } catch (e) {}
    if (Date.now() - t > 30 * 60e3) bajarVoces().catch(() => {});
  }

  // ---------- WebSocket (jugar en línea) ----------
  function wsUrl() {
    const base = servidor(); if (!base || !token()) return '';
    return base.replace(/^http/, 'ws') + '/ws?token=' + encodeURIComponent(token());
  }

  // ---------- personalización: completa con el plan Familia; si no, demostrativa ----------
  // 'completa': plan Familia, o el juego sin servidor (copia de respaldo en github.io, como siempre)
  // 'demo': hay servidor pero la cuenta es gratis o nadie entró: se puede probar, pero no se guarda
  function personalizacion() {
    if (!servidor()) return 'completa';
    return token() && esFamilia() ? 'completa' : 'demo';
  }
  const esDemo = () => personalizacion() === 'demo';
  function avisoDemo(texto = 'Modo demostración: suscríbete al plan Familia para guardar tus cambios.') {
    if (!document.body) return;
    let el = document.getElementById('aviso-demo');
    if (!el) {
      const st = document.createElement('style');
      st.textContent = '#aviso-demo{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 16px);transform:translate(-50%,140%);z-index:90;max-width:min(560px,calc(100vw - 24px));background:#23324a;color:#fff;border-radius:18px;padding:10px 12px 10px 16px;display:flex;gap:10px;align-items:center;box-shadow:0 8px 24px rgba(0,0,0,.25);font:600 15px/1.3 system-ui,sans-serif;transition:transform .3s}#aviso-demo.ver{transform:translate(-50%,0)}#aviso-demo a{flex:none;background:#ffd23f;color:#23324a;border-radius:999px;padding:8px 14px;text-decoration:none;font-weight:800}#aviso-demo button{flex:none;background:none;border:0;color:#fff;font-size:20px;cursor:pointer}';
      document.head.appendChild(st);
      el = document.createElement('div'); el.id = 'aviso-demo'; el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.innerHTML = `<span>⭐ ${texto.replace(/[<>&]/g, '')}</span><a href="cuenta.html">Ver plan</a><button aria-label="Cerrar">✕</button>`;
    el.querySelector('button').onclick = () => el.classList.remove('ver');
    requestAnimationFrame(() => el.classList.add('ver'));
    clearTimeout(avisoDemo.t); avisoDemo.t = setTimeout(() => el.classList.remove('ver'), 7000);
  }

  window.Cuenta = {
    personalizacion, esDemo, avisoDemo, configServidor, entrarGoogle,
    servidor, setServidor: v => { LS.set('bl-servidor', (v || '').trim().replace(/\/+$/, '')); },
    token, api, yo, esFamilia, conectado, actual: () => cache,
    adulto, adultoToken, olvidarAdulto, confirmarAdulto,
    entrar, registro, salir, guardarPerfiles, borrarCuenta,
    subirProgreso, bajarProgreso, usarProgreso, abrirPago, cancelarPlan, wsUrl, ErrorCuenta, bajarVoces, subirPendientes,
  };
  // al abrir cualquier página, refrescamos el plan en silencio
  if (servidor() && token()) setTimeout(() => yo(true), 800);
})();
