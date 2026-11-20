// Cell Warriors — content data. Combines Chaos Zero Nightmare + Morimens deckbuilding & synergy systems.

export const ATTRIBUTES = {
  passion:  { name: 'Passion',  glyph: '✦', color: '#ff4d6d' },
  order:    { name: 'Order',    glyph: '◈', color: '#4da3ff' },
  justice:  { name: 'Justice',  glyph: '✧', color: '#ffc94d' },
  void:     { name: 'Void',     glyph: '✶', color: '#b06bff' },
  instinct: { name: 'Instinct', glyph: '✹', color: '#4ddc9a' },
};

export const CLASSES = {
  striker:    { name: 'Striker',    desc: 'Frontline damage, Fury burst, and Tenacity break.' },
  vanguard:   { name: 'Vanguard',   desc: 'Barricade Shield retention, Counter, and Aegis Slam.' },
  controller: { name: 'Controller', desc: 'Toxin/Bleed catalyst, Stress cleanse, and Overheal Strength.' },
  psionic:    { name: 'Psionic',    desc: 'Mark, Exhaust scaling, Token swarm, and Echo amplification.' },
  alchemist:  { name: 'Alchemist',  desc: 'Poison damage-over-time: stack it, incubate it, detonate it at end of turn.' },
  mnemonist:  { name: 'Mnemonist',  desc: 'Percent scaling: damage as a % of enemy Max/Missing HP, Shield as % of her Max HP, heals as % of missing HP. Weak vs trash, melts bosses.' },
};

// Every combatant runs the same fixed skeleton: 5 cards, 1 copy each.
export const STARTER_DECK_SIZE = 5;
export const DECK_RULE = '1 Basic Attack · 2 Skills · 1 Heavy (2-3 AP) · 1 one-use Buff Upgrade';

export const ROLES = { striker: 'Fury DPS', vanguard: 'Shield / Counter', controller: 'Catalyst / Heal', psionic: 'Amplify / Swarm', alchemist: 'Poison DoT', mnemonist: '%HP Scaling' };

