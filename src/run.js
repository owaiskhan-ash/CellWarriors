// Run structure: branching map, deck growth, relics, shops, rests, events.
import {
  CARDS, CHARACTERS, RELICS, EVENTS, ENCOUNTERS, MAP_CONFIG, REWARD_CURRENCY, CHAOS_FIRST_CLEAR,
} from './data.js';

const shuffle = (arr, rng) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

export function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const REWARDABLE = Object.keys(CARDS).filter((id) => {
  const c = CARDS[id];
  return c.type !== 'curse' && c.type !== 'status';
});

export function createRun(team, seed = Date.now(), stats = {}) {
  const rng = makeRng(seed);
  const deck = [];
  team.forEach((pid) => CHARACTERS[pid].deck.forEach((cid) => deck.push({ id: cid, upgraded: false })));
  const map = buildMap(rng);
  const carry = {};
  team.forEach((pid) => {
    carry[pid] = { hp: maxHpOf(pid, stats, team[0] === 'goro'), stress: 0 };
  });
  return {
    seed, team, floor: -1, lane: -1, map, carry,
    deck, relics: [], sands: 3,
    earned: 30, battles: 0, totalTurns: 0, totalBreakdowns: 0, totalDamage: 0,
    rank: null, finished: false, pending: 'map', currentNode: null,
    startedAt: Date.now(),
  };
}

function buildMap(rng) {
  const floors = [];
  for (let f = 0; f < MAP_CONFIG.floors; f++) {
    const type = MAP_CONFIG.pattern[f];
    const nodes = [];
    const count = f === MAP_CONFIG.floors - 1 ? 1 : (f < 2 ? 2 : 3);
    for (let i = 0; i < count; i++) {
      let t = type;
      if (i > 0) {
        const pool = ['battle', 'battle', 'event', 'rest', 'shop'];
        t = f > 0 && f < MAP_CONFIG.floors - 1 ? pick(pool, rng) : 'battle';
      }
      nodes.push({ id: `f${f}n${i}`, floor: f, lane: i, type: t, cleared: false, seen: false, edges: [] });
    }
    floors.push(nodes);
  }
  for (let f = 0; f < floors.length - 1; f++) {
    const cur = floors[f];
    const nxt = floors[f + 1];
    cur.forEach((n, i) => {
      if (nxt.length === 1) { n.edges = [0]; return; }
      if (cur.length === 2 && nxt.length === 2) { n.edges = [0, 1]; return; }
      if (cur.length === 2 && nxt.length === 3) { n.edges = i === 0 ? [0, 1] : [1, 2]; return; }
      if (i === 0) n.edges = [0, 1];
      else if (i === 1) n.edges = [0, 1, 2];
      else n.edges = [1, 2];
    });
  }
  return floors;
}

export function nodeAt(run, floor, lane) {
  return (run.map[floor] || [])[lane] || null;
}

export function availableNodes(run) {
  const next = run.floor + 1;
  if (next >= run.map.length) return [];
  if (run.floor < 0) return run.map[0];
  const cur = nodeAt(run, run.floor, run.lane);
  if (!cur || !cur.edges || !cur.edges.length) return run.map[next];
  return cur.edges.map((lane) => nodeAt(run, next, lane)).filter(Boolean);
}

export function enterNode(run, lane) {
  const avail = availableNodes(run);
  const node = avail.find((n) => n.lane === lane);
  if (!node) return null;
  run.floor = node.floor;
  run.lane = lane;
  node.seen = true;
  run.currentNode = { floor: node.floor, lane: node.lane, type: node.type };
  return node;
}

export function markCleared(run) {
  const node = nodeAt(run, run.floor, run.lane);
  if (node) node.cleared = true;
  run.pending = 'map';
}

export function encounterFor(run, node) {
  const f = node.floor;
  const rng = makeRng(run.seed + f * 97 + node.lane * 13);
  if (node.type === 'boss') {
    const key = run.seed % 2 === 0 ? 'boss_a' : 'boss_b';
    return { key, ...ENCOUNTERS[key], scale: 1 };
  }
  if (node.type === 'elite') {
    const pool = f < 6 ? ['elite_a'] : ['elite_a', 'elite_b', 'elite_c'];
    const key = pick(pool, rng);
    return { key, ...ENCOUNTERS[key], scale: 1 + f * 0.02 };
  }
  const pool = ['skirmish_1', 'skirmish_2', 'skirmish_3'];
  if (f >= 3) pool.push('skirmish_4');
  if (f >= 5) pool.push('skirmish_5');
  const key = pick(pool, rng);
  return { key, ...ENCOUNTERS[key], scale: 1 + f * 0.05 };
}

