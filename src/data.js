// Cell Warriors — content data. Mechanics mirror Chaos Zero Nightmare (see docs/czn-systems.md).

export const ATTRIBUTES = {
  passion:  { name: 'Passion',  glyph: '✦', color: '#ff4d6d' },
  order:    { name: 'Order',    glyph: '◈', color: '#4da3ff' },
  justice:  { name: 'Justice',  glyph: '✧', color: '#ffc94d' },
  void:     { name: 'Void',     glyph: '✶', color: '#b06bff' },
  instinct: { name: 'Instinct', glyph: '✹', color: '#4ddc9a' },
};

export const CLASSES = {
  striker:   { name: 'Striker',   desc: 'Frontline damage. Breaks Tenacity fast.' },
  vanguard:  { name: 'Vanguard',  desc: 'Shields and holds the line.' },
  controller:{ name: 'Controller',desc: 'Heals, cleanses, controls stress.' },
  psionic:   { name: 'Psionic',   desc: 'Buffs the team, AoE pressure.' },
};

export const ROLES = { striker: 'Damage', vanguard: 'Shield', controller: 'Healer', psionic: 'Support DPS' };

// ---------------------------------------------------------------------------
// Cards. type: attack | skill | upgrade | curse | status
// `up` = the upgraded ("+") variant created at rest sites and by Epiphany.
// ---------------------------------------------------------------------------
export const CARDS = {
  // --- Kaito / Striker / Passion -------------------------------------------
  k_jab:   { name: 'Cytokine Jab', owner: 'kaito', type: 'attack', cost: 1, attr: 'passion', dmg: 8, text: 'Deal 8 damage.',
             up: { dmg: 11, text: 'Deal 11 damage.' } },
  k_brace: { name: 'Brace', owner: 'kaito', type: 'skill', cost: 1, attr: 'passion', shield: 7, text: 'Gain 7 Shield.',
             up: { shield: 11, text: 'Gain 11 Shield.' } },
  k_rush:  { name: 'Blade Rush', owner: 'kaito', type: 'attack', cost: 1, attr: 'passion', dmg: 5, hits: 2, combo: 4,
             tags: ['Combo'], text: 'Deal 5 twice. Combo: +4 if you played an Attack this turn.',
             up: { dmg: 6, combo: 6, text: 'Deal 6 twice. Combo: +6 if you played an Attack this turn.' } },
  k_first: { name: 'First In', owner: 'kaito', type: 'skill', cost: 1, attr: 'passion', shield: 5, buffAtk: 3,
             tags: ['Retain', 'Lead'], text: 'Gain 5 Shield and +3 Attack this turn. Retain. Lead.',
             up: { shield: 8, buffAtk: 4, text: 'Gain 8 Shield and +4 Attack this turn. Retain. Lead.' } },
  k_last:  { name: 'Last Shift', owner: 'kaito', type: 'attack', cost: 2, attr: 'passion', dmg: 18, selfStress: 14,
             finale: 8, tags: ['Finale'], text: 'Deal 18 damage. Finale: +8 if this spends your last AP. Gain 14 Stress.',
             up: { dmg: 24, finale: 10, selfStress: 10, text: 'Deal 24 damage. Finale: +10 if this spends your last AP. Gain 10 Stress.' } },
  k_up:    { name: 'Overclock', owner: 'kaito', type: 'upgrade', cost: 1, attr: 'passion', tags: ['Initiation', 'Unique'], maxAp: 1,
             text: 'Permanent: +1 AP each turn for this fight.',
             up: { maxAp: 1, draw: 1, tags: ['Initiation', 'Unique'], text: 'Permanent: +1 AP and +1 card each turn.' } },

  // --- Momo / Vanguard / Order ---------------------------------------------
  m_strike:{ name: 'Order Strike', owner: 'momo', type: 'attack', cost: 1, attr: 'order', dmg: 7, text: 'Deal 7 damage.',
             up: { dmg: 10, text: 'Deal 10 damage.' } },
  m_guard: { name: 'Guard Stance', owner: 'momo', type: 'skill', cost: 1, attr: 'order', shield: 9, text: 'Gain 9 Shield.',
             up: { shield: 13, text: 'Gain 13 Shield.' } },
  m_patch: { name: 'Patch Up', owner: 'momo', type: 'skill', cost: 1, attr: 'order', teamShield: 4,
             tags: ['Celestial'], text: 'All allies gain 4 Shield. Celestial: auto-fires when you play a 2+ AP card.',
             up: { teamShield: 7, tags: ['Celestial'], text: 'All allies gain 7 Shield. Celestial: auto-fires when you play a 2+ AP card.' } },
  m_stand: { name: 'Stand Firm', owner: 'momo', type: 'skill', cost: 1, attr: 'order', shield: 10, taunt: 1, fortitude: 1,
             tags: ['Fortitude'], text: 'Gain 10 Shield. Taunt and -20% damage taken this turn.',
             up: { shield: 14, fortitude: 2, text: 'Gain 14 Shield. Taunt and -20% damage taken for 2 turns.' } },
  m_triage:{ name: 'Triage', owner: 'momo', type: 'skill', cost: 1, attr: 'order', heal: 8, stressHeal: 10,
             text: 'Heal 8 HP and clear 10 Stress.',
             up: { heal: 11, stressHeal: 18, text: 'Heal 11 HP and clear 18 Stress.' } },
  m_up:    { name: 'Field Protocol', owner: 'momo', type: 'upgrade', cost: 1, attr: 'order', tags: ['Initiation', 'Unique'], turnShield: 4,
             text: 'Permanent: all allies gain 4 Shield each turn.',
             up: { turnShield: 7, tags: ['Initiation', 'Unique'], text: 'Permanent: all allies gain 7 Shield each turn.' } },

  // --- Goro / Controller / Justice -----------------------------------------
  g_strike:{ name: 'Scalpel', owner: 'goro', type: 'attack', cost: 1, attr: 'justice', dmg: 7, text: 'Deal 7 damage.',
             up: { dmg: 10, text: 'Deal 10 damage.' } },
  g_guard: { name: 'Clot', owner: 'goro', type: 'skill', cost: 1, attr: 'justice', shield: 8, text: 'Gain 8 Shield.',
             up: { shield: 12, text: 'Gain 12 Shield.' } },
  g_cleave:{ name: 'Cleave', owner: 'goro', type: 'attack', cost: 2, attr: 'justice', dmg: 10, aoe: true,
             text: 'Deal 10 damage to all enemies.',
             up: { dmg: 14, text: 'Deal 14 damage to all enemies.' } },
  g_devour:{ name: 'Devour', owner: 'goro', type: 'skill', cost: 2, attr: 'justice', teamHeal: 6, teamStressHeal: 12,
             text: 'All allies heal 6 HP, clear 12 Stress.',
             up: { teamHeal: 9, teamStressHeal: 18, text: 'All allies heal 9 HP, clear 18 Stress.' } },
  g_hymn:  { name: 'Lullaby', owner: 'goro', type: 'skill', cost: 1, attr: 'justice', weakenAll: 2, retrieve: 1,
             tags: ['Retrieve'], text: 'All enemies deal 35% less damage for 2 turns. Retrieve: return a card from the Graveyard.',
             up: { weakenAll: 3, retrieve: 1, text: 'All enemies deal 50% less damage for 3 turns. Retrieve: return a card from the Graveyard.' } },
  g_up:    { name: 'The Wall', owner: 'goro', type: 'upgrade', cost: 1, attr: 'justice', tags: ['Initiation', 'Unique'], blockBonus: 2,
             text: 'Permanent: all Shields gain +2.',
             up: { blockBonus: 4, tags: ['Initiation', 'Unique'], text: 'Permanent: all Shields gain +4.' } },

  // --- Bibi / Psionic / Void ----------------------------------------------
  b_ping:  { name: 'Signal Ping', owner: 'bibi', type: 'attack', cost: 1, attr: 'void', dmg: 6, text: 'Deal 6 damage.',
             up: { dmg: 9, text: 'Deal 9 damage.' } },
  b_fuzz:  { name: 'Fuzz', owner: 'bibi', type: 'skill', cost: 1, attr: 'void', shield: 8, text: 'Gain 8 Shield.',
             up: { shield: 12, text: 'Gain 12 Shield.' } },
  b_flare: { name: 'Flare', owner: 'bibi', type: 'attack', cost: 2, attr: 'void', dmg: 7, aoe: true, mark: 2,
             tags: ['Mark'], text: 'Deal 7 to all enemies. Mark them for 2 turns (+50% damage taken).',
             up: { dmg: 10, mark: 3, text: 'Deal 10 to all enemies. Mark them for 3 turns (+50% damage taken).' } },
  b_hist:  { name: 'Histamine', owner: 'bibi', type: 'skill', cost: 1, attr: 'void', teamBuffAtk: 4,
             text: 'All allies gain +4 Attack this turn.',
             up: { teamBuffAtk: 6, text: 'All allies gain +6 Attack this turn.' } },
  b_over:  { name: 'Overdrive', owner: 'bibi', type: 'skill', cost: 0, attr: 'void', tags: ['Exhaust', 'Haste'], apGain: 1,
             text: 'Gain 1 AP. Does not advance enemy counters. Exhaust.',
             up: { apGain: 2, tags: ['Exhaust', 'Haste'], text: 'Gain 2 AP. Does not advance enemy counters. Exhaust.' } },
  b_up:    { name: 'Cross-talk', owner: 'bibi', type: 'upgrade', cost: 1, attr: 'void', tags: ['Initiation', 'Unique'], extraDraw: 1,
             text: 'Permanent: draw +1 card each turn.',
             up: { extraDraw: 1, firstAp: 1, tags: ['Initiation', 'Unique'], text: 'Permanent: draw +1 card each turn, +1 AP on turn one.' } },

  // --- Status / Curse ------------------------------------------------------
  breakdown_kaito: { name: 'Breakdown: Kaito', owner: 'kaito', type: 'status', cost: 0, breakdown: true, text: 'Play to pull Kaito back.' },
  breakdown_momo:  { name: 'Breakdown: Momo', owner: 'momo', type: 'status', cost: 0, breakdown: true, text: 'Play to pull Momo back.' },
  breakdown_goro:  { name: 'Breakdown: Goro', owner: 'goro', type: 'status', cost: 0, breakdown: true, text: 'Play to pull Goro back.' },
  breakdown_bibi:  { name: 'Breakdown: Bibi', owner: 'bibi', type: 'status', cost: 0, breakdown: true, text: 'Play to pull Bibi back.' },
  curse_doubt:     { name: 'Doubt', owner: 'enemy', type: 'curse', cost: 0, text: 'Unplayable. Clogs your hand.', unplayable: true },
  curse_fever:     { name: 'Fever', owner: 'enemy', type: 'curse', cost: 0, text: 'Unplayable. Adds 6 Stress when drawn.', unplayable: true, onDrawStress: 6 },
};

