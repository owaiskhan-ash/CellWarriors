# Cell Warriors v1.0.4 — UI scale fix + error sweep

## 📱 Download

**[⬇ CellWarriors-1.0.4.apk](https://github.com/owaiskhan-ash/CellWarriors/blob/main/releases/CellWarriors-1.0.4.apk?raw=true)** — 14 MB, Android 7.0+
**[sha256](https://github.com/owaiskhan-ash/CellWarriors/blob/main/releases/CellWarriors-1.0.4.apk.sha256?raw=true)** — `549fafcd248ed55d5618bde8803cc217f4fce9f0a3475468b0be5234dee73f62`

On a phone, tap the **⤓ Download raw file** icon.

---

## What was wrong

**Settings → UI SCALE broke the battle screen.** At 105% or 110% the app painted
itself 10% taller than the phone: the bottom of the hand strip and the whole
"RESONANCE · HOLD A CARD TO READ IT" footer fell off the bottom edge. The scale
was applied with CSS `zoom`, which scales a subtree but leaves the element's own
box at its layout size — so a `height:100%` app became 110% of the screen.

It is now a transform with an inverse-sized box: the app is laid out at
`1/scale` of the viewport and scaled back up, so it is exactly one screen at
every value (85 / 90 / 95 / 100 / 105 / 110). The layout also gets a local
`--vh` measured *inside* the app, so the hand strip, enemy art and battle stage
size themselves against the space they actually have rather than the window's.

## Error sweep

Ran every suite plus a scripted interaction pass over the whole app — every
screen, the settings modal, pause, sim lab controls, restart/end-test, long-press
inspect, card plays and END TURN on the touch path — collecting console errors,
page errors and failed requests:

- **0 console errors, 0 page errors, 0 failed asset requests.**
- All 14 views render; all 3 audio paths (voice, damage SFX, stingers) construct
  cleanly; every asset referenced by the HTML/CSS/JS exists on disk.
- The only defects found were the UI-scale overflow above and a jsdom-unsafe
  `getComputedStyle` read in the root-variable sync (fixed by keeping the scale
  factor in module scope).

## Guards

`battle-fit.mjs` grew a **UI SCALE pass**: two viewports × 85% and 110%, asserting
the app is exactly one screen wide and tall, the hand strip ends on screen and
END TURN is reachable. 134 checks (was 98). It fails on the old build.

| suite | result |
|---|---|
| e2e | 162 pass, no JS errors |
| phone-check | 146/146 |
| full-run | CLEARED rank B |
| battle-fit | 134/134 |
| screen-fit | OK |
| audio-check | 35/35 |
| apk-sim / check-apk | 22 pass / `resources.arsc` stored+aligned |

Same signing key as 1.0.3 (`94:f9:19:dc:…:c1:af:0`), so it upgrades in place and
keeps your save and run.
