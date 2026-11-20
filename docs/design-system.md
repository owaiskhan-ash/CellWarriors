# CELL WARRIORS — DESIGN SYSTEM v1.0

Everything visual is built from this file. No improvised colours, no improvised type sizes.
If a screen needs something that isn't here, add it here first, then build it.

Live preview of the components: **`design/card-lab.html`** (open in the browser — same CSS the
game uses, so what you see is what ships).

---

## 1. Brand

**Name:** CELL WARRIORS — always uppercase in the wordmark, never "Cell Warriors" in the logo.
**Tagline (optional):** *The body is the battlefield.*
**One-line pitch:** A tactical card RPG fought inside a seventeen-year-old's immune system.

### Logo (locked)

| Asset | File | Use |
| --- | --- | --- |
| **Wordmark** | `images/logo-anime-title.png` | Title screens, store feature graphic, key art |
| **App icon** | `images/app-icon-512.png` | Play Store 512×512 icon, launcher icon, favicon |

**Construction:** chunky anime display lettering, crimson `#C2183A` → `#6D0F22` gradient,
heavy bone-white `#F2F4F5` outline, one cyan `#35D0C0` speed slash across both lines, and the
cell emblem (pale blue-white cell, dark violet nucleus) sitting above the first word.
The emblem alone is the icon; the type is never used inside the icon.

**Rules**
- Minimum sizes: wordmark 120px wide on screen / 30mm in print. Icon 48px.
- Clear space = 25% of the mark's width on every side. Nothing crosses it.
- Dark backgrounds only. Never place on white, never invert, never re-colour.
- Never re-type the name in a font and call it the logo — the lettering is the brand.
- Never stretch, add shadows, add particles, or crop the slash.
- Icon must survive at 48px: if you can't read it as a silhouette, simplify before shipping.

**Action required before launch:** these are raster exports. Redraw both as clean SVG
(trace in Figma) so they scale for the feature graphic, splash screens and any print.
Ship the traced originals in `design/svg/`, and treat the PNGs as the canon reference.

**Fonts (both SIL Open Font License — free to ship, self-host later)**
- **Display / UI:** `Chakra Petch` — weights 600, 700. Angular, technical, reads as anime-game.
- **Body / numbers:** `Inter` — weights 400, 600, 700. Tabular numerals on by default.
- Fallback stack: `'Chakra Petch', 'Inter', system-ui, sans-serif`.
- Never use a third family. Never italicise. Never letterspace body copy.

---

## 2. Colour tokens

Copy this block verbatim into CSS. These are the only colours allowed.

```css
:root {
  /* surface */
  --bg:          #050203;
  --bg-raised:   #0B0507;
  --panel:       #170A0E;
  --line:        #3A1620;

  /* immune / good */
  --teal:        #35D0C0;
  --cyan-pale:   #7FF3EA;

  /* danger / host */
  --blood:       #C2183A;
  --blood-deep:  #6D0F22;

  /* states */
  --amber:       #F0A63C;  /* inflammation, warning, legendary */
  --violet:      #B79BD8;  /* pathogen, epic */

  /* type */
  --text:        #F4E6E9;
  --bone:        #F2F4F5;
  --muted:       #9A7B84;
}
```

**Meaning is fixed.** Cyan = your cells. Crimson = pathogens, infection, damage.
Amber = inflammation and warnings. Violet = pathogen rarity/accent. There is no decorative colour.

---

## 3. Rarity

| Rarity | Border | Inner glow | Use |
| --- | --- | --- | --- |
| Common | `#9A7B84` 1px | none | starting cards |
| Rare | `#35D0C0` 1px | `0 0 0 1px rgba(53,208,192,.25)` | one per deck |
| Epic | `#B79BD8` 1px | `0 0 12px rgba(183,155,216,.35)` | signature cards |
| Legendary | `#F0A63C` 1px | animated sheen, 3s loop | 1 per account at launch |

Rarity is **border + glow only**. Never gold foil, never 8-point stars, never particle bursts.

---

## 4. Type scale

| Token | Size / line | Weight | Usage |
| --- | --- | --- | --- |
| `label` | 9.5 / 1.2 | 600 | uppercase, tracking `.14em` — section labels |
| `micro` | 10 / 1.35 | 400 | card rules text, log |
| `body` | 12 / 1.45 | 400 | descriptions |
| `card-name` | 11.5 / 1.1 | 700 | card titles |
| `hud` | 14 / 1.2 | 700 | turn counter, resource values |
| `title` | 26 / 1.1 | 700 | screen titles, tracking `.14em` |
| `hero` | 34 / 1.05 | 700 | win/lose screens only |

