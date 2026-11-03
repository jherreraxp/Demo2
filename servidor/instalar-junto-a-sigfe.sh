#!/usr/bin/env bash
# Instala Avelu y Amara en una VM donde YA funciona SIGFE (Docker, con su nginx "proxy" en los puertos 80/443).
# No instala otro nginx ni Caddy: corre Avelu en su propio contenedor y le agrega a SIGFE un sitio más
# (abu.arcillita.com) en su nginx, con su propio certificado. Los sitios de SIGFE no se tocan.
# Uso (en la VM, desde la carpeta del repositorio):  bash servidor/instalar-junto-a-sigfe.sh abu.arcillita.com tu@correo.com
# Se puede correr varias veces. Si algo falla al revisar nginx, se deja todo como estaba.
set -euo pipefail
DOM="${1:?Uso: bash servidor/instalar-junto-a-sigfe.sh abu.arcillita.com correo}"
MAIL="${2:?Falta el correo (para el certificado https)}"
ORIGEN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP=/opt/avelu; DATOS=/var/lib/avelu; ETC=/etc/avelu; SITIO=/var/www/avelu
IMAGEN=node:22-alpine
REPO_URL="${REPO_URL:-https://github.com/jherreraxp/Demo2.git}"
dc() { sudo docker compose -p sigfe "$@"; }

echo "==> Buscando SIGFE"
SIGFE="${SIGFE_DIR:-$(dirname "$(dirname "$(ls -d ~/sigfe/*/despliegue/nginx.conf 2>/dev/null | head -1)")" 2>/dev/null || true)}"
[[ -n "$SIGFE" && -f "$SIGFE/despliegue/nginx.conf" ]] || { echo "✘ No encontré ~/sigfe/*/despliegue/nginx.conf. Pon SIGFE_DIR=/ruta/a/sigfe-fisi-v2"; exit 1; }
cd "$SIGFE"
PROXY="$(dc ps -q proxy)"; [[ -n "$PROXY" ]] || { echo "✘ El contenedor 'proxy' de SIGFE no está corriendo."; exit 1; }
echo "   SIGFE en $SIGFE"
# Avelu va en su PROPIA red de Docker: no ve la base de datos ni la app de SIGFE.
# Solo el nginx de SIGFE se conecta también a esta red, para poder pasarle las visitas de $DOM.
RED=avelu-red
sudo docker network inspect "$RED" >/dev/null 2>&1 || sudo docker network create "$RED" >/dev/null

echo "==> Programa y datos de Avelu"
sudo mkdir -p "$APP" "$DATOS" "$ETC"
sudo cp -r "$ORIGEN"/servidor.mjs "$ORIGEN"/lib "$ORIGEN"/cuentos "$ORIGEN"/package.json "$ORIGEN"/package-lock.json "$APP"/
sudo docker run --rm -v "$APP":/app -w /app "$IMAGEN" npm ci --omit=dev --no-audit --no-fund >/dev/null
sudo chown -R 1000:1000 "$DATOS"; sudo chmod 700 "$DATOS"
if [[ ! -f "$ETC/avelu.env" ]]; then sudo cp "$ORIGEN/avelu.env.ejemplo" "$ETC/avelu.env"; echo "   Creé $ETC/avelu.env"; fi
pon() { sudo grep -q "^$1=" "$ETC/avelu.env" && sudo sed -i "s#^$1=.*#$1=$2#" "$ETC/avelu.env" || echo "$1=$2" | sudo tee -a "$ETC/avelu.env" >/dev/null; }
pon HOST 0.0.0.0; pon DATA_DIR /datos; pon SITIO_DIR /sitio
sudo grep -q "https://$DOM" "$ETC/avelu.env" || sudo sed -i "s#^ORIGENES=\(.*\)#ORIGENES=\1,https://$DOM#" "$ETC/avelu.env"
sudo sed -i "s#^MP_BACK_URL=https://jherreraxp.github.io/Demo2/cuenta.html#MP_BACK_URL=https://$DOM/suscripcion-lista.html#; s#^PAYPAL_BACK_URL=https://jherreraxp.github.io/Demo2/cuenta.html#PAYPAL_BACK_URL=https://$DOM/suscripcion-lista.html#" "$ETC/avelu.env"
sudo chmod 600 "$ETC/avelu.env"