// ---------------------------------------------------------------------------
// Cards — LEAN KIT. Every combatant carries a fixed, hand-tuned kit of FIVE
// cards, 1 copy of each, in this exact order (deck order matters: the engine
// draws with pop(), so slot 0 is the LAST card drawn — see drawPile seeding):
//
//   slot 0 · BASIC ATTACK   1 AP · cheap, always useful, no debuffs.
//                            4 damage + 1 small, simple rider.
//   slot 1 · SKILL (light)  1 AP · a small, instant-support effect.
//   slot 2 · SKILL (core)   1 AP · the character's simple signature tool.
//   slot 3 · HEAVY          2-3 AP · the big damage / shield / heal / HP /
//                            DoT / DPS payoff. Still one clean line of text.
//   slot 4 · BUFF UPGRADE   1 AP · permanent, ONE USE per battle (Exhaust),
//                            always [Initiation] so it opens in the first hand.
//
// Simplify-first rules: no multi-stage combos, no debuff stacking, no
// percentages of percentages. One rider per card at most.
// ---------------------------------------------------------------------------
export const CARDS = {
  // === KAITO / Striker / Passion — Fury: hit often, then spend it ===
  k_jab: {
    name: 'Cytokine Jab', owner: 'kaito', type: 'attack', cost: 1, attr: 'passion', basic: true,
    dmg: 5, fury: 1,
    text: 'Deal 5 damage. Gain +1 Fury.',
    up: { dmg: 7, fury: 2, text: 'Deal 7 damage. Gain +2 Fury.' },
  },
  k_brace: {
    name: 'Adrenal Brace', owner: 'kaito', type: 'skill', cost: 1, attr: 'passion',
    shield: 5, fury: 2,
    text: 'Gain 5 Shield and +2 Fury.',
    up: { shield: 8, fury: 3, text: 'Gain 8 Shield and +3 Fury.' },
  },
  k_rally: {
    name: 'War Cry', owner: 'kaito', type: 'skill', cost: 1, attr: 'passion',
    teamBuffAtk: 3, fury: 1,
    text: 'All allies gain +3 Attack this turn. Gain +1 Fury.',
    up: { teamBuffAtk: 5, fury: 2, text: 'All allies gain +5 Attack this turn. Gain +2 Fury.' },
  },
  k_last: {
    name: 'Last Shift', owner: 'kaito', type: 'attack', cost: 2, attr: 'passion',
    dmg: 12, consumeFury: 8, tags: ['Finale'], finaleCrit: true, finale: 6,
    text: 'Deal 12 damage, +8 per Fury (Fury is consumed). Finale (last AP): +6 damage and a guaranteed Crit.',
    up: { dmg: 16, consumeFury: 11, finale: 8, text: 'Deal 16 damage, +11 per Fury (consumed). Finale: +8 and a guaranteed Crit.' },
  },
  k_up: {
    name: 'Overclock', owner: 'kaito', type: 'upgrade', cost: 1, attr: 'passion',
    maxAp: 1, onAtkFury: 1, tags: ['Initiation', 'Unique', 'Exhaust'],
    text: 'Permanent: +1 AP each turn. Every Attack you play also grants +1 Fury. One use per battle.',
    up: { maxAp: 1, draw: 1, onAtkFury: 1, text: 'Permanent: +1 AP, +1 card each turn, and +1 Fury per Attack. One use per battle.' },
  },

  // === MOMO / Vanguard / Order — Shield that holds, then Stonewall ===
  m_strike: {
    name: 'Order Strike', owner: 'momo', type: 'attack', cost: 1, attr: 'order', basic: true,
    dmg: 5, shield: 4,
    text: 'Deal 5 damage and gain 4 Shield.',
    up: { dmg: 7, shield: 6, text: 'Deal 7 damage and gain 6 Shield.' },
  },
  m_guard: {
    name: 'Guard Stance', owner: 'momo', type: 'skill', cost: 1, attr: 'order',
    shield: 8, counter: 3,
    text: 'Gain 8 Shield and +3 Counter (retaliate when struck).',
    up: { shield: 12, counter: 5, text: 'Gain 12 Shield and +5 Counter.' },
  },
  m_splint: {
    name: 'Field Splint', owner: 'momo', type: 'skill', cost: 1, attr: 'order',
    heal: 6, stressHeal: 10,
    text: 'Heal 6 HP and clear 10 Stress.',
    up: { heal: 9, stressHeal: 16, text: 'Heal 9 HP and clear 16 Stress.' },
  },
  m_bash: {
    name: 'Aegis Slam', owner: 'momo', type: 'attack', cost: 2, attr: 'order',
    dmg: 6, shieldDmgPct: 1.0,
    text: 'Deal 6 damage, +100% of your Shield.',
    up: { dmg: 10, shieldDmgPct: 1.35, text: 'Deal 10 damage, +135% of your Shield.' },
  },
  m_up: {
    name: 'Field Protocol', owner: 'momo', type: 'upgrade', cost: 1, attr: 'order',
    turnShield: 3, tags: ['Initiation', 'Unique', 'Exhaust'],
    text: 'Permanent: all allies gain 3 Shield at the start of every turn. One use per battle.',
    up: { turnShield: 5, text: 'Permanent: all allies gain 5 Shield at the start of every turn. One use per battle.' },
  },

  // === GORO / Controller / Justice — carry the squad, one big swallow ===
  g_strike: {
    name: 'Scalpel', owner: 'goro', type: 'attack', cost: 1, attr: 'justice', basic: true,
    dmg: 6, toxin: 2,
    text: 'Deal 6 damage and apply 2 Toxin.',
    up: { dmg: 9, toxin: 3, text: 'Deal 9 damage and apply 3 Toxin.' },
  },
  g_guard: {
    name: 'Clot', owner: 'goro', type: 'skill', cost: 1, attr: 'justice',
    shield: 7, teamStressHeal: 6,
    text: 'Gain 7 Shield and clear 6 Stress from the squad.',
    up: { shield: 10, teamStressHeal: 10, text: 'Gain 10 Shield and clear 10 Stress from the squad.' },
  },
  g_broth: {
    name: 'Marrow Broth', owner: 'goro', type: 'skill', cost: 1, attr: 'justice',
    teamHeal: 5,
    text: 'Heal all allies 5 HP.',
    up: { teamHeal: 8, text: 'Heal all allies 8 HP.' },
  },
  g_devour: {
    name: 'Devour', owner: 'goro', type: 'attack', cost: 2, attr: 'justice',
    dmg: 10, toxin: 4, selfHealPctDmg: 0.5,
    text: 'Deal 10 damage, apply 4 Toxin and heal yourself for half the damage dealt.',
    up: { dmg: 14, toxin: 6, selfHealPctDmg: 0.5, text: 'Deal 14 damage, apply 6 Toxin and heal half the damage dealt.' },
  },
  g_up: {
    name: 'The Wall', owner: 'goro', type: 'upgrade', cost: 1, attr: 'justice',
    blockBonus: 3, tags: ['Initiation', 'Unique', 'Exhaust'],
    text: 'Permanent: every Shield you gain is +3 bigger. One use per battle.',
    up: { blockBonus: 5, text: 'Permanent: every Shield you gain is +5 bigger. One use per battle.' },
  },

  // === BIBI / Psionic / Void — Mark the target, then unload ===
  b_ping: {
    name: 'Signal Ping', owner: 'bibi', type: 'attack', cost: 1, attr: 'void', basic: true,
    dmg: 5, resonance: 1,
    text: 'Deal 5 damage. Gain +1 Resonance.',
    up: { dmg: 7, resonance: 2, text: 'Deal 7 damage. Gain +2 Resonance.' },
  },
  b_fuzz: {
    name: 'Fuzz', owner: 'bibi', type: 'skill', cost: 1, attr: 'void',
    shield: 6, draw: 1,
    text: 'Gain 6 Shield and draw 1 card.',
    up: { shield: 9, draw: 1, text: 'Gain 9 Shield and draw 1 card.' },
  },
  b_flare: {
    name: 'Flare', owner: 'bibi', type: 'skill', cost: 1, attr: 'void',
    mark: 2,
    text: 'Mark all enemies for 2 of their actions (+50% damage taken).',
    up: { mark: 3, text: 'Mark all enemies for 3 of their actions (+50% damage taken).' },
  },
  b_burst: {
    name: 'Cytokine Storm', owner: 'bibi', type: 'attack', cost: 3, attr: 'void',
    dmg: 8, aoe: true, scaleResonance: 4,
    text: 'Deal 8 damage to all enemies, +4 per Resonance.',
    up: { dmg: 12, scaleResonance: 6, text: 'Deal 12 damage to all enemies, +6 per Resonance.' },
  },
  b_up: {
    name: 'Cross-talk', owner: 'bibi', type: 'upgrade', cost: 1, attr: 'void',
    extraDraw: 1, firstAp: 1, tags: ['Initiation', 'Unique', 'Exhaust'],
    text: 'Permanent: draw +1 card each turn and +1 AP on turn 1. One use per battle.',
    up: { extraDraw: 1, firstAp: 2, text: 'Permanent: draw +1 card each turn and +2 AP on turn 1. One use per battle.' },
  },

  // === YUNA / Alchemist / Instinct — Poison: stack it, let End Turn collect ===
  y_sting: {
    name: 'Venom Sting', owner: 'yuna', type: 'attack', cost: 1, attr: 'instinct', basic: true,
    dmg: 4, poison: 3,
    text: 'Deal 4 damage and apply 3 Poison.',
    up: { dmg: 6, poison: 5, text: 'Deal 6 damage and apply 5 Poison.' },
  },
  y_antidote: {
    name: 'Sweet Antidote', owner: 'yuna', type: 'skill', cost: 1, attr: 'instinct',
    heal: 6, shield: 5,
    text: 'Heal 6 HP and gain 5 Shield.',
    up: { heal: 9, shield: 8, text: 'Heal 9 HP and gain 8 Shield.' },
  },
  y_mist: {
    name: 'Spore Mist', owner: 'yuna', type: 'skill', cost: 1, attr: 'instinct',
    poisonAll: 3,
    text: 'Apply 3 Poison to all enemies.',
    up: { poisonAll: 5, text: 'Apply 5 Poison to all enemies.' },
  },
  y_epidemic: {
    name: 'Epidemic Bloom', owner: 'yuna', type: 'skill', cost: 2, attr: 'instinct',
    poisonAll: 7,
    text: 'Apply 7 Poison to all enemies. That is a 21-damage tick on each at End Turn.',
    up: { poisonAll: 10, text: 'Apply 10 Poison to all enemies. That is a 30-damage tick on each at End Turn.' },
  },
  y_culture: {
    name: 'Living Culture', owner: 'yuna', type: 'upgrade', cost: 1, attr: 'instinct',
    poisonPotency: 1, tags: ['Initiation', 'Unique', 'Exhaust'],
    text: 'Permanent: every Poison stack deals +1 damage per tick (4 per stack instead of 3). One use per battle.',
    up: { poisonPotency: 2, text: 'Permanent: every Poison stack deals +2 damage per tick (5 per stack). One use per battle.' },
  },

  // === SABLE / Mnemonist / Justice — percentages: flat vs trash, huge vs bosses ===
  s_annotate: {
    name: 'Annotate', owner: 'sable', type: 'attack', cost: 1, attr: 'justice', basic: true,
    dmg: 5, pctMaxHp: 0.03,
    text: 'Deal 5 damage, +3% of the target’s Max HP.',
    up: { dmg: 7, pctMaxHp: 0.04, text: 'Deal 7 damage, +4% of the target’s Max HP.' },
  },
  s_margin: {
    name: 'Margin Note', owner: 'sable', type: 'skill', cost: 1, attr: 'justice',
    shield: 6, draw: 1,
    text: 'Gain 6 Shield and draw 1 card.',
    up: { shield: 9, draw: 1, text: 'Gain 9 Shield and draw 1 card.' },
  },
  s_second: {
    name: 'Second Reading', owner: 'sable', type: 'skill', cost: 1, attr: 'justice',
    healPctMissing: 0.3, stressHeal: 8,
    text: 'Heal 30% of your missing HP and clear 8 Stress.',
    up: { healPctMissing: 0.45, stressHeal: 12, text: 'Heal 45% of your missing HP and clear 12 Stress.' },
  },
  s_titer: {
    name: 'Titer Lance', owner: 'sable', type: 'attack', cost: 2, attr: 'justice',
    dmg: 8, pctMaxHp: 0.07, mark: 2,
    text: 'Deal 8 damage, +7% of the target’s Max HP, and Mark it for 2 of its actions (+50% damage taken).',
    up: { dmg: 12, pctMaxHp: 0.09, mark: 3, text: 'Deal 12 damage, +9% of the target’s Max HP, and Mark it for 3 actions.' },
  },
  s_up: {
    name: 'Living Index', owner: 'sable', type: 'upgrade', cost: 1, attr: 'justice',
    pctBoost: 0.02, tags: ['Initiation', 'Unique', 'Exhaust'],
    text: 'Permanent: every % HP effect on Sable’s cards gains +2%. One use per battle.',
    up: { pctBoost: 0.03, text: 'Permanent: every % HP effect gains +3%. One use per battle.' },
  },

  // === Generated Tokens (only the Breakdown pull cards are generated now) ===
  tok_cut: {
    name: 'Micro-Cut', owner: 'kaito', type: 'attack', cost: 0, attr: 'passion', token: true,
    dmg: 4, tags: ['Exhaust', 'Haste'],
    text: 'Deal 4 damage. Haste. Exhaust.',
    up: { dmg: 6, text: 'Deal 6 damage. Haste. Exhaust.' },
  },
  tok_spark: {
    name: 'Neuro-Spark', owner: 'bibi', type: 'attack', cost: 0, attr: 'void', token: true,
    dmg: 4, resonance: 1, tags: ['Exhaust', 'Haste'],
    text: 'Deal 4 damage and +1 Resonance. Haste. Exhaust.',
    up: { dmg: 6, resonance: 2, text: 'Deal 6 damage and +2 Resonance. Haste. Exhaust.' },
  },
  tok_spore: {
    name: 'Spore Mite', owner: 'yuna', type: 'attack', cost: 0, attr: 'instinct', token: true,
    dmg: 3, poison: 2, tags: ['Exhaust', 'Haste'],
    text: 'Deal 3 damage and apply 2 Poison. Haste. Exhaust.',
    up: { dmg: 4, poison: 3, text: 'Deal 4 damage and apply 3 Poison. Haste. Exhaust.' },
  },

  // === Status / Curse ===
  breakdown_kaito: { name: 'Breakdown: Kaito', owner: 'kaito', type: 'status', cost: 0, breakdown: true, text: 'Play to pull Kaito back.' },
  breakdown_momo:  { name: 'Breakdown: Momo', owner: 'momo', type: 'status', cost: 0, breakdown: true, text: 'Play to pull Momo back.' },
  breakdown_goro:  { name: 'Breakdown: Goro', owner: 'goro', type: 'status', cost: 0, breakdown: true, text: 'Play to pull Goro back.' },
  breakdown_bibi:  { name: 'Breakdown: Bibi', owner: 'bibi', type: 'status', cost: 0, breakdown: true, text: 'Play to pull Bibi back.' },
  breakdown_yuna:  { name: 'Breakdown: Yuna', owner: 'yuna', type: 'status', cost: 0, breakdown: true, text: 'Play to pull Yuna back.' },
  breakdown_sable: { name: 'Breakdown: Sable', owner: 'sable', type: 'status', cost: 0, breakdown: true, text: 'Play to pull Sable back.' },
  curse_doubt:     { name: 'Doubt', owner: 'enemy', type: 'curse', cost: 0, text: 'Unplayable. Clogs your hand.', unplayable: true },
  curse_fever:     { name: 'Fever', owner: 'enemy', type: 'curse', cost: 0, text: 'Unplayable. Adds 6 Stress when drawn.', unplayable: true, onDrawStress: 6 },
};
// 3-Choice Epiphany Evolution Templates (CZN-style mid-combat branching)
export const EPIPHANY_BRANCHES = [
  { id: 'brutal', name: 'BRUTAL', color: '#ff4d6d', desc: '+8 Damage/Shield & +3 Bleed or +2 Strength' },
  { id: 'flow',   name: 'FLOW',   color: '#26e0cf', desc: 'Costs 0 AP & gains Haste (no counter tick)' },
  { id: 'surge',  name: 'SURGE',  color: '#ffc94d', desc: 'Gains Retain, +2 Resonance & +2 Fury' },
];

