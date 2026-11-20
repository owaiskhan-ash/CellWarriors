#!/usr/bin/env bash
# =============================================================================
# CELL WARRIORS — APK TOOLCHAIN FETCHER
# -----------------------------------------------------------------------------
# Fetches the four binaries the APK build needs from the only package mirrors
# that are reachable in a locked-down sandbox (PyPI + npm), so a fresh clone can
# build a signed APK without the Android SDK or Gradle.
#
#   target dir (default: build/tools)
#     aapt2          aapt2 2.19 (PyPI wheel "aapt2")
#     android.jar    API 34 platform stub jar
#     d8.jar         D8 dexer
#     apksigner.jar  apksigner
#     ecj.jar        Eclipse batch compiler (javac replacement)
#     java/          JRE (PyPI wheel "jdk4py") + keytool
#     zipalign       optional
#
# Usage: android/fetch-tools.sh [target-dir]
# Everything is cached: re-running only downloads what is missing.
# =============================================================================
set -euo pipefail

TARGET="${1:-build/tools}"
mkdir -p "$TARGET"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

say() { echo "  · $*"; }
have() { [ -e "$TARGET/$1" ]; }

# ------------------------------------------------------------------ aapt2
if ! have aapt2; then
  say "aapt2 (PyPI)"
  python3 -m pip download aapt2==0.2.1 --no-deps --only-binary :all: -d "$TMP" -q
  unzip -q "$TMP"/aapt2-*.whl -d "$TMP/aapt2"
  install -m 0755 "$TMP/aapt2/aapt2/bin/Linux/aapt2" "$TARGET/aapt2"
fi

# ------------------------------------------------------------- java + keytool
if [ ! -x "$TARGET/java/bin/java" ]; then
  say "JRE (PyPI: jdk4py)"
  python3 -m pip download jdk4py --no-deps --only-binary :all: \
    --platform manylinux_2_17_x86_64 --python-version 3.11 -d "$TMP" -q
  unzip -q "$TMP"/jdk4py-*.whl -d "$TMP/jdk"
  cp -r "$TMP/jdk/jdk4py/java-runtime" "$TARGET/java"
  chmod +x "$TARGET/java/bin/"* 2>/dev/null || true
fi

# ----------------------------------------- android.jar / d8 / apksigner / ecj
if ! have android.jar || ! have d8.jar || ! have apksigner.jar || ! have ecj.jar; then
  say "android.jar + d8 + apksigner + ecj (npm: @drxiaozhi/minapk)"
  npm pack @drxiaozhi/minapk --pack-destination "$TMP" --silent >/dev/null
  tar xzf "$TMP"/drxiaozhi-minapk-*.tgz -C "$TMP"
  cp "$TMP/package/tools/android.jar" "$TARGET/"
  cp "$TMP/package/tools/d8.jar" "$TARGET/"
  cp "$TMP/package/tools/apksigner.jar" "$TARGET/"
  cp "$TMP/package/tools/ecj-3.45.0.jar" "$TARGET/ecj.jar"
fi

# ---------------------------------------------------------------- pillow
# scripts/pack-assets.py re-encodes the art for the phone. Without it the build
# still works, but the APK is ~10x larger.
if ! python3 -c "import PIL" 2>/dev/null; then
  say "Pillow (PyPI) for asset packing"
  python3 -m pip install --quiet --target "$TARGET/pylib" pillow 2>/dev/null \
    || python3 -m pip install --quiet --break-system-packages pillow 2>/dev/null \
    || echo "  !! Pillow unavailable — art will ship at full resolution"
fi

# ------------------------------------------------------------------ sanity
missing=0
for f in aapt2 android.jar d8.jar apksigner.jar ecj.jar; do
  have "$f" || { echo "  !! still missing: $f"; missing=1; }
done
[ -x "$TARGET/java/bin/java" ] || { echo "  !! still missing: java"; missing=1; }
if [ "$missing" -ne 0 ]; then
  echo "toolchain fetch FAILED"; exit 1
fi
echo "toolchain ready in $TARGET"
ls -1sh "$TARGET" | sed 's/^/  /'
