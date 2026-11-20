// Difficulty curve check: bot plays every region N times with the starting deck.
// Usage: node scripts/sim-regions.mjs [gamesPerRegion]
import { createGame, playCard, endTurn } from '../src/engine.js';
import { CARDS, REGIONS, DECK_LIST } from '../src/data.js';

function bot(s) {
  let guard = 0;
  while (guard++ < 20) {
    const opts = s.hand
      .map((id, i) => ({ card: CARDS[id], i }))
      .filter((o) => o.card.cost <= s.atp)
      .filter((o) => o.card.type !== 'cell' || s.player.cells.length < 3);
    if (!opts.length) break;
    const safe = opts.filter((o) => s.inflammation + (o.card.inflam || 0) + (o.card.inflamOnPlay || 0) < s.fever);
    const pick = (safe.length ? safe : opts).sort((a, b) => b.card.cost - a.card.cost)[0];
    if (!playCard(s, pick.i).ok) break;
  }
  endTurn(s);
}

const N = Number(process.argv[2] || 200);
console.log('region        win%   avg turn   reward');
for (const r of REGIONS) {
  let wins = 0, turns = 0;
  for (let i = 0; i < N; i++) {
    const s = createGame({
      deck: DECK_LIST, coreHp: r.coreHp, infection: r.infection,
      infectionGain: r.infectionGain, spawnEvery: r.spawnEvery, wave: r.wave,
    });
    let g = 0;
    while (!s.result && g++ < 40) bot(s);
    if (s.result === 'win') wins++;
    turns += s.turn;
  }
  const pct = ((wins / N) * 100).toFixed(0).padStart(4);
  console.log(`${r.name.padEnd(13)} ${pct}%   ${(turns / N).toFixed(1).padStart(5)}     ${r.reward}`);
}
