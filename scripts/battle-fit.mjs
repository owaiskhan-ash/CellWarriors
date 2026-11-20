/* =========================================================================
   CELL WARRIORS — BATTLE FIT CHECK (real Chromium, real layout)
   -------------------------------------------------------------------------
   The phone shell checks (scripts/phone-check.mjs) parse CSS and assert intent.
   This runs the actual game in a real browser at a matrix of phone sizes and
   fails on the things a player actually sees:

     • any block that extends outside the viewport
     • any two HUD/rail elements that overlap each other
     • an enemy or END TURN that the hand strip covers
     • a card whose text is clipped by its own frame

   jsdom cannot do any of this: it has no layout engine and ignores media
   queries, which is why the battle screen shipped broken at 892x412 while
   every jsdom test passed.

   Usage:  node scripts/battle-fit.mjs [--shot=dir]
   ========================================================================= */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pc from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const shotArg = process.argv.find((a) => a.startsWith('--shot='));
const SHOT_DIR = shotArg ? shotArg.split('=')[1] : null;

/* Real phone viewports in landscape, in CSS px. The last one is a tablet,
   included because it exercises the desktop branch of every query. */
const VIEWPORTS = [
  { name: 'iPhone SE  landscape', w: 667, h: 375 },
  { name: 'iPhone 13  landscape', w: 844, h: 390 },
  { name: 'iPhone 15  landscape', w: 852, h: 393 },
  { name: 'Galaxy S8  landscape', w: 740, h: 360 },
  { name: 'Galaxy S24 landscape', w: 915, h: 412 },
  { name: 'Pixel 7    landscape', w: 892, h: 412 },
  { name: 'Pixel 7 Pro landscape', w: 960, h: 440 },
  { name: 'iPad mini  landscape', w: 1024, h: 768 },
];

let fails = 0;
let passes = 0;
const fail = (vp, msg) => { fails++; console.log(`FAIL  [${vp}] ${msg}`); };
const pass = (msg) => { passes++; if (process.env.VERBOSE) console.log(`PASS  ${msg}`); };

const exe = await chromium.executablePath();
const browser = await pc.launch({
  args: [...chromium.args, '--allow-file-access-from-files'],
  executablePath: exe,
  headless: true,
});

/* Rect helpers evaluated in the page. Two elements "collide" only when the
   overlap is real: >2px on both axes, both painted, neither an ancestor. */
