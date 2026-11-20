#!/usr/bin/env bash
# =============================================================================
# CELL WARRIORS — ANDROID APK BUILDER (no Gradle, no Android SDK)
# -----------------------------------------------------------------------------
# This repo is a static web game, so the APK is a thin, offline WebView shell
# around the exact files in the repo root. Google's Android SDK cannot be
# downloaded in every environment, so the build is done with the four tools
# that are enough to produce a signed, installable APK:
#
#   aapt2      compile + link resources, package assets   (PyPI: aapt2)
#   ecj        compile MainActivity.java                  (npm: minapk)
#   d8         classes -> dex                              (npm: minapk)
#   apksigner  sign v1/v2/v3                               (npm: minapk)
#
# Usage:
#   android/build.sh                 # build + sign a release APK
#   CW_DEBUG=1 android/build.sh      # debuggable build (chrome://inspect)
#   CW_VERSION=1.0.1 CW_VERSION_CODE=8 android/build.sh
#
# Output: dist/CellWarriors-<version>.apk (+ .sha256)
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ---------------------------------------------------------------- 0. settings
VERSION="${CW_VERSION:-1.0.0}"
VERSION_CODE="${CW_VERSION_CODE:-8}"
MIN_SDK=24
TARGET_SDK=34
OUT_DIR="dist"
BUILD_DIR="build/apk"
APK_NAME="CellWarriors-${VERSION}.apk"
KEYSTORE="${CW_KEYSTORE:-android/release.keystore}"
KS_ALIAS="${CW_KS_ALIAS:-cellwarriors}"
KS_PASS="${CW_KS_PASS:-cellwarriors}"

# ------------------------------------------------------------------ 1. toolchain
# Resolution order: $CW_TOOLS, /tmp/android/tools (session cache), build/tools.
find_tools() {
  for d in "${CW_TOOLS:-}" /tmp/android/tools "$ROOT/build/tools"; do
    [ -n "$d" ] || continue
    if [ -f "$d/android.jar" ] && [ -f "$d/d8.jar" ] && [ -f "$d/apksigner.jar" ] && [ -f "$d/ecj.jar" ]; then
      echo "$d"; return 0
    fi
  done
  return 1
}

ensure_tools() {
  if TOOLS="$(find_tools)"; then
    echo "· tools: $TOOLS"
    return 0
  fi
  echo "· toolchain missing — fetching from PyPI + npm into build/tools"
  bash "$ROOT/android/fetch-tools.sh" "$ROOT/build/tools"
  TOOLS="$ROOT/build/tools"
}

find_java() {
  if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/java" ]; then echo "$JAVA_HOME/bin/java"; return 0; fi
  for c in "$ROOT/build/tools/java/bin/java" /tmp/jdk/whl/jdk4py/java-runtime/bin/java; do
    [ -x "$c" ] && { echo "$c"; return 0; }
  done
  command -v java || return 1
}

ensure_tools
JAVA="$(find_java)" || { echo "!! no java runtime found (see android/fetch-tools.sh)"; exit 1; }
echo "· java:   $JAVA"
"$JAVA" -version 2>&1 | head -1 | sed 's/^/          /'
[ -x "$TOOLS/aapt2" ] || chmod +x "$TOOLS/aapt2"

# ------------------------------------------------------------------ 2. clean
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"/{res,assets/game,classes,dex,gen}
mkdir -p "$OUT_DIR"

# ------------------------------------------- 3. version stamping (manifest)
SRC_MANIFEST="android/app/src/main/AndroidManifest.xml"
MANIFEST="$BUILD_DIR/AndroidManifest.xml"
sed -e "s/android:versionCode=\"[0-9]*\"/android:versionCode=\"${VERSION_CODE}\"/" \
    -e "s/android:versionName=\"[^\"]*\"/android:versionName=\"${VERSION}\"/" \
    "$SRC_MANIFEST" > "$MANIFEST"
echo "· version ${VERSION} (code ${VERSION_CODE})"

