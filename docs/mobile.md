# Cell Warriors on a phone

Cell Warriors is a **landscape, touch-first** game. Everything in this document
is enforced by `node scripts/phone-check.mjs` (144 checks) and by the APK smoke
verification inside `android/build.sh` — if this file and those checks ever
disagree, the checks win and this file is the bug.

---

## 1. The layout contract

| | |
|---|---|
| Design canvas | ~**950 × 430 CSS px** (a 16:9-ish phone in landscape) |
| Orientation | landscape only (`sensorLandscape` in the APK, `manifest.orientation` for the PWA) |
| Media query | `(orientation: landscape) and (min-width: 560px) and (max-width: 1000px) and (max-height: 560px)` |
| Second, defensive layer | `(hover: none)`, `(pointer: coarse)` — applies touch affordances on any size |
| Short-screen fallback | `(orientation: landscape) and (max-height: 400px)` |
| Portrait fallback | usable single column + a "rotate your phone" prompt |

The exact same query is evaluated in JS (`isPhoneLayout()` in `src/ui.js`), so
layout and logic can never disagree about "are we on a phone".

### Vertical budget on a 412 px-tall screen

```
notch / status (safe-area-inset-top)     ~0–30 px   ← env() only, never assumed
HUD (team HP + portraits + tools)        ~56 px
battle stage (enemies, rails, timeline)  flexible, min 0
hand strip (cards)                       ~34 vh  → ~130 px cards
AP row + tips                            ~28 px
gesture bar (safe-area-inset-bottom)     ~0–34 px  ← env() only
```

Everything that used to be a fixed pixel height (`min-height: 230px` on the hand,
`200px` cards, `84px` rails) is derived on phones. The hand strip is the most
important thing on the screen, so it sizes itself from the viewport height and
never scrolls.

---

## 2. Safe areas (notches, punch-holes, gesture bars)

`styles-mobile.css` maps the four insets to tokens:

```css
--safe-t: env(safe-area-inset-top, 0px);   /* …r, b, l */
```

Every full-bleed edge uses them: `.hud-top`, `.hand-zone`, `.screen-head`,
`.detail-panel`, `.event-card`, `.story-bar`, `.reward-panel`, `.pause-card`,
`.sim-hud`, `.battle-log`, `.sands-menu`. The Android shell additionally sets
`LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES`, so the game paints under the cutout
and only the *content* is inset.

Immersive fullscreen hides the system bars; `applyImmersive()` re-applies it on
resume, focus change and rotation (the sticky variant alone is not enough on
some OEM skins).

---

## 3. Touch interaction model

There is no hover and no keyboard. Each desktop affordance has exactly one
touch equivalent:

| Action | Touch | Desktop (unchanged) |
|---|---|---|
| Play a card | **tap** it | click |
| Target a specific enemy | **tap** the enemy, then tap the card | click enemy |
| Play at a specific enemy | **drag** the card onto it (needs 18 px of travel) | drag + drop |
| Inspect a card / enemy | **long-press** (430 ms) | hover tooltip / right-click |
| End turn | the END TURN disc (≥62 px, bottom-right) | `Space` |
| Pause | ☰ button | `Esc` |
| Back | Android hardware back | — |
| Any list | native momentum scroll | wheel |

Details that matter:

* **Tap → play is handled in `pointerup`**, not `click`. Touch browsers emit a
  synthetic `click` afterwards; `_swallowClick` makes sure a card is never
  played twice (verified by the `tap plays exactly one card` check).
* **Drag needs 18 px of travel** before it counts as a drag. Freshly drawn cards
  sit near the bottom edge, so without this a thumb could not lift a card high
  enough to clear the hand — and a long-press would turn into a drag.
* **Long-press** uses `pointerdown` + a movement slop of 12 px, so a shaky
  finger still counts as a press. It opens the same full detail sheet as the
  desktop tooltip, but with the maths, statuses and upgrade text.
* **Targeting is sticky.** `battle.targetUid` persists; the battle view shows a
  toast (`TARGET · <name>`) because there is no hover cursor to explain it.
* **Every interactive element is ≥44 px** (`--tap-min`), except the END TURN
  disc which is larger, and the hand cards which are height-constrained.
* **Hover-only CSS is neutralised** inside `@media (hover: none)`; press states
  (`.card:active`, `.pressing`) replace it.

---

## 4. Offline by construction

The APK must run with **no network at all**, so:

* fonts are self-hosted (`fonts.css` + `fonts/*.woff2`, 160 KB total) — no
  `fonts.googleapis.com` anywhere;
* every image, sound and module lives inside the APK;
* there is no service worker, no CDN, no analytics, no `localhost` reference;
* `android/build.sh` **fails the build** if one of those strings sneaks into the
  bundled game.

