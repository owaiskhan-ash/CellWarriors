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