# --------------------------------------------------- 4. bundle the web game
# Only what the game actually needs ships in the APK, and illustrations are
# re-encoded for a phone (see scripts/pack-assets.py). node_modules, docs,
# scripts, android/ and the build dirs never ship.
echo "· bundling web assets"
GAME="$BUILD_DIR/assets/game"
copy() {
  for item in "$@"; do
    [ -e "$ROOT/$item" ] || { echo "   !! missing asset: $item"; exit 1; }
    cp -r "$ROOT/$item" "$GAME/"
  done
}
mkdir -p "$GAME"
copy index.html styles.css styles-mobile.css fonts.css manifest.webmanifest
copy src fonts audio assets
# images/ is packed separately so unreferenced art is dropped and big
# illustrations are downscaled. Pillow is needed; fall back to a verbatim copy
# so the build never fails just because the optimiser is unavailable.
if PYTHONPATH="$TOOLS/pylib" python3 -c "import PIL" 2>/dev/null; then
  PYTHONPATH="$TOOLS/pylib" python3 "$ROOT/scripts/pack-assets.py" "$ROOT" "$GAME"
elif python3 -c "import PIL" 2>/dev/null; then
  python3 "$ROOT/scripts/pack-assets.py" "$ROOT" "$GAME"
else
  echo "   !! Pillow missing — bundling full-resolution art (APK will be ~10x bigger)"
  copy images
fi

# No network font CDN and no absolute localhost references may ever sneak in.
if grep -rIl --exclude='*.map' -e 'fonts.googleapis.com' -e 'fonts.gstatic.com' \
     -e 'http://localhost' -e '127.0.0.1' "$GAME" --include='*.html' --include='*.css' --include='*.js' --include='*.webmanifest' 2>/dev/null; then
  echo "!! network / localhost reference found in the bundled game"; exit 1
fi

# Sanity: the offline font + stylesheet graph resolves inside the APK too.
for f in fonts/inter-400.woff2 fonts/chakra-petch-700.woff2 styles-mobile.css src/ui.js \
         src/touch.js images/logo-transparent.png assets/icons/icon-512.png; do
  [ -f "$GAME/$f" ] || { echo "!! bundle missing $f"; exit 1; }
done
echo "   $(find "$GAME" -type f | wc -l) files, $(du -sh "$GAME" | cut -f1)"

# ---------------------------------------------------------- 5. resources
echo "· aapt2 compile"
"$TOOLS/aapt2" compile --dir android/app/src/main/res -o "$BUILD_DIR/res.zip"
echo "· aapt2 link"
"$TOOLS/aapt2" link \
  -o "$BUILD_DIR/base-unsigned.apk" \
  -I "$TOOLS/android.jar" \
  --manifest "$MANIFEST" \
  -A "$GAME" \
  --java "$BUILD_DIR/gen" \
  --min-sdk-version "$MIN_SDK" \
  --target-sdk-version "$TARGET_SDK" \
  --version-code "$VERSION_CODE" \
  --version-name "$VERSION" \
  --auto-add-overlay \
  "$BUILD_DIR/res.zip"

# ------------------------------------------------------------ 6. compile java
echo "· ecj"
SRC_FILES=$(find android/app/src/main/java -name '*.java')
"$JAVA" -Xmx512m -cp "$TOOLS/ecj.jar" org.eclipse.jdt.internal.compiler.batch.Main \
  -source 8 -target 8 -nowarn -g \
  -bootclasspath "$TOOLS/android.jar" \
  -cp "$TOOLS/android.jar" \
  -d "$BUILD_DIR/classes" \
  $SRC_FILES 2>&1 | grep -v "^$" | sed 's/^/   /' || true
[ -f "$BUILD_DIR/classes/com/cellwarriors/game/MainActivity.class" ] || {
  echo "!! ecj did not produce MainActivity.class"; exit 1; }

# ------------------------------------------------------------------- 7. dex
echo "· d8"
CLASS_LIST=$(find "$BUILD_DIR/classes" -name '*.class')
"$JAVA" -Xmx1g -cp "$TOOLS/d8.jar" com.android.tools.r8.D8 \
  --min-api "$MIN_SDK" \
  --lib "$TOOLS/android.jar" \
  --release \
  --output "$BUILD_DIR/dex" \
  $CLASS_LIST 2>&1 | sed 's/^/   /' || true
