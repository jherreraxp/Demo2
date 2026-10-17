// Herramientas para mamá y papá: grabadora de voz (recorta silencios y guarda WAV)
// y publicación de archivos en GitHub Pages (rama gh-pages) con una llave personal.
(function () {
  'use strict';
  const J = window.Juego;

  // ---------- grabadora ----------
  let stream = null, analyser = null;
  async function mic() {
    if (stream) return stream;
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    const ctx = J.audio();
    if (ctx) { analyser = ctx.createAnalyser(); analyser.fftSize = 512; ctx.createMediaStreamSource(stream).connect(analyser); }
    return stream;
  }
  function level() {
    if (!analyser) return 0;
    const d = new Uint8Array(analyser.fftSize); analyser.getByteTimeDomainData(d);
    let peak = 0; for (const v of d) peak = Math.max(peak, Math.abs(v - 128) / 128);
    return peak;
  }
  // grabar(): empieza a grabar y devuelve { stop(): Promise<Blob WAV> }
  async function grabar(maxSeg = 20) {
    J.stopVoice();
    await mic();
    const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
    const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const parts = [];
    rec.ondataavailable = e => e.data.size && parts.push(e.data);
    const done = new Promise(ok => { rec.onstop = () => ok(new Blob(parts, { type: rec.mimeType || 'audio/webm' })); });
    rec.start();
    const timer = setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, maxSeg * 1000);
    return {
      get recording() { return rec.state === 'recording'; },
      async stop() { clearTimeout(timer); if (rec.state === 'recording') rec.stop(); const raw = await done; try { return await procesar(raw); } catch (e) { return raw; } },
    };
  }
  // recorta silencios, normaliza el volumen y convierte a WAV (suena en todos los navegadores)
  async function procesar(blob, { recortar = true } = {}) {
    const ctx = J.audio();
    const buf = await new Promise((ok, no) => blob.arrayBuffer().then(ab => ctx.decodeAudioData(ab, ok, no)));
    const data = buf.getChannelData(0), sr = buf.sampleRate;
    let peak = 0; for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
    let a = 0, b = data.length - 1;
    if (recortar) {
      const th = Math.max(0.012, peak * 0.08);
      while (a < b && Math.abs(data[a]) < th) a++;
      while (b > a && Math.abs(data[b]) < th) b--;
      a = Math.max(0, a - Math.floor(sr * .08)); b = Math.min(data.length - 1, b + Math.floor(sr * .15));
    }
    const outRate = 24000, len = Math.max(1, Math.round((b - a) * outRate / sr));
    const off = new OfflineAudioContext(1, len, outRate);
    const src = off.createBufferSource();
    const cut = off.createBuffer(1, Math.max(1, b - a), sr); cut.copyToChannel(data.slice(a, b), 0);
    src.buffer = cut;
    const gain = off.createGain(); gain.gain.value = peak > 0 ? Math.min(6, .9 / peak) : 1;
    src.connect(gain).connect(off.destination); src.start();
    const res = await off.startRendering();
    return wavBlob(res.getChannelData(0), outRate);
  }
  function wavBlob(samples, rate) {
    const buf = new ArrayBuffer(44 + samples.length * 2), v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, 'data'); v.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
    return new Blob([buf], { type: 'audio/wav' });
  }

  // ---------- GitHub ----------
  const host = location.hostname.endsWith('github.io');
  const OWNER = host ? location.hostname.split('.')[0] : 'jherreraxp';
  const REPO = host ? (location.pathname.split('/')[1] || 'Demo2') : 'Demo2';
  const BRANCH = 'gh-pages';
  const token = () => { try { return localStorage.getItem('bl-gh-token') || ''; } catch (e) { return ''; } };
  const setToken = t => { try { localStorage.setItem('bl-gh-token', t.trim()); } catch (e) {} };
  const hash = s => { let h = 5381; for (const c of s) h = (h * 33 + c.codePointAt(0)) >>> 0; return h.toString(36); };
  const fileFor = (k, ext = 'wav') => 'v-' + J.strip(k).replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) + '-' + hash(k) + '.' + ext;
  async function gh(path, opts = {}) {
    const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}${path}`, { ...opts, headers: { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', ...(opts.headers || {}) } });
    if (!r.ok) { const t = await r.text(); throw new Error(r.status + ' ' + t.slice(0, 160)); }
    return r.status === 204 ? null : r.json();
  }
  const b64 = async blob => { const bytes = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
  async function readJSON(path) {
    try { const f = await gh(`/contents/${path}?ref=${BRANCH}`); return JSON.parse(decodeURIComponent(escape(atob(f.content.replace(/\n/g, ''))))); } catch (e) { return null; }
  }
  // publicar: files = [{ path, blob } | { path, text }]; listaPatch se mezcla en assets/voz/lista.json
  async function publicar({ files = [], listaPatch = null, message = 'Actualización desde el juego', onProgress = () => {} }) {
    if (!token()) throw new Error('Falta la llave de GitHub');
    onProgress('Conectando con GitHub…');
    const ref = await gh(`/git/ref/heads/${BRANCH}`);
    const parent = await gh(`/git/commits/${ref.object.sha}`);
    const tree = [];
    let n = 0;
    for (const f of files) {
      const body = f.text !== undefined ? { content: f.text, encoding: 'utf-8' } : { content: await b64(f.blob), encoding: 'base64' };
      const blob = await gh('/git/blobs', { method: 'POST', body: JSON.stringify(body) });
      tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
      onProgress(`Subiendo ${++n} de ${files.length}…`);
    }
    if (listaPatch) {
      const lista = (await readJSON('assets/voz/lista.json')) || {};
      Object.assign(lista, listaPatch);
      Object.keys(lista).forEach(k => { if (lista[k] === null) delete lista[k]; });
      const sorted = Object.fromEntries(Object.entries(lista).sort(([a], [b]) => a.localeCompare(b)));
      const lb = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: JSON.stringify(sorted, null, 1), encoding: 'utf-8' }) });
      tree.push({ path: 'assets/voz/lista.json', mode: '100644', type: 'blob', sha: lb.sha });
    }
    const t = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: parent.tree.sha, tree }) });
    const c = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: t.sha, parents: [ref.object.sha] }) });
    await gh(`/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: c.sha }) });
    return true;
  }

  window.Herr = { grabar, level, procesar, wavBlob, publicar, token, setToken, fileFor, OWNER, REPO };
})();
