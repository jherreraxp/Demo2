#!/usr/bin/env bash
# Instala el servidor de Avelu y Amara en una VM (Ubuntu 22.04/24.04 u Oracle Linux 8/9; x86_64 o ARM).
# Uso (desde la carpeta del repositorio clonado):  sudo bash servidor/instalar.sh juego.midominio.com
# Se puede ejecutar varias veces: no borra datos ni la configuración.
set -euo pipefail
DOMINIO="${1:-}"
if [[ -z "$DOMINIO" ]]; then echo "Uso: sudo bash servidor/instalar.sh juego.midominio.com"; exit 1; fi
if [[ $EUID -ne 0 ]]; then echo "Ejecútalo con sudo."; exit 1; fi
ORIGEN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP=/opt/avelu; DATOS=/var/lib/avelu; ETC=/etc/avelu
. /etc/os-release
echo "==> Sistema: $PRETTY_NAME ($(uname -m))"

if command -v apt-get >/dev/null; then PM=apt; else PM=dnf; fi

echo "==> Node.js 22"
if ! command -v node >/dev/null || [[ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]]; then
  if [[ $PM == apt ]]; then
    apt-get update -y && apt-get install -y ca-certificates curl gnupg
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
    apt-get update -y && apt-get install -y nodejs
  else
    dnf module reset -y nodejs || true
    dnf module enable -y nodejs:22 && dnf install -y nodejs npm || { curl -fsSL https://rpm.nodesource.com/setup_22.x -o /tmp/ns.sh && bash /tmp/ns.sh && dnf install -y nodejs; }
  fi
fi
node --version

echo "==> Caddy (HTTPS automático)"
if ! command -v caddy >/dev/null; then
  if [[ $PM == apt ]]; then
    apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
    curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -y && apt-get install -y caddy
  else
    dnf install -y 'dnf-command(copr)' && dnf copr enable -y @caddy/caddy && dnf install -y caddy
  fi
fi

echo "==> Usuario y carpetas"
id avelu >/dev/null 2>&1 || useradd --system --home "$APP" --shell /usr/sbin/nologin avelu
mkdir -p "$APP" "$DATOS" "$ETC"
cp -r "$ORIGEN"/servidor.mjs "$ORIGEN"/lib "$ORIGEN"/cuentos "$ORIGEN"/package.json "$ORIGEN"/package-lock.json "$APP"/
cd "$APP" && npm ci --omit=dev --no-audit --no-fund
chown -R root:root "$APP"; chmod -R a+rX "$APP"
chown -R avelu:avelu "$DATOS"; chmod 700 "$DATOS"
if [[ ! -f "$ETC/avelu.env" ]]; then cp "$ORIGEN/avelu.env.ejemplo" "$ETC/avelu.env"; echo "   Creé $ETC/avelu.env (complétalo)."; fi
chown root:avelu "$ETC/avelu.env"; chmod 640 "$ETC/avelu.env"

echo "==> Servicio systemd"
cat > /etc/systemd/system/avelu.service <<UNIT
[Unit]
Description=Servidor de Avelu y Amara
After=network-online.target
Wants=network-online.target

[Service]
User=avelu
Group=avelu
WorkingDirectory=$APP
EnvironmentFile=$ETC/avelu.env
ExecStart=/usr/bin/env node --no-warnings $APP/servidor.mjs
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
PrivateDevices=true
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LockPersonality=true
ReadWritePaths=$DATOS
MemoryMax=512M

[Install]
WantedBy=multi-user.target
UNIT

echo "==> Caddy para $DOMINIO"
cat > /etc/caddy/Caddyfile <<CADDY
$DOMINIO {
	encode gzip
	request_body {
		max_size 2MB
	}
	reverse_proxy 127.0.0.1:8787
}
CADDY

echo "==> Firewall (puertos 80 y 443)"
if command -v ufw >/dev/null && ufw status | grep -q active; then ufw allow 80/tcp; ufw allow 443/tcp; fi
if command -v firewall-cmd >/dev/null && systemctl is-active --quiet firewalld; then
  firewall-cmd --permanent --add-service=http; firewall-cmd --permanent --add-service=https; firewall-cmd --reload
fi
# las imágenes Ubuntu de Oracle traen reglas iptables que bloquean todo menos SSH
if command -v iptables >/dev/null && iptables -S INPUT 2>/dev/null | grep -q REJECT; then
  for p in 80 443; do iptables -C INPUT -p tcp --dport $p -j ACCEPT 2>/dev/null || iptables -I INPUT 5 -p tcp -m state --state NEW --dport $p -j ACCEPT; done
  if command -v netfilter-persistent >/dev/null; then netfilter-persistent save; elif [[ $PM == apt ]]; then DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent && netfilter-persistent save; fi
fi

echo "==> Respaldo diario (3:17 am)"
install -m 755 "$ORIGEN/respaldo.sh" /usr/local/bin/avelu-respaldo
echo "17 3 * * * root /usr/local/bin/avelu-respaldo" > /etc/cron.d/avelu-respaldo

systemctl daemon-reload
systemctl enable --now avelu
systemctl restart avelu
systemctl enable --now caddy
systemctl reload caddy || systemctl restart caddy
sleep 2
echo
if curl -fsS http://127.0.0.1:8787/api/salud; then echo; echo "✔ El servidor responde."; else echo "✘ No responde: mira 'journalctl -u avelu -n 50'"; fi
cat <<FIN

Siguientes pasos:
 1. En Oracle Cloud: VCN → Security List → agrega reglas de entrada TCP 80 y 443 desde 0.0.0.0/0.
 2. Tu dominio $DOMINIO debe apuntar a la IP pública de esta VM (registro A).
 3. Completa la configuración:  sudo nano $ETC/avelu.env   y luego   sudo systemctl restart avelu
 4. Prueba desde tu compu:  curl https://$DOMINIO/api/salud
 5. En el juego (admin) pon la dirección del servidor: https://$DOMINIO
FIN