echo "==> Páginas del juego (copia de la rama gh-pages; se actualiza sola cada 5 minutos)"
command -v git >/dev/null || sudo apt-get install -y git >/dev/null
[[ -d "$SITIO/.git" ]] || sudo git clone -q --depth 1 -b gh-pages "$REPO_URL" "$SITIO"
sudo tee /usr/local/bin/avelu-sitio >/dev/null <<'SYNC'
#!/usr/bin/env bash
cd /var/www/avelu && git fetch --depth 1 -q origin gh-pages && git reset -q --hard origin/gh-pages
SYNC
sudo chmod 755 /usr/local/bin/avelu-sitio && sudo /usr/local/bin/avelu-sitio
echo "*/5 * * * * root /usr/local/bin/avelu-sitio" | sudo tee /etc/cron.d/avelu-sitio >/dev/null

echo "==> Contenedor de Avelu (red propia, sin abrir puertos nuevos)"
sudo docker rm -f avelu >/dev/null 2>&1 || true
sudo docker run -d --name avelu --restart unless-stopped --network "$RED" \
  --user 1000:1000 --read-only --tmpfs /tmp --memory 512m --cap-drop ALL --security-opt no-new-privileges \
  -v "$APP":/app:ro -v "$DATOS":/datos -v "$SITIO":/sitio:ro --env-file "$ETC/avelu.env" -w /app \
  "$IMAGEN" node --no-warnings servidor.mjs >/dev/null
for i in 1 2 3 4 5 6 7 8 9 10; do sudo docker exec avelu wget -qO- http://127.0.0.1:8787/api/salud 2>/dev/null && echo && break; sleep 2; done

echo "==> Conectando el nginx de SIGFE a la red de Avelu"
sudo tee /usr/local/bin/avelu-red >/dev/null <<'RED'
#!/bin/bash
# si SIGFE recrea su contenedor proxy, se vuelve a conectar a la red de Avelu (se revisa cada minuto)
P=$(docker ps -q -f label=com.docker.compose.project=sigfe -f label=com.docker.compose.service=proxy)
[ -n "$P" ] && ! docker inspect -f '{{json .NetworkSettings.Networks}}' "$P" | grep -q '"avelu-red"' && docker network connect avelu-red "$P"
exit 0
RED
sudo chmod 755 /usr/local/bin/avelu-red && sudo /usr/local/bin/avelu-red
echo "* * * * * root /usr/local/bin/avelu-red" | sudo tee /etc/cron.d/avelu-red >/dev/null

echo "==> Certificado https para $DOM"
if ! sudo test -d "/etc/letsencrypt/live/$DOM"; then
  command -v certbot >/dev/null || sudo apt-get install -y certbot >/dev/null
  echo "   SIGFE se detiene unos segundos mientras se pide el certificado (igual que al renovarlo)."
  dc stop proxy
  sudo certbot certonly --standalone -d "$DOM" --non-interactive --agree-tos -m "$MAIL" || { dc start proxy; echo "✘ No se pudo sacar el certificado: revisa que $DOM apunte a esta VM (registro A en Cloudflare, nube gris)."; exit 1; }
  dc start proxy
  sudo /usr/local/bin/avelu-red
fi
sudo tee /usr/local/bin/avelu-certs >/dev/null <<EOT
#!/bin/bash
cp /etc/letsencrypt/live/$DOM/fullchain.pem $SIGFE/despliegue/certs/abu-fullchain.pem
cp /etc/letsencrypt/live/$DOM/privkey.pem $SIGFE/despliegue/certs/abu-privkey.pem
chmod 644 $SIGFE/despliegue/certs/abu-*.pem
EOT
sudo chmod 755 /usr/local/bin/avelu-certs && sudo mkdir -p "$SIGFE/despliegue/certs" && sudo /usr/local/bin/avelu-certs
echo '#!/bin/bash
/usr/local/bin/avelu-certs' | sudo tee /etc/letsencrypt/renewal-hooks/deploy/avelu.sh >/dev/null
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/avelu.sh

