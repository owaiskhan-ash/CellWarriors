# CELL WARRIORS — CHARACTER BIBLE v1.0

**Status:** locked. If a generated image disagrees with this document, the image is wrong.

**How to use this file:** never write an image prompt from imagination. Use the
**Style DNA** block below, then the character's **locked identity / costume / props**,
then the pose. Or just run:

\`\`\`bash
node scripts/prompt.mjs neutrophil                 # full prompt, default pose
node scripts/prompt.mjs platelet --pose="waving for help"
node scripts/prompt.mjs killerT --shot=portrait    # portrait · card · chibi · full
\`\`\`

Canon reference images live in \`images/\`. Those are the ground truth for the art style;
this file is the ground truth for the *characters*.

---

## PART 0 — STYLE DNA (paste verbatim into every prompt, never edit)

\`\`\`
Bold modern cel-shaded anime game character splash art, vertical 9:16 composition.
Rendering: thick clean black outlines of even weight (~3px at 1080 wide), flat two-tone
cel shading with a single hard specular highlight per surface, zero airbrush gradients,
zero soft bloom except on energy blades. Palette restricted to crimson #C2183A,
deep crimson #6D0F22, cyan #35D0C0, pale cyan #7FF3EA, bone white #F2F4F5, near-black
#0B0507. Background: the glowing interior of a blood vessel — flat graphic red blood
cell discs, dark tissue walls, cyan speed lines. Dramatic low-angle hero framing,
full body visible from head to feet, single character, centered with negative space
at the top third. No text anywhere in the image.
\`\`\`

### Universal negative prompt (paste into every generation)

\`\`\`
text, letters, watermark, signature, logo, ui, frame, border, multiple characters,
background characters, crowd, duplicate figure, extra limbs, extra fingers, deformed
hands, photorealistic, 3d render, western cartoon, chibi (unless the character is
Platelet), pastel colours, soft gradient shading, airbrush, blurry, low contrast,
off-model costume, different hair colour, different eye colour, armour where not
specified, weapon where not specified, blood gore, realistic anatomy gore
\`\`\`

### Global rules of consistency

| May change per image | Must NEVER change |
| --- | --- |
| Pose, body angle, camera height | Hairstyle, hair colour, hair length |
| Facial expression within the range given | Eye colour, eye shape |
| Background density (how many cells drift) | Costume layers, cut, and colour |
| Lighting intensity | Seam glow colour (cyan for immune, crimson for Killer T, pink for Mast) |
| Damage state (only if the shot calls for it) | Height relationship to other characters |
| | Weapon shape and length |
| | Skin tone |

**Height scale (lock this into every group shot):** Macrophage 198 > Neutrophil 182 >
B Cell 170 > Dendritic 168 > Mast Cell 165 > Killer T 172. Platelet 138, always the
smallest by a clear margin. Never draw Platelet at adult proportions.

**Silhouette test:** each character must be identifiable as a black shape alone.
Neutrophil — blade angled down. Killer T — twin blades crossed low + ponytail.
Platelet — giant kit wider than she is. Macrophage — cleaver on shoulder, widest mass.
Mast — arms open, vials flaring. B Cell — crossbow horizontal. Dendritic — lantern held high.

---

## PART 1 — THE IMMUNE CAST

---

## 1. NEUTROPHIL — "KAITO"
*squad lead · aggro bruiser · the one who arrives first and dies first*

**Locked identity**
- Male, apparent age 24, \`182 cm\`, lean wiry build, slight forward hunch from exhaustion.
- Hair: \`#F2F4F5\` bone white, jagged and unstyled, medium-short, four distinct spikes,
  bangs falling over the **right** eye only. Never tidy, never long.
- Eyes: \`#9FB8C4\` pale grey-blue, narrow, permanently heavy dark circles \`#3A2A2E\`
  underneath. Deadpan, never wide-eyed, never glowing.
- Skin: \`#EFDCD6\` cool pale. One thin scar across the **left** cheekbone. Dirt smudges
  on the jaw. No tattoos.
- Build detail: visible forearm tendons, rolled-back sleeves, bandaged left forearm.

**Locked costume** (top to bottom, in this order)
1. White wrap-front jacket, kimono collar, **left shoulder torn open** exposing skin.
2. Cyan seam glow \`#35D0C0\` along both cuffs and the hem — thin, 2–3px, not glowing armour.
3. Old blood spatter \`#8E0F22\` on the chest and right sleeve — dried, dark, never fresh red.
4. Black cloth sash at the waist, single knot on the left.
5. Baggy white trousers, torn at the **right** knee.
6. Dark grey shin wraps, bare feet or simple straw sandals. No boots, no armour, no helmet.

**Locked prop**
- Straight single-edged blade, \`90 cm\`, no guard (no tsuba), wrapped black grip,
  edge glowing pale cyan \`#7FF3EA\`. Held **low, point toward the ground**, right hand.
  Never raised overhead in a default shot.

**Signature pose:** standing, weight on the back foot, blade hanging low in the right
hand, left hand loose and empty, chin slightly down, looking straight at the viewer.
If he is moving, he is *walking* toward the viewer, not leaping.

**Personality**
- **Core:** the exhausted veteran. Does the work nobody thanks him for, then does it again.
- **Want:** one shift where nobody dies. **Fear:** being the reason someone died.
- **Flaw:** self-sacrifice as a habit — he will spend his own body before asking for help.
- **Humour:** dry, deadpan, one line. Never loud, never a mascot.
- **Speech:** short sentences. Trails off. Never explains the science.
- **Catchphrase:** "Someone has to go first."
- **With others:** quietly protects Platelet; resents Killer T's confidence; defers to
  Macrophage without saying so.
- **In battle:** first in, takes the hit, +1 Inflammation every attack — he is literally
  a mess, and he knows it.

**Expression range:** tired neutral · flat annoyance · grim half-smile · eyes-closed sigh.
**Never:** grinning, shouting, glowing eyes, heroic arms-raised pose.

---

## 2. KILLER T — "RIN"
*elite duelist · burst damage · cannot stand being benched*

**Locked identity**
- Female, apparent age 19, \`172 cm\`, athletic and compact, upright posture, shoulders back.
- Hair: \`#16121A\` near-black with **two crimson streaks** \`#D81F45\` framing the face,
  high ponytail with a sharp, straight fall to mid-back. Ponytail is mandatory.
- Eyes: \`#FF3B5C\` crimson, sharp, narrow, upward tilt. Confident, never kind.
- Skin: \`#F0D2C0\` warm, one small nick scar on the right eyebrow.

**Locked costume**
1. Black tactical bodysuit \`#121014\` with **crimson** seam glow \`#D81F45\`.
2. High collar covering the throat, black.
3. Chest plate, matte black, small crimson glyph "T" at the left chest. No other symbols.
4. Fingerless gloves, black. Crimson elbow pads.
5. Thigh pouches on both legs, black. One knee pad, left leg only.
6. Black combat boots, laced, scuffed.

**Locked prop**
- **Twin** short blades, \`45 cm\` each, crimson edge glow \`#FF3B5C\`, no guard,
  reverse grip available. Both blades must appear together — one blade means the image is wrong.

**Signature pose:** mid-lunge forward, blades crossed low in front of the chest,
chin up, smirk, weight forward, coat tails trailing.

**Personality**
- **Core:** the ace who has never lost and is terrified of the first time.
- **Want:** to be the one who ends it. **Fear:** being benched, being ordinary.
- **Flaw:** arrogance — she takes the duel she can win and misses the one that matters.
- **Humour:** taunting, performative. She plays to a crowd that isn't there.
- **Speech:** clipped, sharp, challenges everything.
- **Catchphrase:** "Watch and learn."
- **With others:** dismisses Neutrophil as a blunt instrument, respects Macrophage silently,
  is unexpectedly gentle with Platelet.
- **In battle:** pierces armour. Highest single hit in the game.

**Expression range:** smirk · narrowed challenge · irritated glare · rare genuine grin.
**Never:** crying, cute, wide-eyed, submissive posture.

---

## 3. PLATELET — "MOMO"
*guard · damage sponge · the most reliable unit in a crisis*

**Locked identity**
- Female, apparent age 12, \`138 cm\`, **child proportions, large head, small hands** — this is
  the one character where chibi-adjacent proportions are correct.
- Hair: \`#E8EDF0\` silver-white, messy shoulder-length, one **ahoge** (single cowlick)
  standing up. Never neat, never long.
- Eyes: \`#3FD8C8\` teal, very large, round, always slightly watery/panicked.
- Skin: \`#F5DCD6\` pale, permanent blush on both cheeks.

**Locked costume**
1. **Oversized** high-visibility vest \`#D6E821\` (yellow-green), two grey reflective strips,
   clearly too big, sleeves hanging off the shoulders.
2. White uniform shirt and shorts underneath.
3. Knee pads, grey. White socks, brown lace-up ankle boots.
4. Brown belt with three charms: a red blood cell disc, a white cross, a rolled bandage.

**Locked prop**
- Red first-aid kit \`#C8102E\` with a white cross, **wider than her torso**, clutched to her
  chest with both arms. She never puts it down. It is never small.

**Signature pose:** mid-run or leaning forward, kit hugged to the chest, one free hand
raised high as if flagging someone down, mouth open in a panicked shout.

**Personality**
- **Core:** anxious, over-committed, apologetic — and the one who actually holds the line.
- **Want:** to be useful enough that nobody notices she's scared. **Fear:** freezing when it counts.
- **Flaw:** says yes to everything, then panics while doing it.
- **Humour:** accidental. She is funny because she is sincere.
- **Speech:** stammers, over-explains, apologises mid-sentence.
- **Catchphrase:** "I-I'll patch it — just give me a second!"
- **With others:** idolises Neutrophil, is intimidated by Killer T, follows Macrophage around.
- **In battle:** absorbs the hit meant for someone else.

**Expression range:** panicked · determined through tears · relieved · flustered.
**Never:** adult proportions, seductive, cool, holding a weapon.

---

## 4. MACROPHAGE — "GORO"
*tank · regen · eats the fallen*

**Locked identity**
- Male, apparent age 40, \`198 cm\`, hulking, wide shoulders, thick neck, heavy hands.
  Widest silhouette in the cast.
- Head: **shaved**, grey stubble \`#B8BDC0\`. Heavy brow scar through the left eyebrow.
- Eyes: \`#4A3A3E\` dark brown, half-lidded, calm, almost sleepy. Never wide.
- Skin: \`#C99A78\` tan, old scars on the forearms and jaw. Slight stubble on the chin.

**Locked costume**
1. Heavy long white coat, split at the back for movement, falls to mid-calf.
2. Two thick brown leather cross-straps over the chest, with buckles.
3. Cyan seam glow \`#35D0C0\` at the cuffs only — minimal, no armour plating.
4. Dark grey apron-like front panel, **old dark stains** \`#5A1018\`, never fresh.
5. Scuffed black boots, heavy, unlaced at the top.

**Locked prop**
- Cleaver-like blade, \`120 cm\`, broad, chipped edge, no glow, resting **on one shoulder**
  held in the right hand. Never swung in a default shot.

**Signature pose:** standing completely still, blade resting on the shoulder, head tilted
slightly, eyes on the viewer, no tension in the body.

**Personality**
- **Core:** the gentle giant who does the ugly work without comment.
- **Want:** for the young ones to survive him. **Fear:** nothing he admits to.
- **Flaw:** too slow to act when speed is what's needed; carries grief as silence.
- **Humour:** almost none — which is exactly why he's funny twice a game.
- **Speech:** three words maximum. Long pauses.
- **Catchphrase:** "...Leave it to me."
- **With others:** shields Platelet without being asked; the only one Killer T obeys.
- **In battle:** heals himself, tanks, and cleans the field.

**Expression range:** calm · faint tired approval · flat disapproval · closed-eye patience.
**Never:** shouting, raging, monstrous, glowing eyes, armour.

---

## 5. MAST CELL — "BIBI"
*aura buffer · chaos · adds Inflammation and then apologises*

**Locked identity**
- Female, apparent age 21, \`165 cm\`, wiry, restless, never still in any shot.
- Hair: \`#F0A6B8\` pale pink bob, blunt fringe, **left side shaved** to the skin. Asymmetric is mandatory.
- Eyes: \`#F0A63C\` amber, wide, dilated, twitchy. Always a little too excited.
- Skin: \`#F3D9CE\` pale warm, a smudge of pink powder on one cheek.

**Locked costume**
1. White lab coat, **pink** seam glow \`#FF7FA8\` instead of cyan — she is the only immune
   character with a non-cyan seam.
2. Utility vest under the coat, loaded with small glass vials of glowing pink fluid.
3. A gas mask hanging at the throat by a strap (never worn).
4. Loose bandages wrapped around both forearms, uneven.
5. Shorts, boots, mismatched socks. Deliberately messy.

**Locked prop**
- One large vial of glowing pink histamine \`#FF7FA8\` in the raised hand, and a chemical
  flare in the other. Never a blade.

**Signature pose:** arms thrown wide open, head back mid-shout, vial raised, coat flaring.
She occupies space like she's on a stage.

**Personality**
- **Core:** the chaos agent with a heart. Causes the problem, then heroically fixes it.
- **Want:** to be felt — to matter loudly. **Fear:** silence and being ignored.
- **Flaw:** no brakes. She escalates when she should cool down.
- **Humour:** loud, theatrical, genuinely funny, memes herself.
- **Speech:** dramatic announcements, mid-sentence volume changes.
- **Catchphrase:** "Let's make it LOUD."
- **With others:** winds up Killer T, adores Platelet, is the only one who can make
  Neutrophil sigh audibly.
- **In battle:** buffs everyone's damage and pushes Inflammation toward fever — the game's
  risk button, wearing a face.

**Expression range:** manic delight · mock offense · sudden sincerity · sheepish guilt.
**Never:** calm, quiet, cyan seams, blade, symmetric hair.

---

## 6. B CELL — "IVO"
*ranged scaling damage · antibody maker · the prepper*

**Locked identity**
- Male, apparent age 27, \`170 cm\`, lanky, narrow shoulders, slight stoop over his weapon.
- Hair: \`#3A2A22\` dark brown, undercut sides, small tied bun at the back. Never loose.
- Eyes: \`#A8792F\` hazel, thoughtful, half-smile, one eyebrow permanently raised.
- Skin: \`#D9AE8C\` medium tan, thin stubble.

**Locked costume**
1. White lab coat worn open over a black tactical vest.
2. Cyan seam glow \`#35D0C0\` at the coat cuffs.
3. Bandolier of glowing cyan test-tube "antibodies" across the chest — small, evenly spaced.
4. Reading glasses pushed up onto the forehead (never over the eyes in a default shot).
5. Dark trousers, one knee pocket, boots. No armour plating.

**Locked prop**
- Compact **crossbow** \`70 cm\`, matte black with cyan accents, loaded with a glowing
  cyan antibody vial instead of a bolt. Held horizontally, aimed, at chest height.

**Signature pose:** aiming the crossbow to one side, calm, glasses on forehead, weight even.

**Personality**
- **Core:** methodical prepper. Has already prepared for this.
- **Want:** for his system to be vindicated. **Fear:** being surprised.
- **Flaw:** smug about long-term plans, useless when the plan breaks.
- **Humour:** dry, pedantic, quietly pleased with himself.
- **Speech:** precise, cites his own records.
- **Catchphrase:** "I already made one for this."
- **With others:** trades barbs with Killer T, supplies Neutrophil, keeps notes on everyone.
- **In battle:** scales — every turn he adds Antibodies, so his damage compounds.

**Expression range:** calm focus · mild smugness · raised eyebrow · quiet alarm.
**Never:** charging, shouting, melee pose, blade, glowing eyes.

---

## 7. DENDRITIC — "NOOR"
*utility · draws cards · the intelligence officer who never fights*

**Locked identity**
- Female, apparent age 30, \`168 cm\`, slender, still, hard to read.
- Hair: \`#6B2438\` dark auburn, one long braid over the right shoulder. Braid is mandatory.
- Eyes: \`#8E7FA8\` grey-violet, knowing, level. Rarely blinks.
- Skin: \`#C99E86\` warm brown, small beauty mark under the left eye.

**Locked costume**
1. Hooded white coat, hood usually **down**, cyan seam glow \`#35D0C0\` on the lining.
2. Dark underlayer, high neck, no armour.
3. Leather satchel across the body, full of labelled sample tubes.
4. Gloves, black, thin. No visible weapons anywhere on her person.

**Locked prop**
- A lantern-like glass jar holding a captured, glowing pathogen fragment — pale violet
  \`#B79BD8\` — held up in one hand at eye level. She is carrying evidence, not a weapon.

**Signature pose:** holding the lantern up and slightly turning back over her shoulder
toward the viewer, unhurried, coat settling.

**Personality**
- **Core:** the one who has already seen this before. Remembers every slight.
- **Want:** to understand the enemy completely. **Fear:** acting before she's certain.
- **Flaw:** observes when she should strike; lets others bleed for her information.
- **Humour:** unsettling, deadpan, occasionally cruel.
- **Speech:** unhurried, precise, asks the question you don't want to answer.
- **Catchphrase:** "I've seen this one before."
- **With others:** the only one who can read Macrophage; unnerves Killer T; mentors Platelet.
- **In battle:** draws cards and reduces infection — no direct attacks.

**Expression range:** level calm · faint knowing smile · cold appraisal · rare warmth.
**Never:** attacking, running, shouting, weapons, glowing eyes.

---

## PART 2 — PATHOGENS (villains)

Pathogens are **not** anime humans. They are wet, wrong, and biological — the contrast with
the cast is the whole point. No faces, no costumes, no dialogue.

### STREP
- A **chain of five spheres** joined by a thin translucent ligament, forming a whip.
- Colour \`#8E3FA8\` violet with \`#D9A6F0\` highlights, wet and glossy.
- **Three small dark eyes** clustered at the leading sphere. No mouth.
- Reads as fast and skittering. Never still, never symmetrical.

### TOXIN BLOB
- A translucent sac, taller than it is wide, \`#B6E02A\` acid yellow-green, bubbles suspended inside.
- **No eyes at all.** Two thin dripping tendrils at the base.
- Slumped, oozing, heavy. It does not chase — it waits and leaks.

### BIOFILM
- A **massive armoured crustacean-like mass**, wider than a character, \`#4A5A3A\` grey-green.
- Overlapping chitin plates, slime trails, dozens of **tiny pinprick eyes** scattered at random
  — never two symmetric ones.
- Impossibly slow, impossibly hard. Reads as a wall.

Shared pathogen rules: no text, no weapons, no clothing, no human anatomy, no symmetry.

---

## PART 3 — PRODUCTION NOTES

**Card art shots** — 3:4 crop, character from the chest up, single flat background, pose locked.
**Splash shots** — 9:16, full body, the poses above.
**Chibi** — only for social/emotes; proportions 3 heads, never for in-game cards.

**Voice:** each character needs 6 lines minimum (select, attack, damaged, low HP, victory, defeat).
Write them in the character's speech pattern — no character explains immunology out loud.

**Names:** these are production names and can be changed, but once a name ships, it never
changes again — names are how the audience remembers the cast.

**Adding a new character:** update \`docs/characters.json\` first, run
\`node scripts/prompt.mjs <id>\` to generate, and only then write prose here.
