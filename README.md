# Cell Warriors

A tactical card RPG that takes place inside a 17-year-old human body. You command the immune
system. The pathogens are the enemy deck. The host's own inflammation is the trap.

**Status:** playable adventure loop. Six regions, stem-cell progression, saves. Grey-box UI.

```bash
npm run dev          # http://localhost:5173
npm run sim          # balance check: 500 bot games, prints win rate
npm run sim:regions  # difficulty curve per region
```

**Loop:** menu → The Body (6 regions) → fight → stem cells → Stem Cell Lab → better deck.
Progress saves to `localStorage`. Details and economy rules: **[docs/progression.md](docs/progression.md)**.

No build step, no dependencies. Plain ES modules, so the engine can be lifted onto a server later
without rewriting it.

---

## The loop

One fight = one infection. You get ~11 turns to destroy the **infection site (45 HP)**.
Pathogens spawn every turn, spread infection, and chew through your cells. Infection at **100%**
and the host is lost.

Three resources, all on screen, all calculable:

| Resource | Rule |
| --- | --- |
| **ATP** | Energy per turn. 3 → 6 (grows every other turn). Every card costs it. |
| **Inflammation** | 0–8. Strong plays add it. At 8, **FEVER** fires: 3 dmg to *everything*, infection +8, meter drops to 4. |
| **Infection** | The clock. Pathogens push it up, clearing them pulls it down. 100 = loss. |

The whole game is that triangle. Push damage → inflammation → fever burns your own board.
Cool down → you lose tempo → infection climbs. There is no free turn.

## Cards (starting deck, 19)

**Cells** — stay on the board, attack every turn, and die permanently.

| Card | Cost | Effect |
| --- | --- | --- |
| Neutrophil | 2 | 3 dmg / 3 HP. +1 Inflammation each attack. |
| Macrophage | 3 | 2 dmg / 7 HP. Heals 1 HP per turn. |
| Mast Cell | 2 | 0 dmg / 4 HP. Aura: your other cells +1 dmg. +2 Inflammation on play. |
| Killer T | 4 | 5 dmg / 4 HP. Pierces armour. +1 Inflammation on attack. |
| B Cell | 3 | 1 dmg / 5 HP. +1 Antibody per turn (max 3), each adds +1 dmg to all attacks. |
| Platelet | 1 | 1 dmg / 3 HP. Guard: pathogens hit it first. |
| Dendritic | 3 | 1 dmg / 4 HP. On play: infection −4%, draw 1. |

**Cytokines** — one-shot effects.

| Card | Cost | Effect |
| --- | --- | --- |
| Histamine | 1 | +2 dmg to all your cells this turn. +2 Inflammation. |
| Antipyretic | 1 | −3 Inflammation. |
| Interferon | 2 | All pathogens −2 ATK for 2 turns. |
| IL-6 | 1 | Draw 2. +1 Inflammation. |
| Opsonin | 2 | Next cell attack deals double. |

## Pathogens

| Enemy | ATK | HP | Spread | Cleared |
| --- | --- | --- | --- | --- |
| Strep | 2 | 5 | +4% | −6% |
| Toxin Blob | 0 | 4 | +7% | −5% |
| Biofilm | 1 | 11 | +3% | −12% (Armour 2) |

## Rules that make it a card game, not a slot machine

- **No hidden RNG.** Draws are random. Damage never is. Every number is previewed before you commit.
- **Numbers stay under 10** so a 16-year-old can compute a lethal line in their head.
- **Deterministic targeting.** Your cells hit the weakest pathogen, then the site once the field is clear.
  Skill lives in sequencing, ATP curves, and fever timing — not in luck.
- **Fever is a decision.** It clears a crowded field and hurts you. Knowing when to burn is the skill ceiling.

## Balance

`npm run sim` runs 500 games with a greedy bot: **~56% win rate over ~11 turns**.
A human who plays well should land well above that — which is the point.

## Adventure

| # | Region | Site HP | Clock | Spawn | Reward |
| --- | --- | --- | --- | --- | --- |
| 1 | Throat | 30 | +2 | every 2 turns | ◈ 40 |
| 2 | Lungs | 38 | +3 | every 2 turns | ◈ 55 |
| 3 | Gut | 44 | +3 | every 2 turns | ◈ 70 |
| 4 | Skin Wound | 40 | +4 | every turn | ◈ 85 |
| 5 | Bloodstream | 46 | +3 | every turn | ◈ 105 |
| 6 | Meninges | 56 | +3 | every turn | ◈ 150 |

Six unlockable cards in the lab (NK Cell, Memory B, Complement, IL-2, Eosinophil, Adrenaline).
**You cannot buy stem cells** — no ads, no purchases, no timers. Deck stays at 19: buying a card
swaps out the weakest duplicated basic.

## Next

- Deck builder (pick 19 from everything owned)
- Screenshots for the store
- PvP: async raids on a friend's body map — needs server authority first
- Then the art pass, then the APK

---

## Art direction (locked)

**In-game cards:** bold cel-shaded anime — thick clean outlines, flat highlights, crimson + cyan.
Reads at 96px, cheap to keep consistent across 40 cards.

**Key art / store screenshots:** gritty textured shounen (char-neutrophil-gritty).

**Lore pages / comic beats:** two-tone manga ink (char-neutrophil-manga).

Full cast specs, personalities, locked colours and prompt rules: **[docs/character-bible.md](docs/character-bible.md)**.

Generate any character prompt from the locked data — never from memory:

```bash
node scripts/prompt.mjs --list
node scripts/prompt.mjs neutrophil            # default pose, full body
node scripts/prompt.mjs platelet --shot=card   # card crop
node scripts/prompt.mjs all --shot=full        # whole roster
```

TODO art: Mast Cell, B Cell, Dendritic, 3 pathogen designs, 6 body-region backgrounds.
