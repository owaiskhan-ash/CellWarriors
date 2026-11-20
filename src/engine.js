// Cell Warriors — battle engine (CZN × Morimens build-ups, synergies, & Over-Exalt).
import {
  CARDS, CHARACTERS, EGOS, ENEMIES, MISSIONS, RELICS, ATTRIBUTES, EPIPHANY_BRANCHES,
} from './data.js';

export const AP_PER_TURN = 3;
export const DRAW_PER_TURN = 5;
export const FIRST_DRAW = 7;
export const HAND_CAP = 10;
export const MAX_EP = 7;
export const EGO_COST = 4;
export const MAX_RESONANCE = 10;
export const BURST_COST = 5;
export const STRESS_MAX = 100;
export const RECOVERY_PLAYS = [5, 6, 8, 10, 12];
export const SANDS_CHARGES = 3;
// POISON scaling: every Poison stack deals this much damage per End-Turn tick.
// Poison Potency (Yuna's upgrades) adds +damage PER STACK on top of this, so
// ticks scale multiplicatively with stacking: tick = stacks x (3 + Potency).
export const POISON_PER_STACK = 3;
export const POISON_CAP = 20; // hard stack cap so Incubate/CATALYST can't snowball forever

function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
const shuffle = (arr, rng) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

let UID = 1;
const nextUid = () => `c${UID++}`;

function makeCard(id, { upgraded = false, glint = false } = {}) {
  const def = CARDS[id];
  if (!def) throw new Error(`Unknown card ${id}`);
  const up = upgraded && def.up ? def.up : null;
  const merged = up ? { ...def, ...up } : { ...def };
  if (up) merged.name = `${def.name}+`;
  const c = {
    ...merged, id, defId: id, uid: nextUid(), upgraded: !!up, glint, zeroCost: glint,
    retainedDmg: 0, retainedAtk: 0,
  };
  c.baseCost = merged.cost;
  return c;
}

const attrOf = (a) => ATTRIBUTES[a] || { name: 'None', glyph: '·', color: '#888' };
const pushFx = (state, ev) => { state.fx.push(ev); if (state.fx.length > 90) state.fx.shift(); };

// --- start -----------------------------------------------------------------
export function startBattle(opts, partyIds, seed) {
  let config;
  if (typeof opts === 'string' || (opts && opts.enemies && !opts.party)) {
    const mission = typeof opts === 'string' ? MISSIONS.find((m) => m.code === opts) : opts;
    if (!mission) throw new Error('Unknown mission');
    config = { name: mission.name, place: mission.place, enemies: mission.enemies, party: partyIds, seed, missionCode: mission.code };
  } else {
    config = { ...opts };
  }
  const seedNum = config.seed ?? seed ?? Date.now();
  const rng = makeRng(typeof seedNum === 'number' ? seedNum : 12345);
  const party = config.party || ['kaito', 'momo', 'goro'];
  const stats = config.charStats || {};
  const carry = config.carry || {};
  const leadId = party[0];

  const characters = party.map((pid, i) => {
    const c = CHARACTERS[pid];
    if (!c) throw new Error(`Unknown character ${pid}`);
    const lvl = stats[pid] || {};
    const maxHp = c.hp + (lvl.hp || 0) + (leadId === 'goro' ? 6 : 0);
    const prev = carry[pid] || {};
    const startHp = prev.hp != null ? Math.min(maxHp, Math.max(1, prev.hp)) : maxHp;
    const isKaitoLead = i === 0 && pid === 'kaito';
    return {
      id: pid, name: c.name, full: c.full, cls: c.cls, attr: c.attr, art: c.art, skin: c.skin,
      hp: startHp, maxHp, shield: 0, stress: Math.min(99, prev.stress || 0),
      atkBonus: lvl.atk || 0, skillLv: lvl.skillLv || 0, egoDiscount: lvl.egoDiscount || 0,
      str: isKaitoLead ? 2 : 0,
      fury: isKaitoLead ? 2 : 0,
      counter: leadId === 'momo' ? 2 : 0,
      barricade: 0,
      critNext: false,
      buffAtk: 0, blockBonus: 0, taunt: 0, fortitude: 0,
      broken: false, lockedHp: 0, recovery: 0, breakdownCount: 0,
      egoFree: false, slot: i,
    };
  });

  const enemies = (config.enemies || []).map((eid, i) => {
    const e = ENEMIES[eid];
    if (!e) throw new Error(`Unknown enemy ${eid}`);
    const scale = config.enemyScale || 1;
    const hp = Math.round(e.hp * scale);
    return {
      uid: `e${i}`, id: eid, name: e.name, hp, maxHp: hp,
      tenacity: e.tenacity, maxTenacity: e.tenacity, weakness: e.weakness,
      counter: e.counter, maxCounter: e.counter, counterBonus: 0,
      ravaged: false, weaken: 0, atkBuff: 0, mark: 0, vuln: 0,
      bleed: 0, toxin: 0, poison: 0, charging: null,
      intentIndex: 0, intents: e.intents,
      mods: e.mods || [], phases: e.phases || [], phaseIndex: 0,
      elite: !!e.elite, boss: !!e.boss,
    };
  });

  let deck;
  if (config.deck) {
    deck = config.deck.map((d) => makeCard(typeof d === 'string' ? d : d.id, { upgraded: !!d.upgraded }));
  } else {
    deck = [];
    party.forEach((pid) => CHARACTERS[pid].deck.forEach((cid) => deck.push(makeCard(cid))));
  }
  deck = shuffle(deck, rng);

  const relics = (config.relics || []).map((id) => ({ id, ...RELICS[id] })).filter((r) => r.name);
  const relicIds = relics.map((r) => r.id);
  const has = (id) => relicIds.includes(id);

  let egos = config.egos;
  if (!egos) {
    egos = [];
    party.forEach((pid) => (EGOS[pid] || []).slice(0, 2).forEach((e) => egos.push({ ...e })));
  } else {
    egos = egos.map((e) => (typeof e === 'string' ? findEgo(e) : { ...e })).filter(Boolean);
  }

  const synergy = computeSynergy(characters);
  const firstAp = (has('adrenal') ? 1 : 0) + (synergy.some((s) => s.id === 'edge') ? 1 : 0);
  const startShield = (has('plate') ? 10 : 0)
    + (synergy.some((s) => s.id === 'bastion') ? 5 : 0)
    + (leadId === 'momo' ? 5 : 0);
  const startEp = leadId === 'bibi' ? 2 : 0;
  const startResonance = (leadId === 'goro' ? 2 : 0) + (leadId === 'bibi' ? 1 : 0) + (has('synapse') ? 1 : 0);

  const state = {
    mission: { name: config.name || 'Skirmish', place: config.place || '', code: config.missionCode || 'run' },
    config, turn: 1, ap: AP_PER_TURN + firstAp, maxAp: AP_PER_TURN,
    characters, enemies,
    drawPile: deck, hand: [], discard: [], exhaust: [],
    ep: startEp, egoQueue: shuffle(egos, rng),
    sands: config.sands != null ? config.sands : SANDS_CHARGES,
    resonance: Math.min(MAX_RESONANCE, startResonance),
    echoNext: null, // { count, bonus }
    egosThisTurn: 0,
    cardsPlayed: 0, cardsPlayedThisTurn: 0, cardsUsedThisTurn: 0,
    lastTypePlayed: null, lastOwnerPlayed: null,
    epiphany: null, pendingEpiphany: null,
    extraDraw: has('synapse') ? 1 : 0, turnShield: 0, startShields: 0,
    passives: {
      onAtkFury: 0, onShieldCounter: 0, onShieldThorns: 0, teamBarricade: 0,
      onHealFury: 0, onStatusTickHeal: 0, onStatusTickRes: 0, onStatusTickFury: 0,
      onExhaustDmg: 0, onExhaustEp: 0,
      poisonPotency: 0, onPoisonTickRes: 0, onPoisonTickHeal: 0, onPoisonTickFury: 0,
    },
    relics, relicIds, synergy, has: undefined,
    freeFirstLeft: has('scabbard') ? 1 : 0,
    firstTurnBonusUsed: false,
    stats: { damage: 0, healed: 0, blocked: 0, stress: 0, maxHit: 0 },
    log: [], fx: [], result: null, rng, seed: seedNum,
    turnStartSnapshot: null, lastCardSnapshot: null,
    targetUid: enemies[0] ? enemies[0].uid : null,
    lastPlayed: null,
  };
  state.has = has;

  if (leadId === 'yuna') enemies.forEach((e) => { e.poison += 3; });
  if (startShield) characters.forEach((c) => { c.shield += startShield; });
  if (has('plate')) characters.forEach((c) => { c.counter += 3; });
  if (has('adrenal') && characters[0]) characters[0].fury += 2;
  if (has('metronome') && config.sands == null) state.sands += 1;

  const opening = [];
  state.drawPile = state.drawPile.filter((c) => {
    if ((c.tags || []).includes('Initiation')) { opening.push(c); return false; }
    return true;
  });

  log(state, `${state.mission.name.toUpperCase()}${state.mission.place ? ' — ' + state.mission.place : ''}`, 'system');
  const w = enemies[0] ? attrOf(enemies[0].weakness).name : '—';
  log(state, `Weakness: ${w}${enemies.length > 1 ? ' and others' : ''}`, 'info');
  synergy.forEach((s) => log(state, `SYNERGY — ${s.name}: ${s.desc}`, 'synergy'));
  beginTurn(state, true, opening, firstAp);
  return state;
}

