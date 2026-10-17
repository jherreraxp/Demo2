// Fondo de parque difuminado (dibujado en 2D y desenfocado con CSS): cielo, lomas, árboles,
// tobogán, columpios y flores. Es liviano para tablets: se dibuja una vez y al cambiar el tamaño.
export function pintarParque(canvas) {
  const g = canvas.getContext('2d');
  // semilla fija: el parque se ve igual cada vez
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  function nube(x, y, s) {
    g.fillStyle = 'rgba(255,255,255,.95)';
    [[0, 0, 1], [.9, -.25, .8], [1.7, 0, .9], [.8, .2, .9]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); g.fill(); });
  }
  function arbol(x, y, s) {
    g.fillStyle = '#8a5a3c'; g.fillRect(x - s * .12, y - s * 1.1, s * .24, s * 1.1);
    const verdes = ['#3fae5a', '#4cc46a', '#2f9a4c'];
    [[0, -1.5, .75], [-.45, -1.2, .55], [.45, -1.2, .55], [0, -2, .55]].forEach(([dx, dy, r], i) => { g.fillStyle = verdes[i % 3]; g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); g.fill(); });
  }
  function pino(x, y, s) {
    g.fillStyle = '#7a4e33'; g.fillRect(x - s * .08, y - s * .4, s * .16, s * .4);
    g.fillStyle = '#2f8f55';
    for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x - s * (.55 - k * .12), y - s * (.3 + k * .45)); g.lineTo(x + s * (.55 - k * .12), y - s * (.3 + k * .45)); g.lineTo(x, y - s * (1 + k * .45)); g.closePath(); g.fill(); }
  }
  function tobogan(x, y, s) {
    // escalera
    g.strokeStyle = '#3f8ee8'; g.lineWidth = s * .08; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + s * .25, y - s * 1.6); g.moveTo(x + s * .45, y); g.lineTo(x + s * .7, y - s * 1.6); g.stroke();
    g.lineWidth = s * .05;
    for (let k = 1; k < 6; k++) { const t = k / 6; g.beginPath(); g.moveTo(x + s * .25 * t * 1, y - s * 1.6 * t); g.lineTo(x + s * .45 + s * .25 * t, y - s * 1.6 * t); g.stroke(); }
    // plataforma y techito
    g.fillStyle = '#f6c33b'; g.fillRect(x + s * .15, y - s * 1.7, s * .7, s * .12);
    g.fillStyle = '#ef5b5b'; g.beginPath(); g.moveTo(x + s * .05, y - s * 2.2); g.lineTo(x + s * .95, y - s * 2.2); g.lineTo(x + s * .5, y - s * 2.6); g.closePath(); g.fill();
    g.strokeStyle = '#f6c33b'; g.lineWidth = s * .06; g.beginPath(); g.moveTo(x + s * .2, y - s * 1.7); g.lineTo(x + s * .2, y - s * 2.2); g.moveTo(x + s * .8, y - s * 1.7); g.lineTo(x + s * .8, y - s * 2.2); g.stroke();
    // resbaladera curva
    g.strokeStyle = '#ff7eb6'; g.lineWidth = s * .22;
    g.beginPath(); g.moveTo(x + s * .85, y - s * 1.62); g.bezierCurveTo(x + s * 1.5, y - s * 1.4, x + s * 1.5, y - s * .2, x + s * 2.2, y - s * .08); g.stroke();
  }
  function columpios(x, y, s) {
    g.strokeStyle = '#9a6ee0'; g.lineWidth = s * .09; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x, y); g.lineTo(x + s * .35, y - s * 1.7); g.lineTo(x + s * .7, y);
    g.moveTo(x + s * 2.1, y); g.lineTo(x + s * 2.45, y - s * 1.7); g.lineTo(x + s * 2.8, y);
    g.moveTo(x + s * .35, y - s * 1.7); g.lineTo(x + s * 2.45, y - s * 1.7);
    g.stroke();
    g.lineWidth = s * .03; g.strokeStyle = '#5b6b82';
    [[.85, '#f39a3b'], [1.65, '#4cb87a']].forEach(([dx, c], i) => {
      const sw = (i ? -1 : 1) * s * .15;
      g.beginPath(); g.moveTo(x + s * dx, y - s * 1.7); g.lineTo(x + s * dx + sw, y - s * .45); g.moveTo(x + s * (dx + .4), y - s * 1.7); g.lineTo(x + s * (dx + .4) + sw, y - s * .45); g.stroke();
      g.fillStyle = c; g.fillRect(x + s * (dx - .05) + sw, y - s * .5, s * .5, s * .1);
    });
  }
  function draw() {
    const w = canvas.width = Math.round((canvas.clientWidth || innerWidth) / 2), h = canvas.height = Math.round((canvas.clientHeight || innerHeight) / 2);
    seed = 7;
    const sky = g.createLinearGradient(0, 0, 0, h * .6);
    sky.addColorStop(0, '#7cc8ff'); sky.addColorStop(1, '#d9f1ff');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff3a8'; g.beginPath(); g.arc(w * .85, h * .14, h * .07, 0, Math.PI * 2); g.fill();
    nube(w * .12, h * .14, h * .05); nube(w * .5, h * .09, h * .04); nube(w * .7, h * .22, h * .035);
    // lomas lejanas
    g.fillStyle = '#9fdc7c'; g.beginPath(); g.moveTo(0, h * .55);
    for (let x = 0; x <= w; x += w / 8) g.quadraticCurveTo(x + w / 16, h * (.42 + rnd() * .06), x + w / 8, h * .52);
    g.lineTo(w, h); g.lineTo(0, h); g.fill();
    const s = Math.min(w, h) * .11;
    for (let k = 0; k < 9; k++) pino(w * (k / 8) + (rnd() - .5) * s, h * .54, s * (.6 + rnd() * .3));
    // pasto
    const gr = g.createLinearGradient(0, h * .55, 0, h);
    gr.addColorStop(0, '#7fcf5c'); gr.addColorStop(1, '#5cb347');
    g.fillStyle = gr; g.fillRect(0, h * .58, w, h);
    // caminito
    g.fillStyle = '#f2dfb4'; g.beginPath(); g.moveTo(w * .42, h * .58); g.lineTo(w * .58, h * .58); g.lineTo(w * .8, h); g.lineTo(w * .2, h); g.fill();
    // juegos del parque a los lados
    tobogan(w * .04, h * .72, s * 1.1);
    columpios(w * .66, h * .7, s * 1.05);
    arbol(w * .32, h * .64, s * 1.1); arbol(w * .93, h * .66, s * 1.2); arbol(w * .58, h * .6, s * .8);
    // flores
    const fc = ['#ff7eb6', '#ffd23f', '#ffffff', '#b07de8', '#ef5b5b'];
    for (let k = 0; k < 60; k++) { g.fillStyle = fc[k % 5]; g.beginPath(); g.arc(rnd() * w, h * (.62 + rnd() * .38), s * .05, 0, Math.PI * 2); g.fill(); }
  }
  draw();
  addEventListener('resize', draw);
}
