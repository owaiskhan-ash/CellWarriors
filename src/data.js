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

export const ROLES = { striker: 'Fury DPS', vanguard: 'Shield / Counter', controller: 'Catalyst / Heal', psionic: 'Amplify / Swarm', alchemist: 'Poison DoT', mnemonist: '%HP Scaling' };

// ---------------------------------------------------------------------------
// Cards: 10+ per character. Design rule (all combatants): exactly ONE Basic
// Attack per character (flagged `basic: true`, 1 copy in the starter deck);
// every other starter card is a Synergy / Effect card (skills & upgrades).
// Signature direct-attack finishers live in the build-around (draft) pool.
// ---------------------------------------------------------------------------
export const CARDS = {
  // === KAITO / Striker / Passion (Fury, Multi-Hit, Stress-to-Power, Crit) ===
  k_jab: {
    name: 'Cytokine Jab', owner: 'kaito', type: 'attack', cost: 1, attr: 'passion', basic: true,
    dmg: 8, fury: 1,
    text: 'Deal 8 damage. Gain +1 Fury.',
    up: { dmg: 11, fury: 2, text: 'Deal 11 damage. Gain +2 Fury.' },
  },
  k_brace: {
    name: 'Adrenal Brace', owner: 'kaito', type: 'skill', cost: 1, attr: 'passion',
    shield: 7, fury: 2, stressStr: { at: 30, str: 1 },
    text: 'Gain 7 Shield and +2 Fury. If Stress ≥ 30, gain +1 Strength.',
    up: { shield: 11, fury: 3, stressStr: { at: 25, str: 2 }, text: 'Gain 11 Shield and +3 Fury. If Stress ≥ 25, gain +2 Strength.' },
  },
  k_rush: {
    name: 'Blade Rush', owner: 'kaito', type: 'attack', cost: 1, attr: 'passion',
    dmg: 5, hits: 2, combo: 4, bleed: 2, tags: ['Combo'],
    text: 'Deal 5 twice and apply 2 Bleed. Combo (Attack): +4 dmg/hit.',
    up: { dmg: 6, combo: 6, bleed: 3, text: 'Deal 6 twice and apply 3 Bleed. Combo (Attack): +6 dmg/hit.' },
  },
  k_first: {
    name: 'First In', owner: 'kaito', type: 'skill', cost: 1, attr: 'passion',
    shield: 5, buffAtk: 3, retainGrowAtk: 2, tags: ['Retain', 'Lead'],
    text: 'Gain 5 Shield and +3 Attack this turn. Retain: +2 bonus Attack each turn held. Lead.',
    up: { shield: 8, buffAtk: 4, retainGrowAtk: 3, text: 'Gain 8 Shield and +4 Attack this turn. Retain: +3 bonus Attack each turn held. Lead.' },
  },
  k_last: {
    name: 'Last Shift', owner: 'kaito', type: 'attack', cost: 2, attr: 'passion',
    dmg: 18, selfStress: 12, consumeFury: 12, finale: 8, finaleCrit: true, tags: ['Finale'],
    text: 'Deal 18 damage (+12 per Fury consumed). Finale: Guaranteed Crit (×1.75). Gain 12 Stress.',
    up: { dmg: 24, consumeFury: 16, finale: 10, selfStress: 8, text: 'Deal 24 damage (+16 per Fury consumed). Finale: Guaranteed Crit. Gain 8 Stress.' },
  },
  k_up: {
    name: 'Overclock', owner: 'kaito', type: 'upgrade', cost: 1, attr: 'passion',
    maxAp: 1, onAtkFury: 1, tags: ['Initiation', 'Unique'],
    text: 'Permanent: +1 AP each turn. Whenever an Attack is played, Kaito gains +1 Fury.',
    up: { maxAp: 1, draw: 1, onAtkFury: 1, tags: ['Initiation', 'Unique'], text: 'Permanent: +1 AP, +1 card each turn, and +1 Fury per Attack.' },
  },
  // --- Kaito Build-Around Cards ---
  k_flurry: {
    name: 'Neutrophil Flurry', owner: 'kaito', type: 'attack', cost: 2, attr: 'passion', rare: true,
    dmg: 4, hits: 4, tags: ['Multi-Hit'],
    text: 'Deal 4 damage 4 times. Scales 100% per hit with Strength and Bleed.',
    up: { dmg: 5, hits: 5, text: 'Deal 5 damage 5 times. Scales 100% per hit with Strength and Bleed.' },
  },
  k_berserk: {
    name: 'Fever Surge', owner: 'kaito', type: 'skill', cost: 1, attr: 'passion', rare: true,
    selfStress: 12, str: 3, fury: 3, critNext: true, tags: ['Haste'],
    text: 'Gain 12 Stress, +3 Strength, +3 Fury, and Guaranteed Crit on next Attack. Haste.',
    up: { selfStress: 10, str: 4, fury: 4, critNext: true, tags: ['Haste'], text: 'Gain 10 Stress, +4 Strength, +4 Fury, and Guaranteed Crit on next Attack. Haste.' },
  },
  k_reap: {
    name: 'Hemorrhage Cut', owner: 'kaito', type: 'attack', cost: 1, attr: 'passion', rare: true,
    dmg: 10, bleed: 3, detonateBleed: 1, chainMult: 1.5, tags: ['Chain'],
    text: 'Deal 10 damage, +3 Bleed, and trigger Bleed once. Chain (Teammate): ×1.5 dmg and +1 AP.',
    up: { dmg: 14, bleed: 4, detonateBleed: 2, chainMult: 1.6, text: 'Deal 14 damage, +4 Bleed, trigger Bleed twice. Chain: ×1.6 dmg and +1 AP.' },
  },
  k_execute: {
    name: 'Apex Cleaver', owner: 'kaito', type: 'attack', cost: 3, attr: 'passion', rare: true,
    dmg: 28, scaleFury: 8, stressBonusAt: { at: 50, mult: 1.5 }, retainDiscount: 1, retainGrowDmg: 8, tags: ['Retain'],
    text: 'Deal 28 (+8/Fury, +50% if Stress ≥ 50). Retain: -1 AP & +8 dmg each turn held.',
    up: { dmg: 36, scaleFury: 10, stressBonusAt: { at: 40, mult: 1.5 }, retainDiscount: 1, retainGrowDmg: 12, text: 'Deal 36 (+10/Fury, +50% if Stress ≥ 40). Retain: -1 AP & +12 dmg each turn.' },
  },

  // === MOMO / Vanguard / Order (Barricade Shield Retain, Counter, Aegis Slam) ===
  m_strike: {
    name: 'Order Strike', owner: 'momo', type: 'attack', cost: 1, attr: 'order', basic: true,
    dmg: 7, shieldHalfDmg: true,
    text: 'Deal 7 damage. Gain Shield equal to half damage dealt.',
    up: { dmg: 10, shieldHalfDmg: true, text: 'Deal 10 damage. Gain Shield equal to half damage dealt.' },
  },
  m_guard: {
    name: 'Guard Stance', owner: 'momo', type: 'skill', cost: 1, attr: 'order',
    shield: 9, counter: 3,
    text: 'Gain 9 Shield and +3 Counter (retaliate when struck).',
    up: { shield: 13, counter: 5, text: 'Gain 13 Shield and +5 Counter.' },
  },
  m_patch: {
    name: 'Patch Up', owner: 'momo', type: 'skill', cost: 1, attr: 'order',
    teamShield: 5, chainTeamCounter: 2, tags: ['Celestial', 'Chain'],
    text: 'All allies gain 5 Shield. Celestial: auto-fires on 2+ AP cards. Chain: +2 Counter all.',
    up: { teamShield: 8, chainTeamCounter: 3, tags: ['Celestial', 'Chain'], text: 'All allies gain 8 Shield. Celestial. Chain: +3 Counter all.' },
  },
  m_stand: {
    name: 'Stand Firm', owner: 'momo', type: 'skill', cost: 1, attr: 'order',
    shield: 10, taunt: 1, fortitude: 1, barricade: 1, tags: ['Fortitude'],
    text: 'Gain 10 Shield, Taunt, -20% dmg taken, and keep 50% Shield at end of turn.',
    up: { shield: 14, fortitude: 2, barricade: 2, text: 'Gain 14 Shield, Taunt, -20% dmg taken (2T), and keep 100% Shield this turn.' },
  },
  m_triage: {
    name: 'Triage', owner: 'momo', type: 'skill', cost: 1, attr: 'order',
    heal: 8, stressHeal: 12, highStressStr: { at: 40, str: 2 },
    text: 'Heal 8 HP, clear 12 Stress. If target had ≥ 40 Stress, grant +2 Strength.',
    up: { heal: 12, stressHeal: 20, highStressStr: { at: 30, str: 3 }, text: 'Heal 12 HP, clear 20 Stress. If ≥ 30 Stress, grant +3 Strength.' },
  },
  m_up: {
    name: 'Field Protocol', owner: 'momo', type: 'upgrade', cost: 1, attr: 'order',
    turnShield: 4, teamBarricade: 1, tags: ['Initiation', 'Unique'],
    text: 'Permanent: all allies gain 4 Shield each turn and retain 50% Shield across turns.',
    up: { turnShield: 7, teamBarricade: 1, tags: ['Initiation', 'Unique'], text: 'Permanent: all allies gain 7 Shield each turn and retain 50% Shield across turns.' },
  },
  // --- Momo Build-Around Cards ---
  m_bash: {
    name: 'Aegis Slam', owner: 'momo', type: 'attack', cost: 2, attr: 'order', rare: true,
    dmg: 4, shieldDmgPct: 1.0, vuln: 2, tags: ['Shield-Slam'],
    text: 'Deal 4 + 100% of total Team Shield as damage. Apply 2T Vulnerable (+35% dmg taken).',
    up: { dmg: 8, shieldDmgPct: 1.35, vuln: 3, text: 'Deal 8 + 135% of total Team Shield. Apply 3T Vulnerable (+35% dmg taken).' },
  },
  m_bastion: {
    name: 'Thrombus Fortress', owner: 'momo', type: 'skill', cost: 2, attr: 'order', rare: true,
    teamShield: 14, teamCounter: 5, barricade: 2,
    text: 'All allies gain 14 Shield, +5 Counter, and keep 100% of Shield this turn.',
    up: { teamShield: 20, teamCounter: 8, barricade: 2, text: 'All allies gain 20 Shield, +8 Counter, and keep 100% of Shield this turn.' },
  },
  m_aegis: {
    name: 'Platelet Deploy', owner: 'momo', type: 'skill', cost: 0, attr: 'order', rare: true,
    teamShield: 6, spawnTokens: { id: 'tok_cut', count: 2 }, tags: ['Haste', 'Exhaust'],
    text: 'All allies gain 6 Shield. Add 2 Micro-Cuts (0 AP) to hand. Haste. Exhaust.',
    up: { teamShield: 9, spawnTokens: { id: 'tok_cut', count: 2 }, draw: 1, tags: ['Haste', 'Exhaust'], text: 'All allies gain 9 Shield. Add 2 Micro-Cuts + Draw 1. Haste. Exhaust.' },
  },
  m_reflect: {
    name: 'Spiked Scaffold', owner: 'momo', type: 'upgrade', cost: 1, attr: 'order', rare: true,
    onShieldCounter: 1, onShieldThorns: 3, tags: ['Unique'],
    text: 'Permanent: whenever an ally gains Shield, grant +1 Counter and deal 3 damage.',
    up: { onShieldCounter: 2, onShieldThorns: 5, tags: ['Unique'], text: 'Permanent: whenever an ally gains Shield, grant +2 Counter and deal 5 damage.' },
  },

  // === GORO / Controller / Justice (Toxin/Bleed Catalyst, Overheal->Str, Retrieve) ===
  g_strike: {
    name: 'Scalpel', owner: 'goro', type: 'attack', cost: 1, attr: 'justice', basic: true,
    dmg: 7, toxin: 3,
    text: 'Deal 7 damage and apply 3 Toxin.',
    up: { dmg: 10, toxin: 5, text: 'Deal 10 damage and apply 5 Toxin.' },
  },
  g_guard: {
    name: 'Clot', owner: 'goro', type: 'skill', cost: 1, attr: 'justice',
    shield: 8, teamStressHeal: 8,
    text: 'Gain 8 Shield and clear 8 Stress from the squad.',
    up: { shield: 12, teamStressHeal: 14, text: 'Gain 12 Shield and clear 14 Stress from the squad.' },
  },
  g_cleave: {
    name: 'Cleave', owner: 'goro', type: 'attack', cost: 2, attr: 'justice',
    dmg: 10, aoe: true, bleed: 4, vuln: 2,
    text: 'Deal 10 AoE damage. Apply 4 Bleed and 2T Vulnerable (+35% dmg taken) to all.',
    up: { dmg: 14, bleed: 6, vuln: 3, text: 'Deal 14 AoE damage. Apply 6 Bleed and 3T Vulnerable to all.' },
  },
  g_devour: {
    name: 'Devour', owner: 'goro', type: 'skill', cost: 2, attr: 'justice',
    teamHeal: 8, teamStressHeal: 14, purifyStr: 2,
    text: 'Heal all allies 8 HP, clear 14 Stress. Purify: if ally hits full HP, grant +2 Strength.',
    up: { teamHeal: 12, teamStressHeal: 20, purifyStr: 3, text: 'Heal all allies 12 HP, clear 20 Stress. Purify: +3 Strength if at full HP.' },
  },
  g_hymn: {
    name: 'Lullaby', owner: 'goro', type: 'skill', cost: 1, attr: 'justice',
    weakenAll: 2, retrieve: 1, retrieveDiscount: 1, tags: ['Retrieve'],
    text: 'All enemies -35% dmg (2T). Retrieve highest-Attack card from Graveyard at -1 AP.',
    up: { weakenAll: 3, retrieve: 1, retrieveDiscount: 2, text: 'All enemies -35% dmg (3T). Retrieve highest-Attack card at -2 AP.' },
  },
  g_up: {
    name: 'The Wall', owner: 'goro', type: 'upgrade', cost: 1, attr: 'justice',
    blockBonus: 3, onHealFury: 2, tags: ['Initiation', 'Unique'],
    text: 'Permanent: all Shields +3, and healing grants +2 Fury to the team.',
    up: { blockBonus: 5, onHealFury: 3, tags: ['Initiation', 'Unique'], text: 'Permanent: all Shields +5, and healing grants +3 Fury to the team.' },
  },
  // --- Goro Build-Around Cards ---
  g_catalyst: {
    name: 'Enzyme Catalyst', owner: 'goro', type: 'skill', cost: 1, attr: 'justice', rare: true,
    doubleStatus: true, tags: ['Haste'],
    text: 'Double all Bleed and Toxin stacks on the target enemy. Haste.',
    up: { doubleStatus: true, doubleStatusAoe: true, tags: ['Haste'], text: 'Double all Bleed and Toxin stacks on ALL enemies. Haste.' },
  },
  g_purge: {
    name: 'Lysis Detonation', owner: 'goro', type: 'attack', cost: 1, attr: 'justice', rare: true,
    dmg: 8, detonateAll: 1, healPctStatus: 0.3, tags: ['Detonate'],
    text: 'Deal 8 damage. Immediately trigger all Bleed & Toxin on target and heal team 30% of it.',
    up: { dmg: 12, detonateAll: 2, healPctStatus: 0.35, text: 'Deal 12 damage. Trigger all Bleed & Toxin TWICE and heal team 35% of it.' },
  },
  g_symbiosis: {
    name: 'Symbiotic Pulse', owner: 'goro', type: 'skill', cost: 1, attr: 'justice', rare: true,
    teamStressHeal: 18, resonance: 2, chainAp: 1, chainTeamStr: 2, tags: ['Chain'],
    text: 'Clear 18 Stress, +2 Resonance. Chain (Teammate): +1 AP and +2 Strength to all allies.',
    up: { teamStressHeal: 24, resonance: 3, chainAp: 1, chainTeamStr: 3, tags: ['Chain'], text: 'Clear 24 Stress, +3 Resonance. Chain: +1 AP and +3 Strength to all allies.' },
  },
  g_feast_up: {
    name: 'Phagocytosis', owner: 'goro', type: 'upgrade', cost: 1, attr: 'justice', rare: true,
    onStatusTickHeal: 1, onStatusTickRes: 1, tags: ['Unique'],
    text: 'Permanent: whenever Toxin or Bleed deals damage, allies heal 1 HP and gain +1 Resonance.',
    up: { onStatusTickHeal: 2, onStatusTickRes: 1, onStatusTickFury: 1, tags: ['Unique'], text: 'Permanent: on Bleed/Toxin damage, heal 2, +1 Fury, +1 Resonance.' },
  },

  // === BIBI / Psionic / Void (Mark, Exhaust Scaling, Token Swarm, Echo) ===
  b_ping: {
    name: 'Signal Ping', owner: 'bibi', type: 'attack', cost: 1, attr: 'void', basic: true,
    dmg: 6, spawnTokens: { id: 'tok_spark', count: 1 },
    text: 'Deal 6 damage. Add a 0-AP Neuro-Spark to hand.',
    up: { dmg: 9, spawnTokens: { id: 'tok_spark', count: 2 }, text: 'Deal 9 damage. Add 2 Neuro-Sparks (0 AP) to hand.' },
  },
  b_fuzz: {
    name: 'Fuzz', owner: 'bibi', type: 'skill', cost: 1, attr: 'void',
    shield: 8, draw: 1,
    text: 'Gain 8 Shield and Draw 1 card.',
    up: { shield: 12, draw: 1, resonance: 1, text: 'Gain 12 Shield, Draw 1 card, and +1 Resonance.' },
  },
  b_flare: {
    name: 'Flare', owner: 'bibi', type: 'attack', cost: 2, attr: 'void',
    dmg: 8, aoe: true, mark: 2, vuln: 2, tags: ['Mark'],
    text: 'Deal 8 AoE. Apply 2T Mark (+50% dmg) and 2T Vulnerable (+35% dmg) to all enemies.',
    up: { dmg: 12, mark: 3, vuln: 3, text: 'Deal 12 AoE. Apply 3T Mark (+50%) and 3T Vulnerable (+35%) to all.' },
  },
  b_hist: {
    name: 'Histamine', owner: 'bibi', type: 'skill', cost: 1, attr: 'void',
    teamStr: 2, teamBuffAtk: 4,
    text: 'All allies gain +2 permanent Strength and +4 Attack this turn.',
    up: { teamStr: 3, teamBuffAtk: 6, text: 'All allies gain +3 permanent Strength and +6 Attack this turn.' },
  },
  b_over: {
    name: 'Overdrive', owner: 'bibi', type: 'skill', cost: 0, attr: 'void',
    apGain: 1, resonance: 2, spawnTokens: { id: 'tok_spark', count: 1 }, tags: ['Exhaust', 'Haste'],
    text: 'Gain +1 AP, +2 Resonance, and 1 Neuro-Spark. Does not tick counters. Exhaust.',
    up: { apGain: 2, resonance: 3, spawnTokens: { id: 'tok_spark', count: 2 }, tags: ['Exhaust', 'Haste'], text: 'Gain +2 AP, +3 Resonance, and 2 Neuro-Sparks. Haste. Exhaust.' },
  },
  b_up: {
    name: 'Cross-talk', owner: 'bibi', type: 'upgrade', cost: 1, attr: 'void',
    extraDraw: 1, onExhaustDmg: 6, onExhaustEp: 1, tags: ['Initiation', 'Unique'],
    text: 'Permanent: draw +1/turn. Exhausting a card deals 6 AoE and grants +1 EP.',
    up: { extraDraw: 1, firstAp: 1, onExhaustDmg: 9, onExhaustEp: 1, tags: ['Initiation', 'Unique'], text: 'Permanent: draw +1/turn, +1 AP T1, and Exhaust deals 9 AoE + 1 EP.' },
  },
  // --- Bibi Build-Around Cards ---
  b_cascade: {
    name: 'Void Cascade', owner: 'bibi', type: 'attack', cost: 2, attr: 'void', rare: true,
    dmg: 8, aoe: true, scaleExhaust: 5, scaleTurnPlays: 3, tags: ['Exhaust-Scale'],
    text: 'Deal 8 AoE (+5 per card Exhausted this fight, +3 per card played this turn).',
    up: { dmg: 12, scaleExhaust: 7, scaleTurnPlays: 5, text: 'Deal 12 AoE (+7 per Exhausted card, +5 per card played this turn).' },
  },
  b_prism: {
    name: 'Signal Prism', owner: 'bibi', type: 'skill', cost: 1, attr: 'void', rare: true,
    echoNext: 1, resonance: 2, tags: ['Haste', 'Echo'],
    text: 'Your next Attack card this turn fires TWICE. Gain +2 Resonance. Haste.',
    up: { echoNext: 1, echoBonus: 0.4, resonance: 3, tags: ['Haste', 'Echo'], text: 'Your next Attack fires TWICE with +40% bonus dmg. +3 Resonance. Haste.' },
  },
  b_swarm: {
    name: 'Degranulate', owner: 'bibi', type: 'skill', cost: 1, attr: 'void', rare: true,
    spawnTokens: { id: 'tok_spark', count: 3 }, tokenToxin: 2,
    text: 'Add 3 Neuro-Sparks (0 AP) to hand and apply 2 Toxin to target.',
    up: { spawnTokens: { id: 'tok_spark', count: 4 }, tokenToxin: 4, text: 'Add 4 Neuro-Sparks (0 AP) to hand and apply 4 Toxin to target.' },
  },
  b_nexus: {
    name: 'Resonance Singularity', owner: 'bibi', type: 'attack', cost: 2, attr: 'void', rare: true,
    dmg: 14, scaleResonance: 10, draw: 2, forceBurst: true, tags: ['Resonance'],
    text: 'Deal 14 (+10 per Resonance stack) and Draw 2. Always triggers Resonance Burst (+60% dmg).',
    up: { dmg: 20, scaleResonance: 14, draw: 2, forceBurst: true, text: 'Deal 20 (+14 per Resonance stack) and Draw 2. Triggers Resonance Burst.' },
  },

  // === Synergy / Effect cards (starter-deck effects for the original four) ===
  k_rally: {
    name: 'War Cry', owner: 'kaito', type: 'skill', cost: 1, attr: 'passion',
    teamBuffAtk: 4, fury: 2, tags: ['Synergy'],
    text: 'All allies +4 Attack this turn. Kaito gains +2 Fury. Play before attacking.',
    up: { teamBuffAtk: 6, fury: 3, text: 'All allies +6 Attack this turn. Kaito gains +3 Fury.' },
  },
  k_feint: {
    name: 'Feint Step', owner: 'kaito', type: 'skill', cost: 1, attr: 'passion',
    shield: 6, draw: 1, fury: 1, tags: ['Synergy'],
    text: 'Gain 6 Shield, +1 Fury, and Draw 1 card.',
    up: { shield: 9, draw: 1, fury: 2, text: 'Gain 9 Shield, +2 Fury, and Draw 1 card.' },
  },
  k_supply: {
    name: 'Combat Stims', owner: 'kaito', type: 'skill', cost: 0, attr: 'passion',
    spawnTokens: { id: 'tok_cut', count: 1 }, fury: 1, tags: ['Synergy', 'Haste', 'Exhaust'],
    text: 'Add a 0-AP Micro-Cut to hand and gain +1 Fury. Haste. Exhaust.',
    up: { spawnTokens: { id: 'tok_cut', count: 2 }, fury: 2, tags: ['Synergy', 'Haste', 'Exhaust'], text: 'Add 2 Micro-Cuts to hand and gain +2 Fury. Haste. Exhaust.' },
  },
  m_formation: {
    name: 'Formation', owner: 'momo', type: 'skill', cost: 1, attr: 'order',
    teamShield: 6, teamCounter: 2, tags: ['Synergy'],
    text: 'All allies gain 6 Shield and +2 Counter.',
    up: { teamShield: 9, teamCounter: 3, text: 'All allies gain 9 Shield and +3 Counter.' },
  },
  m_splint: {
    name: 'Field Splint', owner: 'momo', type: 'skill', cost: 1, attr: 'order',
    heal: 6, shield: 6, stressHeal: 8, tags: ['Synergy'],
    text: 'Heal 6 HP, gain 6 Shield, and clear 8 Stress.',
    up: { heal: 10, shield: 9, stressHeal: 12, text: 'Heal 10 HP, gain 9 Shield, and clear 12 Stress.' },
  },
  g_tonic: {
    name: 'Toxic Tonic', owner: 'goro', type: 'skill', cost: 1, attr: 'justice',
    toxin: 4, teamStressHeal: 6, tags: ['Synergy'],
    text: 'Apply 4 Toxin to the target and clear 6 Stress from the squad.',
    up: { toxin: 6, teamStressHeal: 10, text: 'Apply 6 Toxin to the target and clear 10 Stress from the squad.' },
  },
  g_broth: {
    name: 'Marrow Broth', owner: 'goro', type: 'skill', cost: 1, attr: 'justice',
    teamHeal: 5, shield: 7, tags: ['Synergy'],
    text: 'Heal all allies 5 HP. Goro gains 7 Shield.',
    up: { teamHeal: 8, shield: 11, text: 'Heal all allies 8 HP. Goro gains 11 Shield.' },
  },
  b_static: {
    name: 'Static Bloom', owner: 'bibi', type: 'skill', cost: 1, attr: 'void',
    resonance: 2, draw: 1, spawnTokens: { id: 'tok_spark', count: 1 }, tags: ['Synergy'],
    text: 'Gain +2 Resonance, Draw 1, and add a 0-AP Neuro-Spark to hand.',
    up: { resonance: 3, draw: 1, spawnTokens: { id: 'tok_spark', count: 2 }, tags: ['Synergy'], text: 'Gain +3 Resonance, Draw 1, and add 2 Neuro-Sparks.' },
  },
  b_veil: {
    name: 'Signal Veil', owner: 'bibi', type: 'skill', cost: 1, attr: 'void',
    teamShield: 5, teamBuffAtk: 3, tags: ['Synergy'],
    text: 'All allies gain 5 Shield and +3 Attack this turn.',
    up: { teamShield: 8, teamBuffAtk: 5, text: 'All allies gain 8 Shield and +5 Attack this turn.' },
  },

  // === Yuna / Alchemist / Instinct (POISON Damage-over-Time) ===
  // Poison rule: stacks collect on the enemy. When you End Turn, each enemy
  // takes stacks x (3 + Potency) damage, then Poison -1. Her attacks also
  // scale off the target's Poison (dmgPerPoison), so stacking feeds both.
  y_sting: {
    name: 'Venom Sting', owner: 'yuna', type: 'attack', cost: 1, attr: 'instinct', basic: true,
    dmg: 6, poison: 2, dmgPerPoison: 1,
    text: 'BASIC ATTACK — Deal 6 damage (+1 per Poison on the target) and apply 2 Poison. Poison ticks for 3 per stack at End Turn — the bigger the stack, the harder this hits.',
    up: { dmg: 9, poison: 3, dmgPerPoison: 2, text: 'BASIC ATTACK — Deal 9 damage (+2 per Poison on the target) and apply 3 Poison.' },
  },
  y_dose: {
    name: 'Creeping Dose', owner: 'yuna', type: 'skill', cost: 1, attr: 'instinct',
    poison: 4, tags: ['Poison'],
    text: 'Apply 4 Poison. Every stack deals 3 damage at End Turn: ticks 12, then 9, then 6…',
    up: { poison: 5, text: 'Apply 5 Poison: ticks 15, then 12, then 9… at each End Turn.' },
  },
  y_mist: {
    name: 'Spore Mist', owner: 'yuna', type: 'skill', cost: 1, attr: 'instinct',
    poisonAll: 2, tags: ['Poison'],
    text: 'Apply 2 Poison to ALL enemies (ticks 6 each at End Turn).',
    up: { poisonAll: 3, text: 'Apply 3 Poison to ALL enemies (ticks 9 each at End Turn).' },
  },
  y_incubate: {
    name: 'Incubate', owner: 'yuna', type: 'skill', cost: 1, attr: 'instinct',
    doublePoison: true, draw: 1, tags: ['Poison'],
    text: 'Double the target’s Poison stacks (gains at most +6 stacks, 20 max) — its End-Turn tick grows with it — then Draw 1 card.',
    up: { doublePoison: true, draw: 1, resonance: 1, tags: ['Poison'], text: 'Double the target’s Poison, +1 Resonance, and Draw 1.' },
  },
  y_antidote: {
    name: 'Sweet Antidote', owner: 'yuna', type: 'skill', cost: 1, attr: 'instinct',
    shield: 8, heal: 5, stressHeal: 10, tags: ['Synergy'],
    text: 'Gain 8 Shield, heal 5 HP, and clear 10 Stress. She poisons enemies, not friends.',
    up: { shield: 12, heal: 8, stressHeal: 16, text: 'Gain 12 Shield, heal 8 HP, and clear 16 Stress.' },
  },
  y_hatch: {
    name: 'Hatchery', owner: 'yuna', type: 'skill', cost: 0, attr: 'instinct',
    spawnTokens: { id: 'tok_spore', count: 2 }, tags: ['Poison', 'Haste', 'Exhaust'],
    text: 'Add 2 free Spore Mites (0 AP, +Poison) to hand. Haste. Exhaust.',
    up: { spawnTokens: { id: 'tok_spore', count: 3 }, tags: ['Poison', 'Haste', 'Exhaust'], text: 'Add 3 free Spore Mites to hand. Haste. Exhaust.' },
  },
  y_culture: {
    name: 'Living Culture', owner: 'yuna', type: 'upgrade', cost: 1, attr: 'instinct',
    poisonPotency: 1, onPoisonTickRes: 1, tags: ['Initiation', 'Unique'],
    text: 'Permanent: every Poison stack deals +1 more damage per tick (4/stack instead of 3), and every Poison tick grants +1 Resonance. Scales with every stack you stack.',
    up: { poisonPotency: 2, onPoisonTickRes: 1, onPoisonTickHeal: 1, tags: ['Initiation', 'Unique'], text: 'Permanent: Poison stacks deal +2 more per tick (5/stack), +1 Resonance per tick, and Yuna heals 1 per tick.' },
  },
  // --- Yuna Build-Around Cards ---
  y_epidemic: {
    name: 'Epidemic Bloom', owner: 'yuna', type: 'skill', cost: 2, attr: 'instinct', rare: true,
    poisonAll: 5, vulnAll: 1, tags: ['Poison'],
    text: 'Apply 5 Poison (ticks 15) and 1T Vulnerable (+35% taken) to ALL enemies.',
    up: { poisonAll: 6, vulnAll: 2, tags: ['Poison'], text: 'Apply 6 Poison (ticks 18) and 2T Vulnerable to ALL enemies.' },
  },
  y_necrosis: {
    name: 'Necrotic Feast', owner: 'yuna', type: 'skill', cost: 2, attr: 'instinct', rare: true,
    detonatePoison: true, tags: ['Poison', 'Detonate'],
    text: 'Detonate Poison: target immediately takes its full End-Turn tick — Poison stacks x 3 (more with Potency) — stacks are consumed, and your team heals 1 HP per stack.',
    up: { detonatePoison: true, tags: ['Poison', 'Detonate'], text: 'Detonate Poison for stacks x 3+ damage, heal 1 per stack, and Draw 1.', draw: 1 },
  },
  y_predator: {
    name: 'Apex Parasite', owner: 'yuna', type: 'skill', cost: 3, attr: 'instinct', rare: true,
    poison: 8, triggerPoisonTick: 1, tags: ['Poison'],
    text: 'Apply 8 Poison, then immediately trigger one Poison tick (stacks x 3 damage NOW, Poison -1).',
    up: { poison: 10, triggerPoisonTick: 1, tags: ['Poison'], text: 'Apply 10 Poison, then immediately trigger one Poison tick (stacks x 3 NOW).' },
  },
  y_virulence: {
    name: 'Virulence Engine', owner: 'yuna', type: 'upgrade', cost: 1, attr: 'instinct', rare: true,
    poisonPotency: 1, onPoisonTickFury: 1, tags: ['Unique'],
    text: 'Permanent: every Poison stack deals +1 more damage per tick (stacks with Living Culture — up to 5+/stack), and every Poison tick grants Kaito/the team +1 Fury (lead combatant if no Kaito).',
    up: { poisonPotency: 2, onPoisonTickFury: 1, onPoisonTickRes: 1, tags: ['Unique'], text: 'Permanent: Poison stacks deal +2 more per tick, +1 Fury and +1 Resonance per tick.' },
  },

  // === SABLE / Mnemonist / Justice (PERCENT scaling) ===
  // Every number on her kit is a percentage: attacks add % of the target's
  // Max HP (steady) or % of its missing HP (execute), her Shield is a % of
  // HER Max HP, and her heals restore a % of missing HP. Flat vs trash,
  // enormous vs bosses — the bigger the HP pool, the harder she hits.
  s_annotate: {
    name: 'Annotate', owner: 'sable', type: 'attack', cost: 1, attr: 'justice', basic: true,
    dmg: 6, pctMaxHp: 0.03,
    text: 'BASIC ATTACK — Deal 6 damage + 3% of the target’s Max HP. The bigger the enemy, the harder this hits.',
    up: { dmg: 8, pctMaxHp: 0.04, text: 'BASIC ATTACK — Deal 8 damage + 4% of the target’s Max HP.' },
  },
  s_recall: {
    name: 'Recall Strike', owner: 'sable', type: 'attack', cost: 1, attr: 'justice',
    dmg: 5, pctMissingHp: 0.12,
    text: 'Deal 5 damage + 12% of the target’s MISSING HP. An execute: worthless on a fresh enemy, lethal on a wounded one.',
    up: { dmg: 7, pctMissingHp: 0.16, text: 'Deal 7 damage + 16% of the target’s missing HP.' },
  },
  s_margin: {
    name: 'Margin Note', owner: 'sable', type: 'skill', cost: 1, attr: 'justice',
    shieldPctMax: 0.14, stressHeal: 8,
    text: 'Gain Shield equal to 14% of Sable’s Max HP and clear 8 Stress.',
    up: { shieldPctMax: 0.20, stressHeal: 12, text: 'Gain Shield equal to 20% of Sable’s Max HP and clear 12 Stress.' },
  },
  s_index: {
    name: 'Index Card', owner: 'sable', type: 'skill', cost: 1, attr: 'justice',
    resonance: 2, draw: 1,
    text: 'Gain +2 Resonance and Draw 1 card. She has already filed this moment.',
    up: { resonance: 3, draw: 1, text: 'Gain +3 Resonance and Draw 1 card.' },
  },
  s_second: {
    name: 'Second Reading', owner: 'sable', type: 'skill', cost: 1, attr: 'justice',
    healPctMissing: 0.30, stressHeal: 10,
    text: 'Heal 30% of Sable’s MISSING HP and clear 10 Stress. The closer to death, the bigger the heal.',
    up: { healPctMissing: 0.45, stressHeal: 16, text: 'Heal 45% of Sable’s missing HP and clear 16 Stress.' },
  },
  s_titer: {
    name: 'Titer Lance', owner: 'sable', type: 'attack', cost: 2, attr: 'justice',
    dmg: 8, pctMaxHp: 0.05, mark: 2,
    text: 'Deal 8 damage + 5% of the target’s Max HP and apply 2T Mark (+50% dmg taken).',
    up: { dmg: 11, pctMaxHp: 0.07, mark: 3, text: 'Deal 11 damage + 7% of Max HP and apply 3T Mark.' },
  },
  s_up: {
    name: 'Living Index', owner: 'sable', type: 'upgrade', cost: 1, attr: 'justice',
    pctBoost: 0.02, tags: ['Initiation', 'Unique'],
    text: 'Permanent: all of Sable’s % HP damage effects gain +2% (e.g. Annotate deals +5% of Max HP).',
    up: { pctBoost: 0.03, extraDraw: 1, tags: ['Initiation', 'Unique'], text: 'Permanent: % HP damage +3%, and draw +1 card each turn.' },
  },
  // --- Sable Build-Around Cards (tight legendary pool: 2 rares) ---
  s_apex: {
    name: 'Apex Entry', owner: 'sable', type: 'attack', cost: 3, attr: 'justice', rare: true,
    dmg: 10, pctMaxHp: 0.10, pctMissingHp: 0.10,
    text: 'Deal 10 damage + 10% of the target’s Max HP + 10% of its missing HP. A boss execution written in advance.',
    up: { dmg: 14, pctMaxHp: 0.13, pctMissingHp: 0.13, text: 'Deal 14 damage + 13% of Max HP + 13% of missing HP.' },
  },
  s_century: {
    name: 'Century Recall', owner: 'sable', type: 'skill', cost: 2, attr: 'justice', rare: true,
    healPctMissing: 0.45, teamStressHeal: 18, resonance: 2,
    text: 'Heal 45% of Sable’s missing HP, clear 18 Stress from the squad, and gain +2 Resonance.',
    up: { healPctMissing: 0.60, teamStressHeal: 26, resonance: 3, text: 'Heal 60% of missing HP, clear 26 team Stress, +3 Resonance.' },
  },

  // === Generated Tokens ===
  tok_cut: {
    name: 'Micro-Cut', owner: 'kaito', type: 'attack', cost: 0, attr: 'passion', token: true,
    dmg: 5, bleed: 1, tags: ['Exhaust', 'Haste'],
    text: 'Deal 5 damage and +1 Bleed. Haste. Exhaust.',
    up: { dmg: 8, bleed: 2, text: 'Deal 8 damage and +2 Bleed. Haste. Exhaust.' },
  },
  tok_spark: {
    name: 'Neuro-Spark', owner: 'bibi', type: 'attack', cost: 0, attr: 'void', token: true,
    dmg: 4, resonance: 1, tags: ['Exhaust', 'Haste'],
    text: 'Deal 4 damage and +1 Resonance. Haste. Exhaust.',
    up: { dmg: 6, resonance: 2, text: 'Deal 6 damage and +2 Resonance. Haste. Exhaust.' },
  },
  tok_spore: {
    name: 'Spore Mite', owner: 'yuna', type: 'attack', cost: 0, attr: 'instinct', token: true,
    dmg: 3, poison: 1, dmgPerPoison: 1, tags: ['Poison', 'Exhaust', 'Haste'],
    text: 'Deal 3 damage (+1 per Poison on the target) and apply 1 Poison. Haste. Exhaust.',
    up: { dmg: 4, poison: 2, dmgPerPoison: 2, text: 'Deal 4 damage (+2 per Poison on the target) and apply 2 Poison. Haste. Exhaust.' },
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
    deck: ['k_jab', 'k_brace', 'k_first', 'k_rally', 'k_feint', 'k_supply', 'k_up'],
  },
  momo: {
    id: 'momo', name: 'Momo', full: 'Momo — Platelet', cls: 'vanguard', attr: 'order',
    art: 'images/cut-momo-cut.png', skin: '#4da3ff', dob: '1992-07-19',
    hp: 104, blurb: 'Barricade Shield, Counter spikes, and turns defense into Aegis Slams.',
    leader: { name: 'Iron Line', desc: 'Leader: All allies start with +5 Shield and +2 Counter.' },
    deck: ['m_strike', 'm_guard', 'm_patch', 'm_stand', 'm_triage', 'm_formation', 'm_up'],
  },
  goro: {
    id: 'goro', name: 'Goro', full: 'Goro — Macrophage', cls: 'controller', attr: 'justice',
    art: 'images/cut-goro-cut.png', skin: '#ffc94d', dob: '1984-11-03',
    hp: 110, blurb: 'Stacks Toxin & Bleed, purifies Stress into Strength, retrieves finishers.',
    leader: { name: 'Steady Pulse', desc: 'Leader: All allies gain +6 Max HP and +2 Resonance on Turn 1.' },
    deck: ['g_strike', 'g_guard', 'g_devour', 'g_hymn', 'g_tonic', 'g_broth', 'g_up'],
  },
  bibi: {
    id: 'bibi', name: 'Bibi', full: 'Bibi — Mast Cell', cls: 'psionic', attr: 'void',
    art: 'images/cut-bibi-cut.png', skin: '#b06bff', dob: '1998-03-15',
    hp: 84, blurb: 'Marks targets, spawns 0-AP Sparks, echoes Attacks, detonates Resonance.',
    leader: { name: 'Cytokine Surge', desc: 'Leader: Start every battle with +2 EP and +1 Resonance.' },
    deck: ['b_ping', 'b_fuzz', 'b_hist', 'b_over', 'b_static', 'b_veil', 'b_up'],
  },
  yuna: {
    id: 'yuna', name: 'Yuna', full: 'Yuna — Eosinophil', cls: 'alchemist', attr: 'instinct',
    art: 'images/cut-yuna-cut.png', skin: '#57e389', dob: '2001-08-22',
    hp: 92, blurb: 'Poison apothecary. Stacks Poison that melts enemies at End Turn, then incubates or detonates it.',
    leader: { name: 'Toxic Bloom', desc: 'Leader: Enemies start with 3 Poison — already a 9-damage tick at the first End Turn.' },
    deck: ['y_sting', 'y_dose', 'y_mist', 'y_incubate', 'y_antidote', 'y_hatch', 'y_culture'],
  },
  sable: {
    id: 'sable', name: 'Sable', full: 'Sable — Memory B', cls: 'mnemonist', attr: 'justice',
    art: 'images/char-memoryb.png', skin: '#F0A63C', dob: '1979-05-30',
    hp: 96, blurb: 'Percent scaling. Damage as % of enemy Max/Missing HP, Shield as % of her Max HP, heals as % of missing HP. Melts bosses.',
    leader: { name: 'Written Down', desc: 'Leader: Start with +1 EP and +1 Resonance — Sable has read this fight before.' },
    deck: ['s_annotate', 's_recall', 's_margin', 's_index', 's_second', 's_titer', 's_up'],
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
    difficulty: 'Easy to start · Hard to perfect', fantasy: 'A pressure fighter who turns pain, speed and repeated hits into one enormous Fury payoff.',
    core: 'Fury is stored damage. It does almost nothing sitting there — cards that say “per Fury”, “consume Fury” or “scale with Fury” turn each stack into real damage.',
    loop: ['Hit often with cheap Attacks to build Fury (Cytokine Jab, Overclock).', 'Let small Stress gains feed you — every Stress gain gives Kaito +1 Fury — but never drift to 100 Stress.', 'Spend the stack: Last Shift consumes all Fury, Apex Cleaver scales without consuming it.'],
    combo: ['Turn 1: Overclock → Cytokine Jab ×2 (Fury starts flowing every Attack).', 'Blade Rush after any Attack for Combo + Bleed, which also triggers Bleed again on later hits.', 'Fever Surge when a finisher is in hand: +Strength, +Fury, guaranteed Crit.', 'Last: Last Shift as your final AP spend — Finale + guaranteed Crit + all Fury consumed.'],
    tips: ['Multi-hit cards love Strength: each hit gets +Strength separately.', 'Retain Apex Cleaver: it gets cheaper and stronger every turn you hold it.', 'At Stress ≥ 50 Apex Cleaver gains +50% — dangerous, deliberate, very Kaito.'],
    partners: 'Momo feeds him Counter-Fury through PHALANX and keeps him alive; Bibi Marks the target (+50%) before he spends Fury.',
    simGoal: 'Reach 8 Fury, break the Colossus, then land a 60+ damage hit.',
  },
  momo: {
    difficulty: 'Easy', fantasy: 'A wall that hits back. Momo turns Shield — normally pure defence — into Counter damage and giant Aegis Slams.',
    core: 'Shield blocks damage and therefore blocks Stress. Barricade lets Shield survive the turn change, so defence can be saved up and spent as offence.',
    loop: ['Gain Shield every turn (Guard Stance, Stand Firm, Field Protocol).', 'Let enemies hit the wall: Counter retaliates even when Shield absorbs everything.', 'Cash the wall in with Aegis Slam: damage equal to 100% of total team Shield.'],
    combo: ['Field Protocol early — free Shield every turn, forever.', 'Stand Firm to Taunt + keep 50–100% Shield, then Guard Stance to stack Counter.', 'Platelet Deploy for team Shield + free Micro-Cut attacks.', 'Aegis Slam only when the team Shield total is fat — check the card’s live number.'],
    tips: ['Counter = Counter stacks + Strength, and it can hit Weakness, Mark and Vulnerable multipliers.', 'A fully blocked hit causes zero Stress. Shield is mental-health care.', 'Spiked Scaffold turns every Shield gain into Counter + thorns damage.'],
    partners: 'Goro heals and purifies her Shield turns into Strength; Kaito spends the turns she buys him building Fury.',
    simGoal: 'Hold 30+ Shield at once, deal Counter damage, then land a 50+ Aegis Slam.',
  },
  goro: {
    difficulty: 'Medium', fantasy: 'A slow apocalypse. Goro stacks Bleed and Toxin, doubles them, detonates them, and heals his team with the result.',
    core: 'Bleed triggers when the enemy is hit and when detonated. Toxin ticks hard whenever the enemy acts. Both ignore the normal “one hit” limit — they scale with patience.',
    loop: ['Apply Bleed/Toxin with almost every card (Scalpel, Cleave).', 'Double the stacks with Enzyme Catalyst instead of hitting again.', 'Detonate with Lysis Detonation — and heal the team for 30% of the eruption.'],
    combo: ['The Wall early: bigger Shields and healing that also grants Fury.', 'Cleave into a crowd for Bleed + Vulnerable (+35% taken) on everything.', 'Enzyme Catalyst on the fattest stack — doubling 12 is worth more than adding 3.', 'Lysis Detonation to cash out, heal, and often break Tenacity for free AP.'],
    tips: ['Detonated status damage can break Tenacity and trigger Ravage — watch the amber bar.', 'Purify: healing someone to full grants Strength. Overhealing is a buff engine.', 'Retrieve (Lullaby) fishes your best Attack out of the Graveyard at a discount.'],
    partners: 'Bibi adds CASCADE (+1 stack per application) and Mark; Momo keeps everyone alive while the statuses cook.',
    simGoal: 'Build 12+ combined Bleed/Toxin on the Colossus, then detonate it.',
  },
  bibi: {
    difficulty: 'Hard', fantasy: 'A signal DJ. Bibi floods the hand with free Sparks, Marks one target for deletion, and bends Resonance into double-cast Attacks.',
    core: 'Resonance is built by Skills and Sparks. At 5+, a heavy Attack Bursts for ×1.6. Prism Echo makes the next Attack fire twice — multipliers stack multiplicatively.',
    loop: ['Play Skills and 0-AP Sparks to climb Resonance without spending the turn.', 'Mark + Vulnerable the target (Flare) before anyone spends anything big.', 'Prism → biggest Attack in hand. Then do it again next turn.'],
    combo: ['Cross-talk early: +1 draw every turn and Exhausts that damage + grant EP.', 'Overdrive (0 AP) for AP, Resonance and a Spark — it does not tick enemy counters.', 'Signal Prism, then Resonance Singularity into a Marked target for a screen-shaking number.', 'Degranulate when the hand is thin: 3–4 free Sparks refill both hand and Resonance.'],
    tips: ['Haste cards (0-AP Sparks, Overdrive) do not advance enemy action counters. Free is really free.', 'Void Cascade scales with every card you have Exhausted all fight — it is a late-game bomb.', 'Echo copies the whole Attack, including Weakness, Mark, Burst and Crit multipliers.'],
    partners: 'Kaito is her favourite Echo target (EDGE synergy: +1 AP and Chain damage); Goro detonates what her Marks amplify.',
    simGoal: 'Reach 8 Resonance, Mark the Colossus, and land a 60+ hit.',
  },
  yuna: {
    difficulty: 'Medium', fantasy: 'A poison apothecary who wins fights she has already stopped touching. The enemy melts at End Turn while she shields, draws and smiles.',
    core: 'POISON is damage-over-time (DoT) that SCALES. Every stack deals 3 damage when you End Turn (then -1 stack, max 20 stacks): 10 Poison ticks 30, then 27, then 24… Her Potency upgrades (Living Culture, Virulence Engine) add +damage PER STACK, and Incubate grows the stack — so stacks x per-stack damage multiplies fast. Her attacks scale too: Venom Sting deals +1 damage per Poison already on the target (+2 upgraded), so the stack you built also makes her hit directly harder. Poison ignores Strength timing and Shield, and can kill before the enemy acts.',
    loop: ['Apply Poison with almost every card: Venom Sting (her one Basic Attack), Creeping Dose, Spore Mist, free Spore Mites.', 'Grow the biggest stack with Incubate — a 12-stack becomes 18, a 72-damage tick with one Potency upgrade.', 'Sting the most-poisoned enemy: at 20 Poison her 1-AP Basic Attack hits for 26+ before multipliers (49+ upgraded). Then End Turn and collect the tick.'],
    combo: ['Living Culture turn 1 — every stack now pays 4 per tick and every tick grants +1 Resonance.', 'Spore Mist into a crowd, Hatchery for free Mites, then Incubate the boss stack (up to +6).', 'Apex Parasite when you want it NOW: +8 Poison and an immediate stacks-x3 tick.', 'Necrotic Feast to cash a huge stack instantly (stacks x 3+) and heal the team per stack — or simply let it melt.'],
    tips: ['Do the math before End Turn: stacks x 3 (or x4-5 with Potency) is printed on the green POISON icon under the enemy HP bar — a lethal tick kills before it acts again.', 'Long-press / right-click an enemy to inspect exactly how much its Poison will tick for.', 'Poison does not reduce Tenacity by itself. Pair her with a Weakness hitter when you need a Break, or let the tick finish a Ravaged target.'],
    partners: 'Goro (CASCADE adds +1 per status application); Bibi Marks targets (x1.5) so her Poison-scaled Sting and your finishers hit harder while Poison cooks.',
    simGoal: 'Stack 15+ Poison on the Colossus, watch a 45+ End-Turn tick, then land a huge Poison-scaled Venom Sting.',
  },
  sable: {
    difficulty: 'Medium', fantasy: 'A legendary archivist who does not hit harder — she hits by percentage. The bigger the enemy\'s HP pool, the more every one of her cards is worth.',
    core: 'PERCENT SCALING. Annotate and Titer Lance add damage equal to a % of the target\'s MAX HP, so they are modest against a 34-HP Spore Node (6 + 1) and enormous against a 460-HP boss (6 + 14, before multipliers — and % damage still takes Weakness, Mark, Vulnerable, Burst and Crit multipliers on top). Recall Strike instead adds 12% of the target\'s MISSING HP: an execute that grows as the fight is won. Her defence scales too — Margin Note shields for 14% of HER Max HP, and Second Reading heals 30% of her MISSING HP, so she is hardest to kill exactly when she is closest to death.',
    loop: ['Open with Living Index: every % effect gains +2% for the whole fight (Annotate becomes 5% of Max HP).', 'Annotate and Titer Lance the biggest HP pool on the field — % damage ignores how tanky the target feels to everyone else. Mark with Titer Lance first when you can.', 'Swap to Recall Strike as the target\'s HP falls: at 50% missing on a boss it adds more than Annotate ever will.', 'Use Second Reading late, never early: 30% of missing HP is a small heal at full HP and a resurrection at 20 HP.'],
    combo: ['Living Index turn 1 — the +2% applies to every % card for the rest of the fight, including Apex Entry.', 'Titer Lance to Mark (+50%), then Apex Entry: 10 + 10% Max + 10% missing, all multiplied by the Mark.', 'At low HP: Margin Note (Shield = % of her Max HP) buys the turn, Second Reading converts a near-death Sable back to half health.', 'Century Recall when the whole squad is stressed and Sable is wounded — her biggest heal is also the team\'s reset button.'],
    tips: ['Do the % maths on the card: the live preview number already includes the % bonus for the current target — bigger enemy, bigger number.', 'Percent damage still breaks Tenacity normally when it hits a Weakness (Sable is Justice ✧).', 'Against trash packs Sable is deliberately ordinary — bring a flat-damage partner for the small stuff and save her for the wall behind them.'],
    partners: 'Bibi Marks and Echoes her % lances (multipliers stack on % damage); Momo\'s Barricade keeps her alive long enough for Second Reading to be enormous.',
    simGoal: 'With Living Index up, land a 40+ hit on the Colossus from % scaling alone, then execute with Recall Strike.',
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
  { code: 'm01', name: 'Cutline', place: 'Left Forearm — Epidermis', threat: 'Low', rec: 'passion', reward: 40, enemies: ['strep'],
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
  { code: 'm02', name: 'Drain Line', place: 'Lymph Node 04', threat: 'Low', rec: 'order', reward: 50, enemies: ['toxin', 'spore'],
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
  { code: 'm03', name: 'The Thicket', place: 'Deep Tissue — Biofilm Bloom', threat: 'Medium', rec: 'justice', reward: 65, enemies: ['biofilm', 'strep'],
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
  { code: 'm04', name: 'Signal Rot', place: 'Spinal Relay — Night', threat: 'High', rec: 'void', reward: 80, enemies: ['strain', 'toxin'],
    story: ['The signal rot reaches the relay at 03:12.', 'The relay starts telling the body the wrong things — heat, fear, pain, all at once.', 'Bibi can out-shout it. That is not the same as curing it.'] },
  { code: 'm05', name: 'Prion Gate', place: 'The Blood-Brain Barrier', threat: 'Severe', rec: 'instinct', reward: 100, enemies: ['prion', 'strain', 'biofilm'],
    story: ['The barrier is one cell thick and the prion knot is already folding through it.', 'Everything they have learned about each other gets spent here.', 'Hold the gate. Nothing gets through.'] },
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
