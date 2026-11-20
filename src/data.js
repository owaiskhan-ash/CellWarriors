// Cell Warriors — content data. Mechanics mirror Chaos Zero Nightmare (see docs/czn-systems.md).

export const ATTRIBUTES = {
  passion:  { name: 'Passion',  glyph: '✦', color: '#ff4d6d' },
  order:    { name: 'Order',    glyph: '◈', color: '#4da3ff' },
  justice:  { name: 'Justice',  glyph: '✧', color: '#ffc94d' },
  void:     { name: 'Void',     glyph: '✶', color: '#b06bff' },
  instinct: { name: 'Instinct', glyph: '✹', color: '#4ddc9a' },
};

export const CLASSES = {
  striker:  { name: 'Striker',  desc: 'Frontline damage. Breaks Tenacity fast.' },
  vanguard: { name: 'Vanguard', desc: 'Shields and holds the line.' },
  controller:{ name: 'Controller', desc: 'Heals, cleanses, controls stress.' },
  psionic:  { name: 'Psionic',  desc: 'Buffs the team, AoE pressure.' },
};

export const ROLES = {
  striker: 'Damage', vanguard: 'Shield', controller: 'Healer', psionic: 'Support DPS',
};

// ---------------------------------------------------------------------------
// Cards. type: attack | skill | upgrade | curse | status
// ---------------------------------------------------------------------------
export const CARDS = {
  // --- Kaito / Striker / Passion -------------------------------------------
  k_jab:   { name: 'Cytokine Jab', owner: 'kaito', type: 'attack', cost: 1, attr: 'passion', dmg: 7, text: 'Deal 7 damage.' },
  k_brace: { name: 'Brace', owner: 'kaito', type: 'skill', cost: 1, attr: 'passion', shield: 7, text: 'Gain 7 Shield.' },
  k_rush:  { name: 'Blade Rush', owner: 'kaito', type: 'attack', cost: 1, attr: 'passion', dmg: 5, hits: 2, text: 'Deal 5 damage twice.' },
  k_first: { name: 'First In', owner: 'kaito', type: 'skill', cost: 1, attr: 'passion', shield: 5, buffAtk: 3, tags: ['Retain', 'Lead'], text: 'Gain 5 Shield and +3 Attack this turn. Retain. Lead.' },
  k_last:  { name: 'Last Shift', owner: 'kaito', type: 'attack', cost: 2, attr: 'passion', dmg: 18, selfStress: 14, text: 'Deal 18 damage. Gain 14 Stress.' },
  k_up:    { name: 'Overclock', owner: 'kaito', type: 'upgrade', cost: 1, attr: 'passion', tags: ['Initiation'], maxAp: 1, text: 'Permanent: +1 AP each turn for this fight.' },

  // --- Momo / Vanguard / Order ---------------------------------------------
  m_strike:{ name: 'Order Strike', owner: 'momo', type: 'attack', cost: 1, attr: 'order', dmg: 6, text: 'Deal 6 damage.' },
  m_guard: { name: 'Guard Stance', owner: 'momo', type: 'skill', cost: 1, attr: 'order', shield: 8, text: 'Gain 8 Shield.' },
  m_patch: { name: 'Patch Up', owner: 'momo', type: 'skill', cost: 1, attr: 'order', teamShield: 4, text: 'All allies gain 4 Shield.' },
  m_stand: { name: 'Stand Firm', owner: 'momo', type: 'skill', cost: 1, attr: 'order', shield: 10, taunt: 1, text: 'Gain 10 Shield. Taunt this turn.' },
  m_triage:{ name: 'Triage', owner: 'momo', type: 'skill', cost: 1, attr: 'order', heal: 7, stressHeal: 10, text: 'Heal 7 HP and clear 10 Stress.' },
  m_up:    { name: 'Field Protocol', owner: 'momo', type: 'upgrade', cost: 1, attr: 'order', tags: ['Initiation'], turnShield: 4, text: 'Permanent: all allies gain 4 Shield each turn.' },

  // --- Goro / Controller / Justice -----------------------------------------
  g_strike:{ name: 'Scalpel', owner: 'goro', type: 'attack', cost: 1, attr: 'justice', dmg: 6, text: 'Deal 6 damage.' },
  g_guard: { name: 'Clot', owner: 'goro', type: 'skill', cost: 1, attr: 'justice', shield: 7, text: 'Gain 7 Shield.' },
  g_cleave:{ name: 'Cleave', owner: 'goro', type: 'attack', cost: 2, attr: 'justice', dmg: 9, aoe: true, text: 'Deal 9 damage to all enemies.' },
  g_devour:{ name: 'Devour', owner: 'goro', type: 'skill', cost: 2, attr: 'justice', teamHeal: 6, teamStressHeal: 12, text: 'All allies heal 6 HP, clear 12 Stress.' },
  g_hymn:  { name: 'Lullaby', owner: 'goro', type: 'skill', cost: 1, attr: 'justice', weakenAll: 2, text: 'All enemies deal 35% less damage for 2 turns.' },
  g_up:    { name: 'The Wall', owner: 'goro', type: 'upgrade', cost: 1, attr: 'justice', tags: ['Initiation'], blockBonus: 2, text: 'Permanent: all Shields gain +2.' },

  // --- Bibi / Psionic / Void ----------------------------------------------
  b_ping:  { name: 'Signal Ping', owner: 'bibi', type: 'attack', cost: 1, attr: 'void', dmg: 5, text: 'Deal 5 damage.' },
  b_fuzz:  { name: 'Fuzz', owner: 'bibi', type: 'skill', cost: 1, attr: 'void', shield: 7, text: 'Gain 7 Shield.' },
  b_flare: { name: 'Flare', owner: 'bibi', type: 'attack', cost: 2, attr: 'void', dmg: 6, aoe: true, text: 'Deal 6 damage to all enemies.' },
  b_hist:  { name: 'Histamine', owner: 'bibi', type: 'skill', cost: 1, attr: 'void', teamBuffAtk: 4, text: 'All allies gain +4 Attack this turn.' },
  b_over:  { name: 'Overdrive', owner: 'bibi', type: 'skill', cost: 0, attr: 'void', tags: ['Exhaust', 'Haste'], apGain: 1, text: 'Gain 1 AP. Does not advance enemy counters. Exhaust.' },
  b_up:    { name: 'Cross-talk', owner: 'bibi', type: 'upgrade', cost: 1, attr: 'void', tags: ['Initiation'], extraDraw: 1, text: 'Permanent: draw +1 card each turn.' },

  // --- Status / Curse ------------------------------------------------------
  breakdown_kaito: { name: 'Breakdown: Kaito', owner: 'kaito', type: 'status', cost: 0, breakdown: true, text: 'Play 5 times to pull Kaito back. Advances enemy counters.' },
  breakdown_momo:  { name: 'Breakdown: Momo', owner: 'momo', type: 'status', cost: 0, breakdown: true, text: 'Play 5 times to pull Momo back.' },
  breakdown_goro:  { name: 'Breakdown: Goro', owner: 'goro', type: 'status', cost: 0, breakdown: true, text: 'Play 5 times to pull Goro back.' },
  breakdown_bibi:  { name: 'Breakdown: Bibi', owner: 'bibi', type: 'status', cost: 0, breakdown: true, text: 'Play 5 times to pull Bibi back.' },
  curse_doubt:     { name: 'Doubt', owner: 'enemy', type: 'curse', cost: 0, text: 'Unplayable while in hand.', unplayable: true },
};

