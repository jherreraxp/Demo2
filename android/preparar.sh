#!/usr/bin/env bash
# Prepara el proyecto Android (Capacitor) para compilar el APK de Avelu y Amara.
# Lo usa .github/workflows/apk.yml; también sirve en una compu con Node 20+ (no necesita el SDK de Android para este paso).
# Uso:  bash android/preparar.sh      (se puede correr varias veces)
set -euxo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

node --version; npm --version
if [[ -f package-lock.json ]]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

# 1) proyecto nativo: se genera con la plantilla de Capacitor (no se guarda en el repositorio)
if [[ ! -d android ]]; then npx cap add android; else npx cap sync android; fi

APP=android/app
MANIF=$APP/src/main/AndroidManifest.xml
GRADLE=$APP/build.gradle
test -f "$MANIF" && test -f "$GRADLE"

# 2) ícono y pantalla de inicio propios
cp -r res/. "$APP/src/main/res/"

# 3) permisos: micrófono (Estudio de voz) y voz del teléfono (los juegos hablan)
if ! grep -q 'RECORD_AUDIO' "$MANIF"; then
  sed -i 's#</manifest>#    <uses-permission android:name="android.permission.RECORD_AUDIO" />\n    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />\n    <queries>\n        <intent>\n            <action android:name="android.intent.action.TTS_SERVICE" />\n        </intent>\n    </queries>\n</manifest>#' "$MANIF"
fi

# 4) versión (sube sola con la fecha, así una versión nueva se instala encima de la anterior) y firma
VERSION_CODE="${VERSION_CODE:-$(( $(date +%s) / 60 ))}"
VERSION_NAME="${VERSION_NAME:-$(date +%Y.%m.%d)}"
sed -i '/^\/\/ --- avelu inicio ---$/,/^\/\/ --- avelu fin ---$/d' "$GRADLE"
cat >> "$GRADLE" <<GRADLE_EXTRA
// --- avelu inicio ---
// agregado por android/preparar.sh: versión y firma de prueba (ver android/LEEME.md)
android {
    defaultConfig {
        versionCode ${VERSION_CODE}
        versionName "${VERSION_NAME}"
    }
    signingConfigs {
        avelu {
            storeFile file("\${rootProject.projectDir}/../avelu-apk.keystore")
            storePassword "aveluapp"
            keyAlias "avelu"
            keyPassword "aveluapp"
        }
    }
    buildTypes {
        release { signingConfig signingConfigs.avelu }
        debug { signingConfig signingConfigs.avelu }
    }
    lint {
        checkReleaseBuilds false
        abortOnError false
    }
}
// --- avelu fin ---
GRADLE_EXTRA

# diagnóstico (ayuda a entender un fallo de compilación)
set +x
echo "===== capacitor.config.json (copiado a la app) ====="; cat "$APP/src/main/assets/capacitor.config.json" || true
echo "===== AndroidManifest.xml ====="; cat "$MANIF"
echo "===== fin de app/build.gradle ====="; tail -30 "$GRADLE"
echo "===== plugins ====="; cat "$APP/capacitor.build.gradle" | grep -n "implementation" || true
test -f avelu-apk.keystore && echo "Llave de firma: OK"
echo "Proyecto listo en $(pwd)/android (versión ${VERSION_NAME}, código ${VERSION_CODE})"
