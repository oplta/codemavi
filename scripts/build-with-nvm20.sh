#!/usr/bin/env bash
set -euo pipefail

echo "==> Ensuring nvm is available"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "nvm not found at $NVM_DIR; attempting common locations"
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
  elif [ -s "/usr/local/share/nvm/nvm.sh" ]; then
    export NVM_DIR="/usr/local/share/nvm"
  elif [ -s "/opt/homebrew/opt/nvm/nvm.sh" ]; then
    export NVM_DIR="/opt/homebrew/opt/nvm"
  fi
fi

# shellcheck disable=SC1090
. "$NVM_DIR/nvm.sh" 2>/dev/null || true

echo "==> Node before: $(node -v || echo not found)"

# Use .nvmrc if present
if [ -f .nvmrc ]; then
  wanted=$(cat .nvmrc | tr -d '[:space:]')
  echo "==> Using Node from .nvmrc: $wanted"
  nvm install "$wanted"
  nvm use "$wanted"
else
  echo "==> No .nvmrc; using Node 20.18.2 fallback"
  nvm install 20.18.2
  nvm use 20.18.2
fi

echo "==> Node after: $(node -v)"
echo "==> npm after: $(npm -v)"

echo "==> Cleaning node_modules and package-lock (if present)"
rm -rf node_modules
[ -f package-lock.json ] && rm -f package-lock.json

echo "==> Installing dependencies (npm ci)"
npm ci

echo "==> Building (npm run build)"
if npm run build; then
  echo "==> Build succeeded"
  exit 0
else
  echo "==> Build failed (npm run build). Trying compile or watch"
  if npm run -s compile; then
    echo "==> Compile succeeded"
    exit 0
  else
    echo "==> Compile also failed. Inspect logs above."
    exit 1
  fi
fi