function findEgo(id) {
  for (const list of Object.values(EGOS)) {
    const e = list.find((x) => x.id === id);
    if (e) return { ...e };
  }
  return null;
}

export function computeSynergy(characters) {
  const out = [];
  const lead = characters[0] && CHARACTERS[characters[0].id];
  if (lead && lead.leader) out.push({ id: `lead_${lead.id}`, name: `LEAD · ${lead.leader.name.toUpperCase()}`, desc: lead.leader.desc });
  const byAttr = {};
  characters.forEach((c) => { byAttr[c.attr] = (byAttr[c.attr] || 0) + 1; });
  const dup = Object.entries(byAttr).find(([, n]) => n >= 2);
  if (dup) out.push({ id: 'attuned', name: 'ATTUNED', desc: `${attrOf(dup[0]).name} ×2 → weakness damage +15%` });
  const cls = characters.map((c) => c.cls);
  if (cls.includes('vanguard') && cls.includes('controller')) out.push({ id: 'bastion', name: 'BASTION', desc: 'Start with +5 Shield & +1 Resonance on Shields.' });
  if (cls.includes('striker') && cls.includes('psionic')) out.push({ id: 'edge', name: 'EDGE', desc: '+1 AP Turn 1 & Cross-Chain Attacks +20% dmg.' });
  if (cls.includes('striker') && cls.includes('vanguard')) out.push({ id: 'counterstrike', name: 'PHALANX', desc: 'Counter hits grant Kaito +1 Fury.' });
  if ((cls.includes('controller') && cls.includes('psionic')) || (cls.includes('alchemist') && (cls.includes('controller') || cls.includes('psionic')))) out.push({ id: 'catalyst', name: 'CASCADE', desc: 'Bleed/Toxin/Poison stacks +1 extra on application.' });
  return out;
}

function log(state, text, kind = 'info') {
  state.log.push({ text, kind, turn: state.turn });
  if (state.log.length > 260) state.log.shift();
}

function clone(state) {
  const snap = { ...state, rng: null, has: null, turnStartSnapshot: null, lastCardSnapshot: null };
  return JSON.parse(JSON.stringify(snap));
}
function restore(state, snap) {
  if (!snap) return;
  Object.assign(state, JSON.parse(JSON.stringify(snap)), {
    rng: state.rng, has: state.has, turnStartSnapshot: state.turnStartSnapshot, lastCardSnapshot: state.lastCardSnapshot,
  });
}

// --- piles -----------------------------------------------------------------
function convertForBroken(state, card) {
  if (card.type === 'status') return card;
  const ch = state.characters.find((c) => c.id === card.owner);
  if (!ch || !ch.broken) return card;
  return { ...makeCard(`breakdown_${ch.id}`), uid: card.uid, origin: card.defId };
}

function drawCards(state, n) {
  let drawn = 0;
  for (let i = 0; i < n; i++) {
    if (state.hand.length >= HAND_CAP) { log(state, 'Hand is full (10).', 'warn'); break; }
    if (state.drawPile.length === 0) {
      if (state.discard.length === 0) break;
      state.drawPile = shuffle(state.discard, state.rng);
      state.discard = [];
      log(state, 'Draw pile empty — Graveyard reshuffled.', 'info');
    }
    let card = state.drawPile.pop();
    card = convertForBroken(state, card);
    if ((card.tags || []).includes('Lead') && state.rng() < 0.5 && !card.zeroCost) {
      card.cost = Math.max(0, card.cost - 1);
      card.leadApplied = true;
    }
    if (!card.glint && !card.token && state.rng() < 0.18) { card.glint = true; card.zeroCost = true; }
    state.hand.push(card);
    drawn++;
    if (card.onDrawStress) {
      const ch = state.characters.find((c) => c.id === card.owner);
      if (ch) addStress(state, ch, card.onDrawStress);
    }
  }
  return drawn;
}

// --- turn flow -------------------------------------------------------------
function beginTurn(state, first = false, opening = [], extraAp = 0) {
  state.ap = state.maxAp + (first ? extraAp : 0);
  state.cardsPlayedThisTurn = 0;
  state.cardsUsedThisTurn = 0;
  state.lastTypePlayed = null;
  state.lastOwnerPlayed = null;
  state.echoNext = null;
  state.egosThisTurn = 0;
  state.freeFirstLeft = state.relicIds.includes('scabbard') ? 1 : 0;
  state.characters.forEach((c) => {
    c.buffAtk = 0;
    c.taunt = 0;
  });

  state.hand.push(...opening);
  const drawN = Math.max(0, (first ? FIRST_DRAW : DRAW_PER_TURN) + state.extraDraw - (opening ? opening.length : 0));
  drawCards(state, drawN);

  if (state.turnShield > 0) state.characters.forEach((c) => { if (c.hp > 0) addShield(state, c, state.turnShield); });

  if (!state.epiphany && state.rng() < 0.42) {
    const pool = state.characters.filter((c) => !c.broken);
    if (pool.length) {
      const pick = pool[Math.floor(state.rng() * pool.length)];
      state.epiphany = pick.id;
      log(state, `Epiphany — ${pick.name} sparks! Next card triggers an Evolution choice.`, 'epiphany');
    }
  }
  state.turnStartSnapshot = clone(state);
  log(state, `— Turn ${state.turn} — ${state.ap} AP · ${state.hand.length} in hand · Res ${state.resonance}/${MAX_RESONANCE}`, 'turn');
}

function addResonance(state, amt) {
  if (!amt) return;
  const before = state.resonance;
  state.resonance = Math.min(MAX_RESONANCE, state.resonance + amt);
  if (state.resonance > before) {
    pushFx(state, { kind: 'resonance', amt: state.resonance - before, total: state.resonance });
  }
}

function addShield(state, ch, amount) {
  if (!ch || ch.hp <= 0) return 0;
  const total = amount + (ch.blockBonus || 0) + state.startShields;
  ch.shield += total;
  pushFx(state, { kind: 'shield', id: ch.id, name: ch.name, amt: total });
  if (state.passives.onShieldCounter) ch.counter += state.passives.onShieldCounter;
  if (state.passives.onShieldThorns) {
    const alive = state.enemies.filter((e) => e.hp > 0);
    if (alive.length) {
      const target = alive[Math.floor(state.rng() * alive.length)];
      damageEnemy(state, target, state.passives.onShieldThorns, { attr: 'order', cost: 0, triggerBleed: false, ignoreWeak: true });
    }
  }
  return total;
}

// --- damage & status engines -----------------------------------------------
function weakestTarget(state) {
  const alive = state.characters.filter((c) => c.hp > 0);
  const taunting = alive.filter((c) => c.taunt > 0);
  const pool = taunting.length ? taunting : alive;
  return pool[Math.floor(state.rng() * pool.length)];
}

function weaknessMult(state) {
  const base = state.relicIds.includes('lens') ? 1.75 : 1.5;
  return state.synergy && state.synergy.some((s) => s.id === 'attuned') ? base + 0.15 : base;
}

function hasEdgeChain(state, card) {
  return state.lastOwnerPlayed && card.owner && state.lastOwnerPlayed !== card.owner;
}

function teamShieldTotal(state) {
  return state.characters.reduce((n, c) => n + (c.hp > 0 ? c.shield : 0), 0);
}

