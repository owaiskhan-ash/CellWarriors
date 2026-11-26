# KIMETSU BIBLE v1.0 — Demon Slayer–style character & nature design
*sibling to `docs/character-bible.md`. That file stays locked. This one is additive.*

**Status:** first pass. Two things are designed here: **one character** and **one nature
environment**, each in three directions so the owner can pick.

**How to use this file:** never write a prompt from imagination. Use the **Style DNA**
(PART 0), then the lock block of whichever option was picked (PART 2 / PART 3), then the
pose or camera. Or just run:

```bash
node scripts/kimetsu-prompt.mjs --list
node scripts/kimetsu-prompt.mjs hotaru            # character, default pose
node scripts/kimetsu-prompt.mjs hotaru --pose="mid-strike, blade trailing gold sparks"
node scripts/kimetsu-prompt.mjs fujikasane        # environment, default camera
node scripts/kimetsu-prompt.mjs fujikasane --camera="low wide, character silhouette at 1/6 height"
node scripts/kimetsu-prompt.mjs all --json        # every prompt as JSON, for batch tools
```

Locks live in `docs/kimetsu.json`. Where this file and a generated image disagree, the
file wins.

---

## PART 0 — STYLE DNA (reference, not inspiration copying)

Two legitimate reference points, and prompts must name the *technique*, never
"copy this show's frame":

| Layer | Reference | What it actually contributes |
| --- | --- | --- |
| Character | Koyoharu Gotouge's manga designs | soft rounded faces, huge layered eyes, gradient hair, bold even line weight, flat two-tone cel shadow, one saturated accent per design |
| Rendering | ufotable compositing | hand-drawn characters over painted/3D backgrounds, light bloom, atmosphere, a **separate particle palette per Breathing Style** |
| Backgrounds | Taishō-era Japan, painted like ukiyo-e | cedar and bamboo groves, wisteria out of season, lantern-lit towns, mist between mountain ridges |
| Effects | sumi ink wash + woodblock | Breathing forms read as calligraphic ink strokes wrapping the body, not generic VFX |

### Style DNA block (paste verbatim into every prompt)

```
Anime cel-shaded key visual in the manner of Taisho-era demon-slayer manga:
soft rounded facial structure, very large layered eyes with multi-tone gradient irises
and a hard specular glint, gradient hair (dark roots, saturated tips),
thick even black line weight (~3px at 1080 wide), flat two-tone cel shading,
one hard highlight per surface, zero airbrush gradients on skin,
muted Taisho base palette with exactly one saturated accent (haori or breathing effect),
sumi-ink calligraphic brush strokes used as the breathing-form energy,
ufotable-style compositing: painted background, atmospheric haze, controlled bloom
only on the blade and particles, shadows held close to true black for woodblock contrast.
```

### Universal negative

```
photorealistic, 3d render, western cartoon, chibi, moe blush, airbrush gradients,
soft-focus skin, plastic skin, generic fantasy armour, gun, modern clothing,
text, letters, kanji signage, watermark, signature, logo, ui, frame, border,
extra limbs, extra fingers, deformed hands, duplicate figure, crowd,
existing franchise characters, off-model haori, wrong blade colour, gore, blood spray
```

### Global rules

| May change per image | Must NEVER change |
| --- | --- |
| Pose, camera height, expression within range | Hairstyle, hair gradient, hair length |
| How dense the particles are | Eye colour and iris gradient |
| Time of day (only within the lock) | Haori pattern, cut and palette |
| Weather (rain/snow/mist) if the lock allows it | Blade colour, tsuba shape, scabbard |
| | Skin tone, apparent age, height |

**Silhouette test:** the character must be readable as a black shape alone — sword
angle + haori flare + hair silhouette.

**Effects rule (ufotable):** one Breathing Style = one particle palette, one ink-stroke
shape language. Never mix two elements in one image.

---

## PART 1 — THE SHARED BASE (what every option sits on)

From the Demon Slayer Corps research, these are the parts that are *not* optional if the
character is to read as a Corps swordsman:

