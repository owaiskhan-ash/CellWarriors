/* =========================================================================
   CELL WARRIORS — REAL BROWSER LAYOUT PROBE
   -------------------------------------------------------------------------
   Renders the game in headless Chromium at a given viewport and reports the
   *computed, post-layout* geometry of every block that has to fit on a phone
   screen. jsdom cannot do this (no layout engine, no media queries) and the
   wireframe renderer only shows what we already believe; this shows what the
   browser actually does.

   Usage:
     node scripts/layout-probe.mjs                     # 892x412 phone
     node scripts/layout-probe.mjs 900 418 --shot=/tmp/battle.png
     node scripts/layout-probe.mjs 2760 1256 --scale=3.09
   ========================================================================= */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pc from 'puppeteer-core';
const pw = pc;
import chromium from '@sparticuz/chromium';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const W = Number(args[0]) || 892;
const H = Number(args[1]) || 412;
const shotArg = args.find((a) => a.startsWith('--shot='));
const SHOT = shotArg ? shotArg.split('=')[1] : null;
const scaleArg = args.find((a) => a.startsWith('--scale='));
const DPR = scaleArg ? Number(scaleArg.split('=')[1]) : 3;

const exe = await chromium.executablePath();
const browser = await pw.launch({
  args: [...chromium.args, '--allow-file-access-from-files', '--force-device-scale-factor=1'],
  executablePath: exe,
  headless: true,
});

const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: DPR, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`file://${REPO}/index.html`, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts && document.fonts.ready);
/* Headless Chromium throttles requestAnimationFrame, so CSS animations freeze
   part-way through and getBoundingClientRect() reports transformed boxes. Kill
   every animation before measuring geometry, or the numbers are fiction. */
const freeze = () => page.addStyleTag({ content: `
  *,*::before,*::after{animation:none!important;transition:none!important;transform:none!important}` });

/* Drive the game with REAL touch input. touch.js deliberately swallows the
   synthetic click that follows a pointerup, so simulated clicks are ignored —
   only genuine taps exercise the same path a thumb does. */
const tapSel = async (sel, nth = 0) => {
  const box = await page.evaluate((s, n) => {
    const els = [...document.querySelectorAll(s)].filter((e) => e.offsetParent !== null);
    const el = els[n];
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }, sel, nth);
  if (!box) return false;
  await page.touchscreen.tap(Math.round(box.x), Math.round(box.y));
  await new Promise((r) => setTimeout(r, 160));
  return true;
};
const visibleView = () => page.evaluate(() =>
  [...document.querySelectorAll('.view')].filter((v) => !v.classList.contains('hidden')).map((v) => v.id)[0]);

await tapSel('#tt-dismiss');          // thumb tutorial (first run)

/* The DOM's click path is intentionally swallowed on touch, so use the game's
   own entry points (window.__cw, the same surface e2e uses) to reach a battle
   at a known floor, then read real geometry. */
await page.evaluate(() => {
  window.__cw.setTeam(['kaito', 'momo', 'goro']);
  window.__cw.openMission('m02');
});
await new Promise((r) => setTimeout(r, 1400));
const reached = {
  view: await visibleView(),
  team: await page.evaluate(() => (window.__cw.progress.team || []).length),
  hand: await page.evaluate(() => (window.__cw.battle ? window.__cw.battle.hand.length : -1)),
};

/* Geometry of everything that matters, in CSS px of the emulated viewport. */
const geo = await page.evaluate(() => {
  const r = (sel) => {
    const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!el) return null;
    // transforms are disabled by the freeze stylesheet, so this is the plain
    // layout box: a rotated card's bounding box is ~10% taller and made cards
    // that fit look like they overflowed.
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      x: Math.round(b.x), y: Math.round(b.y),
      w: Math.round(b.width), h: Math.round(b.height),
      bottom: Math.round(b.bottom), right: Math.round(b.right),
      display: cs.display, vis: cs.visibility, opacity: cs.opacity,
      of: cs.overflow, minH: cs.minHeight, maxH: cs.maxHeight,
    };
  };
  const phone = window.matchMedia('(orientation: landscape) and (min-width: 560px) and (max-width: 1000px) and (max-height: 560px)').matches;
  const cards = [...document.querySelectorAll('.hand .card')].map((c) => r(c));
  const enemies = [...document.querySelectorAll('.enemy')].map((e) => r(e));
  const enemyImgs = [...document.querySelectorAll('.enemy-art img')].map((i) => {
    const b = i.getBoundingClientRect();
    return { w: Math.round(b.width), h: Math.round(b.height), top: Math.round(b.top), bottom: Math.round(b.bottom),
      natural: `${i.naturalWidth}x${i.naturalHeight}`, complete: i.complete };
  });
  const ov = (sel) => { const e = document.querySelector(sel); return e && !e.classList.contains('hidden'); };
  return {
    viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
    phoneQuery: phone,
    uw: { w: window.innerWidth, h: window.innerHeight },
    views: [...document.querySelectorAll('.view')].filter((v) => !v.classList.contains('hidden')).map((v) => v.id),
    hud: r('.hud-top'),
    stage: r('.battle-stage'),
    arena: r('.arena'),
    enemyRow: r('.enemy-row'),
    handZone: r('.hand-zone'),
    hand: r('.hand'),
    apRow: r('.ap-row'),
    tips: r('.battle-tips'),
    railLeft: r('.rail-left'),
    railRight: r('.rail-right'),
    topStack: r('.top-stack'),
    objective: r('.objective-bar'),
    weakBanner: r('.weak-banner'),
    endTurn: r('#end-turn'),
    turnBannerVisible: ov('#turn-banner'),
    turnBanner: r('#turn-banner'),
    breakOverlay: ov('#breakdown-overlay'),
    cards,
    enemies,
    enemyImgs,
    handVars: (() => {
      const h = document.querySelector('.hand');
      if (!h) return null;
      const cs = getComputedStyle(h);
      return { cardW: cs.getPropertyValue('--card-w').trim(), cardH: cs.getPropertyValue('--card-h').trim(), cardM: cs.getPropertyValue('--card-m').trim() };
    })(),
  };
});

console.log(JSON.stringify({ reached, errors, geo }, null, 2));

if (SHOT) {
  fs.mkdirSync(path.dirname(SHOT), { recursive: true });
  await page.screenshot({ path: SHOT });
  console.log(`\nscreenshot -> ${SHOT}`);
}
await browser.close();
