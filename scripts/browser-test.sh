#!/usr/bin/env bash
# Run a puppeteer-based layout test.
#
# The browser is @sparticuz/chromium, which ships its own shared libraries as a
# brotli-compressed tar. On a normal desktop those libraries already exist and
# nothing is needed; in a minimal container we extract them and point
# LD_LIBRARY_PATH at them (otherwise Chromium dies with "libnss3.so not found").
#
#   npm i            # installs @sparticuz/chromium + puppeteer-core
#   bash scripts/browser-test.sh scripts/battle-fit.mjs
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${1:?usage: browser-test.sh <script.mjs> [args...]}"
shift || true

BIN="$ROOT/node_modules/@sparticuz/chromium/bin"
LIBS="${CW_CHROMIUM_LIBS:-/tmp/cw-chromium-libs}"
if [ -f "$BIN/al2023.tar.br" ] && [ ! -d "$LIBS/lib" ]; then
  echo "· extracting Chromium runtime libraries -> $LIBS"
  mkdir -p "$LIBS"
  node -e "
    const fs=require('fs'),zlib=require('zlib');
    fs.writeFileSync('$LIBS/al2023.tar', zlib.brotliDecompressSync(fs.readFileSync('$BIN/al2023.tar.br')));
  "
  tar xf "$LIBS/al2023.tar" -C "$LIBS" && rm -f "$LIBS/al2023.tar"
fi

if [ -d "$LIBS/lib" ]; then
  LD_LIBRARY_PATH="$LIBS/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" node "$ROOT/$TARGET" "$@"
else
  node "$ROOT/$TARGET" "$@"
fi
