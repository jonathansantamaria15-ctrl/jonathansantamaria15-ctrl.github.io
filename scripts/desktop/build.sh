#!/usr/bin/env bash
# Genera el paquete de escritorio para Windows (HosteleriaSaaS.exe + server/)
# a partir del build de produccion actual. Requiere:
#   - `.env.local` en la raiz del repo con credenciales reales de Supabase
#     (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY quedan incrustados en el build:
#     el .exe resultante siempre apuntara a ese proyecto).
#   - Node.js (para generar el blob SEA) y acceso a nodejs.org (para
#     descargar el node.exe de Windows sobre el que se inyecta).
#
# El launcher (scripts/desktop/launcher.js) no se compila con webpack/pkg:
# es codigo Node puro sin dependencias, apto para Node SEA tal cual.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DESKTOP_DIR="$ROOT_DIR/scripts/desktop"
DIST_DIR="$ROOT_DIR/dist-desktop"
NODE_VERSION="${DESKTOP_NODE_VERSION:-22.22.2}"

cd "$ROOT_DIR"

echo "==> Build de produccion (output: standalone)"
rm -rf .next
npm run build

echo "==> Copiando assets estaticos al build standalone"
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

echo "==> Descargando Node.js $NODE_VERSION para Windows x64"
mkdir -p "$DIST_DIR"
curl -sSL -o "$DIST_DIR/node-win-x64.exe" \
  "https://nodejs.org/dist/v${NODE_VERSION}/win-x64/node.exe"

echo "==> Generando blob SEA del lanzador"
(cd "$DESKTOP_DIR" && node --experimental-sea-config sea-config.json)

echo "==> Inyectando el blob en el binario de Windows"
cp "$DIST_DIR/node-win-x64.exe" "$DIST_DIR/HosteleriaSaaS.exe"
npx --yes postject "$DIST_DIR/HosteleriaSaaS.exe" NODE_SEA_BLOB \
  "$DESKTOP_DIR/sea-prep.blob" \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
  --overwrite

echo "==> Ensamblando paquete distribuible"
rm -rf "$DIST_DIR/HosteleriaSaaS"
mkdir -p "$DIST_DIR/HosteleriaSaaS/server"
cp -r .next/standalone/. "$DIST_DIR/HosteleriaSaaS/server/"
cp "$DESKTOP_DIR/env.local.example" "$DIST_DIR/HosteleriaSaaS/.env.local.example"
cp "$DESKTOP_DIR/LEEME.txt" "$DIST_DIR/HosteleriaSaaS/LEEME.txt"
mv "$DIST_DIR/HosteleriaSaaS.exe" "$DIST_DIR/HosteleriaSaaS/HosteleriaSaaS.exe"
rm -f "$DIST_DIR/node-win-x64.exe"

(cd "$DIST_DIR" && zip -r -q HosteleriaSaaS-Windows.zip HosteleriaSaaS)

echo "==> Listo: $DIST_DIR/HosteleriaSaaS-Windows.zip"
