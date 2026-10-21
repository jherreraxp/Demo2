/**
 * Avelu y Amara — copia de seguridad en Google Drive.
 *
 * Guarda y trae una copia (progreso, personajes inventados, mundos construidos, jueguitos mágicos)
 * en una carpeta "Avelu y Amara" de TU Drive, y anota cada copia en una hoja de cálculo.
 *
 * Cómo instalarlo: mira gas/LEEME.md. Resumen:
 *   1. script.google.com → Proyecto nuevo → pega este archivo.
 *   2. Cambia CLAVE_INICIAL por una clave tuya y ejecuta la función configurar() una vez.
 *   3. Implementar → Nueva implementación → Aplicación web → Ejecutar como: yo · Acceso: cualquier persona.
 *   4. Copia la dirección (…/exec) y la clave en el admin del juego.
 */

const CLAVE_INICIAL = 'cambia-esta-clave';   // ← pon aquí tu clave y ejecuta configurar()
const CARPETA = 'Avelu y Amara';
const HOJA = 'Avelu y Amara - copias';
const MAX_COPIAS = 30;                        // las copias más viejas se mandan a la papelera

function configurar() {
  if (!CLAVE_INICIAL || CLAVE_INICIAL === 'cambia-esta-clave') throw new Error('Primero cambia CLAVE_INICIAL por una clave tuya.');
  PropertiesService.getScriptProperties().setProperty('CLAVE', CLAVE_INICIAL);
  carpeta_(); hoja_();
  Logger.log('Listo. Carpeta y hoja creadas en tu Drive. Ahora publica el script como aplicación web.');
}

function doGet(e) {
  return responder_(atender_({ clave: e.parameter.clave, accion: e.parameter.accion || 'ping' }));
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData && e.postData.contents || '{}'); } catch (err) { return responder_({ ok: false, error: 'Lo que llegó no se entiende.' }); }
  return responder_(atender_(body));
}

function atender_(body) {
  const clave = PropertiesService.getScriptProperties().getProperty('CLAVE');
  if (!clave) return { ok: false, error: 'Falta ejecutar configurar() en el Apps Script.' };
  if (body.clave !== clave) return { ok: false, error: 'La clave secreta no coincide.' };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (body.accion === 'ping') return { ok: true, ultima: ultimaFecha_() };
    if (body.accion === 'guardar') return guardar_(body.datos || {}, body.dispositivo || '');
    if (body.accion === 'cargar') return cargar_();
    return { ok: false, error: 'No conozco esa acción.' };
  } finally {
    lock.releaseLock();
  }
}

function guardar_(datos, dispositivo) {
  const ahora = new Date();
  const texto = JSON.stringify({ fecha: ahora.toISOString(), datos: datos });
  const dir = carpeta_();
  const nombre = 'copia-' + Utilities.formatDate(ahora, Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm') + '.json';
  const archivo = dir.createFile(nombre, texto, MimeType.PLAIN_TEXT);
  // "ultima.json" siempre tiene la copia más nueva
  const ult = dir.getFilesByName('ultima.json');
  if (ult.hasNext()) ult.next().setContent(texto); else dir.createFile('ultima.json', texto, MimeType.PLAIN_TEXT);
  hoja_().appendRow([ahora, nombre, Math.round(texto.length / 1024) + ' KB', Object.keys(datos).join(', '), String(dispositivo).slice(0, 80), archivo.getUrl()]);
  limpiar_(dir);
  return { ok: true, archivo: nombre, fecha: ahora.toISOString() };
}

function cargar_() {
  const it = carpeta_().getFilesByName('ultima.json');
  if (!it.hasNext()) return { ok: false, error: 'Todavía no hay ninguna copia en Drive.' };
  const copia = JSON.parse(it.next().getBlob().getDataAsString());
  return { ok: true, fecha: copia.fecha, datos: copia.datos || {} };
}

function ultimaFecha_() {
  const it = carpeta_().getFilesByName('ultima.json');
  if (!it.hasNext()) return null;
  try { return JSON.parse(it.next().getBlob().getDataAsString()).fecha; } catch (e) { return null; }
}

function carpeta_() {
  const it = DriveApp.getFoldersByName(CARPETA);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA);
}

function hoja_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('HOJA_ID');
  if (id) { try { return SpreadsheetApp.openById(id).getSheets()[0]; } catch (e) {} }
  const ss = SpreadsheetApp.create(HOJA);
  DriveApp.getFileById(ss.getId()).moveTo(carpeta_());
  const sh = ss.getSheets()[0];
  sh.appendRow(['Fecha', 'Archivo', 'Tamaño', 'Qué tiene', 'Aparato', 'Enlace']);
  sh.setFrozenRows(1);
  props.setProperty('HOJA_ID', ss.getId());
  return sh;
}

function limpiar_(dir) {
  const copias = [];
  const it = dir.getFiles();
  while (it.hasNext()) { const f = it.next(); if (/^copia-.*\.json$/.test(f.getName())) copias.push(f); }
  copias.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  copias.slice(MAX_COPIAS).forEach(function (f) { f.setTrashed(true); });
}

function responder_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
