// Cuentos: fábulas de Esopo contadas con palabras sencillas (carpeta cuentos/) y cuentos con IA.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.mjs';
import { db } from './db.mjs';
import { ErrorUsuario, aleatorio, log } from './util.mjs';
import { configIA, completar, extraerJSON, ErrorIA, tapar } from './ia.mjs';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'cuentos');
export const CUENTOS = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()
  .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));

export function listaCuentos(esFamilia, cuentaId) {
  const base = CUENTOS.map(c => (c.premium && !esFamilia)
    ? { id: c.id, titulo: c.titulo, emoji: c.emoji, premium: true, bloqueado: true, paginas: [] }
    : { ...c, bloqueado: false });
  const propios = cuentaId && esFamilia
    ? db.prepare('SELECT id, datos FROM cuentos_ia WHERE cuenta_id = ? ORDER BY creado DESC LIMIT 50').all(cuentaId)
      .map(r => ({ ...JSON.parse(r.datos), id: r.id, premium: true, ia: true, bloqueado: false }))
    : [];
  return [...propios, ...base];
}

const SISTEMA = `Eres una cuentacuentos para una niña de 4 años de Perú que está aprendiendo a leer con el método fonético-silábico.
Escribe un cuento ORIGINAL, tierno y alegre, en español sencillo de Perú.
Reglas:
- 6 a 8 páginas. Cada página tiene 1 o 2 oraciones muy cortas (máximo 12 palabras por página).
- Usa sobre todo palabras de 2 y 3 sílabas que una niña pueda leer (mamá, casa, luna, pato, sapo, gato…).
- Los protagonistas son las personas que te nombran; trátalos con cariño.
- Nada de miedo, violencia, peligros, burlas, marcas ni personajes con derechos de autor.
- Termina con una moraleja amable y corta.
- Cada página lleva un solo emoji como "dibujo".
Responde SOLO con JSON válido, sin texto antes ni después, con esta forma exacta:
{"titulo": "...", "emoji": "...", "paginas": [{"texto": "...", "dibujo": "..."}], "moraleja": "..."}`;

const limpia = (s, max) => String(s || '').replace(/[<>]/g, '').trim().slice(0, max);
// privacidad: a la IA solo van apodos y el tema, sin correos, teléfonos ni números largos
const sinDatos = s => String(s || '')
  .replace(/[^\s@]+@[^\s@]+/g, '').replace(/\+?\d[\d\s().-]{5,}\d/g, '').replace(/https?:\/\/\S+/g, '')
  .replace(/[<>{}\[\]`]/g, '').replace(/\s+/g, ' ').trim();
const NO_DISPONIBLE = 'Los cuentos mágicos no están disponibles ahora';
function validar(c) {
  if (!c || typeof c !== 'object' || !Array.isArray(c.paginas)) return null;
  const paginas = c.paginas.slice(0, 10).map(p => ({ texto: limpia(p?.texto, 200), dibujo: limpia(p?.dibujo, 8) || '⭐' })).filter(p => p.texto);
  if (paginas.length < 3 || !limpia(c.titulo, 80)) return null;
  return { titulo: limpia(c.titulo, 80), emoji: limpia(c.emoji, 8) || '📖', paginas, moraleja: limpia(c.moraleja, 200) };
}
function cuentoFalso(nombres, tema) {
  const [a = 'Avelu', b = 'Papá'] = nombres;
  return {
    titulo: `${a} y la luna`, emoji: '🌙',
    paginas: [
      { texto: `${a} mira la luna.`, dibujo: '🌙' }, { texto: `${b} toma su mano.`, dibujo: '🤝' },
      { texto: `Van a la loma${tema ? ' con ' + tema : ''}.`, dibujo: '⛰️' }, { texto: 'La luna sonríe.', dibujo: '😊' },
      { texto: `${a} dice: ¡hola, luna!`, dibujo: '👋' }, { texto: 'Y se van a casa a dormir.', dibujo: '🏠' },
    ],
    moraleja: 'Juntos todo es más bonito.',
  };
}

export async function crearCuentoIA(cuentaId, { protagonistas, tema, moraleja }) {
  const nombres = (Array.isArray(protagonistas) ? protagonistas : []).map(n => sinDatos(n).slice(0, 24)).filter(Boolean).slice(0, 4);
  if (!nombres.length) throw new ErrorUsuario('Dime al menos un nombre para el cuento.');
  const temaL = sinDatos(tema).slice(0, 80), moralejaL = sinDatos(moraleja).slice(0, 80);
  const ia = configIA();
  if (!ia.disponible) throw new ErrorUsuario(NO_DISPONIBLE, 503);
  const dia = new Date().toISOString().slice(0, 10);
  const hechos = db.prepare('SELECT COUNT(*) AS n FROM cuentos_ia WHERE cuenta_id = ? AND dia = ?').get(cuentaId, dia).n;
  if (hechos >= config.limiteIaDia) throw new ErrorUsuario(`Hoy ya creaste ${config.limiteIaDia} cuentos. ¡Mañana hay más!`, 429);
  let cuento;
  if (ia.falsa) cuento = cuentoFalso(nombres, temaL);
  else {
    const pedido = `Protagonistas: ${nombres.join(', ')}.` + (temaL ? ` Tema: ${temaL}.` : '') + (moralejaL ? ` Moraleja deseada: ${moralejaL}.` : '');
    try {
      cuento = extraerJSON(await completar(ia, { sistema: SISTEMA, usuario: pedido, json: true }));
    } catch (e) {
      log('ia_error', { proveedor: ia.proveedor, tipo: e instanceof ErrorIA ? e.tipo : 'otro', status: e.status || 0, msg: tapar(e.message, ia.key) });
      throw new ErrorUsuario(NO_DISPONIBLE, 503);
    }
  }
  const ok = validar(cuento);
  if (!ok) { log('ia_error', { proveedor: ia.proveedor, tipo: 'formato' }); throw new ErrorUsuario('No salió bien el cuento. Prueba otra vez.', 502); }
  const id = 'ia_' + aleatorio(8);
  db.prepare('INSERT INTO cuentos_ia (id, cuenta_id, datos, dia, creado) VALUES (?, ?, ?, ?, ?)').run(id, cuentaId, JSON.stringify(ok), dia, new Date().toISOString());
  return { ...ok, id, premium: true, ia: true, bloqueado: false };
}
