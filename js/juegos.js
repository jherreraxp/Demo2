// Lista de todos los jueguitos del menú. Para agregar uno nuevo basta con crear su página
// (por ejemplo "mijuego.html") y añadir aquí una línea con sus datos.
//   id:      nombre corto (también se usa para guardar su nivel: progress.level[id])
//   url:     página del juego
//   titulo:  nombre que se ve en la tarjeta
//   sub:     frase cortita debajo del nombre
//   emoji:   dibujo grande de la tarjeta (o personaje: 'pj:<id>' para dibujar un personaje 3D)
//   fondo:   dos colores para el degradado de la tarjeta
//   tam:     'xl' (grande 2×2), 'l' (ancho 2×1) o 'm' (cuadrado 1×1)
//   seccion: palabras | vocales | letras | silabas | frases | tocar | crear
//   etiquetas: ['3D', 'nuevo', …]
(function () {
  window.SECCIONES = [
    { id: 'todos', nombre: 'Todos', emoji: '⭐' },
    { id: 'palabras', nombre: 'Palabras', emoji: '🐱', q: 'Conocer palabras jugando: escuchar, ver y buscar.' },
    { id: 'vocales', nombre: 'Vocales', emoji: '🅰️', q: 'a e i o u — grandes o chiquitas, nunca juntas.' },
    { id: 'letras', nombre: 'Letras', emoji: '🔤', q: 'El sonido de cada letra y cómo se junta con la vocal: mmm + a = ma.' },
    { id: 'silabas', nombre: 'Sílabas', emoji: '🧩', q: 'Escuchar con qué empieza cada palabra y leer palabras de dos sílabas.' },
    { id: 'frases', nombre: 'Frases', emoji: '📖', q: 'Leer frases cortas y cuentos.' },
    { id: 'tocar', nombre: 'Para tocar', emoji: '👆', q: 'Jueguitos para tocar, escuchar y reír.' },
    { id: 'pensar', nombre: 'Pensar', emoji: '🐸', q: 'Armar caminos y pensar paso a paso.' },
    { id: 'crear', nombre: 'Crear', emoji: '🎨', q: 'Para crear, bailar y descansar.' },
  ];

  window.JUEGOS = [
    { id: 'carrera', url: 'carrera.html', titulo: 'Carrera de Palabras', sub: 'Atrapa las monedas', emoji: 'pj:jugador', fondo: ['#ff7eb6', '#9a6ee0'], tam: 'xl', seccion: 'palabras', etiquetas: ['3D'] },
    { id: 'sapito', url: 'sapito.html', titulo: 'El Camino del Sapito', sub: 'Arma el camino con flechas', emoji: '🐸', fondo: ['#7be0a0', '#2fb3c9'], tam: 'l', seccion: 'pensar', etiquetas: ['nuevo'] },
    { id: 'construir', url: 'construir.html', titulo: 'Construye tu Mundo', sub: 'Casas, laberintos y más', emoji: '🧱', fondo: ['#ffb3de', '#7fd3ff'], tam: 'l', seccion: 'crear', etiquetas: ['3D', 'nuevo'] },
    { id: 'bosque', url: 'bosque.html', titulo: 'Bosque de las Palabras', sub: 'Busca la cajita y lee', emoji: '🎁', fondo: ['#8fd46a', '#2e9e6b'], tam: 'm', seccion: 'palabras', etiquetas: ['3D'] },
    { id: 'memoria', url: 'memoria.html', titulo: 'Memoria', sub: 'Encuentra las parejas', emoji: '🃏', fondo: ['#ffb36b', '#ff6f91'], tam: 'm', seccion: 'vocales' },
    { id: 'ballet', url: 'ballet.html', titulo: 'Escenario de Ballet', sub: 'Baila y gana posiciones', emoji: '🩰', fondo: ['#c9a2ff', '#6b4fd8'], tam: 'l', seccion: 'crear', etiquetas: ['3D'] },
    { id: 'burbujas', url: 'burbujas.html', titulo: 'Burbujas', sub: 'Revienta y escucha', emoji: '🫧', fondo: ['#8fe3ff', '#5b8cff'], tam: 'm', seccion: 'tocar', etiquetas: ['nuevo'] },
    { id: 'globos', url: 'globos.html', titulo: 'Revienta Globos', sub: 'Toca la que oyes', emoji: '🎈', fondo: ['#ff9ad5', '#ff5d8f'], tam: 'm', seccion: 'vocales', etiquetas: ['3D'] },
    { id: 'gusanos', url: 'gusanos.html', titulo: 'Aplasta Gusanos', sub: '¡Pum! al que oyes', emoji: '🐛', fondo: ['#b8f06a', '#4cb87a'], tam: 'm', seccion: 'vocales', etiquetas: ['3D'] },
    { id: 'piano', url: 'piano.html', titulo: 'Piano Mágico', sub: 'Toca y canta', emoji: '🎹', fondo: ['#ffd23f', '#ff8a3d'], tam: 'm', seccion: 'tocar', etiquetas: ['nuevo'] },
    { id: 'cuidar', url: 'cuidar.html', titulo: 'Cuida a tu personaje', sub: 'Báñalo, decóralo y juega', emoji: 'pj:jugador', fondo: ['#7fd3ff', '#9a6ee0'], tam: 'l', seccion: 'crear', etiquetas: ['3D'] },
    { id: 'letras', url: 'lectura.html?modo=letras', titulo: 'Vocales y sonidos', sub: 'Escucha y toca', emoji: 'a e', fondo: ['#ff8a8a', '#ef5b5b'], tam: 'm', seccion: 'vocales' },
    { id: 'tren', url: 'tren.html', titulo: 'Tren de sílabas', sub: 'Arma la palabra', emoji: '🚂', fondo: ['#ff9f6b', '#e8473c'], tam: 'm', seccion: 'silabas' },
    { id: 'fuegos', url: 'fuegos.html', titulo: 'Fuegos Artificiales', sub: 'Toca el cielo', emoji: '🎆', fondo: ['#3b2a7a', '#ff5dab'], tam: 'm', seccion: 'tocar', etiquetas: ['nuevo'] },
    { id: 'junta', url: 'lectura.html?modo=junta', titulo: 'Junta los sonidos', sub: 'mmm + a = ma', emoji: 'm+a', fondo: ['#7fb2ff', '#3f8ee8'], tam: 'm', seccion: 'letras' },
    { id: 'silabas', url: 'lectura.html?modo=silabas', titulo: 'Sílabas', sub: '¿Cuál dice…?', emoji: 'ma pa', fondo: ['#c9a2ff', '#9a6ee0'], tam: 'm', seccion: 'letras' },
    { id: 'princesa', url: 'princesa.html', titulo: 'Pinta tu personaje', sub: 'Gorra, polera, zapatillas…', emoji: '🎨', fondo: ['#ffb3de', '#ff7eb6'], tam: 'm', seccion: 'crear', etiquetas: ['3D'] },
    { id: 'empieza', url: 'lectura.html?modo=empieza', titulo: '¿Con qué empieza?', sub: 'Mira el dibujo', emoji: '🐺 lo', fondo: ['#8fe0b0', '#4cb87a'], tam: 'm', seccion: 'silabas' },
    { id: 'palabras', url: 'lectura.html?modo=palabras', titulo: 'Palabras', sub: '¡Ya leo!', emoji: 'gato', fondo: ['#d7b6ff', '#8a5cf0'], tam: 'm', seccion: 'silabas' },
    { id: 'pintar', url: 'pintar.html', titulo: 'Lienzo arcoíris', sub: 'Pinta y colorea', emoji: '🌈', fondo: ['#ffe27a', '#ff7eb6'], tam: 'm', seccion: 'crear' },
    { id: 'cuento', url: 'cuento.html', titulo: 'Cuento', sub: 'Lola y la luna', emoji: '📖', fondo: ['#9fd0ff', '#5b6bff'], tam: 'm', seccion: 'frases' },
    { id: 'frases', url: 'carrera.html', titulo: 'Carrera de frases', sub: 'Niveles 5 y 6', emoji: '💬', fondo: ['#ffc6e0', '#c86bfa'], tam: 'm', seccion: 'frases', etiquetas: ['3D'] },
    { id: 'personajes', url: 'personajes.html', titulo: 'Personajes', sub: 'Elige el tuyo', emoji: 'pj:otro', fondo: ['#ffe27a', '#ffb347'], tam: 'm', seccion: 'crear', etiquetas: ['3D'] },
  ];
})();
