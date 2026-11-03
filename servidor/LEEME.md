# Servidor de Avelu y Amara (para la VM de Oracle)

El juego sigue publicado gratis en GitHub Pages. Este servidor agrega:

- **Cuentas de familia**: las crea un adulto (correo + clave). Los niños son *perfiles* dentro de la cuenta (solo primer nombre y personaje).
- **Jugar en línea** en "Construye tu Mundo": salas con código (por ejemplo `GATO-42`), hasta 6 jugadores.
- **Plan familia (suscripción mensual)**: voces propias guardadas en privado, 9 fábulas extra y cuentos con IA con los nombres de los niños o de papá.
- **Cuentos**: 12 fábulas de Esopo (dominio público) contadas con palabras sencillas; 3 son gratis.

La API está en [API.md](API.md).

## Qué necesitas

1. **La VM** (la "Always Free" de Oracle sirve: 1 GB de RAM o una Ampere ARM). Ubuntu 22.04/24.04 u Oracle Linux 8/9.
2. **Un dominio** que apunte a la IP pública de la VM (registro A), por ejemplo `juego.midominio.com`.
   Si no tienes, uno gratis en https://www.duckdns.org (`avelu.duckdns.org`). Se necesita para HTTPS (el juego está en https).
3. **Abrir los puertos 80 y 443 en Oracle Cloud**: *Networking → Virtual Cloud Networks → tu VCN → Security Lists → Default →
   Add Ingress Rules*: origen `0.0.0.0/0`, protocolo TCP, puertos `80` y luego `443`. (El script abre el firewall de dentro de la VM.)
4. **Una cuenta para cobrar** (ver abajo) con sus credenciales.
5. *(Opcional)* Una llave de Anthropic para los cuentos con IA: https://console.anthropic.com (se guarda solo en la VM).

## Instalar (unos 5 minutos)

Entra a la VM por SSH y ejecuta:

```bash
sudo apt-get install -y git || sudo dnf install -y git
git clone -b claude/reading-game-children-zpv3xw https://github.com/jherreraxp/Demo2.git avelu
cd avelu
sudo bash servidor/instalar.sh juego.midominio.com
```

Luego completa la configuración (llaves y pagos) y reinicia:

```bash
sudo nano /etc/avelu/avelu.env
sudo systemctl restart avelu
```

Prueba desde tu compu: `curl https://juego.midominio.com/api/salud` → `{"ok":true,"version":"1.0.0"}`.
Por último, en el juego entra al **admin** y escribe la dirección del servidor: `https://juego.midominio.com`.

Para actualizar después: `cd avelu && sudo bash servidor/actualizar.sh`.
Ver registros: `journalctl -u avelu -f`. Respaldos diarios en `/var/backups/avelu` (se guardan 14 días).

## Cobrar la suscripción mensual

**Stripe no acepta comercios de Perú**, así que las opciones son:

| Servicio | Para qué | Comisión aprox. | Notas |
|---|---|---|---|
| **Mercado Pago** (recomendado en Perú) | Suscripción en soles con tarjetas | ~3.99% + IGV por cobro | Cuenta en mercadopago.com.pe → *Tus integraciones* → credenciales de producción (`MP_ACCESS_TOKEN`). En *Webhooks* pon `https://juego.midominio.com/api/pagos/webhook` y marca "Planes y suscripciones". |
| **PayPal** | Clientes de otros países, en dólares | ~5.4% + 0.30 USD | Cuenta Business, crea una app (Client ID/Secret) y un *plan* mensual (`PAYPAL_PLAN_ID`). Webhook a la misma URL con los eventos `BILLING.SUBSCRIPTION.*`. |
| Culqi / Izipay | Alternativas peruanas | similar | No integradas todavía. |
| Lemon Squeezy / Paddle | Venden por ti y pagan impuestos | 5% + 0.50 USD | Útil si vendes en muchos países; no integradas todavía. |

En `avelu.env`: `PAGOS_PROVEEDOR=mercadopago` (o `paypal`) y sus credenciales. Precio por defecto: `MP_PLAN_PRECIO=19.90` soles.
Tu familia puede tener el plan gratis: `PLAN_GRATIS_PARA=tu-correo@gmail.com`.
El servidor **no confía en el aviso** del proveedor: siempre consulta el estado real de la suscripción a su API.

