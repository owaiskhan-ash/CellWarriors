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

## Current set — the lean 5-card kits (30 cards, all covered)

Every combatant runs a fixed 5-card kit (1 Basic Attack · 2 Skills · 1 Heavy ·
1 one-use Buff Upgrade). All **30** kit cards now have dedicated art mapped in
`CARD_ART` (`src/ui.js`), plus every Breakdown pull card.

- [x] Kaito (5): k_jab, k_brace, k_rally, k_last, k_up · breakdown_kaito
- [x] Momo (5): m_strike, m_guard, m_splint, m_bash, m_up · breakdown_momo
- [x] Goro (5): g_strike, g_guard, g_broth, g_devour, g_up
- [x] Bibi (5): b_ping, b_fuzz, b_flare, b_burst, b_up
- [x] Yuna (5): y_sting, y_mist, y_antidote, y_epidemic, y_culture
- [x] Sable (5): s_annotate, s_margin, s_second, s_titer, s_up · breakdown_sable

### Follow-ups if a batch gets re-run
- `b_flare` and `y_sting` / `y_epidemic` still use the older 660 px legacy
  files (`images/card-b2.jpg`, `images/card-y1..y2.jpg`) — on-model but a
  generation behind the new 896 px cards.
- `breakdown_goro`, `breakdown_bibi`, `breakdown_yuna` have no art and use the
  owner's full-bleed action art. Tokens (`tok_cut`, `tok_spark`, `tok_spore`)
  and curses (`curse_doubt`, `curse_fever`) are no longer spawned by any kit
  card — skip them until a future card pass asks for them.

Fallback behaviour: any card without an entry falls back to the owner's
full-bleed action art, so nothing renders a floating cutout.

Recheck notes (2026-11-20): the five new cards (g_broth, b_fuzz, b_burst,
y_culture, y_antidote) plus the two replacements (b_ping, y_mist) were verified
on-model — locked hair, costume, props and vessel backgrounds match the bible,
and each one reserves the darker lower third for the card text overlay.
