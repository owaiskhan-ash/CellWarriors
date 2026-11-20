// Cell Warriors — roster, card sets, enemies, missions.
// Four characters, one per role. Every character owns their own cards.

export const ROLES = {
  dps: { label: 'DPS', cls: 'dps' },
  shield: { label: 'SHIELD', cls: 'shield' },
  healer: { label: 'HEALER', cls: 'healer' },
  support: { label: 'SUPPORT', cls: 'support' },
};

export const ELEMENTS = {
  blood: { label: 'BLOOD', glyph: '✹', colour: '#c2183a' },
  tide: { label: 'TIDE', glyph: '❋', colour: '#35d0c0' },
  ember: { label: 'EMBER', glyph: '✦', colour: '#f0a63c' },
  void: { label: 'VOID', glyph: '◆', colour: '#b79bd8' },
};

export const CHARACTERS = {
  kaito: {
    name: 'Kaito', cell: 'Neutrophil', role: 'dps', element: 'blood',
    level: 30, hp: 30, atk: 3,
    art: './images/cut-kaito-cut.png',
    bio: 'Arrives first. Dies first. Does it anyway.',
    cards: ['k_blade', 'k_last', 'k_first'],
  },
  momo: {
    name: 'Momo', cell: 'Platelet', role: 'shield', element: 'tide',
    level: 28, hp: 34, atk: 1,
    art: './images/cut-momo-cut.png',
    bio: 'Scared of everything. Still stands in front of it.',
    cards: ['m_patch', 'm_stand', 'm_aid'],
  },
  goro: {
    name: 'Goro', cell: 'Macrophage', role: 'healer', element: 'ember',
    level: 32, hp: 40, atk: 2,
    art: './images/cut-goro-cut.png',
    bio: 'Speaks in three words. Holds the wall in one.',
    cards: ['g_cleave', 'g_devour', 'g_wall'],
  },
  bibi: {
    name: 'Bibi', cell: 'Mast Cell', role: 'support', element: 'void',
    level: 26, hp: 24, atk: 1,
    art: './images/cut-bibi-cut.png',
    bio: 'Starts the fire. Then charges into it.',
    cards: ['b_hist', 'b_flare', 'b_over'],
  },
};

export const CARDS = {
  // Kaito — DPS
  k_blade: { id: 'k_blade', owner: 'kaito', name: 'Blade Rush', type: 'Attack', cost: 1, target: 'enemy', dmg: 6, art: './images/card-k1.png' },
  k_last: { id: 'k_last', owner: 'kaito', name: 'Last Shift', type: 'Attack', cost: 3, target: 'enemy', dmg: 12, selfDamage: 3, art: './images/card-k2.png' },
  k_first: { id: 'k_first', owner: 'kaito', name: 'First In', type: 'Skill', cost: 1, target: 'enemy', dmg: 4, selfShield: 4, art: './images/card-k3.png' },

  // Momo — SHIELD
  m_patch: { id: 'm_patch', owner: 'momo', name: 'Patch Up', type: 'Skill', cost: 1, target: 'allAllies', shield: 6, art: './images/card-m1.png' },
  m_stand: { id: 'm_stand', owner: 'momo', name: 'Stand Firm', type: 'Skill', cost: 2, target: 'self', shield: 12, taunt: 2, art: './images/card-m2.png' },
  m_aid: { id: 'm_aid', owner: 'momo', name: 'First Aid', type: 'Skill', cost: 1, target: 'lowestAlly', heal: 8, art: './images/card-m3.png' },

  // Goro — HEALER (card art pending — using cutout)
  g_cleave: { id: 'g_cleave', owner: 'goro', name: 'Cleave', type: 'Attack', cost: 2, target: 'enemy', dmg: 8, art: './images/cut-goro-cut.png', artPending: true },
  g_devour: { id: 'g_devour', owner: 'goro', name: 'Devour', type: 'Skill', cost: 3, target: 'allAllies', heal: 7, art: './images/cut-goro-cut.png', artPending: true },
  g_wall: { id: 'g_wall', owner: 'goro', name: 'The Wall', type: 'Skill', cost: 2, target: 'self', shield: 14, taunt: 2, art: './images/cut-goro-cut.png', artPending: true },

  // Bibi — SUPPORT DPS (card art pending — using cutout)
  b_hist: { id: 'b_hist', owner: 'bibi', name: 'Histamine', type: 'Skill', cost: 1, target: 'allAllies', tempAtk: 2, art: './images/cut-bibi-cut.png', artPending: true },
  b_flare: { id: 'b_flare', owner: 'bibi', name: 'Flare', type: 'Attack', cost: 2, target: 'allEnemies', dmg: 4, art: './images/cut-bibi-cut.png', artPending: true },
  b_over: { id: 'b_over', owner: 'bibi', name: 'Overdrive', type: 'Skill', cost: 2, target: 'none', energy: 3, art: './images/cut-bibi-cut.png', artPending: true },
};

export const ENEMIES = {
  strep: { id: 'strep', name: 'Strep', hp: 26, atk: 5, art: './images/pathogen-strep.png' },
  toxin: { id: 'toxin', name: 'Toxin', hp: 22, atk: 4, art: './images/pathogen-toxin.png' },
  biofilm: { id: 'biofilm', name: 'Biofilm', hp: 38, atk: 7, art: './images/pathogen-biofilm.png' },
  strain: { id: 'strain', name: 'Strain', hp: 30, atk: 6, art: './images/pathogen-strep.png' },
};

export const MISSIONS = [
  {
    id: 'm01', code: 'M-01', name: 'Tonsil Breach', place: 'Throat', threat: 1,
    enemies: ['strep'],
    story: [
      { who: '', text: 'Day one. It starts as a scratch.' },
      { who: 'Kaito', art: 'kaito', text: 'Something got in. No backup, no time.' },
      { who: 'Kaito', art: 'kaito', text: 'Someone has to go first.' },
    ],
  },
  {
    id: 'm02', code: 'M-02', name: 'Alveolar Flood', place: 'Lungs', threat: 2,
    enemies: ['strep', 'toxin'],
    story: [
      { who: 'Momo', art: 'momo', text: 'I-I\'m here! Where do you need me?!' },
      { who: 'Kaito', art: 'kaito', text: 'Behind me. Patch what I miss.' },
    ],
  },
  {
    id: 'm03', code: 'M-03', name: 'Gut Wall', place: 'Intestine', threat: 3,
    enemies: ['biofilm', 'toxin'],
    story: [
      { who: 'Goro', art: 'goro', text: '...Leave it to me.' },
      { who: 'Kaito', art: 'kaito', text: 'That\'s the only reason we\'re alive.' },
    ],
  },
  {
    id: 'm04', code: 'M-04', name: 'Bloodstream Break', place: 'Whole system', threat: 4,
    enemies: ['strain', 'toxin', 'strep'],
    story: [
      { who: 'Bibi', art: 'bibi', text: 'Let\'s make it LOUD.' },
      { who: 'Kaito', art: 'kaito', text: 'That\'s what I was afraid of.' },
    ],
  },
  {
    id: 'm05', code: 'M-05', name: 'Meninges', place: 'Blood-brain barrier', threat: 5,
    enemies: ['biofilm', 'strain', 'biofilm'],
    story: [
      { who: 'Goro', art: 'goro', text: 'The last wall. Behind it, everything he is.' },
      { who: 'Kaito', art: 'kaito', text: 'Then it doesn\'t get through.' },
    ],
  },
];
