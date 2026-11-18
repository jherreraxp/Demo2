# Servidor de Avelu y Amara — contrato de la API

El juego (GitHub Pages, https) habla con el servidor de la VM por HTTPS y WebSocket seguro.
La dirección del servidor se configura en el admin (`localStorage 'bl-servidor'`, por ejemplo
`https://juego.midominio.com`). Todas las respuestas son JSON `{ ok: true, ... }` o `{ ok: false, error: 'texto en español' }`.

## Cuentas (las crea un adulto; los niños son perfiles dentro de la familia)

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| POST | `/api/registro` | `{ email, clave, nombre, acepto: true }` (acepto = términos y privacidad, adulto mayor de 18) | `{ ok, token, cuenta }` |
| POST | `/api/entrar` | `{ email, clave }` | `{ ok, token, cuenta }` |
| GET | `/api/config` | — | `{ ok, googleClientId, pagos, precio, moneda, ia: { disponible, proveedor, nombre, modelo } }` (público; nunca incluye llaves) |
| POST | `/api/google` | `{ credential, acepto? }` (ID token de Google Identity Services) | `{ ok, token, cuenta }` o, la primera vez sin `acepto`, `{ ok: false, necesitaAcepto: true, email, nombre }` |
| POST | `/api/adulto` | `{ clave }` o `{ credential }` (ID token de Google de la **misma** cuenta) | `{ ok, adultoToken, hasta }` — pase de adulto de 30 min (ver abajo) |
| POST | `/api/salir` | — | `{ ok }` |
| GET | `/api/yo` | — | `{ ok, cuenta }` |
| PUT | `/api/perfiles` | `{ perfiles: [{ id, nombre, personaje }] }` (máx. 6) | `{ ok, cuenta }` |
| PUT | `/api/progreso` | `{ datos }` (JSON del progreso del juego, máx. 512 KB) | `{ ok }` |
| GET | `/api/progreso` | — | `{ ok, datos }` |
| DELETE | `/api/cuenta` | `{ clave }` (o `{ confirmo: 'BORRAR' }` si la cuenta es solo de Google) | `{ ok }` (borra la cuenta y todos sus datos) |

Autenticación: cabecera `Authorization: Bearer <token>`.
`cuenta = { id, email, nombre, perfiles: [...], plan: 'gratis' | 'familia', planHasta: ISO | null, google: bool, conClave: bool, foto, superadmin?: true }`
(`superadmin` solo aparece si el correo está en `SUPERADMIN_EMAILS`). Una cuenta bloqueada recibe `403` al entrar y `401` con sus sesiones viejas.

### Pase de adulto (modo papá con la cuenta, y panel)

`POST /api/adulto` necesita la sesión y vuelve a pedir la contraseña o un ID token de Google cuyo `sub` (o correo, si la cuenta
aún no está unida a Google) sea el de esa cuenta. Devuelve `adultoToken` (firmado con HMAC-SHA256 con un secreto que vive en
`DATA_DIR/secreto.key` o en `SECRETO`; atado a la cuenta; vence en 30 min). Máximo 8 intentos cada 10 min por cuenta.
Los errores de esta ruta y los de `/api/admin/*` por falta de pase llevan `codigo: 'adulto'` (la sesión sigue siendo válida).
En el juego: el teclado del PIN sigue siendo la entrada principal; debajo aparece «o entra con tu cuenta (Gmail o contraseña)»,
que pide este pase y abre la misma ventana de 30 minutos (`sessionStorage 'bl-admin'`; el pase queda en `'bl-adulto'`).

## Suscripción (plan "familia", mensual)

| Método | Ruta | Respuesta |
|---|---|---|
| POST | `/api/suscripcion/crear` | `{ ok, url }` → abrir `url` (página de pago del proveedor) |
| POST | `/api/suscripcion/cancelar` | `{ ok }` (sigue con plan familia hasta el fin del mes pagado) |
| POST | `/api/suscripcion/revisar` | `{ ok, cuenta }` (al volver de la página de pago: consulta el estado al proveedor) |
| POST | `/api/pagos/webhook` | (lo llama el proveedor de pagos; el servidor verifica consultando la API del proveedor) |

