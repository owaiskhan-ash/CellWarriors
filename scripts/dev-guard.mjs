/* =========================================================================
   DEV ONLY — reachability guard for the two controls this branch touches.
   Run with `npm run test:reach` while `npm run dev` is up. It answers the
   only question a dev server can answer: can a player actually GET to
   CONFIG (settings) and to FOCUS mode, at 892x412?
   ========================================================================= */
/* Same browser stack as every other browser test here: puppeteer-core driven by
   @sparticuz/chromium. Run it through scripts/browser-test.sh so the shared
   libraries are on LD_LIBRARY_PATH (npm run test:reach does that). */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pc from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* Self-contained: if no CW_URL is given, boot the real dev server on a side
   port and talk to it over HTTP exactly like the preview does, so this can run
   inside `npm test` with nothing else started. */
let server = null;
let BASE = process.env.CW_URL;
if (!BASE) {
  const PORT = Number(process.env.CW_GUARD_PORT || 5199);
  server = spawn(process.execPath, ['dev-server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  BASE = `http://127.0.0.1:${PORT}/index.html`;
  for (let i = 0; i < 60; i++) {
    try { await fetch(`http://127.0.0.1:${PORT}/index.html`, { method: 'HEAD' }); break; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
}
const stopServer = () => { if (server) { try { server.kill(); } catch { /* gone */ } } };
process.on('exit', stopServer);
const browser = await pc.launch({
  args: [...chromium.args, '--no-sandbox'],
  executablePath: await chromium.executablePath(),
  headless: true,
});
const page = await browser.newPage();
await page.setViewport({ width: 892, height: 412, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(BASE, { waitUntil: 'networkidle0' });
await page.evaluate(() => { const d = document.getElementById('tt-dismiss'); if (d) d.click(); });
const vis = (id) => page.evaluate((v) => !document.getElementById(`view-${v}`).classList.contains('hidden'), id);
const out = [];
const ok = (label, cond) => { out.push(`${cond ? 'PASS' : 'FAIL'}  ${label}`); };

ok('hub command ribbon has CONFIG', !!(await page.$('#czn-cmd-settings')));
ok('hub command ribbon has SIM - LAB', !!(await page.$('#czn-cmd-sim')));
ok('CONTINUE RUN is hidden with no run in progress',
  await page.evaluate(() => getComputedStyle(document.getElementById('czn-cmd-resume')).display === 'none'));
ok('six equal-weight side buttons are gone', (await page.$$('#czn-cmd-side, .czn-cmd-side')).length === 0);
ok('seated crew pods are off on a phone',
  await page.evaluate(() => getComputedStyle(document.querySelector('.czn-hub-crew')).display === 'none'));

// CONFIG reachable by tapping the visible control
await page.click('#czn-cmd-settings');
await new Promise((r) => setTimeout(r, 300));
ok('tapping CONFIG opens settings', await page.evaluate(() => !document.getElementById('settings-modal').classList.contains('hidden')));
const fits = await page.evaluate(() => {
  const p = document.querySelector('.settings-panel');
  return { scroll: p.scrollHeight, client: p.clientHeight, bottom: Math.round(p.getBoundingClientRect().bottom), vh: innerHeight };
});
ok('whole settings list fits the phone screen (no hidden rows)',
  fits.scroll <= fits.client + 1 && fits.bottom <= fits.vh, JSON.stringify(fits));
const dials = await page.evaluate(() => [...document.querySelectorAll('#set-quality option')].map((o) => o.value));
ok('quality dial offers ultra / high / low', dials.join(',') === 'ultra,high,low', dials.join(','));
ok('focus ui row exists', !!(await page.$('#set-focus')));
await page.click('#settings-close');

// FOCUS reachable from the fight
await page.evaluate(() => { window.__cw.setTeam(['kaito', 'momo', 'goro']); window.__cw.openMission('m02'); });
await new Promise((r) => setTimeout(r, 1200));
ok('battle entered', await vis('battle'));
await page.click('#btn-focus');
await new Promise((r) => setTimeout(r, 250));
ok('eye toggles focus-ui on <body>', await page.evaluate(() => document.body.classList.contains('focus-ui')));
ok('eye shows an on-state', await page.evaluate(() => document.getElementById('btn-focus').classList.contains('on')));
const hidden = await page.evaluate(() => {
  const g = (s) => getComputedStyle(document.querySelector(s)).display === 'none';
  return { timeline: g('.action-timeline'), tips: g('.battle-tips'), weak: g('.weak-banner') };
});
ok('focus hides the repeated labels', hidden.timeline && hidden.tips && hidden.weak, JSON.stringify(hidden));
const kept = await page.evaluate(() => [...document.querySelectorAll('#enemies .enemy .badge')].length > 0
  && !!document.getElementById('ap-now') && document.querySelectorAll('#hand .card').length > 0);
ok('focus keeps intent badge, AP and the hand', kept);
ok('focus choice persists to the next boot',
  await page.evaluate(async () => { await new Promise((r) => setTimeout(r, 50)); try { return localStorage.getItem('cw_focus_ui') === '1'; } catch { return false; } }));

ok('no JS errors', errs.length === 0, errs.slice(0, 2).join(' | '));
await browser.close();
stopServer();
console.log(out.join('\n'));
const failed = out.filter((l) => l.startsWith('FAIL')).length;
if (failed) { console.log(`\n${failed} FAILURE(S)`); process.exit(1); }
console.log('\nREACHABILITY OK');
