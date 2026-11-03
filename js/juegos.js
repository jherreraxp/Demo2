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
//   edad:    [mínima, máxima] en años (filtro por edades del menú)
//   captura: fotito del juego para la tarjeta (assets/capturas/<id>.webp); si falta, se dibuja el emoji
(function () {
  window.SECCIONES = [
    { id: 'todos', nombre: 'Todos', emoji: '⭐' },
    { id: 'cuaderno', nombre: 'Mi cuaderno', emoji: '📒', q: 'El cuaderno de la familia hecho juego: 4 semanas para jugar con palabras, rimas, sílabas y sonidos.' },
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
    { id: 'cuaderno', url: 'cuaderno.html', titulo: 'Mi Cuaderno', sub: '20 días: palabras, rimas y sílabas', emoji: '📒', fondo: ['#ff9ad5', '#8b5cf6'], tam: 'l', seccion: 'cuaderno', etiquetas: ['nuevo'], edad: [3, 6], captura: 'assets/capturas/cuaderno.webp' },
    { id: 'lanzar', url: 'lanzar.html', titulo: 'Honda de Cuyes', sub: 'Lanza y lee', emoji: '🐹', fondo: ['#ffcf33', '#f28c28'], tam: 'l', seccion: 'tocar', etiquetas: ['nuevo'], edad: [4, 8], captura: 'assets/capturas/lanzar.webp' },
    { id: 'carrera', url: 'carrera.html', titulo: 'Carrera de Palabras', sub: 'Atrapa las monedas', emoji: 'pj:jugador', fondo: ['#ff7eb6', '#9a6ee0'], tam: 'xl', seccion: 'palabras', etiquetas: ['3D'], edad: [4, 7], captura: 'assets/capturas/carrera.webp' },
    { id: 'sapito', url: 'sapito.html', titulo: 'El Camino del Sapito', sub: 'Arma el camino con flechas', emoji: '🐸', fondo: ['#7be0a0', '#2fb3c9'], tam: 'l', seccion: 'pensar', etiquetas: ['nuevo'], edad: [4, 8], captura: 'assets/capturas/sapito.webp' },
    { id: 'construir', url: 'construir.html', titulo: 'Construye tu Mundo', sub: 'Casas, laberintos y más', emoji: '🧱', fondo: ['#ffb3de', '#7fd3ff'], tam: 'l', seccion: 'crear', etiquetas: ['3D', 'nuevo'], edad: [5, 10], captura: 'assets/capturas/construir.webp' },
    { id: 'editor', url: 'editor.html', titulo: 'Taller de Personajes', sub: 'Crea y cambia personajes', emoji: '🧵', fondo: ['#ffb3de', '#9a6ee0'], tam: 'l', seccion: 'crear', etiquetas: ['3D', 'nuevo'], edad: [4, 10], captura: 'assets/capturas/editor.webp' },
    { id: 'laberinto', url: 'laberinto.html', titulo: 'Laberinto del Lobo', sub: 'Escapa y recoge quesos', emoji: '🧀', fondo: ['#ffd23f', '#6b4fd8'], tam: 'l', seccion: 'pensar', etiquetas: ['3D', 'nuevo'], edad: [4, 8], captura: 'assets/capturas/laberinto.webp' },
    { id: 'bosque', url: 'bosque.html', titulo: 'Bosque de las Palabras', sub: 'Busca la cajita y lee', emoji: '🎁', fondo: ['#8fd46a', '#2e9e6b'], tam: 'm', seccion: 'palabras', etiquetas: ['3D'], edad: [5, 8], captura: 'assets/capturas/bosque.webp' },
    { id: 'memoria', url: 'memoria.html', titulo: 'Memoria', sub: 'Encuentra las parejas', emoji: '🃏', fondo: ['#ffb36b', '#ff6f91'], tam: 'm', seccion: 'vocales', edad: [3, 7], captura: 'assets/capturas/memoria.webp' },
    { id: 'ballet', url: 'ballet.html', titulo: 'Escenario de Ballet', sub: 'Baila y gana posiciones', emoji: '🩰', fondo: ['#c9a2ff', '#6b4fd8'], tam: 'l', seccion: 'crear', etiquetas: ['3D'], edad: [3, 8], captura: 'assets/capturas/ballet.webp' },
    { id: 'burbujas', url: 'burbujas.html', titulo: 'Burbujas', sub: 'Revienta y escucha', emoji: '🫧', fondo: ['#8fe3ff', '#5b8cff'], tam: 'm', seccion: 'tocar', etiquetas: ['nuevo'], edad: [3, 5], captura: 'assets/capturas/burbujas.webp' },
    { id: 'globos', url: 'globos.html', titulo: 'Revienta Globos', sub: 'Toca la que oyes', emoji: '🎈', fondo: ['#ff9ad5', '#ff5d8f'], tam: 'm', seccion: 'vocales', etiquetas: ['3D'], edad: [3, 6], captura: 'assets/capturas/globos.webp' },
    { id: 'gusanos', url: 'gusanos.html', titulo: 'Aplasta Gusanos', sub: '¡Pum! al que oyes', emoji: '🐛', fondo: ['#b8f06a', '#4cb87a'], tam: 'm', seccion: 'vocales', etiquetas: ['3D'], edad: [3, 6], captura: 'assets/capturas/gusanos.webp' },
    { id: 'piano', url: 'piano.html', titulo: 'Piano Mágico', sub: 'Toca y canta', emoji: '🎹', fondo: ['#ffd23f', '#ff8a3d'], tam: 'm', seccion: 'tocar', etiquetas: ['nuevo'], edad: [3, 7], captura: 'assets/capturas/piano.webp' },
    { id: 'cuidar', url: 'cuidar.html', titulo: 'Cuida a tu personaje', sub: 'Báñalo, decóralo y juega', emoji: 'pj:jugador', fondo: ['#7fd3ff', '#9a6ee0'], tam: 'l', seccion: 'crear', etiquetas: ['3D'], edad: [3, 7], captura: 'assets/capturas/cuidar.webp' },
    { id: 'letras', url: 'lectura.html?modo=letras', titulo: 'Vocales y sonidos', sub: 'Escucha y toca', emoji: 'a e', fondo: ['#ff8a8a', '#ef5b5b'], tam: 'm', seccion: 'vocales', edad: [4, 6], captura: 'assets/capturas/letras.webp' },
    { id: 'tren', url: 'tren.html', titulo: 'Tren de sílabas', sub: 'Arma la palabra', emoji: '🚂', fondo: ['#ff9f6b', '#e8473c'], tam: 'm', seccion: 'silabas', edad: [5, 7], captura: 'assets/capturas/tren.webp' },
    { id: 'fuegos', url: 'fuegos.html', titulo: 'Fuegos Artificiales', sub: 'Toca el cielo', emoji: '🎆', fondo: ['#3b2a7a', '#ff5dab'], tam: 'm', seccion: 'tocar', etiquetas: ['nuevo'], edad: [3, 5], captura: 'assets/capturas/fuegos.webp' },
    { id: 'junta', url: 'lectura.html?modo=junta', titulo: 'Junta los sonidos', sub: 'mmm + a = ma', emoji: 'm+a', fondo: ['#7fb2ff', '#3f8ee8'], tam: 'm', seccion: 'letras', edad: [4, 6], captura: 'assets/capturas/junta.webp' },
    { id: 'silabas', url: 'lectura.html?modo=silabas', titulo: 'Sílabas', sub: '¿Cuál dice…?', emoji: 'ma pa', fondo: ['#c9a2ff', '#9a6ee0'], tam: 'm', seccion: 'letras', edad: [5, 7], captura: 'assets/capturas/silabas.webp' },
    { id: 'princesa', url: 'princesa.html', titulo: 'Pinta tu personaje', sub: 'Gorra, polera, zapatillas…', emoji: '🎨', fondo: ['#ffb3de', '#ff7eb6'], tam: 'm', seccion: 'crear', etiquetas: ['3D'], edad: [3, 8], captura: 'assets/capturas/princesa.webp' },
    { id: 'empieza', url: 'lectura.html?modo=empieza', titulo: '¿Con qué empieza?', sub: 'Mira el dibujo', emoji: '🐺 lo', fondo: ['#8fe0b0', '#4cb87a'], tam: 'm', seccion: 'silabas', edad: [4, 6], captura: 'assets/capturas/empieza.webp' },
    { id: 'palabras', url: 'lectura.html?modo=palabras', titulo: 'Palabras', sub: '¡Ya leo!', emoji: 'gato', fondo: ['#d7b6ff', '#8a5cf0'], tam: 'm', seccion: 'silabas', edad: [5, 7], captura: 'assets/capturas/palabras.webp' },
    { id: 'pintar', url: 'pintar.html', titulo: 'Lienzo arcoíris', sub: 'Pinta y colorea', emoji: '🌈', fondo: ['#ffe27a', '#ff7eb6'], tam: 'm', seccion: 'crear', edad: [3, 8], captura: 'assets/capturas/pintar.webp' },
    { id: 'cuento', url: 'cuento.html', titulo: 'Cuento', sub: 'Lola y la luna', emoji: '📖', fondo: ['#9fd0ff', '#5b6bff'], tam: 'm', seccion: 'frases', edad: [4, 8], captura: 'assets/capturas/cuento.webp' },
    { id: 'frases', url: 'carrera.html', titulo: 'Carrera de frases', sub: 'Niveles 5 y 6', emoji: '💬', fondo: ['#ffc6e0', '#c86bfa'], tam: 'm', seccion: 'frases', etiquetas: ['3D'], edad: [6, 8], captura: 'assets/capturas/frases.webp' },
    { id: 'personajes', url: 'personajes.html', titulo: 'Personajes', sub: 'Elige el tuyo', emoji: 'pj:otro', fondo: ['#ffe27a', '#ffb347'], tam: 'm', seccion: 'crear', etiquetas: ['3D'], edad: [3, 8], captura: 'assets/capturas/personajes.webp' },
  ];
})();
