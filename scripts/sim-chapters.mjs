// Balance check for the squad battles. Bot plays every chapter N times.
// Usage: node scripts/sim-chapters.mjs [gamesPerChapter]
import { CHAPTERS, CARDS } from '../src/data.js';
import { startBattle, playCard, endTurn } from '../src/battle.js';

function botTurn(s) {
  let guard = 0;
  while (guard++ < 14) {
    const playable = s.hand
      .map((id, i) => ({ card: CARDS[id], i }))
      .filter((o) => {
        const owner = s.party.find((p) => p.id === o.card.owner);
        return owner && owner.hp > 0 && o.card.cost <= s.energy;
      });
    if (!playable.length) break;
    playable.sort((a, b) => (b.card.dmg || 0) - (a.card.dmg || 0));
    const res = playCard(s, playable[0].i, s.enemies[0]?.uid);
    if (!res.ok) break;
  }
  endTurn(s);
}

const N = Number(process.argv[2] || 200);
console.log('chapter                 win%   avg turns');
for (const ch of CHAPTERS) {
  let wins = 0;
  let turns = 0;
  for (let i = 0; i < N; i++) {
    const s = startBattle(ch);
    let guard = 0;
    while (!s.result && guard++ < 30) botTurn(s);
    if (s.result === 'win') wins += 1;
    turns += s.turn;
  }
  console.log(
    `${ch.title.padEnd(22)} ${String(Math.round((wins / N) * 100)).padStart(4)}%   ${(turns / N).toFixed(1)}`,
  );
}