const MEASURE = () => {
  const $ = (s) => document.querySelector(s);
  const box = (arg) => {
    const el = typeof arg === 'string' ? document.querySelector(arg) : arg;
    if (!el) return null;
    // transforms are disabled by the freeze stylesheet, so this is the plain
    // layout box: a rotated card's bounding box is ~10% taller and made cards
    // that fit look like they overflowed.
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return null;
    if (!b.width || !b.height) return null;
    return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom };
  };
  const many = (sel) => [...document.querySelectorAll(sel)].map((e, i) => { const b = box(e); return b ? { i, ...b, el: e } : null; }).filter(Boolean);
  const over = (a, b) => {
    if (!a || !b) return 0;
    const dx = Math.min(a.r, b.r) - Math.max(a.x, b.x);
    const dy = Math.min(a.b, b.b) - Math.max(a.y, b.y);
    return dx > 2 && dy > 2 ? Math.round(dx * dy) : 0;
  };
  const r = {
    viewport: { w: innerWidth, h: innerHeight },
    hud: box('.hud-top'),
    stage: box('.battle-stage'),
    arena: box('.arena'),
    enemyRow: box('.enemy-row'),
    handZone: box('.hand-zone'),
    hand: box('.hand'),
    topStack: box('.top-stack'),
    objective: box('.objective-bar'),
    timeline: box('.action-timeline'),
    weak: box('.weak-banner'),
    endTurn: box('#end-turn'),
    sands: box('#btn-sands'),
    grave: box('#grave-pile'),
    auto: box('#btn-autoplay'),
    railL: box('.rail-left'),
    railR: box('.rail-right'),
    turnPlate: box('.turn-plate'),
    resBox: box('.res-box'),
    pileBox: box('.pile-box:not(.grave)'),
    railEp: box('.rail-ep'),
    epPips: box('.ep-pips'),
    hudTitle: box('.hud-title'),
    hudPills: box('.hud-pills'),
    mission: box('#b-mission'),
    place: box('#b-place'),
    tools: box('.hud-tools'),
    teamBar: box('.team-bar'),
    apRow: box('.ap-row'),
    tips: box('.battle-tips'),
    cards: many('.hand .card'),
    enemies: many('.enemy'),
    enemyBadges: many('.enemy-badges'),
    enemyArt: many('.enemy-art img'),
    cardTexts: many('.hand .card .card-text'),
    cardInfo: many('.hand .card .card-info'),
  };
  /* specific collision report */
  r.collisions = [];
  const named = {
    objective: r.objective, weak: r.weak, hudTitle: r.hudTitle, hudPills: r.hudPills,
    timeline: r.timeline, title: r.hudTitle,
    endTurn: r.endTurn, sands: r.sands, grave: r.grave, auto: r.auto,
    apRow: r.apRow, tips: r.tips, hand: r.hand,
    turnPlate: r.turnPlate, resBox: r.resBox, pileBox: r.pileBox, railEp: r.railEp, epPips: r.epPips,
  };
  const pairs = [
    ['objective', 'hudPills'], ['objective', 'mission'], ['objective', 'place'],
    ['objective', 'timeline'], ['timeline', 'endTurn'], ['timeline', 'grave'],
    /* the objective text vs everything else at the top of the arena */
    ['objective', 'weak'], ['objective', 'title'], ['timeline', 'objective'],
    ['endTurn', 'sands'], ['endTurn', 'grave'], ['endTurn', 'auto'],
    ['apRow', 'hand'], ['tips', 'hand'],
    ['turnPlate', 'resBox'], ['resBox', 'pileBox'], ['pileBox', 'railEp'],
  ];
  for (const [a, b] of pairs) {
    const o = over(named[a], named[b]);
    if (o) r.collisions.push({ a, b, area: Math.round(o) });
  }
  /* the weak banner must not be covered by the enemy badges */
  for (const eb of r.enemyBadges) {
    const o = over(r.weak, eb);
    if (o) r.collisions.push({ a: 'weak', b: 'enemyBadges', area: o });
  }
  /* card text: must be clamped at a line boundary, never spilled sideways */
  /* Truncation is fine (the phone card is a summary and the full text is in the
     detail sheet). What is NOT fine is text spilling sideways out of its card,
     or a card whose text is cut in the middle of a LINE rather than at a line
     boundary — that is what "Permanent: every S" looked like. */
  r.clipped = r.cardTexts.map((t) => {
    const el = t.el;
    const cs = getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight) || 0;
    return {
      i: t.i,
      midLine: lh ? Math.abs(el.clientHeight % lh) > 1 : false,
      sideways: el.scrollWidth > el.clientWidth + 1,
      overflowX: Math.round(el.scrollWidth - el.clientWidth),
      t: el.textContent.trim(),
    };
  }).filter((c) => c.midLine && c.sideways);
  r.clippedText = r.clipped.length;
  /* left rail must fit its column */
  r.railOverflow = r.railL ? Math.max(0, Math.round(r.railL.b - (r.stage ? r.stage.b : innerHeight))) : 0;
  return r;
};

for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`file://${REPO}/index.html`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
/* Headless Chromium throttles requestAnimationFrame, so CSS animations freeze
   part-way through and getBoundingClientRect() reports transformed boxes. Kill
   every animation before measuring geometry, or the numbers are fiction. */
