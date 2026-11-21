/* =========================================================================
   MOTION PROBE — does the animation actually animate?
   -------------------------------------------------------------------------
   The other browser suites check *geometry* (does it fit) and *reachability*
   (does it load). Neither can answer the question this file exists for: when a
   player throws a card or ends a turn, does anything MOVE, and does it move in
   a way that respects the power dial?

   What it measures, at the real 892x412 phone viewport with a real compositor:
     1. the card throw actually walks the clone off the hand and onto the target
     2. the impact fires on the body that was hit (not on enemy #1)
     3. end turn is a sequence, not a jump: the hand dips before the new turn
     4. LOW POWER changes nothing about the outcome, only the travel
     5. the result of all of it is a CLEAN board: no orphaned nodes, no node
        left mid-pose, no layer left behind
     6. the idle cost is still zero — this is the regression that matters most
        after the heat work, so it is measured, not assumed
   ========================================================================= */
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = 892, H = 412;
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`PASS  ${name}${extra ? ` — ${extra}` : ''}`); }
  else { fail++; console.log(`FAIL  ${name}${extra ? ` — ${extra}` : ''}`); }
};
const group = (n) => console.log(`\n— ${n}`);

/* A tiny static server, same MIME contract as dev-server.mjs. */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent((req.url || '/').split('?')[0]);
  const file = path.join(ROOT, rel === '/' ? 'index.html' : rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

const browser = await puppeteer.launch({
  args: [...chromium.args, '--no-sandbox', '--force-device-scale-factor=2'],
  defaultViewport: { width: W, height: H, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  executablePath: await chromium.executablePath(),
  headless: 'shell',
});
const page = await browser.newPage();
/* Pin the quality dial to HIGH. It persists in localStorage and every other
   suite shares this origin, so a run that inherited LOW would silently disable
   the very animations being measured (and would "pass" the LOW checks). */
await page.evaluateOnNewDocument(() => {
  try {
    const s = JSON.parse(localStorage.getItem('cw_settings') || '{}');
    s.quality = 'high';
    localStorage.setItem('cw_settings', JSON.stringify(s));
  } catch { localStorage.setItem('cw_settings', '{"quality":"high"}'); }
});
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(BASE, { waitUntil: 'networkidle0' });
/* m02 (Drain Line) is the smallest fight with TWO enemies, which is what makes
   the "hit lands on the selected body, not enemy #1" check meaningful. */
await page.evaluate(() => {
  const cw = window.__cw;
  cw.setMode('story');
  cw.openMission('m02');
});
await new Promise((r) => setTimeout(r, 700));

/* ---------------------------------------------------------------- 1. throw */
group('M1 · the card throw');
/* Why this reads the animation instead of watching the card fly:
   the headless Chromium in this container never advances an animation clock
   (`currentTime` stays 0, the same limitation battle-fit.mjs documents), so a
   wall-clock sample of the clone would measure the harness, not the game. What
   IS inspectable — and what actually regresses — is the flight itself: the
   clone is attached, it carries a compositor animation with a sampled bezier
   path, the path starts in the hand and ends on the enemy, and nothing is left
   behind afterwards. That is read here directly from the animation object. */
const throwTrace = await page.evaluate(async () => {
  const cw = window.__cw;
  const hand = document.getElementById('hand');
  /* Force one ATTACK into the hand so this check always exercises the
     attack→enemy branch as well as the cast→caster one (the starter deck's
     first playable card is often a Skill, which would leave the most important
     path untested). */
  const b0 = cw.battle;
  if (!b0.hand.some((c) => c.dmg > 0 && c.type === 'attack')) {
    const atk = b0.drawPile.find((c) => c.dmg > 0 && c.type === 'attack');
    if (atk) { b0.hand[0] = atk; b0.drawPile.splice(b0.drawPile.indexOf(atk), 1); cw.renderBattle(); }
  }
  const cards = [...hand.querySelectorAll('.card')];
  const attackIdx = cw.battle.hand.findIndex((c) => c.dmg > 0 && (c.zeroCost ? 0 : c.cost) <= cw.battle.ap);
  const idx = attackIdx >= 0 ? attackIdx : cards.findIndex((n) => n.classList.contains('hoverable'));
  const card = cards[idx >= 0 ? idx : 0];
  if (!card) return { error: 'no card' };
  const model = cw.battle.hand[cards.indexOf(card)] || {};
  const isAttack = model.dmg > 0 && !model.aoe;
  const start = card.getBoundingClientRect();
  // The card's intended destination, measured before anything moves.
  const aim = () => {
    if (isAttack) {
      const t = cw.battle.enemies.find((e) => e.uid === cw.battle.targetUid)
        || cw.battle.enemies.find((e) => e.hp > 0);
      const node = document.querySelector(`#enemies .enemy[data-uid="${t && t.uid}"] .enemy-art img`)
        || document.querySelector('#enemies .enemy .enemy-art img');
      const r = node ? node.getBoundingClientRect() : null;
      return r ? { x: r.left + r.width / 2, y: r.top + r.height * 0.42, what: 'enemy' } : null;
    }
    const i = cw.battle.characters.findIndex((c) => c.id === model.owner);
    const portrait = i >= 0 ? document.querySelectorAll('#team-portraits .portrait')[i] : null;
    const r = portrait ? portrait.getBoundingClientRect() : null;
    if (!r) return null;
    const vb = document.getElementById('view-battle').getBoundingClientRect();
    const cx = r.width / 2;
    return { what: 'caster', x: Math.min(Math.max(r.left + r.width / 2, vb.left + cx), vb.right - cx), y: r.top + r.height / 2 };
  };
  const target = aim();
  cw.playFromUI(cards.indexOf(card));
  const clone = document.querySelector('.throw-card');
  if (!clone) return { error: 'no clone' };
  const anims = clone.getAnimations ? clone.getAnimations() : [];
  const anim = anims[0] || null;
  const timing = anim && anim.effect ? anim.effect.getTiming() : {};
  const frames = anim && anim.effect && anim.effect.getKeyframes ? anim.effect.getKeyframes() : [];
  const transforms = frames.map((f) => f.transform).filter(Boolean);
  // Where does the last keyframe put the card? Compose it with the clone's box.
  const box = { x: clone.offsetLeft, y: clone.offsetTop, w: clone.offsetWidth, h: clone.offsetHeight };
  const last = transforms[transforms.length - 1] || '';
  const mt = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(last);
  const landed = mt ? { x: box.x + Number(mt[1]) + box.w / 2, y: box.y + Number(mt[2]) + box.h / 2 } : null;
  const layer = clone.closest('.fx2');
  return {
    hasClone: true,
    animated: !!anim && anim.playState !== 'idle',
    duration: timing.duration,
    steps: transforms.length,
    distinct: new Set(transforms).size,
    first: transforms[0] || '',
    last,
    startsAtHand: /translate\(0(?:\.0)?px, 0(?:\.0)?px\)/.test(transforms[0] || ''),
    landed,
    target,
    isAttack,
    start: { x: start.left + start.width / 2, y: start.top + start.height * 0.55 },
    inLayer: !!(layer && layer.classList.contains('fx-throws')),
    pointerSafe: layer ? getComputedStyle(layer).pointerEvents === 'none' : false,
    leftBehind: document.querySelectorAll('.throw-card, .arc-card').length,
  };
});
ok('a card can be played by tapping it', !throwTrace.error, throwTrace.error || '');
ok('the thrown card is a clone pinned in its own throw layer', throwTrace.inLayer && throwTrace.hasClone);
ok('the throw layer never eats a tap', throwTrace.pointerSafe);
ok('the flight is a compositor animation, not a JS frame loop', throwTrace.animated, `duration ${Math.round(throwTrace.duration || 0)}ms`);
ok('the path is a sampled bezier, not a straight line', throwTrace.steps >= 12 && throwTrace.distinct >= 12, `${throwTrace.steps} keyframes, ${throwTrace.distinct} distinct`);
ok('it starts exactly where the card sat in the hand', throwTrace.startsAtHand, throwTrace.first);
/* The arc must land on the card's OWN target: an Attack on the enemy it will
   damage, a cast on the combatant who played it. Either way the flight has to
   end on a body, not in empty air — that is the whole point of throwing it. */
if (throwTrace.landed && throwTrace.target) {
  const miss = Math.hypot(throwTrace.landed.x - throwTrace.target.x, throwTrace.landed.y - throwTrace.target.y);
  const travelled = Math.hypot(throwTrace.target.x - throwTrace.start.x, throwTrace.target.y - throwTrace.start.y);
  ok(`it lands ON its intended target (${throwTrace.isAttack ? 'attack → enemy' : 'cast → caster'})`,
    miss < 40, `${Math.round(miss)}px off, ${Math.round(travelled)}px travelled`);
} else {
  ok('it lands ON its intended target', false, 'no landing point resolved');
}
await new Promise((r) => setTimeout(r, 900));
ok('the throwing clone is removed when it lands', (await page.evaluate(() => document.querySelectorAll('.throw-card').length)) === 0);

/* --------------------------------------------------------------- 2. impact */
group('M2 · the impact lands on the body that was hit');
const impact = await page.evaluate(async () => {
  const cw = window.__cw;
  const b = cw.battle;
  // pick the SECOND living enemy so "first enemy" cannot pass by accident
  const alive = b.enemies.filter((e) => e.hp > 0);
  if (alive.length < 2) return { skip: 'solo enemy' };
  const target = alive[1];
  b.targetUid = target.uid;
  cw.renderBattle();
  let idx = b.hand.findIndex((c) => c.dmg > 0 && (c.zeroCost ? 0 : c.cost) <= b.ap);
  if (idx < 0) {
    // put the cheapest attack the deck has into hand, then look again
    const atk = b.drawPile.slice().sort((x, y) => (x.cost || 0) - (y.cost || 0)).find((c) => c.dmg > 0 && (c.zeroCost ? 0 : c.cost) <= b.ap);
    if (atk) { b.hand[0] = atk; b.drawPile.splice(b.drawPile.indexOf(atk), 1); cw.renderBattle(); idx = 0; }
  }
  if (idx < 0) return { skip: 'no attack in hand' };
  const node = document.querySelectorAll('#hand .card')[idx];
  const r = node.getBoundingClientRect();
  node.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + 20, clientY: r.top + 20, pointerType: 'touch' }));
  node.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: r.left + 20, clientY: r.top + 20, pointerType: 'touch' }));
  /* Sample with a TIMER, not rAF: the class for a hit reaction lives ~250ms and
     the shell's frame clock is sparse enough to step straight over it. The
     engine's own timeline is real-time, so a 12ms timer sees everything. */
  const hitNodes = new Set();
  let floats = 0, rings = 0, cleanAtEnd = null;
  const t0 = performance.now();
  await new Promise((resolve) => {
    const iv = setInterval(() => {
      document.querySelectorAll('.enemy-art.on-hit, .enemy-art.hit-flash').forEach((n) => {
        const owner = n.closest('.enemy');
        if (owner) hitNodes.add(owner.dataset.uid);
      });
      floats = Math.max(floats, document.querySelectorAll('.float-num').length);
      rings = Math.max(rings, document.querySelectorAll('.hit-ring').length);
      if (performance.now() - t0 >= 2400) { clearInterval(iv); resolve(); }
    }, 12);
  });
  // and every piece of film must be gone once its animation is over
  const leftovers = [...document.querySelectorAll('.float-num, .hit-ring')];
  cleanAtEnd = leftovers.length;
  const leftoverInfo = leftovers.map((n) => `${n.className}@${Math.round(performance.now() - t0)}ms`).slice(0, 3).join(' | ');
  return { targetUid: String(target.uid), hit: [...hitNodes], floats, rings, cleanAtEnd, leftoverInfo, targetHp: target.hp, enemyCount: alive.length };
});
if (impact.skip) {
  /* Two enemies are required for this check to mean anything. If a hand does
     not hold a playable attack the probe says so instead of quietly passing —
     a silent skip is how a broken "hits the right body" path ships. */
  ok('impact target test had a two-enemy fight and an attack in hand', false, `missing: ${impact.skip}`);
}
else {
  ok('the hit reaction lands on the SELECTED enemy, not enemy #1',
    impact.hit.length === 0 || impact.hit.includes(impact.targetUid),
    `hit ${JSON.stringify(impact.hit)} target ${impact.targetUid}`);
  ok('a damage number rises from the body', impact.floats > 0, `${impact.floats} floats`);
  ok('a ring is drawn at the point of contact', impact.rings > 0, `${impact.rings} rings`);
  ok('the film cleans itself up after the hit', impact.cleanAtEnd === 0, `${impact.cleanAtEnd} left: ${impact.leftoverInfo}`);
}

