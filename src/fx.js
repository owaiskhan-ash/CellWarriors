/* =========================================================================
   CELL WARRIORS — HAND-ANIMATION ENGINE
   -------------------------------------------------------------------------
   The game already had *effects*: fists of numbers, screen shake, a turn
   banner. What it did not have was **motion behind the player's own hand** —
   the act of picking a card up, throwing it, the enemy taking the hit, the
   board refilling, the turn handing over. That is the part that makes a card
   game feel like a game instead of a spreadsheet, and it is all timing.

   This module owns the choreography. It does not own the game rules: it reads
   the engine's `fx` event stream (the same stream flushFx reads), maps each
   event to a *target node*, replays the line of events as a staggered timeline
   of poses, and cleans up after itself.

   DESIGN CONTRACT
     1. Cancel by token. Every sequence increments `seq`. A pose whose token is
        stale never writes again, so spamming cards can never interleave two
        animations into a shrug.
     2. Idempotent end state. Every pose ends on `''` (rest). If anything is
        interrupted, `settle()` snaps every node back to rest, so the board is
        never left leaning.
     3. Nothing blocks input unless the player asked for it. `playCardIn()` may
        be awaited by the caller; a missed await costs a few ms of overlap, not
        a lost card.
     4. Cheap by default. `timeScale()` is 0 when LOW POWER or OS reduced-motion
        is on (everything still *ends* correctly, it just arrives instantly),
        0.65 in FOCUS, 1 normal, 1.15 in ULTRA. Ambient/idle motion is never
        created here — only poses driven by an actual event, which is why this
        costs nothing while the player is thinking (the heat work in power.css).
     5. jsdom-safe. Every browser API is feature-detected: the jsdom suites load
        this file and must not see a single undefined method.
   ========================================================================= */

/* ------------------------------------------------------------------ 0. guards */
const hasDoc = () => typeof document !== 'undefined' && !!document.createElement;
const hasRaf = () => typeof requestAnimationFrame !== 'undefined';
const nowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeInCubic = (t) => t * t * t;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/* ------------------------------------------------------------------ 1. state */
let seq = 0;                 // token: any pose from an older token is dead
let quality = 'high';        // mirrors the quality dial (setQuality)
let focus = false;           // mirrors FOCUS UI (setFocus)
let paused = false;          // app backgrounded: snap, never animate
let cardsInFlight = 0;       // non-zero while a card throw is playing

/* Live handles, so an interruption can always put the board back. */
const layerRoots = [];

export function isBusy() { return cardsInFlight > 0; }
export function setQuality(q) { quality = q === 'ultra' || q === 'low' ? q : 'high'; }
export function setFocus(on) { focus = !!on; }
export function setPaused(on) { paused = !!on; if (on) settle(); }

/* The single number every duration below is multiplied by. */
export function timeScale() {
  if (paused) return 0;
  if (quality === 'low') return 0;
  try {
    if (typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
  } catch { /* no matchMedia in jsdom */ }
  if (focus) return 0.65;
  if (quality === 'ultra') return 1.15;
  return 1;
}
const ms = (base) => Math.round(base * timeScale());

/* "Can anything actually be seen moving right now?" A zero-size viewport (a
   headless test runner, a jsdom harness, a hidden WebView) has no geometry to
   animate on, so every caller can take its *synchronous* path and the game
   logic never waits on a frame clock that will not tick. This is the one
   predicate the UI uses to decide whether to sequence a transition over time
   or resolve it inline. */
export function animatable() {
  if (timeScale() <= 0) return false;
  const v = view();
  if (!v || !v.getBoundingClientRect) return false;
  const r = v.getBoundingClientRect();
  if (!r || !r.width || !r.height) return false;
  /* A jsdom window has no layout at all; a real browser always does. Timing
     anything there would be waiting on a clock that never advances, so the
     synchronous path is the correct one. */
  return true;
}

/* ------------------------------------------------------------------ 2. utils */
function q(sel, root = null) {
  if (!hasDoc()) return null;
  try { return (root || document).querySelector(sel); } catch { return null; }
}
function qa(sel, root = null) {
  if (!hasDoc()) return [];
  try { return [...(root || document).querySelectorAll(sel)]; } catch { return []; }
}
/* classList.add() throws on a whitespace-separated string, and a few poses are
   two classes at once ("screen-flash flash-huge"), so every class helper here
   splits on whitespace first. jsdom enforces this; a browser silently accepts
   it — which is exactly the kind of difference that turns into a crash only in
   CI, so it is handled at the source. */
const tokens = (cls) => String(cls || '').split(/\s+/).filter(Boolean);

function addClass(node, cls, ttl) {
  if (!node || !node.classList) return;
  const list = tokens(cls);
  if (!list.length) return;
  node.classList.add(...list);
  if (ttl) setTimeout(() => node && node.classList && node.classList.remove(...list), Math.max(1, ms(ttl)));
}
function removeClass(node, cls) {
  if (!node || !node.classList) return;
  node.classList.remove(...tokens(cls));
}

/* Re-trigger a CSS animation class on a node (the void-read trick). */
function retrigger(node, cls, ttl) {
  if (!node || !node.classList) return;
  const list = tokens(cls);
  if (!list.length) return;
  node.classList.remove(...list);
  void (node.offsetWidth || 0);
  node.classList.add(...list);
  if (ttl) setTimeout(() => node && node.classList && node.classList.remove(...list), Math.max(1, ms(ttl)));
}

/* A host layer that lives for one battle and dies with it. Everything this
   module paints outside the existing nodes goes in here, so `enterBattle`
   can wipe the whole stage of film with one call. */
function stage() { return document.getElementById('battle-stage') || document.getElementById('view-battle'); }
function view() { return document.getElementById('view-battle') || document.body; }

function fxLayer(name = 'fx-layer') {
  const host = view();
  if (!host) return null;
  let layer = host.querySelector(`:scope > .${name}`);
  if (!layer) {
    layer = document.createElement('div');
    layer.className = `fx2 ${name}`;
    layer.setAttribute('aria-hidden', 'true');
    host.appendChild(layer);
    layerRoots.push(layer);
  }
  return layer;
}

/* Place a painted node at an absolute viewport rect, inside a layer. */
function pin(node, rect, z = 30) {
  if (!node || !rect) return node;
  const host = node.parentElement;
  const base = host ? host.getBoundingClientRect() : { left: 0, top: 0 };
  node.style.position = 'absolute';
  node.style.left = `${Math.round(rect.left - base.left)}px`;
  node.style.top = `${Math.round(rect.top - base.top)}px`;
  node.style.width = `${Math.round(rect.width)}px`;
  node.style.height = `${Math.round(rect.height)}px`;
  node.style.zIndex = String(z);
  return node;
}

function rectOf(node) {
  if (!node || !node.getBoundingClientRect) return null;
  const b = node.getBoundingClientRect();
  if (!b || !b.width || !b.height) return null;
  return b;
}

/* The box the CREATURE occupies, not the box its container happens to be.
   `.enemy-art` is a full-width flex strip and the cut-out PNGs carry their own
   transparent margin, so ringing or numbering the container puts the effect in
   empty air next to the body. This walks down to the painted element and
   returns its box, with a floor on the size so a thin sprite still gets a
   visible ring. */
function visibleRect(node) {
  if (!node) return null;
  const img = q('.enemy-art img', node) || q('img', node);
  const art = q('.enemy-art', node) || node;
  const ir = img ? rectOf(img) : null;
  const ar = rectOf(art);
  if (ir && ar) {
    // trust the image when it is genuinely narrower than its strip
    return ir.width * ir.height > 0 && ir.height >= ar.height * 0.5 ? ir : ar;
  }
  return ir || ar;
}

/* ------------------------------------------------------------------ 3. timing */
/* A cancellable frame loop. Returns a promise-ish handle you can `.stop()`.
   One loop per pose (never a global ticker) so idle cost stays at zero. */
function tick({ dur, onFrame, onDone, ease = (t) => t }) {
  const started = nowMs();
  const token = seq;
  let stopped = false;
  const handle = {
    stop() { stopped = true; },
    get running() { return !stopped; },
  };
  if (ms(dur) === 0) {                   // instant path: correct, not animated
    try { onFrame && onFrame(1, 1); } catch { /* never break the game */ }
    try { onDone && onDone(); } catch { /* ignore */ }
    stopped = true;
    return handle;
  }
  const step = () => {
    if (stopped || token !== seq) { stopped = true; return; }
    const t = clamp((nowMs() - started) / Math.max(1, ms(dur)), 0, 1);
    try { onFrame && onFrame(ease(t), t); } catch { /* keep the loop alive */ }
    if (t >= 1) {
      stopped = true;
      try { onDone && onDone(); } catch { /* ignore */ }
      return;
    }
    if (hasRaf()) requestAnimationFrame(step);
  };
  if (hasRaf()) requestAnimationFrame(step);
  else { try { onFrame && onFrame(1, 1); onDone && onDone(); } catch { /* ignore */ } }
  return handle;
}

/* Await a real duration, honouring timeScale. Never hangs in jsdom. */
export function wait(baseMs) {
  const d = ms(baseMs);
  if (d <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, d));
}

