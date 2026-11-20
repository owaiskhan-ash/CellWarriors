# Cell Warriors — Battle Rules (v4, CZN-accurate)

The mechanic set now mirrors *Chaos Zero Nightmare*. The detailed comparison table lives in
[`czn-systems.md`](./czn-systems.md); this file is the player-facing ruleset.

## The team

Pick **three combatants**. Every character owns a six-card personal pool, and all three pools are
shuffled into one draw pile. Each character also brings one **Ego Skill**.

## A turn

1. **Draw 5** cards (7 on the opening turn, plus anything your Upgrade cards add).
2. You have **3 AP**. Cards cost AP; a 2-AP card is a real commitment.
3. Play cards, use Ego Skills, then press **END TURN**.
4. Unplayed cards go to the **Graveyard** (unless tagged **Retain**). Empty draw pile reshuffles it.
5. Hand cap is **10**. Above that, you stop drawing.

## Enemies do not wait

Every enemy carries an **action counter**. **Every card you play lowers every counter by one.** At
zero the enemy acts immediately and its counter resets. The number beside the counter is its
telegraphed intent: attack value, shield, buff or debuff. **Ego Skills and Haste cards never lower
counters** — that is how you burst without eating a hit.

## Weakness and Tenacity

Five attributes: **Passion ✦, Order ◈, Justice ✧, Void ✶, Instinct ✹**. There is no
rock-paper-scissors chart — a hit only gets a bonus when it *matches* the enemy's listed weakness:

- matching attribute → **×1.5 damage**
- matching attribute → **2.5× Tenacity damage**

Under each enemy's HP is its **Tenacity** bar. Break it and the enemy is **Ravaged**:

- **+1 AP** immediately
- the team's **Stress** drops by 10
- the enemy's action counter **+1** (it is delayed)
- it takes **+30% damage** while Ravaged

## Stress and Mental Breakdown

Damage also adds **Stress** (purple bar). A Shield that fully absorbs a hit adds **no Stress**.

At **100 Stress** the character has a **Mental Breakdown**:

- a third of their max HP is **locked** — unhealable until they recover
- their **Ego Skill is sealed**
- their cards become **Breakdown cards** in the draw pile
- these cards advance enemy counters, so recovering can be dangerous
- recovery needs **5 plays**, then **6**, then **8**, then 10, then 12

Recovering clears Stress to zero, restores the locked HP, heals the character and half of what the
team lost, and makes that character's Ego **cost 0** for the rest of the fight.

## EP and Ego Skills

- **EP caps at 7.** You gain 1 EP per two cards played, and 1 per enemy killed.
- Each Ego costs **4 EP**, does something big, and **does not advance enemy counters**.
- Ego order is shuffled at the start of the fight.

## Epiphany

A lightbulb can appear over a character. Their **next card played adds one of their unique cards to
your hand at 0 AP**. Separately, individual cards can glint when drawn: those cost **0 AP** and hit
**1.4× harder**.

## Sands of Time

Three hourglasses per fight:

| Charge | Effect |
| --- | --- |
| 1 | Rewind the last card you played |
| 2 | Redraw the Ego Skill order |
| 3 | Rewind the whole turn |

## Card types

| Type | Frame | Behaviour |
| --- | --- | --- |
| Attack | crimson | damage, sometimes multi-hit or AoE |
| Skill | teal | shield, heal, buff, AP |
| Upgrade | gold | leaves the deck for the rest of the fight; permanent effect |
| Status | grey | Breakdown cards — play to recover |
| Curse | violet | unplayable, clogs the hand |

## Tags

**Retain** (stays in hand) · **Exhaust** (gone for the fight) · **Initiation** (opening hand) ·
**Lead** (50% chance to cost 1 less when drawn) · **Haste** (does not advance counters) ·
**Celestial** (auto-fires when you play a 2+ AP card) · **Unique** (cannot be duplicated).

## Winning and losing

Destroy every enemy to clear the mission. The team collapses when every combatant is at 0 HP.
