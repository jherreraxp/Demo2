#!/usr/bin/env bash
# Respaldo de la base de datos y las voces; guarda 14 días. (cron: 17 3 * * * root /usr/local/bin/avelu-respaldo)
set -euo pipefail
DATOS="${DATA_DIR:-/var/lib/avelu}"; DEST="${RESPALDOS:-/var/backups/avelu}"
mkdir -p "$DEST"; chmod 700 "$DEST"
F=$(date +%Y%m%d-%H%M)
# copia consistente de SQLite (VACUUM INTO, con el sqlite incluido en Node)
node --no-warnings -e "const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync(process.argv[1]);d.exec(\"VACUUM INTO '\"+process.argv[2]+\"'\");d.close()" "$DATOS/datos.db" "$DEST/datos-$F.db"
tar -czf "$DEST/voces-$F.tar.gz" -C "$DATOS" voces
find "$DEST" -type f -mtime +14 -delete
echo "Respaldo listo en $DEST ($F)"