| Element | Canon detail used here |
| --- | --- |
| Jacket | modified **gakuran** — high buttoned collar, dark, sleeves rolled where the design says so |
| Back mark | the character `滅` (destroy) — only visible in back-view shots |
| Trousers | **tattsuke-hakama**, wide, gathered below the knee |
| Leg wraps | **kyahan** wrapped around the calves |
| Footwear | soft-soled work shoes or zōri with white tabi |
| Rank | engraved on the **back of the hand**, not on the jacket |
| Fibre | tear-, fire- and water-resistant — the uniform is never shredded in a fight |
| Haori | **never supplied** — one personal or inherited garment, and its pattern carries the character's story |
| Sword | **nichirin** — colour appears on first draw and never changes; blade colour = Breathing Style. The red "crimson blade" state is temporary and earned, not default |
| Bird | a **kasugai crow** is assigned to every slayer |

Corps structure used for story hooks: Oyakata (commander) → Hashira (nine pillars) →
Demon Slayers (ten ranks) → Kakushi (support, masked, unmarked) → swordsmiths.

---

## PART 2 — CHARACTER: three directions

### Option A — **HOTARU** 「蛍」 · Kōgetsu Hotaru — *the firefly who carries the fallen*
*support-turned-duelist · Flame-adjacent · the one who lights the way back*

**One-line pitch:** a lantern-keeper's daughter who watched her village burn and now
fights with fire, a borrowed haori, and a sword that keeps its own record of every
slayer she has carried home.

**Locked identity**
- Female, apparent age 17, 158 cm, light wiry build.
- Hair: `#171417` near-black at the roots fading to `#FF8A3D` ember orange in the last
  third, chin-length bob, blunt fringe cut **straight across above the brows**, one longer
  strand on the right that is *never tucked behind the ear*.
- Eyes: `#FFB34D` amber with a `#C2401E` rust ring around the pupil; large, heavy-lidded,
  always slightly wet-looking (she has been crying and will not admit it).
- Skin: `#F0D6C4` warm pale; a small **burn scar on the left collarbone**, always visible
  at the collar.
- Build detail: hands covered in small pale welding scars, nails short.

**Locked costume**
1. Standard dark brown-black gakuran, high collar, sleeves **rolled to the elbow**.
2. Haori — **inherited, too big for her**, sleeves past her fingertips, `#1B1B22` ground
   with a sparse field of **gold fireflies** (`#E8B44A` dots with a 2 px halo) and an
   ember-orange lining. The hem is scorched and re-stitched in a visible, slightly ugly seam.
3. `滅` on the back (back views only).
4. `#2A2A31` tattsuke-hakama, kyahan wraps, zōri, white tabi.
5. Rank engraved on the back of the right hand.
6. **Kasugai crow** with a singed tail feather, usually on a branch behind her.

**Locked prop**
- Nichirin katana, blade **deep crimson `#B3261E`** with a faint ember-grain in the steel
  (Flame lineage), *not* the temporary true-red state.
- Tsuba: **circular, cast-iron, pierced with a firefly-lantern silhouette** — small, worn,
  the only ornate thing she owns.
- Grip: dark grey ito over same, with a single ember-orange cord wrapped twice around the
  middle. Scabbard: matte black with one thin gold band.

**Signature pose:** standing three-quarter, blade held **low and back** in the right hand,
left hand loose at her side inside the oversized sleeve, chin down, looking up through her
fringe at the viewer. If moving, she is *walking forward into the frame*, haori lifting.

**Personality**
- **Core:** carries other people's dead. Literally — she keeps the names.
- **Want:** to get every partner she is assigned home. **Fear:** arriving after the fire.
- **Flaw:** will not retreat, so she cannot obey an order to fall back.
- **Humour:** flat, one line, usually at her own expense.
- **Speech:** short sentences. Uses "we", never "I", when reporting casualties.
- **Catchphrase:** "I brought them back. That counts."
- **In battle:** stays in the fight the longest; her kit should reward *not* killing on
  curve — the longer the fight, the better she gets.

