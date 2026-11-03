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

  function Pedir($t) { $s = Read-Host $t -AsSecureString; [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)) }
  function Guardar($lineas) { ($lineas -join "`n") + "`n" | ssh @op $destino "sudo install -m 600 /dev/stdin /etc/avelu/secretos.tmp && sudo bash ~/Demo2/servidor/configurar.sh" }

  Write-Host ""
  $r = Read-Host "¿Quieres poner ahora las llaves de Mercado Pago y Google? (s/n)"
  if ($r -match '^[sS]') {
    $mp = Pedir "Access Token de Mercado Pago (APP_USR-... o TEST-...; Enter para omitir)"
    $precio = Read-Host "Precio mensual en soles (Enter = 19.90)"
    $gid = Read-Host "ID de cliente de Google para 'Entrar con Google' (termina en .apps.googleusercontent.com; Enter para omitir)"
    $lineas = @("PLAN_GRATIS_PARA=$Correo")
    if ($mp) { $lineas += "MP_ACCESS_TOKEN=$mp"; $lineas += "PAGOS_PROVEEDOR=mercadopago" }
    if ($precio) { $lineas += "MP_PLAN_PRECIO=$precio" }
    if ($gid) { $lineas += "GOOGLE_CLIENT_ID=$($gid.Trim())" }
    Guardar $lineas
    Write-Host "Llaves guardadas solo en la VM (/etc/avelu/avelu.env)."
  }

  # ---------- cuentos con IA: sirve la llave de cualquier proveedor ----------
  Write-Host ""
  $r = Read-Host "¿Quieres configurar los cuentos con IA? (s/n)"
  if ($r -match '^[sS]') {
    $NOMBRES = @{ anthropic = 'Claude (Anthropic)'; gemini = 'Gemini (Google)'; openai = 'OpenAI'; openrouter = 'OpenRouter'; groq = 'Groq'; deepseek = 'DeepSeek'; mistral = 'Mistral'; xai = 'xAI (Grok)'; ollama = 'Ollama'; custom = 'Otro compatible con OpenAI' }
    $MENU = @('openai', 'deepseek', 'mistral', 'openrouter', 'groq', 'xai', 'gemini', 'anthropic', 'ollama', 'custom')
    while ($true) {
      $key = (Pedir "Pega la llave del proveedor de IA (no se mostrará; Enter para omitir)").Trim()
      if (-not $key) { Write-Host "Cuentos con IA sin configurar. Puedes hacerlo luego volviendo a correr este script."; break }
      # se reconoce el proveedor por el comienzo de la llave
      $prov = ''
      if ($key.StartsWith('sk-ant-')) { $prov = 'anthropic' }
      elseif ($key.StartsWith('AIza')) { $prov = 'gemini' }
      elseif ($key.StartsWith('sk-or-')) { $prov = 'openrouter' }
      elseif ($key.StartsWith('gsk_')) { $prov = 'groq' }
      elseif ($key.StartsWith('xai-')) { $prov = 'xai' }
      elseif ($key.StartsWith('sk-proj-')) { $prov = 'openai' }
      if (-not $prov) {
        if ($key.StartsWith('sk-')) { Write-Host "Esta llave puede ser de OpenAI o de DeepSeek (u otro). ¿De cuál proveedor es?" } else { Write-Host "No reconozco el tipo de llave. ¿De cuál proveedor es?" }
        for ($i = 0; $i -lt $MENU.Count; $i++) { Write-Host ("  {0}. {1}" -f ($i + 1), $NOMBRES[$MENU[$i]]) }
        $n = Read-Host "Escribe el número (1-10)"
        if ($n -match '^\d+$' -and [int]$n -ge 1 -and [int]$n -le $MENU.Count) { $prov = $MENU[[int]$n - 1] } else { Write-Host "Número no válido."; continue }
      }
      $base = ''
      if ($prov -eq 'custom') { $base = (Read-Host "URL base de la API compatible con OpenAI (por ejemplo https://mi-servidor.com/v1)").Trim() }
      $modelo = (Read-Host "Modelo (Enter = el recomendado para $($NOMBRES[$prov]))").Trim()
      Write-Host "Probando la llave desde la VM…"
      $prueba = @{ proveedor = $prov; key = $key; modelo = $modelo; baseUrl = $base } | ConvertTo-Json -Compress
      $res = $prueba | ssh @op $destino "sudo docker run --rm -i -v /opt/avelu:/app:ro -w /app node:22-alpine node --no-warnings probar-ia.mjs"
      $j = $null; try { $j = ($res | Select-Object -Last 1) | ConvertFrom-Json } catch {}
      if ($j -and $j.ok) {
        $lineas = @("IA_PROVEEDOR=$prov", "IA_API_KEY=$key", "IA_MODELO=$($j.modelo)")
        if ($base) { $lineas += "IA_BASE_URL=$base" } else { $lineas += "IA_BASE_URL=__vacio__" }
        Guardar $lineas
        Write-Host ("Proveedor detectado: {0} · modelo {1}" -f $NOMBRES[$prov], $j.modelo) -ForegroundColor Green
        break
      }
      $err = if ($j -and $j.error) { $j.error } else { "No se pudo probar la llave." }
      Write-Host ("✘ {0} ({1})" -f $err, $NOMBRES[$prov]) -ForegroundColor Yellow
      Write-Host "Vuelve a pegar la llave, o presiona Enter para omitir."
    }
    $key = $null
  }
  Write-Host ""
  Write-Host "Listo: https://$Dominio"
} finally { Remove-Item $copia -Force -ErrorAction SilentlyContinue }