Numbers are always bold and always tabular. Nothing is smaller than 9px.

---

## 5. Spacing, radius, motion

- Spacing scale: **4 · 6 · 8 · 12 · 16 · 24 · 32**. No other values.
- Radius: card `8px` · panel `10px` · pill `99px`.
- Motion:
  - tap: `120ms ease-out`, transform only
  - state change: `250ms ease-out`
  - meters: `350ms ease-out`
  - fever: `250ms shake ×2`, once, never repeated
  - **No bounce, no spring, no confetti.** The tone is dry, not playful.

---

## 6. Card anatomy (the most important component)

Size **118 × 150** in hand. Board units are 1/3 of the row width, ~128px tall.

```
┌─────────────────────┐
│ (cost)      [TYPE]  │  cost gem 22px, top-left, over the art
│                     │  type tag top-right, 7px, dark pill
│   CHARACTER ART     │  76px tall, background-size: cover,
│   50% 8% crop       │  background-position: 50% 8% — locked
├─────────────────────┤
│   NAME              │  11px / 700 display font
│   ⚔ 3   ♥ 3         │  attack amber, hp teal
│   rules text        │  8.5px, clamped at 3 lines
└─────────────────────┘   rarity border (§3)
```

Rules:
- **Every cell card shows its character portrait.** A cell card without art is a bug.
- Cytokines have no portrait: they get a sigil on a cyan radial glow (`✹ ❄ ✦ ✸ ✜ ✷ ✧ ⚡`).
- Cytokines never show stats — the cost gem sits alone.
- Long rules text clamps at 3 lines; full text on long-press later. Never shrink the font.
- Unaffordable: `opacity .38`, no hover, tap returns a short reason.
- Board units are the same language: portrait, name, stats, 4px HP bar, and for pathogens a
  `SPREAD +n%` line in crimson.

## 7. Components

**Primary button** — gradient `--blood` → `--blood-deep`, white 800, uppercase, tracking `.12em`,
height 44px, radius 10px, glow `0 4px 14px rgba(194,24,58,.35)`. One per screen.

**Ghost button** — 1px `--line`, `--muted` icon, 30×30, radius 8px.

**Meters** — track `#240C13`, 1px `--line`, radius pill, 9px tall.
Infection: gradient crimson. Inflammation: cyan → amber → crimson with a tick at the fever line.

**Stat chip** — attack `⚔` amber, hp `♥` teal, 10px, 6px gap. Always in that order.

**Log line** — 10px, max 4 lines, colour by kind: `good` teal, `bad` #FF6B8A, `warn` amber,
`fever` #FF4D4D bold.

---

## 8. Iconography

- Line icons only, 2px stroke, 24px grid, rounded caps. No emoji in the shipped UI.
- Stat glyphs are the exception: `⚔` and `♥` are placeholders and **must be replaced** with
  drawn icons before launch (a real blade and a cell, not a sword-and-heart font glyph).
- Pathogen icons always violet. Immune icons always cyan.

---

## 9. Screen skeletons

- Max width **460px**, mobile-first, everything thumb-reachable in the bottom 40%.
- Order on the battle screen: HUD → pathogens → your cells → hand → log + End Turn.
- Never stack two primary actions. End Turn is the only primary button in a fight.

---

## 10. Accessibility (non-negotiable)

- Minimum 9px text is for secondary labels only; anything a player *must* read is 12px+.
- Colour is never the only signal: rarity also changes border thickness, states also change text.
- Contrast: body text on `--panel` must stay above 4.5:1 — `--muted` is the floor, never darker.
- All tap targets ≥ 44×44px, even when the visual is smaller.
- Everything must be playable with one thumb, in portrait, with the phone in the left hand.

---

## 11. File map

| File | What it owns |
| --- | --- |
| `styles.css` | tokens + all components (single source of truth for the game) |
| `design/card-lab.html` | living spec: every component rendered |
| `images/logo-anime-title.png` | locked wordmark (raster canon) |
| `images/app-icon-512.png` | locked app icon (raster canon) |
| `docs/design-system.md` | this file — the rules |
| `docs/character-bible.md` | characters, art style, image prompts |
| `docs/store-listing.md` | icon, screenshots, listing copy, age rating |
| `docs/privacy-policy.md` | legal page text |
