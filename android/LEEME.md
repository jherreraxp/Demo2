# App Android de Avelu y Amara (APK)

Esta carpeta arma un APK que abre el juego (`https://abu.arcillita.com`) a pantalla completa, con su ícono,
como una app más del celular. Está hecha con [Capacitor](https://capacitorjs.com) 7.

**El juego no va dentro del APK**: la app carga siempre la versión publicada, así que no hace falta
reinstalarla cuando el juego cambia. Sin internet muestra `www/index.html` ("Sin conexión") y, si ya se
jugó antes, lo que guardó el modo sin conexión (`sw.js`).

## Cómo se construye

No hace falta instalar nada: lo hace GitHub.

1. En GitHub → **Actions** → **Construir APK** → **Run workflow** (también corre sola al cambiar algo en `android/`).
2. Tarda unos 5–8 minutos. Al terminar, el APK queda en:
   - **Releases → `apk` → `AveluYAmara.apk`**
     (<https://github.com/jherreraxp/Demo2/releases/download/apk/AveluYAmara.apk>): es el enlace de `app.html`.
   - y como *artifact* de esa corrida.

En una compu (opcional): Node 20+, Java 21 y el SDK de Android →
`bash android/preparar.sh && cd android/android && ./gradlew assembleRelease`.

## Qué hay aquí

| Archivo | Para qué |
|---|---|
| `capacitor.config.json` | Nombre, id (`com.arcillita.abu`), dirección del juego y sitios permitidos. |
| `package.json`, `package-lock.json` | Versiones fijas de Capacitor y del plugin de voz. |
| `www/index.html` | Página "Sin conexión" que va dentro del APK. |
| `res/` | Ícono y pantalla de inicio ya dibujados para todos los tamaños. |
| `preparar.sh` | Genera el proyecto Android (`android/android/`, no se guarda en el repositorio) y le pone ícono, permisos, versión y firma. |
| `avelu-apk.keystore` | Llave de firma **de prueba** (ver abajo). |

## La llave de firma (`avelu-apk.keystore`) — léelo

- Es una llave **pública, de prueba**, guardada a propósito en el repositorio: alias `avelu`, contraseña `aveluapp`,
  válida 30 años. Android exige que todos los APK estén firmados y que las actualizaciones lleven **la misma firma**;
  con la llave fija, una versión nueva se instala encima de la anterior sin desinstalar.
- Sirve para **instalar el APK a mano** (familia, pruebas). **No sirve para Google Play**: cualquiera que vea este
  repositorio podría firmar con ella. Para publicar en Play Store hay que crear otra llave **privada**, guardarla
  como *secret* de GitHub (nunca en el repositorio) y usar Play App Signing.
- No es una contraseña de ningún servicio: no da acceso a cuentas, servidores ni pagos.
- Huella SHA-256: `29:40:8E:0D:CC:7E:B3:E5:57:73:94:25:A0:1A:FE:BE:2E:74:19:FE:7D:95:9E:AB:BB:FF:7A:FB:90:02:18:99`

## Cosas a saber

- **Entrar con Google** no funciona dentro del APK (Google bloquea el inicio de sesión en apps que solo muestran
  una web). En la app se entra con **correo y contraseña**.
- **Voz**: el WebView de Android no trae la voz del navegador; la app usa la voz del teléfono con el plugin
  `@capacitor-community/text-to-speech` (lo conecta `js/pwa.js`). Las voces grabadas suenan igual que en la web.
- **Micrófono**: el APK pide el permiso la primera vez que se graba en el Estudio de voz.
- La app se reconoce porque su navegador se identifica con `AveluApp` (`window.PWA.esApk()`).
- Alternativa sin APK (también en iPhone): "Instalar" desde el navegador (PWA). Ver `app.html`.