[ -f "$BUILD_DIR/dex/classes.dex" ] || { echo "!! d8 produced no classes.dex"; exit 1; }

# ----------------------------------------------------- 8. package + zipalign
echo "· packaging"
rm -rf "$BUILD_DIR/apk" && mkdir -p "$BUILD_DIR/apk"
cd "$BUILD_DIR/apk"
unzip -q -o ../base-unsigned.apk
cp ../dex/classes.dex .
# Rebuild deterministically: stored (uncompressed) for .so-free APKs, dex first.
zip -q -X -9 -r ../unaligned.apk . -x '*.dex' >/dev/null
zip -q -X -0 ../unaligned.apk classes.dex >/dev/null
cd "$ROOT"

if [ -x "$TOOLS/zipalign" ]; then
  "$TOOLS/zipalign" -f -p 4 "$BUILD_DIR/unaligned.apk" "$BUILD_DIR/aligned.apk"
  echo "   zipalign ok"
else
  cp "$BUILD_DIR/unaligned.apk" "$BUILD_DIR/aligned.apk"
  echo "   !! zipalign unavailable — APK is installable but pages unaligned"
fi

# ------------------------------------------------------------------ 9. signing
if [ ! -f "$KEYSTORE" ]; then
  echo "· generating release keystore ($KEYSTORE)"
  "$JAVA" -cp "$TOOLS" -version >/dev/null 2>&1 || true
  KEYTOOL="$(dirname "$(dirname "$JAVA")")/bin/keytool"
  [ -x "$KEYTOOL" ] || KEYTOOL="$(command -v keytool || true)"
  [ -x "$KEYTOOL" ] || { echo "!! keytool not found"; exit 1; }
  "$KEYTOOL" -genkeypair -v \
    -keystore "$KEYSTORE" -alias "$KS_ALIAS" \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$KS_PASS" -keypass "$KS_PASS" \
    -dname "CN=Cell Warriors, OU=Immune Command, O=Cell Warriors, L=Mumbai, S=Maharashtra, C=IN" \
    2>&1 | sed 's/^/   /'
fi

echo "· apksigner"
"$JAVA" -jar "$TOOLS/apksigner.jar" sign \
  --ks "$KEYSTORE" --ks-key-alias "$KS_ALIAS" \
  --ks-pass "pass:$KS_PASS" --key-pass "pass:$KS_PASS" \
  --min-sdk-version "$MIN_SDK" \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
  --out "$OUT_DIR/$APK_NAME" \
  "$BUILD_DIR/aligned.apk"

echo "· verifying signature"
"$JAVA" -jar "$TOOLS/apksigner.jar" verify --min-sdk-version "$MIN_SDK" -v "$OUT_DIR/$APK_NAME" \
  | head -8 | sed 's/^/   /'
"$JAVA" -jar "$TOOLS/apksigner.jar" verify --print-certs "$OUT_DIR/$APK_NAME" | sed 's/^/   /'

