// Suma al menú el Estudio Mágico y los jueguitos creados con IA:
// los de este aparato (localStorage 'bl-juegos-ia') y los publicados en la web (juegos-ia/lista.json).
(function () {
  const S = window.SECCIONES || [], L = window.JUEGOS || [];
  if (!S.some(s => s.id === 'ia')) S.push({ id: 'ia', nombre: 'Mágicos', emoji: '✨', q: 'Personajes y jueguitos que inventamos con el Estudio Mágico.' });
  if (!L.some(g => g.id === 'estudio')) L.push({ id: 'estudio', url: 'ia.html', titulo: 'Estudio Mágico', sub: 'Inventa con tu voz', emoji: '🪄', fondo: ['#ff9ad5', '#7b5cff'], tam: 'l', seccion: 'ia', etiquetas: ['nuevo'] });
  const COLORES = [['#ffb3de', '#9a6ee0'], ['#8fe3ff', '#ff7eb6'], ['#ffe27a', '#ff8a3d'], ['#7be0a0', '#5b8cff'], ['#c9a2ff', '#ff5dab']];
  const tarjeta = (j, k) => ({ id: 'ia-' + j.id, url: 'jugar-ia.html?id=' + encodeURIComponent(j.id), titulo: j.titulo || 'Jueguito mágico', sub: 'Creado con magia', emoji: j.emoji || '✨', fondo: COLORES[k % COLORES.length], tam: 'm', seccion: 'ia', etiquetas: ['✨'] });
  function agregar(lista) {
    let n = 0;
    lista.forEach(j => { if (j && j.id && !L.some(g => g.id === 'ia-' + j.id)) { L.push(tarjeta(j, L.length)); n++; } });
    return n;
  }
  let locales = [];
  try { locales = JSON.parse(localStorage.getItem('bl-juegos-ia') || '[]') || []; } catch (e) {}
  agregar(locales);
  // los publicados llegan después: si hay nuevos, se vuelve a dibujar el menú
  fetch('juegos-ia/lista.json', { cache: 'no-cache' })
    .then(r => r.ok ? r.json() : [])
    .then(l => { if (Array.isArray(l) && agregar(l) && window.__menu) window.__menu.render(); })
    .catch(() => {});
})();