echo "==> Sitio $DOM en el nginx de SIGFE"
CONF="$SIGFE/despliegue/nginx.conf"
COPIA="$CONF.antes-avelu-$(date +%Y%m%d-%H%M%S)"
sudo cp "$CONF" "$COPIA"
NUEVO="$(mktemp)"
# quita un bloque anterior de Avelu (si se corre de nuevo) y agrega el actual
sudo awk '/# --- avelu inicio ---/{f=1} !f{print} /# --- avelu fin ---/{f=0}' "$CONF" > "$NUEVO"
cat >> "$NUEVO" <<EOT
# --- avelu inicio --- (agregado por servidor/instalar-junto-a-sigfe.sh; si regeneras este archivo, vuelve a correrlo)
server {
  listen 80;
  server_name $DOM;
  location /.well-known/acme-challenge/ { root /var/www/html; }
  location / { return 301 https://$DOM\$request_uri; }
}
server {
  listen 443 ssl;
  http2 on;
  server_name $DOM;
  ssl_certificate /etc/nginx/certs/abu-fullchain.pem;
  ssl_certificate_key /etc/nginx/certs/abu-privkey.pem;
  client_max_body_size 3m;
  gzip on; gzip_types text/css application/javascript text/javascript application/json image/svg+xml; gzip_min_length 1024;
  # se resuelve al usarse: si Avelu está apagado, SIGFE sigue funcionando igual
  resolver 127.0.0.11 valid=30s;
  set \$avelu http://avelu:8787;
  location /ws {
    proxy_pass \$avelu;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_read_timeout 3600s;
  }
  location / {
    proxy_pass \$avelu;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
  }
}
# --- avelu fin ---
EOT
# se escribe sobre el mismo archivo (el contenedor lo tiene montado)
sudo sh -c "cat '$NUEVO' > '$CONF'"; rm -f "$NUEVO"
if dc exec -T proxy nginx -t; then
  dc exec -T proxy nginx -s reload
  echo "   nginx de SIGFE recargado (copia del archivo anterior: $COPIA)"
else
  echo "✘ nginx no aceptó la configuración: dejo el archivo como estaba."
  sudo sh -c "cat '$COPIA' > '$CONF'"; dc exec -T proxy nginx -s reload || true
  exit 1
fi

echo "==> Actualización automática del servidor (cada 10 minutos, desde la rama del juego)"
RAMA="$(git -C "$ORIGEN/.." rev-parse --abbrev-ref HEAD)"
sudo tee /usr/local/bin/avelu-actualizar >/dev/null <<EOT
#!/bin/bash
# trae la última versión; si cambió el servidor, lo copia y reinicia el contenedor (SIGFE no se toca)
set -e
cd $ORIGEN/.. && sudo -u $(id -un) git fetch -q origin $RAMA
[ "\$(git rev-parse HEAD)" = "\$(git rev-parse origin/$RAMA)" ] && exit 0
antes=\$(git rev-parse HEAD:servidor 2>/dev/null || true)
sudo -u $(id -un) git reset -q --hard origin/$RAMA
[ "\$antes" = "\$(git rev-parse HEAD:servidor)" ] && exit 0
cp -r servidor/servidor.mjs servidor/lib servidor/cuentos servidor/package.json servidor/package-lock.json $APP/
docker run --rm -v $APP:/app -w /app $IMAGEN npm ci --omit=dev --no-audit --no-fund >/dev/null
docker restart avelu >/dev/null
echo "\$(date) servidor actualizado a \$(git rev-parse --short HEAD)" >> /var/log/avelu-actualizar.log
EOT
sudo chmod 755 /usr/local/bin/avelu-actualizar
echo "*/10 * * * * root /usr/local/bin/avelu-actualizar" | sudo tee /etc/cron.d/avelu-actualizar >/dev/null

echo "==> Respaldo diario (3:17 am)"
sudo install -m 755 "$ORIGEN/respaldo.sh" /usr/local/bin/avelu-respaldo
echo "17 3 * * * root docker run --rm -v $DATOS:$DATOS -v /var/backups/avelu:/var/backups/avelu -v /usr/local/bin/avelu-respaldo:/r.sh:ro $IMAGEN sh -c 'apk add -q bash tar >/dev/null && bash /r.sh'" | sudo tee /etc/cron.d/avelu-respaldo >/dev/null

echo "==> Probando"
sleep 2
curl -fsS --resolve "$DOM:443:127.0.0.1" "https://$DOM/api/salud" && echo " ← Avelu responde por https"
for s in $(grep -h "server_name" "$COPIA" | grep -v "_;" | awk '{print $2}' | tr -d ';' | sort -u); do
  code=$(curl -sk -o /dev/null -w '%{http_code}' --resolve "$s:443:127.0.0.1" "https://$s/" || true); echo "   SIGFE ($s) sigue respondiendo: $code"
done
echo
echo "✔ Listo: https://$DOM"
echo "  Configuración: sudo nano $ETC/avelu.env  y luego  sudo docker restart avelu"
