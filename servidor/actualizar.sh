#!/usr/bin/env bash
# Actualiza el servidor con la última versión del repositorio. Uso: sudo bash servidor/actualizar.sh
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Ejecútalo con sudo."; exit 1; }
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -d "$REPO/.git" ]]; then sudo -u "$(stat -c %U "$REPO")" git -C "$REPO" pull --ff-only; fi
APP=/opt/avelu; S="$REPO/servidor"
/usr/local/bin/avelu-respaldo || true
cp -r "$S"/servidor.mjs "$S"/lib "$S"/cuentos "$S"/package.json "$S"/package-lock.json "$APP"/
cd "$APP" && npm ci --omit=dev --no-audit --no-fund
install -m 755 "$S/respaldo.sh" /usr/local/bin/avelu-respaldo
systemctl restart avelu
sleep 2 && curl -fsS http://127.0.0.1:8787/api/salud && echo && echo "✔ Actualizado."