export const CHARACTERS = {
  kaito: {
    id: 'kaito', name: 'Kaito', full: 'Kaito — Neutrophil', cls: 'striker', attr: 'passion',
    art: 'images/cut-kaito-cut.png', skin: '#ff4d6d',
    hp: 88, blurb: 'First responder. Hits hardest and breaks the fastest.',
    leader: { name: 'Vanguard Point', desc: 'Leader: Kaito gains +2 Attack on Turn 1.' },
    deck: ['k_jab', 'k_jab', 'k_brace', 'k_rush', 'k_first', 'k_last', 'k_up'],
  },
  momo: {
    id: 'momo', name: 'Momo', full: 'Momo — Platelet', cls: 'vanguard', attr: 'order',
    art: 'images/cut-momo-cut.png', skin: '#4da3ff',
    hp: 104, blurb: 'Scaffold and shield. Nothing gets past her.',
    leader: { name: 'Iron Line', desc: 'Leader: All allies start battles with +4 Shield.' },
    deck: ['m_strike', 'm_strike', 'm_guard', 'm_patch', 'm_stand', 'm_triage', 'm_up'],
  },
  goro: {
    id: 'goro', name: 'Goro', full: 'Goro — Macrophage', cls: 'controller', attr: 'justice',
    art: 'images/cut-goro-cut.png', skin: '#ffc94d',
    hp: 110, blurb: 'Eats the dead, calms the living. Holds the team together.',
    leader: { name: 'Steady Pulse', desc: 'Leader: All allies enter battle with +6 Max HP.' },
    deck: ['g_strike', 'g_strike', 'g_guard', 'g_cleave', 'g_devour', 'g_hymn', 'g_up'],
  },
  bibi: {
    id: 'bibi', name: 'Bibi', full: 'Bibi — Mast Cell', cls: 'psionic', attr: 'void',
    art: 'images/cut-bibi-cut.png', skin: '#b06bff',
    hp: 84, blurb: 'Signals the whole immune system at once.',
    leader: { name: 'Cytokine Surge', desc: 'Leader: Start every battle with +1 EP.' },
    deck: ['b_ping', 'b_ping', 'b_fuzz', 'b_flare', 'b_hist', 'b_over', 'b_up'],
  },
};