/* ------------------------------------------------------------------ 4. poses */
/* A pose writes transforms/filters to ONE node over ONE duration, then puts it
   back to rest. `key` marks the node's own resting transform (cards are rotated
   by --rot, so they must return to their CSS transform, not to none). */
const livePoses = new Set();

function pose(node, { dur = 260, ease = easeOutCubic, from = {}, to = {}, props = [], onDone = null, clear = true } = {}) {
  if (!node || !node.style) return { stop: NOOP };
  const token = seq;
  const keys = Object.keys(from).length ? Object.keys(from) : props;
  const entry = { node, token, keys };
  livePoses.add(entry);
  const h = tick({
    dur,
    ease,
    onFrame: (v) => {
      if (entry.token !== seq) return;
      for (const k of keys) {
        const a = from[k];
        const b = to[k] === undefined ? '' : to[k];
        node.style[k] = interpolate(a, b, v);
      }
    },
    onDone: () => {
      livePoses.delete(entry);
      if (clear && entry.token === seq) for (const k of keys) node.style[k] = '';
      try { onDone && onDone(); } catch { /* ignore */ }
    },
  });
  return h;
}

/* Numeric interpolation for the handful of properties we animate by hand.
   Unit-suffixed strings (px, %, deg) are interpolated; keywords snap at 50%. */
function interpolate(a, b, v) {
  if (a === undefined || a === '') return b === '' ? '' : b;
  if (b === undefined || b === '') {
    // animating back to rest: we only know the *animated* start, so fade out
    return v >= 1 ? '' : a;
  }
  const na = parseFloat(a), nb = parseFloat(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) {
    const ua = String(a).replace(/^-?[\d.]+/, '');
    const ub = String(b).replace(/^-?[\d.]+/, '');
    return `${(na + (nb - na) * v).toFixed(3)}${ua || ub}`;
  }
  return v < 0.5 ? a : b;
}

/* Snap the whole board back to rest. Called on interrupt, pause, and when a
   battle ends: the one guarantee this module makes. */
export function settle() {
  seq++;
  for (const entry of livePoses) {
    try { if (entry.node && entry.node.style) for (const k of entry.keys) entry.node.style[k] = ''; } catch { /* ignore */ }
  }
  livePoses.clear();
  cardsInFlight = 0;
  for (const sel of [
    '#battle-stage', '.hand', '.hand-zone', '#view-battle', '.enemy-row',
    '.gameover-slam', '.turn-plate', '.end-turn', '.ap-row',
  ]) {
    for (const n of qa(sel)) {
      n.style.transform = '';
      n.style.filter = '';
      n.style.opacity = '';
    }
  }
  for (const n of qa('.hit-stop, .on-hit, .attacking, .summoning, .dying, .lunge, .cast-ready, .hand-deal, .resting')) {
    n.classList.remove('hit-stop', 'on-hit', 'attacking', 'summoning', 'dying', 'lunge', 'cast-ready', 'hand-deal', 'resting');
  }
  for (const layer of layerRoots) { try { layer.remove(); } catch { /* ignore */ } }
  layerRoots.length = 0;
}

/* ------------------------------------------------------------------ 5. nodes */
/* The engine's fx events carry an enemy `uid` for target events and a character
   `id` for team events. This resolves either to the node currently on screen.
   Enemy nodes are matched by data-uid; characters by portrait position, which is
   how the HUD already orders them. */
export function enemyNode(uid) {
  if (uid === undefined || uid === null) return null;
  return q(`#enemies .enemy[data-uid="${String(uid)}"]`);
}
export function characterNode(id, chars = []) {
  const row = q('#team-portraits');
  if (!row) return null;
  const idx = chars.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  return row.children[idx] || null;
}
function findChar(state, id) {
  return state && Array.isArray(state.characters) ? state.characters.find((c) => c.id === id) || null : null;
}
function findEnemy(state, uid) {
  return state && Array.isArray(state.enemies) ? state.enemies.find((e) => e.uid === uid) || null : null;
}

