// Cell Warriors — card data. Numbers are deliberately small (max dmg 10) so a
// player can calculate a line in their head. RNG lives in the deck, never in damage.

export const START = {
  infection: 60, // 0 = body cleared (win) · 100 = host lost (lose)
  atp: 3,
  fever: 8, // inflammation threshold that triggers fever
  slots: 3, // tissue slots per side
  handSize: 5,
  maxAtp: 6,
  coreHp: 45, // the infection site: destroy it to win
};

export const CARDS = {
  neutrophil: {
    id: 'neutrophil', type: 'cell', name: 'Neutrophil', cost: 2, rarity: 'common', atk: 3, hp: 3,
    inflamOnAttack: 1,
    text: 'Brute. +1 Inflammation every time it attacks.',
  },
  macrophage: {
    id: 'macrophage', type: 'cell', name: 'Macrophage', cost: 3, rarity: 'rare', atk: 2, hp: 7, regen: 1,
    text: 'Devours remains. Heals 1 HP each turn.',
  },
  mast: {
    id: 'mast', type: 'cell', name: 'Mast Cell', cost: 2, rarity: 'rare', atk: 0, hp: 4, aura: 1,
    inflamOnPlay: 2,
    text: 'Aura: your other cells get +1 dmg. +2 Inflammation on play.',
  },
  killerT: {
    id: 'killerT', type: 'cell', name: 'Killer T', cost: 4, rarity: 'epic', atk: 5, hp: 4, pierce: true,
    inflamOnAttack: 1,
    text: 'Pierces armour. +1 Inflammation on attack.',
  },
  bcell: {
    id: 'bcell', type: 'cell', name: 'B Cell', cost: 3, rarity: 'rare', atk: 1, hp: 5, antibody: 1,
    text: 'Makes 1 Antibody per turn (max 3). Each adds +1 dmg to all your attacks.',
  },
  platelet: {
    id: 'platelet', type: 'cell', name: 'Platelet', cost: 1, rarity: 'common', atk: 1, hp: 3, guard: true,
    text: 'Guard. Pathogens hit it first.',
  },
  dendritic: {
    id: 'dendritic', type: 'cell', name: 'Dendritic', cost: 3, rarity: 'epic', atk: 1, hp: 4,
    onPlay: 'dendritic',
    text: 'On play: -4% Infection and draw a card.',
  },

  histamine: {
    id: 'histamine', type: 'cytokine', name: 'Histamine', cost: 1, rarity: 'common', inflam: 2,
    text: '+2 dmg to all your cells this turn. +2 Inflammation.',
  },
  antipyretic: {
    id: 'antipyretic', type: 'cytokine', name: 'Antipyretic', cost: 1, rarity: 'common', inflam: -3,
    text: '-3 Inflammation. Buys you a turn.',
  },
  interferon: {
    id: 'interferon', type: 'cytokine', name: 'Interferon', cost: 2, rarity: 'rare',
    text: 'All pathogens -2 ATK for 2 turns.',
  },
  il6: {
    id: 'il6', type: 'cytokine', name: 'IL-6', cost: 1, rarity: 'epic', inflam: 1,
    text: 'Draw 2 cards. +1 Inflammation.',
  },
  opsonin: {
    id: 'opsonin', type: 'cytokine', name: 'Opsonin', cost: 2, rarity: 'rare',
    text: 'Your next cell attack deals double damage.',
  },
};

export const ENEMIES = {
  strep: {
    id: 'strep', name: 'Strep', atk: 2, hp: 5, spread: 4, clear: 6,
    text: 'Spreads fast.',
  },
  toxin: {
    id: 'toxin', name: 'Toxin Blob', atk: 0, hp: 4, spread: 7, clear: 5,
    text: 'No attack, brutal spread.',
  },
  biofilm: {
    id: 'biofilm', name: 'Biofilm', atk: 1, hp: 11, spread: 3, clear: 12, armor: 2,
    text: 'Armoured. Armour 2.',
  },
};

// Starting deck (19 cards).
export const DECK_LIST = [
  'neutrophil', 'neutrophil', 'neutrophil',
  'macrophage', 'macrophage',
  'mast',
  'killerT', 'killerT',
  'bcell',
  'platelet', 'platelet',
  'dendritic',
  'histamine', 'histamine',
  'antipyretic', 'antipyretic',
  'interferon',
  'il6',
  'opsonin',
];

// Scripted pathogen waves. After turn 12, a Strep arrives every 3rd turn.
export const SPAWNS = {
  2: 'strep',
  3: 'toxin',
  4: 'strep',
  6: 'biofilm',
  8: 'strep',
  9: 'toxin',
  11: 'biofilm',
  12: 'strep',
};

// ---------------------------------------------------------------------------
// EXPANSION SET — locked at start, bought with stem cells in the Stem Cell Lab.
// These add the mechanics the starting deck doesn't teach: core-bypass, AoE,
// permanent buffs, armour hate.
// ---------------------------------------------------------------------------