export const CHARACTERS = {
  kaito: {
    id: 'kaito', name: 'Kaito', full: 'Kaito — Neutrophil', cls: 'striker', attr: 'passion',
    art: 'images/cut-kaito-cut.png', skin: '#ff4d6d', dob: '1987-03-19',
    hp: 88, blurb: 'First responder. Builds Fury from pressure and breaks bosses wide open.',
    leader: { name: 'Vanguard Point', desc: 'Leader: Kaito starts with +2 Strength & +2 Fury.' },
    deck: ['k_jab', 'k_brace', 'k_rally', 'k_last', 'k_up'],
  },
  momo: {
    id: 'momo', name: 'Momo', full: 'Momo — Platelet', cls: 'vanguard', attr: 'order',
    art: 'images/cut-momo-cut.png', skin: '#4da3ff', dob: '1992-07-19',
    hp: 104, blurb: 'Barricade Shield, Counter spikes, and turns defense into Aegis Slams.',
    leader: { name: 'Iron Line', desc: 'Leader: All allies start with +5 Shield and +2 Counter.' },
    deck: ['m_strike', 'm_guard', 'm_splint', 'm_bash', 'm_up'],
  },
  goro: {
    id: 'goro', name: 'Goro', full: 'Goro — Macrophage', cls: 'controller', attr: 'justice',
    art: 'images/cut-goro-cut.png', skin: '#ffc94d', dob: '1984-11-03',
    hp: 110, blurb: 'Stacks Toxin & Bleed, purifies Stress into Strength, retrieves finishers.',
    leader: { name: 'Steady Pulse', desc: 'Leader: All allies gain +6 Max HP and +2 Resonance on Turn 1.' },
    deck: ['g_strike', 'g_guard', 'g_broth', 'g_devour', 'g_up'],
  },
  bibi: {
    id: 'bibi', name: 'Bibi', full: 'Bibi — Mast Cell', cls: 'psionic', attr: 'void',
    art: 'images/cut-bibi-cut.png', skin: '#b06bff', dob: '1998-03-15',
    hp: 84, blurb: 'Marks targets, spawns 0-AP Sparks, echoes Attacks, detonates Resonance.',
    leader: { name: 'Cytokine Surge', desc: 'Leader: Start every battle with +2 EP and +1 Resonance.' },
    deck: ['b_ping', 'b_fuzz', 'b_flare', 'b_burst', 'b_up'],
  },
  yuna: {
    id: 'yuna', name: 'Yuna', full: 'Yuna — Eosinophil', cls: 'alchemist', attr: 'instinct',
    art: 'images/cut-yuna-cut.png', skin: '#57e389', dob: '2001-08-22',
    hp: 92, blurb: 'Poison apothecary. Stacks Poison that melts enemies at End Turn, then incubates or detonates it.',
    leader: { name: 'Toxic Bloom', desc: 'Leader: Enemies start with 3 Poison — already a 9-damage tick at the first End Turn.' },
    deck: ['y_sting', 'y_antidote', 'y_mist', 'y_epidemic', 'y_culture'],
  },
  sable: {
    id: 'sable', name: 'Sable', full: 'Sable — Memory B', cls: 'mnemonist', attr: 'justice',
    art: 'images/char-memoryb.png', skin: '#F0A63C', dob: '1979-05-30',
    hp: 96, blurb: 'Percent scaling. Damage as % of enemy Max/Missing HP, Shield as % of her Max HP, heals as % of missing HP. Melts bosses.',
    leader: { name: 'Written Down', desc: 'Leader: Start with +1 EP and +1 Resonance — Sable has read this fight before.' },
    deck: ['s_annotate', 's_margin', 's_second', 's_titer', 's_up'],
  },
};