**Expression range:** steady neutral · too-bright false cheer · jaw-set grief · small
surprised laugh. **Never:** smug, cruel, winking, glowing eyes.

---

### Option B — **SATSUKI** 「皐月」 · Kōgetsu Satsuki — *the calm river that cuts stone*
*Water Breathing · defensive duelist · the one who never raises her voice*

**One-line pitch:** the eldest of three, raised on a riverbank, who took Water Breathing
to the point where the water stops moving — because the stillest water drowns you fastest.

**Locked identity**
- Female, apparent age 19, 165 cm, slim and straight-shouldered.
- Hair: `#1A2430` near-black blue, fading to `#7FD3E0` pale river-cyan at the tips, long,
  tied **low at the nape** with one white cord; a single loose strand at the left temple.
- Eyes: `#6FC8D8` clear cyan, narrow, calm-set; the only character who looks *level* at
  the viewer rather than up or down.
- Skin: `#EFE2D8` cool pale. No visible scars.
- Build detail: very straight posture, hands with long fingers, deliberately still.

**Locked costume**
1. Standard gakuran, collar closed to the top button. Sleeves full length.
2. Haori — **her own**, exactly half and half vertically: left panel `#2F6F8F` deep
   river-blue **plain**, right panel `#F2EFE6` bone white with **seigaiha** (overlapping
   wave arcs) in `#8FCBE0`. Left half is plain on purpose: one side earned, one side inherited.
3. `#242830` tattsuke-hakama, kyahan, zōri, white tabi.
4. Rank on the back of the left hand.
5. A folding fan tucked in the obi — **not a weapon**, she just holds it when thinking.
6. Kasugai crow, black, well-groomed, perches in silhouette.

**Locked prop**
- Nichirin katana, blade **`#3D9BD8`** water-blue with a faint rippling grain.
- Tsuba: **round, kin-tsuba, engraved with three concentric broken wave lines**.
- Grip: pale grey ito over black same; scabbard deep blue-black.

**Signature pose:** standing, blade held **vertically in front of her**, point down, both
hands on the hilt in front of her chest, eyes level, haori perfectly still — everything
still except the wave pattern.

**Personality**
- **Core:** the dependable one, which she resents in exactly one sentence per chapter.
- **Want:** an ordinary evening. **Fear:** becoming the authority everyone needs.
- **Flaw:** absorbs blame instead of distributing it.
- **Humour:** dry, delayed by a beat, always underplayed.
- **Speech:** complete, gentle sentences; apologises first, argues second.
- **Catchphrase:** "Stand behind me. I am not asking."
- **In battle:** counter/displacement kit.

**Expression range:** mild neutral · tired half-smile · genuine hardness · quiet
amusement. **Never:** shouting, panic, wide-eye shock.

---

### Option C — **TOBI** 「鳶」 · Sarashina Tobi — *the boy who fell from the mountain*
*Mist Breathing · scout/assassin · the one who smiles at the wrong moment*

**One-line pitch:** he lost his family to a night on the mountain and came down smiling,
because that is the only thing he knows how to do with a face — and his blade vanishes
before the demon sees it.

**Locked identity**
- Male, apparent age 16, 160 cm, slight build, always slightly crouched as if listening.
- Hair: `#C9C6C0` ash-grey with a single `#7FBFB5` mint strand through the fringe,
  uneven self-cut bob, one lock falling over the **left** eye.
- Eyes: `#8FB7AE` pale sage, half-lidded, **no lower lash**; the expression never quite
  matches the mouth.
- Skin: `#E9D9C8` warmer than he looks; a thin **rope burn scar across the throat**.
- Build detail: bare feet in straw sandals, split knuckles, dirty knees.

**Locked costume**
1. Gakuran worn **one button open at the collar**, sleeves hacked off **raggedly at the
   elbow** with uneven thread.
