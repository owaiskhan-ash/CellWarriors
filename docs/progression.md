# CELL WARRIORS — PROGRESSION & ECONOMY v1

The rules behind the adventure screen. Numbers live in `src/data.js` (`REGIONS`, `UNLOCKABLE`)
and `src/progress.js` (deck rules) — this file explains *why* they're those numbers.

---

## 1. The loop

```
Menu → The Body (6 regions) → Fight → Reward (stem cells) → Stem Cell Lab → better deck → next region
```

One region = one fight. No energy timers, no daily gates, no ads. You can lose and immediately retry.

## 2. Regions

| # | Region | Organ | Site HP | Start infection | Deterioration | Spawn | Reward |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Throat | Tonsils | 30 | 55 | +2 | every 2 turns | ◈ 40 |
| 2 | Lungs | Alveoli | 38 | 58 | +3 | every 2 turns | ◈ 55 |
| 3 | Gut | Intestinal wall | 44 | 60 | +3 | every 2 turns | ◈ 70 |
| 4 | Skin Wound | Cut site | 40 | 64 | +4 | every turn | ◈ 85 |
| 5 | Bloodstream | Whole system | 46 | 64 | +3 | every turn | ◈ 105 |
| 6 | Meninges | Blood-brain barrier | 56 | 66 | +3 | every turn | ◈ 150 |

**Rules**
- Region 1 is always open. Each next region unlocks when the previous one is **cleared**.
- First clear pays the full reward; **replays pay 25%**, rounded.
- Losing pays nothing — the region stays open, so the retry is free.

**Design intent:** regions 1–2 are the tutorial (a bot wins 100%). The difficulty step happens at
Region 3, where the spawn rate stops being forgiving. Regions 5–6 are where the deck you built
starts to matter.

### Measured difficulty (bot, 200 games per region)

| Deck | Throat | Lungs | Gut | Wound | Blood | Meninges |
| --- | --- | --- | --- | --- | --- | --- |
| Starting (19) | 100% | 100% | 77% | 88% | 40% | 42% |
| + all 6 unlocks | 100% | 100% | 90% | 97% | 64% | 39% |

Re-run any time with `node scripts/sim-regions.mjs 200`. A human should sit comfortably above
these numbers; the bot is deliberately stupid about card order.

## 3. Currency

**Stem cells (◈)** — earned only from clearing regions. **There is no way to buy them.** No ads,
no purchases, no timers. This is a product promise, not a tuning knob: if it ever changes, the
store listing and the "no purchases" claim change first.

Total earnable: 40 + 55 + 70 + 85 + 105 + 150 = **◈ 505** on first clears, plus 25% on replays.
Full lab cost: 60 + 60 + 80 + 90 + 120 + 200 = **◈ 610**. So you cannot buy everything in one
pass — replaying is intentional, and it's why replays still pay something.

## 4. The Stem Cell Lab

You do not "pull" characters. You spend stem cells to **differentiate** a specific cell into a
specific type. Cost is fixed and visible — no gacha, no rate table, no pity counter, nothing to
disclose.

| Card | Faction | Cost | What it adds |
| --- | --- | --- | --- |
| Eosinophil | Myeloid | ◈ 60 | +2 dmg vs armoured pathogens |
| Complement | Humoral | ◈ 80 | 2 dmg to every pathogen |
| Adrenaline | Endocrine | ◈ 60 | +2 ATP this turn |
| IL-2 | Lymphoid | ◈ 90 | permanent +1 ATK and heal 1 to all your cells |
| NK Cell | Lymphoid | ◈ 120 | hits the infection site, ignoring the field |
| Memory B | Humoral | ◈ 200 | on play: infection −8% |

## 5. Deck rule (important)

**The deck never grows past 19 cards.**

When you buy a card, one copy of the weakest still-duplicated basic (Histamine → Platelet →
Antipyretic → Neutrophil) is removed. Upgrades must *feel* like upgrades; a growing deck just
dilutes your draws and makes the game harder the more you play — the classic solo-dev trap.

A proper deck builder (choose any 19 from everything owned) replaces this rule later; until then,
the swap keeps progression honest with zero UI.

## 6. Save data

`localStorage` key `cellwarriors.save.v1`:

```json
{ "version": 1, "stem": 190, "unlocked": ["neutrophil", "..."], "cleared": ["throat"], "lastRegion": "gut" }
```

- Unknown or corrupt saves fall back to a fresh profile rather than crashing.
- This exact payload is what syncs to Supabase when accounts ship — keep it small and boring.
- Reset: the "reset save" ghost button on the menu.

## 7. Not built yet

- Deck builder (pick 19 from owned)
- Multiple fights per region / bosses
- Card upgrades, daily runs, PvP raids
- Server authority (all of the above is client-side today — fine for single-player, **not** for PvP)
