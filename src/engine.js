// Cell Warriors — battle engine.
// Faithful implementation of Chaos Zero Nightmare combat:
// draw 5 / 3 AP / 10 hand cap, action counters, Tenacity breaks, Stress & breakdowns,
// EP + Ego side deck, Epiphany, and the three Sands of Time rewinds.

import { CARDS, CHARACTERS, EGOS, ENEMIES, MISSIONS, ATTRIBUTES } from './data.js';

export const AP_PER_TURN = 3;
export const DRAW_PER_TURN = 5;
export const FIRST_DRAW = 7;
export const HAND_CAP = 10;
export const MAX_EP = 7;
export const EGO_COST = 4;
export const STRESS_MAX = 100;
export const RECOVERY_PLAYS = [5, 6, 8, 10, 12];
export const SANDS_CHARGES = 3;

// --- rng -------------------------------------------------------------------
function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
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

function makeCard(id, { glint = false } = {}) {
  const def = CARDS[id];
  if (!def) throw new Error(`Unknown card ${id}`);
  const c = { ...def, id, defId: id, uid: nextUid(), zeroCost: glint, glint };
  c.baseCost = def.cost;
  return c;
}

const cardName = (id) => (CARDS[id] ? CARDS[id].name : id);
const attrOf = (a) => ATTRIBUTES[a] || { name: 'None', glyph: '·', color: '#888' };

// --- state -----------------------------------------------------------------
export function startBattle(missionOrCode, partyIds, seed = Date.now()) {
  const mission = typeof missionOrCode === 'string'
    ? MISSIONS.find((m) => m.code === missionOrCode)
    : missionOrCode;
  if (!mission) throw new Error('Unknown mission');
  const rng = makeRng(typeof seed === 'number' ? seed : 12345);

  const characters = partyIds.map((pid, i) => {
    const c = CHARACTERS[pid];
    if (!c) throw new Error(`Unknown character ${pid}`);
    return {
      id: pid, name: c.name, full: c.full, cls: c.cls, attr: c.attr, art: c.art,
      hp: c.hp, maxHp: c.hp, shield: 0, stress: 0,
      buffAtk: 0, blockBonus: 0, taunt: 0,
      broken: false, lockedHp: 0, recovery: 0, breakdownCount: 0,
      egoFree: false, slot: i,
    };
  });

  const enemies = mission.enemies.map((eid, i) => {
    const e = ENEMIES[eid];
    return {
      uid: `e${i}`, id: eid, name: e.name, hp: e.hp, maxHp: e.hp,
      tenacity: e.tenacity, maxTenacity: e.tenacity, weakness: e.weakness,
      counter: e.counter, maxCounter: e.counter, counterBonus: 0,
      ravaged: false, weaken: 0, atkBuff: 0,
      intentIndex: 0, intents: e.intents,
    };
  });

  // combined deck: every card's owner decides whose pool it came from
  let deck = [];
  partyIds.forEach((pid) => {
    CHARACTERS[pid].deck.forEach((cid) => deck.push(makeCard(cid)));
  });
  deck = shuffle(deck, rng);

  const state = {
    mission, turn: 1, ap: AP_PER_TURN, maxAp: AP_PER_TURN,
    characters, enemies,
    drawPile: deck, hand: [], discard: [], exhaust: [],
    ep: 0, egoQueue: shuffle(partyIds.map((p) => ({ ...EGOS[p], owner: p })), rng),
    sands: SANDS_CHARGES, cardsPlayed: 0, cardsPlayedThisTurn: 0, cardsUsedThisTurn: 0,
    epiphany: null, extraDraw: 0, turnShield: 0, startShields: 0,
    log: [], result: null, rng, seed,
    turnStartSnapshot: null, lastCardSnapshot: null,
    targetUid: enemies[0] ? enemies[0].uid : null,
    lastPlayed: null,
  };

  // Permanent upgrade effects marked Initiation are assured in the opening hand.
  const opening = [];
  state.drawPile = state.drawPile.filter((c) => {
    if ((c.tags || []).includes('Initiation')) { opening.push(c); return false; }
    return true;
  });

  log(state, `MISSION: ${mission.name} — ${mission.place}`, 'system');
  log(state, `Weakness this run: ${attrOf(enemies[0].weakness).name}`, 'info');
  beginTurn(state, true, opening);
  return state;
}

function log(state, text, kind = 'info') {
  state.log.push({ text, kind, turn: state.turn });
  if (state.log.length > 200) state.log.shift();
}

