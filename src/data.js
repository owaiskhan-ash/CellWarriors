// Cell Warriors — cast, card sets, enemies, chapters.
// Four roles: DPS · SHIELD · HEALER · SUPPORT DPS.
// Every character owns their own card set — if they fall, their cards are dead weight.

export const ROLES = {
  dps: { label: 'DPS', colour: 'crimson' },
  shield: { label: 'SHIELD', colour: 'teal' },
  healer: { label: 'HEALER', colour: 'amber' },
  support: { label: 'SUPPORT DPS', colour: 'violet' },
};

export const CHARACTERS = {
  kaito: {
    name: 'Kaito', cell: 'Neutrophil', role: 'dps', hp: 30, atk: 3,
    art: './images/char-neutrophil-celshade.png',
    cards: ['k_blade', 'k_lastshift', 'k_firstin'],
  },
  rin: {
    name: 'Rin', cell: 'Killer T', role: 'dps', hp: 26, atk: 4,
    art: './images/char-killert.png',
    cards: ['r_twin', 'r_exec', 'r_show'],
  },
  momo: {
    name: 'Momo', cell: 'Platelet', role: 'shield', hp: 34, atk: 1,
    art: './images/char-platelet.png',
    cards: ['p_patch', 'p_stand', 'p_firstaid'],
  },
  goro: {
    name: 'Goro', cell: 'Macrophage', role: 'healer', hp: 40, atk: 2,
    art: './images/char-macrophage.png',
    cards: ['g_cleave', 'g_devour', 'g_wall'],
  },
  bibi: {
    name: 'Bibi', cell: 'Mast Cell', role: 'support', hp: 24, atk: 1,
    art: './images/char-mast.png',
    cards: ['b_hist', 'b_flare', 'b_over'],
  },
  ivo: {
    name: 'Ivo', cell: 'B Cell', role: 'support', hp: 26, atk: 2,
    art: './images/char-bcell.png',
    cards: ['i_anti', 'i_bolt', 'i_stock'],
  },
  noor: {
    name: 'Noor', cell: 'Dendritic', role: 'support', hp: 24, atk: 0,
    art: './images/char-dendritic.png',
    cards: ['n_recon', 'n_expose', 'n_lantern'],
  },
};

export const CARDS = {
  // ── Kaito · Neutrophil · DPS ──────────────────────────────────────────
  k_blade: { id: 'k_blade', owner: 'kaito', name: 'Blade Rush', cost: 2, target: 'enemy', dmg: 7, text: '7 dmg to one pathogen.' },
  k_lastshift: { id: 'k_lastshift', owner: 'kaito', name: 'Last Shift', cost: 3, target: 'enemy', dmg: 12, selfDamage: 3, text: '12 dmg. Kaito loses 3 HP.' },
  k_firstin: { id: 'k_firstin', owner: 'kaito', name: 'First In', cost: 1, target: 'enemy', dmg: 4, selfShield: 3, text: '4 dmg. Gain 3 shield.' },

  // ── Rin · Killer T · DPS ──────────────────────────────────────────────
  r_twin: { id: 'r_twin', owner: 'rin', name: 'Twin Blades', cost: 2, target: 'enemy', dmg: 4, hits: 2, text: 'Two hits of 4.' },
  r_exec: { id: 'r_exec', owner: 'rin', name: 'Execution', cost: 4, target: 'enemy', dmg: 16, text: '16 dmg. Rin shows off.' },
  r_show: { id: 'r_show', owner: 'rin', name: 'Show Off', cost: 1, target: 'enemy', dmg: 2, tempAtk: 3, text: '2 dmg. +3 ATK this turn.' },

  // ── Momo · Platelet · SHIELD ──────────────────────────────────────────
  p_patch: { id: 'p_patch', owner: 'momo', name: 'Patch Up', cost: 1, target: 'allAllies', shield: 6, text: '6 shield to the whole squad.' },
  p_stand: { id: 'p_stand', owner: 'momo', name: 'Stand Firm', cost: 2, target: 'self', shield: 10, taunt: 2, text: '10 shield. Taunts for 2 turns.' },
  p_firstaid: { id: 'p_firstaid', owner: 'momo', name: 'First Aid', cost: 2, target: 'lowestAlly', heal: 8, text: 'Heal 8 on the weakest ally.' },

  // ── Goro · Macrophage · HEALER ────────────────────────────────────────
  g_cleave: { id: 'g_cleave', owner: 'goro', name: 'Cleave', cost: 2, target: 'enemy', dmg: 8, text: '8 dmg. No ceremony.' },
  g_devour: { id: 'g_devour', owner: 'goro', name: 'Devour', cost: 3, target: 'allAllies', heal: 7, text: 'Heal 7 to the whole squad.' },
  g_wall: { id: 'g_wall', owner: 'goro', name: 'The Wall', cost: 2, target: 'self', shield: 12, taunt: 2, text: '12 shield. Taunts for 2 turns.' },

  // ── Bibi · Mast Cell · SUPPORT DPS ────────────────────────────────────
  b_hist: { id: 'b_hist', owner: 'bibi', name: 'Histamine', cost: 1, target: 'allAllies', tempAtk: 2, text: '+2 ATK to the squad this turn.' },
  b_flare: { id: 'b_flare', owner: 'bibi', name: 'Flare', cost: 2, target: 'allEnemies', dmg: 4, text: '4 dmg to every pathogen.' },
  b_over: { id: 'b_over', owner: 'bibi', name: 'Overdrive', cost: 3, target: 'none', energy: 3, text: '+3 ATP right now.' },

  // ── Ivo · B Cell · SUPPORT DPS ────────────────────────────────────────
  i_anti: { id: 'i_anti', owner: 'ivo', name: 'Antibody', cost: 1, target: 'allAllies', atkBuff: 1, text: '+1 ATK to the squad. Permanent.' },
  i_bolt: { id: 'i_bolt', owner: 'ivo', name: 'Crossbow', cost: 2, target: 'enemy', dmg: 5, text: '5 dmg at range.' },
  i_stock: { id: 'i_stock', owner: 'ivo', name: 'Stockpile', cost: 2, target: 'none', draw: 2, text: 'Draw 2 cards.' },

  // ── Noor · Dendritic · SUPPORT DPS ────────────────────────────────────
  n_recon: { id: 'n_recon', owner: 'noor', name: 'Recon', cost: 1, target: 'none', draw: 2, energy: 1, text: 'Draw 2. +1 ATP.' },
  n_expose: { id: 'n_expose', owner: 'noor', name: 'Expose', cost: 2, target: 'enemy', weaken: 4, text: 'Target pathogen loses 4 ATK permanently.' },
  n_lantern: { id: 'n_lantern', owner: 'noor', name: 'Lantern', cost: 2, target: 'allAllies', heal: 4, shield: 2, text: 'Heal 4 and 2 shield to the squad.' },
};