export const scaleCurrency = (run, amt) => (run.relics.includes('coffer') ? Math.round(amt * 1.3) : amt);

export function rewardCurrency(run, node) {
  const base = REWARD_CURRENCY[node.type] ?? 0;
  return scaleCurrency(run, base);
}

function allowedForRun(run, id) {
  const def = CARDS[id];
  if (!def) return false;
  if ((def.tags || []).includes('Unique') && run.deck.some((c) => c.id === id)) return false;
  return true;
}

export function cardRewardChoices(run, teamOverride) {
  const rng = makeRng(run.seed + run.floor * 31 + run.battles * 7 + 5);
  const team = teamOverride || run.team;
  const allowed = REWARDABLE.filter((id) => allowedForRun(run, id));
  const pool = allowed.filter((id) => team.includes(CARDS[id].owner));
  const offPool = allowed.filter((id) => !team.includes(CARDS[id].owner));
  const out = [];
  const used = new Set();
  for (let i = 0; i < 3; i++) {
    const fromTeam = rng() < 0.78 || offPool.length === 0;
    const src = (fromTeam ? pool : offPool).filter((id) => !used.has(id));
    const list = src.length ? src : allowed.filter((id) => !used.has(id));
    if (!list.length) break;
    const id = pick(list, rng);
    used.add(id);
    out.push({ id, upgraded: rng() < 0.14 });
  }
  return out;
}

export function addCard(run, id, upgraded = false) {
  run.deck.push({ id, upgraded });
}

export function removeCard(run, index) {
  if (index < 0 || index >= run.deck.length) return false;
  run.deck.splice(index, 1);
  return true;
}

export function upgradeCard(run, index) {
  const c = run.deck[index];
  if (!c) return false;
  if (!CARDS[c.id].up) return false;
  if (c.upgraded) return false;
  c.upgraded = true;
  return true;
}

export function upgradableIndexes(run) {
  return run.deck.map((c, i) => (CARDS[c.id].up && !c.upgraded ? i : -1)).filter((i) => i >= 0);
}

export function relicChoices(run, n = 1) {
  const rng = makeRng(run.seed + run.floor * 53 + 11);
  const owned = new Set(run.relics);
  const pool = Object.keys(RELICS).filter((id) => !owned.has(id));
  return shuffle(pool, rng).slice(0, n);
}

export function grantRelic(run, id) {
  if (!id || run.relics.includes(id)) return false;
  run.relics.push(id);
  if (id === 'metronome') run.sands += 1;
  return true;
}

export function makeShop(run) {
  const rng = makeRng(run.seed + run.floor * 71 + 3);
  const choices = [];
  const pool = shuffle(REWARDABLE.filter((id) => allowedForRun(run, id)), rng);
  for (let i = 0; i < Math.min(3, pool.length); i++) {
    const id = pool[i];
    const cost = CARDS[id].type === 'upgrade' ? 74 : 46 + Math.floor(rng() * 24);
    choices.push({ id, cost, upgraded: rng() < 0.18, sold: false });
  }
  const relicPool = Object.keys(RELICS).filter((id) => !run.relics.includes(id));
  const relic = relicPool.length ? relicPool[Math.floor(rng() * relicPool.length)] : null;
  return { cards: choices, relic: relic ? { id: relic, cost: 90, sold: false } : null, removeCost: 60 };
}