function clone(state) {
  const snap = { ...state, rng: null, turnStartSnapshot: null, lastCardSnapshot: null };
  return JSON.parse(JSON.stringify(snap));
}
function restore(state, snap) {
  if (!snap) return;
  Object.assign(state, JSON.parse(JSON.stringify(snap)), {
    rng: state.rng, turnStartSnapshot: state.turnStartSnapshot, lastCardSnapshot: state.lastCardSnapshot,
  });
}

// --- piles -----------------------------------------------------------------
function convertForBroken(state, card) {
  if (card.type === 'status') return card;
  const ch = state.characters.find((c) => c.id === card.owner);
  if (!ch || !ch.broken) return card;
  const statusId = `breakdown_${ch.id}`;
  return { ...makeCard(statusId), uid: card.uid, origin: card.defId };
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
    if (!card.glint && state.rng() < 0.18) { card.glint = true; card.zeroCost = true; }
    state.hand.push(card);
    drawn++;
  }
  return drawn;
}

// --- turn flow -------------------------------------------------------------
function beginTurn(state, first = false, opening = []) {
  state.ap = state.maxAp;
  state.cardsPlayedThisTurn = 0;
  state.cardsUsedThisTurn = 0;
  state.characters.forEach((c) => { c.buffAtk = 0; c.taunt = 0; });
  state.hand.push(...opening);
  const drawN = Math.max(0, (first ? FIRST_DRAW : DRAW_PER_TURN) + state.extraDraw - (opening ? opening.length : 0));
  drawCards(state, drawN);

  // permanent per-turn shield from upgrade cards
  if (state.turnShield > 0) {
    state.characters.forEach((c) => addShield(state, c, state.turnShield));
  }

  // Epiphany: a lightbulb appears over one character
  if (!state.epiphany && state.rng() < 0.4) {
    const pool = state.characters.filter((c) => !c.broken);
    if (pool.length) {
      const pick = pool[Math.floor(state.rng() * pool.length)];
      state.epiphany = pick.id;
      log(state, `Epiphany — ${pick.name} sparks. Their next card adds a unique card.`, 'epiphany');
    }
  }
  state.turnStartSnapshot = clone(state);
  log(state, `— Turn ${state.turn} — ${state.ap} AP · ${state.hand.length} in hand`, 'turn');
}

function addShield(state, ch, amount) {
  const total = amount + (ch.blockBonus || 0) + state.startShields;
  ch.shield += total;
  return total;
}

// --- damage ----------------------------------------------------------------
function weakestTarget(state) {
  const alive = state.characters.filter((c) => c.hp > 0);
  const taunting = alive.filter((c) => c.taunt > 0);
  const pool = taunting.length ? taunting : alive;
  return pool[Math.floor(state.rng() * pool.length)];
}

function damageEnemy(state, enemy, raw, { attr = null, cost = 1, tenacityScale = 1, ignoreWeak = false } = {}) {
  if (!enemy || enemy.hp <= 0) return { dealt: 0, broke: false };
  let dmg = raw;
  const matched = attr && attr === enemy.weakness;
  if (matched && !ignoreWeak) dmg = Math.round(dmg * 1.5);
  if (enemy.ravaged) dmg = Math.round(dmg * 1.3);
  dmg = Math.max(1, Math.round(dmg));

  enemy.hp = Math.max(0, enemy.hp - dmg);
  let broke = false;
  if (!enemy.ravaged && enemy.tenacity > 0) {
    const ten = Math.round((3 + cost * 2) * tenacityScale * (matched && !ignoreWeak ? 2.5 : 1));
    enemy.tenacity = Math.max(0, enemy.tenacity - ten);
    if (enemy.tenacity === 0) broke = breakEnemy(state, enemy);
  }
  if (matched && !ignoreWeak) log(state, `  Weakness hit — ${attr} ×1.5`, 'weak');
  if (enemy.hp === 0) {
    log(state, `${enemy.name} is destroyed. +1 EP`, 'kill');
    state.ep = Math.min(MAX_EP, state.ep + 1);
  }
  return { dealt: dmg, broke };
}

function breakEnemy(state, enemy) {
  enemy.ravaged = true;
  enemy.counter = Math.min(6, enemy.counter + 1);
  state.ap += 1;
  state.characters.forEach((c) => { c.stress = Math.max(0, c.stress - 10); });
  log(state, `TENACITY BROKEN — ${enemy.name} Ravaged! +1 AP, stress relieved, counter +1.`, 'break');
  return true;
}

