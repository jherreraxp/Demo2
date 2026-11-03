#!/usr/bin/env bash
# Pasa a /etc/avelu/avelu.env los valores de /etc/avelu/secretos.tmp (líneas CLAVE=valor) y borra el temporal.
# Lo usa el despliegue de GitHub Actions; solo cambia las claves que vienen con valor.
set -euo pipefail
ENV=/etc/avelu/avelu.env; TMP=/etc/avelu/secretos.tmp
[[ -f "$TMP" ]] || exit 0
while IFS= read -r linea; do
  k="${linea%%=*}"; v="${linea#*=}"
  [[ "$k" =~ ^[A-Z_]+$ && -n "$v" ]] || continue
  [[ "$v" == "__vacio__" ]] && v=""   # para borrar un valor anterior (por ejemplo, al cambiar de proveedor de IA)
  if grep -q "^$k=" "$ENV"; then
    awk -v k="$k" -v v="$v" 'BEGIN{FS=OFS="="} $1==k {print k "=" v; next} {print}' "$ENV" > "$ENV.nuevo"
  else
    cp "$ENV" "$ENV.nuevo"; printf '%s=%s\n' "$k" "$v" >> "$ENV.nuevo"
  fi
  cat "$ENV.nuevo" > "$ENV"; rm -f "$ENV.nuevo"
  [[ "$k" == *KEY* || "$k" == *TOKEN* || "$k" == *SECRET* ]] && echo "   $k configurado (oculto)" || echo "   $k configurado"
done < "$TMP"
shred -u "$TMP" 2>/dev/null || rm -f "$TMP"
if systemctl list-unit-files avelu.service >/dev/null 2>&1 && systemctl is-enabled --quiet avelu 2>/dev/null; then systemctl restart avelu; else docker restart avelu >/dev/null; fi
