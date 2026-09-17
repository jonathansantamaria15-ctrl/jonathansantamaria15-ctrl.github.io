#!/usr/bin/env bash
# Genera el paquete de escritorio para Windows (HosteleriaSaaS.exe + server/)
# a partir del build de produccion actual. Requiere:
#   - `.env.local` en la raiz del repo con credenciales reales de Supabase
#     (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY quedan incrustados en el build:
#     el .exe resultante siempre apuntara a ese proyecto).
#   - x86_64-w64-mingw32-gcc (paquete `gcc-mingw-w64-x86-64`) para compilar
#     el lanzador nativo (scripts/desktop/launcher.c). Es un binario Win32
#     puro (WinHTTP + CreateProcess), sin runtime de Node embebido: reutiliza
#     el Node.js que el usuario ya tiene instalado para arrancar el server.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DESKTOP_DIR="$ROOT_DIR/scripts/desktop"
DIST_DIR="$ROOT_DIR/dist-desktop"

cd "$ROOT_DIR"

echo "==> Build de produccion (output: standalone)"
rm -rf .next
npm run build

echo "==> Copiando assets estaticos al build standalone"
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

echo "==> Compilando el lanzador nativo (MinGW-w64)"
x86_64-w64-mingw32-gcc -O2 -mconsole -o "$DESKTOP_DIR/HosteleriaSaaS.exe" \
  "$DESKTOP_DIR/launcher.c" -lwinhttp -lshell32

echo "==> Ensamblando paquete distribuible"
rm -rf "$DIST_DIR/HosteleriaSaaS"
mkdir -p "$DIST_DIR/HosteleriaSaaS/server"
cp -r .next/standalone/. "$DIST_DIR/HosteleriaSaaS/server/"
cp "$DESKTOP_DIR/env.local.example" "$DIST_DIR/HosteleriaSaaS/.env.local.example"
cp "$DESKTOP_DIR/LEEME.txt" "$DIST_DIR/HosteleriaSaaS/LEEME.txt"
mv "$DESKTOP_DIR/HosteleriaSaaS.exe" "$DIST_DIR/HosteleriaSaaS/HosteleriaSaaS.exe"

(cd "$DIST_DIR" && zip -r -q HosteleriaSaaS-Windows.zip HosteleriaSaaS)

echo "==> Listo: $DIST_DIR/HosteleriaSaaS-Windows.zip"