function damageCharacter(state, ch, raw) {
  if (!ch || ch.hp <= 0) return { hpLost: 0, absorbed: 0 };
  let remaining = raw;
  if (ch.shield > 0) {
    const absorbed = Math.min(ch.shield, remaining);
    ch.shield -= absorbed;
    remaining -= absorbed;
  }
  if (remaining <= 0) {
    log(state, `${ch.name}'s Shield holds — no damage, no Stress.`, 'block');
    return { hpLost: 0, absorbed: raw };
  }
  const locked = ch.lockedHp || 0;
  const before = ch.hp;
  ch.hp = Math.max(locked, ch.hp - remaining);
  const lost = before - ch.hp;
  const stress = Math.max(6, Math.round(remaining * 1.5) + 4);
  addStress(state, ch, stress);
  log(state, `${ch.name} takes ${lost} damage (+${stress} Stress).`, 'hurt');
  return { hpLost: lost, absorbed: raw - remaining };
}

function addStress(state, ch, amount) {
  if (ch.broken) return;
  ch.stress = Math.min(STRESS_MAX, ch.stress + amount);
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
  state.characters.forEach((c) => { if (c.hp > 0) c.hp = Math.min(c.maxHp - (c.lockedHp || 0), c.hp + Math.ceil(ch.maxHp / 2)); });
  log(state, `${ch.name} recovers. Stress cleared, HP restored, Ego cost −4.`, 'recover');
}

function healCharacter(state, ch, amount, stressHeal = 0) {
  const cap = ch.maxHp - (ch.lockedHp || 0);
  const healed = Math.min(amount, cap - ch.hp);
  ch.hp += healed;
  if (healed > 0 && stressHeal > 0) ch.stress = Math.max(0, ch.stress - stressHeal);
  else if (healed === 0 && stressHeal > 0) ch.stress = Math.max(0, ch.stress - Math.round(stressHeal * 0.5));
  return healed;
}