// Two Egos per character → a six-card Ego side deck.
export const EGOS = {
  kaito: [
    { id: 'ego_kaito_1', owner: 'kaito', name: 'Last Stand', cost: 4, attr: 'passion', dmg: 30, text: 'Deal 30 damage.' },
    { id: 'ego_kaito_2', owner: 'kaito', name: 'Blood Rush', cost: 4, attr: 'passion', dmg: 14, aoe: true, text: 'Deal 14 to all enemies.' },
  ],
  momo: [
    { id: 'ego_momo_1', owner: 'momo', name: 'Bulwark', cost: 4, attr: 'order', teamShield: 20, teamStressHeal: 25, text: 'All allies gain 20 Shield, clear 25 Stress.' },
    { id: 'ego_momo_2', owner: 'momo', name: 'Barricade', cost: 4, attr: 'order', teamShield: 14, taunt: 1, text: 'All allies gain 14 Shield. Momo taunts.' },
  ],
  goro: [
    { id: 'ego_goro_1', owner: 'goro', name: 'Metabolic Feast', cost: 4, attr: 'justice', teamHeal: 14, teamStressHeal: 10, text: 'All allies heal 14 and clear 10 Stress.' },
    { id: 'ego_goro_2', owner: 'goro', name: 'Digest', cost: 4, attr: 'justice', dmg: 18, heal: 8, text: 'Deal 18 damage and heal Goro 8.' },
  ],
  bibi: [
    { id: 'ego_bibi_1', owner: 'bibi', name: 'Cytokine Storm', cost: 4, attr: 'void', dmg: 11, aoe: true, weakenAll: 2, text: 'Deal 11 to all enemies. They deal 35% less for 2 turns.' },
    { id: 'ego_bibi_2', owner: 'bibi', name: 'Signal Override', cost: 4, attr: 'void', teamBuffAtk: 5, draw: 2, text: 'All allies +5 Attack this turn. Draw 2.' },
  ],
};

