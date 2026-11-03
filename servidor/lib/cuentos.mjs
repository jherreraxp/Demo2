// Cuentos: fábulas de Esopo contadas con palabras sencillas (carpeta cuentos/) y cuentos con IA.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.mjs';
import { db } from './db.mjs';
import { ErrorUsuario, aleatorio, log } from './util.mjs';

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
  const nombres = (Array.isArray(protagonistas) ? protagonistas : []).map(n => limpia(n, 24)).filter(Boolean).slice(0, 4);
  if (!nombres.length) throw new ErrorUsuario('Dime al menos un nombre para el cuento.');
  const temaL = limpia(tema, 120), moralejaL = limpia(moraleja, 120);
  const dia = new Date().toISOString().slice(0, 10);
  const hechos = db.prepare('SELECT COUNT(*) AS n FROM cuentos_ia WHERE cuenta_id = ? AND dia = ?').get(cuentaId, dia).n;
  if (hechos >= config.limiteIaDia) throw new ErrorUsuario(`Hoy ya creaste ${config.limiteIaDia} cuentos. ¡Mañana hay más!`, 429);
  let cuento;
  if (config.iaFalsa) cuento = cuentoFalso(nombres, temaL);
  else {
    if (!config.anthropicKey) throw new ErrorUsuario('Los cuentos con IA aún no están configurados.', 503);
    const pedido = `Protagonistas: ${nombres.join(', ')}.` + (temaL ? ` Tema: ${temaL}.` : '') + (moralejaL ? ` Moraleja deseada: ${moralejaL}.` : '');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: AbortSignal.timeout(60000),
      headers: { 'x-api-key': config.anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: config.claudeModel, max_tokens: 1500, system: SISTEMA, messages: [{ role: 'user', content: pedido }] }),
    });
    if (!r.ok) { log('ia_error', { status: r.status }); throw new ErrorUsuario('La magia de los cuentos está cansada. Prueba en un rato.', 502); }
    const j = await r.json();
    const texto = (j.content || []).map(b => b.text || '').join('');
    const m = texto.match(/\{[\s\S]*\}/);
    try { cuento = JSON.parse(m ? m[0] : texto); } catch (e) { cuento = null; }
  }
  const ok = validar(cuento);
  if (!ok) throw new ErrorUsuario('No salió bien el cuento. Prueba otra vez.', 502);
  const id = 'ia_' + aleatorio(8);
  db.prepare('INSERT INTO cuentos_ia (id, cuenta_id, datos, dia, creado) VALUES (?, ?, ?, ?, ?)').run(id, cuentaId, JSON.stringify(ok), dia, new Date().toISOString());
  return { ...ok, id, premium: true, ia: true, bloqueado: false };
}
