# Cell Warriors v1.1.0 — the CZN Shell

Every screen was rebuilt against Chaos Zero Nightmare's interface language: the ship-deck
hub, paper-white menu plates, ink-black battle deck, cyan corridors and notched plates.
No gameplay rule changed — this release is one long UI/art pass plus the panels the
reference screen has and ours did not.

---

## New: the CZN HUB (real landing screen)

The old title screen was a centred logo over a button stack. It is now the CZN hub:

- **HUD top-right** — hex energy plate (`240/240+`), four square icon cells
  (Lab · Codex · Settings · Menu), and the `ID-07A` account tick.
- **Level plate top-left** — `LV 25` with the XP meter and the lead combatant's name.
- **Daily task card** — live mission progress (`n / 5 Raise a combatant`), opens the mission rail.
- **Standing character** — the lead combatant's cut-out on a spotlight plinth, with the whole
  team as round selector chips beneath it. Tap the name to open their file.
- **Mission rail, right edge** — Missions · Simulation · Chaos · Ark City (badge 5) ·
  Combatants · Rescue, each with a line rule and a glyph medallion. All six are live routes.
- **Crew pods** — six seated operators on the deck, framing the character.
- **GIFT plate** — the Coronoviridae gift slot, bottom-left.
- **Command ribbon** — CHAOS EXPEDITION primary, then TEAM · SIM · CONFIG · RESET.

New key art: `images/czn/bg-lobby.jpg`, `bg-battle.jpg`, `bg-hub.jpg`, `bg-showcase.jpg`,
`bg-chaosmap.jpg`, `gift-creature.png`.

## New: the CZN combatant showcase (character screen)

The character file is now the reference detail page: standing art on a pale geometric
stage (slab, arc, dot-matrix), and a stat rail on the right — name, cell/class line,
affinity badges, bond heart, `LV n / 10`, a STATS table (Attack / Defense / HP / Crit Rate /
Crit DMG), the EGO power readout (`n TB`), an orange **ASCEND** plate and a quick-action row
(Test Solo · Add/Remove · Lab · Guide). Cards, playbook and Egos stay below, unchanged.

## New: CZN battle plates

- **Turn banner** — the number alone, huge, between two hairline rules, with `TURN` above
  and the state word below (as in the reference battle screenshot).
- **Right-edge readouts** (desktop/tablet) — enemy name + HP bar + tenacity + action counter,
  a tappable enemy list, and the active combatant's portrait/HP/stress/AP/EP card.
- **Hand docked over the stage**, cards on a gentle arc, harder card corners with an inner bevel.
- **Ink plates** for the left rail: turn, resonance, draw/grave piles, EP pips — all re-typed
  for dark surfaces (the DRAW pile was dark-on-dark for one build and is fixed).
- Battle stage art swapped to a ruined street backdrop; the arena stays visible behind the hand.

## Re-skinned to the language

| Screen | What changed |
| --- | --- |
| Roster | notched tiles, cyan select ring, plate chips, fixed 3×2 phone grid |
| Missions | CZN rows with code plates, threat tags, `LOCKED` stamps, readable dim state |
| Chaos map | dark starfield plate, glowing node cards, teal connection lines |
| Simulation | dark chamber cards with cyan selection and glowing option stacks |
| Shop / Rest / Event / Reward | plate edges, sheen on primaries, ink event card |
| Headers | thin currency strip (`240/240+` + icon cells) above every menu header |

## Fixed

- `showView('missions')` and `showView('roster')` re-render on entry — the hub's direct
  routes no longer open an empty list.
- Menu key art no longer drifts with a CSS transform, so `screen-fit` measures true boxes.
- Zero dead class selectors: the old `.char-hero` phone rules were replaced with the showcase.

## Guards

| suite | result |
|---|---|
| e2e | 162 pass, no JS errors |
| phone-check | 146/146 |
| full-run | CLEARED, 6 battles, no JS errors |
| battle-fit | 134/134 across 8 viewports |
| screen-fit | OK (7 screens × 5 viewports) |
| audio-check | 35/35 |