// Character card pools: 2 basics + 3 signature + 1 upgrade = 6 unique, x2 basics in deck.
export const CHARACTERS = {
  kaito: {
    id: 'kaito', name: 'Kaito', full: 'Kaito — Neutrophil', cls: 'striker', attr: 'passion',
    art: 'images/cut-kaito-cut.png', skin: '#ff4d6d',
    hp: 88, blurb: 'First responder. Hits hardest and breaks the fastest.',
    deck: ['k_jab', 'k_jab', 'k_brace', 'k_rush', 'k_first', 'k_last', 'k_up'],
    ego: { card: 'k_last' },
  },
  momo: {
    id: 'momo', name: 'Momo', full: 'Momo — Platelet', cls: 'vanguard', attr: 'order',
    art: 'images/cut-momo-cut.png', skin: '#4da3ff',
    hp: 104, blurb: 'Scaffold and shield. Nothing gets past her.',
    deck: ['m_strike', 'm_strike', 'm_guard', 'm_patch', 'm_stand', 'm_triage', 'm_up'],
    ego: { card: 'm_guard' },
  },
  goro: {
    id: 'goro', name: 'Goro', full: 'Goro — Macrophage', cls: 'controller', attr: 'justice',
    art: 'images/cut-goro-cut.png', skin: '#ffc94d',
    hp: 110, blurb: 'Eats the dead, calms the living. Holds the team together.',
    deck: ['g_strike', 'g_strike', 'g_guard', 'g_cleave', 'g_devour', 'g_hymn', 'g_up'],
    ego: { card: 'g_guard' },
  },
  bibi: {
    id: 'bibi', name: 'Bibi', full: 'Bibi — T-Cell', cls: 'psionic', attr: 'void',
    art: 'images/cut-bibi-cut.png', skin: '#b06bff',
    hp: 84, blurb: 'Signals the whole immune system at once.',
    deck: ['b_ping', 'b_ping', 'b_fuzz', 'b_flare', 'b_hist', 'b_over', 'b_up'],
    ego: { card: 'b_fuzz' },
  },
};

