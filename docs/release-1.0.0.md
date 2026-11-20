# Cell Warriors v1.0.0 — first phone build

The game now runs properly on a phone, and ships as an installable Android app.

**Download:** `CellWarriors-1.0.0.apk` (14 MB, signed, below)
**Requires:** Android 7.0 (API 24) or newer, any phone or tablet, **no permissions at all**.

---

## What's new

### Playable on a phone, in landscape

The whole game was rebuilt around a **892 × 412 CSS canvas** — the shape of a modern
phone held sideways — instead of assuming a desktop window:

* **Safe areas respected.** Notch, punch-hole and gesture bar are handled with
  `env(safe-area-inset-*)` on every full-bleed edge; nothing important hides under the
  camera or the home bar.
* **Thumb-sized controls.** Every tappable control is at least 44 px; END TURN is a
  76 px disc that sits under your right thumb.
* **No hover, no keyboard needed.** Tap a card to play it, tap an enemy to target it,
  drag a card onto an enemy, hold a card or enemy to open its full details. Hover-only
  styling is stripped on touch devices and replaced with press feedback.
* **The whole battle fits one screen.** Boss bar, stage, side rails, hand and END TURN
  are laid out for ~430 px of height — no scrolling, no zooming, no clipped panels.
* **A first-run tutorial** teaches the thumb gestures once per install ("THUMB CONTROLS"),
  because a phone has no keybind legend and no hover tooltips.
* **Fullscreen + landscape lock in the app**, with the Android back button wired to a
  proper screen router: it closes menus, then backs out screens, then exits — never
  mid-battle.

### The APK

* **Fully offline.** HTML/CSS/JS, 55 illustrations, audio and both font families are
  bundled inside the APK. It requests **no permissions** and makes **no network calls**.
* **Self-hosted fonts** (`Inter`, `Chakra Petch`) — the old Google Fonts CDN import is
  gone, so the game renders identically offline and in the browser.
* **14 MB** instead of 106 MB: unreferenced art is dropped and illustrations are
  re-encoded for phone resolutions (`scripts/pack-assets.py`).
* **Proper launcher icon**: adaptive icon (foreground + background + monochrome layer
  for Android 13 themed icons), legacy and round variants for older launchers.
* Runs immersive fullscreen, keeps the screen awake, survives low-memory renderer
  restarts, and pauses itself when you switch away.

### Everything verified

| Suite | Checks | What it covers |
| --- | --- | --- |
| `npm run test:e2e` | 162 | whole game flow, rules, save migration |
| `npm run test:phone` | 134 | phone layout contract, touch gestures, safe areas, offline graph |
| `npm run test:apk` | 19 | boots the **shipped APK's** web app in a simulated WebView |
| `npm run test:run` | 5 | plays a complete 11-floor expedition through the phone UI |
| `npm run apk` | 30+ | builds, signs, then smoke-verifies the artifact |

The build refuses to produce a release if the APK is not landscape-locked, misses an
asset the game asks for, ships a stub `classes.dex`, contains any network font/CDN
reference, or loses its signature.

---

## Install

1. Download `CellWarriors-1.0.0.apk` from the assets below.
2. Open it. Android asks once whether your browser may install unknown apps — allow it.
3. Launch **Cell Warriors**, turn the phone sideways, and press **CHAOS EXPEDITION**.

`CellWarriors-1.0.0.apk.sha256` is attached for verification:

```bash
sha256sum -c CellWarriors-1.0.0.apk.sha256
```

> The APK is signed with a local release key. Upgrading in place requires a build signed
> with the same key, so if a future release cannot match it, uninstall the old one first.
> Your save lives in the app's own storage and is lost on uninstall (the game is
> single-player and fully offline, so there is nothing to sync).

---

## Known limitations

* **Android only for now.** The browser build is fully playable at any size, but the
  packaged app is APK-only; there is no iOS build (it would need a Mac + Xcode, which
  this project does not have).
* **Portrait isn't a first-class layout.** The APK is locked to landscape; if the web
  build is opened in a narrow portrait window it shows a usable single-column fallback
  plus a "rotate your phone" prompt.
* **No cloud save.** Progress is per-device (`localStorage`, with a
  SharedPreferences fallback inside the APK).
* Card art is phone-optimised in the APK (≤420 px wide); full-resolution sources stay
  in `images/` in the repository.

## Under the hood

* `android/build.sh` — aapt2 → ecj → d8 → apksigner, no Gradle and no Android SDK.
* `android/fetch-tools.sh` — one-time toolchain fetch (PyPI + npm).
* `styles-mobile.css` — the landscape phone layer; `src/touch.js` — touch/platform
  plumbing; `docs/mobile.md` — the full design contract.
* `scripts/layout-preview.py` — renders each screen's real geometry to
  `docs/layout/*.png` (the CI image has no GPU browser, so this is how the layout is
  reviewed).
* `scripts/phone-check.mjs` — static CSS audit + behavioural touch tests.