// --- play a card -----------------------------------------------------------
export function playCard(state, handIndex, targetUid = null) {
  if (state.result) return { ok: false, reason: 'Battle over' };
  const card = state.hand[handIndex];
  if (!card) return { ok: false, reason: 'No such card' };
  if (card.unplayable) { log(state, `${card.name} cannot be played.`, 'warn'); return { ok: false, reason: 'Unplayable' }; }
  const cost = card.zeroCost ? 0 : card.cost;
  if (cost > state.ap) return { ok: false, reason: 'Not enough AP' };
  const owner = state.characters.find((c) => c.id === card.owner);

  state.lastCardSnapshot = clone(state);
  state.ap -= cost;
  state.hand.splice(handIndex, 1);
  state.cardsPlayed += 1;
  state.cardsPlayedThisTurn += 1;
  state.cardsUsedThisTurn += 1;
  state.lastPlayed = { cardId: card.defId, name: card.name, cost };

  log(state, `${owner ? owner.name : 'Team'} plays ${card.name}${cost === 0 ? ' (0 AP)' : ` (${cost} AP)`}${card.glint ? ' — Epiphany' : ''}`, 'play');

  // --- breakdown / status cards
  if (card.breakdown) {
    const ch = state.characters.find((c) => c.id === card.owner);
    if (ch && ch.broken) {
      ch.recovery += 1;
      const need = RECOVERY_PLAYS[Math.min(ch.breakdownCount - 1, RECOVERY_PLAYS.length - 1)];
      log(state, `${ch.name} recovery ${ch.recovery}/${need}`, 'info');
      if (ch.recovery >= need) recover(state, ch);
    }
    state.discard.push(card);
    advanceCounters(state, 1, card);
    checkResult(state);
    return { ok: true, card };
  }
  if (card.type === 'curse') { state.discard.push(card); return { ok: true, card }; }

  const target = state.enemies.find((e) => e.uid === (targetUid || state.targetUid)) || state.enemies.find((e) => e.hp > 0);
  const mult = card.glint ? 1.4 : 1;
  const actor = owner || state.characters[0];

  // attack
  if (card.dmg > 0) {
    const targets = card.aoe ? state.enemies.filter((e) => e.hp > 0) : [target].filter(Boolean);
    const hits = card.hits || 1;
    const bonus = (actor ? actor.buffAtk : 0);
    targets.forEach((e) => {
      for (let i = 0; i < hits; i++) {
        damageEnemy(state, e, Math.round((card.dmg + bonus) * mult), { attr: card.attr, cost: card.cost });
      }
    });
  }
  // shield
  if (card.shield) addShield(state, actor, Math.round(card.shield * mult));
  if (card.teamShield) state.characters.forEach((c) => { if (c.hp > 0) addShield(state, c, Math.round(card.teamShield * mult)); });
  // heal
  if (card.heal) healCharacter(state, actor, Math.round(card.heal * mult), card.stressHeal || 0);
  if (card.teamHeal) state.characters.forEach((c) => { if (c.hp > 0) healCharacter(state, c, Math.round(card.teamHeal * mult), card.teamStressHeal || 0); });
  if (card.teamStressHeal && !card.teamHeal) state.characters.forEach((c) => { c.stress = Math.max(0, c.stress - card.teamStressHeal); });
  if (card.stressHeal && !card.heal) { actor.stress = Math.max(0, actor.stress - card.stressHeal); }
  if (card.selfStress) addStress(state, actor, card.selfStress);
  // buffs
  if (card.buffAtk) actor.buffAtk += card.buffAtk;
  if (card.teamBuffAtk) state.characters.forEach((c) => { if (c.hp > 0) c.buffAtk += card.teamBuffAtk; });
  if (card.taunt) { state.characters.forEach((c) => { c.taunt = 0; }); actor.taunt = card.taunt; }
  if (card.weakenAll) state.enemies.forEach((e) => { if (e.hp > 0) e.weaken = Math.max(e.weaken, card.weakenAll); });
  if (card.apGain) { state.ap += card.apGain; log(state, `+${card.apGain} AP`, 'info'); }
  if (card.draw) drawCards(state, card.draw);
  // permanent upgrade effects
  if (card.maxAp) { state.maxAp += card.maxAp; state.ap += card.maxAp; }
  if (card.turnShield) state.turnShield += card.turnShield;
  if (card.blockBonus) { state.startShields += card.blockBonus; state.characters.forEach((c) => { c.blockBonus += card.blockBonus; }); }
  if (card.extraDraw) state.extraDraw += card.extraDraw;

  // Epiphany: the triggering character adds one of their unique cards
  if (state.epiphany && owner && state.epiphany === owner.id) {
    const uniques = CHARACTERS[owner.id].deck.filter((cid) => CARDS[cid].type !== 'upgrade');
    const uniqueId = uniques[Math.floor(state.rng() * uniques.length)];
    if (state.hand.length < HAND_CAP) {
      const bonusCard = makeCard(uniqueId, { glint: true });
      bonusCard.zeroCost = true;
      bonusCard.cost = 0;
      bonusCard.epiphanyCard = true;
      state.hand.push(bonusCard);
      log(state, `EPIPHANY — ${cardName(uniqueId)} added to hand, 0 AP.`, 'epiphany');
    }
    state.epiphany = null;
  }

  // Celestial: auto-plays when you play another card costing 2+
  if (card.cost >= 2) {
    const idx = state.hand.findIndex((c) => (c.tags || []).includes('Celestial') && !c.zeroCost);
    if (idx >= 0) {
      const cel = state.hand[idx];
      state.hand.splice(idx, 1);
      log(state, `CELESTIAL — ${cel.name} activates automatically.`, 'celestial');
      if (cel.teamShield) state.characters.forEach((c) => { if (c.hp > 0) addShield(state, c, cel.teamShield); });
      if (cel.shield) addShield(state, state.characters.find((c) => c.id === cel.owner) || state.characters[0], cel.shield);
      state.discard.push(cel);
    }
  }

  // discard / exhaust / upgrade removal
  if (card.type === 'upgrade') { state.exhaust.push(card); log(state, `${card.name} stays active for the fight.`, 'upgrade'); }
  else if ((card.tags || []).includes('Exhaust')) state.exhaust.push(card);
  else state.discard.push(card);

  // EP gain: 1 per 2 cards played
  if (state.cardsPlayed % 2 === 0) {
    state.ep = Math.min(MAX_EP, state.ep + 1);
  }

  // action counters (Haste and Ego do not advance)
  const advances = !(card.tags || []).includes('Haste');
  if (advances) advanceCounters(state, 1, card);

  // drop a dead Epiphany owner's lightbulb
  if (state.epiphany) {
    const e = state.characters.find((c) => c.id === state.epiphany);
    if (!e || e.broken) state.epiphany = null;
  }
  checkResult(state);
  return { ok: true, card };
}