export const ENEMIES = {
  strep: { id: 'strep', name: 'Strep', hp: 24, atk: 5, art: './images/pathogen-strep.png' },
  toxin: { id: 'toxin', name: 'Toxin Blob', hp: 20, atk: 4, art: './images/pathogen-toxin.png' },
  biofilm: { id: 'biofilm', name: 'Biofilm', hp: 34, atk: 7, art: './images/pathogen-biofilm.png' },
  strain: { id: 'strain', name: 'Mutant Strain', hp: 28, atk: 6, art: './images/pathogen-strep.png' },
};

// ── Chapters: story → battle. The squad is fixed by the story. ──────────
export const CHAPTERS = [
  {
    id: 'throat', title: 'I · The Throat', place: 'Tonsils',
    party: ['kaito'], enemies: ['strep'],
    story: [
      { who: '', text: 'Day one. It starts as a scratch.' },
      { who: 'Kaito', art: 'kaito', text: 'Tonsils are swollen. Something got in.' },
      { who: 'Kaito', art: 'kaito', text: 'No backup. No time. Someone has to go first.' },
    ],
  },
  {
    id: 'lungs', title: 'II · The Lungs', place: 'Alveoli',
    party: ['kaito', 'momo'], enemies: ['strep', 'strep', 'toxin'],
    story: [
      { who: 'Kaito', art: 'kaito', text: 'It reached the alveoli. Every breath feeds it.' },
      { who: 'Momo', art: 'momo', text: 'I-I\'m here! Where do you need me?!' },
      { who: 'Kaito', art: 'kaito', text: 'Behind me. Patch what I miss.' },
    ],
  },
  {
    id: 'gut', title: 'III · The Gut', place: 'Intestinal wall',
    party: ['kaito', 'momo', 'noor'], enemies: ['toxin', 'strain', 'strep'],
    story: [
      { who: 'Noor', art: 'noor', text: 'I have seen this strain before. Page forty.' },
      { who: 'Kaito', art: 'kaito', text: 'Did the page say how to kill it?' },
      { who: 'Noor', art: 'noor', text: 'No. But it said who died learning.' },
    ],
  },
  {
    id: 'wound', title: 'IV · The Wound', place: 'Cut site',
    party: ['kaito', 'momo', 'goro'], enemies: ['strep', 'strain', 'toxin'],
    story: [
      { who: 'Goro', art: 'goro', text: '...Leave it to me.' },
      { who: 'Momo', art: 'momo', text: 'He\'s not even breathing hard. That\'s terrifying.' },
      { who: 'Kaito', art: 'kaito', text: 'That\'s the only reason we\'re alive.' },
    ],
  },
  {
    id: 'blood', title: 'V · The Bloodstream', place: 'Whole system',
    party: ['kaito', 'momo', 'goro', 'bibi'], enemies: ['biofilm', 'strain', 'toxin'],
    story: [
      { who: 'Bibi', art: 'bibi', text: 'Let\'s make it LOUD.' },
      { who: 'Kaito', art: 'kaito', text: 'That\'s what I was afraid of.' },
      { who: 'Goro', art: 'goro', text: 'Stay behind the shield.' },
    ],
  },
  {
    id: 'meninges', title: 'VI · The Meninges', place: 'Blood-brain barrier',
    party: ['rin', 'goro', 'ivo'], enemies: ['biofilm', 'strain', 'toxin'],
    story: [
      { who: 'Rin', art: 'rin', text: 'Took you long enough to call me.' },
      { who: 'Ivo', art: 'ivo', text: 'I already made one for this.' },
      { who: 'Goro', art: 'goro', text: 'Then stop talking and hold the wall.' },
    ],
  },
];