// Unified attack math used by BOTH previewCard and playCard so card numbers never lie.
function computeAttackPlan(state, card, target, actor, { simulate = false } = {}) {
  const apCost = (state.freeFirstLeft > 0 && card.cost > 0) ? 0 : (card.zeroCost ? 0 : card.cost);
  const isChain = hasEdgeChain(state, card);
  const hasEdgeSyn = state.synergy && state.synergy.some((s) => s.id === 'edge');
  const spendLastAp = (state.ap - (simulate ? apCost : 0)) === 0;
  const totalShield = teamShieldTotal(state);

  let base = (card.dmg || 0) + (card.retainedDmg || 0);
  let bonus = actor ? (actor.str + actor.buffAtk + (actor.atkBonus || 0) + (actor.skillLv || 0)) : 0;
  if (card.retainedAtk) bonus += card.retainedAtk;

  if (card.shieldDmgPct) bonus += Math.round(totalShield * card.shieldDmgPct);
  if (card.consumeFury && actor) bonus += actor.fury * card.consumeFury;
  if (card.scaleFury && actor) bonus += actor.fury * card.scaleFury;
  if (card.scaleExhaust) bonus += state.exhaust.length * card.scaleExhaust;
  if (card.scaleTurnPlays) bonus += state.cardsPlayedThisTurn * card.scaleTurnPlays;
  if (card.scaleResonance) bonus += state.resonance * card.scaleResonance;
  // Poison-scaled attacks (Yuna): the more Poison on the target, the harder she hits.
  let poisonBonus = 0;
  if (card.dmgPerPoison && target) { poisonBonus = (target.poison || 0) * card.dmgPerPoison; bonus += poisonBonus; }

  let combo = 0;
  const prevType = simulate ? state.lastTypePlayed : (state.cardsPlayedThisTurn > 1 ? state.lastTypePlayed : null);
  if (card.combo && prevType === card.type && state.cardsPlayedThisTurn > (simulate ? 0 : 1)) {
    combo = card.combo;
    bonus += combo;
  }
  let finale = 0;
  if (card.finale && spendLastAp) {
    finale = card.finale;
    bonus += finale;
  }

  let per = (base + bonus) * (card.glint ? 1.4 : 1);
  if (card.stressBonusAt && actor && actor.stress >= card.stressBonusAt.at) per *= card.stressBonusAt.mult;
  if (isChain && card.chainMult) per *= card.chainMult;
  else if (isChain && hasEdgeSyn) per *= 1.2;
  if (state.echoNext && state.echoNext.bonus) per *= (1 + state.echoNext.bonus);

  const weak = !!(target && card.attr === target.weakness);
  if (weak) per *= weaknessMult(state);
  const ravaged = !!(target && target.ravaged);
  if (ravaged) per *= 1.3;
  const mark = target ? target.mark || 0 : 0;
  if (mark > 0) per *= 1.5;
  const vuln = target ? target.vuln || 0 : 0;
  if (vuln > 0) per *= 1.35;

  const canBurst = !!(card.forceBurst || (state.resonance >= BURST_COST && (card.cost >= 2 || card.finale || card.scaleResonance)));
  if (canBurst) per *= 1.6;

  const crit = !!(actor && (actor.critNext || (card.finaleCrit && spendLastAp)));
  if (crit) per *= 1.75;

  const perHit = Math.max(1, Math.round(per));
  const hits = card.hits || 1;
  return {
    perHit, hits, dmg: perHit * hits, poisonBonus,
    weak, ravaged, mark, vuln, crit, burst: canBurst, isChain, combo, finale,
    echoCount: state.echoNext ? state.echoNext.count : 0,
  };
}

function applyStatusStacks(state, enemy, { bleed = 0, toxin = 0, poison = 0 }) {
  const cascade = state.synergy && state.synergy.some((s) => s.id === 'catalyst') ? 1 : 0;
  if (bleed > 0) enemy.bleed += bleed + cascade;
  if (toxin > 0) enemy.toxin += toxin + cascade;
  if (poison > 0) enemy.poison = Math.min(POISON_CAP, enemy.poison + poison + cascade);
}

// POISON — Damage over Time. Stacks collect during the turn; at End Turn the
// enemy takes stacks x (POISON_PER_STACK + Potency) damage, then Poison -1.
// e.g. 10 Poison = 30 damage, then 9 stacks = 27, then 24... Potency is
// per-stack, so Incubate (x2 stacks) and Potency upgrades multiply together.
export function poisonPerStack(state) {
  return POISON_PER_STACK + ((state && state.passives.poisonPotency) || 0);
}
function poisonTickDamage(state, enemy) {
  return Math.max(0, (enemy.poison || 0) * poisonPerStack(state));
}
function tickPoison(state, enemy, { consumeAll = false } = {}) {
  if (!enemy || enemy.hp <= 0 || (enemy.poison || 0) <= 0) return 0;
  const stacks = enemy.poison;
  const dmg = poisonTickDamage(state, enemy);
  enemy.hp = Math.max(0, enemy.hp - dmg);
  state.stats.damage += dmg;
  enemy.poison = consumeAll ? 0 : Math.max(0, enemy.poison - 1);
  pushFx(state, { kind: 'poison', uid: enemy.uid, name: enemy.name, amt: dmg });
  log(state, `  POISON — ${enemy.name} takes ${dmg} DoT damage (${stacks} stack${stacks === 1 ? '' : 's'} x ${poisonPerStack(state)}/stack${consumeAll ? ', consumed' : ', -1 stack'}).`, 'weak');
  if (state.passives.onPoisonTickRes) addResonance(state, state.passives.onPoisonTickRes);
  if (state.passives.onPoisonTickHeal) {
    const y = state.characters.find((c) => c.id === 'yuna') || state.characters[0];
    if (y && y.hp > 0) healCharacter(state, y, state.passives.onPoisonTickHeal, 0);
  }
  if (state.passives.onPoisonTickFury) {
    const k = state.characters.find((c) => c.id === 'kaito') || state.characters[0];
    if (k && k.hp > 0) k.fury += state.passives.onPoisonTickFury;
  }
  onStatusTickPassives(state);
  if (enemy.hp <= 0) {
    log(state, `${enemy.name} melts to Poison! +1 EP`, 'kill');
    state.ep = Math.min(MAX_EP, state.ep + 1);
  }
  checkPhase(state, enemy);
  return dmg;
}
function resolveEndTurnPoison(state) {
  state.enemies.forEach((e) => { if (e.hp > 0) tickPoison(state, e); });
}

function onStatusTickPassives(state) {
  if (state.passives.onStatusTickHeal) {
    state.characters.forEach((c) => { if (c.hp > 0) healCharacter(state, c, state.passives.onStatusTickHeal, 0); });
  }
  if (state.passives.onStatusTickRes) addResonance(state, state.passives.onStatusTickRes);
  if (state.passives.onStatusTickFury) {
    const k = state.characters.find((c) => c.id === 'kaito') || state.characters[0];
    if (k) k.fury += state.passives.onStatusTickFury;
  }
}

function damageEnemy(state, enemy, raw, { attr = null, cost = 1, tenacityScale = 1, ignoreWeak = false, triggerBleed = false, actor = null, isCrit = false } = {}) {
  if (!enemy || enemy.hp <= 0) return { dealt: 0, broke: false };
  const dmg = Math.max(1, Math.round(raw));

  enemy.hp = Math.max(0, enemy.hp - dmg);
  state.stats.damage += dmg;
  if (dmg > state.stats.maxHit) state.stats.maxHit = dmg;

  const matched = !!(attr && attr === enemy.weakness && !ignoreWeak);
  pushFx(state, {
    kind: 'dmg', uid: enemy.uid, name: enemy.name, amt: dmg,
    weak: matched, ravaged: enemy.ravaged, crit: isCrit,
  });

  // Bleed triggers on attack hits!
  if (triggerBleed && enemy.bleed > 0 && enemy.hp > 0) {
    const bd = enemy.bleed;
    enemy.hp = Math.max(0, enemy.hp - bd);
    state.stats.damage += bd;
    enemy.bleed = Math.max(0, enemy.bleed - 1);
    pushFx(state, { kind: 'bleed', uid: enemy.uid, name: enemy.name, amt: bd });
    log(state, `  Bleed ruptures ${enemy.name} for ${bd} piercing dmg.`, 'weak');
    onStatusTickPassives(state);
  }

  let broke = false;
  if (!enemy.ravaged && enemy.tenacity > 0 && cost > 0) {
    const ten = Math.round((3 + cost * 2) * tenacityScale * (matched ? 2.5 : 1));
    if (enemy.mods.includes('immuneRavage')) {
      enemy.tenacity = Math.max(1, enemy.tenacity - Math.round(ten * 0.25));
    } else {
      enemy.tenacity = Math.max(0, enemy.tenacity - ten);
      if (enemy.tenacity === 0) broke = breakEnemy(state, enemy);
    }
  }
  if (enemy.hp === 0) {
    log(state, `${enemy.name} is destroyed. +1 EP`, 'kill');
    state.ep = Math.min(MAX_EP, state.ep + 1);
  }
  checkPhase(state, enemy);
  return { dealt: dmg, broke };
}

function detonateEnemy(state, enemy, times = 1, bleedOnly = false) {
  let total = 0;
  for (let t = 0; t < times; t++) {
    if (enemy.hp <= 0) break;
    const amt = enemy.bleed + (bleedOnly ? 0 : enemy.toxin);
    if (amt <= 0) break;
    enemy.hp = Math.max(0, enemy.hp - amt);
    state.stats.damage += amt;
    total += amt;
    pushFx(state, { kind: bleedOnly ? 'bleed' : 'toxin', uid: enemy.uid, name: enemy.name, amt });
    onStatusTickPassives(state);
  }
  if (total > 0) {
    log(state, `DETONATE — ${enemy.name} erupts for ${total} status damage!`, 'weak');
    if (enemy.hp === 0) {
      log(state, `${enemy.name} is destroyed. +1 EP`, 'kill');
      state.ep = Math.min(MAX_EP, state.ep + 1);
    }
    checkPhase(state, enemy);
  }
  return total;
}

