# Cell Warriors

A tactical card RPG fought inside a seventeen-year-old's immune system. Anime squad battler:
pick 3 of 4 characters, then fight with the cards those characters own.

**Status:** playable — roster, team select, 5 missions, 12 cards, battle loop.

```bash
npm run dev           # http://localhost:5173
npm run sim:missions  # bot win rate per mission
```

Rules: **[docs/mechanics.md](docs/mechanics.md)** · Cast and art: **[docs/character-bible.md](docs/character-bible.md)**
· UI rules: **[docs/design-system.md](docs/design-system.md)**

---

## Flow

```
Title → CHARACTERS (pick 3) → MISSIONS → story beat → battle → next mission unlocks
```

## Cast — one per role

| Character | Cell | Role | Element | HP | ATK |
| --- | --- | --- | --- | --- | --- |
| Kaito | Neutrophil | **DPS** | Blood | 30 | 3 |
| Momo | Platelet | **SHIELD** | Tide | 34 | 1 |
| Goro | Macrophage | **HEALER** | Ember | 40 | 2 |
| Bibi | Mast Cell | **SUPPORT DPS** | Void | 24 | 1 |

Each character owns three cards (12 total). Your hand is drawn from the card sets of the three
characters you deployed — if one falls, their cards stay in hand but become unplayable.

## Battle

- **4 EP per turn**, resets every turn. Cards cost 1–3.
- **Attack** cards (crimson frame) hit the marked pathogen. **Skill** cards (teal frame) shield,
  heal, buff, or generate EP.
- Tap a pathogen to mark it — damage goes there.
- Deterministic damage: the exact number is printed on the card face before you commit.
- Party HP is shown as one pooled bar at the top; enemies carry floating HP + ATK badges.

## Files

| Path | What |
| --- | --- |
| `src/data.js` | roster, card sets, enemies, missions, story |
| `src/battle.js` | battle engine (pure, no DOM) |
| `src/ui.js` | viewers, roster, missions, battle rendering |
| `src/progress.js` | save (`cellwarriors.save.v3`): cleared missions + team |
| `styles.css` | the visual system |
| `scripts/cutout.py` | transparent-background character art pipeline |
| `docs/` | mechanics, character bible, design system, store pack, privacy |

## Known gaps

- 6 of 12 card illustrations are still using character cutouts (`artPending` flag in `data.js`) —
  Goro's and Bibi's sets. Real card art is queued.
- No character unlocks, upgrades, ultimates, or PvP yet.
