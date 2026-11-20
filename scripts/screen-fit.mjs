/* Renders every screen in a real browser at phone sizes and asserts nothing
   overflows the viewport. Complements battle-fit.mjs (which owns the battle). */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pc from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VPS = [[667,375],[740,360],[892,412],[915,412],[1024,768]];
const SCREENS = [
  ['title',    () => {}],
  ['roster',   () => { window.__cw.showView('roster'); window.__cw.renderRoster(); }],
  ['missions', () => { window.__cw.showView('missions'); }],
  ['map',      () => { window.__cw.setMode('chaos'); window.__cw.startNewRun(); }],
  ['guide',    () => { window.__cw.openGuide(); }],
  ['character',() => { window.__cw.openCharacter('kaito', 'roster'); }],
  ['sim',      () => { window.__cw.openSim('kaito'); }],
];
let fails = 0;
const browser = await pc.launch({ args: [...chromium.args,'--allow-file-access-from-files'], executablePath: await chromium.executablePath(), headless: true });
for (const [W,H] of VPS) {
  for (const [name, go] of SCREENS) {
    const page = await browser.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e)));
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(`file://${REPO}/index.html`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => { const d=document.getElementById('tt-dismiss'); if (d && !document.getElementById('touch-tut').classList.contains('hidden')) d.click(); });
    await page.evaluate(go).catch(()=>{});
    await new Promise(r => setTimeout(r, 500));
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
    const bad = await page.evaluate(() => {
      const out = [];
      const vis = (el) => { const cs = getComputedStyle(el); return cs.display!=='none' && cs.visibility!=='hidden'; };
      // Content inside a scroll container is reachable by swiping; only count
      // things that are clipped away with no way to scroll to them, plus any
      // horizontal overflow (which no swipe can fix on a fixed-width view).
      const scrollAxis = (el, axis) => {
        for (let n = el.parentElement; n; n = n.parentElement) {
          const cs = getComputedStyle(n);
          const o = axis === 'y' ? cs.overflowY : cs.overflowX;
          if (o !== 'auto' && o !== 'scroll' && o !== 'overlay') continue;
          const bigger = axis === 'y' ? n.scrollHeight > n.clientHeight + 2 : n.scrollWidth > n.clientWidth + 2;
          if (bigger) return true;
        }
        return false;
      };
      for (const el of document.querySelectorAll('.view:not(.hidden) *')) {
        if (!vis(el) || el.closest('.rotate-hint')) continue;
        if (el.closest('svg') && el.tagName !== 'svg') continue;   // SVG internals
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height) continue;
        // a horizontal pill strip that scrolls sideways is fine; content that is
        // simply clipped is not
        const hOver = (b.right > innerWidth + 2 || b.left < -2) && !scrollAxis(el, 'x');
        const vOver = b.bottom > innerHeight + 2 && !scrollAxis(el, 'y');
        if (hOver || vOver) {
          out.push({ cls: String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || el.tagName).slice(0,40),
                     bottom: Math.round(b.bottom), right: Math.round(b.right), left: Math.round(b.left), hOver });
        }
      }
      return { overflow: out.slice(0, 5), count: out.length, vp: [innerWidth, innerHeight] };
    });
    if (bad.count) { fails++; console.log(`FAIL  ${name} @ ${W}x${H}: ${bad.count} element(s) outside the viewport`); bad.overflow.forEach(o => console.log(`        ${o.cls} bottom=${o.bottom} right=${o.right} left=${o.left}`)); }
    if (errs.length) { fails++; console.log(`FAIL  ${name} @ ${W}x${H}: JS error ${errs[0]}`); }
    await page.close();
  }
}
await browser.close();
console.log(fails ? `\n${fails} FAILURE(S)` : '\nSCREEN FIT OK');
if (fails) process.exit(1);