function checkPhase(state, enemy) {
  while (enemy.phases && enemy.phaseIndex < enemy.phases.length) {
    const ph = enemy.phases[enemy.phaseIndex];
    if (enemy.hp / enemy.maxHp > ph.at) break;
    enemy.weakness = ph.weakness || enemy.weakness;
    if (ph.name) enemy.name = ph.name;
    enemy.phaseIndex += 1;
    enemy.counter = enemy.maxCounter;
    log(state, `PHASE SHIFT — ${enemy.name}. Weakness is now ${attrOf(enemy.weakness).name}.`, 'break');
    pushFx(state, { kind: 'phase', uid: enemy.uid, name: enemy.name, weakness: enemy.weakness });
  }
}

function breakEnemy(state, enemy) {
  enemy.ravaged = true;
  enemy.counter = Math.min(6, enemy.counter + 1);
  state.ap += 1;
  state.characters.forEach((c) => { c.stress = Math.max(0, c.stress - 10); });
  if (state.relicIds.includes('suture')) {
    state.characters.forEach((c) => {
      if (c.hp > 0) { healCharacter(state, c, 8); c.fury += 1; }
    });
  }
  pushFx(state, { kind: 'break', uid: enemy.uid, name: enemy.name });
  log(state, `TENACITY BROKEN — ${enemy.name} Ravaged! +1 AP, stress relieved, counter +1.`, 'break');
  return true;
}

function damageCharacter(state, ch, raw, attacker = null) {
  if (!ch || ch.hp <= 0) return { hpLost: 0, absorbed: 0 };
  let incoming = raw;
  if (ch.fortitude > 0) incoming = Math.round(incoming * 0.8);
  let remaining = incoming;
  if (ch.shield > 0) {
    const absorbed = Math.min(ch.shield, remaining);
    ch.shield -= absorbed;
    remaining -= absorbed;
    state.stats.blocked += absorbed;
  }

  // Counter retaliation fires even when Shield blocks!
  if (ch.counter > 0 && attacker && attacker.hp > 0) {
    let ctr = ch.counter + ch.str;
    if (ch.attr === attacker.weakness) ctr = Math.round(ctr * weaknessMult(state));
    if (attacker.ravaged) ctr = Math.round(ctr * 1.3);
    if (attacker.mark > 0) ctr = Math.round(ctr * 1.5);
    if (attacker.vuln > 0) ctr = Math.round(ctr * 1.35);
    pushFx(state, { kind: 'counter', id: ch.id, name: ch.name, amt: ctr });
    log(state, `COUNTER — ${ch.name} strikes back at ${attacker.name} for ${ctr}!`, 'combo');
    damageEnemy(state, attacker, ctr, { attr: ch.attr, cost: 0, triggerBleed: true });
    if (state.synergy && state.synergy.some((s) => s.id === 'counterstrike')) {
      const k = state.characters.find((c) => c.id === 'kaito') || ch;
      k.fury += 1;
    }
  }

  if (remaining <= 0) {
    log(state, `${ch.name}'s Shield holds — no damage, no Stress.`, 'block');
    return { hpLost: 0, absorbed: raw };
  }
  const before = ch.hp;
  ch.hp = Math.max(0, ch.hp - remaining);
  const lost = before - ch.hp;
  const stress = Math.max(6, Math.round(remaining * 1.5) + 4);
  pushFx(state, { kind: 'hurt', id: ch.id, name: ch.name, amt: lost });
  addStress(state, ch, stress);
  log(state, `${ch.name} takes ${lost} damage (+${stress} Stress).`, 'hurt');
  return { hpLost: lost, absorbed: raw - remaining };
}

function addStress(state, ch, amount) {
  if (ch.broken) return;
  let amt = amount;
  if (state.relicIds.includes('vagus')) amt = Math.round(amt * 0.75);
  const before = ch.stress;
  ch.stress = Math.min(STRESS_MAX, ch.stress + amt);
  if (ch.stress > before) {
    state.stats.stress += ch.stress - before;
    pushFx(state, { kind: 'stress', id: ch.id, name: ch.name, amt: ch.stress - before });
    if (ch.id === 'kaito') ch.fury += 1;
  }
  if (ch.stress >= STRESS_MAX) triggerBreakdown(state, ch);
}

export function triggerBreakdown(state, ch) {
  if (ch.broken) return;
  ch.broken = true;
  ch.stress = STRESS_MAX;
  ch.lockedHp = Math.floor(ch.maxHp / 3);
  const floorHp = Math.max(1, ch.maxHp - ch.lockedHp);
  if (ch.hp > floorHp) ch.hp = floorHp;
  ch.recovery = 0;
  ch.breakdownCount += 1;
  pushFx(state, { kind: 'breakdown', id: ch.id, name: ch.name });
  log(state, `MENTAL BREAKDOWN — ${ch.name}. ${ch.lockedHp} HP locked, Ego sealed.`, 'breakdown');
  state.hand = state.hand.map((c) => convertForBroken(state, c));
  state.drawPile = state.drawPile.map((c) => convertForBroken(state, c));
}

function recover(state, ch) {
  ch.broken = false;
  ch.stress = 0;
  ch.recovery = 0;
  ch.lockedHp = 0;
  ch.hp = ch.maxHp;
  ch.egoFree = true;
  ch.str += 2;
  pushFx(state, { kind: 'recover', id: ch.id, name: ch.name });
  state.characters.forEach((c) => { if (c.hp > 0) c.hp = Math.min(c.maxHp - (c.lockedHp || 0), c.hp + Math.ceil(ch.maxHp / 2)); });
  log(state, `${ch.name} recovers! Stress 0, +2 Strength, Ego cost 0.`, 'recover');
  // The character is whole again — any Breakdown cards still sitting in the
  // piles (converted during the breakdown, or re-dealt from the discard)
  // become normal cards again so they don't keep playing after recovery.
  const restore = (c) => (c.breakdown ? { ...makeCard(c.origin || `breakdown_${ch.id}`), uid: c.uid } : c);
  state.hand = state.hand.map(restore);
  state.drawPile = state.drawPile.map(restore);
  state.discard = state.discard.map(restore);
}

function healCharacter(state, ch, amount, stressHeal = 0) {
  if (!ch || ch.hp <= 0) return { healed: 0, wasFull: false };
  const cap = ch.maxHp - (ch.lockedHp || 0);
  const wasFull = ch.hp >= cap;
  const healed = Math.max(0, Math.min(amount, cap - ch.hp));
  ch.hp += healed;
  if (healed > 0) {
    state.stats.healed += healed;
    pushFx(state, { kind: 'heal', id: ch.id, name: ch.name, amt: healed });
  }
  if (stressHeal > 0) ch.stress = Math.max(0, ch.stress - (healed > 0 || wasFull ? stressHeal : Math.round(stressHeal * 0.5)));
  if (state.passives.onHealFury && (healed > 0 || stressHeal > 0)) ch.fury += state.passives.onHealFury;
  return { healed, wasFull, hitFull: ch.hp >= cap };
}

function exhaustCard(state, card) {
  state.exhaust.push(card);
  if (state.passives.onExhaustEp) state.ep = Math.min(MAX_EP, state.ep + state.passives.onExhaustEp);
  if (state.passives.onExhaustDmg) {
    state.enemies.filter((e) => e.hp > 0).forEach((e) => {
      damageEnemy(state, e, state.passives.onExhaustDmg, { attr: 'void', cost: 0 });
    });
  }
}

// --- 3-Choice Epiphany mutation --------------------------------------------
function buildEpiphanyOptions(state, charId) {
  const pool = CHARACTERS[charId].deck.filter((cid) => CARDS[cid].type !== 'upgrade');
  const baseId = pool[Math.floor(state.rng() * pool.length)];
  const base = makeCard(baseId, { glint: true });
  return EPIPHANY_BRANCHES.map((b) => {
    const mutated = makeCard(baseId, { glint: true });
    mutated.cost = 0;
    mutated.zeroCost = true;
    mutated.epiphanyCard = true;
    mutated.tags = [...(mutated.tags || []), b.name];
    if (b.id === 'brutal') {
      mutated.name = `${base.name} [Brutal]`;
      if (mutated.dmg) mutated.dmg += 8;
      if (mutated.shield) mutated.shield += 8;
      if (mutated.teamShield) mutated.teamShield += 5;
      mutated.bleed = (mutated.bleed || 0) + 3;
      mutated.str = (mutated.str || 0) + 2;
      mutated.text = `${mutated.text} +8 power, +3 Bleed, +2 Strength.`;
    } else if (b.id === 'flow') {
      mutated.name = `${base.name} [Flow]`;
      if (!mutated.tags.includes('Haste')) mutated.tags.push('Haste');
      mutated.draw = (mutated.draw || 0) + 1;
      mutated.apGain = (mutated.apGain || 0) + 1;
      mutated.text = `${mutated.text} Haste. Draw 1, +1 AP.`;
    } else {
      mutated.name = `${base.name} [Surge]`;
      if (!mutated.tags.includes('Retain')) mutated.tags.push('Retain');
      mutated.resonance = (mutated.resonance || 0) + 2;
      mutated.fury = (mutated.fury || 0) + 2;
      mutated.text = `${mutated.text} Retain. +2 Resonance, +2 Fury.`;
    }
    return { branchId: b.id, label: b.name, color: b.color, desc: b.desc, card: mutated };
  });
}