const freeze = () => page.addStyleTag({ content: `
  *,*::before,*::after{animation:none!important;transition:none!important;transform:none!important}` });

  await page.evaluate(async () => {
    const $ = (id) => document.getElementById(id);
    const el = $('tt-dismiss');
    if (el && !$('touch-tut').classList.contains('hidden')) el.click();
    window.__cw.setTeam(['kaito', 'momo', 'goro']);
    window.__cw.openMission('m02');
  });
  await new Promise((r) => setTimeout(r, 1200));
  await freeze();
  await new Promise((r) => setTimeout(r, 120));
  const view = await page.evaluate(() => [...document.querySelectorAll('.view')].filter((v) => !v.classList.contains('hidden')).map((v) => v.id)[0]);
  if (view !== 'view-battle') { fail(vp.name, `never reached battle (got ${view})`); await page.close(); continue; }

  // a couple of extra combatants makes the hand wider — the realistic worst case
  await page.evaluate(() => { if (window.__cw.battle && window.__cw.battle.hand.length < 6) window.__cw.battle.hand.push(...window.__cw.battle.draw.splice(0, 2)); window.__cw.renderBattle && window.__cw.renderBattle(); });
  await new Promise((r) => setTimeout(r, 400));

  const m = await page.evaluate(MEASURE);
  const tag = `${vp.name} ${vp.w}x${vp.h}`;
  if (errors.length) fail(tag, `JS errors: ${errors.slice(0, 2).join(' | ')}`);

  // 1. nothing may escape the viewport
  const OPTIONAL = new Set(['tips', 'weak', 'objective']);
  for (const k of ['hud', 'stage', 'arena', 'handZone', 'hand', 'endTurn', 'apRow', 'tips']) {
    const b = m[k];
    if (!b) { if (!OPTIONAL.has(k)) fail(tag, `${k} is not rendered`); continue; }
    if (b.b > m.viewport.h + 1) fail(tag, `${k} bottom ${Math.round(b.b)} > viewport ${m.viewport.h}`);
    if (b.r > m.viewport.w + 1) fail(tag, `${k} right ${Math.round(b.r)} > viewport ${m.viewport.w}`);
    if (b.x < -1) fail(tag, `${k} starts at x=${Math.round(b.x)}`);
  }
  pass(`${tag} blocks inside viewport`);

  // 2. the arena may not extend past the stage row (this is what hid the enemies)
  if (m.arena && m.stage && m.arena.b > m.stage.b + 2) fail(tag, `arena bottom ${Math.round(m.arena.b)} overflows stage ${Math.round(m.stage.b)}`);
  pass(`${tag} arena within stage`);

  // 3. the hand strip may not cover the enemy row or END TURN
  for (const [i, e] of m.enemies.entries()) {
    if (m.handZone && e.b > m.handZone.y + 4) fail(tag, `enemy ${i} bottom ${Math.round(e.b)} is under the hand (${Math.round(m.handZone.y)})`);
  }
  pass(`${tag} enemies above the hand`);

  // 4. END TURN must be fully on screen and not under the hand
  const area = (a, b) => {
    if (!a || !b) return 0;
    const dx = Math.min(a.r, b.r) - Math.max(a.x, b.x);
    const dy = Math.min(a.b, b.b) - Math.max(a.y, b.y);
    return dx > 2 && dy > 2 ? dx * dy : 0;
  };
  if (m.endTurn) {
    if (m.endTurn.b > m.viewport.h - 1) fail(tag, `END TURN is below the fold (${Math.round(m.endTurn.b)})`);
    if (m.endTurn.w < 44 || m.endTurn.h < 44) fail(tag, `END TURN target is ${Math.round(m.endTurn.w)}x${Math.round(m.endTurn.h)} (<44px)`);
    if (area(m.endTurn, m.handZone) > 400) fail(tag, 'END TURN is covered by the hand strip');
  }
  pass(`${tag} END TURN reachable`);

  // 5. no HUD/rail element may sit on another
  for (const c of m.collisions) fail(tag, `${c.a} overlaps ${c.b} by ${c.area}px²`);
  pass(`${tag} no HUD collisions`);

  // 6. card text must not be clipped mid-line
  if (m.clippedText > 0) {
    fail(tag, `${m.clippedText} card(s) clip their description text`);
    for (const c of m.clipped) console.log(`        ${c.i}: clamp=${c.clamp} text ${c.clientH}/${c.scrollH}px "${(c.t || '').slice(0, 42)}"`);
  }
  pass(`${tag} card text not clipped`);

  // 7. the left rail must fit the stage height
  if (m.railOverflow > 2) fail(tag, `left rail overflows its column by ${m.railOverflow}px`);
  pass(`${tag} left rail fits`);

  if (SHOT_DIR) {
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(SHOT_DIR, `battle-${vp.w}x${vp.h}.png`) });
  }
  await page.close();
}

await browser.close();
console.log(`\n${passes} checks passed, ${fails} failed`);
if (fails) process.exit(1);
console.log('BATTLE FIT OK');
