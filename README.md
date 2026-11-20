# Cell Warriors

A tactical card RPG fought inside a seventeen-year-old's immune system. Anime squad battler:
pick 3 of 6 combatants, then fight with the cards those characters own.

**Status:** playable — CZN-style battle system, roster, 5 missions, 30 cards (6 lean kits),
Ego skills, Epiphany, Stress breakdowns, Sands of Time.

```bash
npm run dev           # http://localhost:5173
npm run test:e2e      # jsdom end-to-end run of the whole flow
npm run sim:missions  # bot win rate per mission
```

Rules: **[docs/mechanics.md](docs/mechanics.md)** — what was copied from Chaos Zero Nightmare and
how: **[docs/czn-systems.md](docs/czn-systems.md)** · Cast and art:
**[docs/character-bible.md](docs/character-bible.md)**

---

## Flow

```
Title → COMBATANTS (pick 3) → MISSIONS → story beat → battle → next mission unlocks
```

## The battle system

Modelled directly on *Chaos Zero Nightmare*:

- **Draw 5 / 3 AP / 10-card hand cap.** Empty draw pile reshuffles the Graveyard.
- **Action counters.** Every enemy has a counter that drops by 1 for each card played. At zero it
  acts immediately, on its telegraphed intent. Ego skills and Haste cards do not advance counters.
- **Attribute weakness.** Passion ✦, Order ◈, Justice ✧, Void ✶, Instinct ✹. A matching hit does
  ×1.5 damage and 2.5× Tenacity damage.
- **Tenacity → Ravage.** Break the bar under the HP: +1 AP, stress relief, enemy delayed one counter,
  and it takes +30% damage.
- **Stress → Mental Breakdown.** Damage adds Stress. At 100 a third of that character's HP locks,
  their Ego seals, and their cards become Breakdown cards needing 5 (then 6, 8, …) plays.
- **EP + Ego skills.** Max 7 EP, 4 per Ego, one Ego per character.
- **Epiphany.** A lightbulb character adds a free unique card; glinting cards cost 0 AP and hit harder.
- **Sands of Time.** Three hourglasses: undo card, redraw Ego order, rewind turn.

## Cast

| Character | Cell | Class | Attribute | HP |
| --- | --- | --- | --- | --- |
| Kaito | Neutrophil | Striker | ✦ Passion | 88 |
| Momo | Platelet | Vanguard | ◈ Order | 104 |
| Goro | Macrophage | Controller | ✧ Justice | 110 |
| Bibi | Mast Cell | Psionic | ✶ Void | 84 |
| Yuna | Eosinophil | Alchemist | ✹ Instinct | 92 |
| Sable | Memory B | Mnemonist | ✧ Justice | 96 |

Sable is the percent-scaling combatant: her damage is a % of the enemy's
Max/Missing HP, her Shield a % of her own Max HP, and her heals a % of
missing HP — ordinary against trash, devastating against bosses.

## Cards — one lean kit per combatant

Every combatant brings the same five-card skeleton, one copy of each, so a full team shuffles a
15-card deck:

| Slot | Type | Cost | Job |
| --- | --- | --- | --- |
| 0 | **Basic Attack** | 1 AP | cheap damage plus one small rider |
| 1 | **Skill (light)** | 1 AP | instant support — heal, Shield, draw, Mark |
| 2 | **Skill (core)** | 1 AP | the character's simple signature tool |
| 3 | **Heavy** | 2–3 AP | the big damage / Shield / heal / HP / DoT payoff |
| 4 | **Buff Upgrade** | 1 AP | permanent buff, **one use per battle** (Exhaust), always in the opening hand |

| Character | Basic | Skills | Heavy | Buff Upgrade |
| --- | --- | --- | --- | --- |
| Kaito | Cytokine Jab | Adrenal Brace · War Cry | Last Shift (Fury finisher) | Overclock |
| Momo | Order Strike | Guard Stance · Field Splint | Aegis Slam (Shield → dmg) | Field Protocol |
| Goro | Scalpel | Clot · Marrow Broth | Devour (dmg + lifesteal) | The Wall |
| Bibi | Signal Ping | Fuzz · Flare | Cytokine Storm (AoE) | Cross-talk |
| Yuna | Venom Sting | Sweet Antidote · Spore Mist | Epidemic Bloom (Poison DoT) | Living Culture |
| Sable | Annotate | Margin Note · Second Reading | Titer Lance (%HP) | Living Index |

Design rule for now: **one rider per card**. Debuffs and multi-stage combos come back in a later
pass once the lean kit feels good.

## Files

| Path | What |
| --- | --- |
| `src/data.js` | combatants, cards, Ego skills, enemies, missions, story |
| `src/engine.js` | battle engine (pure, no DOM) — the CZN state machine |
| `src/ui.js` | roster, missions, story, battle rendering |
| `src/progress.js` | save (`cellwarriors.save.v5`): cleared missions, team, run, lab progress |
| `styles.css` | the visual system |
| `scripts/e2e.mjs` | jsdom end-to-end test |
| `scripts/sim-missions.mjs` | balance bot |
| `scripts/cutout.py` | transparent-background character art pipeline |
| `docs/` | mechanics, CZN mapping, character bible, design system, store pack, privacy |

## Known gaps

- Three cards still use legacy/shared art (Goro's Marrow Broth, Bibi's Fuzz + Cytokine Storm, Yuna's
  antidote/bloom) — see `docs/card-art-queue.md`.
- No Chaos-roguelike map, shops, partners, or gacha (deliberately out of scope).
- Single player, local save; Supabase authority comes with the APK.