2. Haori — **stolen from nobody: the last thing on the line**, `#BFD9D2` pale seafoam
   ground with **asanoha** (hemp-leaf star lattice) in `#4E7A73`, sleeves ending mid-forearm,
   hem dipped in mud. He never mentions where it came from.
3. `滅` on the back (back views).
4. `#2E3438` tattsuke-hakama with one repaired knee, kyahan loose, sandals.
5. Rank on the back of the **left** hand, half-worn.
6. Kasugai crow with a chipped beak — his only friend.

**Locked prop**
- Nichirin katana, blade **`#E7ECE8` bone-white** with a faint grey cloud-grain (Mist).
- Tsuba: **small, oval, sunk deep — almost hidden** against the guard, no ornament. He
  sharpened the edge himself and it is slightly uneven.
- Grip: undyed hemp wrap, fraying. Scabbard: pale unfinished wood — no lacquer, so it
  makes no sound when he draws.

**Signature pose:** crouched low on one leg, blade **held out to the side and half-hidden
behind his own haori**, head tilted, smiling at the viewer with dead eyes.

**Personality**
- **Core:** he laughs before he feels anything.
- **Want:** someone to tell him what to do. **Fear:** being trusted with a decision.
- **Flaw:** volunteers for the worst jobs before anyone can assign them.
- **Humour:** genuinely funny and completely inappropriate.
- **Speech:** quick, cheerful, trails into silence.
- **Catchphrase:** "Don't look. It's already over."
- **In battle:** one-strike assassin; high risk, high tempo.

**Expression range:** bright empty smile · flat curiosity · startled honesty · total
stillness. **Never:** tears, screaming, wide awake eyes.

---

### Character comparison

| | Hotaru (A) | Satsuki (B) | Tobi (C) |
| --- | --- | --- | --- |
| Role | bruiser → duelist | defender | assassin |
| Breath | Flame lineage | Water | Mist |
| Blade | crimson | blue | bone-white |
| Haori | inheritance (too big) | half plain / half wave | found, denim-plain |
| Pattern meaning | fireflies = souls, home | seigaiha = calm continuity | asanoha = growth |
| Story hook | carries the names home | cannot let others carry blame | smiles instead of grieving |
| Fight shape | survivability, grows late | counters, protection | tempo, one-shot |

---

## PART 3 — ENVIRONMENT: **MOUNT FUJIKASANE, the night before Final Selection**

Research basis: wisteria (`fuji`) blooms only weeks out of each year and here blooms
**out of season, all year, from the foot to halfway up**; above that line the flowers stop
and captured demons are held at the summit, unable to cross them. Real wisteria on Fuji is
tied to nobility (purple, high altitude) and to love and sorrow. The mountain exists so
that a place of execution can also be a place of shelter. Every option below keeps that
one structural idea: **the wisteria line**.

### Shared structure (all three options)
- The wisteria **starts at the foot and stops dead at half height** — a hard, visible
  flower-line across the composition.
- Above the line: no purple at all, only rock, dead cedar, and the summit.
- Below the line: dense, over-saturated, beautiful, and safe.
- Palette base `#120E1A` near-black violet; wisteria `#B79BE8` / `#8C6BC4` / `#E7DAFF`
  highlights; cedar `#1F3328`; mist `#6B7A8F`; lantern/ember accent `#FF9E4A`.

### Option 1 — *Full Bloom, Night* (the default key visual)

**Locked detail**
- Camera: **eye-level, one-point perspective up a stone stair**, 35 mm look.
- Middle ground: a **torii gate silhouetted black** against the flower canopy, steps
  underfoot wet with recent rain, reflecting violet light.
- Foreground: two wisteria trunks trained over a trellis, heavy **hanging racemes to
  within 20 cm of the ground** in the left third; a stone lantern with a cold flame.
- Flower line at exactly frame-centre height; above it a **near-black mountain shoulder**
  and a sky of deep indigo `#1A1630` with a few stars.
- Weather: wet stone, low ground mist, no rain falling.
- One human silhouette at 1/6 frame height at the top of the stairs — **scale reference only**.
- No text, no signage, no characters' faces.