// ---------------------------------------------------------------------------
// Relics — run-long rule breakers
// ---------------------------------------------------------------------------
export const RELICS = {
  adrenal:  { id: 'adrenal', name: 'Adrenal Gland', glyph: '⚡', text: '+1 AP on your first turn.' },
  synapse:  { id: 'synapse', name: 'Synaptic Web', glyph: '⌘', text: 'Draw +1 card each turn.' },
  scabbard: { id: 'scabbard', name: 'Whetstone', glyph: '⟡', text: 'Your first card each turn costs 0 AP.' },
  plate:    { id: 'plate', name: 'Chitin Plate', glyph: '◈', text: 'Start every battle with 8 Shield.' },
  lens:     { id: 'lens', name: 'Antigen Lens', glyph: '⊕', text: 'Weakness damage ×1.5 → ×1.7.' },
  vagus:    { id: 'vagus', name: 'Vagus Nerve', glyph: '☾', text: 'Stress gained -25%.' },
  marrow:   { id: 'marrow', name: 'Bone Marrow', glyph: '✚', text: 'Heal 8 HP after each battle.' },
  suture:   { id: 'suture', name: 'Suture Kit', glyph: '✚', text: 'Breaking Tenacity also heals the team 8.' },
  metronome:{ id: 'metronome', name: 'Metronome', glyph: '⧗', text: '+1 Sands of Time charge each run.' },
  coffer:   { id: 'coffer', name: 'Coffer', glyph: '⛁', text: '+30% currency from every source.' },
};

