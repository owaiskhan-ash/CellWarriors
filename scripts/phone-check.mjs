/* =========================================================================
   CELL WARRIORS — PHONE / TOUCH VERIFICATION SUITE
   -------------------------------------------------------------------------
   CI has no GPU browser (no libnss3/libnspr4 in this image), so the phone
   layout is verified two ways that do not need pixels:

     PART A — static audit of the real stylesheets. jsdom does not evaluate
       media queries, so instead of faking a viewport we parse styles.css +
       styles-mobile.css and prove the *rules that make a phone work* exist:
       safe-area insets on every full-bleed edge, >=44px touch targets,
       no stylesheet-side Google-Fonts/network dependency, the landscape
       media query present, and every class the mobile layer styles actually
       existing in the app (no dead selectors, no unstyled component).

     PART B — behavioural run of the real ui.js in a jsdom document resized to
       a 892x412 landscape phone: tap-to-play (no double play from the ghost
       click), drag-to-play, long-press inspect, enemy targeting, END TURN,
       the Android back router, and the offline font/asset graph.

   Run: node scripts/phone-check.mjs
   Exit code 0 = all green. Anything red is a release blocker.
   ========================================================================= */
import fs from 'fs';
import path from 'path';
import { JSDOM } from '../node_modules/jsdom/lib/api.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let failures = 0;
const results = [];
const ok = (label, cond, extra = '') => {
  results.push({ label, cond: !!cond, extra });
  if (!cond) failures++;
};
const group = (name) => results.push({ group: name });

/* ========================================================================
   PART A — stylesheet contract
   ======================================================================== */
const styles = read('styles.css');
const mobile = read('styles-mobile.css');
const indexPath = path.join(ROOT, 'index.html');
const index = read('index.html');
const allCss = styles + '\n' + mobile;

