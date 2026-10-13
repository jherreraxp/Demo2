# Voces grabadas por la familia

Las grabaciones se hacen y se publican desde el juego: **Panel de mamá y papá → Estudio de voz**.
El estudio sube los archivos `.wav` a esta carpeta (rama `gh-pages`) y actualiza `lista.json`,
que relaciona cada frase con su archivo, por ejemplo `{ "busca": "v-busca-abc123.wav" }`.

El juego usa primero la grabación del propio navegador, luego estas grabaciones publicadas y,
si no hay ninguna, la voz del dispositivo. Si existe `musica.mp3` en `lista.json`, se usa como canción de fondo.