// Two Egos per character. At 7 EP, fire as OVER-EXALT (2x power + bonus effects).
export const EGOS = {
  kaito: [
    {
      id: 'ego_kaito_1', owner: 'kaito', name: 'Last Stand', cost: 4, attr: 'passion',
      dmg: 32, fury: 3, text: 'Deal 32 damage and gain +3 Fury.',
      exaltText: 'OVER-EXALT (7 EP): Deal 64 Crit dmg, +6 Fury, +12 Bleed!',
    },
    {
      id: 'ego_kaito_2', owner: 'kaito', name: 'Blood Rush', cost: 4, attr: 'passion',
      dmg: 16, aoe: true, bleed: 4, text: 'Deal 16 AoE damage and apply 4 Bleed.',
      exaltText: 'OVER-EXALT (7 EP): Deal 32 AoE, +10 Bleed, +4 Team Strength!',
    },
  ],
  momo: [
    {
      id: 'ego_momo_1', owner: 'momo', name: 'Bulwark', cost: 4, attr: 'order',
      teamShield: 20, teamStressHeal: 25, barricade: 2, text: 'All allies +20 Shield, -25 Stress, keep Shield.',
      exaltText: 'OVER-EXALT (7 EP): +40 Shield, +10 Counter, -40 Stress, Keep 100% Shield!',
    },
    {
      id: 'ego_momo_2', owner: 'momo', name: 'Barricade', cost: 4, attr: 'order',
      teamShield: 16, taunt: 2, teamCounter: 6, text: 'All allies +16 Shield, +6 Counter. Momo taunts.',
      exaltText: 'OVER-EXALT (7 EP): +32 Shield, +12 Counter, +100% Shield Slam AoE!',
    },
  ],
  goro: [
    {
      id: 'ego_goro_1', owner: 'goro', name: 'Metabolic Feast', cost: 4, attr: 'justice',
      teamHeal: 16, teamStressHeal: 14, teamStr: 2, text: 'Allies heal 16, clear 14 Stress, +2 Strength.',
      exaltText: 'OVER-EXALT (7 EP): Heal 32, clear 28 Stress, +5 Strength, +4 Resonance!',
    },
    {
      id: 'ego_goro_2', owner: 'goro', name: 'Digest', cost: 4, attr: 'justice',
      dmg: 20, heal: 10, toxin: 6, detonateAll: 1, text: 'Deal 20, +6 Toxin, Detonate statuses, heal Goro 10.',
      exaltText: 'OVER-EXALT (7 EP): Deal 40, +12 Toxin, Detonate 2×, heal all 18!',
    },
  ],
  bibi: [
    {
      id: 'ego_bibi_1', owner: 'bibi', name: 'Cytokine Storm', cost: 4, attr: 'void',
      dmg: 14, aoe: true, weakenAll: 2, mark: 2, text: 'Deal 14 AoE, Mark (2T), Enemies -35% dmg (2T).',
      exaltText: 'OVER-EXALT (7 EP): Deal 30 AoE, 3T Mark + Vulnerable + Double Exhaust!',
    },
    {
      id: 'ego_bibi_2', owner: 'bibi', name: 'Signal Override', cost: 4, attr: 'void',
      teamBuffAtk: 6, teamStr: 2, draw: 2, echoNext: 1, text: 'Allies +2 Str, +6 ATK this turn, Echo next Attack, Draw 2.',
      exaltText: 'OVER-EXALT (7 EP): +4 Str, +12 ATK, Echo next Attack, Draw 3, +2 AP!',
    },
  ],
  yuna: [
    {
      id: 'ego_yuna_1', owner: 'yuna', name: 'Pandemic Requiem', cost: 4, attr: 'instinct',
      poison: 10, aoe: true, text: 'Apply 10 Poison to ALL enemies — a 30-damage tick on each at every End Turn.',
      exaltText: 'OVER-EXALT (7 EP): Apply 20 Poison to ALL enemies and trigger a 60+ damage tick on each immediately!',
    },
    {
      id: 'ego_yuna_2', owner: 'yuna', name: 'Mercy Antidote', cost: 4, attr: 'instinct',
      teamHeal: 14, teamStressHeal: 18, teamShield: 10, poison: 6, text: 'Allies +10 Shield, heal 14, clear 18 Stress. Target gains 6 Poison (ticks 18).',
      exaltText: 'OVER-EXALT (7 EP): +20 Shield, heal 28, clear 36 Stress, target gains 12 Poison (ticks 36)!',
    },
  ],
  sable: [
    {
      id: 'ego_sable_1', owner: 'sable', name: 'Written in Full', cost: 4, attr: 'justice',
      dmg: 26, aoe: true, mark: 2, text: 'Deal 26 AoE damage and apply 2T Mark (+50% dmg taken) to all enemies.',
      exaltText: 'OVER-EXALT (7 EP): Deal 52 AoE, 3T Mark, and +2 EP!',
    },
    {
      id: 'ego_sable_2', owner: 'sable', name: 'Open Ledger', cost: 4, attr: 'justice',
      teamShield: 18, teamHeal: 12, draw: 2, text: 'All allies +18 Shield and heal 12. Draw 2 cards.',
      exaltText: 'OVER-EXALT (7 EP): +36 Shield, heal 24, Draw 3, +2 Resonance!',
    },
  ],
};

