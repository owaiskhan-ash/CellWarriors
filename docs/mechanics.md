# CELL WARRIORS — MECHANICS v3

## The loop

```
Title → CHARACTERS (pick exactly 3 of 4) → MISSIONS → story → battle → unlock next mission
```

## Roster

| Character | Role | Element | HP | ATK | Identity |
| --- | --- | --- | --- | --- | --- |
| Kaito | DPS | Blood | 30 | 3 | Cheapest damage in the game, pays HP for it |
| Momo | SHIELD | Tide | 34 | 1 | Team shields + a taunt wall |
| Goro | HEALER | Ember | 40 | 2 | Squad heal, self taunt, a cleave when idle |
| Bibi | SUPPORT DPS | Void | 24 | 1 | Buffs ATK, AoE chip, generates EP |

Elements exist as identity and colour only right now — there is no elemental counter chart yet.

## Cards

| Card | Owner | Type | Cost | Effect |
| --- | --- | --- | --- | --- |
| Blade Rush | Kaito | Attack | 1 | 6 dmg |
| Last Shift | Kaito | Attack | 3 | 12 dmg, self −3 HP |
| First In | Kaito | Skill | 1 | 4 dmg + 4 shield |
| Patch Up | Momo | Skill | 1 | 6 shield to squad |
| Stand Firm | Momo | Skill | 2 | 12 shield, taunt 2 |
| First Aid | Momo | Skill | 1 | Heal 8 on weakest ally |
| Cleave | Goro | Attack | 2 | 8 dmg |
| Devour | Goro | Skill | 3 | Heal 7 to squad |
| The Wall | Goro | Skill | 2 | 14 shield, taunt 2 |
| Histamine | Bibi | Skill | 1 | +2 ATK squad this turn |
| Flare | Bibi | Attack | 2 | 4 dmg to all pathogens |
| Overdrive | Bibi | Skill | 2 | +3 EP |

**Per-character ownership:** a card can only be played by its owner. If the owner is down, the card
sits in hand as dead weight. That is the cost of losing a unit — not just HP.

## Turn

1. 4 EP at the start of each turn (full refresh, no carry-over).
2. Play cards; tap a pathogen first to mark the target.
3. END TURN → every living pathogen attacks once (taunts intercept).
4. Taunts tick, temporary ATK expires, EP refreshes, hand draws back up to 4.

## Maths

```
card damage  = card base + owner ATK + permanent buffs + temporary buffs
enemy damage = enemy ATK − weaken
HP lost      = incoming − shield
```

All deterministic. The only RNG is the draw.

## Missions

| Code | Mission | Enemies | Bot win rate |
| --- | --- | --- | --- |
| M-01 | Tonsil Breach | Strep | 100% |
| M-02 | Alveolar Flood | Strep, Toxin | 100% |
| M-03 | Gut Wall | Biofilm, Toxin | 100% |
| M-04 | Bloodstream Break | Strain, Toxin, Strep | 100% |
| M-05 | Meninges | Biofilm, Strain, Biofilm | 65% |

`npm run sim:missions` reproduces these numbers. The early missions are teaching fights for a
greedy bot; M-05 is the wall.

## Not built yet

- Element counters, ultimates/burst gauge, character unlocks, upgrades
- Squad reordering / formation
- Server authority (all logic is client-side; fine for single-player, not for PvP)