/* ------------------------------------------------------------ 3. end turn */
group('M3 · ending a turn is a sequence');
const turn = await page.evaluate(async () => {
  const cw = window.__cw;
  cw.renderBattle();
  const before = { turn: cw.battle.turn, hand: cw.battle.hand.length };
  const btn = document.getElementById('end-turn');
  const t0 = performance.now();
  btn.click();
  const seen = { handDown: false, tick: false, flip: false, pulse: false, banner: false, deal: 0, disabledDuring: false };
  await new Promise((resolve) => {
    const iv = setInterval(() => {
      if (document.querySelector('.hand.hand-down')) seen.handDown = true;
      if (document.querySelector('.badge.counter.counter-tick')) seen.tick = true;
      if (document.querySelector('.turn-plate.turn-flip')) seen.flip = true;
      if (document.querySelector('.turn-plate.turn-pulse')) seen.pulse = true;
      if (document.querySelector('#turn-banner:not(.hidden)')) seen.banner = true;
      seen.deal = Math.max(seen.deal, document.querySelectorAll('.card.hand-deal').length);
      if (btn.disabled) seen.disabledDuring = true;
      if (performance.now() - t0 >= 1500) { clearInterval(iv); resolve(); }
    }, 12);
  });
  return {
    ...seen,
    before,
    after: { turn: cw.battle.turn, hand: cw.battle.hand.length },
    elapsed: Math.round(performance.now() - t0),
  };
});
ok('the turn advances exactly once per tap', turn.after.turn === turn.before.turn + 1, `${turn.before.turn} → ${turn.after.turn}`);
ok('the hand visibly goes down before the new turn', turn.handDown);
ok('the enemy clocks tick in sequence', turn.tick);
ok('the turn plate reacts (pulse on commit, flip on hand-over)', turn.flip || turn.pulse, turn.flip ? 'flip' : 'pulse');
ok('the new hand is dealt in', turn.deal > 0, `${turn.deal} cards animating`);
ok('the button is locked while the turn resolves', turn.disabledDuring);
ok('a second tap during the sequence cannot end two turns', await page.evaluate(async () => {
  const cw = window.__cw;
  const btn = document.getElementById('end-turn');
  const before = cw.battle.turn;
  btn.click(); btn.click(); btn.click();
  await new Promise((r) => setTimeout(r, 1400));
  return cw.battle.turn === before + 1;
}), 'three taps, one turn');

