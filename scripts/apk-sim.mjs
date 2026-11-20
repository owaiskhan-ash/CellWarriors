/* =========================================================================
   CELL WARRIORS — APK / ANDROID WEBVIEW SIMULATION
   -------------------------------------------------------------------------
   Boots the web app *exactly as it ships inside the APK*:

     • unpacked from dist/CellWarriors-*.apk into a temporary folder,
     • loaded from an opaque file:// origin (as android_asset does),
     • with the real CWApp JavascriptInterface (platform / finishActivity /
       getPref / setPref) injected by hand,
     • at 892x412 with a coarse pointer and no network at all.

   This is the closest thing to "install it and see" that CI can do, and it is
   what caught the tutorial flag being unpersistable on an opaque origin.

   Usage: node scripts/apk-sim.mjs [path/to/app.apk]
   ========================================================================= */
import fs from 'fs';
import { execFileSync } from 'child_process';
import { JSDOM, VirtualConsole } from '/home/user/CellWarriors/node_modules/jsdom/lib/api.js';

const APK = process.argv[2] || execFileSync('bash', ['-lc',
  "ls -1 dist/CellWarriors-*.apk 2>/dev/null | tail -1"], { encoding: 'utf8' }).trim();
if (!APK || !fs.existsSync(APK)) {
  console.error('no APK found — run android/build.sh first (or pass a path)');
  process.exit(2);
}
const WORK = fs.mkdtempSync('/tmp/cw-apksim-');
execFileSync('unzip', ['-q', APK, 'assets/*', '-d', WORK]);
const ROOT = `${WORK}/assets`;
console.log(`simulating ${APK}`);
console.log(`  unpacked to ${ROOT}`);
// Opaque origin: local file loads via file:// still resolve (jsdom is lenient)
// but storage throws — which is exactly the WebView case we want to cover.
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push('jsdomError: ' + e.message));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const fetched = [];
const dom = new JSDOM(fs.readFileSync(`${ROOT}/index.html`, 'utf8'), {
  url: 'file:///android_asset/index.html',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(win) {
    Object.defineProperty(win, 'innerWidth', { value: 892, configurable: true });
    Object.defineProperty(win, 'innerHeight', { value: 412, configurable: true });
    win.matchMedia = (q) => ({ matches: /orientation:\s*landscape/.test(q) || /hover:\s*none|pointer:\s*coarse/.test(q),
      media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; } });
    Object.defineProperty(win.navigator, 'maxTouchPoints', { value: 5, configurable: true });
    win.__prefs = {};
    win.CWApp = {
      platform: () => 'android',
      finishActivity: () => { win.__finished = true; },
      vibrate: () => {},
      getPref: (k) => (k in win.__prefs ? win.__prefs[k] : null),
      setPref: (k, v) => { win.__prefs[k] = String(v); },
    };
    win.fetch = (u) => { fetched.push(String(u)); return Promise.reject(new Error('offline')); };
  },
});
const win = dom.window;
global.window = win; global.document = win.document; try { global.localStorage = win.localStorage; } catch { global.localStorage = undefined; }
global.HTMLElement = win.HTMLElement; global.Event = win.Event;
Object.defineProperty(global, 'navigator', { value: win.navigator, configurable: true });

await import(`${ROOT}/src/ui.js?apk=1`);
const $ = (id) => win.document.getElementById(id);
let fails = 0;
const ok = (l, c, x = '') => { if (!c) fails++; console.log(`${c ? 'PASS' : 'FAIL'}  ${l}${x ? ' — ' + x : ''}`); };

ok('page origin is file:// (WebView load)', win.location.protocol === 'file:');
ok('module graph boots with the native bridge', !!win.__cw);
ok('bridge reports android', win.CWApp.platform() === 'android');
ok('back handler registered', typeof win.__cwAndroidBack === 'function');
ok('pause hook registered', typeof win.__cwPauseForApp === 'function');
ok('tutorial shows on fresh install', !$('touch-tut').classList.contains('hidden'));
$('tt-dismiss').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
ok('tutorial dismisses and persists intent', $('touch-tut').classList.contains('hidden')
   && win.__prefs['cw_touch_tut_v1'] === '1');

win.__cw.setTeam(['kaito', 'goro', 'bibi']);
$('btn-start').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
$('btn-deploy').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
ok('map renders 11 floors', $('map-floors').querySelectorAll('.map-floor-row').length === 11);
win.__cw.openMission('m01');
ok('battle starts', !$('view-battle').classList.contains('hidden'));
ok('hand has cards', $('hand').querySelectorAll('.card').length > 0);
const card = $('hand').querySelector('.card');
card.dispatchEvent(new win.PointerEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 320, pointerType: 'touch' }));
card.dispatchEvent(new win.PointerEvent('pointerup', { bubbles: true, clientX: 200, clientY: 320, pointerType: 'touch' }));
ok('tap plays a card in the shell', win.__cw.battle.cardsPlayed > 0);
ok('back from battle pauses', win.__cwAndroidBack() === true && !$('pause').classList.contains('hidden'));
$('pause').classList.add('hidden');
win.__cw.showView('title');
ok('back at title lets the activity exit', win.__cwAndroidBack() === false);
ok('save survives an opaque origin', (() => { try { return win.__cw.progress && win.__cw.progress.version === 5; } catch { return false; } })());
ok('no network fetches attempted', fetched.length === 0, fetched.join(','));
ok('no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '));

const refs = [...fs.readFileSync(`${ROOT}/fonts.css`, 'utf8').matchAll(/url\('\.\/([^']+)'\)/g)].map((m) => m[1]);
ok(`all ${refs.length} packaged fonts exist`, refs.every((r) => fs.existsSync(`${ROOT}/${r}`)));
ok('no @import left in styles.css', !/@import/.test(fs.readFileSync(`${ROOT}/styles.css`, 'utf8')));
const imgs = [...new Set([...fs.readFileSync(`${ROOT}/src/ui.js`, 'utf8').matchAll(/(images\/[A-Za-z0-9_./-]+\.(?:jpg|png|webp))/g)].map((m) => m[1]))];
const missing = imgs.filter((i) => !fs.existsSync(`${ROOT}/${i}`));
ok(`all ${imgs.length} images referenced by ui.js ship in the APK`, missing.length === 0, missing.join(','));
fs.rmSync(WORK, { recursive: true, force: true });
console.log(fails ? `\n${fails} FAILURE(S)` : '\nWEBVIEW SIMULATION OK');
if (fails) process.exit(1);