Si el proveedor rechaza la suscripción, `crear` responde `502 { error }` con un mensaje claro en español según lo que dijo Mercado Pago
(misma cuenta que cobra, credenciales de prueba, `MP_BACK_URL`, `MP_PLAN_PRECIO`/`MP_MONEDA=PEN`, Access Token sin permisos…). El detalle
(sin correos ni tokens) queda como «último error de pagos» y se ve en el panel → Pagos. Con un token `TEST-` y `MP_PAYER_PRUEBA`, el
comprador es ese usuario de prueba. Si `MP_BACK_URL` sigue apuntando a github.io y el juego se abre desde el dominio propio, se vuelve a
`https://<dominio>/suscripcion-lista.html`.

Lo pagado (`plan: 'familia'`):
- **Voces propias en la nube**: `PUT /api/voces/<clave>` (cuerpo = audio WAV/WebM, máx. 1 MB), `GET /api/voces` → `{ ok, lista: { clave: url } }`,
  `GET /api/voces/archivo/<id>` (con token en la cabecera o `?token=` para usarlo en `<audio src>`) → audio, `DELETE /api/voces/<clave>`. Las voces son privadas de cada familia.
- **Cuentos extra**: `GET /api/cuentos` → `{ ok, cuentos: [{ id, titulo, emoji, premium, paginas: [{ texto, dibujo }] }] }`
  (los gratis también salen sin cuenta; los premium salen con `bloqueado: true` y `paginas: []` si no hay plan familia).
- **Cuentos con IA y sus nombres**: `POST /api/cuentos/ia` `{ protagonistas: ['Avelu', 'Papá'], tema, moraleja? }` → `{ ok, cuento }`
  (máx. `IA_LIMITE_DIARIO` por día por familia, 10 por defecto; el servidor usa su propia llave guardada en la VM, de cualquier proveedor:
  Claude, Gemini, OpenAI u otro compatible con OpenAI. A la IA solo se envían los apodos y el tema, sin correos ni otros datos.
  Si no hay IA configurada o el proveedor falla: `503 { error: 'Los cuentos mágicos no están disponibles ahora' }`).

## Jugar en línea (Construye tu Mundo)

WebSocket `wss://<servidor>/ws?token=<token>` (se necesita cuenta; gratis).

Mensajes (JSON) del cliente:
- `{ t: 'crear' }` → crea una sala; respuesta `{ t: 'sala', codigo: 'GATO-42', yo: <idJugador> }`
- `{ t: 'unirse', codigo }` → `{ t: 'sala', codigo, yo, mundo, jugadores: [...] }` o `{ t: 'error', error }`
- `{ t: 'hola', nombre, personaje }` (perfil con el que juega)
- `{ t: 'pos', x, y, z, dir, modo }` (hasta 10 por segundo)
- `{ t: 'mundo', items }` (el mundo completo, al crear la sala; máx. 256 KB)
- `{ t: 'poner', item }` / `{ t: 'borrar', x, y, z }` / `{ t: 'pintar', x, y, z, c }` (cambios al construir)
- `{ t: 'saludo', emoji }` (👋 ❤️ ⭐ 😂)

Mensajes del servidor a los demás de la sala: los mismos con `de: <idJugador>`, más
`{ t: 'entra', jugador: { id, nombre, personaje } }` y `{ t: 'sale', id }`.
Salas: máximo 6 jugadores; se borran 10 minutos después de que sale el último.

## Panel de administración (`panel.html`)

Todas las rutas `/api/admin/*` exigen: sesión (`401`), que el correo esté en `SUPERADMIN_EMAILS` (`403`) y la cabecera
`X-Adulto: <adultoToken>` vigente y de esa misma cuenta (`401` con `codigo: 'adulto'`). El PIN no sirve aquí.
Cada cambio queda en la tabla `auditoria` (quién, cuándo, qué, a quién).