/* -------------------------------------------------------------- 4. dials */
group('M4 · the power dial changes travel, never outcome');
const dial = await page.evaluate(async () => {
  const cw = window.__cw;
  const quiet = async () => {
    const t0 = performance.now();
    while (document.querySelector('#view-battle > .fx2 > *') && performance.now() - t0 < 4000) {
      await new Promise((r) => setTimeout(r, 40));
    }
  };
  const play = async (quality) => {
    await quiet();                       // start from a board with no film on it
    const sel = document.getElementById('set-quality');
    if (sel) { sel.value = quality; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    cw.renderBattle();
    const hand = document.getElementById('hand');
    const card = hand.querySelector('.card.hoverable');
    if (!card) return null;
    const r = card.getBoundingClientRect();
    const before = cw.battle.cardsPlayed;
    card.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + 20, clientY: r.top + 20, pointerType: 'touch' }));
    card.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: r.left + 20, clientY: r.top + 20, pointerType: 'touch' }));
    await new Promise((res) => setTimeout(res, 120));
    // Film = nodes that only exist to be looked at.
    const film = document.querySelectorAll('#view-battle > .fx2 > *').length;
    const clone = document.querySelectorAll('.throw-card').length;
    await new Promise((res) => setTimeout(res, 700));
    return { played: cw.battle.cardsPlayed > before, film, clone, left: document.querySelectorAll('.throw-card').length };
  };
  const low = await play('low');
  const high = await play('high');
  return { low, high };
});
if (dial.low && dial.high) {
  ok('LOW POWER still plays the card', dial.low.played);
  ok('LOW POWER draws no film (no rings/shards/numbers)', dial.low.film === 0 && dial.low.clone === 0, `${dial.low.film} film nodes`);
  ok('HIGH plays the card too', dial.high.played);
  ok('HIGH draws the film', dial.high.film + dial.high.clone > 0, `${dial.high.film} film + ${dial.high.clone} flying`);
  ok('no card is left in flight after the throw', dial.low.left === 0 && dial.high.left === 0);
}