export function chooseEpiphany(state, idx = 0) {
  const p = state.pendingEpiphany;
  if (!p) return null;
  const opt = p.options[idx] || p.options[0];
  state.pendingEpiphany = null;
  if (opt && state.hand.length < HAND_CAP) {
    state.hand.push(opt.card);
    log(state, `EPIPHANY (${opt.label}) — ${opt.card.name} added to hand!`, 'epiphany');
  }
  return opt ? opt.card : null;
}

// --- play a card -----------------------------------------------------------
export function playCard(state, handIndex, targetUid = null) {
  if (state.result) return { ok: false, reason: 'Battle over' };
  const card = state.hand[handIndex];
  if (!card) return { ok: false, reason: 'No such card' };
  if (card.unplayable) { log(state, `${card.name} cannot be played.`, 'warn'); return { ok: false, reason: 'Unplayable' }; }

  let cost = card.zeroCost ? 0 : card.cost;
  if (state.freeFirstLeft > 0 && cost > 0) { cost = 0; state.freeFirstLeft -= 1; }
  if (cost > state.ap) return { ok: false, reason: 'Not enough AP' };

  const owner = state.characters.find((c) => c.id === card.owner);
  const actor = owner || state.characters[0];
  state.lastCardSnapshot = clone(state);
  state.ap -= cost;
  state.hand.splice(handIndex, 1);
  state.cardsPlayed += 1;
  state.cardsPlayedThisTurn += 1;
  state.cardsUsedThisTurn += 1;
  state.lastPlayed = { cardId: card.defId, name: card.name, cost };

  const isChain = hasEdgeChain(state, card);
  if (isChain) {
    addResonance(state, 1);
    pushFx(state, { kind: 'chain', name: owner ? owner.name : 'TEAM' });
    log(state, `  TAG CHAIN — ${owner ? owner.name : 'Squad'} links (+1 Resonance)!`, 'combo');
  }

  log(state, `${owner ? owner.name : 'Team'} plays ${card.name}${cost === 0 ? ' (0 AP)' : ` (${cost} AP)`}${card.glint ? ' — Epiphany' : ''}`, 'play');

  if (card.breakdown) {
    const ch = state.characters.find((c) => c.id === card.owner);
    state.discard.push(card);
    if (ch && ch.broken) {
      ch.recovery += 1;
      const need = RECOVERY_PLAYS[Math.min(ch.breakdownCount - 1, RECOVERY_PLAYS.length - 1)];
      log(state, `${ch.name} recovery ${ch.recovery}/${need}`, 'info');
      if (ch.recovery >= need) recover(state, ch);
    }
    advanceCounters(state, 1);
    checkResult(state);
    return { ok: true, card };
  }
  if (card.type === 'curse') { state.discard.push(card); return { ok: true, card }; }

  const target = state.enemies.find((e) => e.uid === (targetUid || state.targetUid)) || state.enemies.find((e) => e.hp > 0);
  const mult = card.glint ? 1.4 : 1;
  const skillLv = actor ? actor.skillLv || 0 : 0;

  if (card.type === 'skill') addResonance(state, 1);
  if (card.type === 'attack' && state.passives.onAtkFury && actor) actor.fury += state.passives.onAtkFury;

  // --- Attack Resolution (including Echo/Prism double-cast & Resonance Burst) ---
  if (card.dmg > 0 || card.shieldDmgPct) {
    const plan = computeAttackPlan(state, card, target, actor, { simulate: false });
    const casts = 1 + plan.echoCount;
    if (state.echoNext) state.echoNext = null;
    if (plan.burst) {
      state.resonance = Math.max(0, state.resonance - BURST_COST);
      state.ep = Math.min(MAX_EP, state.ep + 1);
      log(state, `  RESONANCE BURST! ×1.6 Damage & +1 EP!`, 'epiphany');
    }
    if (plan.combo) log(state, `  COMBO +${plan.combo}`, 'combo');
    if (plan.finale) log(state, `  FINALE +${plan.finale}`, 'combo');
    if (plan.crit && actor && actor.critNext) actor.critNext = false;
    if (card.consumeFury && actor && actor.fury > 0) {
      log(state, `  Consumed ${actor.fury} Fury (+${actor.fury * card.consumeFury} dmg)!`, 'combo');
      actor.fury = 0;
    }

    const targets = card.aoe ? state.enemies.filter((e) => e.hp > 0) : [target].filter(Boolean);
    let dealtFirstTarget = 0;
    for (let cIdx = 0; cIdx < casts; cIdx++) {
      if (cIdx > 0) log(state, `  PRISM ECHO — ${card.name} fires again!`, 'epiphany');
      targets.forEach((e) => {
        if (e.hp <= 0) return;
        const p = cIdx === 0 && e === targets[0]
          ? plan
          : computeAttackPlan(state, card, e, actor, { simulate: false });
        for (let i = 0; i < p.hits; i++) {
          if (e.hp <= 0) break;
          const res = damageEnemy(state, e, p.perHit, {
            attr: card.attr, cost: card.cost, actor, triggerBleed: true, isCrit: p.crit,
          });
          if (e === targets[0]) dealtFirstTarget += res.dealt;
        }
        if (card.bleed) applyStatusStacks(state, e, { bleed: card.bleed });
        if (card.toxin) applyStatusStacks(state, e, { toxin: card.toxin });
        if (card.mark) e.mark = Math.max(e.mark, card.mark);
        if (card.vuln) e.vuln = Math.max(e.vuln, card.vuln);
        if (card.detonateBleed) detonateEnemy(state, e, card.detonateBleed, true);
        if (card.detonateAll) {
          const dTotal = detonateEnemy(state, e, card.detonateAll, false);
          if (card.healPctStatus && dTotal > 0) {
            const h = Math.max(1, Math.round(dTotal * card.healPctStatus));
            state.characters.forEach((c) => { if (c.hp > 0) healCharacter(state, c, h, 0); });
          }
        }
      });
    }
    if (card.shieldHalfDmg && actor && dealtFirstTarget > 0) addShield(state, actor, Math.max(4, Math.floor(dealtFirstTarget / 2)));
    if (isChain && card.chainMult) { state.ap += 1; log(state, '  Chain bonus: +1 AP!', 'combo'); }
  }

  // --- Poison & status application (attacks + skills alike, applied once) ---
  if (card.poison) {
    const list = card.aoe ? state.enemies.filter((e) => e.hp > 0) : [target].filter((e) => e && e.hp > 0);
    list.forEach((e) => applyStatusStacks(state, e, { poison: card.poison }));
    if (list.length) log(state, `  +${card.poison} Poison${card.aoe ? ' to all enemies' : ''} (ticks at End Turn).`, 'weak');
  }
  if (card.poisonAll) {
    state.enemies.filter((e) => e.hp > 0).forEach((e) => applyStatusStacks(state, e, { poison: card.poisonAll }));
    log(state, `  +${card.poisonAll} Poison to ALL enemies.`, 'weak');
  }
  if (card.toxin && !(card.dmg > 0) && target && target.hp > 0) applyStatusStacks(state, target, { toxin: card.toxin });
  if (card.bleed && !(card.dmg > 0) && target && target.hp > 0) applyStatusStacks(state, target, { bleed: card.bleed });
  if (card.vulnAll) state.enemies.forEach((e) => { if (e.hp > 0) e.vuln = Math.max(e.vuln, card.vulnAll); });
  if (card.doublePoison && target && target.hp > 0) {
    // Incubate doubles the stack, but gains at most +6 — no exponential snowball.
    target.poison = Math.min(POISON_CAP, target.poison + Math.min(target.poison, 6));
    log(state, `  INCUBATE — ${target.name} Poison DOUBLED to ${target.poison}!`, 'epiphany');
  }
  if (card.triggerPoisonTick && target) tickPoison(state, target);
  if (card.detonatePoison && target && target.hp > 0 && target.poison > 0) {
    const stacks = target.poison;
    const healed = tickPoison(state, target, { consumeAll: true });
    if (healed > 0) state.characters.forEach((c) => { if (c.hp > 0) healCharacter(state, c, stacks, 0); });
    log(state, `  NECROTIC FEAST — detonated ${stacks} Poison for ${healed} and healed the team.`, 'epiphany');
  }

  // --- Skill / Buff / Engine Effects ---
  if (card.shield) addShield(state, actor, Math.round((card.shield + skillLv) * mult));
  if (card.teamShield) state.characters.forEach((c) => { if (c.hp > 0) addShield(state, c, Math.round((card.teamShield + skillLv) * mult)); });
  if (card.counter && actor) actor.counter += card.counter;
  if (card.teamCounter) state.characters.forEach((c) => { if (c.hp > 0) c.counter += card.teamCounter; });
  if (isChain && card.chainTeamCounter) state.characters.forEach((c) => { if (c.hp > 0) c.counter += card.chainTeamCounter; });
  if (card.barricade && actor) actor.barricade = Math.max(actor.barricade, card.barricade);
  if (card.barricade >= 2 && card.teamShield) state.characters.forEach((c) => { if (c.hp > 0) c.barricade = Math.max(c.barricade, 2); });

  if (card.heal && actor) {
    const beforeStress = actor.stress;
    healCharacter(state, actor, Math.round((card.heal + skillLv) * mult), card.stressHeal || 0);
    if (card.highStressStr && beforeStress >= card.highStressStr.at) {
      actor.str += card.highStressStr.str;
      log(state, `  High-Stress Surge: ${actor.name} gains +${card.highStressStr.str} Strength!`, 'combo');
    }
  }
  if (card.teamHeal) {
    state.characters.forEach((c) => {
      if (c.hp <= 0) return;
      const hres = healCharacter(state, c, Math.round((card.teamHeal + skillLv) * mult), card.teamStressHeal || 0);
      if (card.purifyStr && hres.hitFull) {
        c.str += card.purifyStr;
        log(state, `  PURIFY — ${c.name} gains +${card.purifyStr} Strength!`, 'combo');
      }
    });
  }
  if (card.teamStressHeal && !card.teamHeal) state.characters.forEach((c) => { c.stress = Math.max(0, c.stress - card.teamStressHeal); });
  if (card.stressHeal && !card.heal && actor) actor.stress = Math.max(0, actor.stress - card.stressHeal);
  if (card.selfStress && actor) addStress(state, actor, card.selfStress);

  if (card.str && actor) actor.str += card.str;
  if (card.teamStr) state.characters.forEach((c) => { if (c.hp > 0) c.str += card.teamStr; });
  if (card.fury && actor) actor.fury += card.fury;
  if (card.stressStr && actor && actor.stress >= card.stressStr.at) actor.str += card.stressStr.str;
  if (card.critNext && actor) actor.critNext = true;
  if ((card.buffAtk || card.retainedAtk) && actor) actor.buffAtk += (card.buffAtk || 0) + (card.retainedAtk || 0);
  if (card.teamBuffAtk) state.characters.forEach((c) => { if (c.hp > 0) c.buffAtk += card.teamBuffAtk; });
  if (card.taunt && actor) { state.characters.forEach((c) => { c.taunt = 0; }); actor.taunt = card.taunt; }
  if (card.fortitude && actor) actor.fortitude = Math.max(actor.fortitude, card.fortitude);
  if (card.weakenAll) state.enemies.forEach((e) => { if (e.hp > 0) e.weaken = Math.max(e.weaken, card.weakenAll); });
  if (card.echoNext) state.echoNext = { count: card.echoNext, bonus: card.echoBonus || 0 };
  if (card.resonance) addResonance(state, card.resonance);
  if (card.tokenToxin && target) applyStatusStacks(state, target, { toxin: card.tokenToxin });

  if (card.doubleStatus) {
    const list = card.doubleStatusAoe ? state.enemies.filter((e) => e.hp > 0) : [target].filter(Boolean);
    list.forEach((e) => {
      e.bleed *= 2;
      e.toxin *= 2;
      e.poison = Math.min(POISON_CAP, (e.poison || 0) * 2);
      log(state, `CATALYST — ${e.name} Bleed (${e.bleed}), Toxin (${e.toxin}) & Poison (${e.poison}) DOUBLED!`, 'epiphany');
    });
  }

  if (isChain && card.chainAp) state.ap += card.chainAp;
  if (isChain && card.chainTeamStr) state.characters.forEach((c) => { if (c.hp > 0) c.str += card.chainTeamStr; });

  if (card.spawnTokens) {
    for (let t = 0; t < card.spawnTokens.count; t++) {
      if (state.hand.length >= HAND_CAP) break;
      state.hand.push(makeCard(card.spawnTokens.id));
    }
    log(state, `Added ${card.spawnTokens.count}× ${CARDS[card.spawnTokens.id].name} to hand.`, 'info');
  }

  if (card.retrieve && state.discard.length) {
    // Smart retrieve: pick highest Attack card in Graveyard!
    const atkIdx = state.discard
      .map((c, idx) => ({ c, idx }))
      .sort((a, b) => (b.c.dmg || 0) - (a.c.dmg || 0))[0]?.idx;
    if (atkIdx != null && state.hand.length < HAND_CAP) {
      const [pick] = state.discard.splice(atkIdx, 1);
      if (card.retrieveDiscount) pick.cost = Math.max(0, pick.cost - card.retrieveDiscount);
      state.hand.push(convertForBroken(state, pick));
      log(state, `RETRIEVE — ${pick.name} pulled from Graveyard (${pick.cost} AP).`, 'combo');
    }
  }

  if (card.apGain) { state.ap += card.apGain; log(state, `+${card.apGain} AP`, 'info'); }
  if (card.draw) drawCards(state, card.draw);
  if (card.maxAp) { state.maxAp += card.maxAp; state.ap += card.maxAp; }
  if (card.turnShield) state.turnShield += card.turnShield;
  if (card.blockBonus) { state.startShields += card.blockBonus; state.characters.forEach((c) => { c.blockBonus += card.blockBonus; }); }
  if (card.extraDraw) state.extraDraw += card.extraDraw;
  if (card.firstAp && state.turn === 1) state.ap += card.firstAp;

  // Upgrade passives
  if (card.onAtkFury) state.passives.onAtkFury += card.onAtkFury;
  if (card.onShieldCounter) state.passives.onShieldCounter += card.onShieldCounter;
  if (card.onShieldThorns) state.passives.onShieldThorns += card.onShieldThorns;
  if (card.teamBarricade) state.passives.teamBarricade = Math.max(state.passives.teamBarricade, card.teamBarricade);
  if (card.onHealFury) state.passives.onHealFury += card.onHealFury;
  if (card.onStatusTickHeal) state.passives.onStatusTickHeal += card.onStatusTickHeal;
  if (card.onStatusTickRes) state.passives.onStatusTickRes += card.onStatusTickRes;
  if (card.onStatusTickFury) state.passives.onStatusTickFury += card.onStatusTickFury;
  if (card.onExhaustDmg) state.passives.onExhaustDmg += card.onExhaustDmg;
  if (card.onExhaustEp) state.passives.onExhaustEp += card.onExhaustEp;
  if (card.poisonPotency) state.passives.poisonPotency += card.poisonPotency;
  if (card.onPoisonTickRes) state.passives.onPoisonTickRes += card.onPoisonTickRes;
  if (card.onPoisonTickHeal) state.passives.onPoisonTickHeal += card.onPoisonTickHeal;
  if (card.onPoisonTickFury) state.passives.onPoisonTickFury += card.onPoisonTickFury;

  // Epiphany 3-choice trigger
  if (state.epiphany && owner && state.epiphany === owner.id && !state.pendingEpiphany) {
    state.pendingEpiphany = {
      charId: owner.id,
      charName: owner.name,
      options: buildEpiphanyOptions(state, owner.id),
    };
    state.epiphany = null;
  }

  // Celestial auto-fire on 2+ AP cards
  if (card.cost >= 2) {
    const idx = state.hand.findIndex((c) => (c.tags || []).includes('Celestial') && !c.zeroCost);
    if (idx >= 0) {
      const cel = state.hand[idx];
      state.hand.splice(idx, 1);
      log(state, `CELESTIAL — ${cel.name} activates automatically.`, 'celestial');
      pushFx(state, { kind: 'celestial', name: cel.name });
      if (cel.teamShield) state.characters.forEach((c) => { if (c.hp > 0) addShield(state, c, cel.teamShield); });
      if (cel.shield) addShield(state, state.characters.find((c) => c.id === cel.owner) || state.characters[0], cel.shield);
      if (cel.chainTeamCounter) state.characters.forEach((c) => { if (c.hp > 0) c.counter += cel.chainTeamCounter; });
      state.discard.push(cel);
    }
  }

  state.lastTypePlayed = card.type;
  if (card.owner && card.owner !== 'enemy') state.lastOwnerPlayed = card.owner;

  if (card.type === 'upgrade') {
    exhaustCard(state, card);
    log(state, `${card.name} stays active for the fight.`, 'upgrade');
  } else if ((card.tags || []).includes('Exhaust')) {
    exhaustCard(state, card);
  } else {
    state.discard.push(card);
  }

  if (state.cardsPlayed % 2 === 0) state.ep = Math.min(MAX_EP, state.ep + 1);

  const advances = !(card.tags || []).includes('Haste');
  if (advances) advanceCounters(state, 1);

  if (state.epiphany) {
    const e = state.characters.find((c) => c.id === state.epiphany);
    if (!e || e.broken) state.epiphany = null;
  }
  checkResult(state);
  return { ok: true, card };
}

