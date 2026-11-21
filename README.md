# Cell Warriors

A tactical card RPG fought inside a seventeen-year-old's immune system. Anime squad battler:
pick 3 of 6 combatants, then fight with the cards those characters own.

**Status:** playable on desktop and **on Android** — full CZN shell (ship-deck hub, combatant
showcase, CZN battle plates), CZN-style battle system, roster, 5 missions, 30 cards (6 lean kits),
Ego skills, Epiphany, Stress breakdowns, Sands of Time.

### 📱 Play on your phone

**[⬇ Download the Android APK](https://github.com/owaiskhan-ash/CellWarriors/releases/latest)** —
landscape, offline, ~15 MB, Android 7.0+, now with the **CZN shell** (v1.1.0). Sideload it (allow "install unknown apps" for your
browser/file manager once) and it runs standalone: no network, no ads, no analytics.

> **Coming from 1.0.0?** That build could not install on Android 11+ at all, and its signing
> key is gone, so **uninstall 1.0.0 first**. One time only — from 1.0.1 on, upgrades install
> straight over the previous version.
> Install trouble: **[docs/install-troubleshooting.md](docs/install-troubleshooting.md)**.

On a phone it is designed **for landscape** and played with thumbs: tap a card to play it, tap an
enemy to target it, drag a card onto an enemy, hold a card or enemy to inspect it, END TURN is the
big disc at the bottom right. Full detail in **[docs/mobile.md](docs/mobile.md)**.

### 📱 If the phone gets warm

Two dials, both saved on the device:

- **Settings → VISUAL QUALITY → LOW POWER** — no ambient loops, no backdrop blur, no
  full-screen filters. The fight reads exactly the same; it just stops repainting while you
  think. (`HIGH` is the default, `ULTRA` restores the old all-ambience look.)
- **The eye button in the battle HUD** (or Settings → FOCUS UI) — hides the labels that repeat
  information the HUD already shows. Intent, counters, HP/Tenacity, damage numbers, AP and the
  hand stay at every setting.

Backgrounding the app freezes every animation and drops the draw loop, so a paused game is not
quietly burning battery. Numbers and rules: **[docs/design-system.md](docs/design-system.md) §10**.

```bash
npm run dev             # http://localhost:5173 (no-store: edits show up on reload)
npm run test:e2e        # 162 jsdom checks of the whole flow
npm run test:phone      # 161 phone/touch/offline/heat checks
npm run test:apk        # simulates the shipped APK in a WebView
npm run test:run        # plays a full 11-floor run through the UI
npm run test:ui         # battle-fit + screen-fit (real Chromium, 8 phone sizes)
npm run test:reach      # CONFIG / FOCUS reachable at 892x412 over HTTP
npm run test:motion     # card throws, hits, turn hand-over + idle-cost budget
npm run sim:missions    # bot win rate per mission
npm run apk             # build + sign + verify dist/CellWarriors-<ver>.apk
```

Rules: **[docs/mechanics.md](docs/mechanics.md)** — what was copied from Chaos Zero Nightmare and
how: **[docs/czn-systems.md](docs/czn-systems.md)** · Cast and art:
**[docs/character-bible.md](docs/character-bible.md)**

---

## The CZN shell (v1.1.0)

The interface is one layer, applied everywhere — not per-screen styling:

- **`czn.css`** — the design language: paper plates for menus, ink plates for battle, cyan
  corridor rules, notched corners, `240/240+` currency strip, sheen on primary actions.
- **`src/czn.js`** — the furniture: builds the **hub** (level plate, mission rail, standing
  character, crew pods, GIFT slot, command ribbon), the currency strip above every menu
  header, and swaps the key art (`images/czn/*`).
- Screens keep their own logic; the shell only supplies the frame. `battle-fit.mjs` still owns
  the battle geometry, and the shell never adds a node inside `.battle-stage`.

Reference screens: ship-deck hub, combatant showcase with a STATS rail + ASCEND, and the
`TURN n` battle banner between two rules.

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
| `power.css` | heat + focus layer: kills ambient loops, hides repeat labels |
| `src/fx.js` | animation engine: card throws, hits, deaths, turn hand-overs (event-driven, zero idle cost) |
| `motion.css` | the visuals for it (loaded last; every rule is a class for one moment) |
| `scripts/e2e.mjs` | jsdom end-to-end test |
| `scripts/sim-missions.mjs` | balance bot |
| `scripts/cutout.py` | transparent-background character art pipeline |
| `docs/` | mechanics, CZN mapping, character bible, design system, store pack, privacy |

## Known gaps

- Three cards still use legacy/shared art (Goro's Marrow Broth, Bibi's Fuzz + Cytokine Storm, Yuna's
  antidote/bloom) — see `docs/card-art-queue.md`.
- No Chaos-roguelike map, shops, partners, or gacha (deliberately out of scope).
- Single player, local save; Supabase authority comes with the APK.