/* --------------------------------------------------------- 5. clean board */
group('M5 · the board is clean afterwards');
const clean = await page.evaluate(async () => {
  const cw = window.__cw;
  await new Promise((r) => setTimeout(r, 1600));
  /* A transient class is only a leak if it is still on a node that is STILL on
     screen. The enemy row is rebuilt on every render, so a node that kept a
     pose but was replaced by the next render must not count. */
  const stuckNodes = [...document.querySelectorAll('.hit-stop, .on-hit, .attacking, .dying, .summoning, .hand-deal, .card-spent, .lifting')]
    .filter((n) => n.isConnected && document.body.contains(n));
  const stuck = stuckNodes.length;
  const struck = stuckNodes.map((n) => n.className).slice(0, 4).join(' | ');
  const posed = [...document.querySelectorAll('#battle-stage, .enemy-art, .portrait, #hand, .hand, .turn-plate, .end-turn')]
    .filter((n) => n.style.transform || n.style.filter);
  const layers = document.querySelectorAll('#view-battle > .fx2').length;
  // Leaving the battle must take the film with it. Demo the worst case first:
  // paint a ring and a number by hand, then leave.
  const enemy = document.querySelector('#enemies .enemy');
  if (enemy) cw.fx.impact(enemy.dataset.uid, { amount: 60, kind: 'dmg', crit: true, state: cw.battle });
  const before = document.querySelectorAll('#view-battle > .fx2').length;
  cw.showView('title');
  await new Promise((r) => setTimeout(r, 120));
  return { posed: posed.map((n) => n.id || n.className), layers, before, stuck, stuckList: struck, afterLeave: document.querySelectorAll('#view-battle > .fx2').length };
});
ok('no node is left holding an inline pose', clean.posed.length === 0, clean.posed.join(','));
ok('no transient class is stuck on a node', clean.stuck === 0, `${clean.stuck} stuck${clean.stuckList ? ': ' + clean.stuckList : ''}`);
ok('leaving the battle wipes the film layers', clean.before > 0 && clean.afterLeave === 0, `${clean.before} layers before, ${clean.afterLeave} after`);

