# Cell Warriors

A tactical card RPG fought inside a seventeen-year-old's immune system. Landscape squad battler:
your cells on the left, pathogens on the right, and a hand of cards at the bottom built from your
squad's own kits.

**Status:** playable story — six chapters, seven characters, four roles.

```bash
npm run dev           # http://localhost:5173
npm run sim:chapters  # bot win rate per chapter
```

Rules and maths: **[docs/mechanics.md](docs/mechanics.md)** · Cast and art:
**[docs/character-bible.md](docs/character-bible.md)** · UI rules:
**[docs/design-system.md](docs/design-system.md)**

---

## The loop

Title → story beat → battle → next chapter unlocks.

- **4 ATP per turn.** Cards cost 1–4. Energy resets, so every turn is a spend decision.
- **Cards come from your squad.** Each character owns a three-card kit; if they fall, their cards
  are dead weight in your hand.
- **Four roles:** DPS (Kaito, Rin), SHIELD (Momo), HEALER (Goro), SUPPORT DPS (Bibi, Ivo, Noor).
- **Targeting:** tap a pathogen to mark it; heals always find the weakest ally.
- **Deterministic damage.** The exact number is printed on the card before you commit.

## Chapters

| # | Chapter | Party | Enemies |
| --- | --- | --- | --- |
| I | The Throat | Kaito | Strep |
| II | The Lungs | Kaito, Momo | Strep ×2, Toxin |
| III | The Gut | Kaito, Momo, Noor | Toxin, Strain, Strep |
| IV | The Wound | Kaito, Momo, Goro | Strep, Strain, Toxin |
| V | The Bloodstream | Kaito, Momo, Goro, Bibi | Biofilm, Strain, Toxin |
| VI | The Meninges | Rin, Goro, Ivo | Biofilm, Strain, Toxin |

## Files

| Path | What |
| --- | --- |
| `src/data.js` | cast, card sets, enemies, chapters, story |
| `src/battle.js` | battle engine (pure, no DOM) |
| `src/ui.js` | views, rendering, input |
| `src/progress.js` | save file (`cellwarriors.save.v2`) |
| `styles.css` | the whole visual system |
| `docs/` | mechanics, character bible, design system, store pack, privacy |
| `images/` | character and pathogen art, logo, icon |