function advanceCounters(state, times) {
  for (let t = 0; t < times; t++) {
    state.enemies.forEach((e) => {
      if (e.hp <= 0) return;
      e.counter -= 1;
      if (e.counter <= 0) enemyAct(state, e);
    });
    if (state.result) return;
  }
}

function enemyAct(state, enemy) {
  const alive = state.characters.filter((c) => c.hp > 0);
  if (!alive.length) { checkResult(state); return; }

  // Toxin ticks whenever enemy acts!
  if (enemy.toxin > 0 && enemy.hp > 0) {
    const td = enemy.toxin;
    enemy.hp = Math.max(0, enemy.hp - td);
    state.stats.damage += td;
    enemy.tenacity = Math.max(0, enemy.tenacity - Math.ceil(td / 2));
    enemy.toxin = Math.max(0, td - Math.max(1, Math.floor(td * 0.25)));
    pushFx(state, { kind: 'toxin', uid: enemy.uid, name: enemy.name, amt: td });
    log(state, `  Toxin deals ${td} dmg to ${enemy.name}!`, 'weak');
    onStatusTickPassives(state);
    if (enemy.tenacity === 0 && !enemy.ravaged && !enemy.mods.includes('immuneRavage')) breakEnemy(state, enemy);
    if (enemy.hp <= 0) {
      log(state, `${enemy.name} succumbs to Toxin! +1 EP`, 'kill');
      state.ep = Math.min(MAX_EP, state.ep + 1);
      checkResult(state);
      return;
    }
    checkPhase(state, enemy);
  }

  if (enemy.charging) {
    enemy.charging.turns -= 1;
    if (enemy.charging.turns > 0) {
      log(state, `${enemy.name} keeps charging — ${enemy.charging.value} incoming.`, 'enemy');
      enemy.counter = resetCounter(state, enemy);
      return;
    }
    const value = enemy.charging.value;
    enemy.charging = null;
    const target = weakestTarget(state);
    log(state, `${enemy.name} UNLEASHES ${value}!`, 'enemy');
    damageCharacter(state, target, Math.round(value * (enemy.weaken > 0 ? 0.65 : 1)), enemy);
    enemy.counter = resetCounter(state, enemy);
    tickEnemy(state, enemy);
    checkResult(state);
    return;
  }

  const intent = enemy.intents[enemy.intentIndex % enemy.intents.length];
  log(state, `${enemy.name} acts — ${intent.type}`, 'enemy');
  tickEnemy(state, enemy);
  const weaken = enemy.weaken > 0 ? 0.65 : 1;

  if (intent.type === 'attack') {
    damageCharacter(state, weakestTarget(state), Math.round((intent.value + enemy.atkBuff) * weaken), enemy);
  } else if (intent.type === 'charge') {
    enemy.charging = { value: Math.round(intent.value * weaken), turns: intent.turns || 2 };
    log(state, `${enemy.name} begins charging — ${enemy.charging.value} in ${enemy.charging.turns}.`, 'enemy');
  } else if (intent.type === 'debuff') {
    state.characters.forEach((c) => { if (c.hp > 0) addStress(state, c, intent.value); });
    log(state, `Stress +${intent.value} to the team.`, 'stress');
    if (intent.curse && CARDS[intent.curse]) {
      const c = makeCard(intent.curse);
      c.owner = state.characters[0] ? state.characters[0].id : 'kaito';
      state.discard.push(c);
      log(state, `${c.name} curse slipped into the Graveyard!`, 'breakdown');
      pushFx(state, { kind: 'curse', name: c.name });
    }
  } else if (intent.type === 'defend') {
    enemy.tenacity = Math.min(enemy.maxTenacity, enemy.tenacity + intent.value);
    log(state, `${enemy.name} recovers ${intent.value} Tenacity.`, 'info');
  } else if (intent.type === 'buff') {
    enemy.atkBuff += intent.value;
    log(state, `${enemy.name} gains +${intent.value} Attack.`, 'info');
  } else if (intent.type === 'heal') {
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + intent.value);
  }

  enemy.intentIndex += 1;
  enemy.counter = resetCounter(state, enemy);
  checkResult(state);
}

