/* =========================================================================
   CELL WARRIORS — FULL RUN THROUGH THE PHONE UI
   -------------------------------------------------------------------------
   Plays a complete 11-floor Chaos Expedition at 892x412 by clicking real DOM
   nodes (cards, END TURN, map nodes, event choices, reward drafts, rest, shop)
   — no engine shortcuts. It proves the phone shell can actually finish a run:
   every screen transition, modal and decision resolved through the UI a thumb
   would touch.

   Usage: node scripts/full-run.mjs          (prints the run report)
   ========================================================================= */
import fs from 'fs';
import { JSDOM } from '/home/user/CellWarriors/node_modules/jsdom/lib/api.js';

const dom = new JSDOM(fs.readFileSync('/home/user/CellWarriors/index.html', 'utf8'),
  { url: 'http://localhost/', pretendToBeVisual: true });
const w = dom.window;
Object.defineProperty(w, 'innerWidth', { value: 892, configurable: true });
Object.defineProperty(w, 'innerHeight', { value: 412, configurable: true });
w.matchMedia = (q) => ({ matches: /orientation:\s*landscape/.test(q), media: q,
  addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
global.window = w; global.document = w.document; global.localStorage = w.localStorage;
global.HTMLElement = w.HTMLElement; global.Event = w.Event;
Object.defineProperty(global, 'navigator', { value: w.navigator, configurable: true });
const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
await import('/home/user/CellWarriors/src/ui.js?fullrun=1');

const cw = w.__cw;
const $ = (id) => w.document.getElementById(id);
const click = (n) => n && n.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const vis = (id) => !$(id).classList.contains('hidden');

cw.setTeam(['kaito', 'goro', 'bibi']);
click($('btn-start'));
click($('btn-deploy'));
const run0 = cw.run;
console.log('run created · floor', run0.floor, '· earned', run0.earned, '· deck', run0.deck.length);

let guard = 0, battles = 0, events = 0, rewards = 0, rests = 0, nodesTaken = 0;
while (guard++ < 4000) {
  const run = cw.run;
  if (!run || run.finished) break;
  if (cw.battle && cw.battle.result === 'lose') break;

  if (vis('view-battle')) {
    // Play whatever is affordable, then end the turn — pure DOM interaction.
    const cards = [...$('hand').querySelectorAll('.card:not(.unaffordable)')];
    if (cards.length && !cw.battle.result) { click(cards[0]); continue; }
    if (!cw.battle.result) { click($('end-turn')); continue; }
    const btn = $('overlay-btn');
    if (vis('overlay')) { click(btn); continue; }
    break;
  }
  if (vis('view-story')) { click($('btn-story-next')); continue; }
  if (vis('view-event')) {
    if (vis('event-outcome')) { click($('btn-event-done')); continue; }
    const c = $('event-choices').querySelector('button:not([disabled])');
    if (c) { click(c); events++; continue; }
    click($('btn-event-done')); continue;
  }
  if (vis('view-reward')) { const c = $('reward-cards').children[0]; if (c) { click(c); rewards++; } else click($('btn-reward-skip')); continue; }
  if (vis('view-rest')) {
    if (vis('rest-outcome')) { click($('btn-rest-done')); continue; }
    const c = $('rest-choices').querySelector('button:not([disabled])');
    if (c) { click(c); rests++; continue; }
    click($('btn-rest-done')); continue;
  }
  if (vis('view-shop')) {
    // buy the first affordable card once, then leave
    if (!w.__shopBought) { const b = $('shop-cards') && $('shop-cards').querySelector('button:not([disabled])'); if (b) { click(b); w.__shopBought = true; continue; } }
    const leave = $('btn-shop-leave') || $('btn-shop-exit') || $('shop-leave');
    if (leave) { click(leave); continue; }
    const anyBtn = [...$('view-shop').querySelectorAll('button')].pop(); if (anyBtn) { click(anyBtn); continue; }
    break;
  }
  if (vis('view-map')) {
    const nodes = [...$('map-floors').querySelectorAll('.map-node')].filter((n) => !n.classList.contains('locked') && !n.classList.contains('cleared'));
    if (!nodes.length) break;
    click(nodes[0]); nodesTaken++;
    if (vis('view-battle')) battles++;
    continue;
  }
  if (vis('view-title') || vis('view-roster')) break;
  // unknown view: nudge forward
  const ob = $('overlay-btn'); if (vis('overlay') && ob) { click(ob); continue; }
  break;
}

const run = cw.run;
console.log('nodes taken:', nodesTaken, '| battles:', battles, '| events:', events, '| rewards:', rewards, '| rests:', rests);
console.log('floor reached:', run ? run.floor + 1 : '?', '/ 11 | finished:', run ? run.finished : '?');
console.log('damage dealt:', run ? run.totalDamage : '?', '| turns:', run ? run.totalTurns : '?', '| breakdowns:', run ? run.totalBreakdowns : '?');
console.log('result:', run && run.finished ? (run.rank ? 'CLEARED rank ' + run.rank : 'finished') : (cw.battle && cw.battle.result) || 'in progress');
console.log('JS errors:', errs.length ? errs.slice(0, 3) : 'none');

/* ---- assertions ---- */
const checks = [
  ['run reached the final floor', run && (run.finished || (cw.battle && cw.battle.result === 'lose'))],
  ['at least 4 battles were fought', battles >= 4, String(battles)],
  ['boss floor was reached', run && run.floor + 1 >= 11, run ? String(run.floor + 1) : '?'],
  ['no JS errors', errs.length === 0, errs.slice(0, 2).join(' | ')],
  ['run summary is available', !!(run && run.finished)],
];
let fails = 0;
checks.forEach(([l, c, x]) => { if (!c) fails++; console.log(`${c ? 'PASS' : 'FAIL'}  ${l}${x ? ' — ' + x : ''}`); });
if (fails) { console.log(`\n${fails} FAILURE(S)`); process.exit(1); }
console.log('\nFULL RUN OK');