// ---------------------------------------------------------------------------
// Relics — run-long rule breakers
// ---------------------------------------------------------------------------
export const RELICS = {
  adrenal:  { id: 'adrenal', name: 'Adrenal Gland', glyph: '⚡', text: '+1 AP on your first turn and +2 Fury.' },
  synapse:  { id: 'synapse', name: 'Synaptic Web', glyph: '⌘', text: 'Draw +1 card each turn and +1 Resonance T1.' },
  scabbard: { id: 'scabbard', name: 'Whetstone', glyph: '⟡', text: 'Your first card each turn costs 0 AP.' },
  plate:    { id: 'plate', name: 'Chitin Plate', glyph: '◈', text: 'Start every battle with 10 Shield & +3 Counter.' },
  lens:     { id: 'lens', name: 'Antigen Lens', glyph: '⊕', text: 'Weakness damage ×1.5 → ×1.75.' },
  vagus:    { id: 'vagus', name: 'Vagus Nerve', glyph: '☾', text: 'Stress gained -25%.' },
  marrow:   { id: 'marrow', name: 'Bone Marrow', glyph: '✚', text: 'Heal 8 HP after each battle.' },
  suture:   { id: 'suture', name: 'Suture Kit', glyph: '✚', text: 'Breaking Tenacity heals team 8 & grants +1 Fury.' },
  metronome:{ id: 'metronome', name: 'Metronome', glyph: '⧗', text: '+1 Sands of Time charge each run.' },
  coffer:   { id: 'coffer', name: 'Coffer', glyph: '⛁', text: '+30% currency from every source.' },
};

// ---------------------------------------------------------------------------
// Enemies (Elites & Bosses scaled for multi-turn Mega-DMG combos)
// ---------------------------------------------------------------------------
export const ENEMIES = {
  strep:   { id: 'strep', name: 'Strepto Swarm', hp: 58, tenacity: 40, counter: 3, weakness: 'passion',
             intents: [{ type: 'attack', value: 11 }, { type: 'attack', value: 11 }, { type: 'debuff', value: 14 }] },
  toxin:   { id: 'toxin', name: 'Endotoxin', hp: 50, tenacity: 30, counter: 2, weakness: 'order',
             intents: [{ type: 'attack', value: 9 }, { type: 'debuff', value: 18 }] },
  biofilm: { id: 'biofilm', name: 'Biofilm Mass', hp: 108, tenacity: 82, counter: 4, weakness: 'justice',
             intents: [{ type: 'attack', value: 15 }, { type: 'defend', value: 16 }] },
  strain:  { id: 'strain', name: 'Mutant Strain', hp: 84, tenacity: 60, counter: 3, weakness: 'void',
             intents: [{ type: 'attack', value: 13 }, { type: 'buff', value: 5 }] },
  prion:   { id: 'prion', name: 'Prion Knot', hp: 105, tenacity: 70, counter: 2, weakness: 'instinct',
             intents: [{ type: 'attack', value: 18 }, { type: 'attack', value: 18 }] },
  spore:   { id: 'spore', name: 'Spore Node', hp: 34, tenacity: 18, counter: 2, weakness: 'passion',
             intents: [{ type: 'attack', value: 8 }] },

  elite_hive:  { id: 'elite_hive', name: 'Strepto Hive', hp: 165, tenacity: 80, counter: 3, weakness: 'passion', elite: true,
                 mods: ['regen'], intents: [{ type: 'attack', value: 16 }, { type: 'attack', value: 16 }, { type: 'debuff', value: 18, curse: 'curse_fever' }] },
  elite_wall:  { id: 'elite_wall', name: 'Biofilm Cathedral', hp: 210, tenacity: 115, counter: 4, weakness: 'justice', elite: true,
                 mods: ['immuneRavage'], intents: [{ type: 'attack', value: 19 }, { type: 'defend', value: 22 }] },
  elite_prime: { id: 'elite_prime', name: 'Strain Prime', hp: 180, tenacity: 90, counter: 3, weakness: 'void', elite: true,
                 mods: ['quick'], intents: [{ type: 'attack', value: 18 }, { type: 'charge', value: 42, turns: 2 }] },

  boss_bloom: { id: 'boss_bloom', name: 'Chaos Bloom', hp: 400, tenacity: 150, counter: 3, weakness: 'justice', boss: true,
                phases: [
                  { at: 0.66, weakness: 'void', name: 'Chaos Bloom — Spores' },
                  { at: 0.33, weakness: 'passion', name: 'Chaos Bloom — Unbound' },
                ],
                intents: [{ type: 'attack', value: 19 }, { type: 'charge', value: 46, turns: 2 }, { type: 'debuff', value: 22, curse: 'curse_fever' }] },
    boss_prion: { id: 'boss_prion', name: 'Prion Sovereign', hp: 460, tenacity: 170, counter: 3, weakness: 'instinct', boss: true, // weakness-direction stat = worker's Instinct level.
                phases: [
                  { at: 0.66, weakness: 'order', name: 'Prion Sovereign — Folded' },
                  { at: 0.33, weakness: 'passion', name: 'Prion Sovereign — Apex' },
                ],
                mods: ['regen'],
                intents: [{ type: 'attack', value: 21 }, { type: 'attack', value: 21 }, { type: 'charge', value: 52, turns: 2 }] },

  // Simulation-only target. HP is forced to 999,999 by the Simulation Chamber;
  // behaviour / weakness / tenacity are reconfigured there per test.
  sim_colossus: { id: 'sim_colossus', name: 'Training Colossus', hp: 999999, tenacity: 140, counter: 4, weakness: 'passion', boss: true,
                intents: [{ type: 'attack', value: 8 }, { type: 'attack', value: 8 }, { type: 'debuff', value: 8 }] },
};

