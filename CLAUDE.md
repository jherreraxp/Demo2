# Avelu y Amara (antes "El Reino de las Letras")

Juego en español (Perú) para que una niña de 4 años aprenda a leer con el método fonético-silábico.
Sitio estático publicado con GitHub Pages desde la rama `gh-pages`.

## Importante al publicar

- El **Estudio de voz** (`voces.html`) sube las grabaciones de la familia directamente a la rama
  `gh-pages` (carpeta `assets/voz/` y `assets/voz/lista.json`) usando la API de GitHub.
- Por eso, antes de empujar a `gh-pages`, **siempre** hay que traer y mezclar esa rama para no borrar
  sus voces: `git fetch origin gh-pages && git merge origin/gh-pages`, luego `git push origin HEAD:gh-pages`.
- Nunca sobrescribir `assets/voz/lista.json` con una versión vacía.

## Estructura

- `js/comun.js`: palabras, progreso, jugadores/turnos, voz (grabaciones o voz del dispositivo), música, regalos.
- `js/frases.js`: catálogo de frases que el juego dice (para grabarlas). Los juegos deben decir exactamente
  estos trozos con `J.say([...])` para que se usen las grabaciones.
- `js/personajes.js`: personajes y objetos 3D hechos con código (three.js en `vendor/three`).
- `js/juegos.js`: lista de juegos del menú. Para agregar un juego: crear su página y añadir una línea ahí.
- `js/tema.js`: paletas de colores y foto de fondo difuminada.
- Juegos: `carrera`, `bosque`, `globos`, `gusanos`, `lectura`, `princesa`, `pintar`, `cuento`.
- Para pruebas automáticas, `#prueba` en la URL arranca el juego directo y expone el estado.
