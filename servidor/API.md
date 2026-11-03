# Servidor de Avelu y Amara — contrato de la API

El juego (GitHub Pages, https) habla con el servidor de la VM por HTTPS y WebSocket seguro.
La dirección del servidor se configura en el admin (`localStorage 'bl-servidor'`, por ejemplo
`https://juego.midominio.com`). Todas las respuestas son JSON `{ ok: true, ... }` o `{ ok: false, error: 'texto en español' }`.

## Cuentas (las crea un adulto; los niños son perfiles dentro de la familia)

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| POST | `/api/registro` | `{ email, clave, nombre, acepto: true }` (acepto = términos y privacidad, adulto mayor de 18) | `{ ok, token, cuenta }` |
| POST | `/api/entrar` | `{ email, clave }` | `{ ok, token, cuenta }` |
| GET | `/api/config` | — | `{ ok, googleClientId, pagos, precio, moneda }` (público) |
| POST | `/api/google` | `{ credential, acepto? }` (ID token de Google Identity Services) | `{ ok, token, cuenta }` o, la primera vez sin `acepto`, `{ ok: false, necesitaAcepto: true, email, nombre }` |
| POST | `/api/salir` | — | `{ ok }` |
| GET | `/api/yo` | — | `{ ok, cuenta }` |
| PUT | `/api/perfiles` | `{ perfiles: [{ id, nombre, personaje }] }` (máx. 6) | `{ ok, cuenta }` |
| PUT | `/api/progreso` | `{ datos }` (JSON del progreso del juego, máx. 512 KB) | `{ ok }` |
| GET | `/api/progreso` | — | `{ ok, datos }` |
| DELETE | `/api/cuenta` | `{ clave }` (o `{ confirmo: 'BORRAR' }` si la cuenta es solo de Google) | `{ ok }` (borra la cuenta y todos sus datos) |

Autenticación: cabecera `Authorization: Bearer <token>`.
`cuenta = { id, email, nombre, perfiles: [...], plan: 'gratis' | 'familia', planHasta: ISO | null, google: bool, conClave: bool }`.

## Suscripción (plan "familia", mensual)

| Método | Ruta | Respuesta |
|---|---|---|
| POST | `/api/suscripcion/crear` | `{ ok, url }` → abrir `url` (página de pago del proveedor) |
| POST | `/api/suscripcion/cancelar` | `{ ok }` (sigue con plan familia hasta el fin del mes pagado) |
| POST | `/api/suscripcion/revisar` | `{ ok, cuenta }` (al volver de la página de pago: consulta el estado al proveedor) |
| POST | `/api/pagos/webhook` | (lo llama el proveedor de pagos; el servidor verifica consultando la API del proveedor) |

Lo pagado (`plan: 'familia'`):
- **Voces propias en la nube**: `PUT /api/voces/<clave>` (cuerpo = audio WAV/WebM, máx. 1 MB), `GET /api/voces` → `{ ok, lista: { clave: url } }`,
  `GET /api/voces/archivo/<id>` (con token en la cabecera o `?token=` para usarlo en `<audio src>`) → audio, `DELETE /api/voces/<clave>`. Las voces son privadas de cada familia.
- **Cuentos extra**: `GET /api/cuentos` → `{ ok, cuentos: [{ id, titulo, emoji, premium, paginas: [{ texto, dibujo }] }] }`
  (los gratis también salen sin cuenta; los premium salen con `bloqueado: true` y `paginas: []` si no hay plan familia).
- **Cuentos con IA y sus nombres**: `POST /api/cuentos/ia` `{ protagonistas: ['Avelu', 'Papá'], tema, moraleja? }` → `{ ok, cuento }`
  (máx. 5 por día por familia; el servidor usa su propia llave de IA guardada en la VM).

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

## Otros

- `GET /api/salud` → `{ ok, version }`.
- Errores: 400 datos, 401 sin sesión, 402 necesita plan familia, 404, 409 correo ya usado, 413 muy grande, 415 tipo, 429 muchos intentos, 502/503 servicio externo.
