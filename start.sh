#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

# Verificar Node >= 18. Si no, bajar Node 20 portable
NODE_EXE="node"
NPM_EXE="npm"
if command -v node &>/dev/null; then
  NODE_MAJOR=$(node -v | cut -d. -f1 | tr -d 'v')
else
  NODE_MAJOR=0
fi

if [ "$NODE_MAJOR" -lt 18 ]; then
  NODE_DIR="$TEMP/node20/node-v20.18.0-linux-x64"
  if [ "$(uname)" = "Darwin" ]; then
    NODE_DIR="$TMPDIR/node20/node-v20.18.0-darwin-x64"
    NODE_URL="https://nodejs.org/dist/v20.18.0/node-v20.18.0-darwin-x64.tar.gz"
  else
    NODE_URL="https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-x64.tar.xz"
  fi
  NODE_EXE="$NODE_DIR/bin/node"
  NPM_EXE="$NODE_DIR/bin/npm"
  if [ ! -f "$NODE_EXE" ]; then
    echo "Descargando Node.js 20.18.0..."
    mkdir -p "$(dirname "$NODE_DIR")"
    curl -sL "$NODE_URL" | tar xJ -C "$(dirname "$NODE_DIR")"
  fi
  export PATH="$NODE_DIR/bin:$PATH"
fi

# Instalar dependencias
if [ ! -d "node_modules" ]; then
  echo "Instalando dependencias..."
  "$NPM_EXE" install
fi

echo "Iniciando chatbot CEE-FIIS-UNI..."
"$NODE_EXE" --env-file=.env.local node_modules/tsx/dist/cli.mjs src/app.ts
