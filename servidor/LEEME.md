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
- Cuentos con IA: cada cuento cuesta unos centavos de dólar en la API de Anthropic (límite: 5 por familia por día, `LIMITE_IA_DIA`).
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
