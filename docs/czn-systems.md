# CZN SYSTEMS → CELL WARRIORS IMPLEMENTATION

Research notes from public guides (Prydwen, Game8, ItemLevel, GameWith) and exactly how each
system is implemented in `src/engine.js`. Use this to check fidelity.

---

## 1. Team & deck

| CZN | Ours |
| --- | --- |
| Team of 3 combatants | Team of 3, chosen from a 4-character roster |
| Each character owns a personal card pool | Same — each card has an `owner`, but each kit is a fixed 5 cards (1 Basic · 2 Skills · 1 Heavy · 1 one-use Buff Upgrade) |
| All three pools shuffle into one draw pile | Same, one combined pile — a full team is 15 cards |

## 2. Turn economy

| CZN | Ours |
| --- | --- |
| Draw 5 cards per turn | `DRAW_PER_TURN = 5` |
| 7 cards on the first turn | `FIRST_DRAW = 7` |
| 3 AP per turn | `AP_PER_TURN = 3` |
| Hand cap 10 | `HAND_CAP = 10`, draws stop at the cap |
| Unplayed cards go to the discard at end of turn | Yes, unless tagged **[Retain]** |
| Empty draw pile reshuffles the discard | Yes |

## 3. Card types

| Type | Behaviour |
| --- | --- |
| **Attack** | Damage. Crimson frame. |
| **Skill** | Shield / heal / buff. Teal frame. |
| **Upgrade** | Applies a permanent effect and is Exhausted — our kits tag them `Exhaust`, so each one is usable ONCE per battle. |
| **Curse** | Unplayable, clogs the hand. |
| **Status** | Created mid-fight (e.g. Breakdown), playable to clear. |

## 4. Tags

| Tag | Implementation |
| --- | --- |
| **Retain** | Stays in hand at end of turn |
| **Exhaust** | Removed from the fight after use |
| **Initiation** | Guaranteed in the opening hand (every Buff Upgrade is Initiation) |
| **Celestial** | Triggers automatically after you play a card costing 2+ AP |
| **Lead** | 50% chance to cost 1 less when drawn |
| **Haste** | Playing it does not lower enemy action counters |
| **Unique** | Card can never be duplicated in the deck |

## 5. Enemy action counters

Every enemy carries a counter (typically 2–4). **Each card you play lowers every enemy counter by
1.** At 0 the enemy acts immediately and its counter resets. Ego skills and Haste cards do not
lower counters — that is the escape valve.

Enemies telegraph intent: attack value, shield, buff or debuff.

## 6. Attributes & weakness

Five attributes: **Passion, Order, Justice, Void, Instinct**. There is **no** rock-paper-scissors
chart — an attack only gets a bonus if the attacker's attribute matches the enemy's listed
weakness.

- Matching attribute: **×1.5 damage**
- Tenacity damage scales with card cost, and is multiplied heavily on a weakness match
- **Tenacity** is a second bar under HP. Break it and the enemy is **Ravaged**:
  - team gains **+1 AP**
  - the broken unit's stress drops
  - the enemy's action counter increases by 1 (it is delayed)
  - the enemy takes **+30% damage** while Ravaged

## 7. Stress & Mental Breakdown

- Taking HP damage also adds Stress. **Shields that fully absorb an attack add no Stress.**
- Healing HP reduces Stress; overheal does not.
- At 100 Stress the character has a **Mental Breakdown**:
  - a third of their max HP is **locked** (unhealable) until recovery
  - their Ego skill is disabled
  - their cards are replaced by **Breakdown cards** in the draw pile
  - recovery needs 5 plays, then 6, then 8 — it gets worse each time
- Recovery: Stress → 0, team regains the locked HP, heals half of what was lost, Ego cost −4.

## 8. Ego Points (EP)

- Max **7 EP**. Gain +1 EP per 2 cards played and +1 per enemy killed.
- Ego skills cost 4 EP (discounted to 0 after that character recovers from a breakdown).
- **Ego skills do not advance enemy counters.**
- One Ego per character; the order is shuffled at fight start (redrawable with hourglasses).

## 9. Epiphany

- A character randomly gains a lightbulb. Their **next card played** adds one of their unique
  cards to the deck, costing **0 AP that turn**.
- Separately, a card drawn can glint: playing it costs **0 AP** and gets an upgraded effect.

## 10. Protos / Sands of Time

Three hourglasses per fight (ours refreshes each fight, CZN refreshes daily):

| Cost | Effect |
| --- | --- |
| 1 | Rewind the last card played |
| 2 | Redraw the Ego skill order |
| 3 | Rewind the whole turn (back to turn start) |

---

## 11. What we deliberately did not copy

- Gacha, crystals, banners, partner weapons, account progression
- The Chaos roguelike map (branching nodes, shops, campfires) — our missions are linear
- Real character names, art, story, and any copy from the game

## 12. Fidelity checklist

| System | Status |
| --- | --- |
| 3-character team, combined deck | ✅ |
| Draw 5 / 7 first, 3 AP, 10 hand cap, reshuffle | ✅ |
| Retain / Exhaust / Initiation / Lead / Haste / Celestial | ✅ |
| Enemy action counters + intents | ✅ |
| Attribute weakness ×1.5 | ✅ |
| Tenacity bar → Ravage → +1 AP | ✅ |
| Stress → Mental Breakdown → Breakdown cards | ✅ |
| EP + Ego skills, no counter advance | ✅ |
| Epiphany (character + card glint) | ✅ |
| Sands of Time (3 hourglasses) | ✅ |
| Upgrade cards that persist for the fight | ✅ |
| Curse / Status cards | ✅ |
| Chaos map, shops, partners, gacha | ❌ (out of scope) |

---

## 13. Interface fidelity (v1.1.0 — the CZN shell)

Battle mechanics were already matched in §1–11. The **interface** now matches too.

| CZN screen | Ours | Where |
| --- | --- | --- |
| Ship-deck main menu: energy hex, icon cells, LV 25 plate, mission rail, standing character, seated crew, GIFT plate, bottom command ribbon | Same composition, rebuilt from scratch | `src/czn.js` → `.czn-hub`, `czn.css` §3 |
| Character detail page: pale geometric stage, standing art, right stat rail (Attack / Defense / HP / Crit Rate / Crit DMG), `n TB` power readout, orange ASCEND | Same, with real values from the Lab | `renderCharacter()` → `.czn-showcase` |
| Battle: `TURN / n / state` banner between two rules, cards on an arc over the stage, enemy readouts at the right edge | Same | `showTurnBanner()`, `renderCznBattlePanels()`, `czn.css` §6 |
| Paper-white menus with notched plates and cyan rules | Same | `czn.css` §2, §4, §5 |
| Chaos map: dark starfield, floating node islands, teal links | Same (our own node art) | `czn.css` map block |

**Deliberately not copied:** the live-service chrome — banners, gacha, stamina timers,
partner weapons, shop currencies. The hub's energy plate is bound to the run currency
(Cells) so the number on screen is always a number the player can spend.