function resetCounter(state, enemy) {
  const quick = enemy.mods.includes('quick') ? 1 : 0;
  return Math.max(1, enemy.maxCounter + enemy.counterBonus - quick);
}

function tickEnemy(state, enemy) {
  if (enemy.weaken > 0) enemy.weaken -= 1;
  if (enemy.mark > 0) enemy.mark -= 1;
  if (enemy.vuln > 0) enemy.vuln -= 1;
  if (enemy.mods.includes('regen') && enemy.tenacity < enemy.maxTenacity) {
    enemy.tenacity = Math.min(enemy.maxTenacity, enemy.tenacity + 8);
  }
}

export function endTurn(state) {
  if (state.result) return state;
  if (state.pendingEpiphany) chooseEpiphany(state, 0);

  // POISON (Damage over Time) resolves when the turn ends, before the next
  // turn begins — stacks collected this turn melt the enemy now.
  resolveEndTurnPoison(state);
  checkResult(state);
  if (state.result) return state;

  const retained = [];
  state.hand.forEach((c) => {
    if ((c.tags || []).includes('Retain')) {
      c.zeroCost = false;
      c.glint = false;
      if (c.retainGrowAtk) c.retainedAtk = (c.retainedAtk || 0) + c.retainGrowAtk;
      if (c.retainGrowDmg) c.retainedDmg = (c.retainedDmg || 0) + c.retainGrowDmg;
      if (c.retainDiscount) c.cost = Math.max(0, c.cost - c.retainDiscount);
      retained.push(c);
    } else {
      state.discard.push(c);
    }
  });
  state.hand = retained;

  state.characters.forEach((c) => {
    const keepLv = Math.max(c.barricade || 0, state.passives.teamBarricade || 0);
    if (c.shield > 0) {
      if (keepLv >= 2) { /* keep 100% */ }
      else if (keepLv === 1) c.shield = Math.floor(c.shield * 0.5);
      else c.shield = 0;
    }
    if (c.barricade > 0) c.barricade -= 1;
    if (c.fortitude > 0) c.fortitude -= 1;
    if (c.counter > 0) c.counter = Math.floor(c.counter * 0.75);
  });

  state.turn += 1;
  beginTurn(state, false, []);
  return state;
}

