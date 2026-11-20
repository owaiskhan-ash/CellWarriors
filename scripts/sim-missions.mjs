// Balance check for the CZN-style battle engine.
// Usage: node scripts/sim-missions.mjs [gamesPerMission]
import { MISSIONS, CHARACTERS } from '../src/data.js';
import { startBattle, playCard, endTurn, playEgo, canPlay } from '../src/engine.js';

const TEAMS = {
  m01: ['kaito', 'momo', 'goro'],
  m02: ['kaito', 'momo', 'goro'],
  m03: ['kaito', 'momo', 'goro'],
  m04: ['kaito', 'goro', 'bibi'],
  m05: ['kaito', 'momo', 'goro'],
};

function score(s, card) {
  const target = s.enemies.find((e) => e.uid === s.targetUid) || s.enemies.find((e) => e.hp > 0);
  const owner = s.characters.find((c) => c.id === card.owner || c.id === 'kaito');
  let v = 0;
  if (card.breakdown) v += 60;
  if (card.dmg) {
    let dmg = card.dmg * (card.hits || 1);
    if (target && card.attr === target.weakness) dmg *= 1.5;
    if (target && target.ravaged) dmg *= 1.3;
    if (card.aoe) dmg *= s.enemies.filter((e) => e.hp > 0).length;
    if (target && dmg >= target.hp) v += 200;
    v += dmg * 2;
    if (target && !target.ravaged) v += 8;
  }
  if (card.teamShield) v += card.teamShield * s.characters.length * 0.9;
  if (card.shield) v += card.shield * 0.9;
  if (card.heal) v += card.heal * 1.2;
  if (card.teamHeal) v += card.teamHeal * s.characters.length * 1.1;
  if (card.teamStressHeal) v += card.teamStressHeal * 1.4;
  if (card.stressHeal) v += card.stressHeal * 1.2;
  if (card.maxAp) v += 25;
  if (card.extraDraw) v += 20;
  if (card.turnShield) v += 18;
  if (card.apGain) v += 12;
  if (card.taunt) v += 6;
  if (card.weakenAll) v += 16;
  if (owner && owner.stress > 70 && card.selfStress) v -= 20;
  return v;
}

function takeTurn(s) {
  let guard = 0;
  while (guard++ < 24 && !s.result) {
    // Ego when it is affordable and something is alive
    if (s.ep >= 4) {
      const i = s.egoQueue.findIndex((e) => {
        const o = s.characters.find((c) => c.id === e.owner);
        return o && !o.broken && s.ep >= (o.egoFree ? 0 : e.cost);
      });
      if (i >= 0 && (s.enemies.filter((e) => e.hp > 0).length > 1 || s.ep >= 6)) {
        playEgo(s, i);
        continue;
      }
    }
    const options = s.hand
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => canPlay(s, c))
      .map((o) => ({ ...o, v: score(s, o.c) }))
      .sort((a, b) => b.v - a.v);
    if (!options.length) break;
    const target = s.enemies.find((e) => e.hp > 0);
    if (!playCard(s, options[0].i, target ? target.uid : null).ok) break;
  }
  if (!s.result) endTurn(s);
}

const N = Number(process.argv[2] || 300);
console.log('mission   win%   avg turns   breakdowns   losses-to-stress');
const rows = [];
for (const m of MISSIONS) {
  let wins = 0, turns = 0, breaks = 0;
  for (let i = 0; i < N; i++) {
    const s = startBattle(m.code, TEAMS[m.code], 1000 + i * 7);
    let guard = 0;
    while (!s.result && guard++ < 40) takeTurn(s);
    if (s.result === 'win') { wins++; turns += s.turn; }
    breaks += s.characters.reduce((n, c) => n + c.breakdownCount, 0);
  }
  rows.push([m.code, ((wins / N) * 100).toFixed(0) + '%', (turns / Math.max(1, wins)).toFixed(1), (breaks / N).toFixed(2)]);
}
for (const r of rows) console.log(r[0].padEnd(9), r[1].padStart(5), r[2].padStart(10), r[3].padStart(12));