**Best for:** the one hero background / title plate.

### Option 2 — *Ember Dusk, the Ritual*

**Locked detail**
- Camera: **wide, low to the ground**, foreground grass blades in silhouette, horizon low.
- Time: the last 20 minutes of dusk — sky gradient `#2B1B33` → `#C2492A` → `#F2A54B`.
- Wisteria lit **from below and behind** so each raceme glows translucent coral-violet
  (`#D9A0C8` → `#8C5FB8`), rim-light on every trunk.
- Paper lanterns in a loose string along the trellis, **seven of them**, warm `#FFB45E`;
  two are unlit.
- The flower line reads as a **hard horizontal cut** across the frame at 55% height.
- Mist banks rolled up against the mountain, ember motes drifting upward against the dark.
- One abandoned **straw sandal on a step** and a dropped white cloth — human trace, no figure.

**Best for:** cutscene / chapter-end / "something is about to happen" plate.

### Option 3 — *After the Flowers, Grey Dawn*

**Locked detail**
- Camera: **high angle looking down a ridge path**, 50 mm, slight telephoto compression.
- Time: false dawn, sky `#9AA8B8` → `#D8D2C8`, **no sun visible**, flat cool light.
- Wisteria above and behind camera only — in frame, the flowers are **over** and falling:
  bare twisted vines, drifts of spent petals on the path, a few racemes wilted brown.
- Foreground: wet cedar roots crossing the path, a split **wooden signpost with no
  readable text** (arm broken, characters weathered away — never legible).
- Distance: three ridgelines of cedar in atmospheric perspective (`#6E7F84` → `#B7C2C6`),
  and on the far summit a **thin column of smoke**.
- Mood: quiet, cold, aftermath. Nothing purple left at the top of the frame.

**Best for:** post-battle / interlude / grief scenes; also the only option that works as a
daytime mobile background without murdering battery on bloom.

### Environment comparison

| | Full Bloom Night | Ember Dusk | Grey Dawn |
| --- | --- | --- | --- |
| Mood | awe, threshold | ritual, foreboding | aftermath, grief |
| Palette | violet / near-black | coral / ember | grey-blue / bone |
| Hero use | title, hub | story beat | interlude |
| Reuse as a battle background | yes | yes | yes |
| Light direction | cold lantern from left | warm from horizon | flat overhead |

---

## PART 4 — PROMPT RECIPES

Run `node scripts/kimetsu-prompt.mjs <id> [--pose=] [--camera=]` to get these assembled
from the lock file. Raw shapes:

**Character (full-body splash, 9:16):**
`[STYLE DNA] CHARACTER: [identity lock] COSTUME: [costume lock] WEAPON: [prop lock] POSE: [pose] [shot] BACKGROUND: [chosen environment option, blurred] Strictly on-model.`

**Character portrait (3:4):** same, shot = chest-up, background = environment option at
f/1.8-equivalent blur, blade visible across the lower third.

**Environment (16:9, no character):** `[STYLE DNA, background variant — no character rules]
[environment lock] CAMERA: [camera] No people, no text, no signage.`

**Environment + silhouette (16:9):** as above + `one distant human silhouette at one-sixth
frame height, scale reference only, no facial detail`.

---

## PART 5 — RULES FOR THE OPERATOR (kept short on purpose)

1. **Do not prompt the names of the show or its characters.** Name the *techniques*
   (cel shading, sumi ink breathing forms, Taishō palette, wisteria out of season).
   The style block above is already the whole vocabulary.
2. One element per image. Flame + wisteria in one frame fights itself.
3. Blade colour is canon-locked per character. Do not "improve" it between shots.
4. The haori is the identity. If a shot can't show the haori, it isn't a character shot.
5. The wisteria line is the most important line in the environment. Never let flowers
   cross it.
6. Reserve a darker lower third on anything that will sit under UI text.
7. Never generate 滅 or any kanji into the image — lettering comes back wrong. The back
   mark is described in the bible for completeness, and rendered by the game, not the model.
