// Squad battle: your cells on the left, pathogens on the right, cards at the bottom.
// Every character owns a card set — if that character falls, their cards are dead weight.
import { CARDS, CHARACTERS, ENEMIES } from './data.js';

const shuffle = (list) => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

export const alive = (list) => list.filter((u) => u.hp > 0);
const lowest = (list) => alive(list).reduce((a, b) => (a.hp <= b.hp ? a : b), alive(list)[0]);

function log(s, text, kind = 'info') {
  s.log.push({ text, kind });
  if (s.log.length > 40) s.log.shift();
}

function draw(s, n) {
  for (let i = 0; i < n; i++) {
    if (!s.deck.length) {
      if (!s.discard.length) return;
      s.deck = shuffle(s.discard.splice(0));
    }
    s.hand.push(s.deck.pop());
  }
}

export function startBattle(chapter, startingEnergy = 4) {
  const party = chapter.party.map((id, i) => {
    const c = CHARACTERS[id];
    return {
      uid: `p${i}`, id, name: c.name, cell: c.cell, role: c.role, art: c.art,
      hp: c.hp, maxHp: c.hp, atk: c.atk, atkBuff: 0, tempAtk: 0, shield: 0, taunt: 0,
    };
  });

  const enemies = chapter.enemies.map((id, i) => {
    const e = ENEMIES[id];
    return { uid: `e${i}`, id, name: e.name, art: e.art, hp: e.hp, maxHp: e.hp, atk: e.atk, weaken: 0 };
  });

  const deck = shuffle(party.flatMap((p) => CHARACTERS[p.id].cards));

  const s = {
    chapter, turn: 1, energy: startingEnergy, maxEnergy: startingEnergy,
    party, enemies, deck, hand: [], discard: [], log: [], result: null,
    target: enemies[0]?.uid || null,
  };

  draw(s, 4);
  log(s, `${chapter.title} · hold the line.`, 'warn');
  return s;
}

export const damageOf = (card, owner) =>
  card.dmg + (owner ? owner.atk + owner.atkBuff + owner.tempAtk : 0);

function hitEnemy(s, foe, amount) {
  foe.hp -= amount;
}

function damageAlly(s, unit, amount, source) {
  let left = amount;
  if (unit.shield > 0) {
    const absorbed = Math.min(unit.shield, left);
    unit.shield -= absorbed;
    left -= absorbed;
  }
  if (left > 0) unit.hp -= left;
  log(s, `${source.name} hits ${unit.name} for ${left}${unit.shield >= 0 && left < amount ? ' (shield ate some)' : ''}.`, 'bad');
}

function resolve(s, card, owner, targetUid) {
  const foes = alive(s.enemies);
  const allies = alive(s.party);
  const picked = foes.find((f) => f.uid === targetUid) || foes[0];
  const amount = damageOf(card, owner);

  switch (card.target) {
    case 'enemy': {
      if (!picked) break;
      const hits = card.hits || 1;
      for (let i = 0; i < hits; i++) hitEnemy(s, picked, amount);
      log(s, `${owner.name} · ${card.name} → ${picked.name} for ${amount}${hits > 1 ? ` ×${hits}` : ''}.`, 'good');
      if (card.tempAtk) owner.tempAtk += card.tempAtk;
      if (card.weaken) {
        picked.weaken += card.weaken;
        log(s, `${picked.name} exposed: -${card.weaken} ATK.`, 'good');
      }
      if (card.selfDamage) {
        owner.hp -= card.selfDamage;
        log(s, `${owner.name} pays ${card.selfDamage} HP for it.`, 'bad');
      }
      if (card.selfShield) owner.shield += card.selfShield;
      break;
    }
    case 'allEnemies': {
      for (const f of foes) hitEnemy(s, f, amount);
      log(s, `${owner.name} · ${card.name}: ${amount} to every pathogen.`, 'good');
      break;
    }
    case 'allAllies': {
      for (const a of allies) {
        if (card.heal) a.hp = Math.min(a.maxHp, a.hp + card.heal);
        if (card.shield) a.shield += card.shield;
        if (card.tempAtk) a.tempAtk += card.tempAtk;
        if (card.atkBuff) a.atkBuff += card.atkBuff;
      }
      log(s, `${owner.name} · ${card.name} on the whole squad.`, 'good');
      break;
    }
    case 'self': {
      if (card.shield) owner.shield += card.shield;
      if (card.taunt) owner.taunt = card.taunt;
      log(s, `${owner.name} braces.`, 'good');
      break;
    }
    case 'lowestAlly': {
      const t = lowest(allies);
      if (t && card.heal) {
        t.hp = Math.min(t.maxHp, t.hp + card.heal);
        log(s, `${t.name} healed for ${card.heal}.`, 'good');
      }
      break;
    }
    default:
      break;
  }

  if (card.energy) {
    s.energy += card.energy;
    log(s, `${owner.name} · ${card.name}: +${card.energy} ATP.`, 'good');
  }
  if (card.draw) draw(s, card.draw);
}

export function playCard(s, handIndex, targetUid) {
  if (s.result) return { ok: false, error: 'Battle over' };
  const id = s.hand[handIndex];
  const card = CARDS[id];
  if (!card) return { ok: false, error: 'No such card' };

  const owner = s.party.find((p) => p.id === card.owner);
  if (!owner || owner.hp <= 0) return { ok: false, error: `${owner ? owner.name : 'They'} are down` };
  if (card.cost > s.energy) return { ok: false, error: 'Not enough ATP' };

  s.energy -= card.cost;
  s.hand.splice(handIndex, 1);
  s.discard.push(id);

  resolve(s, card, owner, targetUid || s.target);

  s.enemies = s.enemies.filter((e) => e.hp > 0 || (e.hp = e.hp, true));
  check(s);
  return { ok: true };
}

export function endTurn(s) {
  if (s.result) return;

  for (const foe of alive(s.enemies)) {
    const atk = Math.max(0, foe.atk - foe.weaken);
    if (!atk) continue;
    const taunts = alive(s.party).filter((p) => p.taunt > 0);
    const target = taunts.length ? taunts[0] : lowest(s.party);
    if (target) damageAlly(s, target, atk, foe);
    else break;
  }

  check(s);
  if (s.result) return;

  for (const p of s.party) {
    if (p.taunt > 0) p.taunt -= 1;
    p.tempAtk = 0;
  }

  s.turn += 1;
  s.energy = s.maxEnergy;
  const need = Math.max(0, 4 - s.hand.length);
  draw(s, need);
  log(s, `Turn ${s.turn}.`, 'info');
}

function check(s) {
  if (s.result) return;
  s.enemies = s.enemies.filter((e) => e.hp > 0);
  s.party.forEach((p) => {
    if (p.hp < 0) p.hp = 0;
  });
  if (s.enemies.length === 0) {
    s.result = 'win';
    log(s, 'Infection site destroyed. The body holds.', 'good');
  } else if (alive(s.party).length === 0) {
    s.result = 'lose';
    log(s, 'The squad is down. The host is lost.', 'bad');
  }
}
