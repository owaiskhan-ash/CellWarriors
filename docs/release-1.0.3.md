# Cell Warriors v1.0.3 — every card sounds like itself

## 📱 Download

**[⬇ CellWarriors-1.0.3.apk](https://github.com/owaiskhan-ash/CellWarriors/blob/main/releases/CellWarriors-1.0.3.apk?raw=true)** — 14 MB, Android 7.0+
**[sha256](https://github.com/owaiskhan-ash/CellWarriors/blob/main/releases/CellWarriors-1.0.3.apk.sha256?raw=true)** — `96a4d975fc335c49057d701e478723c59495649105fa781eb16c19c882179a09`

On a phone, tap the **⤓ Download raw file** icon. If the page saves as `.html`,
the download was the web page, not the app.

---

## Audio

**Every card has its own voice now.** Before, a character had exactly one
recorded "attack" clip, so all five of Kaito's cards — and all of Sable's, and
all of Goro's — said the identical thing. Playing three cards in a turn sounded
like a broken record, and it was the single worst thing about the game's feel.

Each card now speaks a short *formant-synthesised* utterance derived from a hash
of its own id: one to three syllables, its own vowels, its own pitch contour and
its own consonant onsets. It is generated at runtime, so it costs nothing to
ship and all 41 cards are distinct.

The character still owns the timbre, so the squad stays recognisable:

| character | pitch | timbre |
|---|---|---|
| Kaito | 128 Hz | bright, clipped, a little grit |
| Momo | 214 Hz | higher, breathy, quick |
| Goro | 92 Hz | low, gravelly, slow |
| Bibi | 176 Hz | loud, forward, fast |
| Yuna | 246 Hz | high, airy |
| Sable | 158 Hz | dry, precise, clinical |

Deterministic by design: `k_jab` sounds the same in every battle and on every
install, because the seed is the card id rather than `Math.random()`. The one
recorded clip per character that is still used is the **Ego** activation — once
a battle, where a performance beats a synthetic bark.

### SFX rebuilt

- **A real mix bus.** Everything now runs through a soft compressor (a 3-hit
  flurry lands as one punch instead of three clipped snaps) and a small
  synthetic room. Dry Web Audio bleeps are exactly what "cheap" sounds like.
- **~2.5× louder**, with the compressor holding the peaks: the old mix peaked
  around 0.02 of full scale, i.e. inaudible on a phone speaker next to anything
  else. A chip hit is now audible; a 50+ hit still ducks the whole mix for a
  beat before it lands.
- **Shaped noise instead of white noise.** Every impact/paper/glass sound is a
  filtered noise burst with a real attack curve, band-limited to its material.
- **Tuned by hand:** tap, draw, slash, shield, heal, hurt, break, coin, upgrade,
  epiphany, win — each is now two or three layers with a send to the room, so
  they sit in a space rather than on top of each other.

## The simulation chamber (the screen from the report)

The sim battle crammed three extra things into a 182px stage and they collided:

- **The duplicate boss HP bar is gone on phones.** "BOSS · TRAINING COLOSSUS
  999,999 / 999,999 · 100%" sat on top of the BREAK banner while the enemy plate
  underneath already showed the same HP, tenacity and status. One readout now.
- **The SIM stats panel is a sheet that starts closed.** It used to open over
  the entire right rail — hiding END TURN, the grave pile and AUTO — and it kept
  46% of the screen width on a phone. It now opens on tap and carries the
  headline numbers in a pill in the objective band.
- **The objective line has its own band** and yields its right end to that pill,
  so the two can never print over each other (it used to run under the enemy
  intent badges and across the TURN box).
- **Card effect plates lost their labels.** "THIS FIGHT" / "PERMANENT" /
  "+% HP" was 70–90px of text on a 90px-wide card, sitting across the card name
  and the rules text. The big number and its colour say the same thing; the
  wording is one long-press away in the inspect sheet.
- **Long numbers scale instead of spilling.** A %HP attack against the 999,999-HP
  training dummy previews as `105012`, which at the desktop size ran right over
  the card name. Four/five/six-digit values now get smaller type.
- The right-most card keeps its full text width — it has no neighbour covering
  it, so it no longer truncates for nothing.

## Guards

New: **`scripts/audio-check.mjs`** (`npm run test:audio`). It renders the real
synthesis through an `OfflineAudioContext` in Chromium and asserts, numerically:

- every sampled card is audible and none clips;
- no two cards produce the same waveform fingerprint;
- two cards of the same character differ (the exact bug that was reported);
- all 18 named SFX and all 5 damage tiers make a sound.

Visual bugs can be caught in a screenshot. "Every card sounds the same" cannot,
which is why it shipped — so it is a test now.

`battle-fit.mjs` grew a **simulation battle pass**: every phone viewport now
also plays a sim fight and asserts the pill sits in the objective band, the boss
bar is not duplicated, the stats sheet starts closed, END TURN is never covered,
and no card name is more than a third occluded. 98 checks (was 56).

`npm test` runs all six suites: e2e, phone shell, full run, battle fit, screen
fit, audio.

## Installing

Same signing key as before (SHA-1 `94:f9:19:dc:6f:4c:03:8f:e9:93:a6:d3:3d:b6:37:98:0e:67:c1:af:0`),
so it installs straight over 1.0.2 and keeps your save and run.