/* Where a floating word should appear for an event target. */
function anchorFor(ev, state) {
  if (!ev || !state) return null;
  if (ev.uid !== undefined) {
    const node = enemyNode(ev.uid);
    const r = visibleRect(node) || rectOf(node);
    if (!r) return null;
    return { node, rect: r, x: r.left + r.width / 2, y: r.top + r.height * 0.38 };
  }
  if (ev.id !== undefined) {
    const node = characterNode(ev.id, state.characters);
    const r = rectOf(node) || rectOf(q('#team-hp-fill'));
    if (!r) return null;
    return { node, rect: r, x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return { node: q('.arena') || stage(), rect: rectOf(q('.arena')) || rectOf(stage()), x: 0, y: 0 };
}

/* ------------------------------------------------------------------ 6. floats */
/* The floating number that rises out of the thing that was hit. Independent of
   the right-edge damage rail (flushFx keeps that as the running log): this is
   diegetic — it comes from the enemy, in the enemy's direction of impact. */
const GLYPH = { dmg: '', poison: '☠', bleed: '✚', toxin: '⚗', heal: '✚', shield: '◆', stress: '✶', crit: '★', counter: '»' };
const TONE = {
  dmg: 'dmg', weak: 'weak', crit: 'crit', poison: 'poison', bleed: 'bleed', toxin: 'toxin',
  heal: 'heal', shield: 'shield', stress: 'stress', counter: 'counter', chain: 'chain',
};

export function floatText({ x, y, text, tone = 'dmg', sub = '', big = 1, drift = 0, glyph = '' }) {
  if (!hasDoc() || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const layer = fxLayer('fx-floats');
  if (!layer) return null;
  const n = document.createElement('div');
  n.className = `float-num tone-${TONE[tone] || 'dmg'}`;
  n.style.setProperty('--fx-big', String(clamp(big, 0.7, 2.6)));
  n.style.setProperty('--fx-drift', `${Math.round(drift)}px`);
  n.innerHTML = `<b>${glyph ? `<i class="float-gl">${glyph}</i>` : ''}${text}</b>${sub ? `<span>${sub}</span>` : ''}`;
  const hostBox = layer.getBoundingClientRect();
  n.style.left = `${Math.round(x - hostBox.left)}px`;
  n.style.top = `${Math.round(y - hostBox.top)}px`;
  layer.appendChild(n);
  setTimeout(() => n.remove(), Math.max(320, ms(1000)));
  return n;
}

/* ------------------------------------------------------------------ 7. impact */
/* The three hit layers, from cheapest to most expensive:
     · on the TARGET  — a squash + flash on the sprite and a ripple ring
     · on the SCREEN  — a directional shove of the whole stage, scaled by damage
     · on the ROOM    — vignette flash + radial speed lines for a big hit
   Separated so ULTRA/FOCUS can buy different amounts of them, and so a tiny
   3-damage ping does not shake the world. */
export function impact(uid, { amount = 0, kind = 'dmg', crit = false, weak = false, state = null } = {}) {
  const node = enemyNode(uid);
  if (!node) return;
  const heavy = amount >= 40 || crit;
  const huge = amount >= 90;
  const art = q('.enemy-art', node) || node;

  if (ms(40) > 0) {
    retrigger(art, 'on-hit', 320);
    if (kind === 'dmg' || kind === 'crit') retrigger(art, 'hit-flash', 220);
  }
  rippleAt(node, heavy ? 'big' : 'small', crit ? 'crit' : weak ? 'weak' : 'hit');
  if (heavy) shardsAt(node, crit ? 10 : 7);
  if (huge) { flashScreen('huge'); speedLines(); }

  const shakeAmt = clamp(amount / 26, 0, 1);
  if (shakeAmt > 0.06) shoveStage(shakeAmt, crit ? 'crit' : 'hit');

  const ch = findEnemy(state, uid);
  if (ch && ch.hp <= 0) die(uid);
}

function rippleAt(node, size = 'small', tone = 'hit') {
  const layer = fxLayer('fx-rings');
  const host = layer;
  if (!host || !node) return;
  const r = rectOf(node);
  const hostBox = host.getBoundingClientRect();
  if (!r) return;
  const ring = document.createElement('i');
  ring.className = `hit-ring ring-${size} ring-${tone}`;
  const d = Math.max(72, Math.max(r.width, r.height) * (size === 'big' ? 1.05 : 0.8));
  ring.style.width = `${Math.round(d)}px`;
  ring.style.height = `${Math.round(d)}px`;
  ring.style.left = `${Math.round(r.left + r.width / 2 - d / 2 - hostBox.left)}px`;
  ring.style.top = `${Math.round(r.top + r.height * 0.42 - d / 2 - hostBox.top)}px`;
  host.appendChild(ring);
  setTimeout(() => ring.remove(), Math.max(200, ms(620)));
}

function shardsAt(node, count = 6) {
  const layer = fxLayer('fx-shards');
  const host = layer;
  if (!host || !node) return;
  const r = visibleRect(node) || rectOf(node);
  const hostBox = host.getBoundingClientRect();
  if (!r) return;
  const cx = r.left + r.width / 2 - hostBox.left;
  const cy = r.top + r.height * 0.42 - hostBox.top;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('i');
    s.className = 'shard';
    const ang = (Math.PI * 2 * i) / count + Math.random() * 0.7;
    const dist = 34 + Math.random() * 62;
    s.style.left = `${Math.round(cx)}px`;
    s.style.top = `${Math.round(cy)}px`;
    s.style.setProperty('--dx', `${Math.round(Math.cos(ang) * dist)}px`);
    s.style.setProperty('--dy', `${Math.round(Math.sin(ang) * dist)}px`);
    s.style.setProperty('--rot', `${Math.round(Math.random() * 360)}deg`);
    s.style.animationDelay = `${Math.round(Math.random() * 60)}ms`;
    host.appendChild(s);
    setTimeout(() => s.remove(), Math.max(240, ms(720)));
  }
}

function shoveStage(strength, kind = 'hit') {
  const st = document.getElementById('battle-stage');
  if (!st || ms(20) === 0) return;
  const amp = (kind === 'crit' ? 11 : 7) * strength;
  retrigger(st, 'stage-shove', 300);
  st.style.setProperty('--shove', `${amp.toFixed(1)}px`);
}

function flashScreen(kind = 'huge') {
  const v = view();
  if (!v || ms(20) === 0) return;
  retrigger(v, `screen-flash flash-${kind}`, kind === 'huge' ? 420 : 260);
}

function speedLines() {
  const layer = fxLayer('fx-lines');
  if (!layer) return;
  layer.innerHTML = '';
  for (let i = 0; i < 14; i++) {
    const l = document.createElement('i');
    l.className = 'speed-line';
    l.style.setProperty('--ang', `${Math.round((360 / 14) * i + Math.random() * 9)}deg`);
    l.style.setProperty('--len', `${Math.round(30 + Math.random() * 40)}%`);
    l.style.animationDelay = `${Math.round(Math.random() * 70)}ms`;
    layer.appendChild(l);
  }
  setTimeout(() => { if (layer) layer.innerHTML = ''; }, Math.max(260, ms(620)));
}

/* ------------------------------------------------------------------ 8. statuses */
/* Effects that belong to a *recurring* thing rather than one hit: poison
   bubbling, bleed weeping, toxin corroding, Mark/Vulnerable pinning a reticle
   on the target so the player can see what will multiply their next hit. */
export function statusPop(uid, kind, { amount = 0 } = {}) {
  const node = enemyNode(uid);
  if (!node) return;
  const host = fxLayer('fx-status');
  if (!host) return;
  const r = rectOf(q('.enemy-plate', node) || node);
  const hostBox = host.getBoundingClientRect();
  if (!r) return;
  const n = document.createElement('i');
  n.className = `status-pop st-${kind}`;
  n.style.left = `${Math.round(r.left + r.width * (0.35 + Math.random() * 0.3) - hostBox.left)}px`;
  n.style.top = `${Math.round(r.top - hostBox.top)}px`;
  n.textContent = kind === 'poison' ? '☠' : kind === 'bleed' ? '✚' : kind === 'toxin' ? '⚗' : '◆';
  host.appendChild(n);
  setTimeout(() => n.remove(), Math.max(300, ms(820)));
  if (amount >= 12) flashScreen('small');
}

/* A reticle that sits over an enemy that is Marked / Vulnerable / Ravaged.
   This is *state*, not an event, so it is toggled by the render pass and lives
   as long as the condition does. */
export function syncReticles(state) {
  if (!hasDoc() || !state) return;
  for (const e of state.enemies || []) {
    const node = enemyNode(e.uid);
    if (!node) continue;
    const marked = (e.mark || 0) > 0;
    const vuln = (e.vuln || 0) > 0;
    const rav = !!e.ravaged;
    node.classList.toggle('has-reticle', marked || vuln || rav);
    node.dataset.reticle = marked ? 'mark' : rav ? 'ravage' : vuln ? 'vuln' : '';
  }
}

/* ------------------------------------------------------------------ 9. cards */
/* THE CARD THROW — the centrepiece.
   A hand card is cloned into a fixed layer so the real hand can be re-rendered
   underneath it without the clone moving. The clone then flies a bezier arc:
   it lifts out of the fan, noses up, accelerates, and slams flat onto the
   enemy's centre, throwing a shockwave on arrival. The hand closes the gap
   behind it (the surviving cards slide left).
   Returns a promise (resolved early on reduced motion / LOW POWER) so the
   caller can order the impact after the throw. */
export function playCardIn(cardNode, card, state, startRect = null) {
  /* The caller re-renders the hand *before* this runs (it must — the card has
     already left the model), so the node it hands over is detached and has no
     geometry. The rect is therefore captured before the render and passed in;
     `rectOf(cardNode)` is only the fallback for a caller that still has the
     live node. */
  const r = startRect || rectOf(cardNode);
  /* WHERE THE CARD GOES. An Attack is thrown AT the body it will damage — the
     selected enemy, which is the same uid the engine just resolved, so the arc
     can never disagree with the numbers. Everything else (a Skill, an Upgrade,
     a Shield, a Heal) is cast INTO the combatant who played it: the card flies
     up to that portrait and lands there. That distinction is real information
     — "this affects me, not them" — and it was the thing the old single-target
     arc got wrong for every non-attack card. */
  const isAttack = card && card.dmg > 0 && !card.aoe;
  const casterNode = card && card.owner ? characterNode(card.owner, state ? state.characters : []) : null;
  const targetNode = isAttack
    ? (enemyNode(state && state.targetUid) || q('#enemies .enemy'))
    : casterNode;
  const tr = (isAttack ? visibleRect(targetNode) : rectOf(targetNode)) || rectOf(targetNode);
  const token = ++seq;
  cardsInFlight++;
  const done = () => { cardsInFlight = Math.max(0, cardsInFlight - 1); };

  if (!r || !tr || ms(420) === 0) {           // instant path: still mark the throw
    if (cardNode) retrigger(cardNode, 'card-lifted', 200);
    setTimeout(done, 0);
    return Promise.resolve();
  }

  const layer = fxLayer('fx-throws');
  if (!layer) { done(); return Promise.resolve(); }
  const base = layer.getBoundingClientRect();
  if (!cardNode || !cardNode.cloneNode) { done(); return Promise.resolve(); }
  const clone = cardNode.cloneNode(true);
  clone.classList.add('throw-card');
  clone.style.position = 'absolute';
  clone.style.width = `${Math.round(r.width)}px`;
  clone.style.height = `${Math.round(r.height)}px`;
  clone.style.left = `${Math.round(r.left - base.left)}px`;
  clone.style.top = `${Math.round(r.top - base.top)}px`;
  layer.appendChild(clone);

  const startX = r.left + r.width / 2;
  const startY = r.top + r.height * 0.55;
  /* CLAMP THE LANDING POINT INTO THE FRAME. The combatant portraits live in the
     very top-left corner, so a card cast at one would fly half off the screen.
     An attack always has room (it flies into the arena); a cast is steered to
     the nearest point that is still fully visible, which reads as the spell
     being absorbed into the caster rather than as a clipping bug. */
  const vb = view().getBoundingClientRect();
  // the CARD has to fit, not just its centre: reserve its own half-size so a
  // cast at a corner portrait never hangs off the frame.
  const mx = r.width / 2 + 10;
  const my = r.height / 2 + 6;
  const clampX = (x) => Math.min(Math.max(x, vb.left + mx), vb.right - mx);
  const clampY = (y) => Math.min(Math.max(y, vb.top + my), vb.bottom - my);
  const endX = isAttack ? tr.left + tr.width / 2 : clampX(tr.left + tr.width / 2);
  const endY = isAttack ? tr.top + tr.height * 0.42 : clampY(tr.top + tr.height / 2);
  const dx = endX - startX;
  const dy = endY - startY;
  const ctrl = { x: dx * 0.34, y: -Math.max(90, Math.abs(dy) * 0.55) };  // upward bezier nose
  const rot0 = Number(String(cardNode?.style.getPropertyValue('--rot') || '0').replace('deg', '')) || 0;
  const rotEnd = -14;
  const scaleMid = 1.16;
  const scaleEnd = 0.82;   // attack only: the card flattens onto the body
  const DUR = ms(420);

  /* THE FLIGHT IS A COMPOSITOR ANIMATION, NOT A JAVASCRIPT LOOP.
     A 60fps rAF loop that writes an inline transform every frame is the single
     most expensive way to move a card: every frame is a style write, a layout
     read and a main-thread paint, and on a phone that is how a game starts
     feeling warm. Instead the bezier is baked into ~16 sampled keyframe
     offsets and handed to the Web Animations API, which hops the element onto
     its own compositor layer and interpolates it there. The main thread paints
     nothing while the card is in the air — and the arrival still fires on the
     animation's own `finished` promise.

     jsdom has no animation clock, so the fallback is the synchronous path: the
     clone is placed at its destination and the arrival fires immediately. */
  const sample = (t) => {
    const u = 1 - t;
    const bx = 2 * u * t * ctrl.x + t * t * dx;
    const by = 2 * u * t * ctrl.y + t * t * dy;
    const s = isAttack
      ? (t < 0.55
        ? 1 + (scaleMid - 1) * easeOutCubic(t / 0.55)
        : scaleMid + (scaleEnd - scaleMid) * easeInCubic((t - 0.55) / 0.45))
      : (t < 0.5
        ? 1 + (scaleMid - 1) * easeOutCubic(t / 0.5)          // swell with the cast
        : scaleMid - 0.55 * easeInCubic((t - 0.5) / 0.5));    // then collapse into the body
    const rot = rot0 + (rotEnd - rot0) * easeInOutCubic(t);
    return `translate(${bx.toFixed(1)}px, ${by.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${s.toFixed(3)})`;
  };
  /* A CAST IS ABSORBED, NOT THROWN: the last third of a non-attack flight fades
     the card out as it shrinks into the caster, which is the language of a
     spell resolving on the body that played it. An attack stays fully opaque
     until it slams — you must be able to see the card that hit you. */
  const opacityAt = (t) => {
    if (isAttack) return t > 0.9 ? 1 - (t - 0.9) / 0.1 : 1;
    return t > 0.62 ? Math.max(0, 1 - (t - 0.62) / 0.34) : 1;
  };
  const STEPS = 16;
  const frames = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    frames.push({
      transform: sample(t),
      opacity: opacityAt(t).toFixed(3),
      offset: t,
    });
  }

  return new Promise((resolve) => {
    let arrived = false;
    const arrive = () => {
      if (arrived) return;
      arrived = true;
      if (token === seq) {
        if (isAttack) slamin(targetNode);          // the arrival: a hit
        else if (targetNode) {                     // the arrival: absorbed
          rippleAt(targetNode, 'small', 'shield');
          beam(targetNode, card && card.type === 'skill' ? 'shield' : 'heal');
        }
        try { clone.remove(); } catch { /* already gone */ }
      }
      done();
      resolve();
    };
    let anim = null;
    try {
      if (clone.animate && DUR > 0) {
        anim = clone.animate(frames, { duration: DUR, easing: 'linear', fill: 'forwards' });
      }
    } catch { anim = null; }
    if (anim && anim.finished) {
      /* Two clocks, whichever fires first. `finished` is the precise one, but it
         never settles if the compositor stops advancing (a backgrounded tab, or
         any headless runner), and an impact that waits on it would land late or
         not at all. A plain timer of the same duration is exact enough for a
         420ms throw and is immune to that. */
      anim.finished.then(arrive).catch(arrive);
      setTimeout(arrive, DUR + 40);
    } else if (DUR > 0) {
      tick({ dur: 420, ease: (t) => t, onFrame: (_, t) => { if (token === seq) clone.style.transform = sample(t); }, onDone: arrive });
    } else {
      arrive();
    }
  });
}

/* The moment the card lands: a ring, a wedge, and the sprite recoiling. */
function slamin(targetNode) {
  if (!targetNode) return;
  rippleAt(targetNode, 'card', 'hit');
  const layer = fxLayer('fx-wedges');
  const host = layer;
  const r = visibleRect(targetNode);
  if (!host || !r) return;
  const hb = host.getBoundingClientRect();
  const w = document.createElement('i');
  w.className = 'impact-wedge';
  w.style.left = `${Math.round(r.left + r.width / 2 - hb.left)}px`;
  w.style.top = `${Math.round(r.top + r.height * 0.42 - hb.top)}px`;
  host.appendChild(w);
  setTimeout(() => w.remove(), Math.max(220, ms(520)));
}

/* Cards leaving the deck at the start of a turn: a staggered deal. The hand is
   already rendered by the time this runs, so it just *pushes* each card in from
   the draw pile's direction — no layout change, no re-render. */
export function dealHand(count, { piles = true } = {}) {
  const cards = qa('#hand .card');
  if (!cards.length) return;
  const pile = q('#draw-pile');
  const pr = rectOf(pile);
  cards.forEach((c, i) => {
    if (ms(10) === 0) return;
    c.style.setProperty('--deal-from-x', pr ? `${Math.round(pr.left + pr.width / 2 - (rectOf(c)?.left || 0))}px` : '-40px');
    c.style.setProperty('--deal-from-y', pr ? `${Math.round(pr.top + pr.height / 2 - (rectOf(c)?.top || 0))}px` : '-90px');
    c.style.setProperty('--deal-delay', `${Math.round(ms(52) * i)}ms`);
    c.classList.remove('hand-deal');
    void (c.offsetWidth || 0);
    c.classList.add('hand-deal');
    setTimeout(() => c.classList.remove('hand-deal'), Math.max(200, ms(520 + 52 * i)));
  });
  if (piles && pr && ms(10) > 0) retrigger(pile, 'pile-pull', 420);
}

/* The hand "closes the gap" after a card leaves. The cards to the right of the
   played slot slide in from the space it left, so the fan contracts as a single
   movement instead of snapping to its new layout. Called AFTER the re-render,
   on the fresh nodes. */
export function handSettle(fromIndex = 0, gapPx = 0) {
  if (ms(10) === 0 || !gapPx) return;
  qa('#hand .card').forEach((c, i) => {
    if (i < fromIndex) return;
    c.style.setProperty('--close-x', `${Math.round(gapPx)}px`);
    c.style.setProperty('--close-delay', `${Math.round(ms(12) * Math.min(4, i - fromIndex))}ms`);
    retrigger(c, 'hand-close', 300);
  });
}

/* ------------------------------------------------------------------ 10. turn */
/* END TURN choreography. Three beats, in order, each with its own class so the
   CSS can draw them:
     1. your hand goes down and the hand strip exhales          (.hand-down)
     2. the ENEMY clocks tick — each living enemy's counter pops  (.counter-tick)
     3. the new turn lands: banner, plate, hand deal            (caller's job)
   Returns a promise so the caller can render the new turn after it. */
export async function endTurnSequence(state) {
  const token = ++seq;
  const hand = q('#hand');
  const zone = q('.hand-zone');
  const turnPlate = q('.turn-plate');
  if (ms(10) > 0) {
    addClass(hand, 'hand-down', 420);
    addClass(zone, 'zone-out', 420);
    retrigger(turnPlate, 'turn-pulse', 420);
  }
  await wait(200);
  if (token !== seq) return false;
  /* enemy clocks: pop each counter badge, in counter order (who acts first) */
  const alive = ((state && state.enemies) || []).filter((e) => e.hp > 0)
    .slice()
    .sort((a, b) => a.counter - b.counter);
  alive.forEach((e, i) => {
    const node = enemyNode(e.uid);
    const badge = node && q('.badge.counter', node);
    if (!badge) return;
    setTimeout(() => retrigger(badge, 'counter-tick', 300), Math.round(ms(40) * i));
  });
  await wait(150 + Math.min(3, alive.length) * 40);
  if (token !== seq) return false;
  /* the turn plate flips: old number out, new number in (the caller re-renders) */
  if (ms(10) > 0) retrigger(turnPlate, 'turn-flip', 420);
  await wait(80);
  return token === seq;
}

/* The moment the enemy actually acts — used by the outcome pass when the fx
   stream contains a counter/hurt event, not just on the player's turn. */
export function enemyWindup(uid) {
  const node = enemyNode(uid);
  if (!node) return;
  const art = q('.enemy-art', node) || node;
  if (ms(10) > 0) retrigger(art, 'attacking', 420);
  addClass(node, 'is-acting', 460);
}

/* An enemy hit landing on one of your portraits: the portrait recoils, the HP
   bar flashes, and a red arc flies from the enemy to the portrait so the player
   can see *which* combatant it hit. */
export function enemyHit(uid, charId, amount = 0, state = null) {
  const from = enemyNode(uid);
  const to = characterNode(charId, state ? state.characters : []);
  if (to && ms(40) > 0) {
    retrigger(to, 'took-hit', 420);
    const hp = q('.p-hp > i', to);
    if (hp) retrigger(hp, 'hp-drain', 440);
  }
  if (from && to) tracer(from, to, amount >= 20 ? 'heavy' : 'light');
}

/* ------------------------------------------------------------------ 11. tracers */
/* A curved streak from A to B. Used for enemy→portrait hits, Ego→enemy, and the
   heal/shield beams that go the other way. One SVG per tracer, removed on end:
   there is no persistent layer to leak. */
export function tracer(fromNode, toNode, kind = 'light') {
  if (ms(20) === 0) return;
  const a = rectOf(fromNode);
  const b = rectOf(toNode);
  if (!a || !b) return;
  const host = fxLayer('fx-tracers');
  if (!host) return;
  const box = host.getBoundingClientRect();
  const x1 = a.left + a.width / 2 - box.left;
  const y1 = a.top + a.height * 0.45 - box.top;
  const x2 = b.left + b.width / 2 - box.left;
  const y2 = b.top + b.height / 2 - box.top;
  const mx = (x1 + x2) / 2;
  const my = Math.min(y1, y2) - Math.abs(x2 - x1) * 0.18 - 30;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', `tracer tracer-${kind}`);
  svg.setAttribute('viewBox', `0 0 ${Math.max(1, box.width)} ${Math.max(1, box.height)}`);
  svg.innerHTML = `<path d="M${x1.toFixed(0)} ${y1.toFixed(0)} Q${mx.toFixed(0)} ${my.toFixed(0)} ${x2.toFixed(0)} ${y2.toFixed(0)}" />`;
  host.appendChild(svg);
  setTimeout(() => svg.remove(), Math.max(240, ms(60 + 480)));
}

/* ------------------------------------------------------------------ 12. death */
/* An enemy dying: it does not vanish, it comes apart. Grey, collapse, shed a
   burst of motes, then the node is left for the next render to remove. */
export function die(uid) {
  const node = enemyNode(uid);
  if (!node || node.classList.contains('dying')) return;
  node.classList.add('dying');
  /* The node is not removed by this: renderEnemies() keeps a corpse in the row
     as a greyed-out `.dead` body, which is how the player can still see what
     they killed. So the collapse has to put itself back — otherwise the corpse
     stays at the animation's final opacity (0) and the slot reads as empty. */
  setTimeout(() => { if (node && node.classList) node.classList.remove('dying'); }, Math.max(120, ms(660)));
  shardsAt(node, 12);
  const layer = fxLayer('fx-dust');
  const host = layer;
  const r = visibleRect(node);
  if (host && r) {
    const hb = host.getBoundingClientRect();
    for (let i = 0; i < 16; i++) {
      const m = document.createElement('i');
      m.className = 'death-mote';
      m.style.left = `${Math.round(r.left + r.width * (0.2 + Math.random() * 0.6) - hb.left)}px`;
      m.style.top = `${Math.round(r.top + r.height * (0.2 + Math.random() * 0.6) - hb.top)}px`;
      m.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 90)}px`);
      m.style.setProperty('--dy', `${Math.round(-40 - Math.random() * 90)}px`);
      m.style.animationDelay = `${Math.round(Math.random() * 180)}ms`;
      host.appendChild(m);
      setTimeout(() => m.remove(), Math.max(320, ms(1200)));
    }
  }
}

/* A new enemy arriving: drop in from above with a dust ring. */
export function summon(uid) {
  const node = enemyNode(uid);
  if (!node || ms(20) === 0) return;
  retrigger(node, 'summoning', 620);
  rippleAt(node, 'summon', 'summon');
}

/* ------------------------------------------------------------------ 13. team */
/* Heal / shield / stress changes on YOUR side. The portrait is the anchor, so
   the number lands on the body that changed, not in a corner. */
export function teamPulse(charId, kind, state = null) {
  const node = characterNode(charId, state ? state.characters : []);
  if (!node) return;
  const cls = kind === 'heal' ? 'healed' : kind === 'shield' ? 'shielded' : kind === 'stress' ? 'stressed' : kind === 'breakdown' ? 'broke' : 'pulsed';
  retrigger(node, cls, 620);
}

/* ------------------------------------------------------------------ 14. replay */
/* THE REPLAY PASS.
   Walks the engine's fx stream and turns it into motion, in the order it
   happened. flushFx (in ui.js) still owns the right-edge log + sfx; this owns
   what the eye sees. Both read the same events, so they can never disagree.

   Card ownership: `owner` on the event is a CHARACTER id, so the tracer starts
   at that combatant's portrait and ends on the enemy — a beam of intent from
   the body that played the card. */
export function replay(events, state, { owner = null } = {}) {
  if (!Array.isArray(events) || !events.length) return;
  if (ms(20) === 0) {                         // instant: state only, no film
    syncReticles(state);
    return;
  }
  /* The timeline is CAPPED. A single card can emit a dozen events (hit, bleed,
     chain, break, shield...), and letting each one push the next 120ms further
     out meant the last numbers of a busy card arrived a full second after the
     throw had already landed — the moment had moved on. Everything now lands
     inside ~520ms of the play, which keeps the cascade readable and keeps the
     screen from being busy while the player is already choosing again. */
  let delay = 0;
  const CAP = 520;
  const bump = (d) => { const at = delay; delay = Math.min(delay + d, CAP); return at; };

  events.forEach((ev) => {
    const kind = ev.kind;
    if (kind === 'dmg' || kind === 'bleed' || kind === 'toxin' || kind === 'poison') {
      const a = anchorFor(ev, state);
      const tone = kind === 'dmg' ? (ev.weak ? 'weak' : ev.crit ? 'crit' : 'dmg') : kind;
      const at = bump(kind === 'dmg' ? 120 : 70);
      setTimeout(() => {
        if (!a) return;
        impact(ev.uid, { amount: ev.amt || 0, kind: tone, crit: !!ev.crit, weak: !!ev.weak, state });
        floatText({
          x: a.x + (Math.random() - 0.5) * 18,
          y: a.y,
          text: `-${ev.amt}`,
          tone,
          sub: ev.crit ? 'CRITICAL' : (ev.weak ? 'WEAKNESS' : (kind === 'poison' ? 'POISON' : kind === 'bleed' ? 'BLEED' : kind === 'toxin' ? 'TOXIN' : '')),
          big: clamp(Math.log10(Math.max(10, ev.amt || 10)) / 1.6, 0.8, 2.2),
          drift: (Math.random() - 0.5) * 30,
          glyph: kind === 'dmg' ? (ev.crit ? GLYPH.crit : '') : GLYPH[kind],
        });
        if (kind !== 'dmg') statusPop(ev.uid, kind, { amount: ev.amt || 0 });
        if (owner && kind === 'dmg') {
          const from = characterNode(owner, state.characters);
          const to = enemyNode(ev.uid);
          if (from && to) setTimeout(() => tracer(from, to, 'ego'), 40);
        }
      }, at);
    } else if (kind === 'break') {
      const a = anchorFor(ev, state);
      const at = bump(160);
      setTimeout(() => {
        const node = enemyNode(ev.uid);
        if (node) { retrigger(node, 'tenacity-break', 700); rippleAt(node, 'big', 'crit'); shardsAt(node, 10); }
        if (a) floatText({ x: a.x, y: a.y - 10, text: 'BREAK', tone: 'weak', sub: 'RAVAGED · +1 AP', big: 1.5 });
        flashScreen('small');
        shoveStage(0.8, 'crit');
      }, at);
    } else if (kind === 'phase') {
      const a = anchorFor(ev, state);
      const at = bump(300);
      setTimeout(() => {
        const node = enemyNode(ev.uid);
        if (node) retrigger(node, 'phasing', 900);
        if (a) floatText({ x: a.x, y: a.y, text: 'PHASE', tone: 'weak', sub: 'SHIFT', big: 1.7 });
        flashScreen('huge');
      }, at);
    } else if (kind === 'hurt') {
      const at = bump(160);
      setTimeout(() => {
        enemyHit(ev.uid, ev.id, ev.amt || 0, state);
        const a = anchorFor(ev, state);
        if (a) floatText({ x: a.x, y: a.y - 6, text: `-${ev.amt}`, tone: 'stress', sub: 'HIT', big: 1.1 });
        flashScreen('small');
      }, at);
    } else if (kind === 'blocked') {
      const at = bump(90);
      setTimeout(() => {
        const to = characterNode(ev.id, state.characters);
        if (to) { retrigger(to, 'blocked', 480); rippleAt(to, 'small', 'shield'); }
        const a = anchorFor(ev, state);
        if (a) floatText({ x: a.x, y: a.y, text: 'BLOCK', tone: 'shield', sub: '0 DMG', big: 0.95 });
      }, at);
    } else if (kind === 'stress') {
      const at = bump(90);
      setTimeout(() => {
        teamPulse(ev.id, 'stress', state);
        const a = anchorFor(ev, state);
        if (a) floatText({ x: a.x, y: a.y - 4, text: `+${Math.round(ev.amt)}`, tone: 'stress', sub: 'STRESS', big: 0.9 });
      }, at);
    } else if (kind === 'breakdown') {
      const at = bump(320);
      setTimeout(() => {
        teamPulse(ev.id, 'breakdown', state);
        const a = anchorFor(ev, state);
        if (a) floatText({ x: a.x, y: a.y - 12, text: 'BREAKDOWN', tone: 'stress', big: 1.1 });
        shoveStage(1, 'crit');
      }, at);
    } else if (kind === 'heal' || kind === 'shield' || kind === 'recover') {
      const at = bump(80);
      setTimeout(() => {
        const to = characterNode(ev.id, state.characters);
        teamPulse(ev.id, kind === 'shield' ? 'shield' : 'heal', state);
        const a = anchorFor(ev, state);
        if (a) {
          floatText({
            x: a.x, y: a.y - 6,
            text: `+${ev.amt || 0}`,
            tone: kind === 'shield' ? 'shield' : 'heal',
            sub: kind === 'shield' ? 'SHIELD' : kind === 'recover' ? 'RECOVER' : 'HEAL',
            big: 1,
          });
        }
        if (to) beam(to, kind === 'shield' ? 'shield' : 'heal');
      }, at);
    } else if (kind === 'counter') {
      const at = bump(110);
      setTimeout(() => {
        const to = characterNode(ev.id, state.characters);
        if (to) { retrigger(to, 'counters', 520); shardsAt(to, 4); }
        const a = anchorFor(ev, state);
        if (a) floatText({ x: a.x, y: a.y, text: `»${ev.amt}`, tone: 'counter', sub: 'COUNTER', big: 0.95 });
      }, at);
    } else if (kind === 'chain' || kind === 'resonance') {
      const at = bump(60);
      setTimeout(() => {
        const res = q('#res-box');
        if (res) retrigger(res, 'res-charge', 420);
      }, at);
    } else if (kind === 'celestial' || kind === 'ego' || kind === 'exalt') {
      const at = bump(kind === 'exalt' ? 380 : 220);
      setTimeout(() => {
        flashScreen(kind === 'exalt' ? 'huge' : 'small');
        if (q('#view-battle')) retrigger(q('#view-battle'), 'ego-glow', 720);
      }, at);
    } else if (kind === 'curse') {
      const at = bump(120);
      setTimeout(() => { flashScreen('small'); }, at);
    }
    /* anything unknown is ignored: the engine may grow event kinds and this must
       never throw on a new one */
  });

  setTimeout(() => syncReticles(state), delay + 260);
}

/* A vertical beam of light through a portrait (heal / shield). */
function beam(node, kind = 'heal') {
  const layer = fxLayer('fx-beams');
  const host = layer;
  const r = rectOf(node);
  if (!host || !r) return;
  const hb = host.getBoundingClientRect();
  const b = document.createElement('i');
  b.className = `beam beam-${kind}`;
  b.style.left = `${Math.round(r.left + r.width / 2 - hb.left)}px`;
  b.style.top = `${Math.round(r.top - hb.top)}px`;
  b.style.height = `${Math.round(r.height)}px`;
  host.appendChild(b);
  setTimeout(() => b.remove(), Math.max(260, ms(760)));
}

/* ------------------------------------------------------------------ 15. battle */
/* Between battles: wipe the stage of film so nothing from the last fight can
   leak into the next one (a stuck beam, a hovering ring, a card mid-air). */
export function enterBattle(state) {
  settle();
  seenUids.clear();
  const v = view();
  if (v && ms(20) > 0) retrigger(v, 'battle-enter', 620);
  const row = q('#enemies');
  qa('#enemies .enemy').forEach((n, i) => {
    if (ms(20) === 0) return;
    n.style.setProperty('--enter-delay', `${Math.round(ms(90) * i)}ms`);
    retrigger(n, 'summoning', 900 + i * 90);
  });
  if (row && ms(20) > 0) retrigger(row, 'row-enter', 700);
  setTimeout(() => syncReticles(state), 400);
}

/* Targeting: when the player picks an enemy, a bracket snaps onto it. Cheap,
   one class, and it tells the thumb which body the next card will hit. */
export function targetLock(uid) {
  qa('#enemies .enemy').forEach((n) => n.classList.remove('target-lock'));
  const node = enemyNode(uid);
  if (node) retrigger(node, 'target-lock', 620);
}

/* A card being picked up (pointerdown) — the card scales under the thumb and
   the rest of the hand dims, so the player sees what they are holding. */
export function cardLift(node, on) {
  if (!node) return;
  node.classList.toggle('lifting', !!on);
  const hand = q('#hand');
  if (hand) hand.classList.toggle('has-lift', !!on);
}

/* Drag: a landing bracket follows the finger while a card is over an enemy, so
   the drop is unambiguous before the thumb lifts. */
export function dragTarget(node) {
  const layer = fxLayer('fx-drop');
  if (!layer) return;
  const r = rectOf(node);
  if (!r) { layer.innerHTML = ''; return; }
  const hb = layer.getBoundingClientRect();
  if (!layer.firstChild) {
    const d = document.createElement('i');
    d.className = 'drop-bracket';
    layer.appendChild(d);
  }
  const d = layer.firstChild;
  d.style.left = `${Math.round(r.left + r.width / 2 - hb.left)}px`;
  d.style.top = `${Math.round(r.top + r.height * 0.46 - hb.top)}px`;
  d.style.width = `${Math.round(r.width * 0.7)}px`;
  d.style.height = `${Math.round(r.width * 0.7)}px`;
}
export function clearDragTarget() {
  const layer = view() && view().querySelector(':scope > .fx-drop');
  if (layer) layer.innerHTML = '';
}

/* ------------------------------------------------------------------ 16. hud */
/* The HUD "reaction pass". Reads the same state the renderer just wrote and
   pops whatever *changed*, so numbers moving around the screen have weight:
   AP spent, EP gained, resonance charged, a bar dropping. Runs after every
   render, costs a handful of class toggles, animates nothing while idle. */
const hudMemo = new Map();
const memo = (key, val) => {
  const prev = hudMemo.get(key);
  hudMemo.set(key, val);
  return prev;
};
const seenUids = new Set();
/* Enemies can join a fight after it started (summons, splits, adds). The render
   pass is the only place that knows a node is new, so the announcement lives
   here: anything that was not on the board last render gets its arrival beat. */
export function syncSummons(state) {
  if (!state || !Array.isArray(state.enemies)) return;
  const live = new Set(state.enemies.map((e) => String(e.uid)));
  const first = seenUids.size === 0;
  for (const uid of live) {
    if (seenUids.has(uid)) continue;
    seenUids.add(uid);
    if (!first) summon(uid);          // enterBattle() already covers battle start
  }
  for (const uid of [...seenUids]) if (!live.has(uid)) seenUids.delete(uid);
}

export function hudReact(state) {
  if (!hasDoc() || !state || ms(10) === 0) return;
  syncSummons(state);
  if (memo('ap', state.ap) !== undefined && memo('ap', state.ap) !== state.ap) {
    const n = q('#ap-now');
    if (n) retrigger(n, 'ap-pop', 320);
  }
  if (memo('ep', state.ep) !== undefined && memo('ep', state.ep) !== state.ep) {
    const n = q('#ep-num');
    if (n) retrigger(n, 'val-pop', 320);
    const pips = qa('#ep-pips .ep-pip');
    const ep = state.ep;
    pips.forEach((p, i) => { if (i < ep && p.classList.contains('on')) retrigger(p, 'pip-fill', 380); });
  }
  if (memo('res', state.resonance) !== undefined && memo('res', state.resonance) !== state.resonance) {
    const n = q('#res-num');
    if (n) retrigger(n, 'val-pop', 320);
    const box = q('#res-box');
    if (box) retrigger(box, 'res-charge', 420);
  }
  const drawLen = state.drawPile ? state.drawPile.length : (state.deck ? state.deck.length : undefined);
  if (memo('draw', drawLen) !== undefined && memo('draw', drawLen) !== drawLen) {
    const n = q('#draw-count');
    if (n) retrigger(n, 'val-pop', 300);
  }
  if (memo('grave', state.discard && state.discard.length) !== undefined
    && memo('grave', state.discard && state.discard.length) !== (state.discard && state.discard.length)) {
    const n = q('#grave-count');
    if (n) retrigger(n, 'val-pop', 300);
  }
  if (memo('sands', state.sands) !== undefined && memo('sands', state.sands) !== state.sands) {
    const n = q('#sands-count');
    if (n) retrigger(n, 'val-pop', 300);
  }
  /* team HP total: the bar flashes when it moves */
  const hp = (state.characters || []).reduce((n, c) => n + Math.max(0, c.hp), 0);
  if (memo('teamHp', hp) !== undefined && memo('teamHp', hp) !== hp) {
    const f = q('#team-hp-fill');
    if (f) retrigger(f, 'hp-flash', 420);
  }
}

/* A win/lose slam: the result card hits the screen rather than fading in. */
export function resultSlam(win) {
  const card = q('#overlay .overlay-card');
  if (!card || ms(20) === 0) return;
  retrigger(card, win ? 'result-win' : 'result-lose', 900);
}

/* A turn banner that lands with weight (the DOM node already exists; this only
   adds the punch-in class so the timing lives with the rest of the choreography) */
export function turnCrash() {
  const b = q('#turn-banner');
  if (!b) return;
  retrigger(b, 'turn-crash', 900);
}

/* The FOCUS/quality dials change mid-battle: re-read them from the body classes
   and settle if we just lost the ability to animate. */
export function syncFromBody(bodyEl = typeof document !== 'undefined' ? document.body : null) {
  if (!bodyEl || !bodyEl.classList) return;
  const cls = bodyEl.classList;
  setFocus(cls.contains('focus-ui'));
  setPaused(cls.contains('app-paused'));
  setQuality(cls.contains('q-low') ? 'low' : cls.contains('q-ultra') ? 'ultra' : 'high');
}

export default {
  isBusy, animatable, timeScale, wait, settle, setQuality, setFocus, setPaused, syncFromBody,
  playCardIn, dealHand, handSettle, endTurnSequence, enemyWindup, enemyHit,
  replay, impact, floatText, statusPop, syncReticles, syncSummons, die, summon, tracer,
  teamPulse, enterBattle, targetLock, cardLift, dragTarget, clearDragTarget,
  hudReact, resultSlam, turnCrash, enemyNode, characterNode,
};
