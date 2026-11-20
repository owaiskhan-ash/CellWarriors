// Pure game logic. No DOM in here — this is the file that later moves to the server.
import { CARDS, ENEMIES, DECK_LIST, START } from './data.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const WAVE = ['strep', 'toxin', 'strep', 'biofilm', 'toxin', 'strep'];

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function log(s, text, kind = 'info') {
  s.log.push({ text, kind });
  if (s.log.length > 80) s.log.shift();
}

function addInflammation(s, n) {
  s.inflammation = clamp(s.inflammation + n, 0, 12);
}

function draw(s, n) {
  for (let i = 0; i < n; i++) {
    if (!s.deck.length) {
      if (!s.discard.length) return;
      s.deck = shuffle(s.discard.splice(0));
      log(s, 'Deck reshuffled.');
    }
    s.hand.push(s.deck.pop());
  }
}

export function createGame() {
  const s = {
    turn: 1,
    phase: 'play', // play | enemy | over
    result: null, // 'win' | 'lose'
    atp: START.atp,
    maxAtp: START.atp,
    inflammation: 0,
    fever: START.fever,
    infection: START.infection,
    deck: shuffle([...DECK_LIST]),
    hand: [],
    discard: [],
    spawnCount: 0,
    player: { cells: [], antibodies: 0, tempAtk: 0, opsonin: false },
    enemy: { units: [], weaken: 0, coreHp: START.coreHp, coreMax: START.coreHp },
    log: [],
  };
  draw(s, START.handSize);
  log(s, 'Breach detected. Infection at 60%. Hold the line.', 'warn');
  return s;
}

export function atkOf(s, cell) {
  const aura = s.player.cells.reduce((n, c) => n + (c.hp > 0 && c.id !== cell.id ? c.aura || 0 : 0), 0);
  return cell.atk + aura + s.player.antibodies + s.player.tempAtk;
}

function applyCytokine(s, card) {
  switch (card.id) {
    case 'histamine':
      s.player.tempAtk += 2;
      log(s, 'Histamine dump. +2 dmg to every cell this turn.', 'good');
      break;
    case 'il6':
      draw(s, 2);
      log(s, 'IL-6: the alarm spreads. Draw 2.', 'good');
      break;
    case 'interferon':
      s.enemy.weaken = 2;
      log(s, 'Interferon. Pathogens weakened for 2 turns.', 'good');
      break;
    case 'opsonin':
      s.player.opsonin = true;
      log(s, 'Opsonin tags a target. Next attack doubles.', 'good');
      break;
    case 'antipyretic':
      log(s, 'Antipyretic. Fever pressure drops.', 'good');
      break;
  }
}

export function playCard(s, handIndex) {
  if (s.result) return { ok: false, error: 'Game over' };
  if (s.phase !== 'play') return { ok: false, error: 'Not your turn' };

  const id = s.hand[handIndex];
  if (!id) return { ok: false, error: 'No such card' };
  const card = CARDS[id];

  if (card.cost > s.atp) return { ok: false, error: 'Not enough ATP' };
  if (card.type === 'cell' && s.player.cells.length >= START.slots) {
    return { ok: false, error: 'No free tissue slot' };
  }

  s.atp -= card.cost;
  s.hand.splice(handIndex, 1);

  if (card.type === 'cell') {
    s.player.cells.push({
      ...card,
      hp: card.hp,
      maxHp: card.hp,
      uid: `c${Math.random().toString(36).slice(2, 7)}`,
    });
    log(s, `${card.name} enters the tissue.`);
    if (card.inflamOnPlay) addInflammation(s, card.inflamOnPlay);
    if (card.onPlay === 'dendritic') {
      s.infection -= 4;
      draw(s, 1);
      log(s, 'Dendritic presents antigen: Infection -4%, draw 1.', 'good');
    }
  } else {
    s.discard.push(id);
    applyCytokine(s, card);
  }

  if (card.inflam) addInflammation(s, card.inflam);

  s.infection = clamp(s.infection, 0, 100);
  checkResult(s);
  return { ok: true };
}

function damageEnemy(s, unit, raw, source) {
  const armour = source && source.pierce ? 0 : unit.armor || 0;
  const dmg = Math.max(0, raw - armour);
  unit.hp -= dmg;
  log(s, `${source ? source.name : 'Attack'} hits ${unit.name} for ${dmg}${armour ? ` (armour ${armour})` : ''}.`);
}

function hitPlayerCells(s, dmg) {
  const alive = s.player.cells.filter((c) => c.hp > 0);
  if (!alive.length) {
    s.infection += 4;
    log(s, 'Nothing defending the tissue. Infection +4%.', 'bad');
    return;
  }
  const guard = alive.find((c) => c.guard);
  const target = guard || alive.reduce((a, b) => (a.hp <= b.hp ? a : b));
  target.hp -= dmg;
  log(s, `${target.name} takes ${dmg} dmg.`, 'bad');
}

