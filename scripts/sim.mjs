// Balance check: plays N games with a greedy bot and reports win rate + turn counts.
// Usage: node scripts/sim.mjs
import { createGame, playCard, endTurn, atkOf } from '../src/engine.js';
import { CARDS } from '../src/data.js';

function botTurn(s) {
  // Greedy: kill the field, keep inflammation under 8, spend everything.
  let guard = 0;
  while (guard++ < 20) {
    const options = s.hand
      .map((id, i) => ({ card: CARDS[id], i }))
      .filter((o) => o.card.cost <= s.atp)
      .filter((o) => o.card.type !== 'cell' || s.player.cells.length < 3);

    if (!options.length) break;

    // Never stack inflammation past the fever line unless it wins the turn.
    const safe = options.filter((o) => {
      const adds = (o.card.inflam || 0) + (o.card.inflamOnPlay || 0);
      return s.inflammation + adds < s.fever;
    });
    const pool = safe.length ? safe : options;
    const pick = pool.sort((a, b) => b.card.cost - a.card.cost)[0];
    const res = playCard(s, pick.i);
    if (!res.ok) break;
  }
  endTurn(s);
}

const N = Number(process.argv[2] || 500);
let wins = 0;
let turns = 0;
const loses = [];

for (let i = 0; i < N; i++) {
  const s = createGame();
  let guard = 0;
  while (!s.result && guard++ < 40) botTurn(s);
  if (s.result === 'win') wins++;
  else loses.push(s.infection);
  turns += s.turn;
}

console.log(`games: ${N}`);
console.log(`win rate: ${((wins / N) * 100).toFixed(1)}%`);
console.log(`avg turn reached: ${(turns / N).toFixed(1)}`);
console.log(`avg infection when lost: ${loses.length ? (loses.reduce((a, b) => a + b, 0) / loses.length).toFixed(1) : 'n/a'}`);