export function playEgo(state, index, { exalt = false } = {}) {
  if (state.result) return { ok: false, reason: 'Battle over' };
  const ego = state.egoQueue[index];
  if (!ego) return { ok: false, reason: 'No Ego' };
  const owner = state.characters.find((c) => c.id === ego.owner);
  if (owner && owner.broken) return { ok: false, reason: `${owner.name} has broken down` };

  const isExalt = !!(exalt && state.ep >= MAX_EP);
  const baseCost = owner && owner.egoFree ? 0 : Math.max(0, ego.cost - (owner ? owner.egoDiscount || 0 : 0));
  const cost = isExalt ? MAX_EP : baseCost;
  if (state.ep < cost) return { ok: false, reason: 'Not enough EP' };

  state.ep -= cost;
  state.egoQueue.splice(index, 1);
  state.egosThisTurn += 1;

  const mult = isExalt ? 2 : 1;
  log(state, `${isExalt ? 'OVER-EXALT' : 'EGO'} — ${owner ? owner.name : ego.owner}: ${ego.name}!`, 'ego');
  pushFx(state, { kind: isExalt ? 'exalt' : 'ego', id: ego.owner, name: ego.name });

  const skillLv = owner ? owner.skillLv || 0 : 0;
  const target = state.enemies.find((e) => e.hp > 0);
  const targets = ego.aoe ? state.enemies.filter((e) => e.hp > 0) : [target].filter(Boolean);

  if (ego.dmg) {
    targets.forEach((e) => {
      let d = (ego.dmg * mult) + skillLv + (owner ? owner.str : 0);
      if (ego.attr === e.weakness) d *= weaknessMult(state);
      if (e.ravaged) d *= 1.3;
      if (e.mark > 0) d *= 1.5;
      if (e.vuln > 0) d *= 1.35;
      if (isExalt) d *= 1.75; // Exalt auto-Crits!
      damageEnemy(state, e, d, { attr: ego.attr, cost: 3, isCrit: isExalt });
      if (ego.bleed) applyStatusStacks(state, e, { bleed: ego.bleed * mult });
      if (ego.toxin) applyStatusStacks(state, e, { toxin: ego.toxin * mult });
      if (ego.poison) applyStatusStacks(state, e, { poison: ego.poison * mult });
      if (ego.mark) e.mark = Math.max(e.mark, ego.mark + (isExalt ? 1 : 0));
      if (isExalt && ego.owner === 'kaito') applyStatusStacks(state, e, { bleed: 10 });
      if (isExalt && ego.owner === 'bibi') e.vuln = Math.max(e.vuln, 3);
      if (ego.detonateAll) detonateEnemy(state, e, ego.detonateAll * mult, false);
    });
  }

  if (ego.poison && !ego.dmg) {
    targets.forEach((e) => applyStatusStacks(state, e, { poison: ego.poison * mult }));
    if (isExalt && ego.id === 'ego_yuna_1') targets.forEach((e) => tickPoison(state, e));
  }

  if (ego.teamShield) {
    state.characters.forEach((c) => { if (c.hp > 0) addShield(state, c, (ego.teamShield * mult) + skillLv); });
    if (isExalt && ego.id === 'ego_momo_2') {
      const slam = teamShieldTotal(state);
      state.enemies.filter((e) => e.hp > 0).forEach((e) => damageEnemy(state, e, slam, { attr: 'order', cost: 2 }));
    }
  }
  if (ego.teamCounter) state.characters.forEach((c) => { if (c.hp > 0) c.counter += ego.teamCounter * mult; });
  if (ego.barricade) state.characters.forEach((c) => { if (c.hp > 0) c.barricade = Math.max(c.barricade, ego.barricade); });
  if (ego.teamHeal) state.characters.forEach((c) => { if (c.hp > 0) healCharacter(state, c, (ego.teamHeal * mult) + skillLv, (ego.teamStressHeal || 0) * mult); });
  if (ego.heal && owner) healCharacter(state, owner, (ego.heal * mult) + skillLv);
  if (ego.teamStressHeal && !ego.teamHeal) state.characters.forEach((c) => { c.stress = Math.max(0, c.stress - ego.teamStressHeal * mult); });
  if (ego.weakenAll) state.enemies.forEach((e) => { if (e.hp > 0) e.weaken = Math.max(e.weaken, ego.weakenAll + (isExalt ? 1 : 0)); });
  if (ego.teamBuffAtk) state.characters.forEach((c) => { if (c.hp > 0) c.buffAtk += ego.teamBuffAtk * mult; });
  if (ego.teamStr) state.characters.forEach((c) => { if (c.hp > 0) c.str += ego.teamStr * mult; });
  if (isExalt && ego.owner === 'kaito' && ego.aoe) state.characters.forEach((c) => { if (c.hp > 0) c.str += 4; });
  if (isExalt && ego.owner === 'goro') addResonance(state, 4);
  if (isExalt && ego.id === 'ego_bibi_2') state.ap += 2;
  if (ego.fury && owner) owner.fury += ego.fury * mult;
  if (ego.echoNext) state.echoNext = { count: ego.echoNext, bonus: isExalt ? 0.5 : 0 };
  if (ego.taunt && owner) owner.taunt = ego.taunt;
  if (ego.draw) drawCards(state, ego.draw + (isExalt ? 1 : 0));

  if (state.egosThisTurn >= 2) {
    state.ap += 1;
    state.characters.forEach((c) => { if (c.hp > 0) c.critNext = true; });
    log(state, 'EGO CHAIN! +1 AP & Guaranteed Crit for the team!', 'epiphany');
  }

  checkResult(state);
  return { ok: true, ego, exalt: isExalt };
}

export function useSands(state, which) {
  if (state.sands <= 0) return { ok: false, reason: 'No hourglasses left' };
  if (which === 1) {
    if (!state.lastCardSnapshot) return { ok: false, reason: 'Nothing to rewind' };
    restore(state, state.lastCardSnapshot);
    state.sands -= 1;
    log(state, 'SANDS OF TIME — last card rewound.', 'sands');
    return { ok: true };
  }
  if (which === 2) {
    state.egoQueue = shuffle(state.egoQueue, state.rng);
    state.sands -= 1;
    log(state, 'SANDS OF TIME — Ego order redrawn.', 'sands');
    return { ok: true };
  }
  if (which === 3) {
    if (!state.turnStartSnapshot) return { ok: false, reason: 'Nothing to rewind' };
    const snap = state.turnStartSnapshot;
    const sands = state.sands;
    restore(state, snap);
    state.sands = sands - 1;
    log(state, 'SANDS OF TIME — turn rewound.', 'sands');
    return { ok: true };
  }
  return { ok: false, reason: 'Unknown hourglass' };
}

function checkResult(state) {
  if (state.result) return true;
  if (state.enemies.every((e) => e.hp <= 0)) { state.result = 'win'; log(state, 'ENCOUNTER CLEAR.', 'system'); return true; }
  if (state.characters.every((c) => c.hp <= 0)) { state.result = 'loss'; log(state, 'THE TEAM COLLAPSED.', 'system'); return true; }
  return false;
}

export const canPlay = (state, card) => !!card && !card.unplayable
  && (state.freeFirstLeft > 0 ? true : (card.zeroCost ? 0 : card.cost) <= state.ap);

export function previewCard(state, card, targetUid = null) {
  const target = state.enemies.find((e) => e.uid === targetUid && e.hp > 0)
    || state.enemies.find((e) => e.hp > 0) || null;
  const actor = state.characters.find((c) => c.id === card.owner) || state.characters[0];
  const out = {
    dmg: 0, per: 0, hits: card.hits || 1, total: 0, weak: false, ravaged: false, mark: 0, vuln: 0,
    crit: false, burst: false, isChain: hasEdgeChain(state, card), lethal: false,
    shield: 0, teamShield: 0, heal: 0, teamHeal: 0,
    stressHeal: 0, teamStressHeal: 0, ap: 0, draw: 0, targets: 1, combo: 0, finale: 0,
    poison: 0, poisonAll: 0, poisonPerStack: POISON_PER_STACK, poisonBonus: 0,
  };
  const alive = state.enemies.filter((e) => e.hp > 0);
  out.targets = card.aoe ? Math.max(1, alive.length) : (target ? 1 : 0);
  const skillLv = actor ? actor.skillLv || 0 : 0;

  if ((card.dmg > 0 || card.shieldDmgPct) && target) {
    const plan = computeAttackPlan(state, card, target, actor, { simulate: true });
    const casts = 1 + plan.echoCount;
    out.per = plan.perHit;
    out.hits = plan.hits * casts;
    out.dmg = plan.dmg * casts;
    out.total = out.dmg * Math.max(1, out.targets);
    out.weak = plan.weak;
    out.ravaged = plan.ravaged;
    out.mark = plan.mark;
    out.vuln = plan.vuln;
    out.crit = plan.crit;
    out.burst = plan.burst;
    out.combo = plan.combo;
    out.finale = plan.finale;
    out.poisonBonus = plan.poisonBonus || 0;
    out.lethal = out.dmg >= target.hp;
  }

  const mult = card.glint ? 1.4 : 1;
  const blockBonus = actor ? (actor.blockBonus || 0) + (state.startShields || 0) : 0;
  if (card.shield) out.shield = Math.round((card.shield + skillLv) * mult) + blockBonus;
  if (card.teamShield) out.teamShield = Math.round((card.teamShield + skillLv) * mult) + blockBonus;
  if (card.heal && actor) {
    const cap = actor.maxHp - (actor.lockedHp || 0);
    out.heal = Math.min(Math.round((card.heal + skillLv) * mult), Math.max(0, cap - actor.hp));
  }
  if (card.teamHeal) {
    out.teamHeal = state.characters.reduce((n, c) => {
      if (c.hp <= 0) return n;
      const cap = c.maxHp - (c.lockedHp || 0);
      return n + Math.min(Math.round((card.teamHeal + skillLv) * mult), Math.max(0, cap - c.hp));
    }, 0);
  }
  out.stressHeal = card.stressHeal || 0;
  out.teamStressHeal = card.teamStressHeal || 0;
  out.ap = card.apGain || card.maxAp || 0;
  out.draw = card.draw || 0;
  out.poison = card.poison || 0;
  out.poisonAll = card.poisonAll || 0;
  if (target) {
    out.poisonPerStack = poisonPerStack(state);
    out.poisonNextTick = ((target.poison || 0) + out.poison + out.poisonAll) * out.poisonPerStack;
    out.poisonStacks = target.poison || 0;
  }
  return out;
}

export function intentOf(enemy) {
  if (enemy.charging) return { type: 'charge', value: enemy.charging.value, turns: enemy.charging.turns };
  return enemy.intents[enemy.intentIndex % enemy.intents.length];
}

export function battleSummary(state) {
  return {
    result: state.result,
    turns: state.turn,
    cards: state.cardsPlayed,
    breakdowns: state.characters.reduce((n, c) => n + c.breakdownCount, 0),
    damage: state.stats.damage,
    maxHit: state.stats.maxHit,
    hp: Object.fromEntries(state.characters.map((c) => [c.id, c.hp])),
    stress: Object.fromEntries(state.characters.map((c) => [c.id, c.broken ? 100 : c.stress])),
    sands: state.sands,
  };
}

export function rankOf(summary) {
  let score = 100;
  score -= (summary.turns - 3) * 4;
  score -= summary.breakdowns * 18;
  if (summary.cards < 12) score -= 10;
  if (score >= 92) return 'S';
  if (score >= 78) return 'A';
  if (score >= 62) return 'B';
  return 'C';
}
