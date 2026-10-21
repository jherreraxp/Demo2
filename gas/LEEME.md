# Copia de seguridad en Google Drive (opcional)

Con esto el juego guarda una copia en **tu** Google Drive: el progreso de las niñas, los personajes
inventados, los mundos de "Construye tu Mundo" y los jueguitos mágicos. Sirve para no perder nada si
se borra el navegador o para pasar todo a otra tablet.

El script corre en tu propia cuenta de Google. Nadie más tiene acceso a tu Drive: el juego solo puede
guardar y traer la copia si conoce la dirección **y** la clave secreta.

## Pasos (una sola vez, unos 5 minutos)

1. Entra a <https://script.google.com> con tu cuenta de Google y toca **Proyecto nuevo**.
2. Borra lo que aparece y pega todo el contenido de [`Code.gs`](Code.gs).
3. En la línea `const CLAVE_INICIAL = 'cambia-esta-clave';` pon una clave tuya, por ejemplo
   `avelu-amara-2026-xyz`. Que sea difícil de adivinar.
4. Guarda (💾). Arriba elige la función **configurar** y toca **Ejecutar**.
   Google te pedirá permisos para Drive y Hojas de cálculo: acéptalos.
   Esto crea la carpeta **"Avelu y Amara"** y la hoja **"Avelu y Amara - copias"** en tu Drive.
5. Toca **Implementar → Nueva implementación**.
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
   Toca **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).
6. En el juego: **🔒 Papás → Admin → 🤖 Inteligencia artificial → ☁️ Google Drive**.
   Pega la dirección y la misma clave secreta, y toca **🧪 Probar**. Debe decir "¡Conectado!".

## Uso

- **☁️ Guardar copia en Drive**: crea `copia-AAAA-MM-DD_HH-mm.json` y actualiza `ultima.json` en la carpeta.
  Cada copia queda anotada en la hoja. Se guardan las 30 más recientes.
- **⬇️ Traer copia de Drive**: reemplaza lo de este aparato con `ultima.json` (pide confirmar dos veces).

## Qué NO se guarda

Las llaves de la IA (Claude, Gemini), la llave de GitHub y el PIN **nunca** salen del aparato.
Las grabaciones de voz tampoco van aquí: esas se publican en la web desde el admin.

## Si cambias el código

Después de editar `Code.gs`, toca **Implementar → Gestionar implementaciones → ✏️ → Versión: nueva**
para que la misma dirección use el código nuevo.
