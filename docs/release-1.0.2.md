# Cell Warriors v1.0.2 — the phone battle screen, fixed

## 📱 Download

**[⬇ CellWarriors-1.0.2.apk](https://github.com/owaiskhan-ash/CellWarriors/blob/main/releases/CellWarriors-1.0.2.apk?raw=true)** — 14 MB, Android 7.0+
**[sha256](https://github.com/owaiskhan-ash/CellWarriors/blob/main/releases/CellWarriors-1.0.2.apk.sha256?raw=true)** — `75f39e6af81397abee73950ddc1a1de52daa2678841ea2358176893f2a219006`

On a phone, tap the **⤓ Download raw file** icon. If the page saves as `.html`,
the download was the web page, not the app.

**This release is about one thing: the battle screen on a phone held sideways
now shows the whole fight.** Enemies, their intent badges, the break banner, the
objective line, your hand and the END TURN button are all on screen at once, on
screens from 667×375 (iPhone SE) up to 1024×768.

If you played 1.0.1 on a phone you probably saw one of these:

- the enemies painted *underneath* the card strip, or off the top of the screen;
- the break banner ("BREAK ◆ ORDER TENACITY → +1 AP") overlapping the objective;
- card names cut mid-word ("Overclo…ck") with the rules text running underneath
  the neighbouring card;
- END TURN out of reach, or sitting on top of the grave pile and the AUTO button.

All four are fixed.

## What was actually wrong

Three separate bugs, each hiding the next.

**1. The battle stage had no height limit.** `.battle-stage` is a CSS grid with
an *implicit* row. An implicit row is sized `auto`, so the track grew to fit its
tallest item — the enemy column, whose min-content height was about 447px on a
412px-tall screen. The stage was therefore ~447px tall inside a 182px flex slot,
and everything after the enemy art (health plates, tenacity labels, END TURN)
was painted below the fold, behind the hand strip. The row is now
`minmax(0, 1fr)`, so it is exactly the space the flex parent gives it.

**2. The hand strip was sized by its contents.** Card height was derived from
the strip height, but the strip height was derived from the cards: a feedback
loop. Make the cards taller and the strip got taller, which allowed taller cards
again, until the stage had nothing left. The strip now has a fixed
`clamp(132px, 42vh, 196px)` height and the card height cap is measured *from*
it, breaking the loop.

**3. The card fan overlapped by a constant amount, not the right amount.** Seven
cards at 105px wide do not fit in 655px, so the fan overlaps them. The overlap
was a fixed value, which left either a gap on wide screens or — on narrow ones —
cards that covered a neighbour's card *name*, which wraps and is then clipped
mid-word. The overlap is now derived from the spare width, and each card's text
column reserves exactly the strip its neighbour will cover (`--card-cover`).
Truncation now shows as a proper ellipsis at a word boundary, never as a word
sliced in half by the next card's frame.

The END TURN button was a 76px disc that grew until it covered the AUTO toggle
and the grave box on short screens. It is now a 66×52 rectangle pinned in the
rail's bottom slot — still well over the 44px minimum touch target.

## Guards, so this cannot ship again

Two browser-driven layout tests now gate the build. Both run the real app in
headless Chromium at real phone viewports and measure real boxes.

- **`scripts/battle-fit.mjs`** — 8 device viewports, 56 assertions. Checks the
  battle screen's regions against each other (objective vs break banner vs
  intent badges vs enemy art vs stage vs hand vs rail), that cards fit the strip
  and keep their 0.74 art ratio, that all cards are reachable, and that nothing
  is clipped in a way that also runs off the side of the screen.
  `npm run test:battle` (add `--shot=dir` for PNGs of every device).
- **`scripts/screen-fit.mjs`** — every other screen (title, roster, missions,
  map, guide, character, sim) at 5 viewports, asserting nothing overflows the
  viewport and nothing is clipped away without a way to scroll to it.
  `npm run test:screens`.

`npm test` now runs all five suites: e2e, phone shell, full 300-mission run,
battle fit and screen fit.

Two lessons from debugging this are recorded in the tests themselves, because
both cost hours:

- **`line-clamp: 3` silently disables `-webkit-line-clamp`.** The standard
  property resets `display` to `flow-root`, which is exactly what the
  `-webkit-box` clamp needs to *not* be. Text quietly spills out of the card.
  Use only the `-webkit-` triple.
- **Never trust `getBoundingClientRect()` in headless Chromium.** CSS animations
  are throttled, so a card mid-`cardDraw` reports 150px while `offsetHeight`
  says 141, and a rotation transform inflates the box by ~10%. Both test
  harnesses inject `animation:none; transition:none; transform:none` before
  measuring.

## Installing

Download `CellWarriors-1.0.2.apk` below and open it on the phone. It installs
over 1.0.1 and keeps your save. Signed with the same key as 1.0.1 (SHA-1
`94:f9:19:dc:6f:4c:03:8f:e9:93:a6:d3:3d:b6:37:98:0e:67:c1:af:0`), so the update
will not be rejected as a different package.

If Android warns about an unknown app, choose **Install anyway** — the game is
fully offline and requests no permissions at all. See
[install-troubleshooting.md](install-troubleshooting.md) if it refuses.

- `releases/CellWarriors-1.0.2.apk` — 14 MB
- sha256 `75f39e6af81397abee73950ddc1a1de52daa2678841ea2358176893f2a219006`