// Ego skills: big flashy finishers, 4 EP, never advance enemy action counters.
export const EGOS = {
  kaito: { id: 'ego_kaito', owner: 'kaito', name: 'Last Stand', cost: 4, attr: 'passion', dmg: 30, text: 'Deal 30 damage. Ignores Weakness rules.' },
  momo:  { id: 'ego_momo', owner: 'momo', name: 'Bulwark', cost: 4, attr: 'order', teamShield: 20, teamStressHeal: 25, text: 'All allies gain 20 Shield, clear 25 Stress.' },
  goro:  { id: 'ego_goro', owner: 'goro', name: 'Metabolic Feast', cost: 4, attr: 'justice', teamHeal: 14, teamStressHeal: 10, text: 'All allies heal 14 HP and clear 10 Stress.' },
  bibi:  { id: 'ego_bibi', owner: 'bibi', name: 'Cytokine Storm', cost: 4, attr: 'void', dmg: 11, aoe: true, weakenAll: 2, text: 'Deal 11 to all enemies. They deal 35% less for 2 turns.' },
};

// ---------------------------------------------------------------------------
// Enemies: hp, tenacity, action counter, weakness attribute, telegraphed intents
// ---------------------------------------------------------------------------
export const ENEMIES = {
  strep:   { id: 'strep', name: 'Strepto Swarm', hp: 58, tenacity: 40, counter: 3, weakness: 'passion',
             intents: [{ type: 'attack', value: 11 }, { type: 'attack', value: 11 }, { type: 'debuff', value: 14 }] },
  toxin:   { id: 'toxin', name: 'Endotoxin', hp: 50, tenacity: 30, counter: 2, weakness: 'order',
             intents: [{ type: 'attack', value: 9 }, { type: 'debuff', value: 18 }] },
  biofilm: { id: 'biofilm', name: 'Biofilm Mass', hp: 108, tenacity: 88, counter: 4, weakness: 'justice',
             intents: [{ type: 'attack', value: 14 }, { type: 'defend', value: 14 }] },
  strain:  { id: 'strain', name: 'Mutant Strain', hp: 74, tenacity: 58, counter: 3, weakness: 'void',
             intents: [{ type: 'attack', value: 12 }, { type: 'buff', value: 4 }] },
  prion:   { id: 'prion', name: 'Prion Knot', hp: 86, tenacity: 64, counter: 2, weakness: 'instinct',
             intents: [{ type: 'attack', value: 17 }, { type: 'attack', value: 17 }] },
  spore:   { id: 'spore', name: 'Spore Node', hp: 30, tenacity: 18, counter: 2, weakness: 'passion',
             intents: [{ type: 'attack', value: 7 }] },
};

export const MISSIONS = [
  { code: 'm01', name: 'Cutline', place: 'Left Forearm — Epidermis', threat: 'Low', rec: 'passion',
    enemies: ['strep'], story: [
      'The scrape happened four hours ago. Nobody told the skin.',
      'A breach in the left forearm. Strepto is already inside the cut, and the alarm has not been rung.',
      'Kaito reaches it first. He always does.',
    ] },
  { code: 'm02', name: 'Drain Line', place: 'Lymph Node 04', threat: 'Low', rec: 'order',
    enemies: ['toxin', 'spore'], story: [
      'Lymph Node 04 runs hot and swollen.',
      'Endotoxin moved in through the drain and brought its own spores.',
      'Momo holds the corridor. Nobody else fits.',
    ] },
  { code: 'm03', name: 'The Thicket', place: 'Deep Tissue — Biofilm Bloom', threat: 'Medium', rec: 'justice',
    enemies: ['biofilm', 'strep'], story: [
      'A biofilm has grown over the wound bed like a city nobody planned.',
      'Antibodies bounce off it. Goro has to eat through.',
      'This is the first time the team fights something that fights back with a plan.',
    ] },
  { code: 'm04', name: 'Signal Rot', place: 'Spinal Relay — Night', threat: 'High', rec: 'void',
    enemies: ['strain', 'toxin'], story: [
      'The signal rot reaches the relay at 03:12.',
      'The relay starts telling the body the wrong things — heat, fear, pain, all at once.',
      'Bibi can out-shout it. That is not the same as curing it.',
    ] },
  { code: 'm05', name: 'Prion Gate', place: 'The Blood-Brain Barrier', threat: 'Severe', rec: 'instinct',
    enemies: ['prion', 'strain', 'biofilm'], story: [
      'The barrier is one cell thick and the prion knot is already folding through it.',
      'Everything they have learned about each other gets spent here.',
      'Hold the gate. Nothing gets through.',
    ] },
];
