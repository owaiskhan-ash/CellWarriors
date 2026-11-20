// Cell Warriors — battle engine (CZN systems + run modifiers).
import { CARDS, CHARACTERS, EGOS, ENEMIES, MISSIONS, RELICS, ATTRIBUTES } from './data.js';

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

function makeCard(id, { upgraded = false, glint = false } = {}) {
  const def = CARDS[id];
  if (!def) throw new Error(`Unknown card ${id}`);
  const up = upgraded && def.up ? def.up : null;
  const merged = up ? { ...def, ...up } : { ...def };
  if (up) merged.name = `${def.name}+`;
  const c = { ...merged, id, defId: id, uid: nextUid(), upgraded: !!up, glint, zeroCost: glint };
  c.baseCost = merged.cost;
  return c;
}

const cardName = (id) => (CARDS[id] ? CARDS[id].name : id);
const attrOf = (a) => ATTRIBUTES[a] || { name: 'None', glyph: '·', color: '#888' };
const pushFx = (state, ev) => { state.fx.push(ev); if (state.fx.length > 80) state.fx.shift(); };

// --- start -----------------------------------------------------------------
export function startBattle(opts, partyIds, seed) {
  // legacy: startBattle('m01', ['kaito','momo','goro'], 123)
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

  const characters = party.map((pid, i) => {
    const c = CHARACTERS[pid];
    if (!c) throw new Error(`Unknown character ${pid}`);
    const lvl = stats[pid] || {};
    const leaderHp = party[0] === 'goro' ? 6 : 0;
    const maxHp = c.hp + (lvl.hp || 0) + leaderHp;
    const prev = carry[pid] || {};
    const startHp = prev.hp != null ? Math.min(maxHp, Math.max(1, prev.hp)) : maxHp;
    return {
      id: pid, name: c.name, full: c.full, cls: c.cls, attr: c.attr, art: c.art, skin: c.skin,
      hp: startHp, maxHp, shield: 0, stress: Math.min(99, prev.stress || 0),
      atkBonus: lvl.atk || 0, skillLv: lvl.skillLv || 0, egoDiscount: lvl.egoDiscount || 0,
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
      ravaged: false, weaken: 0, atkBuff: 0, mark: 0, charging: null,
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

  // ego side deck: two per character by default
  let egos = config.egos;
  if (!egos) {
    egos = [];
    party.forEach((pid) => {
      const pool = EGOS[pid] || [];
      pool.slice(0, 2).forEach((e) => egos.push({ ...e }));
    });
  } else {
    egos = egos.map((e) => (typeof e === 'string' ? findEgo(e) : { ...e })).filter(Boolean);
  }

  const synergy = computeSynergy(characters);
  const firstAp = (has('adrenal') ? 1 : 0) + (synergy.some((s) => s.id === 'edge') ? 1 : 0);
  const startShield = (has('plate') ? 8 : 0)
    + (synergy.some((s) => s.id === 'bastion') ? 5 : 0)
    + (party[0] === 'momo' ? 4 : 0);

  const state = {
    mission: { name: config.name || 'Skirmish', place: config.place || '', code: config.missionCode || 'run' },
    config, turn: 1, ap: AP_PER_TURN + firstAp, maxAp: AP_PER_TURN,
    characters, enemies,
    drawPile: deck, hand: [], discard: [], exhaust: [],
    ep: party[0] === 'bibi' ? 1 : 0, egoQueue: shuffle(egos, rng),
    sands: config.sands != null ? config.sands : SANDS_CHARGES,
    cardsPlayed: 0, cardsPlayedThisTurn: 0, cardsUsedThisTurn: 0, lastTypePlayed: null,
    epiphany: null, extraDraw: has('synapse') ? 1 : 0, turnShield: 0, startShields: 0,
    relics, relicIds, synergy, has: undefined,
    freeFirstLeft: has('scabbard') ? 1 : 0,
    firstTurnBonusUsed: false,
    stats: { damage: 0, healed: 0, blocked: 0, stress: 0 },
    log: [], fx: [], result: null, rng, seed: seedNum,
    turnStartSnapshot: null, lastCardSnapshot: null,
    targetUid: enemies[0] ? enemies[0].uid : null,
    lastPlayed: null,
  };
  state.has = has;

  if (startShield) characters.forEach((c) => { c.shield += startShield; });
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
  if (dup) out.push({ id: 'attuned', name: 'ATTUNED', desc: `${attrOf(dup[0]).name} ×2 → weakness damage +10%` });
  const cls = characters.map((c) => c.cls);
  if (cls.includes('vanguard') && cls.includes('controller')) out.push({ id: 'bastion', name: 'BASTION', desc: 'Start every battle with 5 Shield.' });
  if (cls.includes('striker') && cls.includes('psionic')) out.push({ id: 'edge', name: 'EDGE', desc: '+1 AP on the first turn.' });
  return out;
}

function log(state, text, kind = 'info') {
  state.log.push({ text, kind, turn: state.turn });
  if (state.log.length > 240) state.log.shift();
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
    if (!card.glint && state.rng() < 0.18) { card.glint = true; card.zeroCost = true; }
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
  state.freeFirstLeft = state.relicIds.includes('scabbard') ? 1 : 0;
  state.characters.forEach((c, i) => {
    c.buffAtk = (first && i === 0 && c.id === 'kaito') ? 2 : 0;
    c.taunt = 0;
  });

  state.hand.push(...opening);
  const drawN = Math.max(0, (first ? FIRST_DRAW : DRAW_PER_TURN) + state.extraDraw - (opening ? opening.length : 0));
  drawCards(state, drawN);

  if (state.turnShield > 0) state.characters.forEach((c) => addShield(state, c, state.turnShield));

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
  pushFx(state, { kind: 'shield', id: ch.id, name: ch.name, amt: total });
  return total;
}

// --- damage ----------------------------------------------------------------
function weakestTarget(state) {
  const alive = state.characters.filter((c) => c.hp > 0);
  const taunting = alive.filter((c) => c.taunt > 0);
  const pool = taunting.length ? taunting : alive;
  return pool[Math.floor(state.rng() * pool.length)];
}

function weaknessMult(state) {
  const base = state.relicIds.includes('lens') ? 1.7 : 1.5;
  return state.synergy && state.synergy.some((s) => s.id === 'attuned') ? base + 0.1 : base;
}

function damageEnemy(state, enemy, raw, { attr = null, cost = 1, tenacityScale = 1, ignoreWeak = false, actor = null } = {}) {
  if (!enemy || enemy.hp <= 0) return { dealt: 0, broke: false };
  let dmg = raw;
  const matched = attr && attr === enemy.weakness;
  if (matched && !ignoreWeak) dmg = Math.round(dmg * weaknessMult(state));
  if (enemy.ravaged) dmg = Math.round(dmg * 1.3);
  if (enemy.mark > 0) dmg = Math.round(dmg * 1.5);
  dmg = Math.max(1, Math.round(dmg));

  enemy.hp = Math.max(0, enemy.hp - dmg);
  state.stats.damage += dmg;
  pushFx(state, { kind: 'dmg', uid: enemy.uid, name: enemy.name, amt: dmg, weak: matched && !ignoreWeak, ravaged: enemy.ravaged });

  let broke = false;
  if (!enemy.ravaged && enemy.tenacity > 0) {
    const ten = Math.round((3 + cost * 2) * tenacityScale * (matched && !ignoreWeak ? 2.5 : 1));
    if (enemy.mods.includes('immuneRavage')) {
      enemy.tenacity = Math.max(1, enemy.tenacity - Math.round(ten * 0.25));
    } else {
      enemy.tenacity = Math.max(0, enemy.tenacity - ten);
      if (enemy.tenacity === 0) broke = breakEnemy(state, enemy);
    }
  }
  if (matched && !ignoreWeak) log(state, `  Weakness hit — ${attrOf(attr).name} ×${weaknessMult(state)}`, 'weak');
  if (enemy.hp === 0) {
    log(state, `${enemy.name} is destroyed. +1 EP`, 'kill');
    state.ep = Math.min(MAX_EP, state.ep + 1);
  }
  checkPhase(state, enemy);
  return { dealt: dmg, broke };
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
    state.characters.forEach((c) => { if (c.hp > 0) healCharacter(state, c, 8); });
  }
  pushFx(state, { kind: 'break', uid: enemy.uid, name: enemy.name });
  log(state, `TENACITY BROKEN — ${enemy.name} Ravaged! +1 AP, stress relieved, counter +1.`, 'break');
  return true;
}

function damageCharacter(state, ch, raw) {
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
  pushFx(state, { kind: 'recover', id: ch.id, name: ch.name });
  state.characters.forEach((c) => { if (c.hp > 0) c.hp = Math.min(c.maxHp - (c.lockedHp || 0), c.hp + Math.ceil(ch.maxHp / 2)); });
  log(state, `${ch.name} recovers. Stress cleared, HP restored, Ego cost −4.`, 'recover');
}

function healCharacter(state, ch, amount, stressHeal = 0) {
  const cap = ch.maxHp - (ch.lockedHp || 0);
  const healed = Math.max(0, Math.min(amount, cap - ch.hp));
  ch.hp += healed;
  if (healed > 0) {
    state.stats.healed += healed;
    pushFx(state, { kind: 'heal', id: ch.id, name: ch.name, amt: healed });
  }
  if (stressHeal > 0) ch.stress = Math.max(0, ch.stress - (healed > 0 ? stressHeal : Math.round(stressHeal * 0.5)));
  return healed;
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
  log(state, `${owner ? owner.name : 'Team'} plays ${card.name}${cost === 0 ? ' (0 AP)' : ` (${cost} AP)`}${card.glint ? ' — Epiphany' : ''}`, 'play');

  if (card.breakdown) {
    const ch = state.characters.find((c) => c.id === card.owner);
    if (ch && ch.broken) {
      ch.recovery += 1;
      const need = RECOVERY_PLAYS[Math.min(ch.breakdownCount - 1, RECOVERY_PLAYS.length - 1)];
      log(state, `${ch.name} recovery ${ch.recovery}/${need}`, 'info');
      if (ch.recovery >= need) recover(state, ch);
    }
    state.discard.push(card);
    advanceCounters(state, 1);
    checkResult(state);
    return { ok: true, card };
  }
  if (card.type === 'curse') { state.discard.push(card); return { ok: true, card }; }

  const target = state.enemies.find((e) => e.uid === (targetUid || state.targetUid)) || state.enemies.find((e) => e.hp > 0);
  const mult = card.glint ? 1.4 : 1;
  const skillLv = actor ? actor.skillLv || 0 : 0;

  if (card.dmg > 0) {
    let bonus = (actor ? actor.buffAtk + (actor.atkBonus || 0) + skillLv : 0);
    if (card.combo) {
      const playedType = state.cardsPlayedThisTurn > 1 ? state.lastTypePlayed : null;
      if (playedType === card.type) bonus += card.combo;
      if (playedType === card.type) log(state, `  COMBO +${card.combo}`, 'combo');
    }
    if (card.finale && state.ap === 0) { bonus += card.finale; log(state, `  FINALE +${card.finale}`, 'combo'); }
    const targets = card.aoe ? state.enemies.filter((e) => e.hp > 0) : [target].filter(Boolean);
    const hits = card.hits || 1;
    targets.forEach((e) => {
      for (let i = 0; i < hits; i++) {
        damageEnemy(state, e, Math.round((card.dmg + bonus) * mult), { attr: card.attr, cost: card.cost, actor });
      }
      if (card.mark) {
        e.mark = Math.max(e.mark, card.mark);
        log(state, `${e.name} is Marked — +50% damage taken (${card.mark} turns).`, 'combo');
      }
    });
  }

  if (card.shield) addShield(state, actor, Math.round((card.shield + skillLv) * mult));
  if (card.teamShield) state.characters.forEach((c) => { if (c.hp > 0) addShield(state, c, Math.round((card.teamShield + skillLv) * mult)); });
  if (card.heal) healCharacter(state, actor, Math.round((card.heal + skillLv) * mult), card.stressHeal || 0);
  if (card.teamHeal) state.characters.forEach((c) => { if (c.hp > 0) healCharacter(state, c, Math.round((card.teamHeal + skillLv) * mult), card.teamStressHeal || 0); });
  if (card.teamStressHeal && !card.teamHeal) state.characters.forEach((c) => { c.stress = Math.max(0, c.stress - card.teamStressHeal); });
  if (card.stressHeal && !card.heal) actor.stress = Math.max(0, actor.stress - card.stressHeal);
  if (card.selfStress) addStress(state, actor, card.selfStress);
  if (card.buffAtk) actor.buffAtk += card.buffAtk;
  if (card.teamBuffAtk) state.characters.forEach((c) => { if (c.hp > 0) c.buffAtk += card.teamBuffAtk; });
  if (card.taunt) { state.characters.forEach((c) => { c.taunt = 0; }); actor.taunt = card.taunt; }
  if (card.fortitude) actor.fortitude = Math.max(actor.fortitude, card.fortitude);
  if (card.weakenAll) state.enemies.forEach((e) => { if (e.hp > 0) e.weaken = Math.max(e.weaken, card.weakenAll); });
  if (card.retrieve && state.discard.length) {
    const pick = state.discard.pop();
    if (state.hand.length < HAND_CAP) {
      state.hand.push(convertForBroken(state, pick));
      log(state, `RETRIEVE — ${pick.name} returned from the Graveyard.`, 'combo');
    }
  }
  if (card.apGain) { state.ap += card.apGain; log(state, `+${card.apGain} AP`, 'info'); }
  if (card.draw) drawCards(state, card.draw);
  if (card.maxAp) { state.maxAp += card.maxAp; state.ap += card.maxAp; }
  if (card.turnShield) state.turnShield += card.turnShield;
  if (card.blockBonus) { state.startShields += card.blockBonus; state.characters.forEach((c) => { c.blockBonus += card.blockBonus; }); }
  if (card.extraDraw) state.extraDraw += card.extraDraw;
  if (card.firstAp && state.turn === 1) { state.ap += card.firstAp; }

  if (state.epiphany && owner && state.epiphany === owner.id) {
    const uniques = CHARACTERS[owner.id].deck.filter((cid) => CARDS[cid].type !== 'upgrade');
    const uniqueId = uniques[Math.floor(state.rng() * uniques.length)];
    if (state.hand.length < HAND_CAP) {
      const bonusCard = makeCard(uniqueId);
      bonusCard.zeroCost = true;
      bonusCard.cost = 0;
      bonusCard.glint = true;
      bonusCard.epiphanyCard = true;
      state.hand.push(bonusCard);
      log(state, `EPIPHANY — ${cardName(uniqueId)} added to hand, 0 AP.`, 'epiphany');
    }
    state.epiphany = null;
  }

  if (card.cost >= 2) {
    const idx = state.hand.findIndex((c) => (c.tags || []).includes('Celestial') && !c.zeroCost);
    if (idx >= 0) {
      const cel = state.hand[idx];
      state.hand.splice(idx, 1);
      log(state, `CELESTIAL — ${cel.name} activates automatically.`, 'celestial');
      pushFx(state, { kind: 'celestial', name: cel.name });
      if (cel.teamShield) state.characters.forEach((c) => { if (c.hp > 0) addShield(state, c, cel.teamShield); });
      if (cel.shield) addShield(state, state.characters.find((c) => c.id === cel.owner) || state.characters[0], cel.shield);
      state.discard.push(cel);
    }
  }

  state.lastTypePlayed = card.type;

  if (card.type === 'upgrade') { state.exhaust.push(card); log(state, `${card.name} stays active for the fight.`, 'upgrade'); }
  else if ((card.tags || []).includes('Exhaust')) state.exhaust.push(card);
  else state.discard.push(card);

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
    damageCharacter(state, target, Math.round(value * (enemy.weaken > 0 ? 0.65 : 1)));
    enemy.counter = resetCounter(state, enemy);
    tickEnemy(state, enemy);
    return;
  }

  const intent = enemy.intents[enemy.intentIndex % enemy.intents.length];
  log(state, `${enemy.name} acts — ${intent.type}`, 'enemy');
  tickEnemy(state, enemy);
  const weaken = enemy.weaken > 0 ? 0.65 : 1;

  if (intent.type === 'attack') {
    damageCharacter(state, weakestTarget(state), Math.round((intent.value + enemy.atkBuff) * weaken));
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
  if (enemy.mods.includes('regen') && enemy.tenacity < enemy.maxTenacity) {
    enemy.tenacity = Math.min(enemy.maxTenacity, enemy.tenacity + 8);
  }
}

export function endTurn(state) {
  if (state.result) return state;
  const retained = [];
  state.hand.forEach((c) => {
    if ((c.tags || []).includes('Retain')) { c.cost = c.baseCost; c.zeroCost = false; c.glint = false; retained.push(c); }
    else state.discard.push(c);
  });
  state.hand = retained;
  state.characters.forEach((c) => { if (c.shield > 0) c.shield = 0; if (c.fortitude > 0) c.fortitude -= 1; });
  state.turn += 1;
  beginTurn(state, false, []);
  return state;
}

export function playEgo(state, index) {
  if (state.result) return { ok: false, reason: 'Battle over' };
  const ego = state.egoQueue[index];
  if (!ego) return { ok: false, reason: 'No Ego' };
  const owner = state.characters.find((c) => c.id === ego.owner);
  if (owner && owner.broken) return { ok: false, reason: `${owner.name} has broken down` };
  const cost = owner && owner.egoFree ? 0 : Math.max(0, ego.cost - (owner ? owner.egoDiscount || 0 : 0));
  if (state.ep < cost) return { ok: false, reason: 'Not enough EP' };
  state.ep -= cost;
  state.egoQueue.splice(index, 1);
  log(state, `EGO — ${owner ? owner.name : ego.owner}: ${ego.name}!`, 'ego');
  pushFx(state, { kind: 'ego', id: ego.owner, name: ego.name });

  const skillLv = owner ? owner.skillLv || 0 : 0;
  const target = state.enemies.find((e) => e.hp > 0);
  if (ego.dmg) {
    const targets = ego.aoe ? state.enemies.filter((e) => e.hp > 0) : [target].filter(Boolean);
    targets.forEach((e) => damageEnemy(state, e, ego.dmg + skillLv, { attr: ego.attr, cost: 3 }));
  }
  if (ego.teamShield) state.characters.forEach((c) => { if (c.hp > 0) addShield(state, c, ego.teamShield + skillLv); });
  if (ego.teamHeal) state.characters.forEach((c) => { if (c.hp > 0) healCharacter(state, c, ego.teamHeal + skillLv, ego.teamStressHeal || 0); });
  if (ego.heal && owner) healCharacter(state, owner, ego.heal + skillLv);
  if (ego.teamStressHeal && !ego.teamHeal) state.characters.forEach((c) => { c.stress = Math.max(0, c.stress - ego.teamStressHeal); });
  if (ego.weakenAll) state.enemies.forEach((e) => { if (e.hp > 0) e.weaken = Math.max(e.weaken, ego.weakenAll); });
  if (ego.teamBuffAtk) state.characters.forEach((c) => { if (c.hp > 0) c.buffAtk += ego.teamBuffAtk; });
  if (ego.taunt && owner) owner.taunt = ego.taunt;
  if (ego.draw) drawCards(state, ego.draw);
  checkResult(state);
  return { ok: true, ego };
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

// What this card will do right now — drives the live numbers on the card face.
export function previewCard(state, card, targetUid = null) {
  const target = state.enemies.find((e) => e.uid === targetUid && e.hp > 0)
    || state.enemies.find((e) => e.hp > 0) || null;
  const actor = state.characters.find((c) => c.id === card.owner) || state.characters[0];
  const out = {
    dmg: 0, per: 0, hits: card.hits || 1, total: 0, weak: false, ravaged: false, mark: 0,
    lethal: false, shield: 0, teamShield: 0, heal: 0, teamHeal: 0,
    stressHeal: 0, teamStressHeal: 0, ap: 0, draw: 0, targets: 1, combo: 0, finale: 0,
  };
  const alive = state.enemies.filter((e) => e.hp > 0);
  out.targets = card.aoe ? Math.max(1, alive.length) : (target ? 1 : 0);
  const skillLv = actor ? actor.skillLv || 0 : 0;
  const effCost = state.freeFirstLeft > 0 && card.cost > 0 ? 0 : (card.zeroCost ? 0 : card.cost);

  if (card.dmg > 0 && target) {
    let bonus = (actor ? actor.buffAtk + (actor.atkBonus || 0) + skillLv : 0);
    if (card.combo && state.lastTypePlayed === card.type && state.cardsPlayedThisTurn > 0) { bonus += card.combo; out.combo = card.combo; }
    if (card.finale && state.ap - effCost === 0) { bonus += card.finale; out.finale = card.finale; }
    let per = (card.dmg + bonus) * (card.glint ? 1.4 : 1);
    out.weak = card.attr === target.weakness;
    if (out.weak) per *= weaknessMult(state);
    out.ravaged = !!target.ravaged;
    if (out.ravaged) per *= 1.3;
    out.mark = target.mark || 0;
    if (out.mark > 0) per *= 1.5;
    out.per = Math.max(1, Math.round(per));
    out.dmg = out.per * out.hits;
    out.total = out.dmg * Math.max(1, out.targets);
    out.lethal = out.per * out.hits >= target.hp;
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
