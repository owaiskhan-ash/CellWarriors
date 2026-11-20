# Card-art generation queue

Style for every image: `docs/character-bible.md` PART 0 Style DNA + the owner's
locked identity/costume/prop, reference image `images/cut-<owner>-cut.png`
(Yuna: `images/cut-yuna-cut.png` — mint twin-tails, amber eyes, green alchemist
coat with glowing green vials). Shot: vertical 3:4 card art, chest-up, subject in
upper two-thirds, darker lower third for the UI text overlay, glowing
blood-vessel interior (flat red blood-cell discs, dark tissue, cyan speed
lines), thick black outlines, flat two-tone cel shading, no text/watermark.

Output: `images/cards/<card-id>.jpg`, then add the id to `CARD_ART` in
`src/ui.js`. Generator limit: 10 images per turn — batch by character.

## Done (19/70)
- [x] Kaito complete (15): k_jab, k_brace, k_rush, k_first, k_last, k_up,
  k_flurry, k_berserk, k_reap, k_execute, k_rally, k_feint, k_supply,
  tok_cut, breakdown_kaito
- [x] Momo (4): m_strike, m_guard, m_patch, m_stand

Recheck notes (2026-11-20): all Kaito/Momo art verified on-model — locked hair,
costume, props and vessel backgrounds match the bible. Minor tolerated
deviations: some blades render a small guard, `k_first` has a tiny sleeve
glyph, `k_reap` has an inset border, and a few images render the dark lower
UI third as a hard panel (hidden under the card text overlay in-game).

## Pending — Momo / Platelet (9)
m_triage, m_up, m_bash, m_bastion,
m_aegis, m_reflect, m_formation, m_splint, breakdown_momo.
Locked: child proportions, silver-white messy hair + ahoge, teal eyes, oversized
hi-vis vest #D6E821, giant red first-aid kit wider than her torso. Never a weapon.

## Pending — Goro / Macrophage (13)
g_strike, g_guard, g_cleave, g_devour, g_hymn, g_up, g_catalyst, g_purge,
g_symbiosis, g_feast_up, g_tonic, g_broth, breakdown_goro.
Locked: 198cm hulking, shaved grey stubble, heavy long white coat, brown
cross-straps, 120cm chipped cleaver on shoulder, calm half-lidded eyes.

## Pending — Bibi / Mast Cell (14)
b_ping, b_fuzz, b_flare, b_hist, b_over, b_up, b_cascade, b_prism, b_swarm,
b_nexus, b_static, b_veil, tok_spark (tiny violet neuro-spark creature of light),
breakdown_bibi.
Locked: pink bob, left side shaved, amber eyes, white coat with PINK seam glow,
vials of pink histamine, gas mask at throat. Never a blade, never calm.

## Pending — Yuna / Eosinophil (14)
y_sting, y_dose, y_mist, y_incubate, y_antidote, y_hatch, y_culture,
y_epidemic, y_necrosis, y_predator, y_virulence, tok_spore (tiny green spore
mite), breakdown_yuna. Poison = glowing green; antidote/heal = soft green-gold.

## Pending — Curses (2, no character)
curse_doubt (grey fog question-mark-free doubt wisp), curse_fever (red fever
wisp over a vessel wall). Abstract, dark, readable at card size.
