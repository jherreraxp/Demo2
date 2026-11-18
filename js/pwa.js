/* Avelu y Amara — app para el celular.
   1) Modo sin conexión: registra sw.js (solo en https; en localhost solo si localStorage 'bl-sw' = '1', para no estorbar las pruebas).
   2) Instalar como app: guarda el aviso del navegador y lo ofrece con window.PWA.instalar() (lo usa app.html y el menú).
   3) Dentro del APK de Android (android/LEEME.md): conecta la voz del teléfono, porque el WebView no trae speechSynthesis.
   window.PWA = { puedeInstalar(), instalar(), esApp(), esApk(), esIOS(), alCambiar(fn), sinConexionLista() } */
(() => {
  if (window.PWA) return;
  const ua = navigator.userAgent || '';
  const esApk = /AveluApp/.test(ua) || !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const esWebView = /; wv\)/.test(ua);
  const esIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let recien = false; // se acaba de instalar desde esta pestaña
  const enVentanaApp = () => { try { return matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true; } catch (e) { return false; } };
  const instalada = () => recien || enVentanaApp();
  const esApp = () => esApk || esWebView || enVentanaApp();

  // ---------- instalar ----------
  let aviso = null, registro = null;
  const oyentes = new Set();
  const avisar = () => { oyentes.forEach(fn => { try { fn(); } catch (e) {} }); try { dispatchEvent(new Event('pwa')); } catch (e) {} };
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); aviso = e; avisar(); });
  addEventListener('appinstalled', () => { aviso = null; recien = true; avisar(); });
  async function instalar() {
    if (!aviso) return false;
    const e = aviso; aviso = null;
    try { e.prompt(); const r = await e.userChoice; recien = !!r && r.outcome === 'accepted'; avisar(); return recien; } catch (er) { avisar(); return false; }
  }

  // ---------- modo sin conexión ----------
  const yo = document.currentScript || document.querySelector('script[src*="js/pwa.js"]');
  const base = yo && yo.src ? yo.src.replace(/js\/pwa\.js.*$/, '') : new URL('./', location.href).href;
  const local = /^(localhost|127\.|\[::1\])/.test(location.hostname);
  let quiereSW = location.protocol === 'https:' && !local;
  try { if (local && localStorage.getItem('bl-sw') === '1') quiereSW = true; if (localStorage.getItem('bl-sw') === '0') quiereSW = false; } catch (e) {}
  if ('serviceWorker' in navigator) {
    const registrar = () => navigator.serviceWorker.register(base + 'sw.js', { scope: base }).then(r => { registro = r; avisar(); }).catch(() => {});
    if (quiereSW) { if (document.readyState === 'complete') registrar(); else addEventListener('load', registrar, { once: true }); }
    else if (local) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {}); // pruebas: nada guardado
  }

  // ---------- voz del teléfono dentro del APK ----------
  // El WebView de Android no habla (no hay speechSynthesis, o existe pero no suena). Aquí se reemplaza por el
  // plugin nativo de Capacitor (@capacitor-community/text-to-speech), con la misma forma que usa js/comun.js.
  function vozNativa() {
    const cap = window.Capacitor;
    if (!cap) return null;
    const p = cap.Plugins && cap.Plugins.TextToSpeech;
    if (p && p.speak) return { speak: o => p.speak(o), stop: () => p.stop() };
    if (cap.nativePromise) return { speak: o => cap.nativePromise('TextToSpeech', 'speak', o), stop: () => cap.nativePromise('TextToSpeech', 'stop', {}) };
    return null;
  }
  function conectarVoz() {
    const nat = vozNativa();
    if (!nat || (window.speechSynthesis && window.speechSynthesis.__avelu === 'nativa')) return !!nat;
    let turno = 0, idioma = '';
    const sint = {
      __avelu: 'nativa', speaking: false, pending: false, paused: false, onvoiceschanged: null,
      getVoices: () => [],
      speak(u) {
        const id = ++turno; sint.speaking = true;
        const fin = error => { if (id !== turno) return; sint.speaking = false; const fn = error ? (u.onerror || u.onend) : u.onend; if (fn) try { fn.call(u, { type: error ? 'error' : 'end', utterance: u }); } catch (e) {} };
        const n = v => Math.max(0.1, Math.min(2, +v || 1));
        const base = { text: String(u.text || ''), rate: n(u.rate), pitch: n(u.pitch), volume: Math.max(0, Math.min(1, u.volume == null ? 1 : +u.volume)), category: 'playback', queueStrategy: 0 };
        // casi ningún teléfono trae es-PE: se prueba español latino y luego el que haya; se recuerda el que funcionó
        const idiomas = idioma ? [idioma] : ['es-US', 'es-MX', 'es-ES', 'es'];
        const probar = i => Promise.resolve().then(() => nat.speak({ ...base, lang: idiomas[i] })).then(() => { idioma = idiomas[i]; }, er => { if (id === turno && i + 1 < idiomas.length) return probar(i + 1); throw er; });
        probar(0).then(() => fin(false), () => fin(true));
      },
      cancel() { turno++; sint.speaking = false; try { Promise.resolve(nat.stop()).catch(() => {}); } catch (e) {} },
      pause() {}, resume() {}, addEventListener() {}, removeEventListener() {}
    };
    const Frase = function (texto) { this.text = texto == null ? '' : String(texto); this.lang = ''; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null; this.onend = null; this.onerror = null; this.onboundary = null; };
    try { Object.defineProperty(window, 'speechSynthesis', { value: sint, configurable: true, writable: true }); } catch (e) { try { window.speechSynthesis = sint; } catch (er) {} }
    try { window.SpeechSynthesisUtterance = Frase; } catch (e) {}
    return window.speechSynthesis === sint;
  }
  let vozLista = false;
  if (esApk) {
    vozLista = conectarVoz();
    if (!vozLista) { let n = 0; const t = setInterval(() => { vozLista = conectarVoz(); if (vozLista || ++n > 20) clearInterval(t); }, 250); } // el puente nativo puede tardar un momento
  }

  window.PWA = {
    puedeInstalar: () => !!aviso,
    instalar, esApp, esApk: () => esApk, esIOS: () => esIOS, instalada,
    alCambiar(fn) { oyentes.add(fn); return () => oyentes.delete(fn); },
    sinConexionLista: () => !!(registro && (registro.active || registro.waiting || registro.installing)),
    vozNativa: () => vozLista
  };
  try { document.documentElement.classList.toggle('es-app', esApp()); document.documentElement.classList.toggle('es-apk', esApk); } catch (e) {}
})();
