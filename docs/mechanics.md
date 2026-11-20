# CELL WARRIORS — BATTLE MECHANICS v2

Landscape squad battler. Your cells stand on the left, pathogens on the right, cards at the
bottom. This file is the source of truth for how a fight actually resolves.

---

## 1. The shape of a fight

```
[ Kaito ][ Momo ][ Goro ][ Bibi ]      VS      [ Biofilm ][ Strain ][ Toxin ]
                        ─── cards ───
```

- **Party:** up to 4 cells, fixed by the chapter's story. No squad builder yet.
- **Enemies:** 1–3 pathogens, fixed by the chapter.
- **Cards:** drawn from the **card sets of the characters in your party** — a shared deck built
  from their individual kits. If a character falls, their cards stay in hand but become
  unplayable. That is the whole point of per-character sets: losing a unit costs you tempo, not
  just HP.

## 2. Turn

1. You have **4 ATP** at the start of every turn (refreshes fully, never carries over).
2. Play cards from your hand while you can afford them.
3. Press **END TURN**.
4. Every living pathogen attacks once.
5. Taunts tick down, temporary ATK buffs expire, ATP refreshes, hand draws up to 4.

There is no turn limit. Fights end when one side is dead.

## 3. Targeting

- Tap a pathogen to mark it. Damage cards hit the marked target.
- If nothing is marked, cards hit the first living pathogen.
- Heals default to the **lowest-HP ally** — you never waste a heal on a full-HP unit.

## 4. Damage maths

```
card damage = card base damage + caster ATK + permanent buffs + temporary buffs
enemy damage = enemy ATK − weaken stacks
ally damage taken = (incoming − shield), then HP
```

Numbers are small and visible on the card **before** you play it (`⚔ 10` on the card face).
Nothing is random in a fight — the only RNG is which cards you draw.

## 5. The four roles

| Role | Who | Job | Kit identity |
| --- | --- | --- | --- |
| **DPS** | Kaito, Rin | Kill the thing | Raw single-target damage, cheap early cards |
| **SHIELD** | Momo | Absorb the turn | Team shields, taunt, one heal |
| **HEALER** | Goro | Keep everyone standing | Big self-shield, team heal, a cleave when idle |
| **SUPPORT DPS** | Bibi, Ivo, Noor | Change the maths | Buffs, AoE chip, energy, card draw, debuffs |

**Taunt** forces pathogens to attack that unit for N turns. Shields absorb damage before HP.

## 6. Cast

| Chapter | Party | Enemies | Bot win rate |
| --- | --- | --- | --- |
| I · The Throat | Kaito | Strep | 100% (tutorial) |
| II · The Lungs | Kaito, Momo | Strep ×2, Toxin | 93% |
| III · The Gut | Kaito, Momo, Noor | Toxin, Strain, Strep | 98% |
| IV · The Wound | Kaito, Momo, Goro | Strep, Strain, Toxin | 99% |
| V · The Bloodstream | Kaito, Momo, Goro, Bibi | Biofilm, Strain, Toxin | 89% |
| VI · The Meninges | Rin, Goro, Ivo | Biofilm, Strain, Toxin | 54% |

Bot win rates come from `npm run sim:chapters`. The bot only plays the highest-damage card it can
afford — it never taunts, never heals proactively, never holds energy. A human should clear
everything, but chapter VI should cost a retry or two.

**Design intent:** chapters I–IV teach one role at a time. V is the first fight where you have to
choose between shielding and pushing. VI drops your starter and hands you the late-game squad
(Rin's burst, Goro's sustain, Ivo's scaling) — the same lesson, harder.

## 7. Rules that keep it honest

- Every card is playable only by its owner. Dead owner = dead card.
- Damage is deterministic; previews are exact.
- Energy resets — no hoarding, so every turn is a decision.
- Enemy stats are pure (no hidden modifiers). Weaken is the only debuff and it is visible on the
  enemy card as reduced ⚔.

## 8. Not built yet

- Squad selection and character unlocks outside the story
- Ultimates / a second resource (Chaos-style burst meter) — the obvious next layer
- Element or strain counters between pathogen types
- Gear, levels, card upgrades
- PvP (needs server authority; all logic is client-side today)