// ---------------------------------------------------------------------------
// Enemies
// ---------------------------------------------------------------------------
export const ENEMIES = {
  strep:   { id: 'strep', name: 'Strepto Swarm', hp: 58, tenacity: 40, counter: 3, weakness: 'passion',
             intents: [{ type: 'attack', value: 11 }, { type: 'attack', value: 11 }, { type: 'debuff', value: 14 }] },
  toxin:   { id: 'toxin', name: 'Endotoxin', hp: 50, tenacity: 30, counter: 2, weakness: 'order',
             intents: [{ type: 'attack', value: 9 }, { type: 'debuff', value: 18 }] },
  biofilm: { id: 'biofilm', name: 'Biofilm Mass', hp: 92, tenacity: 78, counter: 4, weakness: 'justice',
             intents: [{ type: 'attack', value: 14 }, { type: 'defend', value: 14 }] },
  strain:  { id: 'strain', name: 'Mutant Strain', hp: 74, tenacity: 58, counter: 3, weakness: 'void',
             intents: [{ type: 'attack', value: 12 }, { type: 'buff', value: 4 }] },
  prion:   { id: 'prion', name: 'Prion Knot', hp: 86, tenacity: 64, counter: 2, weakness: 'instinct',
             intents: [{ type: 'attack', value: 17 }, { type: 'attack', value: 17 }] },
  spore:   { id: 'spore', name: 'Spore Node', hp: 30, tenacity: 18, counter: 2, weakness: 'passion',
             intents: [{ type: 'attack', value: 7 }] },

  elite_hive:  { id: 'elite_hive', name: 'Strepto Hive', hp: 110, tenacity: 70, counter: 3, weakness: 'passion', elite: true,
                 mods: ['regen'], intents: [{ type: 'attack', value: 13 }, { type: 'attack', value: 13 }, { type: 'debuff', value: 16, curse: 'curse_fever' }] },
  elite_wall:  { id: 'elite_wall', name: 'Biofilm Cathedral', hp: 150, tenacity: 110, counter: 4, weakness: 'justice', elite: true,
                 mods: ['immuneRavage'], intents: [{ type: 'attack', value: 16 }, { type: 'defend', value: 18 }] },
  elite_prime: { id: 'elite_prime', name: 'Strain Prime', hp: 120, tenacity: 80, counter: 3, weakness: 'void', elite: true,
                 mods: ['quick'], intents: [{ type: 'attack', value: 15 }, { type: 'charge', value: 34, turns: 2 }] },

  boss_bloom: { id: 'boss_bloom', name: 'Chaos Bloom', hp: 230, tenacity: 130, counter: 4, weakness: 'justice', boss: true,
                phases: [{ at: 0.55, weakness: 'void', name: 'Chaos Bloom — Unbound' }],
                intents: [{ type: 'attack', value: 16 }, { type: 'charge', value: 38, turns: 2 }, { type: 'debuff', value: 20, curse: 'curse_fever' }] },
  boss_prion: { id: 'boss_prion', name: 'Prion Sovereign', hp: 270, tenacity: 150, counter: 3, weakness: 'instinct', boss: true,
                phases: [{ at: 0.6, weakness: 'order', name: 'Prion Sovereign — Folded' }],
                mods: ['regen'],
                intents: [{ type: 'attack', value: 18 }, { type: 'attack', value: 18 }, { type: 'charge', value: 44, turns: 2 }] },
};

// ---------------------------------------------------------------------------
// Encounters used by map floors
// ---------------------------------------------------------------------------
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
  { code: 'm01', name: 'Cutline', place: 'Left Forearm — Epidermis', threat: 'Low', rec: 'passion', reward: 40, enemies: ['strep'],
    story: ['The scrape happened four hours ago. Nobody told the skin.', 'A breach in the left forearm. Strepto is already inside the cut, and the alarm has not been rung.', 'Kaito reaches it first. He always does.'] },
  { code: 'm02', name: 'Drain Line', place: 'Lymph Node 04', threat: 'Low', rec: 'order', reward: 50, enemies: ['toxin', 'spore'],
    story: ['Lymph Node 04 runs hot and swollen.', 'Endotoxin moved in through the drain and brought its own spores.', 'Momo holds the corridor. Nobody else fits.'] },
  { code: 'm03', name: 'The Thicket', place: 'Deep Tissue — Biofilm Bloom', threat: 'Medium', rec: 'justice', reward: 65, enemies: ['biofilm', 'strep'],
    story: ['A biofilm has grown over the wound bed like a city nobody planned.', 'Antibodies bounce off it. Goro has to eat through.', 'This is the first time the team fights something that fights back with a plan.'] },
  { code: 'm04', name: 'Signal Rot', place: 'Spinal Relay — Night', threat: 'High', rec: 'void', reward: 80, enemies: ['strain', 'toxin'],
    story: ['The signal rot reaches the relay at 03:12.', 'The relay starts telling the body the wrong things — heat, fear, pain, all at once.', 'Bibi can out-shout it. That is not the same as curing it.'] },
  { code: 'm05', name: 'Prion Gate', place: 'The Blood-Brain Barrier', threat: 'Severe', rec: 'instinct', reward: 100, enemies: ['prion', 'strain', 'biofilm'],
    story: ['The barrier is one cell thick and the prion knot is already folding through it.', 'Everything they have learned about each other gets spent here.', 'Hold the gate. Nothing gets through.'] },
];

// ---------------------------------------------------------------------------
// Run events
// ---------------------------------------------------------------------------
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