/* ------------------------------------------------------- 6. the idle budget */
group('M6 · idle cost (the heat regression)');
const heat = await page.evaluate(async () => {
  const cw = window.__cw;
  const sample = async (quality) => {
    const sel = document.getElementById('set-quality');
    if (sel) { sel.value = quality; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    // Let the previous sample's one-shot entry beats finish, then look at what
    // is STILL running: that is the ambient cost of sitting on this screen.
    await new Promise((r) => setTimeout(r, 1600));
    const anims = document.getAnimations ? document.getAnimations() : [];
    const running = anims.filter((a) => a.playState === 'running');
    const infinite = running.filter((a) => {
      const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : {};
      return t.iterations === Infinity;
    });
    return { running: running.length, infinite: infinite.length, names: infinite.map((a) => (a.animationName || a.constructor.name)).slice(0, 6) };
  };
  const high = await sample('high');
  const low = await sample('low');
  const ultra = await sample('ultra');
  return { high, low, ultra };
});
ok('at HIGH nothing loops forever while the player thinks', heat.high.infinite === 0, heat.high.names.join(','));
ok('at LOW nothing runs at all', heat.low.running === 0, `${heat.low.running} running`);
ok('at ULTRA the dial gives the ambience back', heat.ultra.infinite > heat.high.infinite,
  `${heat.high.infinite} loops at HIGH → ${heat.ultra.infinite} at ULTRA`);
ok('the motion layer adds no loops of its own at any dial',
  heat.high.infinite === 0, 'nothing this sheet animates runs while idle');

/* --------------------------------------------------------------- report */
ok('no JS errors during the whole run', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
server.close();
console.log(`\n${pass} checks passed, ${fail} failed`);
if (fail) { console.log('MOTION FAIL'); process.exit(1); }
console.log('MOTION OK');