// ---------------------------------------------------------------------------
// Character playbooks — shown in Character Details and used for Sim Trials.
// Written from the actual engine rules so the guide never lies.
// ---------------------------------------------------------------------------
export const CHARACTER_GUIDES = {
  kaito: {
    difficulty: 'Easy', fantasy: 'A pressure fighter. Hit with cheap Attacks to bank Fury, then hand it all to one Last Shift.',
    core: 'Fury is stored damage. Alone it does nothing — Last Shift converts every stack into +8 damage and then empties it. Build it with Cytokine Jab (+1), Adrenal Brace (+2) and Overclock (+1 per Attack).',
    loop: ['Open with Overclock: +1 AP every turn and +1 Fury per Attack, for the whole fight.', 'Swing Cytokine Jab to build Fury while chipping the enemy down.', 'Spend the stack on Last Shift — ideally as your last AP, which adds Finale damage and a guaranteed Crit.'],
    combo: ['Overclock → Cytokine Jab ×2 → Last Shift on the last AP.', 'War Cry first (+3 Attack to the whole squad), then Adrenal Brace before the enemy counter hits 0.', 'Adrenal Brace is your only defence — use it on the turn a big intent is landing.'],
    tips: ['Fury has no cap, but your HP does. Do not skip Adrenal Brace to build one more stack.', 'Overclock is a one-use Upgrade: play it on turn 1, then it is gone for the rest of the battle.', 'Last Shift wants to be your final AP — check the Finale line on the card before you spend AP elsewhere.'],
    partners: 'Momo keeps him alive; Bibi Marks the target so his Last Shift lands for 50% more.',
    simGoal: 'Reach 8 Fury, then land a 60+ Last Shift with the Finale Crit.',
  },
  momo: {
    difficulty: 'Easy', fantasy: 'A wall that hits back. Shield everything, then turn the wall into one enormous Aegis Slam.',
    core: 'Shield blocks damage and therefore blocks Stress. Counter punishes anything that hits her even when the Shield eats it, and Aegis Slam converts 100% of her remaining Shield into damage.',
    loop: ['Guard Stance every turn you can: Shield plus Counter.', 'Field Splint keeps the team’s Stress down — Stress is a second health bar.', 'Cash the wall in with Aegis Slam once your Shield is fat.'],
    combo: ['Field Protocol on turn 1: 3 Shield on the whole squad at the start of every turn, for the fight.', 'Guard Stance → let them hit the wall → Aegis Slam for Shield + 100%.', 'Field Splint on the ally who is closest to a Breakdown, not on whoever is lowest.'],
    tips: ['A fully blocked hit causes zero Stress. Shield is mental-health care.', 'Counter = Counter stacks + Strength and it still fires through a fully blocked hit.', 'Aegis Slam only reads YOUR Shield — stack it before you spend it.'],
    partners: 'Goro tops the squad up while she holds; Kaito spends the turns she buys him building Fury.',
    simGoal: 'Hold 20+ Shield at once, take a Counter hit, then land a 40+ Aegis Slam.',
  },
  goro: {
    difficulty: 'Easy', fantasy: 'The gentle giant. He tanks, he heals the squad, and he eats whatever is left.',
    core: 'Toxin ticks for its whole stack every time that enemy acts, so it punishes anything slow and angry. Devour cashes a big hit, applies more Toxin, and heals Goro for half the damage.',
    loop: ['Scalpel to apply Toxin and chip away.', 'Marrow Broth whenever the squad is hurt — it heals everybody.', 'Devour to finish a wounded enemy and top yourself up.'],
    combo: ['The Wall on turn 1: every Shield the squad gains is 3 bigger, for the whole fight.', 'Scalpel → Scalpel → Devour: 6 Toxin applied, then a heavy hit that heals him back.', 'Clot before a debuff turn: Shield for him, Stress cleared for everyone.'],
    tips: ['Toxin damage ignores Shield — it is damage the enemy does to itself.', 'Devour heals from damage actually dealt, so use it on a healthy target, not a nearly-dead one.', 'Clot is a team Stress wipe — save it for the turn after a Fever curse.'],
    partners: 'Yuna doubles down on damage over time; Momo covers the turns where his heals are on cooldown.',
    simGoal: 'Stack 12+ Toxin on the Colossus, then land a 40+ Devour.',
  },
  bibi: {
    difficulty: 'Easy', fantasy: 'A signal DJ. Mark the whole board, charge Resonance, then drop one loud Cytokine Storm.',
    core: 'Mark makes everything take +50% damage — apply it before anyone spends anything big. Resonance builds from Skills and Signal Ping, and Cytokine Storm adds +4 damage per Resonance on every enemy.',
    loop: ['Flare early: every enemy is Marked for 2 of its actions.', 'Play Skills and Signal Ping to stack Resonance — they tick the enemy clock, so watch the counters.', 'Cytokine Storm when Resonance is high and the board is Marked.'],
    combo: ['Flare → Signal Ping ×2 (Resonance 4+) → Cytokine Storm into every Marked enemy.', 'Fuzz when your hand is thin: Shield plus a card.', 'Cross-talk on turn 1: +1 card every turn and +1 AP on the opening turn.'],
    tips: ['Mark is a multiplier on EVERY attacker, so it is worth a whole card even with no damage on it.', 'Cytokine Storm is 3 AP: build the Resonance on earlier turns, not the same one.', 'Cross-talk is a one-use Upgrade — play it in the opening hand and forget it.'],
    partners: 'Kaito’s Last Shift loves a Marked target; Yuna’s Poison ticks are amplified by her own Mark as well.',
    simGoal: 'Reach 8 Resonance, Mark the Colossus, then land a 50+ Cytokine Storm.',
  },
  yuna: {
    difficulty: 'Easy', fantasy: 'A poison apothecary. She stops touching the enemy and lets End Turn finish the argument.',
    core: 'POISON is damage over time that scales: at End Turn each enemy takes stacks x 3 damage, then loses 1 stack. Living Culture makes it stacks x 4 for the rest of the fight. Cap is 20 stacks.',
    loop: ['Venom Sting and Spore Mist to stack Poison on everything.', 'Living Culture on turn 1: every stack now pays 4 instead of 3.', 'Epidemic Bloom for a 21+ damage tick on the whole board, then end the turn and collect.'],
    combo: ['Living Culture → Venom Sting → Spore Mist → Epidemic Bloom → End Turn.', 'Sweet Antidote is her only defence: heal plus Shield on the turn she is targeted.', 'Against one fat enemy, Spore Mist is a wasted card — pour every stack into it instead.'],
    tips: ['Poison ignores Shield and does not need Strength, so it is the most reliable damage in the game.', 'Count the tick before you End Turn: stacks x 3 (or x 4 with Living Culture) is the damage it is about to take.', 'Poison decays by 1 per End Turn, so a small stack is a waste — commit or skip.'],
    partners: 'Goro’s Toxin stacks a second damage-over-time on the same target; Bibi’s Mark raises the Poison tick too.',
    simGoal: 'Stack 15+ Poison on the Colossus, watch a 45+ End-Turn tick, and keep the stack alive.',
  },
  sable: {
    difficulty: 'Medium', fantasy: 'An archivist who does not hit harder — she hits by percentage. The bigger the enemy, the more every card is worth.',
    core: 'PERCENT SCALING. Annotate and Titer Lance add a % of the target’s Max HP, so they are modest on a 34-HP Spore and enormous on a 400-HP boss. Second Reading heals a % of her MISSING HP — small at full health, huge near death.',
    loop: ['Living Index on turn 1: every % effect gains +2% for the whole fight.', 'Annotate and Titer Lance the biggest HP pool on the field.', 'Second Reading late, never early — it converts a near-death Sable back to half health.'],
    combo: ['Living Index → Titer Lance (Mark, +50%) → Annotate into the Mark.', 'Margin Note when the hand is thin: Shield plus a card.', 'Titer Lance Marks the target for the whole squad, not just for Sable.'],
    tips: ['The live number on the card already includes the % bonus for your selected target — trust it.', 'Against small enemies she is deliberately ordinary: let a flat-damage partner clear the trash.', 'Second Reading is a % of MISSING HP, so playing it at full HP does almost nothing.'],
    partners: 'Bibi’s Mark multiplies her % lances; Momo’s Shield keeps her alive long enough for Second Reading to matter.',
    simGoal: 'With Living Index up, land a 40+ %HP hit on the Colossus.',
  },
};

