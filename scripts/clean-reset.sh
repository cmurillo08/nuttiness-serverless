#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [[ ! -f "$ROOT_DIR/serverless.yml" || ! -f "$ROOT_DIR/package.json" ]]; then
  echo "Expected to run inside the nuttiness-serverless repo."
  exit 1
fi

echo "Cleaning local setup artifacts..."

rm -rf "$ROOT_DIR/.venv"
rm -rf "$ROOT_DIR/node_modules"
rm -f "$ROOT_DIR/package-lock.json"
rm -rf "$ROOT_DIR/.serverless"

rm -rf "$ROOT_DIR/frontend/node_modules"
rm -f "$ROOT_DIR/frontend/package-lock.json"
rm -rf "$ROOT_DIR/frontend/dist"

find "$ROOT_DIR/backend" -type d -name "__pycache__" -prune -exec rm -rf {} +
find "$ROOT_DIR/backend" -type f -name "*.pyc" -delete

echo "Cleanup complete."
