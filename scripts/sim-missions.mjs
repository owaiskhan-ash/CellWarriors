// Balance check for the squad battles. Bot plays every mission with the default team.
// Usage: node scripts/sim-missions.mjs [gamesPerMission]
import { MISSIONS, CARDS, CHARACTERS } from '../src/data.js';
import { startBattle, playCard, endTurn, damageOf } from '../src/battle.js';

const TEAMS = {
  m01: ['kaito', 'momo', 'goro'],
  m02: ['kaito', 'momo', 'goro'],
  m03: ['kaito', 'momo', 'goro'],
  m04: ['kaito', 'goro', 'bibi'],
  m05: ['kaito', 'momo', 'goro'],
};

function botTurn(s) {
  let guard = 0;
  while (guard++ < 12) {
    const playable = s.hand
      .map((id, i) => ({ card: CARDS[id], i }))
      .filter((o) => {
        const owner = s.party.find((p) => p.id === o.card.owner);
        return owner && owner.hp > 0 && o.card.cost <= s.energy;
      });
    if (!playable.length) break;
    playable.sort((a, b) => {
      const da = a.card.dmg ? damageOf(a.card, s.party.find((p) => p.id === a.card.owner)) : 0;
      const db = b.card.dmg ? damageOf(b.card, s.party.find((p) => p.id === b.card.owner)) : 0;
      return db - da;
    });
    if (!playCard(s, playable[0].i, s.enemies[0]?.uid).ok) break;
  }
  endTurn(s);
}

const N = Number(process.argv[2] || 300);
console.log('mission                  win%   turns   enemies');
for (const m of MISSIONS) {
  let wins = 0;
  let turns = 0;
  for (let i = 0; i < N; i++) {
    const s = startBattle(m, TEAMS[m.id]);
    let guard = 0;
    while (!s.result && guard++ < 30) botTurn(s);
    if (s.result === 'win') wins += 1;
    turns += s.turn;
  }
  console.log(
    `${(m.code + ' ' + m.name).padEnd(24)} ${String(Math.round((wins / N) * 100)).padStart(4)}%   ${(turns / N).toFixed(1).padStart(4)}   ${m.enemies.join(', ')}`,
  );
}
