// El cuaderno de Avelu (nivel 1: conciencia fonológica) hecho juego: 4 semanas, 20 días.
// Los nombres de la familia se toman de progress.familia (se cambian en "Para mamá y papá").
// Tokens en los textos: {yo} {mama} {papa} {hermana} {idolo}
(function () {
  const S = (sem, dia, o) => Object.assign({ sem, dia }, o);
  // palabra con dibujo
  const w = (t, e) => ({ t, e });

  window.CUADERNO = {
    semanas: [
      { n: 1, titulo: 'Jugamos con las palabras', emoji: '🗣️', color: '#4f7cff', meta: ['Darse cuenta de que lo que decimos está hecho de palabras.', 'Contar las palabras de una oración con golpecitos.', 'Comparar palabras largas y cortas.', 'Ordenar y completar oraciones de oído.'] },
      { n: 2, titulo: 'Jugamos con las rimas', emoji: '🎵', color: '#e8528b', meta: ['Escuchar que dos palabras terminan igual.', 'Encontrar la pareja que rima.', 'Descubrir la palabra que no rima.', 'Inventar rimas, aunque sean palabras inventadas.'] },
      { n: 3, titulo: 'Jugamos con las sílabas', emoji: '👏', color: '#2fbf86', meta: ['Separar palabras en pedacitos con palmadas.', 'Reconocer con qué sílaba empieza una palabra.', 'Juntar sílabas para formar una palabra.', 'Jugar con los nombres de la familia.'] },
      { n: 4, titulo: 'Sílabas y sonidos', emoji: '🔊', color: '#8b5cf6', meta: ['Encontrar la sílaba que falta y quitar una sílaba.', 'Escuchar el primer sonido: «aaaa» de {yo}.', 'Reconocer la vocal con la que empieza una palabra.', 'Reconocer de vista palabras que ya conoce.'] },
    ],

    // ---------- los 20 días ----------
    dias: [
      S(1, 1, { id: 'golpecito', titulo: 'Un golpecito por palabra', emoji: '👆', tipo: 'golpecito',
        consigna: 'Escucha la oración. Da un golpecito por cada palabra.',
        lupe: 'Lee la oración normal; luego repítela palabra por palabra dando tú el golpecito. Después ella sola.',
        items: [
          { frase: ['{yo}', 'come', 'pan'], dib: ['{yo}', '🍽️', '🍞'] },
          { frase: ['{hermana}', 'duerme'], dib: ['{hermana}', '😴'] },
          { frase: ['{idolo}', 'canta'], dib: ['{idolo}', '🎵'] },
          { frase: ['papá', '{papa}', 'lee'], dib: ['{papa}', '📚', '👓'] },
        ] }),
      S(1, 2, { id: 'cuantas', titulo: '¿Cuántas palabras?', emoji: '🔢', tipo: 'cuantas',
        consigna: 'Escucha y toca el número de palabras.',
        lupe: 'Levanta un dedo por cada palabra mientras la repites. «Llueve» es una oración de una sola palabra: celebra si lo descubre.',
        items: [
          { frase: ['mamá', '{mama}', 'cocina'], dib: ['{mama}', '🍳', '🥘'] },
          { frase: ['llueve'], dib: ['🌧️'] },
          { frase: ['la', 'princesa', 'baila'], dib: ['LA', '👸', '💃'] },
          { frase: ['{hermana}', 'ríe'], dib: ['{hermana}', '😂'] },
          { frase: ['{yo}', 'dibuja', 'un', 'sol'], dib: ['{yo}', '🖍️', 'UN', '☀️'] },
        ] }),
      S(1, 3, { id: 'larga', titulo: '¿Larga o corta?', emoji: '📏', tipo: 'larga',
        consigna: 'Escucha las dos palabras. Toca la palabra más larga.',
        lupe: 'Di cada palabra alargándola con las manos: «SOL» (manos juntas) y «PRIN-CE-SA» (manos muy separadas). La palabra larga no siempre es la cosa grande.',
        items: [
          { a: w('sol', '☀️'), b: w('princesa', '👸') }, { a: w('muñeca', '🪆'), b: w('pan', '🍞') },
          { a: w('pez', '🐟'), b: w('mariposa', '🦋') }, { a: w('zapatilla', '👠'), b: w('flor', '🌸') },
          { a: w('tren', '🚂'), b: w('unicornio', '🦄') }, { a: w('castillo', '🏰'), b: w('luna', '🌙') },
        ] }),
      S(1, 4, { id: 'ordena', titulo: 'Ordena la oración', emoji: '🔀', tipo: 'ordena',
        consigna: 'Escucha las palabras desordenadas. Pon los dibujos en orden.',
        lupe: 'Di, por ejemplo: «pan – come – {yo}». Ella debe decir «{yo} come pan» y tocar los dibujos en ese orden.',
        items: [
          { frase: ['{yo}', 'come', 'pan'], dib: ['{yo}', '🍽️', '🍞'] },
          { frase: ['{idolo}', 'canta'], dib: ['{idolo}', '🎵'] },
          { frase: ['{hermana}', 'duerme'], dib: ['{hermana}', '😴'] },
          { frase: ['la', 'princesa', 'baila'], dib: ['LA', '👸', '💃'] },
        ] }),
      S(1, 5, { id: 'completa', titulo: 'Completa la oración', emoji: '🧩', tipo: 'completa',
        consigna: 'Escucha y toca la palabra que falta.',
        lupe: 'Lee la oración y haz un silencio largo en el hueco. Cualquier respuesta con sentido vale.',
        items: [
          { frase: ['la', 'princesa', 'tiene', 'una'], ok: w('corona', '👑'), ops: [w('corona', '👑'), w('pan', '🍞'), w('pelota', '⚽')] },
          { frase: ['{yo}', 'corta', 'con', 'la'], ok: w('tijera', '✂️'), ops: [w('cama', '🛏️'), w('tijera', '✂️'), w('luna', '🌙')] },
          { frase: ['{hermana}', 'toma'], ok: w('leche', '🥛'), ops: [w('leche', '🥛'), w('libros', '📚'), w('gorra', '🧢')] },
          { frase: ['{yo}', 'pinta', 'con', 'la'], ok: w('crayola', '🖍️'), ops: [w('vaca', '🐮'), w('crayola', '🖍️'), w('torta', '🍰')] },
        ] }),

      S(2, 1, { id: 'suenan', titulo: '¿Suenan igual al final?', emoji: '👂', tipo: 'suenan',
        consigna: 'Escucha las dos palabras. Si terminan igual, toca la carita feliz.',
        lupe: 'Alarga mucho el final: «a-ma-RAAA, ca-RAAA». Pregunta: «¿Terminan igual?».',
        items: [
          { a: w('{hermana}', '{hermana}'), b: w('cara', '🙂'), rima: true, siNombre: 'hermana:amara' },
          { a: w('gato', '🐱'), b: w('pato', '🦆'), rima: true },
          { a: w('sol', '☀️'), b: w('muñeca', '🪆'), rima: false },
          { a: w('{papa}', '{papa}'), b: w('té', '🍵'), rima: true, siNombre: 'papa:jose' },
          { a: w('castillo', '🏰'), b: w('anillo', '💍'), rima: true },
          { a: w('luna', '🌙'), b: w('pez', '🐟'), rima: false },
        ] }),
      S(2, 2, { id: 'buscarima', titulo: 'Busca la rima', emoji: '🔍', tipo: 'buscarima',
        consigna: 'Escucha el dibujo grande. Toca el pequeño que rima con él.',
        lupe: 'Nombra tú los cuatro dibujos antes de que responda.',
        items: [
          { grande: w('princesa', '👸'), ops: [w('sol', '☀️'), w('gato', '🐱'), w('fresa', '🍓')], ok: 2 },
          { grande: w('{hermana}', '{hermana}'), ops: [w('libro', '📚'), w('tren', '🚂'), w('cuchara', '🥄')], ok: 2, siNombre: 'hermana:amara' },
          { grande: w('sirena', '🧜‍♀️'), ops: [w('ballena', '🐋'), w('oso', '🧸'), w('pan', '🍞')], ok: 0 },
          { grande: w('gato', '🐱'), ops: [w('casa', '🏠'), w('luna', '🌙'), w('zapato', '👟')], ok: 2 },
        ] }),
      S(2, 3, { id: 'parejas', titulo: 'Parejas que riman', emoji: '✏️', tipo: 'parejas',
        consigna: 'Une cada dibujo con su pareja que rima.',
        lupe: 'Nombra todos los dibujos de las dos columnas antes de empezar.',
        items: [
          { izq: [w('{hermana}', '{hermana}'), w('hada', '🧚'), w('lazo', '🎀'), w('castillo', '🏰'), w('helado', '🍦')],
            der: [w('cuchara', '🥄'), w('espada', '🗡️'), w('brazo', '💪'), w('martillo', '🔨'), w('candado', '🔒')], siNombre: 'hermana:amara' },
          { izq: [w('gato', '🐱'), w('estrella', '⭐'), w('caracol', '🐌')], der: [w('pato', '🦆'), w('botella', '🍾'), w('sol', '☀️')] },
        ] }),
      S(2, 4, { id: 'intrusa', titulo: 'La intrusa', emoji: '🚫', tipo: 'intrusa',
        consigna: 'Tres riman y una no. Toca la que no rima.',
        lupe: 'Di las cuatro palabras seguidas exagerando el final. Luego: «¿Cuál no suena como las demás?».',
        items: [
          { ops: [w('pato', '🦆'), w('flor', '🌸'), w('zapato', '👟'), w('gato', '🐱')], ok: 1 },
          { ops: [w('cara', '🙂'), w('sol', '☀️'), w('{hermana}', '{hermana}'), w('cuchara', '🥄')], ok: 1, siNombre: 'hermana:amara' },
          { ops: [w('botella', '🍾'), w('cebolla', '🧅'), w('oso', '🧸'), w('estrella', '⭐')], ok: 2 },
          { ops: [w('helado', '🍦'), w('candado', '🔒'), w('dado', '🎲'), w('tren', '🚂')], ok: 3 },
        ] }),
      S(2, 5, { id: 'inventa', titulo: 'Inventa la rima', emoji: '💡', tipo: 'inventa',
        consigna: 'Mira el dibujo y di una palabra que rime. Puede ser inventada.',
        lupe: '«{yo} – pelú», «{idolo} – tumi»: las inventadas valen; lo importante es el final. Si quieres, escribe tú la respuesta.',
        items: [
          { p: w('{yo}', '{yo}'), ej: 'pelú' }, { p: w('{idolo}', '{idolo}'), ej: 'tumi' }, { p: w('princesa', '👸'), ej: 'fresa' },
          { p: w('sol', '☀️'), ej: 'col' }, { p: w('muñeca', '🪆'), ej: 'manteca' }, { p: w('pan', '🍞'), ej: 'flan' },
        ] }),

      S(3, 1, { id: 'palmadas12', titulo: 'Palmadas: 1 y 2', emoji: '👏', tipo: 'palmadas',
        consigna: 'Di la palabra dando palmadas. Una palmada por pedacito.',
        lupe: 'Modela: «SOL» (una palmada), «GA-TO» (dos). Separa con la boca bien abierta.',
        items: [w('sol', '☀️'), w('gato', '🐱'), w('pan', '🍞'), w('luna', '🌙')] }),
      S(3, 2, { id: 'palmadas23', titulo: 'Palmadas: 2 y 3', emoji: '👏', tipo: 'palmadas',
        consigna: 'Da palmadas: una por cada pedacito.',
        lupe: 'Si se le pasan las palmadas, pon tus manos sobre las suyas y marquen juntas.',
        items: [w('muñeca', '🪆'), w('hada', '🧚'), w('corona', '👑'), w('rosa', '🌹'), w('princesa', '👸'), w('casa', '🏠')] }),
      S(3, 3, { id: 'nombres', titulo: 'Los nombres de mi familia', emoji: '👨‍👩‍👧‍👧', tipo: 'nombres',
        consigna: 'Da palmadas con cada nombre y toca su número.',
        lupe: 'Hazlo con palmadas: {yo}, {mama}, {hermana}, {papa}, {idolo}. Luego pregúntale: «¿Quién tiene el nombre más largo?».',
        items: [w('{mama}', '{mama}'), w('sol', '☀️'), w('{yo}', '{yo}'), w('{idolo}', '{idolo}'), w('{hermana}', '{hermana}'), w('{papa}', '{papa}')] }),
      S(3, 4, { id: 'empieza', titulo: '¿Con qué sílaba empieza?', emoji: '▶️', tipo: 'empieza',
        consigna: 'Di la palabra despacio. Toca la sílaba con la que empieza.',
        lupe: 'Lee tú las tres opciones. Alarga la primera sílaba: «GAAA-to».',
        items: [
          { p: w('gato', '🐱'), ops: ['to', 'ga', 'pa'] }, { p: w('luna', '🌙'), ops: ['so', 'na', 'lu'] },
          { p: w('muñeca', '🪆'), ops: ['mu', 'ñe', 'ca'] }, { p: w('{yo}', '{yo}'), ops: ['a', 'lu', 've'], siNombre: 'yo:avelu' },
        ] }),
      S(3, 5, { id: 'junta', titulo: 'Junta las sílabas', emoji: '🔗', tipo: 'junta',
        consigna: 'Escucha los pedacitos. Júntalos y toca el dibujo.',
        lupe: 'Di las sílabas con una pausa de un segundo: «PRIN… CE… SA». Si no lo logra, acorta la pausa.',
        items: [
          { p: 'gato', ops: [w('oso', '🧸'), w('gato', '🐱'), w('pato', '🦆')] },
          { p: 'princesa', ops: [w('corona', '👑'), w('hada', '🧚'), w('princesa', '👸')] },
          { p: 'muñeca', ops: [w('sol', '☀️'), w('mano', '✋'), w('muñeca', '🪆')] },
          { p: '{hermana}', ops: [w('{mama}', '{mama}'), w('{yo}', '{yo}'), w('{hermana}', '{hermana}')] },
        ] }),

      S(4, 1, { id: 'perdida', titulo: 'La sílaba perdida', emoji: '🧩', tipo: 'perdida',
        consigna: 'A la palabra le falta un pedacito. Toca la sílaba que falta.',
        lupe: 'Di la palabra con un hueco de silencio: «ZA… … TO» y luego las opciones.',
        items: [
          { p: w('zapato', '👟'), falta: 1, ops: ['pa', 'sa', 'mo'] }, { p: w('{yo}', '{yo}'), falta: 1, ops: ['ve', 'to', 'ma'], siNombre: 'yo:avelu' },
          { p: w('muñeca', '🪆'), falta: 2, ops: ['ca', 'lo', 'pe'] }, { p: w('corona', '👑'), falta: 0, ops: ['co', 'na', 'sa'] },
        ] }),
      S(4, 2, { id: 'quita', titulo: 'Quita la primera sílaba', emoji: '✂️', tipo: 'quita',
        consigna: 'Di la palabra sin su primer pedacito. ¿Qué palabra nueva aparece?',
        lupe: 'Modela: «ZA-PA-TO sin ZA… ¡PATO!». Es difícil a los 4 años: hazlo como un truco de magia y repite varios días.',
        items: [
          { p: w('zapato', '👟'), ops: [w('pato', '🦆'), w('oso', '🧸'), w('gato', '🐱')], ok: 0 },
          { p: w('candado', '🔒'), ops: [w('cama', '🛏️'), w('dado', '🎲'), w('pan', '🍞')], ok: 1 },
          { p: w('máscara', '🎭'), ops: [w('flor', '🌸'), w('mano', '✋'), w('cara', '🙂')], ok: 2 },
          { p: w('pirata', '🏴‍☠️'), ops: [w('ratón', '🐭'), w('sol', '☀️'), w('rata', '🐀')], ok: 2 },
        ] }),
      S(4, 3, { id: 'primersonido', titulo: 'El primer sonido', emoji: '🐍', tipo: 'primersonido',
        consigna: 'Escucha el dibujo grande con su primer sonido largo. Toca los dos que empiezan igual.',
        lupe: 'Usa el sonido, no el nombre de la letra: «aaaavelu», «mmmmuñeca», «ssssol», «llllupe».',
        items: [
          { grande: w('{yo}', '{yo}'), ops: [w('sol', '☀️'), w('abeja', '🐝'), w('{hermana}', '{hermana}')], ok: [1, 2], siNombre: 'yo:avelu,hermana:amara' },
          { grande: w('muñeca', '🪆'), ops: [w('pan', '🍞'), w('mano', '✋'), w('mono', '🐒')], ok: [1, 2] },
          { grande: w('sol', '☀️'), ops: [w('sopa', '🍜'), w('sirena', '🧜‍♀️'), w('gato', '🐱')], ok: [0, 1] },
          { grande: w('{mama}', '{mama}'), ops: [w('casa', '🏠'), w('luna', '🌙'), w('libro', '📚')], ok: [1, 2], siNombre: 'mama:lupe' },
        ] }),
      S(4, 4, { id: 'vocal', titulo: 'Vocales al inicio', emoji: '🅰️', tipo: 'vocal',
        consigna: 'Di el dibujo alargando el primer sonido. Toca la vocal con la que empieza.',
        lupe: 'Di tú las vocales con su sonido. Si aún no reconoce las letras, señala tú y que ella repita el sonido.',
        items: [
          { p: w('{yo}', '{yo}'), ops: ['o', 'e', 'a'] }, { p: w('oso', '🧸'), ops: ['i', 'a', 'o'] },
          { p: w('uva', '🍇'), ops: ['u', 'e', 'o'] }, { p: w('elefante', '🐘'), ops: ['u', 'e', 'a'] },
        ] }),
      S(4, 5, { id: 'conozco', titulo: 'Palabras que conozco', emoji: '👀', tipo: 'conozco',
        consigna: 'Mira la palabra grande. Busca la que es igualita.',
        lupe: 'Aquí se trata de mirar letra por letra. Pregunta: «¿Empieza igual? ¿Termina igual?». No es leer: es reconocer de vista.',
        items: [
          { p: '{yo}', ops: ['avión', '{hermana}', '{yo}'] }, { p: 'mamá', ops: ['mapá', 'papá', 'mamá'] },
          { p: 'papá', ops: ['papá', 'pato', 'mamá'] }, { p: '{hermana}', ops: ['{hermana}', '{yo}', 'amasa'] },
          { p: '{idolo}', ops: ['{idolo}', 'lumi', 'ruma'] },
        ] }),
    ],

    // ---------- fines de semana (descanso: trazos y memoria) ----------
    finde: [
      { sem: 1, id: 'trazos1', titulo: 'Trazos de princesa', emoji: '✍️', tipo: 'trazos', consigna: 'Sigue el camino con tu dedo desde el punto azul hasta la bandera.', lupe: 'Siempre de izquierda a derecha: es la dirección de la lectura. Primero con el dedo, luego con la crayola.', items: [{ f: 'recta', e: '👸' }, { f: 'ondas', e: '🧜‍♀️' }, { f: 'zigzag', e: '🦄' }, { f: 'arcos', e: '🏰' }] },
      { sem: 1, id: 'falta1', titulo: '¿Qué falta?', emoji: '🧠', tipo: 'quefalta', consigna: 'Mira la fila. Luego se tapa. ¿Qué dibujo falta?', lupe: 'Primero nombren juntas los dibujos de la fila. Deja que mire unos segundos.', items: [{ fila: ['👸', '☀️', '🪆'], f: 2 }, { fila: ['👑', '🐱', '✂️', '🌸'], f: 0 }, { fila: ['🏰', '🍞', '⭐', '🖍️'], f: 3 }] },
      { sem: 2, id: 'trazos2', titulo: 'Trazos de sirena', emoji: '✍️', tipo: 'trazos', consigna: 'Sigue cada camino sin levantar el dedo, de izquierda a derecha.', lupe: 'Si se sale del camino no pasa nada: se repasa otra vez.', items: [{ f: 'ondas', e: '🧜‍♀️' }, { f: 'bucles', e: '🐬' }, { f: 'arcos', e: '🐚' }, { f: 'zigzag', e: '⛵' }] },
      { sem: 2, id: 'falta2', titulo: '¿Qué falta?', emoji: '🧠', tipo: 'quefalta', consigna: 'Mira la fila. Luego se tapa. ¿Qué dibujo falta?', lupe: 'Nombren juntas los dibujos antes de tapar.', items: [{ fila: ['🧜‍♀️', '🌸', '👠'], f: 1 }, { fila: ['🦄', '🍞', '👑', '🐱'], f: 3 }, { fila: ['🧚', '🪆', '⭐', '🔑', '☀️'], f: 4 }] },
      { sem: 3, id: 'trazos3', titulo: 'Trazos de castillo', emoji: '✍️', tipo: 'trazos', consigna: 'Sigue el camino de izquierda a derecha sin levantar el dedo.', lupe: 'Primero con el dedo, despacito.', items: [{ f: 'palos', e: '🏰' }, { f: 'zigzag', e: '👑' }, { f: 'bucles', e: '🎀' }, { f: 'ondas', e: '🌹' }] },
      { sem: 3, id: 'falta3', titulo: '¿Qué falta?', emoji: '🧠', tipo: 'quefalta', consigna: 'Mira la fila. Luego se tapa. ¿Qué dibujo falta?', lupe: 'Para subir el nivel, que diga en sílabas el dibujo que falta.', items: [{ fila: ['🏰', '🌙', '✂️', '🍞'], f: 3 }, { fila: ['{yo}', '{hermana}', '{mama}', '{papa}', '{idolo}'], f: 0 }, { fila: ['🖍️', '👟', '🌸', '🪆', '🐱'], f: 0 }] },
      { sem: 4, id: 'trazos4', titulo: 'Trazos de estrella', emoji: '✍️', tipo: 'trazos', consigna: 'Sigue el camino de izquierda a derecha sin levantar el dedo.', lupe: '¡Ya casi terminamos el cuaderno!', items: [{ f: 'arcos', e: '⭐' }, { f: 'ondas', e: '🎤' }, { f: 'palos', e: '🖍️' }, { f: 'bucles', e: '🌈' }] },
      { sem: 4, id: 'memo', titulo: 'Memoria de rimas', emoji: '🃏', tipo: 'memo', consigna: 'Voltea dos tarjetas. Si riman, ¡son pareja!', lupe: 'Como las tarjetas para recortar: digan juntas las dos palabras exagerando el final.', items: [{ pares: [[w('gato', '🐱'), w('pato', '🦆')], [w('caracol', '🐌'), w('sol', '☀️')], [w('estrella', '⭐'), w('botella', '🍾')], [w('helado', '🍦'), w('candado', '🔒')], [w('lazo', '🎀'), w('brazo', '💪')], [w('hada', '🧚'), w('espada', '🗡️')]] }] },
    ],

    // ---------- Taller de Avelu: se juega en otras partes del juego; antes, las palabras con palmadas ----------
    talleres: [
      { sem: 1, trasDia: 2, titulo: 'Viste a la princesa', emoji: '👗', url: 'princesa.html', palabras: [w('vestido', '👗'), w('morado', '🟣'), w('rosado', '🩷'), w('celeste', '🩵'), w('corona', '👑'), w('zapatos', '👠'), w('collar', '📿'), w('varita', '🪄')] },
      { sem: 1, trasDia: 4, titulo: 'La casa de muñecas', emoji: '🏠', url: 'construir.html', palabras: [w('cama', '🛏️'), w('sofá', '🛋️'), w('mesa', '🪑'), w('lámpara', '💡'), w('planta', '🪴'), w('ventana', '🪟')] },
      { sem: 2, trasDia: 2, titulo: 'El castillo de la princesa', emoji: '🏰', url: 'construir.html', palabras: [w('princesa', '👸'), w('unicornio', '🦄'), w('carroza', '🎃'), w('arcoíris', '🌈'), w('mariposa', '🦋'), w('nube', '☁️')] },
      { sem: 2, trasDia: 4, titulo: 'Diseña tu vestido', emoji: '🎨', url: 'pintar.html', palabras: [w('corazón', '❤️'), w('estrella', '⭐'), w('flor', '🌸'), w('lazo', '🎀'), w('mariposa', '🦋'), w('rosa', '🌹')] },
      { sem: 3, trasDia: 2, titulo: 'El cuarto de {hermana} y {yo}', emoji: '🛏️', url: 'cuidar.html', palabras: [w('oso', '🧸'), w('espejo', '🪞'), w('libros', '📚'), w('globo', '🎈'), w('gato', '🐱'), w('corazón', '❤️')] },
      { sem: 3, trasDia: 4, titulo: '{idolo} canta en el escenario', emoji: '🎤', url: 'ballet.html', palabras: [w('micrófono', '🎤'), w('guitarra', '🎸'), w('luz', '💡'), w('nota', '🎵'), w('globo', '🎈'), w('estrella', '⭐')] },
      { sem: 4, trasDia: 2, titulo: 'El jardín de {yo}', emoji: '🌷', url: 'construir.html', palabras: [w('árbol', '🌳'), w('tulipán', '🌷'), w('abeja', '🐝'), w('caracol', '🐌'), w('pájaro', '🐦'), w('mariposa', '🦋')] },
      { sem: 4, trasDia: 4, titulo: 'La tienda de {yo}', emoji: '🛒', url: 'construir.html', palabras: [w('manzana', '🍎'), w('queso', '🧀'), w('plátano', '🍌'), w('galleta', '🍪'), w('chocolate', '🍫'), w('piña', '🍍')] },
    ],

    // ---------- ¿Cuánto aprendí? (8 puntos, como en el cuaderno) ----------
    evaluacion: [
      { tipo: 'cuantas', area: 'Palabras', it: { frase: ['mamá', 'abraza', 'a', '{yo}'], dib: ['{mama}', '🤗', 'A', '{yo}'] } },
      { tipo: 'cuantas', area: 'Palabras', it: { frase: ['{idolo}'], dib: ['{idolo}'] } },
      { tipo: 'buscarima', area: 'Rimas', it: { grande: w('{hermana}', '{hermana}'), ops: [w('sol', '☀️'), w('pan', '🍞'), w('cara', '🙂')], ok: 2, siNombre: 'hermana:amara' }, alt: { grande: w('ratón', '🐭'), ops: [w('sol', '☀️'), w('pan', '🍞'), w('jamón', '🍖')], ok: 2 } },
      { tipo: 'buscarima', area: 'Rimas', it: { grande: w('gato', '🐱'), ops: [w('luna', '🌙'), w('flor', '🌸'), w('pato', '🦆')], ok: 2 } },
      { tipo: 'cuantasSil', area: 'Sílabas', it: w('{yo}', '{yo}') },
      { tipo: 'cuantasSil', area: 'Sílabas', it: w('sol', '☀️') },
      { tipo: 'cuantasSil', area: 'Sílabas', it: w('muñeca', '🪆') },
      { tipo: 'cuantasSil', area: 'Sílabas', it: w('princesa', '👸') },
    ],
  };
})();
