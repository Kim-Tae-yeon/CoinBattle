#!/usr/bin/env bash
set -eu
cd -- "$(dirname -- "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 22 or newer is required."
  exit 1
fi
exec node server.mjs