function cleanupDead(s) {
  for (const u of s.enemy.units) {
    if (u.hp <= 0 && !u.dead) {
      u.dead = true;
      s.infection -= u.clear;
      log(s, `${u.name} cleared. Infection -${u.clear}%.`, 'good');
    }
  }
  s.enemy.units = s.enemy.units.filter((u) => u.hp > 0);

  for (const c of s.player.cells) {
    if (c.hp <= 0 && !c.dead) {
      c.dead = true;
      s.discard.push(c.id);
      log(s, `${c.name} died in the line.`, 'bad');
    }
  }
  s.player.cells = s.player.cells.filter((c) => c.hp > 0);
  s.infection = clamp(s.infection, 0, 100);
}

// New pathogens arrive, then EVERY unit acts — a fresh spawn is dangerous at once.
function spawnForTurn(s) {
  if (s.enemy.units.length >= START.slots) return;
  if (s.turn < 2) return;
  const id = WAVE[s.spawnCount++ % WAVE.length];
  const e = ENEMIES[id];
  s.enemy.units.push({ ...e, hp: e.hp, maxHp: e.hp, uid: `e${Math.random().toString(36).slice(2, 7)}` });
  log(s, `${e.name} appears.`, 'warn');
}

function triggerFever(s) {
  log(s, `FEVER ${(38 + s.inflammation * 0.15).toFixed(1)}°C — every cell burns.`, 'fever');
  for (const u of s.enemy.units) u.hp -= 3;
  for (const c of s.player.cells) c.hp -= 3;
  s.infection += 8;
  s.inflammation = Math.max(0, s.inflammation - 4);
  cleanupDead(s);
}

function checkResult(s) {
  if (s.result) return;
  if (s.enemy.coreHp <= 0) {
    s.result = 'win';
    s.phase = 'over';
    log(s, 'Infection site destroyed. The body holds.', 'good');
  } else if (s.infection >= 100) {
    s.result = 'lose';
    s.phase = 'over';
    log(s, 'The host is lost.', 'bad');
  }
}

/** What your End Turn will roughly do — shown before you commit. */
export function previewEndTurn(s) {
  const myDamage = s.player.cells.reduce((n, c) => n + atkOf(s, c) * (s.player.opsonin ? 2 : 1), 0);
  const theirSpread = s.enemy.units.reduce(
    (n, u) => n + u.spread + Math.max(0, u.atk - (s.enemy.weaken > 0 ? 2 : 0)),
    0,
  );
  return {
    myDamage,
    theirSpread,
    coreHp: Math.max(0, s.enemy.coreHp),
    feverAtEnd: s.inflammation >= s.fever,
  };
}

export function endTurn(s) {
  if (s.result || s.phase !== 'play') return;
  s.phase = 'enemy';

  // 1. your cells act
  for (const cell of s.player.cells) {
    if (cell.hp <= 0) continue;
    const targets = s.enemy.units.filter((u) => u.hp > 0);
    let dmg = atkOf(s, cell);
    if (s.player.opsonin) {
      dmg *= 2;
      s.player.opsonin = false;
      log(s, 'Opsonised hit lands at double damage.', 'good');
    }
    if (targets.length) {
      const target = targets.reduce((a, b) => (a.hp <= b.hp ? a : b));
      damageEnemy(s, target, dmg, cell);
      if (cell.inflamOnAttack) addInflammation(s, cell.inflamOnAttack);
    } else if (s.enemy.coreHp > 0) {
      s.enemy.coreHp -= dmg;
      log(s, `${cell.name} strikes the infection site for ${dmg}.`, 'good');
    }
    if (cell.regen) cell.hp = Math.min(cell.maxHp, cell.hp + cell.regen);
    if (cell.antibody) s.player.antibodies = Math.min(3, s.player.antibodies + cell.antibody);
  }
  cleanupDead(s);

  // 2. pathogens arrive and act
  spawnForTurn(s);
  s.infection += 3; // the host deteriorates on its own
  for (const unit of s.enemy.units) {
    if (unit.hp <= 0) continue;
    s.infection += unit.spread;
    const atk = Math.max(0, unit.atk - (s.enemy.weaken > 0 ? 2 : 0));
    if (atk > 0) hitPlayerCells(s, atk);
  }
  cleanupDead(s);

  // 3. field clear → the tissue cleans itself (once per turn, not per cell)
  if (s.enemy.units.length === 0) {
    s.infection -= 3;
    log(s, 'Field clear. Tissue cleans itself: Infection -3%.', 'good');
  }

  // 4. fever check
  if (s.inflammation >= s.fever) triggerFever(s);

  // 5. next turn
  s.turn += 1;
  s.maxAtp = Math.min(START.maxAtp, START.atp + Math.floor((s.turn - 1) / 2));
  s.atp = s.maxAtp;
  s.player.tempAtk = 0;
  if (s.enemy.weaken > 0) s.enemy.weaken -= 1;
  s.infection = clamp(s.infection, 0, 100);
  draw(s, 1);
  s.phase = 'play';

  checkResult(s);
}