## Costos

- VM de Oracle "Always Free": 0. Dominio: 0 (DuckDNS) o ~10–15 USD/año.
- Cuentos con IA: cada cuento cuesta unos centavos de dólar en el proveedor de IA (límite: 10 por familia por día, `IA_LIMITE_DIARIO`).
- Comisiones del proveedor de pagos.

## Privacidad de los niños (Ley 29733 de Protección de Datos Personales, Perú)

- La cuenta la crea **un adulto** que acepta los términos y la política de privacidad (consentimiento del padre o la madre).
- De los niños solo se guarda el **primer nombre** y su personaje. Sus grabaciones de voz son **privadas** de la familia
  (no se publican en GitHub) y se borran con la cuenta (`DELETE /api/cuenta`).
- Antes de cobrar a otras familias publica una **política de privacidad** y unos **términos** (qué datos guardas, para qué, cómo borrarlos,
  a quién escribir) y, si vas a tener muchos usuarios, inscribe el banco de datos ante la Autoridad Nacional de Protección de Datos Personales.
- Las llaves (IA, pagos) viven solo en `/etc/avelu/avelu.env` en la VM, nunca en el repositorio.

## Pruebas (en tu compu o la VM)

```bash
cd servidor && npm install && npm test
```

## Si en la VM ya funciona SIGFE (Docker con nginx en 80/443)

No uses `instalar.sh` (pondría Caddy en los mismos puertos). Usa la instalación "junto a SIGFE":

- Desde tu PC con Windows: pon `servidor/Instalar-Avelu.ps1` en la carpeta de tu llave SSH y ejecuta
  `powershell -ExecutionPolicy Bypass -File .\Instalar-Avelu.ps1`. Al final te pregunta (sin mostrarlas) las llaves
  de Mercado Pago y de Claude, y las guarda solo en la VM.
- O en la VM: `bash servidor/instalar-junto-a-sigfe.sh abu.arcillita.com tu@correo.com`.

Qué hace:
- Avelu corre en **su propio contenedor** (`avelu`), en **su propia red de Docker** (`avelu-red`) y con **su propia base
  de datos** (`/var/lib/avelu`). No comparte nada con la base de datos ni la app de SIGFE.
- Al nginx de SIGFE solo se le **agrega** un bloque para `abu.arcillita.com` (marcado con `# --- avelu inicio/fin ---`)
  y se conecta también a `avelu-red`. Antes de cambiarlo guarda una copia `nginx.conf.antes-avelu-FECHA`; si nginx no
  acepta el cambio, deja todo como estaba. Si Avelu se apaga, SIGFE sigue funcionando.
- El certificado de `abu.arcillita.com` se pide con certbot (SIGFE se detiene unos segundos, igual que al renovar el suyo)
  y se renueva solo con los mismos ganchos de SIGFE.
- **Ojo:** si vuelves a correr `Activar-HTTPS.ps1` de SIGFE, ese script reescribe `nginx.conf`; después vuelve a correr
  `Instalar-Avelu.ps1` para agregar otra vez el sitio de Avelu.


## Entrar con Google

Las familias pueden entrar con su cuenta de Google (sin crear otra contraseña). El servidor revisa con las llaves
públicas de Google que el inicio de sesión es real; no se guarda ninguna contraseña de Google.

1. Entra a https://console.cloud.google.com con tu cuenta de Google y crea un proyecto (por ejemplo "Avelu y Amara").
2. Menú → **APIs y servicios** → **Pantalla de consentimiento de OAuth** (o "Google Auth Platform" → **Branding**):
   - Tipo de usuario: **Externo**. Nombre de la app: "Avelu y Amara". Correo de asistencia: el tuyo.
   - Dominios autorizados: `arcillita.com`. Enlaces: `https://abu.arcillita.com/privacidad.html` y `https://abu.arcillita.com/terminos.html`.
   - Permisos (scopes): solo los básicos (`openid`, `email`, `profile`). Publica la app (**Publicar** / "En producción").
3. **APIs y servicios** → **Credenciales** → **Crear credenciales** → **ID de cliente de OAuth**:
   - Tipo: **Aplicación web**. Nombre: "Avelu web".
   - **Orígenes de JavaScript autorizados**: `https://abu.arcillita.com`
   - No hace falta "URI de redireccionamiento".