`scripts/pack-assets.py` re-encodes only the assets the game actually
references: 44 MB of source art → 11.6 MB of phone-sized art, and 80
unreferenced files never ship.

---

## 5. Building the APK

```bash
# one-time: fetch aapt2 / d8 / apksigner / ecj / JRE from PyPI + npm
android/fetch-tools.sh

# build + sign + smoke-verify
android/build.sh                 # → dist/CellWarriors-<version>.apk (+ .sha256)

CW_VERSION=1.0.2 CW_VERSION_CODE=10 android/build.sh
CW_DEBUG=1 android/build.sh      # debuggable (chrome://inspect)
```

There is deliberately **no Gradle and no Android SDK**: this repo is a static
web game, so the APK is a ~11 KB `WebView` activity plus the game files. The
build needs `aapt2`, `ecj`, `d8`, `apksigner`, a JRE and (for the optional
`zipalign` step) nothing else.

The build is verified before it is reported as a success:

* package `com.cellwarriors.game`, versionCode/Name from the build env,
* `sdkVersion 24`, `targetSdkVersion 34`,
* launchable activity present, `screenOrientation=6` (sensorLandscape),
* `classes.dex` > 4 KB (a stub dex means `ecj` silently failed),
* all 13 critical assets present (`index.html`, `src/ui.js`, `src/touch.js`,
  the mobile stylesheet, `fonts.css`, both woff2 families, icons, `classes.dex`,
  `resources.arsc`),
* apksigner reports v1/v2/v3 verification.

### Signing

`android/release.keystore` is generated on first build (RSA-2048, valid to
2058) and is **git-ignored**: a leaked key cannot be rotated, so each machine
mints its own. Passwords/aliases are overridable via `CW_KEYSTORE`,
`CW_KS_ALIAS`, `CW_KS_PASS`.

> Because the key is not committed, upgrading an installed APK requires the
> same keystore. Keep `android/release.keystore` with the release notes if you
> want side-load upgrades to work; otherwise uninstall the old build first.

---

## 6. Android shell behaviour

`android/app/src/main/java/com/cellwarriors/game/MainActivity.java`

* `sensorLandscape`, both ways up, immersive sticky fullscreen.
* WebView: JS + DOM storage on (save file), media playback without a user
  gesture (SFX), file access for `file:///android_asset/`, **no** content or
  mixed-content access, wide viewport, fixed text zoom.
* A MIME map guarantees `.js` is served as `application/javascript` on API 24
  devices, where a `file://` module otherwise fails to parse.
* Hardware back is forwarded to `window.__cwAndroidBack()`. The web router
  closes overlays first, then walks the screen graph, and returns `false` to let
  the activity finish — so back never strands you and never quits mid-run.
* `onPause` calls `window.__cwPauseForApp()` (audio loops stop, battle pauses).
* Renderer death (low memory) recreates the activity instead of showing a white
  box.
* No permissions are requested; the app is fully offline.

---

## 7. Verifying a change

```bash
node scripts/phone-check.mjs      # 144 phone/touch/offline/layout checks
node scripts/e2e.mjs              # 162 game-logic checks
node scripts/full-run.mjs         # plays a whole 11-floor run through the phone UI
node scripts/apk-sim.mjs          # boots the built APK's web app in a fake WebView
node scripts/sim-missions.mjs 40  # balance simulation
android/build.sh                  # APK + artifact smoke verification
```

`scripts/layout-preview.py` renders each screen's real geometry at 892×412 into
`docs/layout/*.png`. It is a wireframe, not a screenshot, but it is computed from
the same numbers the CSS uses — it found three layout bugs (card sizing, boss-bar
placement, roster overflow) that the DOM probes alone could not see.

`phone-check.mjs` is in two halves:

* **Part A** parses the real CSS and asserts the *contract*: safe-area usage,
  ≥44 px targets, the landscape query, the absence of any font CDN, that every
  class the mobile layer styles exists in the app (catches dead CSS), and that
  every screen has a rule.
* **Part B** runs the real `src/ui.js` in jsdom at **892 × 412** with a coarse
  pointer and touch events: tap-to-play (no double play), drag-to-play,
  long-press inspect, enemy targeting, END TURN, the Android back router, the
  first-run tutorial, and an offline asset-graph check (every referenced file
  exists on disk).

### Why there are no screenshots

This CI image has no GPU browser available (Chromium needs `libnss3`/`libnspr4`,
which cannot be installed here). The layout is therefore verified by
construction — fixed design canvas, one shared media query, two size-derived
variables — plus the static CSS audit and the behavioural probes above. When a
screenshot-capable browser is available, load `index.html` at 892×412 and the
same rules apply.
