// Canciones extra para el Escenario de Ballet. Todas son obras clásicas de dominio público o melodías
// tradicionales infantiles, en arreglos propios y sencillos (solo melodía, sin letras).
// Se agregan a Juego.SONGS (el mismo objeto que lee el motor de música) y se abren con estrellas;
// las marcadas con `familia` necesitan el plan Familia.
(function () {
  const J = window.Juego; if (!J || !J.SONGS) return;
  const NOTA = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const midi = s => { const m = /^([A-G])(#|b)?(\d)$/.exec(s); return m ? 12 * (+m[3] + 1) + NOTA[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) : 0; };
  const acorde = n => { const m = /^([A-G])(#|b)?(m|7)?$/.exec(n) || ['', 'C']; const root = 48 + NOTA[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); return { root, tri: (m[3] === 'm' ? [0, 3, 7] : m[3] === '7' ? [0, 4, 7, 10] : [0, 4, 7]).map(x => root + 12 + x) }; };
  // el motor de comun.js prepara las canciones al cargar; las nuevas se preparan aquí igual
  function preparar(s) {
    s.notes = s.mel.trim().split(/\s+/).map(tok => { const [n, d] = tok.split(':'); return [n === 'R' ? 0 : midi(n), +d]; });
    s.len = s.notes.reduce((a, [, d]) => a + d, 0);
    s.bars = s.chords.split(' ').map(c => c.match(/[A-G](#|b)?(m|7)?/g).map(acorde));
    return s;
  }
  const EXTRA = {
    pollitos: { nombre: 'Los pollitos', autor: 'canción tradicional', emoji: '🐥', bpm: 100, bar: 4, beat: 'suave', inst: 'celesta', estrellas: 0, cielo: ['#ffe9a8', '#fff7dc', 10],
      chords: 'C C F C F C G C',
      mel: 'C5:1 D5:1 E5:1 F5:1 G5:2 G5:2 A5:1 A5:1 A5:1 A5:1 G5:4 F5:1 F5:1 F5:1 F5:1 E5:2 E5:2 D5:1 D5:1 D5:1 D5:1 C5:4' },
    martinillo: { nombre: 'Martinillo', autor: 'canción tradicional', emoji: '🔔', bpm: 108, bar: 4, beat: 'pop', inst: 'celesta', estrellas: 4, cielo: ['#9fd8ff', '#e8f7ff', 20],
      chords: 'C C C C C C C C',
      mel: 'C5:1 D5:1 E5:1 C5:1 C5:1 D5:1 E5:1 C5:1 E5:1 F5:1 G5:2 E5:1 F5:1 G5:2 G5:.5 A5:.5 G5:.5 F5:.5 E5:1 C5:1 G5:.5 A5:.5 G5:.5 F5:.5 E5:1 C5:1 C5:1 G4:1 C5:2 C5:1 G4:1 C5:2' },
    arroz: { nombre: 'Arroz con leche', autor: 'canción tradicional', emoji: '🍚', bpm: 112, bar: 4, beat: 'suave', inst: 'piano', estrellas: 8, cielo: ['#ffd0e6', '#fff0f7', 20],
      chords: 'C C G C C C G C',
      mel: 'G4:1 C5:1 C5:1 E5:1 D5:1 C5:1 D5:2 G4:1 B4:1 B4:1 D5:1 C5:1 B4:1 C5:2 G4:1 C5:1 C5:1 E5:1 D5:1 C5:1 D5:1 E5:1 F5:1 E5:1 D5:1 B4:1 C5:4' },
    cucu: { nombre: 'Cucú cantaba la rana', autor: 'canción tradicional', emoji: '🐸', bpm: 104, bar: 4, beat: 'suave', inst: 'celesta', estrellas: 12, cielo: ['#7fd6a8', '#d8f7e6', 15],
      chords: 'C C G C C C G C',
      mel: 'G5:1 E5:2 R:1 G5:1 E5:2 R:1 G5:.5 G5:.5 F5:.5 E5:.5 D5:1 C5:2 R:1 D5:.5 D5:.5 E5:.5 F5:.5 G5:2 R:1 G5:1 E5:2 R:1 G5:1 E5:2 R:1 G5:.5 G5:.5 F5:.5 E5:.5 D5:1 C5:3' },
    cucaracha: { nombre: 'La cucaracha', autor: 'canción tradicional', emoji: '🪳', bpm: 150, bar: 4, beat: 'baile', inst: 'synth', estrellas: 18, cielo: ['#ff9a3c', '#ffe08a', 20],
      chords: 'F F C7 C7 C7 C7 F F',
      mel: 'C5:.5 C5:.5 C5:.5 F5:1.5 A5:1 R:.5 C5:.5 C5:.5 C5:.5 F5:1.5 A5:1 R:.5 F5:1 F5:.5 E5:.5 E5:.5 D5:.5 D5:.5 C5:2.5 R:.5 C5:.5 C5:.5 C5:.5 E5:1.5 G5:1 R:.5 C5:.5 C5:.5 C5:.5 E5:1.5 G5:1 R:.5 C6:1 D6:.5 C6:.5 Bb5:.5 A5:.5 G5:.5 F5:2.5' },
    primavera: { nombre: 'La primavera', autor: 'Vivaldi', emoji: '🌸', bpm: 104, bar: 4, beat: 'pop', inst: 'cuerdas', estrellas: 25, cielo: ['#a6e3a1', '#fff3b0', 30],
      chords: 'E E B E E E B E',
      mel: 'E5:1 G#5:.5 G#5:.5 G#5:.5 F#5:.25 E5:.25 B5:2 B5:.5 A5:.25 G#5:.25 G#5:.5 G#5:.5 G#5:.5 F#5:.25 E5:.25 B5:2 B5:.5 A5:.25 G#5:.25 G#5:.5 A5:.5 B5:.5 A5:.5 G#5:1 F#5:1 E5:2' },
    serenata: { nombre: 'Pequeña serenata nocturna', autor: 'Mozart', emoji: '🌙', bpm: 120, bar: 4, beat: 'pop', inst: 'cuerdas', estrellas: 35, cielo: ['#22235e', '#6a5ac9', 110],
      chords: 'G G G D7 D7 D7 D7 G',
      mel: 'G5:1 R:.5 D5:.5 G5:1 R:.5 D5:.5 G5:.5 D5:.5 G5:.5 B5:.5 D6:2 C6:1 R:.5 A5:.5 C6:1 R:.5 A5:.5 C6:.5 A5:.5 F#5:.5 A5:.5 D5:2 G5:1 G5:.5 B5:.5 A5:.5 G5:.5 F#5:.5 E5:.5 D5:2' },
    habanera: { nombre: 'Habanera', autor: 'Bizet', emoji: '🌹', bpm: 96, bar: 4, beat: 'baile', inst: 'piano', estrellas: 45, cielo: ['#5a0f2e', '#d64b6e', 40],
      chords: 'Dm Dm A7 A7 A7 A7 Dm Dm',
      mel: 'D5:1.5 C#5:.5 C5:1 C5:.5 B4:.5 Bb4:1 A4:.5 Ab4:.5 G4:.5 F4:.5 E4:1 F4:.5 G4:.5 A4:1.5 G4:.5 F4:1 F4:.5 E4:.5 D4:3 R:1' },
    gruta: { nombre: 'En la gruta del rey de la montaña', autor: 'Grieg', emoji: '⛰️', bpm: 132, bar: 4, beat: 'pop', inst: 'piano', estrellas: 55, cielo: ['#0f2b1f', '#3f7a52', 25],
      chords: 'Bm Bm F# F# Bm Bm F# Bm',
      mel: 'B3:.5 C#4:.5 D4:.5 E4:.5 F#4:.5 D4:.5 F#4:1 F4:.5 C#4:.5 F4:1 E4:.5 C4:.5 E4:1 B3:.5 C#4:.5 D4:.5 E4:.5 F#4:.5 D4:.5 F#4:.5 B4:.5 A4:.5 F#4:.5 D4:.5 F#4:.5 A4:2' },
    // del plan Familia
    cancan: { nombre: 'Can-can', autor: 'Offenbach', emoji: '💃', bpm: 152, bar: 4, beat: 'baile', inst: 'synth', estrellas: 0, familia: true, cielo: ['#ff4f9a', '#ffd36b', 60],
      chords: 'C G7 G7 C C G7 G7 C',
      mel: 'C5:1 C5:.5 D5:.5 F5:.5 E5:.5 D5:.5 G5:.5 G5:.5 G5:.5 A5:.5 E5:.5 F5:.5 D5:.5 D5:.5 D5:.5 F5:.5 E5:.5 D5:.5 C5:.5 C6:.5 B5:.5 A5:.5 G5:.5 F5:.5 E5:.5 D5:.5 C5:2' },
    danubio: { nombre: 'El Danubio azul', autor: 'J. Strauss', emoji: '🌊', bpm: 168, bar: 3, beat: 'vals', inst: 'cuerdas', estrellas: 0, familia: true, cielo: ['#1c4fa8', '#9fd3ff', 50],
      chords: 'C C C C G7 G7 G7 G7 G7 G7 G7 G7 C C C C',
      mel: 'C4:1 C4:1 E4:1 G4:1 G4:2 G5:2 R:1 G5:2 R:1 E5:2 R:1 E5:2 R:1 C4:1 C4:1 E4:1 G4:1 G4:2 G5:2 R:1 G5:2 R:1 F5:2 R:1 F5:2 R:1 B3:1 B3:1 D4:1 A4:1 A4:2 A5:2 R:1 A5:2 R:1 F5:2 R:1 F5:2 R:1' },
    turca: { nombre: 'Marcha turca', autor: 'Mozart', emoji: '🥁', bpm: 112, bar: 4, beat: 'baile', inst: 'piano', estrellas: 0, familia: true, cielo: ['#3a1260', '#c264ff', 80],
      chords: 'Am Am Am E Am Am E Am',
      mel: 'B4:.25 A4:.25 G#4:.25 A4:.25 C5:1 D5:.25 C5:.25 B4:.25 C5:.25 E5:1 F5:.25 E5:.25 D#5:.25 E5:.25 B5:.25 A5:.25 G#5:.25 A5:.25 B5:.25 A5:.25 G#5:.25 A5:.25 C6:2 A5:.5 C6:.5 B5:.5 A5:.5 G5:.5 A5:.5 B5:.5 A5:.5 G5:.5 A5:.5 B5:.5 A5:.5 G5:.5 F#5:.5 E5:2' },
  };
  Object.entries(EXTRA).forEach(([id, s]) => { if (!J.SONGS[id]) J.SONGS[id] = preparar(s); });
  window.CANCIONES_EXTRA = Object.keys(EXTRA);
})();
