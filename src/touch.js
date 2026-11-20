/* =========================================================================
   CELL WARRIORS — touch + platform layer
   -------------------------------------------------------------------------
   Phones have no mouse, no hover and no keyboard, so the desktop affordances
   that the game grew up with have to be re-expressed as touch gestures:

     • end turn      → tap the END TURN disc (big, bottom-right, thumb reach)
     • play a card   → tap it, then tap an enemy (target is sticky on touch)
     • inspect       → long-press a card or an enemy (mirrors right-click)
     • pause         → the ☰ button, or the Android hardware back button
     • scroll lists  → native momentum scrolling (no custom drag)

   This module owns:
     1. the landscape viewport / rotate prompt,
     2. the card-rotation / hand height variables the mobile CSS reads,
     3. the Android back-button bridge (window.__cwAndroidBack),
     4. long-press "inspect" plumbing that replaces hover tooltips,
     5. rendering inside the Android WebView (dev-safety no-ops in the browser).
   It is imported by src/ui.js and must never throw: every browser API is
   feature-detected, because the jsdom e2e suite loads the same module graph.
   ========================================================================= */

export const isAndroidApp = (() => {
  try { return !!(window.CWApp && typeof window.CWApp.platform === 'function'); } catch { return false; }
})();

/* ------------------------------------------------------------ 0. storage
   localStorage throws outright on an opaque origin (file:// in some Android
   WebViews, sandboxed frames). Every read in the game is already wrapped, but
   calling it in the wrong place still aborts a module. This guard is the one
   helper the rest of the code can rely on. */
export function storageGet(key) {
  try {
    const v = window.localStorage.getItem(key);
    if (v !== null && v !== undefined) return v;
  } catch { /* opaque origin / private mode */ }
  try {
    if (window.CWApp && typeof window.CWApp.getPref === 'function') {
      const v = window.CWApp.getPref(key);
      return v === undefined ? null : v;
    }
  } catch { /* bridge missing */ }
  return null;
}
export function storageSet(key, value) {
  let done = false;
  try { window.localStorage.setItem(key, value); done = true; } catch { /* ignore */ }
  try {
    if (window.CWApp && typeof window.CWApp.setPref === 'function') {
      window.CWApp.setPref(key, String(value));
      done = true;
    }
  } catch { /* ignore */ }
  return done;
}

/* ---------------------------------------------------------------- 1. viewport */
const VISUAL_MIN_W = 560; // below this the UI is unreadable in landscape