// Effects: { currency, heal, hp, stress, relic, curse, card, upgrade, sands }
export function applyEffect(run, effect, rng = makeRng(Date.now()), stats = {}) {
  const lines = [];
  run.carry = run.carry || {};
  if (effect.currency) {
    const gain = scaleCurrency(run, effect.currency);
    run.earned += gain;
    lines.push(`+${gain} cells`);
  }
  if (effect.heal) {
    run.team.forEach((pid) => {
      const hp = runHp(run, pid, stats);
      const max = maxHpOf(pid, stats, run.team[0] === 'goro');
      run.carry[pid] = { ...(run.carry[pid] || {}), hp: Math.min(max, hp + Math.round(max * effect.heal)) };
    });
    lines.push(`healed ${Math.round(effect.heal * 100)}% HP`);
  }
  if (effect.hp) {
    run.team.forEach((pid) => {
      const hp = runHp(run, pid, stats);
      run.carry[pid] = { ...(run.carry[pid] || {}), hp: Math.max(1, hp - effect.hp) };
    });
    lines.push(`-${effect.hp} HP each`);
  }
  if (effect.stress) {
    run.team.forEach((pid) => {
      const cur = (run.carry[pid] && run.carry[pid].stress) || 0;
      run.carry[pid] = { ...(run.carry[pid] || {}), stress: Math.max(0, Math.min(99, cur + effect.stress)) };
    });
    lines.push(effect.stress > 0 ? `+${effect.stress} Stress` : `cleared ${-effect.stress} Stress`);
  }
  if (effect.relic) {
    const id = relicChoices(run, 1)[0];
    if (grantRelic(run, id)) lines.push(`Relic: ${RELICS[id].name}`);
  }
  if (effect.curse) {
    addCard(run, 'curse_doubt');
    lines.push('Doubt curse added to deck');
  }
  if (effect.card) {
    const c = cardRewardChoices(run)[0];
    if (c) {
      addCard(run, c.id, c.upgraded);
      lines.push(`Card: ${CARDS[c.id].name}${c.upgraded ? '+' : ''}`);
    }
  }
  if (effect.sands) { run.sands += effect.sands; lines.push(`+${effect.sands} Sands of Time`); }
  if (effect.upgrade) {
    const idx = upgradableIndexes(run);
    if (idx.length) {
      const pickIdx = idx[Math.floor(rng() * idx.length)];
      upgradeCard(run, pickIdx);
      lines.push(`Upgraded ${CARDS[run.deck[pickIdx].id].name}+`);
    } else {
      lines.push('No upgradable cards left');
    }
  }
  return lines;
}

export function maxHpOf(pid, stats = {}, goroLead = false) {
  const lvl = (stats && stats[pid]) || {};
  return CHARACTERS[pid].hp + (lvl.hp || 0) + (goroLead ? 6 : 0);
}

export function runHp(run, pid, stats = {}) {
  const c = run.carry && run.carry[pid];
  if (c && c.hp != null) return c.hp;
  return maxHpOf(pid, stats, run.team[0] === 'goro');
}

export function recordBattle(run, summary, node, stats = {}) {
  run.carry = run.carry || {};
  const goroLead = run.team[0] === 'goro';
  const hasMarrow = run.relics.includes('marrow');
  Object.entries(summary.hp).forEach(([pid, hp]) => {
    const max = maxHpOf(pid, stats, goroLead);
    let nextHp = Math.max(1, hp);
    if (hasMarrow) nextHp = Math.min(max, nextHp + 8);
    run.carry[pid] = { ...(run.carry[pid] || {}), hp: nextHp, stress: Math.min(99, summary.stress[pid] || 0) };
  });
  run.sands = summary.sands;
  run.battles += 1;
  run.totalTurns += summary.turns || 0;
  run.totalBreakdowns += summary.breakdowns || 0;
  run.totalDamage += summary.damage || 0;
  const gained = rewardCurrency(run, node);
  run.earned += gained;
  return gained;
}

export function restHealAll(run, pct = 0.3, stats = {}) {
  run.carry = run.carry || {};
  const goroLead = run.team[0] === 'goro';
  run.team.forEach((pid) => {
    const max = maxHpOf(pid, stats, goroLead);
    run.carry[pid] = { ...(run.carry[pid] || {}), hp: Math.min(max, runHp(run, pid, stats) + Math.round(max * pct)) };
  });
}

export function restCalm(run, amount = 40) {
  run.carry = run.carry || {};
  run.team.forEach((pid) => {
    const cur = (run.carry[pid] && run.carry[pid].stress) || 0;
    run.carry[pid] = { ...(run.carry[pid] || {}), stress: Math.max(0, cur - amount) };
  });
}

export function runSummary(run, won, firstClear = false) {
  const floors = Math.max(0, run.floor + (won ? 1 : 0));
  let score = won ? 90 : 40;
  score += floors * 2;
  score += run.relics.length * 4;
  score -= run.totalBreakdowns * 14;
  if (won && run.totalTurns > 0 && run.totalTurns <= run.battles * 5) score += 8;
  const rank = !won ? (floors >= 7 ? 'B' : 'C') : (score >= 106 ? 'S' : score >= 90 ? 'A' : 'B');
  const firstBonus = won && firstClear ? CHAOS_FIRST_CLEAR : 0;
  const metaCells = Math.round(run.earned * 0.5) + (won ? 45 : floors * 4) + firstBonus;
  const xp = 25 + floors * 14 + (won ? 60 : 0);
  return {
    won, rank, floors, battles: run.battles, turns: run.totalTurns,
    breakdowns: run.totalBreakdowns, damage: run.totalDamage, relics: run.relics.length,
    metaCells, firstBonus, xp,
  };
}

export { EVENTS, RELICS };
