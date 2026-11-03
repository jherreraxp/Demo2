// Jugar con amigos en "Construye tu Mundo": salas con código por WebSocket (ver servidor/API.md).
// Lo que una persona construye aparece en la pantalla de las demás, y en el modo jugar se ven caminar.
import * as THREE from 'three';
import { crearPersonaje } from './personajes.js';

const J = window.Juego, P = J.progress;
const $ = s => document.querySelector(s);
const SALUDOS = ['👋', '❤️', '⭐', '😂'];

// juego: { scene, items(), setItems(l), aplicar(), escalar(g), jug, state, heroe(), message(t) }
export function iniciarEnLinea(juego) {
  const C = window.Cuenta;
  const red = { ws: null, codigo: '', yo: null, otros: new Map(), activo: false, intentos: 0, saliendo: false, snap: new Map(), ultimoPos: 0, ultimoEnvio: '' };

  // ---------- interfaz ----------
  const css = document.createElement('style');
  css.textContent = `
.red-pill { cursor: pointer; }
.red-modal { position: fixed; inset: 0; z-index: 40; background: rgba(35,50,74,.45); display: grid; place-items: center; padding: 16px; }
.red-caja { box-sizing: border-box; width: min(94vw, 460px); max-height: 88vh; overflow: auto; background: #fff; border-radius: 26px; padding: 18px; box-shadow: 0 8px 0 rgba(0,0,0,.2); display: flex; flex-direction: column; gap: 10px; text-align: center; }
.red-caja h2 { margin: 0; font-size: 26px; }
.red-caja p { margin: 0; color: #5b6b82; font-size: 17px; line-height: 1.4; }
.red-caja .b { border-radius: 999px; padding: 10px 18px; font-size: 20px; font-weight: 800; background: #eef0f6; box-shadow: 0 4px 0 rgba(35,50,74,.18); }
.red-caja .b.si { background: #9a6ee0; color: #fff; box-shadow: 0 4px 0 #6b4fd8; }
.red-caja .fila { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.red-codigo { font-size: clamp(38px, 11vw, 54px); font-weight: 800; letter-spacing: .06em; color: #9a6ee0; background: #f6f0ff; border-radius: 20px; padding: 6px 10px; user-select: all; }
.red-caja input { font: inherit; font-size: 30px; font-weight: 800; text-align: center; letter-spacing: .08em; text-transform: uppercase; border: 3px solid #e4e0f0; border-radius: 18px; padding: 8px; width: 100%; box-sizing: border-box; }
.red-lista { display: flex; flex-direction: column; gap: 6px; text-align: left; }
.red-lista div { background: #f6f7fb; border-radius: 14px; padding: 6px 12px; font-size: 19px; font-weight: 700; }
.red-saludos { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(env(safe-area-inset-bottom, 0px) + 14px); z-index: 7; display: flex; gap: 8px; }
body:not(.juego) .red-saludos { bottom: calc(env(safe-area-inset-bottom, 0px) + 64px); }
.red-caja a.b { color: inherit; }
.red-saludos button { width: 54px; height: 54px; border-radius: 50%; background: #fff; font-size: 28px; box-shadow: 0 4px 0 rgba(35,50,74,.2); }
.red-saludos button:active { transform: translateY(3px); box-shadow: 0 1px 0 rgba(35,50,74,.2); }
@media (max-width: 760px) { .red-saludos { bottom: auto; top: calc(env(safe-area-inset-top, 0px) + 116px); } .red-saludos button { width: 46px; height: 46px; font-size: 24px; } }`;
  document.head.appendChild(css);
  const lado = document.querySelector('.hud .hud-side:last-child') || document.querySelector('.hud');
  const btn = document.createElement('button');
  btn.className = 'round-btn'; btn.id = 'red-btn'; btn.setAttribute('aria-label', 'Jugar con amigos'); btn.textContent = '🌐';
  lado.insertBefore(btn, lado.firstChild);
  const pill = document.createElement('button');
  pill.className = 'pill red-pill'; pill.id = 'red-pill'; pill.hidden = true;
  lado.insertBefore(pill, btn.nextSibling);
  const saludos = document.createElement('div');
  saludos.className = 'red-saludos'; saludos.hidden = true;
  saludos.innerHTML = SALUDOS.map(e => `<button data-s="${e}" aria-label="Saludar ${e}">${e}</button>`).join('');
  document.body.appendChild(saludos);
  const modal = document.createElement('div');
  modal.className = 'red-modal'; modal.hidden = true;
  modal.innerHTML = '<div class="red-caja" id="red-caja" role="dialog" aria-modal="true" aria-label="Jugar con amigos"></div>';
  document.body.appendChild(modal);
  const caja = modal.firstChild;
  modal.addEventListener('click', e => { if (e.target === modal) modal.hidden = true; });

  const enlace = c => location.origin + location.pathname + '?sala=' + encodeURIComponent(c);
  function pintarPill() {
    pill.hidden = !red.activo; btn.hidden = red.activo; saludos.hidden = !red.activo;
    pill.textContent = `🌐 ${red.codigo} · 👥 ${red.otros.size + 1}`;
  }
  function abrirModal(codigoUnirse = '') {
    J.audio();
    const srv = C && C.servidor();
    if (!srv) {
      caja.innerHTML = `<h2>🌐 Jugar con amigos</h2><p>Para jugar en línea, papá o mamá deben poner la dirección del servidor en el modo admin.</p><div class="fila"><button class="b" data-r="cerrar">Cerrar</button></div>`;
    } else if (!C.conectado()) {
      caja.innerHTML = `<h2>🌐 Jugar con amigos</h2><p>Para jugar en línea se necesita la cuenta de la familia (es gratis). Pídele a papá o mamá que entre.</p><div class="fila"><button class="b" data-r="cerrar">Ahora no</button><a class="b si" href="cuenta.html" style="text-decoration:none">👤 Entrar</a></div>`;
    } else if (red.activo) {
      const lista = [{ nombre: P.players[0].name + ' (tú)', personaje: P.players[0].char }, ...red.otros.values()];
      caja.innerHTML = `<h2>🌐 Estamos en la sala</h2><div class="red-codigo">${J.esc(red.codigo)}</div>
        <p>Comparte este código con quien quieras invitar.</p>
        <div class="fila"><button class="b" data-r="copiar">📋 Copiar</button><a class="b" href="https://wa.me/?text=${encodeURIComponent('¡Ven a jugar conmigo en Construye tu Mundo! Código ' + red.codigo + ': ' + enlace(red.codigo))}" target="_blank" rel="noopener" style="text-decoration:none">💬 WhatsApp</a></div>
        <div class="red-lista">${lista.map(j => `<div>${J.CHARS[j.personaje]?.emoji || '⭐'} ${J.esc(j.nombre || 'Amiga')}</div>`).join('')}</div>
        <div class="fila"><button class="b" data-r="cerrar">Seguir jugando</button><button class="b" data-r="salir">🚪 Salir de la sala</button></div>`;
    } else {
      caja.innerHTML = `<h2>🌐 Jugar con amigos</h2><p>Crea una sala y comparte el código, o escribe el código que te dieron.</p>
        <div class="fila"><button class="b si" data-r="crear">✨ Crear sala</button></div>
        <p>o</p><input id="red-cod" maxlength="12" placeholder="GATO-42" aria-label="Código de la sala" value="${J.esc(codigoUnirse)}" autocomplete="off">
        <div class="fila"><button class="b" data-r="cerrar">Cancelar</button><button class="b si" data-r="unirse">🚪 Entrar</button></div><p id="red-msg" role="status"></p>`;
    }
    modal.hidden = false;
  }
  caja.addEventListener('click', e => {
    const b = e.target.closest('[data-r]'); if (!b) return;
    const r = b.dataset.r;
    if (r === 'cerrar') modal.hidden = true;
    if (r === 'crear') conectar({ t: 'crear' });
    if (r === 'unirse') { const c = ($('#red-cod').value || '').trim().toUpperCase(); if (!c) return; conectar({ t: 'unirse', codigo: c }); }
    if (r === 'copiar') { navigator.clipboard?.writeText(enlace(red.codigo)).then(() => juego.message('¡Copiado! 📋'), () => {}); }
    if (r === 'salir') { salir(); modal.hidden = true; }
  });
  btn.onclick = () => abrirModal();
  pill.onclick = () => abrirModal();
  saludos.addEventListener('click', e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    enviar({ t: 'saludo', emoji: b.dataset.s }); burbuja(null, b.dataset.s); J.sfx('pop', .6, 1.3);
  });
  const msgModal = t => { const m = $('#red-msg'); if (m) m.textContent = t; else juego.message(t, 2.2); };

  // ---------- conexión ----------
  let alAbrir = null;
  function conectar(primero) {
    alAbrir = primero; red.saliendo = false;
    try { red.ws && red.ws.close(); } catch (e) {}
    const url = C.wsUrl(); if (!url) return;
    msgModal('Conectando…');
    let ws;
    try { ws = new WebSocket(url); } catch (e) { msgModal('No se pudo conectar con el servidor.'); return; }
    red.ws = ws;
    ws.onopen = () => {
      red.intentos = 0;
      enviar({ t: 'hola', nombre: P.players[0].name, personaje: P.players[0].char });
      if (alAbrir) enviar(alAbrir);
    };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (er) { return; } recibir(m); };
    ws.onclose = () => {
      if (red.ws !== ws) return;
      if (red.saliendo || !red.activo) { if (!red.activo) msgModal('No se pudo conectar con el servidor. Intenta otra vez.'); return; }
      // se cortó: reintentar y volver a la misma sala
      juego.message('Reconectando… 🌐', 2);
      const espera = Math.min(10000, 1000 * 2 ** red.intentos++);
      setTimeout(() => { if (!red.saliendo && red.activo) conectar({ t: 'unirse', codigo: red.codigo }); }, espera);
    };
  }
  function enviar(m) { if (red.ws && red.ws.readyState === 1) red.ws.send(JSON.stringify(m)); }
  function salir() {
    red.saliendo = true; red.activo = false; red.codigo = '';
    try { red.ws && red.ws.close(); } catch (e) {}
    red.ws = null;
    for (const o of red.otros.values()) quitarAvatar(o);
    red.otros.clear(); pintarPill();
    history.replaceState(null, '', location.pathname + location.hash);
    juego.message('Saliste de la sala');
  }
  addEventListener('pagehide', () => { red.saliendo = true; try { red.ws && red.ws.close(); } catch (e) {} });

  function recibir(m) {
    if (m.t === 'error') { msgModal('😕 ' + (m.error || 'Algo salió mal.')); if (red.activo && /no existe|no hay/i.test(m.error || '')) salir(); return; }
    if (m.t === 'sala') {
      const nuevaSala = red.codigo !== m.codigo, creador = !!(alAbrir && alAbrir.t === 'crear');
      red.codigo = m.codigo; red.yo = m.yo; red.activo = true;
      (m.jugadores || []).forEach(j => { if (j.id !== red.yo) ponerOtro(j); });
      if (m.mundo && Array.isArray(m.mundo)) {
        if (nuevaSala && juego.items().length) respaldo();
        cambiarMundo(m.mundo);
      } else if (creador) {
        enviar({ t: 'mundo', items: juego.items() }); tomarFoto();
      }
      alAbrir = null;
      history.replaceState(null, '', location.pathname + '?sala=' + encodeURIComponent(red.codigo) + location.hash);
      pintarPill(); modal.hidden = true;
      // a quien creó la sala le mostramos el código para compartir
      if (nuevaSala) { J.efecto('festejo'); juego.message('🌐 ¡Sala ' + red.codigo + '!', 2.4); if (creador) abrirModal(); }
      enviarPos(true);
      return;
    }
    const de = m.de;
    if (m.t === 'entra' && m.jugador) { ponerOtro(m.jugador); pintarPill(); J.sfx('pop', .8, 1.2); juego.message('👋 Llegó ' + (m.jugador.nombre || 'una amiga'), 2); return; }
    if (m.t === 'sale') { const o = red.otros.get(m.id); if (o) { quitarAvatar(o); red.otros.delete(m.id); pintarPill(); juego.message('Se fue ' + (o.nombre || 'una amiga'), 1.8); } return; }
    if (de === red.yo) return;
    if (m.t === 'hola') { const o = red.otros.get(de) || ponerOtro({ id: de }); const cambio = o.personaje !== m.personaje; o.nombre = m.nombre; o.personaje = m.personaje; if (cambio) hacerAvatar(o); else ponerEtiqueta(o); pintarPill(); return; }
    if (m.t === 'pos') { const o = red.otros.get(de) || ponerOtro({ id: de }); o.meta.set(+m.x || 0, +m.y || 0, +m.z || 0); o.dir = +m.dir || 0; o.modo = m.modo || 'quieto'; if (!o.visto) { o.pos.copy(o.meta); o.visto = true; } return; }
    if (m.t === 'saludo') { burbuja(red.otros.get(de), m.emoji); J.sfx('pop', .6, 1.5); return; }
    if (m.t === 'mundo' && Array.isArray(m.items)) { cambiarMundo(m.items); return; }
    if (m.t === 'poner' && m.item) { aplicar(l => { const it = limpiarItem(m.item); if (!it) return l; return l.filter(x => !(x.x === it.x && x.y === it.y && x.z === it.z)).concat([it]); }); return; }
    if (m.t === 'borrar') { aplicar(l => l.filter(x => !(x.x === m.x && x.y === m.y && x.z === m.z))); return; }
    if (m.t === 'pintar') { aplicar(l => { const it = l.find(x => x.x === m.x && x.y === m.y && x.z === m.z); if (it && typeof m.c === 'string') { const i = l.indexOf(it); l = l.slice(); l[i] = { ...it, c: m.c }; } return l; }); return; }
  }
  // solo aceptamos piezas con la forma esperada
  function limpiarItem(it) {
    if (!it || typeof it !== 'object' || !['b', 'o', 'p', 's', 'f'].includes(it.t)) return null;
    const n = v => Number.isFinite(+v) ? Math.round(+v) : 0;
    const out = { t: it.t, x: n(it.x), y: n(it.y), z: n(it.z), r: n(it.r) % 4 };
    if (it.t === 'b') { out.k = String(it.k || 'cubo').slice(0, 20); out.c = String(it.c || 'rosa').slice(0, 20); }
    if (it.t === 'o') { out.w = String(it.w || '').slice(0, 30); out.e = String(it.e || '').slice(0, 8); }
    if (it.t === 'p') out.id = String(it.id || 'nieve').slice(0, 40);
    return out;
  }
  function respaldo() {
    // antes de entrar a la sala de otra persona, guardamos el mundo propio
    try { const m = JSON.parse(localStorage.getItem('bl-mundos') || '{}'); m['Antes de jugar en línea'] = juego.items(); localStorage.setItem('bl-mundos', JSON.stringify(m)); } catch (e) {}
  }
  function cambiarMundo(lista) { aplicar(() => lista.map(limpiarItem).filter(Boolean)); }
  function aplicar(fn) { juego.setItems(fn(juego.items().slice())); juego.aplicar(); tomarFoto(); }

  // ---------- lo que construyo yo → a los demás ----------
  const clave = it => it.x + ',' + it.y + ',' + it.z;
  function tomarFoto() { red.snap = new Map(juego.items().map(it => [clave(it), JSON.stringify(it)])); }
  function cambio() {
    if (!red.activo) return;
    const ahora = new Map(juego.items().map(it => [clave(it), it]));
    const msgs = [];
    for (const [k, it] of ahora) {
      const antes = red.snap.get(k), s = JSON.stringify(it);
      if (antes === s) continue;
      if (antes) { const a = JSON.parse(antes); if (a.t === 'b' && it.t === 'b' && a.k === it.k && a.r === it.r && a.c !== it.c) { msgs.push({ t: 'pintar', x: it.x, y: it.y, z: it.z, c: it.c }); continue; } }
      msgs.push({ t: 'poner', item: it });
    }
    for (const k of red.snap.keys()) if (!ahora.has(k)) { const [x, y, z] = k.split(',').map(Number); msgs.push({ t: 'borrar', x, y, z }); }
    if (msgs.length > 120) enviar({ t: 'mundo', items: juego.items() }); // un cambio grande (limpiar, abrir otro mundo)
    else msgs.forEach(enviar);
    tomarFoto();
  }

  // ---------- los demás jugadores ----------
  function ponerOtro(j) {
    let o = red.otros.get(j.id);
    if (!o) {
      o = { id: j.id, nombre: j.nombre || '', personaje: j.personaje || '', pos: new THREE.Vector3(0, 0, 0), meta: new THREE.Vector3(0, 0, 0), dir: 0, modo: 'construir', grupo: new THREE.Group(), avatar: null, etiqueta: null, burbujas: [], visto: false };
      o.grupo.visible = false; juego.scene.add(o.grupo);
      red.otros.set(j.id, o);
    }
    if (j.nombre) o.nombre = j.nombre;
    if (j.personaje && j.personaje !== o.personaje) o.personaje = j.personaje;
    hacerAvatar(o);
    return o;
  }
  async function hacerAvatar(o) {
    const pj = o.personaje || 'nieve', pedido = (o.pedido = pj);
    let ch;
    try { ch = await crearPersonaje(J.CHARS[pj] ? pj : 'nieve'); } catch (e) { return; }
    if (o.pedido !== pedido || !red.otros.has(o.id)) return;
    if (o.avatar) o.grupo.remove(o.avatar.group);
    juego.escalar(ch.group); ch.group.traverse(m => { if (m.isMesh) m.castShadow = true; });
    o.avatar = ch; o.grupo.add(ch.group);
    ponerEtiqueta(o);
  }
  function textoSprite(texto, { alto = .34, fondo = 'rgba(255,255,255,.92)', tinta = '#23324a', emoji = false } = {}) {
    const c = document.createElement('canvas'), g = c.getContext('2d');
    const fs = emoji ? 96 : 48;
    g.font = `800 ${fs}px "Baloo 2", system-ui, sans-serif`;
    const w = Math.ceil(g.measureText(texto).width) + (emoji ? 24 : 40), h = fs + (emoji ? 24 : 26);
    c.width = w; c.height = h;
    g.font = `800 ${fs}px "Baloo 2", system-ui, sans-serif`;
    if (!emoji) { g.fillStyle = fondo; g.beginPath(); g.roundRect(0, 0, w, h, h / 2); g.fill(); }
    g.fillStyle = tinta; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(texto, w / 2, h / 2 + 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
    s.scale.set(alto * w / h, alto, 1); s.renderOrder = 10;
    return s;
  }
  function ponerEtiqueta(o) {
    if (o.etiqueta) { o.grupo.remove(o.etiqueta); o.etiqueta.material.map.dispose(); }
    o.etiqueta = textoSprite(o.nombre || 'Amiga');
    o.etiqueta.position.y = 1.75; o.grupo.add(o.etiqueta);
  }
  function quitarAvatar(o) { juego.scene.remove(o.grupo); }
  function burbuja(o, emoji) {
    if (!SALUDOS.includes(emoji)) return;
    const s = textoSprite(emoji, { alto: .7, emoji: true });
    s.userData.t = 0;
    if (o) { s.position.y = 2.2; o.grupo.add(s); o.burbujas.push(s); }
    else {
      const h = juego.heroe();
      if (h && juego.state.modo === 'jugar') { s.position.copy(juego.jug.pos).add(new THREE.Vector3(0, 2.2, 0)); juego.scene.add(s); mias.push(s); }
      else juego.message(emoji, 1.2);
    }
  }
  const mias = [];

  // ---------- cada cuadro ----------
  function enviarPos(forzar = false) {
    if (!red.activo) return;
    const jugando = juego.state.modo === 'jugar', j = juego.jug;
    const modo = !jugando ? 'construir' : j.fiesta > 0 || !j.suelo ? 'festejar' : j.mov ? 'correr' : 'quieto';
    const m = { t: 'pos', x: +j.pos.x.toFixed(2), y: +j.pos.y.toFixed(2), z: +j.pos.z.toFixed(2), dir: +j.dir.toFixed(2), modo };
    const s = JSON.stringify(m), ahora = performance.now();
    if (!forzar && (ahora - red.ultimoPos < 100 || (s === red.ultimoEnvio && ahora - red.ultimoPos < 1500))) return;
    red.ultimoPos = ahora; red.ultimoEnvio = s; enviar(m);
  }
  function frame(dt) {
    if (red.activo) enviarPos();
    for (const o of red.otros.values()) {
      const ve = o.visto && o.modo !== 'construir';
      o.grupo.visible = ve;
      if (!ve) continue;
      o.pos.lerp(o.meta, Math.min(1, dt * 10));
      o.grupo.position.copy(o.pos);
      if (o.avatar) {
        let d = o.dir - o.avatar.group.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
        o.avatar.group.rotation.y += d * Math.min(1, dt * 10);
        o.avatar.update(dt, ['correr', 'festejar', 'quieto', 'saludar', 'bailar'].includes(o.modo) ? o.modo : 'quieto', .9);
      }
      o.burbujas = o.burbujas.filter(b => { b.userData.t += dt; b.position.y = 2.2 + b.userData.t * .5; b.material.opacity = Math.max(0, 1 - b.userData.t / 2.5); if (b.userData.t > 2.5) { o.grupo.remove(b); return false; } return true; });
    }
    for (let i = mias.length - 1; i >= 0; i--) { const b = mias[i]; b.userData.t += dt; b.position.copy(juego.jug.pos); b.position.y += 2.2 + b.userData.t * .5; b.material.opacity = Math.max(0, 1 - b.userData.t / 2.5); if (b.userData.t > 2.5) { juego.scene.remove(b); mias.splice(i, 1); } }
  }
  // para las puertas: ¿hay alguien cerca?
  function alguienCerca(x, y, z, r = 1.7) {
    for (const o of red.otros.values()) if (o.visto && o.modo !== 'construir' && Math.hypot(o.pos.x - x, o.pos.z - z) < r && Math.abs(o.pos.y - y) < 1.5) return true;
    return false;
  }

  // invitación por enlace: construir.html?sala=GATO-42
  const q = new URLSearchParams(location.search).get('sala');
  if (q) setTimeout(() => {
    const cod = q.trim().toUpperCase().slice(0, 12);
    if (C && C.conectado()) { abrirModal(cod); msgModal('Toca "Entrar" para unirte a la sala ' + cod + '.'); }
    else abrirModal(cod);
  }, 900);

  return { cambio, frame, alguienCerca, modo: () => enviarPos(true), enviarPos, salir, abrirModal, get activo() { return red.activo; }, red, recibir };
}