export const ENCOUNTERS = {
  skirmish_1: { name: 'Breach', enemies: ['strep'], attr: 'passion' },
  skirmish_2: { name: 'Drain Line', enemies: ['toxin', 'spore'], attr: 'order' },
  skirmish_3: { name: 'Signal Rot', enemies: ['strain'], attr: 'void' },
  skirmish_4: { name: 'Deep Thicket', enemies: ['biofilm', 'strep'], attr: 'justice' },
  skirmish_5: { name: 'Prion Fringe', enemies: ['prion', 'spore'], attr: 'instinct' },
  elite_a: { name: 'Hive Node', enemies: ['elite_hive'], attr: 'passion', elite: true },
  elite_b: { name: 'Cathedral', enemies: ['elite_wall'], attr: 'justice', elite: true },
  elite_c: { name: 'Prime Strain', enemies: ['elite_prime'], attr: 'void', elite: true },
  boss_a: { name: 'Chaos Bloom', enemies: ['boss_bloom'], attr: 'justice', boss: true },
  boss_b: { name: 'Prion Sovereign', enemies: ['boss_prion'], attr: 'instinct', boss: true },
};

export const MISSIONS = [
  { code: 'm01', name: 'Cutline', place: 'Left Forearm — Epidermis', threat: 'Low', rec: 'passion', reward: 40, enemies: ['strep'], hero: 'kaito',
    // Scripted story beats: { art, who, text } — art lives in images/story/.
    story: [
      { art: 'images/story/m01-01-breach.jpg', who: 'Left Forearm — Epidermis', text: 'The scrape happened four hours ago. Skin tore, capillaries snapped, a doorway opened in the dark — and nobody told the body.' },
      { art: 'images/story/m01-02-strep.jpg', who: 'The Breach', text: 'Something violet and patient slides through the cut. Strepto. It does not knock. It never knocks. It just starts counting your cells.' },
      { art: 'images/story/m01-03-kaito.jpg', who: 'Kaito — Neutrophil', text: 'One chain. One cut. Four hours of head start. …Huh. Almost a fair fight. For you.' },
      { art: 'images/story/m01-04-lash.jpg', who: 'The Breach', text: 'It answers the only way it knows how: all at once, whip-fast, straight down the vessel. Anything slower than Kaito would already be seeding.' },
      { art: 'images/story/m01-05-momo.jpg', who: 'Momo — Platelet', text: 'Kaito! Scanner says the breach is STILL OPEN! If it seeds any deeper, this stops being a scrape and starts being a war!' },
      { art: 'images/story/m01-06-stand.jpg', who: 'Kaito — Neutrophil', text: 'Then it stops here. Get your seal ready, Momo. I only need one minute.' },
      { art: 'images/story/m01-07-coil.jpg', who: 'Left Forearm — Epidermis', text: 'He plants himself between the cut and the bloodstream. One cell thick. That is all a wall has ever had to be.' },
      { art: 'images/story/m01-08-engage.jpg', who: 'Mission 01 — Cutline', text: 'The chain coils. Three dark eyes. No mouth. It has already answered. Hold the breach.' },
    ] },
  { code: 'm02', name: 'Drain Line', place: 'Lymph Node 04', threat: 'Low', rec: 'order', reward: 50, enemies: ['toxin', 'spore'], hero: 'momo',
    // Scripted story beats: { art, who, text } — art lives in images/story/.
    story: [
      { art: 'images/story/m02-01-node.jpg', who: 'Lymph Node 04', text: 'Lymph Node 04 runs hot and swollen — the body\'s filter, cooking in its own fever.' },
      { art: 'images/story/m02-02-toxin.jpg', who: 'The Drain', text: 'Endotoxin came up through the drain and made itself at home. It does not chase. It leaks — and lets the current do the chasing.' },
      { art: 'images/story/m02-03-spores.jpg', who: 'The Drain', text: 'And it brought seeds. Spore Nodes riding the lymph, every one a tiny locked door with something growing behind it.' },
      { art: 'images/story/m02-04-momo.jpg', who: 'Momo — Platelet', text: 'Node\'s at thirty-nine degrees and CLIMBING! If this drain clogs, the whole arm goes septic!' },
      { art: 'images/story/m02-05-goro.jpg', who: 'Goro — Macrophage', text: '…Corridor\'s too small. I hold the door out here. In there — it\'s you, kid.' },
      { art: 'images/story/m02-06-hold.jpg', who: 'Momo — Platelet', text: 'Then I hold the corridor! Patch, seal, barrier — that\'s the job. That\'s MY job!' },
      { art: 'images/story/m02-07-loom.jpg', who: 'Lymph Node 04', text: 'The blob swells to fill the drain. The spores turn, all at once, like seeds hearing rain.' },
      { art: 'images/story/m02-08-engage.jpg', who: 'Mission 02 — Drain Line', text: 'Kit down. Barrier up. Hold the corridor — nothing gets through Momo.' },
    ] },
  { code: 'm03', name: 'The Thicket', place: 'Deep Tissue — Biofilm Bloom', threat: 'Medium', rec: 'justice', reward: 65, enemies: ['biofilm', 'strep'], hero: 'goro',
    // Scripted story beats: { art, who, text } — art lives in images/story/.
    story: [
      { art: 'images/story/m03-01-city.jpg', who: 'Deep Tissue — Biofilm Bloom', text: 'A biofilm has grown over the wound bed like a city nobody planned — towers of shell, streets of slime.' },
      { art: 'images/story/m03-02-bounce.jpg', who: 'Deep Tissue', text: 'Antibodies bounce off it. Every scout the body sends comes back with the same report: nothing gets in.' },
      { art: 'images/story/m03-03-eyes.jpg', who: 'The Thicket', text: 'And the city watches back. A hundred tiny eyes — and not one of them in a hurry.' },
      { art: 'images/story/m03-04-goro.jpg', who: 'Goro — Macrophage', text: '…You built all this to keep us out. Cute.' },
      { art: 'images/story/m03-05-devour.jpg', who: 'Deep Tissue', text: 'Goro does not knock either. He eats through — one plate, one street, one wall at a time.' },
      { art: 'images/story/m03-06-ambush.jpg', who: 'The Thicket', text: 'The city has teeth: strep chains in the walls, sprung like traps. This is the first thing they have fought that uses a plan.' },
      { art: 'images/story/m03-07-wall.jpg', who: 'Goro — Macrophage', text: 'Plans are fine. I have one too: stand where the hitting happens. Do not move.' },
      { art: 'images/story/m03-08-engage.jpg', who: 'Mission 03 — The Thicket', text: 'Cleaver up. City ahead. Eat through it.' },
    ] },
  { code: 'm04', name: 'Signal Rot', place: 'Spinal Relay — Night', threat: 'High', rec: 'void', reward: 80, enemies: ['strain', 'toxin'], hero: 'bibi',
    // Scripted story beats: { art, who, text } — art lives in images/story/.
    story: [
      { art: 'images/story/m04-01-relay.jpg', who: 'Spinal Relay — Night', text: 'The signal rot reaches the relay at 03:12.' },
      { art: 'images/story/m04-02-rot.jpg', who: 'Spinal Relay — Night', text: 'The relay starts telling the body the wrong things — heat, fear, pain, all at once.' },
      { art: 'images/story/m04-03-strain.jpg', who: 'The Relay', text: 'A Mutant Strain has nested in the cables, chewing clean signals into static.' },
      { art: 'images/story/m04-04-bibi.jpg', who: 'Bibi — Mast Cell', text: 'Ugh. EVERYTHING here is screaming. Move over — I scream louder.' },
      { art: 'images/story/m04-05-flare.jpg', who: 'The Relay', text: 'Bibi does not cure the noise. She drowns it — one clean signal, louder than the rot. That is not the same as curing it. It is better: it is first.' },
      { art: 'images/story/m04-06-toxin.jpg', who: 'The Relay', text: 'The rot calls its friends. Toxin in the cables, the Strain in the walls — everything rotten in the body, converging on one relay.' },
      { art: 'images/story/m04-07-storm.jpg', who: 'Bibi — Mast Cell', text: 'If this relay goes down, the body forgets how to BE a body. Not tonight. Not on my watch!' },
      { art: 'images/story/m04-08-engage.jpg', who: 'Mission 04 — Signal Rot', text: 'Vial up. Voice up. Out-shout the rot.' },
    ] },
  { code: 'm05', name: 'Prion Gate', place: 'The Blood-Brain Barrier', threat: 'Severe', rec: 'instinct', reward: 100, enemies: ['prion', 'strain', 'biofilm'], hero: 'yuna',
    // Scripted story beats: { art, who, text } — art lives in images/story/.
    story: [
      { art: 'images/story/m05-01-barrier.jpg', who: 'The Blood-Brain Barrier', text: 'The barrier is one cell thick — the last wall before the brain, and the quietest place in the body.' },
      { art: 'images/story/m05-02-prion.jpg', who: 'The Gate', text: 'The Prion Knot is already folding through it. Protein origami, patient as geology, wrong in every fold.' },
      { art: 'images/story/m05-03-yuna.jpg', who: 'Yuna — Eosinophil', text: 'Wrong folds. I can smell them off it from here. …What? Instinct is a sense. Mine just files reports.' },
      { art: 'images/story/m05-04-mist.jpg', who: 'The Gate', text: 'Nothing breaks a prion. But her toxins can loosen it — one wrong fold at a time, until wrong becomes undone.' },
      { art: 'images/story/m05-05-assault.jpg', who: 'The Gate', text: 'And the knot did not come alone. Strain in the dark, Biofilm on the wall — the whole rotten army, at one gate.' },
      { art: 'images/story/m05-06-team.jpg', who: 'The Blood-Brain Barrier', text: 'So the team comes to the gate. Everything they have learned about each other gets spent here.' },
      { art: 'images/story/m05-07-hold.jpg', who: 'Yuna — Eosinophil', text: 'It folds. I unfold. It can do this forever — fine. So can I. HOLD THE GATE!' },
      { art: 'images/story/m05-08-engage.jpg', who: 'Mission 05 — Prion Gate', text: 'Nothing gets through. Not tonight, not ever. Engage.' },
    ] },
];