function advanceCounters(state, times, card) {
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
  const intent = enemy.intents[enemy.intentIndex % enemy.intents.length];
  const alive = state.characters.filter((c) => c.hp > 0);
  if (!alive.length) { checkResult(state); return; }
  log(state, `${enemy.name} acts — ${intent.type}`, 'enemy');
  const weaken = enemy.weaken > 0 ? 0.65 : 1;

  if (intent.type === 'attack') {
    const target = weakestTarget(state);
    const raw = Math.round((intent.value + enemy.atkBuff) * weaken);
    damageCharacter(state, target, raw);
  } else if (intent.type === 'debuff') {
    state.characters.forEach((c) => { if (c.hp > 0) addStress(state, c, intent.value); });
    log(state, `Stress +${intent.value} to the team.`, 'stress');
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
  enemy.counter = Math.max(1, enemy.maxCounter + enemy.counterBonus);
  if (enemy.weaken > 0) enemy.weaken -= 1;
  checkResult(state);
}

export function endTurn(state) {
  if (state.result) return state;
  // unplayed cards → discard unless Retain
  const retained = [];
  state.hand.forEach((c) => {
    if ((c.tags || []).includes('Retain')) { c.cost = c.baseCost; c.zeroCost = false; c.glint = false; retained.push(c); }
    else state.discard.push(c);
  });
  state.hand = retained;

  // Enemies do NOT act on turn end — they act when their own action counter hits 0.
  state.characters.forEach((c) => { if (c.shield > 0) c.shield = 0; });
  state.turn += 1;
  const opening = [];
  beginTurn(state, false, opening);
  return state;
}

export function playEgo(state, index) {
  if (state.result) return { ok: false, reason: 'Battle over' };
  const ego = state.egoQueue[index];
  if (!ego) return { ok: false, reason: 'No Ego' };
  const owner = state.characters.find((c) => c.id === ego.owner);
  if (owner && owner.broken) return { ok: false, reason: `${owner.name} has broken down` };
  const cost = owner && owner.egoFree ? 0 : ego.cost;
  if (state.ep < cost) return { ok: false, reason: 'Not enough EP' };
  state.ep -= cost;
  state.egoQueue.splice(index, 1);
  log(state, `EGO — ${owner ? owner.name : ego.owner}: ${ego.name}!`, 'ego');

  const target = state.enemies.find((e) => e.hp > 0);
  if (ego.dmg) {
    const targets = ego.aoe ? state.enemies.filter((e) => e.hp > 0) : [target].filter(Boolean);
    targets.forEach((e) => damageEnemy(state, e, ego.dmg, { attr: ego.attr, cost: 3 }));
  }
  if (ego.teamShield) state.characters.forEach((c) => { if (c.hp > 0) addShield(state, c, ego.teamShield); });
  if (ego.teamHeal) state.characters.forEach((c) => { if (c.hp > 0) healCharacter(state, c, ego.teamHeal, ego.teamStressHeal || 0); });
  if (ego.teamStressHeal && !ego.teamHeal) state.characters.forEach((c) => { c.stress = Math.max(0, c.stress - ego.teamStressHeal); });
  if (ego.weakenAll) state.enemies.forEach((e) => { if (e.hp > 0) e.weaken = Math.max(e.weaken, ego.weakenAll); });
  // Ego skills never advance action counters
  checkResult(state);
  return { ok: true, ego };
}

// --- Sands of Time (Protos skills) ----------------------------------------
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
    restore(state, snap);
    state.sands -= 1;
    log(state, 'SANDS OF TIME — turn rewound.', 'sands');
    return { ok: true };
  }
  return { ok: false, reason: 'Unknown hourglass' };
}

function checkResult(state) {
  if (state.result) return true;
  if (state.enemies.every((e) => e.hp <= 0)) {
    state.result = 'win';
    log(state, 'MISSION CLEAR.', 'system');
    return true;
  }
  if (state.characters.every((c) => c.hp <= 0)) {
    state.result = 'loss';
    log(state, 'THE TEAM COLLAPSED.', 'system');
    return true;
  }
  return false;
}

export const canPlay = (state, card) => !!card && !card.unplayable && (card.zeroCost ? 0 : card.cost) <= state.ap;

export function intentOf(enemy) {
  return enemy.intents[enemy.intentIndex % enemy.intents.length];
}