Object.assign(CARDS, {
  nkCell: {
    id: 'nkCell', type: 'cell', name: 'NK Cell', cost: 3, rarity: 'epic',
    atk: 2, hp: 3, bypassCore: true,
    text: 'Strikes the infection site directly, ignoring pathogens on the field.',
  },
  eosinophil: {
    id: 'eosinophil', type: 'cell', name: 'Eosinophil', cost: 3, rarity: 'rare',
    atk: 2, hp: 4, armourBonus: 2,
    text: '+2 dmg against armoured pathogens.',
  },
  memoryB: {
    id: 'memoryB', type: 'cell', name: 'Memory B', cost: 5, rarity: 'legendary',
    atk: 4, hp: 8, onPlay: 'memoryB',
    text: 'On play: Infection -8%. Remembers this body.',
  },
  complement: {
    id: 'complement', type: 'cytokine', name: 'Complement', cost: 2, rarity: 'rare', inflam: 1,
    text: 'Deal 2 dmg to every pathogen on the field. +1 Inflammation.',
  },
  il2: {
    id: 'il2', type: 'cytokine', name: 'IL-2', cost: 2, rarity: 'rare',
    text: 'All your cells permanently gain +1 ATK and heal 1 HP.',
  },
  adrenaline: {
    id: 'adrenaline', type: 'cytokine', name: 'Adrenaline', cost: 1, rarity: 'common',
    text: '+2 ATP this turn. The host is panicking.',
  },
});

export const UNLOCKABLE = {
  eosinophil: { cost: 60, faction: 'Myeloid' },
  complement: { cost: 80, faction: 'Humoral' },
  adrenaline: { cost: 60, faction: 'Endocrine' },
  il2: { cost: 90, faction: 'Lymphoid' },
  nkCell: { cost: 120, faction: 'Lymphoid' },
  memoryB: { cost: 200, faction: 'Humoral' },
};

// ---------------------------------------------------------------------------
// ADVENTURE — six regions, unlocked in order. Each one is one fight with its
// own clock, spawn rate and wave. Rewards are stem cells.
// ---------------------------------------------------------------------------

export const REGIONS = [
  {
    id: 'throat', name: 'Throat', organ: 'Tonsils', threat: 1,
    desc: 'It always starts here. A scratch, a swallow that hurts.',
    coreHp: 30, infection: 55, infectionGain: 2, spawnEvery: 2,
    wave: ['strep', 'toxin'], reward: 40,
  },
  {
    id: 'lungs', name: 'Lungs', organ: 'Alveoli', threat: 2,
    desc: 'Every breath brings more of it in.',
    coreHp: 38, infection: 58, infectionGain: 3, spawnEvery: 2,
    wave: ['toxin', 'strep'], reward: 55,
  },
  {
    id: 'gut', name: 'Gut', organ: 'Intestinal wall', threat: 3,
    desc: 'Forty trillion residents, and something is building a wall.',
    coreHp: 44, infection: 60, infectionGain: 3, spawnEvery: 2,
    wave: ['biofilm', 'toxin'], reward: 70,
  },
  {
    id: 'wound', name: 'Skin Wound', organ: 'Cut site', threat: 4,
    desc: 'An open door. They are already inside.',
    coreHp: 40, infection: 64, infectionGain: 4, spawnEvery: 1,
    wave: ['strep', 'strep', 'strep'], reward: 85,
  },
  {
    id: 'blood', name: 'Bloodstream', organ: 'Whole system', threat: 5,
    desc: 'If it reaches the blood, it reaches everywhere.',
    coreHp: 46, infection: 64, infectionGain: 3, spawnEvery: 1,
    wave: ['strep', 'toxin', 'biofilm'], reward: 105,
  },
  {
    id: 'meninges', name: 'Meninges', organ: 'Blood-brain barrier', threat: 6,
    desc: 'The last wall. Behind it, everything he is.',
    coreHp: 56, infection: 66, infectionGain: 3, spawnEvery: 1,
    wave: ['biofilm', 'toxin', 'strep'], reward: 150,
  },
];

// ---------------------------------------------------------------------------
// ART — every card portrait maps to a locked character file (docs/character-bible.md).
// Cytokines get a sigil instead of a portrait: spells are not people.
// ---------------------------------------------------------------------------

export const ART = {
  neutrophil: './images/char-neutrophil-celshade.png',
  killerT: './images/char-killert.png',
  platelet: './images/char-platelet.png',
  macrophage: './images/char-macrophage.png',
  mast: './images/char-mast.png',
  bcell: './images/char-bcell.png',
  dendritic: './images/char-dendritic.png',
  nkCell: './images/char-nkcell.png',
  eosinophil: './images/char-eosinophil.png',
  memoryB: './images/char-memoryb.png',
};

export const ENEMY_ART = {
  strep: './images/pathogen-strep.png',
  toxin: './images/pathogen-toxin.png',
  biofilm: './images/pathogen-biofilm.png',
};

export const SIGIL = {
  histamine: '✹',
  antipyretic: '❄',
  interferon: '✦',
  il6: '✸',
  opsonin: '✜',
  complement: '✷',
  il2: '✧',
  adrenaline: '⚡',
};