export const EVENTS = [
  {
    id: 'cache', name: 'Supply Cache', art: 'images/event-cache.jpg',
    text: 'A sealed vesicle of stored nutrients, still warm. Something has been feeding here.',
    choices: [
      { label: 'Take the nutrients', effect: { currency: 45 }, note: '+45 cells' },
      { label: 'Pry open the inner seal', effect: { relic: true, stress: 14 }, note: 'Relic, +14 stress' },
      { label: 'Leave it untouched', effect: {}, note: 'Nothing' },
    ],
  },
  {
    id: 'signal', name: 'Strange Signal', art: 'images/event-signal.jpg',
    text: 'A pattern repeats under the tissue noise. It is not a pathogen. It is a memory.',
    choices: [
      { label: 'Listen carefully', effect: { upgrade: true }, note: 'Upgrade a card' },
      { label: 'Answer it', effect: { card: true, stress: 10 }, note: 'Gain a card, +10 stress' },
      { label: 'Cut the line', effect: { sands: 1 }, note: '+1 Sands' },
    ],
  },
  {
    id: 'marrow', name: 'Marrow Pool', art: 'images/event-marrow.jpg',
    text: 'A still pool in the marrow cavity. Cells come here to stop being afraid.',
    choices: [
      { label: 'Drink deep', effect: { heal: 0.3 }, note: 'Heal 30% each' },
      { label: 'Sit for a while', effect: { stress: -40 }, note: 'Clear 40 stress' },
      { label: 'Bottle it', effect: { currency: 35 }, note: '+35 cells' },
    ],
  },
  {
    id: 'cursed', name: 'Cursed Relic', art: 'images/event-cursed.jpg',
    text: 'A relic wrapped in dead tissue. It works. It also whispers.',
    choices: [
      { label: 'Take it anyway', effect: { relic: true, curse: true }, note: 'Relic + a Curse card' },
      { label: 'Burn it', effect: { currency: 25 }, note: '+25 cells' },
      { label: 'Walk away', effect: {}, note: 'Nothing' },
    ],
  },
  {
    id: 'fragment', name: 'Memory Fragment', art: 'images/event-signal.jpg',
    text: 'A stranger\'s last thought, caught in a capillary. It is worth something to the right buyer.',
    choices: [
      { label: 'Sell it', effect: { currency: 70, hp: 10 }, note: '+70 cells, -10 HP each' },
      { label: 'Keep it', effect: { card: true }, note: 'Gain a card' },
      { label: 'Let it go', effect: { stress: -20 }, note: 'Clear 20 stress' },
    ],
  },
];

export const MAP_CONFIG = {
  floors: 11,
  lanes: 3,
  pattern: ['battle', 'event', 'battle', 'shop', 'elite', 'rest', 'battle', 'event', 'elite', 'rest', 'boss'],
};

export const REWARD_CURRENCY = { battle: 18, elite: 34, boss: 90, event: 0 };
export const CHAOS_FIRST_CLEAR = 150;
export const MOD_INFO = {
  regen: { label: 'REGEN', desc: '+8 Tenacity per action' },
  immuneRavage: { label: 'IRON SHELL', desc: 'Immune to Ravage; 75% Tenacity resist' },
  quick: { label: 'QUICK', desc: 'Action counter resets 1 faster' },
};
export const CHAOS_WEAKNESSES = ['passion', 'order', 'justice', 'void', 'instinct'];