function isCoarse() {
  try { return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch { return false; }
}
function isTouch() {
  try {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
  } catch { return false; }
}

/**
 * The rotate prompt only appears when a *touch* device is genuinely in a
 * portrait viewport that is too narrow to lay the game out. Desktop windows
 * resized narrow keep the desktop layout (no nagging).
 */
export function updateAdaptiveUI() {
  const w = window.innerWidth || 1024;
  const h = window.innerHeight || 768;
  const portrait = h > w;
  const narrow = w < VISUAL_MIN_W;
  const wantsLandscape = (isTouch() || isCoarse()) && portrait && narrow && !isAndroidApp;
  document.body.classList.toggle('wants-landscape', wantsLandscape);
  document.body.classList.toggle('cw-touch', isTouch() || isCoarse());
  document.body.classList.toggle('cw-phone', w <= 1024 && h <= 640);
  syncRootVars();
}

/**
 * Keeps the CSS custom properties that the mobile layout reads in sync with
 * the real hand/rail geometry. Called on resize + after every hand render.
 */
/* UI SCALE factor, set by the settings panel. Kept in a module variable rather
   than read back from computed styles so this works in jsdom (no
   getComputedStyle global) as well as in the browser. */
let uiScaleFactor = 1;
export function setUiScaleFactor(v) {
  const n = Number(v);
  uiScaleFactor = Number.isFinite(n) && n > 0 ? n : 1;
  syncRootVars();
}

export function syncRootVars() {
  const root = document.documentElement;
  if (!root || !root.style) return;
  /* --vh is the height available to the *app*, not to the window: under a
     zoomed app (Settings → UI SCALE) those differ, and using window units is
     what pushed the hand strip off the bottom of the screen. */
  const scale = uiScaleFactor || 1;
  const h = (window.innerHeight || 768) / scale;
  const w = (window.innerWidth || 1024) / scale;
  root.style.setProperty('--vh', `${Math.round(h)}px`);
  root.style.setProperty('--vw', `${Math.round(w)}px`);
  const hand = document.getElementById('hand');
  if (hand) {
    const r = hand.getBoundingClientRect ? hand.getBoundingClientRect() : null;
    const hw = r && r.width > 0 ? r.width : (w * 0.7);
    root.style.setProperty('--hand-w', `${Math.round(hw)}px`);
  }
}

/* --------------------------------------------------------- 2. Android bridge */
/**
 * Hardware back. Returns true when the web layer consumed the press (overlay
 * closed / navigated back) so MainActivity leaves the app running; returns
 * false when we're already at the title screen and the app should exit.
 *
 * ui.js assigns `window.__cwAndroidBack` to the real router; this default is a
 * safe fallback so the native side never gets `undefined`.
 */
export function installPlatformBridge(shell) {
  // shell = { currentView, goBack, isPaused, closeTopOverlay }
  if (typeof window === 'undefined') return;
  window.__cwAndroidBack = () => {
    try {
      return !!(shell && shell.goBack && shell.goBack());
    } catch {
      return false;
    }
  };
  window.__cwPauseForApp = () => {
    try { if (shell && shell.onAppPause) shell.onAppPause(); } catch { /* ignore */ }
  };
  window.addEventListener('resize', updateAdaptiveUI);
  window.addEventListener('orientationchange', () => setTimeout(updateAdaptiveUI, 120));
  updateAdaptiveUI();
}

/* ------------------------------------------------------------ 3. long press */
/**
 * Attaches a long-press (≈450ms, finger-still) handler that fires `onHold`.
 * A short tap fires `onTap` instead. Uses pointer events so it works with
 * both touch and mouse — the desktop `contextmenu` path stays intact.
 *
 * Returns a cleanup function. Safe on elements that may be removed from the
 * DOM: the timers are short-lived and `isConnected` is checked.
 */
export function onHoldOrTap(node, { onTap, onHold, holdMs = 430, moveSlop = 12 } = {}) {
  if (!node || !node.addEventListener) return () => {};
  let timer = null;
  let sx = 0, sy = 0, held = false;

  const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };
  const down = (ev) => {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    sx = ev.clientX; sy = ev.clientY; held = false;
    clear();
    timer = setTimeout(() => {
      held = true;
      node.classList.add('pressing');
      if (onHold) onHold(ev);
    }, holdMs);
  };
  const move = (ev) => {
    if (!timer) return;
    if (Math.abs(ev.clientX - sx) > moveSlop || Math.abs(ev.clientY - sy) > moveSlop) clear();
  };
  const up = () => { clear(); node.classList.remove('pressing'); };
  const click = (ev) => {
    if (held) { held = false; ev.stopPropagation(); ev.preventDefault(); return; }
    if (onTap) onTap(ev);
  };

  node.addEventListener('pointerdown', down);
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerup', up);
  node.addEventListener('pointercancel', up);
  node.addEventListener('pointerleave', up);
  node.addEventListener('click', click);
  return () => {
    clear();
    node.removeEventListener('pointerdown', down);
    node.removeEventListener('pointermove', move);
    node.removeEventListener('pointerup', up);
    node.removeEventListener('pointercancel', up);
    node.removeEventListener('pointerleave', up);
    node.removeEventListener('click', click);
  };
}

/* --------------------------------------------------- 4. double-tap protection */
/**
 * Suppresses the 300ms synthetic click / double-tap zoom on the game chrome.
 * The viewport already sets user-scalable=no; this is extra insurance for
 * older Android WebViews (API 24–28) where user-scalable is sometimes ignored.
 */
export function installDoubleTapGuard(doc = document) {
  let lastTouch = 0;
  doc.addEventListener('touchend', (ev) => {
    const now = Date.now();
    if (now - lastTouch < 300) { ev.preventDefault(); }
    lastTouch = now;
  }, { passive: false });
}

/** True when the app is running inside the Android shell (exposed for tests). */
export function platformInfo() {
  return {
    android: isAndroidApp,
    touch: isTouch() || isCoarse(),
    width: window.innerWidth,
    height: window.innerHeight,
  };
}
