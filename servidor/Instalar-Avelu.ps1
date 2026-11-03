# Instala o actualiza Avelu y Amara en la VM de Oracle, junto a SIGFE, sin tocar sus sitios.
# Pon este archivo en la misma carpeta que tu llave (ssh-key-2026-11-03*.key) y ejecuta en PowerShell:
#   powershell -ExecutionPolicy Bypass -File .\Instalar-Avelu.ps1
# Opcional: -Dominio abu.arcillita.com -Ip 146.181.18.35 -Llave C:\ruta\llave.key
param([string]$Ip = "146.181.18.35", [string]$Dominio = "abu.arcillita.com", [string]$Correo = "jherreraq@gmail.com", [string]$Llave = "")
$ErrorActionPreference = "Stop"
$aqui = $PSScriptRoot
if (-not $Llave) {
  $cand = @(Get-ChildItem $aqui -ErrorAction SilentlyContinue) + @(Get-ChildItem "$HOME\Downloads" -ErrorAction SilentlyContinue)
  $Llave = ($cand | Where-Object { $_.Name -like "ssh-key-2026-11-03*" -and $_.Extension -ne ".pub" } | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
}
if (-not $Llave) { throw "No encuentro la llave. Usa: .\Instalar-Avelu.ps1 -Llave 'C:\ruta\ssh-key.key'" }
Write-Host "Llave: $Llave"
# OpenSSH exige que la llave sea solo tuya: se usa una copia protegida y se borra al final
$copia = Join-Path $env:TEMP "avelu-vm.key"
Copy-Item $Llave $copia -Force
icacls $copia /inheritance:r | Out-Null
icacls $copia /grant:r "$($env:USERNAME):(R)" | Out-Null
$op = @("-i", $copia, "-o", "StrictHostKeyChecking=accept-new", "-o", "ServerAliveInterval=30")
$destino = "ubuntu@$Ip"
try {
  $remoto = @'
set -e
command -v git >/dev/null || sudo apt-get install -y git
if [ ! -d ~/Demo2/.git ]; then git clone -q -b claude/reading-game-children-zpv3xw https://github.com/jherreraxp/Demo2.git ~/Demo2; fi
cd ~/Demo2 && git fetch -q origin claude/reading-game-children-zpv3xw && git checkout -q claude/reading-game-children-zpv3xw && git reset -q --hard origin/claude/reading-game-children-zpv3xw
bash servidor/instalar-junto-a-sigfe.sh "__DOM__" "__MAIL__"
'@
  $remoto = $remoto.Replace("__DOM__", $Dominio).Replace("__MAIL__", $Correo).Replace("`r`n", "`n")
  $remoto | ssh @op $destino "bash -s"
  if ($LASTEXITCODE -ne 0) { throw "La instalación terminó con error (código $LASTEXITCODE). Copia las últimas líneas y envíalas." }

  Write-Host ""
  $r = Read-Host "¿Quieres poner ahora las llaves de Mercado Pago y de Claude? (s/n)"
  if ($r -match '^[sS]') {
    function Pedir($t) { $s = Read-Host $t -AsSecureString; [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)) }
    $mp = Pedir "Access Token de Mercado Pago (APP_USR-... o TEST-...; Enter para omitir)"
    $precio = Read-Host "Precio mensual en soles (Enter = 19.90)"
    $ia = Pedir "Llave NUEVA de Claude para los cuentos (sk-ant-...; Enter para omitir)"
    $lineas = @("PLAN_GRATIS_PARA=$Correo")
    if ($mp) { $lineas += "MP_ACCESS_TOKEN=$mp"; $lineas += "PAGOS_PROVEEDOR=mercadopago" }
    if ($precio) { $lineas += "MP_PLAN_PRECIO=$precio" }
    if ($ia) { $lineas += "ANTHROPIC_API_KEY=$ia" }
    ($lineas -join "`n") + "`n" | ssh @op $destino "sudo install -m 600 /dev/stdin /etc/avelu/secretos.tmp && sudo bash ~/Demo2/servidor/configurar.sh"
    Write-Host "Llaves guardadas solo en la VM (/etc/avelu/avelu.env)."
  }
  Write-Host ""
  Write-Host "Listo: https://$Dominio"
} finally { Remove-Item $copia -Force -ErrorAction SilentlyContinue }