# ------------------------------------------------------- 10. smoke-verify APK
# A signed APK that opens to a black screen is worse than no release, so the
# build asserts on the artifact itself: package identity, landscape lock,
# every asset the game asks for, and a non-trivial dex.
echo "· smoke-verifying the APK"
APK="$OUT_DIR/$APK_NAME"
verify_apk() {
  local apk="$1"
  local bad=0
  # NOTE: `set -o pipefail` makes `producer | grep -q` unreliable — grep exits
  # as soon as it matches, the producer takes SIGPIPE, and the pipeline reports
  # failure even though the match succeeded. Capture to a variable, then test.
  local dump_badging xmltree listing
  dump_badging="$("$TOOLS/aapt2" dump badging "$apk" 2>/dev/null)"
  xmltree="$("$TOOLS/aapt2" dump xmltree "$apk" --file AndroidManifest.xml 2>/dev/null)"
  listing="$(unzip -l "$apk" | awk '{print $4}')"

  case "$dump_badging" in
    *"package: name='com.cellwarriors.game'"*) ;;
    *) echo "   !! wrong package id"; bad=1 ;;
  esac
  case "$dump_badging" in
    *"sdkVersion:'24'"*) ;;
    *) echo "   !! minSdk is not 24"; bad=1 ;;
  esac
  case "$dump_badging" in
    *"targetSdkVersion:'34'"*) ;;
    *) echo "   !! targetSdk is not 34"; bad=1 ;;
  esac
  case "$dump_badging" in
    *"launchable-activity: name='com.cellwarriors.game.MainActivity'"*) ;;
    *) echo "   !! no launchable activity"; bad=1 ;;
  esac
  # sensorLandscape == 6; the attribute id is stable across API levels.
  case "$xmltree" in
    *"screenOrientation(0x0101001e)=6"*) ;;
    *) echo "   !! not locked to sensorLandscape"; bad=1 ;;
  esac
  # v26+ adaptive icon XML must be present too (round + normal)
  case "$listing" in
    *"res/mipmap-anydpi-v26/ic_launcher.xml"*) ;;
    *) echo "   !! adaptive launcher icon missing"; bad=1 ;;
  esac

  # the whole offline web app must be there
  local f
  for f in assets/index.html assets/styles.css assets/styles-mobile.css assets/fonts.css \
           assets/src/ui.js assets/src/touch.js assets/manifest.webmanifest \
           assets/fonts/inter-400.woff2 assets/fonts/chakra-petch-700.woff2 \
           assets/images/logo-transparent.png assets/assets/icons/icon-512.png \
           classes.dex resources.arsc AndroidManifest.xml; do
    case "$listing" in
      *"$f"*) ;;
      *) echo "   !! APK missing $f"; bad=1 ;;
    esac
  done

  # a tiny dex would mean the activity was never compiled
  local dexsz
  dexsz="$(unzip -l "$apk" classes.dex | awk 'NR==4 {print $1}')"
  [ "${dexsz:-0}" -gt 4000 ] || { echo "   !! classes.dex looks empty ($dexsz bytes)"; bad=1; }

  # no stray network font refs or localhost URLs inside the bundled game
  local idx
  idx="$(unzip -p "$apk" assets/index.html)"
  case "$idx" in
    *fonts.googleapis.com*|*fonts.gstatic.com*|*localhost*|*127.0.0.1*)
      echo "   !! network reference inside bundled index.html"; bad=1 ;;
  esac

  # every same-origin asset index.html requests must be in the archive
  local ref miss=0
  for ref in $(echo "$idx" | grep -oE '(src|href)="\./[^"]+"' | sed -E 's/^(src|href)="\.\///; s/"$//'); do
    case "$listing" in
      *"assets/$ref"*) ;;
      *) echo "   !! index.html references $ref but the APK does not contain it"; miss=1; bad=1 ;;
    esac
  done

  if [ "$bad" -ne 0 ]; then
    echo "APK VERIFICATION FAILED"; return 1
  fi
  local files
  files="$(printf '%s\n' "$listing" | grep -c .)"
  echo "   ok: landscape lock, $files entries, dex ${dexsz}b, assets + all index.html refs present"
}

verify_apk "$APK"

# ------------------------------------------- 11. keep the repo copy in sync
# releases/CellWarriors-<ver>.apk is the file the GitHub release links to, so a
# build must refresh it — otherwise the repo would advertise a stale binary.
mkdir -p releases
cp "$APK" "releases/$APK_NAME"
(cd releases && sha256sum "$APK_NAME" > "$APK_NAME.sha256")
echo "   synced releases/$APK_NAME"

# ----------------------------------------------------------------- 12. report
(cd "$OUT_DIR" && sha256sum "$APK_NAME" > "$APK_NAME.sha256")
SIZE=$(du -h "$OUT_DIR/$APK_NAME" | cut -f1)
echo ""
echo "✔ $OUT_DIR/$APK_NAME  ($SIZE)"
echo "  sha256 $(cut -d' ' -f1 "$OUT_DIR/$APK_NAME.sha256")"