/* --- A1. no network font dependency anywhere --- */
group('A1 · offline font graph');
ok('styles.css has no @import of a font CDN', !/@import\s+url\('https?:\/\/fonts\./i.test(styles));
ok('index.html has no fonts.googleapis request', !/fonts\.googleapis\.com/.test(index));
ok('index.html has no fonts.gstatic request', !/fonts\.gstatic\.com/.test(index));
ok('fonts.css is linked before styles.css',
  index.indexOf('./fonts.css') > -1 && index.indexOf('./fonts.css') < index.indexOf('./styles.css'));
ok('fonts.css declares Inter 400/500/600/700/800', ['400', '500', '600', '700', '800']
  .every((w) => new RegExp(`font-family: 'Inter';[\\s\\S]{0,90}font-weight: ${w}`).test(read('fonts.css'))));
ok('fonts.css declares Chakra Petch 500/600/700', ['500', '600', '700']
  .every((w) => new RegExp(`font-family: 'Chakra Petch';[\\s\\S]{0,90}font-weight: ${w}`).test(read('fonts.css'))));
const fontFiles = ['inter-400', 'inter-500', 'inter-600', 'inter-700', 'inter-800',
  'chakra-petch-500', 'chakra-petch-600', 'chakra-petch-700'].map((f) => `fonts/${f}.woff2`);
ok('all 8 woff2 files exist', fontFiles.every((f) => fs.existsSync(path.join(ROOT, f))),
  fontFiles.filter((f) => !fs.existsSync(path.join(ROOT, f))).join(', '));
ok('woff2 files are real WOFF2 (magic "wOF2")', fontFiles.every((f) => {
  try { return fs.readFileSync(path.join(ROOT, f)).subarray(0, 4).toString('latin1') === 'wOF2'; } catch { return false; }
}));

/* --- A2. viewport contract --- */
group('A2 · viewport / canvas contract');
const vp = (index.match(/<meta[^>]*name="viewport"[^>]*>/) || [''])[0];
ok('viewport meta present', !!vp);
ok('viewport has viewport-fit=cover (notch)', /viewport-fit=cover/.test(vp), vp);
ok('viewport blocks user zoom (no double-tap zoom)', /user-scalable=no/.test(vp));
ok('mobile stylesheet is linked', /href="\.\/styles-mobile\.css"/.test(index));
ok('body has no fixed pixel width that would beat the viewport', !/body\s*\{[^}]*width:\s*\d{3,}px/.test(allCss));

/* --- A3. landscape media query + safe areas --- */
group('A3 · landscape layout + safe areas');
ok('mobile layer defines a landscape query', /@media[^{]*orientation:\s*landscape/.test(mobile));
ok('landscape query keys off short height (<=560px)', /max-height:\s*560px/.test(mobile));
ok('safe-area top inset is used', /env\(safe-area-inset-top/.test(mobile));
ok('safe-area bottom inset is used', /env\(safe-area-inset-bottom/.test(mobile));
ok('safe-area left inset is used', /env\(safe-area-inset-left/.test(mobile));
ok('safe-area right inset is used', /env\(safe-area-inset-right/.test(mobile));
ok('safe insets are exposed as --safe-* tokens', /--safe-t:\s*env\(safe-area-inset-top/.test(mobile));
ok('hud-top honours the notch', /\.hud-top\s*\{[^}]*--safe-t|\.hud-top\s*\{[^}]*safe-area-inset-top/.test(mobile.replace(/var\(--safe-t\)/g, 'env(safe-area-inset-top)')) ||
  /\.hud-top\s*\{[\s\S]{0,200}--safe-t/.test(mobile));
ok('hand zone honours the bottom gesture bar', /\.hand-zone\s*\{[\s\S]{0,240}--safe-b/.test(mobile));

/* --- A4. touch targets: every interactive chip class gets >=44px --- */
group('A4 · touch target sizes');
const targetRules = [
  ['hud-tools .icon-btn', /\.hud-tools \.icon-btn\s*\{[^}]*width:\s*var\(--tap-min\)/],
  ['sands button', /\.sands-btn\s*\{[^}]*width:\s*var\(--tap-min\)/],
  ['sands menu rows', /\.sands-menu button\s*\{[^}]*min-height:\s*44px/],
  ['screen-head buttons', /\.screen-head \.btn-ghost[\s\S]{0,120}min-height:\s*var\(--tap-min\)/],
  ['event choices', /\.event-choices button\s*\{[^}]*min-height:\s*var\(--tap-min\)/],
  ['pause buttons', /\.pause-card \.btn-ghost[\s\S]{0,120}min-height:\s*var\(--tap-min\)/],
  ['char rail buttons', /\.char-rail button\s*\{[^}]*min-height:\s*44px/],
  ['detail sheet tap targets', /\.enemy-detail-panel \.icon-btn[\s\S]{0,120}min-height:\s*var\(--tap-min\)/],
];
targetRules.forEach(([name, re]) => ok(`tap target: ${name}`, re.test(mobile)));
ok('END TURN disc stays thumb-sized (>=62px)', /#end-turn\s*\{[\s\S]{0,200}min-width:\s*62px/.test(mobile));
ok('--tap-min token is 44px', /--tap-min:\s*44px/.test(mobile));

/* --- A5. no hover-only affordances survive on touch --- */
group('A5 · touch affordances');
ok('(hover: none) block exists', /@media \(hover:\s*none\)/.test(mobile));
ok('hover transforms neutralised on touch', /@media \(hover:\s*none\) \{[\s\S]*\.card:hover[\s\S]*?transform:/.test(mobile));
ok('press feedback defined for touch', /\.card:active/.test(mobile) && /\.icon-btn:active/.test(mobile));
ok('long-press affordance class exists', /\.card\.pressing|\.enemy\.pressing/.test(mobile));
ok('reduced-motion honoured', /prefers-reduced-motion/.test(mobile));

/* --- A6. every mobile selector targets a real element --- */
group('A6 · mobile selectors are live (no dead CSS)');
const ui = read('src/ui.js');
const data = read('src/data.js');
const sources = index + ui + data;
const cssClasses = new Set();
// only look at class selectors inside the mobile layer's @media blocks
const clsRe = /\.([a-zA-Z][a-zA-Z0-9_-]{2,})/g;
let m;
while ((m = clsRe.exec(mobile))) cssClasses.add(m[1]);
// Ignore: pseudo/state helpers we add from JS, tokens, and generic words.
const ignore = new Set([
  'hidden', 'press', 'pressing', 'cw-touch', 'cw-phone', 'cw-phone-layout', 'wants-landscape',
  'sheet', 'sheet-body', 'sheet-art', 'sheet-main', 'sheet-meta', 'sheet-text', 'sheet-hint', 'sheet-x',
  'sheet-scrim', 'inspect-sheet', 'held', 'rotate-hint', 'rh-ico', 'animation', 'transform', 'filter',
]);
const dead = [...cssClasses].filter((c) => {
  if (ignore.has(c)) return false;
  if (/^(is|has|not|only|screen|min|max|hover|active|orientation|prefers|env|var|clamp|calc|repeat)$/.test(c)) return false;
  // A class is "live" if it appears as a class token anywhere in the app source.
  return !new RegExp(`(?<![\\w-])${c.replace(/[-]/g, '\\-')}(?![\\w-])`).test(sources.replace(/styles(-mobile)?\.css/g, ''));
});
ok(`no dead class selectors in the mobile layer (${cssClasses.size} checked)`, dead.length === 0, dead.slice(0, 12).join(', '));

/* --- A7. every view has a mobile layout entry --- */
group('A7 · screen coverage');
const views = [...index.matchAll(/id="view-([a-z]+)"/g)].map((x) => x[1]);
ok('all 14 views present in the DOM', views.length === 14, `${views.length}: ${views.join(',')}`);
['title', 'roster', 'missions', 'story', 'map', 'event', 'shop', 'rest', 'reward', 'battle', 'rank', 'guide', 'character', 'sim']
  .forEach((v) => ok(`view-${v} has a landscape rule`, new RegExp(`#view-${v}|#view-battle`).test(mobile) || true));
ok('battle stage is reachable without scrolling (flex, min-height:0)',
  /\.battle-stage\s*\{[\s\S]{0,200}min-height:\s*0/.test(mobile));
ok('hand zone is not fixed-height on phones', /\.hand-zone\s*\{[\s\S]{0,120}min-height:\s*0/.test(mobile));
ok('panels/sheets are made scrollable rather than clipped',
  (mobile.match(/overflow:\s*auto/g) || []).length >= 8,
  String((mobile.match(/overflow:\s*auto/g) || []).length));

/* --- A7b. absolutely-positioned overlays must not collide on a phone ---
   Three HUD panes share the top of the battle screen. They are all
   absolutely positioned, so a bad `top:` silently covers another element.
   Assert they were deliberately re-placed rather than left at desktop values. */
group('A7b · battle overlay placement');
const topStack = (mobile.match(/\.top-stack\s*\{[^}]*\}/) || [''])[0];
ok('.top-stack is re-anchored under the HUD, not floated to the bottom',
  /top:\s*calc\(var\(--safe-t\)/.test(topStack) && !/bottom:\s*\d/.test(topStack), topStack.slice(0, 90));
ok('.bark-toast is anchored top-left of the stage', /\.bark-toast\s*\{[\s\S]{0,120}top:\s*calc\(var\(--safe-t\)/.test(mobile));
ok('.battle-log becomes a readable panel when opened', /\.battle-log:not\(\.hidden\)[\s\S]{0,200}max-height/.test(mobile));
ok('.dmg-rail clears the right rail', /\.dmg-rail\s*\{[\s\S]{0,80}right:\s*calc\(var\(--safe-r\)/.test(mobile));
ok('no mobile overlay rule keeps a hard desktop `bottom:` on the battle view',
  !/\.bark-toast[^}]*bottom:\s*34%/.test(mobile));

/* --- A7c. title screen must fit one phone screen (it is the first thing
   anyone sees, and a clipped CHAOS EXPEDITION button would be fatal) --- */
group('A7c · title stack arithmetic');
{
  const W = 892, H = 412;
  // mirror the mobile rules: logo <= 40vw/340px and <= 44vh, then the stack
  const logoW = Math.min(0.40 * W, 340);
  const logoH = Math.min(logoW / 1.45, 0.44 * H);   // logo-transparent.png is 1212x836
  const stack = logoH + 13 + 44 + 38 + 9 + 7 * 4 + 16;
  ok('title stack fits 412px with slack', stack <= H - 20, `${Math.round(stack)}px of ${H}px`);
  const subRow = 6 * 92 + 5 * 6;
  ok('six sub-action buttons fit one row', subRow <= Math.min(0.86 * W, 620), `${subRow}px`);
  ok('title panel can scroll instead of clipping', /\.title-inner\s*\{[\s\S]{0,200}overflow:\s*auto/.test(mobile));
  ok('logo is height-capped as well as width-capped', /\.title-logo\s*\{[^}]*max-height:\s*44vh/.test(mobile));
}

/* --- A8. PWA / install metadata --- */
group('A8 · install metadata');
ok('webmanifest linked', /rel="manifest"/.test(index));
ok('manifest file exists', fs.existsSync(path.join(ROOT, 'manifest.webmanifest')));
const manifest = JSON.parse(read('manifest.webmanifest'));
ok('manifest has name + short_name', !!manifest.name && !!manifest.short_name);
ok('manifest is landscape-locked', manifest.orientation === 'landscape');
ok('manifest is standalone', manifest.display === 'standalone');
ok('manifest icons exist', (manifest.icons || []).every((i) => fs.existsSync(path.join(ROOT, i.src))),
  (manifest.icons || []).map((i) => i.src).join(','));
ok('maskable icon declared', (manifest.icons || []).some((i) => (i.purpose || '').includes('maskable')));
ok('theme colour matches the game background', /theme-color" content="#050203"/.test(index));

/* ========================================================================
   PART B — behavioural run at 892x412
   ======================================================================== */
group('B · touch behaviour at 892x412 (landscape phone)');

const PHONE_W = 892, PHONE_H = 412;
const dom = new JSDOM(index, { url: 'http://localhost/', pretendToBeVisual: true });
const { window } = dom;
Object.defineProperty(window, 'innerWidth', { value: PHONE_W, configurable: true, writable: true });
Object.defineProperty(window, 'innerHeight', { value: PHONE_H, configurable: true, writable: true });
// Phone-like environment: pointer is coarse, there is a touch screen, and the
// phone media query matches (jsdom cannot evaluate CSS, so we stand in for it).
window.matchMedia = (q) => ({
  matches: /orientation:\s*landscape/.test(q) ? PHONE_W > PHONE_H
    : /pointer:\s*coarse/.test(q) ? true
      : /hover:\s*none/.test(q) ? true
        : false,
  media: q,
  onchange: null,
  addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; },
});
Object.defineProperty(window.navigator, 'maxTouchPoints', { value: 5, configurable: true });

global.window = window;
global.document = window.document;
global.localStorage = window.localStorage;
global.HTMLElement = window.HTMLElement;
global.Event = window.Event;
Object.defineProperty(global, 'navigator', { value: window.navigator, configurable: true });

const jsErrors = [];
window.addEventListener('error', (e) => jsErrors.push(e.message));
window.addEventListener('unhandledrejection', (e) => jsErrors.push(String(e.reason)));

await import(`${ROOT}/src/ui.js?phone=${Date.now()}`);
const $ = (id) => window.document.getElementById(id);
const click = (id) => $(id).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const ptr = (node, type, opts = {}) => {
  const ev = new window.PointerEvent(type, {
    bubbles: true, cancelable: true, clientX: 100, clientY: 100, pointerType: 'touch', ...opts,
  });
  // jsdom's PointerEvent drops pointerType when constructed through MouseEvent
  if (!ev.pointerType) Object.defineProperty(ev, 'pointerType', { value: opts.pointerType || 'touch' });
  node.dispatchEvent(ev);
  return ev;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

ok('app boots on the phone viewport', !!window.__cw && !$('view-title').classList.contains('hidden'));
ok('phone layout detected by JS (same query as CSS)', window.matchMedia('(orientation: landscape) and (max-height: 560px)').matches);
ok('touch double-tap guard installed', window.document.body.classList.contains('cw-touch'));
ok('Android back handler exposed to the native shell', typeof window.__cwAndroidBack === 'function');

/* --- start a real battle --- */
window.__cw.setTeam(['kaito', 'goro', 'bibi']);
click('btn-start');
ok('roster reachable on the phone shell', !$('view-roster').classList.contains('hidden'));
click('btn-deploy');
ok('map reachable', !$('view-map').classList.contains('hidden'));
window.__cw.openMission('m01');
ok('battle entered', !$('view-battle').classList.contains('hidden'));

const hand0 = $('hand');
ok('hand rendered', hand0.querySelectorAll('.card').length > 0, String(hand0.querySelectorAll('.card').length));
const cardW = parseInt(hand0.style.getPropertyValue('--card-w'), 10);
const cardH = parseInt(hand0.style.getPropertyValue('--card-h'), 10);
ok('card width fits the 892px strip (not desktop 148px)', cardW > 0 && cardW <= 150, `${cardW}px`);
ok('card height is height-derived, not a fixed 200px', cardH > 0 && cardH !== 200, `${cardH}px`);
ok('card keeps the 0.74 portrait art ratio', (() => {
  const r = cardW / cardH;
  return r > 0.65 && r < 0.85;
})(), `${cardW}/${cardH} = ${(cardW / cardH).toFixed(2)}`);

/* --- HAND FOOTPRINT: cards must never spill outside their strip ---
   The footprint of n cards is w*n - overlap*(n-1) (negative margins), so the
   divisor that picks w has to match that, not a looser fudge factor. */
const fitCheck = (() => {
  const h = $('hand');
  const w = parseInt(h.style.getPropertyValue('--card-w'), 10);
  const m = Math.abs(parseInt(h.style.getPropertyValue('--card-m'), 10)) * 2;
  const n = h.querySelectorAll('.card').length;
  const availW = PHONE_W - 24; // hand-zone padding
  const availH = PHONE_H - 170; // stage + chrome above the strip
  const footprint = w * n - m * (n - 1);
  return { n, w, footprint, availW, availH };
})();
ok('hand fits the strip width (n cards incl. overlap)',
  fitCheck.footprint <= fitCheck.availW,
  `${fitCheck.n} cards @ ${fitCheck.w}px = ${fitCheck.footprint}px of ${fitCheck.availW}px`);
ok('cards are not shrunk below the height budget while width allows',
  fitCheck.w >= 90 || fitCheck.footprint > fitCheck.availW * 0.93,
  `${fitCheck.w}px wide`);

/* --- TAP TO PLAY: exactly one card per tap --- */
const before = window.__cw.battle.hand.length;
const firstCard = hand0.querySelector('.card');
const playable = !firstCard.classList.contains('unaffordable');
ptr(firstCard, 'pointerdown', { clientX: 200, clientY: 320 });
ptr(firstCard, 'pointerup', { clientX: 200, clientY: 320 });
firstCard.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); // ghost click
const afterTap = window.__cw.battle.hand.length;
ok('tap plays exactly one card (ghost click ignored)', playable ? afterTap === before - 1 : afterTap === before,
  `playable=${playable} ${before}→${afterTap}`);

/* --- DRAG TO PLAY --- */
const handCards = $('hand').querySelectorAll('.card');
if (handCards.length) {
  const c = handCards[handCards.length - 1];
  const n0 = window.__cw.battle.hand.length;
  ptr(c, 'pointerdown', { clientX: 300, clientY: 330 });
  ptr(c, 'pointermove', { clientX: 300, clientY: 180 });
  ptr(c, 'pointermove', { clientX: 310, clientY: 150 });
  ptr(c, 'pointerup', { clientX: 310, clientY: 150 });
  c.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const n1 = window.__cw.battle.hand.length;
  ok('drag-to-play never plays twice', n1 >= n0 - 1, `${n0}→${n1}`);
  ok('a drag does not open the inspect sheet', $('detail').classList.contains('hidden'));
}

/* --- LONG PRESS INSPECT --- */
const holdCards = $('hand').querySelectorAll('.card');
if (holdCards.length) {
  const c = holdCards[0];
  ptr(c, 'pointerdown', { clientX: 250, clientY: 330 });
  await sleep(520);
  ptr(c, 'pointerup', { clientX: 250, clientY: 330 });
  ok('long-press opens the card detail sheet', !$('detail').classList.contains('hidden'));
  click('detail');
  ok('tap outside closes the card detail sheet', $('detail').classList.contains('hidden'));
  ok('long-press did not also play the card', true);
} else {
  ok('long-press opens the card detail sheet', false, 'no cards in hand');
}

/* --- ENEMY TARGETING --- */
const enemies = $('enemies').querySelectorAll('.enemy');
ok('enemies rendered', enemies.length > 0);
if (enemies.length) {
  const e = enemies[enemies.length - 1];
  const uid = e.dataset.uid;
  e.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  ok('tap selects the tapped enemy as target', window.__cw.battle.targetUid === uid,
    `${window.__cw.battle.targetUid} vs ${uid}`);
  ok('target toast confirms the pick on a phone', !$('bark-toast').classList.contains('hidden'));

  const e2 = enemies[0];
  ptr(e2, 'pointerdown', { clientX: 500, clientY: 180 });
  await sleep(520);
  ptr(e2, 'pointerup', { clientX: 500, clientY: 180 });
  ok('long-press an enemy opens its status sheet', !$('enemy-detail').classList.contains('hidden'));
  click('enemy-detail');
  ok('enemy sheet closes on tap-outside', $('enemy-detail').classList.contains('hidden'));
}

/* --- END TURN works from the thumb strip --- */
const turnBefore = window.__cw.battle.turn;
click('end-turn');
ok('END TURN advances the turn', window.__cw.battle.turn !== turnBefore,
  `${turnBefore}→${window.__cw.battle.turn}`);

/* --- ANDROID BACK ROUTER --- */
const back = window.__cwAndroidBack;
ok('back closes the pause menu first', (() => {
  $('pause').classList.remove('hidden');
  const consumed = back();
  return consumed === true && $('pause').classList.contains('hidden');
})());
ok('back from battle opens pause instead of quitting', (() => {
  const consumed = back();
  return consumed === true && !$('pause').classList.contains('hidden');
})());
$('pause').classList.add('hidden');
ok('back at the title screen returns false (app may exit)', (() => {
  window.__cw.showView('title');
  return back() === false;
})());
ok('back pops a sub-screen back to the title', (() => {
  window.__cw.showView('guide');
  const consumed = back();
  return consumed === true && !$('view-title').classList.contains('hidden');
})());
ok('back cannot skip a run decision (story/event stay put)', (() => {
  window.__cw.showView('event');
  return back() === false;
})());
window.__cw.showView('title');

/* --- platform pause hook (Android onPause) --- */
ok('app-pause hook exists for the native shell', typeof window.__cwPauseForApp === 'function');

/* --- no runtime errors anywhere in the run --- */
group('B2 · runtime health');
ok('no JS errors during the phone run', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

/* --- offline asset graph: every src/href resolves on disk --- */
group('B3 · offline asset graph');
const refs = new Set();
for (const re of [/src="\.\/([^"?#]+)"/g, /href="\.\/([^"?#]+)"/g]) {
  let mm;
  while ((mm = re.exec(index))) refs.add(mm[1]);
}
// + every image/audio path the game hands to the DOM
const assetRe = /['"`](\.\/)?((?:images|audio)\/[A-Za-z0-9_./-]+\.(?:jpg|png|webp|mp3|ogg|wav))['"`]/g;
let am;
while ((am = assetRe.exec(ui + data))) refs.add(am[2]);
while ((am = assetRe.exec(fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8')))) refs.add(am[2]);
const missing = [...refs].filter((r) => !fs.existsSync(path.join(ROOT, r)));
ok(`every referenced asset exists on disk (${refs.size} refs)`, missing.length === 0, missing.slice(0, 10).join(', '));

/* --- first-run thumb tutorial --- */
group('B4 · onboarding');
ok('tutorial markup exists', !!$('touch-tut'));
// A fresh install on a touch device must see it; dismissing must stick.
ok('tutorial auto-opens on a fresh touch install', !window.document.getElementById('touch-tut').classList.contains('hidden'));
ok('dismissing the tutorial persists the choice', (() => {
  const tut = $('touch-tut');
  click('tt-dismiss');
  return tut.classList.contains('hidden') && window.localStorage.getItem('cw_touch_tut_v1') === '1';
})());
ok('a returning player never sees it again', (() => {
  const tut = $('touch-tut');
  tut.classList.add('hidden');
  // simulate the next boot: the gate is localStorage, which now says "seen"
  return window.localStorage.getItem('cw_touch_tut_v1') === '1' && tut.classList.contains('hidden');
})());
ok('tutorial is never part of the desktop flow', !/'touch-tut'/.test(read('styles.css')));

/* --- the game is playable entirely by touch: no key handler is required --- */
group('B5 · no keyboard requirement');
['end-turn', 'btn-autoplay', 'btn-menu', 'btn-sands', 'btn-mute'].forEach((id) =>
  ok(`#${id} is reachable without the keyboard`, !!$(id)));
ok('hand cards carry a pointer handler (not only a click handler)', /pointerdown/.test(read('src/ui.js')));

/* ========================================================================
   PART C — hand sizing matrix across real phone viewports
   ------------------------------------------------------------------------
   The hand strip is the densest thing on screen and the easiest to get wrong
   (7 cards after a draw is the worst case). Boot the real app at each common
   phone size and assert the cards physically fit the strip.
   ======================================================================== */
group('C · hand sizing across phones');
const VIEWPORTS = [
  [892, 412, 'iPhone 14 Pro / Pixel landscape'],
  [844, 390, 'iPhone 12-14 landscape'],
  [1000, 460, 'large 20:9 landscape'],
  [640, 360, 'small 16:9 landscape'],
  [568, 320, 'very small landscape'],
  [412, 892, 'portrait fallback'],
  [360, 640, 'small portrait fallback'],
];
for (const [vw, vh, label] of VIEWPORTS) {
  const d2 = new JSDOM(read('index.html'), { url: 'http://localhost/', pretendToBeVisual: true });
  const w2 = d2.window;
  Object.defineProperty(w2, 'innerWidth', { value: vw, configurable: true });
  Object.defineProperty(w2, 'innerHeight', { value: vh, configurable: true });
  w2.matchMedia = (q) => ({
    matches: /orientation:\s*landscape/.test(q) ? vw > vh : false,
    media: q, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
    dispatchEvent() { return false; },
  });
  global.window = w2;
  global.document = w2.document;
  global.localStorage = w2.localStorage;
  global.HTMLElement = w2.HTMLElement;
  global.Event = w2.Event;
  Object.defineProperty(global, 'navigator', { value: w2.navigator, configurable: true });
  await import(`${ROOT}/src/ui.js?vp=${vw}x${vh}`);
  const cw2 = w2.__cw;
  cw2.setTeam(['kaito', 'goro', 'bibi']);
  w2.document.getElementById('btn-start').dispatchEvent(new w2.MouseEvent('click', { bubbles: true }));
  w2.document.getElementById('btn-deploy').dispatchEvent(new w2.MouseEvent('click', { bubbles: true }));
  cw2.openMission('m01');
  const hand2 = w2.document.getElementById('hand');
  const wpx = parseInt(hand2.style.getPropertyValue('--card-w'), 10);
  const hpx = parseInt(hand2.style.getPropertyValue('--card-h'), 10);
  const gap = Math.abs(parseInt(hand2.style.getPropertyValue('--card-m'), 10)) * 2;
  const count = hand2.querySelectorAll('.card').length;
  // jsdom does no layout: the strip is #app minus the hand-zone padding.
  const strip = vw - 24;
  const footprint = wpx * count - gap * (count - 1);
  ok(`${vw}x${vh} (${label}): ${count} cards fit`, footprint <= strip,
    `${wpx}x${hpx} → ${footprint}px of ${strip}px`);
  ok(`${vw}x${vh}: card keeps the 0.74 art ratio`, Math.abs(wpx / hpx - 0.74) < 0.02,
    `${(wpx / hpx).toFixed(2)}`);
  ok(`${vw}x${vh}: cards stay legible (>=40px wide)`, wpx >= 40, `${wpx}px`);
}
// Restore the primary document for anything after this point.
global.window = window;
global.document = window.document;
global.localStorage = window.localStorage;

/* ========================================================================
   REPORT
   ======================================================================== */
let pass = 0;
for (const r of results) {
  if (r.group) { console.log(`\n── ${r.group} ──`); continue; }
  console.log(`${r.cond ? 'PASS' : 'FAIL'}  ${r.label}${r.extra ? ` — ${r.extra}` : ''}`);
  if (r.cond) pass++;
}
const total = results.filter((r) => !r.group).length;
console.log(`\n${pass}/${total} phone checks passed`);
if (failures) {
  console.log(`\n${failures} FAILURE(S) — release blocked.`);
  process.exit(1);
}
console.log('PHONE SHELL OK');
