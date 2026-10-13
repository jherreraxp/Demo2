// Catálogo de todo lo que dice el juego, agrupado para grabarlo con la voz de la familia.
// Los juegos dicen exactamente estos trozos, así cada grabación se usa en muchos lugares.
(function () {
  const J = window.Juego;
  const VOC = ['a', 'e', 'i', 'o', 'u'];
  const CONS = ['m', 's', 'l', 'n', 'p', 't', 'd', 'f', 'c', 'g', 'b', 'r', 'ñ', 'j', 'ch', 'll'];
  const silabas = [];
  ['m', 's', 'l', 'n', 'p', 't', 'd', 'f', 'b', 'r', 'ñ', 'j', 'ch', 'll'].forEach(c => VOC.forEach(v => silabas.push(c + v)));
  ['ca', 'co', 'cu', 'ga', 'go', 'gu'].forEach(s => silabas.push(s));
  const uniq = a => [...new Set(a)];
  const P = J.progress;

  window.FRASES = [
    { id: 'sonidos', nombre: 'Sonidos de letras', ayuda: 'Di el SONIDO, no el nombre: "mmmm", "ssss"; para p, t, d di "pa", "ta", "da".',
      items: VOC.concat(CONS).map(l => ({ key: 'sonido ' + l, texto: J.SOUNDS[l] || l, label: l })) },
    { id: 'jugadores', nombre: 'Nombres', ayuda: 'Los nombres de los jugadores y de los personajes.',
      items: uniq([...P.players.map(p => p.name), ...Object.values(J.CHARS).map(c => c.name)]).map(t => ({ texto: t })) },
    { id: 'felicitar', nombre: 'Felicitaciones', ayuda: 'Con mucha alegría.',
      items: uniq([...J.PRAISES, ...J.SHOUTS, '¡Lo encontraste!', '¡Subiste de nivel!', '¡Ganaste un regalo!', '¡Jugaste muy bien!', '¡Qué linda quedó!', '¡Qué bonito dibujo!', '¡Pum!', '¡A la mochila!']).map(t => ({ texto: t })) },
    { id: 'animo', nombre: 'Ánimo', ayuda: 'Con cariño, cuando se equivoca.',
      items: ['¡Casi!', 'Prueba otra vez', '¡Tú puedes!', 'Intenta otra', 'Sigue buscando.', '¡Uy!', 'Escucha'].map(t => ({ texto: t })) },
    { id: 'instrucciones', nombre: 'Instrucciones', ayuda: 'Frases cortas que se combinan con palabras: "Busca" + "gato".',
      items: ['¡Hola!', '¿A qué jugamos hoy?', '¡Turno de', '¡Elige tu personaje!', 'es', 'Toca la caja para abrirla.', '¿Quieres un cuento, pintar, o seguir jugando?', 'Es hora de descansar.',
        'Busca', 'Atrapa', 'Revienta', 'Revienta la', 'Aplasta', 'Abre la cajita', 'Aplasta al gusano que dice', 'Revienta la letra que suena', '¿Dónde está la', 'grande', 'chiquita', '¡Sí! Es la',
        '¿Cuál letra suena así?', 'Esa es la', 'Esa suena', 'Ese suena', 'como en', '¿Qué dicen juntas?', '¿Cuál dice', 'Esa dice', 'Ese dice', 'Ese es', 'Aquí hay',
        '¿Con qué sílaba empieza', 'empieza con', 'no empieza con', 'Mira el dibujo.', '¿Qué palabra es?', 'Busca la que dice',
        'Abre una cajita y lee.', '¿Qué dice la cajita?', 'Algo que empieza con', '¡Sigue al hada!', 'Nivel', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis',
        '¡Pinta a tu princesa!', '¡Como nueva!', '¡Pinta con los colores del arcoíris!', '¡A colorear!', '¿Borrar todo? Toca otra vez.'].map(t => ({ texto: t })) },
    { id: 'palabras', nombre: 'Palabras', ayuda: 'Clarito y despacio.',
      items: uniq([...J.WORDS.map(w => w[0]), ...Object.values(J.SOUND_WORD), 'elefante', 'jugo', 'el sol', 'la luna', 'mi gato', 'un pato', 'la casa', 'el oso', 'mi mamá', 'una palta', 'el choclo', 'la llama', 'mi papá', 'la nube']).map(t => ({ texto: t })) },
    { id: 'silabas', nombre: 'Sílabas', ayuda: 'Cada sílaba clarita: "ma", "pe", "lo".',
      items: silabas.map(t => ({ texto: t })) },
    { id: 'colores', nombre: 'Colores y partes', ayuda: 'Para el juego de pintar.',
      items: ['rojo', 'roja', 'rojos', 'rojas', 'naranja', 'naranjas', 'amarillo', 'amarilla', 'amarillos', 'amarillas', 'verde', 'verdes', 'celeste', 'celestes', 'azul', 'azules',
        'morado', 'morada', 'morados', 'moradas', 'rosado', 'rosada', 'rosados', 'rosadas', 'blanco', 'blanca', 'blancos', 'blancas', 'marrón', 'marrones',
        'negro', 'negra', 'negros', 'negras', 'dorado', 'dorada', 'dorados', 'doradas', 'plateado', 'plateada', 'plateados', 'plateadas', 'arcoíris', 'los botones',
        'el vestido', 'la falda', 'la blusa', 'las mangas', 'los guantes', 'el cinturón', 'el moño', 'el collar', 'la capa', 'el pelo', 'la piel', 'los zapatos', 'las botas', 'la corona',
        'la chaqueta', 'el pantalón', 'la gorra', 'la lana', 'la manta', 'los pompones', 'las orejas', 'la nariz', 'los cuernos', 'el pelaje', 'la panza'].map(t => ({ texto: t })) },
    { id: 'cuento', nombre: 'Cuento', ayuda: 'Como si se lo leyeras antes de dormir.',
      items: ['Esta es Lola. Lola es una zorrita.', 'Lola mira la luna. ¡Qué linda es la luna!', 'Lola salta y salta. ¡Quiere tocar la luna!', 'Una nube baja. Lola sube a la nube.',
        'En el cielo hay un pato. —Hola, pato —dice Lola.', 'El pato y Lola van a la luna.', 'La luna sonríe: —Hola, Lola. Toma una estrella.',
        'Lola vuelve a su casa. Mamá le da un beso.', 'Lola duerme y sueña con la luna. ¡Fin!'].map(t => ({ texto: t })) },
  ];
  window.FRASES.forEach(g => g.items.forEach(it => { it.key = it.key || J.norm(it.texto); }));
})();