4. Copia el **ID de cliente** (termina en `.apps.googleusercontent.com`). Es público: **no** necesitas el "secreto del cliente".
5. Ponlo en la VM: vuelve a correr `Instalar-Avelu.ps1` y pégalo cuando lo pida (o `GOOGLE_CLIENT_ID=...` en
   `/etc/avelu/avelu.env` y `sudo docker restart avelu`).

El botón "Continuar con Google" aparece solo en la página de la cuenta cuando el servidor tiene ese ID.
La primera vez, el adulto marca que es mayor de edad y acepta los términos. Si ya tenía una cuenta con el mismo
correo, se une a esa cuenta. Para borrar una cuenta creada con Google se escribe la palabra BORRAR.

## Personalización: completa con el plan Familia, demostrativa sin él

Sin el plan Familia (o sin entrar a una cuenta) se puede **probar** todo, pero no se guarda:
voces del Estudio (se escuchan, no se guardan), Taller de personajes, pintar el personaje, decorar y caritas,
colores y foto de fondo, y lo que crea el Estudio Mágico. Aparece el aviso "Modo demostración" con el botón al plan.
Los correos de `PLAN_GRATIS_PARA` (tu familia) tienen siempre la personalización completa.
La copia de respaldo en GitHub Pages (sin servidor) funciona como siempre, completa.

## Cuentos con IA: sirve la llave de cualquier proveedor

El servidor tiene un solo módulo (`lib/ia.mjs`) con adaptadores para **Claude (Anthropic)**, **Gemini (Google)**,
**OpenAI** y cualquier API **compatible con OpenAI**: OpenRouter, Groq, DeepSeek, Mistral, xAI, Ollama u otra.
Todos reciben el mismo pedido y devuelven el mismo cuento, así que la página de cuentos no cambia.

Lo más fácil: corre `Instalar-Avelu.ps1` y contesta **s** en «¿Quieres configurar los cuentos con IA?».
Pega la llave (no se muestra): el script reconoce el proveedor por cómo empieza la llave
(`sk-ant-` Claude, `AIza` Gemini, `sk-or-` OpenRouter, `gsk_` Groq, `xai-` xAI, `sk-proj-` OpenAI).
Si empieza solo con `sk-` o no la reconoce, te muestra un menú numerado; para «Otro compatible con OpenAI» te pide la URL base.
Antes de guardar, **prueba la llave desde la VM**; si falla te dice por qué (llave inválida, sin saldo, modelo inexistente)
y te deja intentar de nuevo. Al final muestra «Proveedor detectado: … · modelo …».

A mano, en `/etc/avelu/avelu.env` (y luego `sudo docker restart avelu`):

| Variable | Qué es |
|---|---|
| `IA_PROVEEDOR` | `anthropic`, `gemini`, `openai`, `openrouter`, `groq`, `deepseek`, `mistral`, `xai`, `ollama` o `custom` |
| `IA_API_KEY` | la llave del proveedor (Ollama no necesita) |
| `IA_MODELO` | opcional; si está vacío se usa el recomendado de cada proveedor |
| `IA_BASE_URL` | solo para `custom` (cualquier API compatible con OpenAI, por ejemplo `https://mi-servidor.com/v1`) |
| `IA_LIMITE_DIARIO` | cuentos por familia al día (10) |
| `IA_MAX_TOKENS` | largo máximo de cada respuesta (1500); el tiempo de espera es de 30 s |

Si ya tenías `ANTHROPIC_API_KEY`, sigue funcionando (se usa Claude). Para ver qué proveedor quedó activo:
`curl https://abu.arcillita.com/api/salud` → `"ia":{"disponible":true,"proveedor":"…","nombre":"…","modelo":"…"}` (sin la llave).
Para probar una llave a mano en la VM:
`echo '{"proveedor":"gemini","key":"…"}' | sudo docker run --rm -i -v /opt/avelu:/app:ro -w /app node:22-alpine node --no-warnings probar-ia.mjs`
(ojo: así la llave queda en el historial de la terminal; el script de Windows no la deja en ningún lado).

Si no hay llave o el proveedor falla, la página de cuentos muestra «Los cuentos mágicos no están disponibles ahora»
y el resto del juego sigue igual. A la IA solo se envían los apodos y el tema del cuento.
