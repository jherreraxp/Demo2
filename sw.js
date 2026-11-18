/* Avelu y Amara — modo sin conexión (service worker).
   - Páginas, código y listas (html/js/css/json) y las voces grabadas: primero la red, y si no hay internet, lo guardado.
     Así una versión nueva del juego se ve de inmediato y nunca queda "pegada" una vieja.
   - Dibujos, modelos 3D, letras y sonidos: primero lo guardado (rápido) y se refresca por detrás.
   - Nunca se guarda: /api/ (cuenta, pagos), /ws (jugar en línea), assets/voz/lista.json ni juegos-ia/lista.json
     (cambian cuando la familia graba o publica), ni nada de otros sitios.
   Para forzar que todos los aparatos boten lo guardado, sube el número de VERSION. */
const VERSION = 'avelu-v1';
const BASE = new URL('./', self.location).href;
const INICIO = ['index.html', 'manifest.webmanifest', 'assets/icono-192.png'];
const ESPERA_RED = 7000; // con mala señal no se espera más que esto si ya hay copia guardada

const SIN_CONEXION = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sin conexión · Avelu y Amara</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:linear-gradient(160deg,#ffe3f3,#e3dcff);font-family:system-ui,sans-serif;color:#23324a;text-align:center">
<div style="padding:24px;max-width:420px"><div style="font-size:72px">📡</div>
<h1 style="font-size:28px;margin:8px 0">No hay internet</h1>
<p style="font-size:18px;line-height:1.5">Esta parte del juego todavía no se guardó en este aparato. Conéctate y vuelve a intentar.</p>
<p><button onclick="location.reload()" style="font:inherit;font-size:20px;font-weight:800;padding:12px 24px;border:0;border-radius:16px;background:#9a6ee0;color:#fff">🔄 Reintentar</button></p>
<p><a href="${BASE}index.html" style="color:#6a33c2;font-weight:700">🏠 Ir al inicio</a></p></div></body></html>`;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.all(INICIO.map(u => c.add(new Request(BASE + u, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION && k.startsWith('avelu-')) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  if (e.data === 'borrar-cache') e.waitUntil(caches.delete(VERSION));
});

const guardable = r => r && r.status === 200 && r.type === 'basic';
async function guardar(req, resp) {
  try { const c = await caches.open(VERSION); await c.put(req, resp); } catch (er) { /* sin espacio: se sigue sin guardar */ }
}

async function redPrimero(req, esPagina) {
  const c = await caches.open(VERSION);
  const guardado = await c.match(req, { ignoreSearch: esPagina });
  const red = fetch(req).then(resp => { if (guardable(resp)) guardar(req, resp.clone()); return resp; });
  try {
    if (!guardado) return await red;
    red.catch(() => {});
    return await Promise.race([red, new Promise((_, no) => setTimeout(() => no(new Error('lento')), ESPERA_RED))]);
  } catch (er) {
    if (guardado) return guardado;
    if (esPagina) {
      const inicio = /\/$/.test(new URL(req.url).pathname) && await c.match(BASE + 'index.html');
      return inicio || new Response(SIN_CONEXION, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    return Response.error();
  }
}

async function guardadoPrimero(req, e) {
  const c = await caches.open(VERSION);
  const guardado = await c.match(req);
  const red = fetch(req).then(resp => { if (guardable(resp)) guardar(req, resp.clone()); return resp; });
  if (guardado) { e.waitUntil(red.catch(() => {})); return guardado; }
  return red;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(BASE)) return;
  const ruta = url.pathname;
  if (ruta.includes('/api/') || ruta.endsWith('/ws') || ruta.includes('/ws/')) return;
  if (ruta.endsWith('/assets/voz/lista.json') || ruta.endsWith('/juegos-ia/lista.json')) return;
  if (ruta.endsWith('/sw.js')) return;
  const esPagina = req.mode === 'navigate';
  const cambiante = esPagina || /\.(html?|m?js|css|json|webmanifest)$/i.test(ruta) || ruta.includes('/assets/voz/') || ruta.includes('/juegos-ia/');
  e.respondWith(cambiante ? redPrimero(req, esPagina) : guardadoPrimero(req, e));
});
