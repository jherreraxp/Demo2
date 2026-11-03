#!/usr/bin/env bash
# Pasa a /etc/avelu/avelu.env los valores de /etc/avelu/secretos.tmp (líneas CLAVE=valor) y borra el temporal.
# Lo usa el despliegue de GitHub Actions; solo cambia las claves que vienen con valor.
set -euo pipefail
ENV=/etc/avelu/avelu.env; TMP=/etc/avelu/secretos.tmp
[[ -f "$TMP" ]] || exit 0
while IFS= read -r linea; do
  k="${linea%%=*}"; v="${linea#*=}"
  [[ "$k" =~ ^[A-Z_]+$ && -n "$v" ]] || continue
  if grep -q "^$k=" "$ENV"; then
    awk -v k="$k" -v v="$v" 'BEGIN{FS=OFS="="} $1==k {print k "=" v; next} {print}' "$ENV" > "$ENV.nuevo"
  else
    cp "$ENV" "$ENV.nuevo"; printf '%s=%s\n' "$k" "$v" >> "$ENV.nuevo"
  fi
  cat "$ENV.nuevo" > "$ENV"; rm -f "$ENV.nuevo"
  echo "   $k configurado"
done < "$TMP"
shred -u "$TMP" 2>/dev/null || rm -f "$TMP"
systemctl restart avelu