| Método | Ruta | Cuerpo / consulta | Respuesta |
|---|---|---|---|
| GET | `/api/admin/resumen` | — | `{ cuentas: { total, nuevas7, nuevas30, bloqueadas }, activas: { hoy, semana }, familia: { activas, pagando, cortesia }, ingresoMes: { monto, moneda }, cuentosIA: { hoy, mes }, voces: { cantidad, mb }, salas: { salas, jugadores }, uso: { horasHoy, horas7, horas30, dias: [{ dia, minutos, cuentas }] } }` |
| GET | `/api/admin/uso` | `?dias=30` (1–30), `?formato=csv` | `{ dias, cuentas: [{ id, email, nombre, minutos, horas, diasActivos, ninos, juegos, ultimaActividad }], ninos, juegos, total }` o un CSV (`fecha,correo,cuenta,tipo,nombre,minutos,horas`). Sale de `progress.uso` que cada aparato sube con su progreso. |
| GET | `/api/admin/cuentas` | `?q=` (correo o nombre), `?filtro=todas\|familia\|pagando\|gratis\|google\|bloqueadas` | `{ total, cuentas: [...] }` (máx. 500) |
| GET | `/api/admin/cuentas/<id>` | — | `{ cuenta, uso, voces, cuentosIA, sesiones, pagos, auditoria }` |
| POST | `/api/admin/cuentas` | `{ email, nombre, soloGoogle? }` | `{ cuenta, claveTemporal? }` (la contraseña temporal solo se devuelve esta vez) |
| POST | `/api/admin/cuentas/<id>/plan` | `{ plan: 'familia', hasta: 'AAAA-MM-DD', motivo }` o `{ plan: 'gratis', motivo }` | `{ cuenta, aviso? }` |
| POST | `/api/admin/cuentas/<id>/bloquear` | `{ bloqueada: true\|false, motivo? }` | `{ cuenta }` (al bloquear se cierran sus sesiones) |
| POST | `/api/admin/cuentas/<id>/clave` | — | `{ claveTemporal }` (cierra sus sesiones) |
| DELETE | `/api/admin/cuentas/<id>` | `{ email }` (el correo exacto, como confirmación) | `{ ok, aviso? }` |
| GET | `/api/admin/pagos` | — | `{ proveedor, precio, moneda, suscripciones: [{ id, email, estado, proveedor, monto, moneda, proxima }], eventos, ultimoError }` |
| POST | `/api/admin/pagos/revisar/<id>` | — | `{ cuenta }` (consulta el estado al proveedor) |
| POST | `/api/admin/pagos/cancelar/<id>` | — | `{ cuenta }` |
| GET | `/api/admin/pagos/diagnostico` | — | `{ diagnostico: { configurado, tipoToken: 'prueba'\|'producción', tokenValido, siteId, paisOk (debe ser MPE), precio, moneda, backUrl, firmaWebhook, payerPrueba, ultimoError } }` (nunca devuelve el token) |
| GET | `/api/admin/salud` | — | `{ version, node, encendidoSeg, memoriaMB, ia, pagos, google, datos: { mb, archivos }, disco, respaldo, salas, cuentas, sesiones }` |
| GET | `/api/admin/auditoria` | `?limite=200` | `{ registros: [{ cuando, quien, accion, objetivo, detalle }] }` |

No se puede bloquear ni borrar desde el panel a quien administra el servicio.

## Otros

- `GET /api/salud` → `{ ok, version, ia: { disponible, proveedor, nombre, modelo } }`.
- Errores: 400 datos, 401 sin sesión (o sin pase de adulto, con `codigo: 'adulto'`), 402 necesita plan familia, 403 cuenta bloqueada o sin permiso, 404, 409 correo ya usado, 413 muy grande, 415 tipo, 429 muchos intentos, 502/503 servicio externo.
