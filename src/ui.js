import {
  CARDS, CHARACTERS, EGOS, MISSIONS, ENEMIES, ATTRIBUTES, CLASSES, ROLES,
  RELICS, EVENTS, MOD_INFO, CHAOS_WEAKNESSES, CHARACTER_GUIDES,
} from './data.js';
const DRAW_NEXT = 5; // DRAW_PER_TURN from engine.js — we show it ahead of your first turn.
import {
  startBattle, playCard, startDraw, endTurn, playEgo, useSands, canPlay, previewCard, intentOf,
  statusEnemyHealthScale, STATUS_SENSITIVE, attackCardScore,
  chooseEpiphany, computeSynergy, battleSummary, rankOf, MAX_EP, MAX_RESONANCE, BURST_COST, RECOVERY_PLAYS,
  POISON_PER_STACK, poisonPerStack,
} from './engine.js';
import {
  makeRng, createRun, availableNodes, enterNode, markCleared, encounterFor,
  cardRewardChoices, addCard, removeCard, upgradeCard, upgradableIndexes,
  relicChoices, grantRelic, makeShop, applyEffect, runHp, maxHpOf,
  recordBattle, restHealAll, restCalm, runSummary,
} from './run.js';
import {
  loadProgress, saveProgress, resetProgress, missionUnlocked,
  levelOf, xpIntoLevel, charStats, addXp, canAwaken, awaken, AWAKEN_COST,
  canSkillUp, skillUp, SKILL_COST,
} from './progress.js';
import { sfx, bark, isMuted, toggleMute, setSfxVolume, sfxDamage, sfxMajor, sfxBadgeHover, badgeHeartbeatStop, duckMix } from './audio.js';
import { installPlatformBridge, installDoubleTapGuard, syncRootVars, updateAdaptiveUI, storageGet, storageSet, isAndroidApp } from './touch.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
};
const attr = (a) => ATTRIBUTES[a] || { name: '—', glyph: '·', color: '#888' };

/* --- game feel: typing effect + click ripple (visuals only, jsdom-safe) --- */
// Typewriter with run-token cancellation: every call supersedes the
// previous one on the same element, so rapid clicks can never interleave
// two texts character-by-character. Clicking while typing completes the
// line instantly (see typewriterFinish / advanceStory).
const twRuns = new WeakMap();
function typewriter(el, text, speed = 26) {
  if (!el) return;
  const run = (twRuns.get(el) || 0) + 1;
  twRuns.set(el, run);
  const chars = [...text];
  let i = 0;
  el.textContent = '';
  el._twFull = text;
  el._twDone = false;
  const tick = () => {
    if (twRuns.get(el) !== run) return; // superseded by a newer run
    if (i >= chars.length) { el._twDone = true; return; }
    el.textContent += chars[i++];
    el._twTimer = setTimeout(tick, speed);
  };
  el._twTimer = setTimeout(tick, 120);
}
// If the element is mid-type, snap it to the full line. Returns true when
// it consumed the click (caller should NOT also advance).
function typewriterFinish(el) {
  if (!el || el._twDone || el._twFull == null) return false;
  twRuns.set(el, (twRuns.get(el) || 0) + 1);
  if (el._twTimer) clearTimeout(el._twTimer);
  el.textContent = el._twFull;
  el._twDone = true;
  return true;
}
function ripple(btn) {
  if (!btn) return;
  const r = el('span', 'ripple');
  btn.appendChild(r);
  setTimeout(() => r.remove(), 660);
}
function apFlash(ap) {
  const n = $('ap-now');
  if (!n) return;
  n.classList.add('ap-flash');
  clearTimeout(n._af); n._af = setTimeout(() => n.classList.remove('ap-flash'), 320);
}
function touchFlash() {
  const st = $('battle-stage');
  const d = el('div', 'tx');
  if (st) st.appendChild(d);
  setTimeout(() => d.remove(), 500);
}

let progress = loadProgress();
let mode = 'chaos'; // 'chaos' | 'story'
let battle = null;
let battleCtx = null; // { kind: 'story', mission } | { kind: 'run', node, encounter }
let mission = null;
let storyIndex = 0;
let logMode = 0; // battle log: 0 hidden · 1 mini (last 3) · 2 full (last 8)
let cutBusy = false;
let longPressed = false;
let pressTimer = null;
let currentEvent = null;
let currentShop = null;
let labCharId = 'kaito';
let detailCharId = 'kaito';
let charReturnView = 'roster';
let guideCat = 'all';
let guideQuery = '';
let rosterFilter = 'all';
let simCharId = 'kaito';
let simLoadout = 'starter';
let simBehaviour = 'training';
let simTracker = null;
let simReported = false;
let simHudHidden = (() => { try { return window.localStorage.getItem('cw_sim_hud_hidden') === '1'; } catch { return false; } })();
function applySimHudVisibility() {
  const isSim = !!(battleCtx && battleCtx.kind === 'sim' && battle);
  const hud = $('sim-hud'), pill = $('sim-hud-pill');
  if (hud) hud.classList.toggle('hidden', !isSim || simHudHidden);
  if (pill) pill.classList.toggle('hidden', !isSim || !simHudHidden);
}
/* ---------------- UI settings (minimal, game-style, persisted) ---------------- */
let settings = { volume: 90, fxSize: 'm', shake: true, motion: true, cb: false, uiScale: 100 };
try { Object.assign(settings, JSON.parse(window.localStorage.getItem('cw_settings') || '{}')); } catch { /* fresh */ }
function saveSettings() { try { window.localStorage.setItem('cw_settings', JSON.stringify(settings)); } catch { /* ignore */ } }
function applySettings() {
  document.body.classList.toggle('reduce-motion', !settings.motion);
  document.body.classList.toggle('cb-palette', !!settings.cb);
  document.body.classList.toggle('fx-sm', settings.fxSize === 's');
  document.body.classList.toggle('fx-lg', settings.fxSize === 'l');
  const app = $('app'); if (app) app.style.zoom = settings.uiScale && settings.uiScale !== 100 ? String(settings.uiScale / 100) : '';
  setSfxVolume((settings.volume == null ? 90 : settings.volume) / 100);
  const sync = (id, fn) => { const n = $(id); if (n) fn(n); };
  sync('set-volume', (n) => { n.value = settings.volume; $('set-volume-val').textContent = `${settings.volume}%`; });
  sync('set-uiscale', (n) => { n.value = settings.uiScale; $('set-uiscale-val').textContent = `${settings.uiScale}%`; });
  sync('set-fxsize', (n) => { n.value = settings.fxSize; });
  sync('set-shake', (n) => { n.checked = !!settings.shake; });
  sync('set-motion', (n) => { n.checked = !!settings.motion; });
  sync('set-cb', (n) => { n.checked = !!settings.cb; });
}
function openSettings() { applySettings(); $('settings-modal').classList.remove('hidden'); }
function closeSettings() { $('settings-modal').classList.add('hidden'); saveSettings(); }

function setSimHudHidden(hidden) {
  simHudHidden = !!hidden;
  try { window.localStorage.setItem('cw_sim_hud_hidden', simHudHidden ? '1' : '0'); } catch { /* private mode */ }
  applySimHudVisibility();
}
let deckModalCtx = null; // { mode: 'view'|'remove'|'upgrade'|'pile', title, cards, onPick }
let barkTimer = null;
let exaltArmed = false;

const VIEWS = ['title', 'roster', 'missions', 'story', 'map', 'event', 'shop', 'rest', 'reward', 'battle', 'rank', 'guide', 'character', 'sim'];
const raf = (fn) => (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(fn) : fn());
/* THE PHONE CONTRACT — one query, shared by CSS (styles-mobile.css) and JS
   (hand sizing, back routing). Landscape phones are short and wide; this is
   the single source of truth for "we are in the phone layout". */
const PHONE_QUERY = '(orientation: landscape) and (min-width: 560px) and (max-width: 1000px) and (max-height: 560px)';
const isPhoneLayout = () => {
  const w = window.innerWidth || 0, h = window.innerHeight || 0;
  // A narrow portrait window is also "compact": the game is landscape-only,
  // but the web build can still be opened in portrait and must not overflow.
  const portrait = h > w && w > 0 && w <= 620;
  try {
    if (window.matchMedia && !portrait) return window.matchMedia(PHONE_QUERY).matches;
  } catch { /* jsdom without matchMedia */ }
  if (!h) return false;
  const landscapePhone = h <= 560 && w >= 560 && w <= 1000 && w > h;
  return landscapePhone || portrait;
};
let currentView = 'title';
const showView = (name) => {
  VIEWS.forEach((v) => $('view-' + v).classList.toggle('hidden', v !== name));
  // Belt-and-braces: leaving the battle view always dismisses the
  // body-level result overlay so it can never strand the player.
  if (name !== 'battle') { const ov = $('overlay'); if (ov) ov.classList.add('hidden'); }
  currentView = name;
  syncMeta();
  if (name === 'map') raf(drawMapLines);
  raf(syncRootVars);
};

const ENEMY_ART = {
  // Character-only transparent cutouts (images/enemy-*-cut.png) — no scenery,
  // no background rectangle: the creature floats over the battle stage.
  strep: 'images/enemy-strep-cut.png',
  toxin: 'images/enemy-toxin-cut.png',
  biofilm: 'images/enemy-biofilm-cut.png',
  strain: 'images/enemy-strain-cut.png',
  prion: 'images/enemy-prion-cut.png',
  spore: 'images/enemy-spore-cut.png',
  elite_hive: 'images/enemy-hive-cut.png',
  elite_wall: 'images/enemy-cathedral-cut.png',
  elite_prime: 'images/pathogen-prime-cut.png',
  boss_bloom: 'images/enemy-bloom-cut.png',
  boss_prion: 'images/enemy-sovereign-cut.png',
  sim_colossus: 'images/enemy-colossus-cut.png',
};
const ENEMY_HUE = {};
const CARD_ART = {
  // Per-card art (images/cards/<id>.jpg) — generated from docs/character-bible.md.
  // The lean 5-card kit for each combatant is fully covered; anything not
  // listed (Breakdown pulls, curses) falls back to the owner's action art.
  // --- Kaito ---
  k_jab: 'images/cards/k_jab.jpg', k_brace: 'images/cards/k_brace.jpg',
  k_rally: 'images/cards/k_rally.jpg', k_last: 'images/cards/k_last.jpg',
  k_up: 'images/cards/k_up.jpg', breakdown_kaito: 'images/cards/breakdown_kaito.jpg',
  // --- Momo ---
  m_strike: 'images/cards/m_strike.jpg', m_guard: 'images/cards/m_guard.jpg',
  m_splint: 'images/cards/m_splint.jpg', m_bash: 'images/cards/m_bash.jpg',
  m_up: 'images/cards/m_up.jpg', breakdown_momo: 'images/cards/breakdown_momo.jpg',
  // --- Goro ---
  g_strike: 'images/cards/g_strike.jpg', g_guard: 'images/cards/g_guard.jpg',
  g_broth: 'images/cards/g_broth.jpg', g_devour: 'images/cards/g_devour.jpg',
  g_up: 'images/cards/g_up.jpg',
  // --- Bibi ---
  b_ping: 'images/cards/b_ping.jpg', b_fuzz: 'images/cards/b_fuzz.jpg',
  b_flare: 'images/card-b2.jpg', b_burst: 'images/cards/b_burst.jpg',
  b_up: 'images/cards/b_up.jpg',
  // --- Yuna ---
  y_sting: 'images/card-y1.jpg', y_mist: 'images/cards/y_mist.jpg',
  y_antidote: 'images/cards/y_antidote.jpg', y_epidemic: 'images/card-y2.jpg',
  y_culture: 'images/cards/y_culture.jpg',
  // --- Sable ---
  s_annotate: 'images/cards/s_annotate.jpg', s_margin: 'images/cards/s_margin.jpg',
  s_second: 'images/cards/s_second.jpg', s_titer: 'images/cards/s_titer.jpg',
  s_up: 'images/cards/s_up.jpg', breakdown_sable: 'images/cards/breakdown_sable.jpg',
};
const ACTION_ART = {
  kaito: 'images/action-kaito.jpg',
  momo: 'images/action-momo.jpg',
  goro: 'images/action-goro.jpg',
  bibi: 'images/action-bibi.jpg',
  yuna: 'images/action-yuna.jpg',
  sable: 'images/char-memoryb.png',
};
const ico = (id, cls = '') => `<svg class="ico ${cls}"><use href="#${id}"/></svg>`;
const KIND_ICON = { attack: 'i-sword', skill: 'i-shield', upgrade: 'i-buff', status: 'i-skull', curse: 'i-skull' };
const INTENT_ICON = { attack: null, defend: 'i-shield', buff: 'i-buff', debuff: 'i-debuff', heal: 'i-heal', charge: 'i-bolt' };
const NODE_META = {
  battle: { ico: 'i-sword', lbl: 'HOSTILE' },
  elite: { ico: 'i-skull', lbl: 'ELITE' },
  boss: { ico: 'i-crown', lbl: 'BOSS' },
  event: { ico: 'i-star', lbl: 'ANOMALY' },
  shop: { ico: 'i-cell', lbl: 'SHOP' },
  rest: { ico: 'i-heal', lbl: 'SANCTUARY' },
};
const RANK_ORDER = { S: 4, A: 3, B: 2, C: 1 };

function syncMeta() {
  const c = progress.cells || 0;
  ['title-cells', 'roster-cells', 'missions-cells', 'lab-cells'].forEach((id) => {
    if ($(id)) $(id).textContent = c;
  });
  const muteIcon = isMuted() ? 'i-mute' : 'i-sound';
  if ($('btn-mute-title')) $('btn-mute-title').innerHTML = ico(muteIcon);
  if ($('btn-mute')) $('btn-mute').innerHTML = ico(muteIcon);
  const hasActiveRun = !!(progress.run && !progress.run.finished);
  if ($('btn-resume-run')) $('btn-resume-run').classList.toggle('hidden', !hasActiveRun);
}

/* Touch-only feedback: the finger just picked a target, and without hover
   there is nothing else on screen that says so. Reuses the bark toast slot. */
let targetToastTimer = null;
function toastTarget(name) {
  const toast = $('bark-toast');
  if (!toast) return;
  toast.innerHTML = `<b style="color:#7ff3ea">TARGET</b>${name} · all single-target cards now hit this enemy`;
  toast.classList.remove('hidden');
  clearTimeout(targetToastTimer);
  targetToastTimer = setTimeout(() => toast.classList.add('hidden'), 1500);
}

function showBark(charId, kind) {
  const line = bark(charId, kind);
  const ch = CHARACTERS[charId];
  const toast = $('bark-toast');
  if (!line || !ch || !toast) return;
  toast.innerHTML = `<b style="color:${ch.skin}">${ch.name.toUpperCase()}</b>${line}`;
  toast.classList.remove('hidden');
  clearTimeout(barkTimer);
  barkTimer = setTimeout(() => toast.classList.add('hidden'), 2200);
}

/* ============================================================== roster */
function setMode(nextMode) {
  mode = nextMode;
  $('mode-chaos').classList.toggle('active', mode === 'chaos');
  $('mode-story').classList.toggle('active', mode === 'story');
  $('btn-deploy').textContent = mode === 'chaos' ? 'START EXPEDITION' : 'MISSIONS';
  renderSynergyPreview();
}

function renderRoster() {
  const rf = $('roster-filters');
  if (rf) {
    rf.innerHTML = [['all', 'ALL'], ...Object.entries(CLASSES).map(([k, v]) => [k, v.name.toUpperCase()])]
      .map(([k, label]) => `<button class="chip-btn${rosterFilter === k ? ' active' : ''}" data-rfilter="${k}">${label}</button>`).join('');
    rf.querySelectorAll('[data-rfilter]').forEach((b) => b.addEventListener('click', () => { sfx('click'); rosterFilter = b.dataset.rfilter; renderRoster(); }));
  }
  const grid = $('roster');
  grid.innerHTML = '';
  const stats = charStats(progress);
  for (const [id, c] of Object.entries(CHARACTERS)) {
    const inTeam = progress.team.includes(id);
    const a = attr(c.attr);
    const rec = progress.chars[id] || { xp: 0, awaken: [false, false, false], skillLv: 0 };
    const lv = levelOf(rec.xp);
    const xpPct = xpIntoLevel(rec.xp);
    const st = stats[id];
    const card = el('div', `roster-card${inTeam ? ' selected' : ''}`);
    if (rosterFilter !== 'all' && c.cls !== rosterFilter) card.style.display = 'none';
    card.style.setProperty('--skin', c.skin);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    const pips = rec.awaken.map((on) => `<i class="${on ? 'on' : ''}">◆</i>`).join('');
    card.innerHTML = `
      <div class="roster-top">
        <span class="cls-chip">${CLASSES[c.cls].name}</span>
        <span class="roster-lvl">LV ${lv}</span>
        <span class="attr-tag" style="color:${a.color}">${a.glyph} ${a.name}</span>
      </div>
      <div class="roster-art"><img src="${c.art}" alt="${c.name}" /></div>
      <div class="roster-info">
        <span class="roster-name"><svg class="ico" style="vertical-align:-2px;margin-right:4px"><use href="#i-hp"/></svg>${c.name}</span>
        <span class="roster-cell">${c.full.split('— ')[1] || ''}</span>
        <span class="roster-leader">${c.leader ? c.leader.desc : ''}</span>
        <div class="roster-xp" title="${xpPct}/100 XP"><i style="width:${xpPct}%"></i></div>
        <div class="roster-stats"><span>HP <b>${c.hp + st.hp}</b></span><span>SK <b>+${st.skillLv}</b></span></div>
        <div class="roster-foot-row">
          <span class="awk-pips" title="Awakenings">${pips}</span>
          <span style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end">
            <button class="lab-link detail-link" type="button">DETAILS</button>
            <button class="lab-link sim-link" type="button">SIM</button>
            <button class="lab-link" type="button">LAB</button>
          </span>
        </div>
        <div style="font-size:9.5px;color:var(--ink-dim);letter-spacing:.04em">Tap card to add/remove from team · DETAILS opens cards &amp; skills</div>
      </div>`;
    card.querySelector('.detail-link').addEventListener('click', (ev) => {
      ev.stopPropagation();
      sfx('click');
      openCharacter(id, 'roster');
    });
    card.querySelector('.sim-link').addEventListener('click', (ev) => {
      ev.stopPropagation();
      sfx('click');
      openSim(id);
    });
    card.querySelector('.lab-link:not(.detail-link):not(.sim-link)').addEventListener('click', (ev) => {
      ev.stopPropagation();
      sfx('click');
      openLab(id);
    });
    card.dataset.rid = id;
    card.addEventListener('click', () => { sfx('click'); toggleTeam(id); });
    grid.appendChild(card);
    card.style.animationDelay = `${grid.children.length * 45}ms`;
  }
  $('team-count').textContent = `${progress.team.length} / 3`;

  const strip = $('team-strip');
  strip.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const id = progress.team[i];
    const slot = el('div', `team-slot${id ? ' filled' : ''}`);
    slot.innerHTML = id
      ? `${i === 0 ? '<span class="slot-lead">LEAD</span>' : ''}<img src="${CHARACTERS[id].art}" alt="" /><div><b>${CHARACTERS[id].name}</b><br>${attr(CHARACTERS[id].attr).glyph} ${CLASSES[CHARACTERS[id].cls].name}</div>`
      : '<div>EMPTY SLOT</div>';
    strip.appendChild(slot);
  }
  $('btn-deploy').disabled = progress.team.length !== 3;
  $('btn-deploy').textContent = mode === 'chaos' ? 'START EXPEDITION' : 'MISSIONS';
  renderSynergyPreview();
}

function renderSynergyPreview() {
  const box = $('synergy-preview');
  if (!box) return;
  const teamChars = progress.team.map((id) => CHARACTERS[id]).filter(Boolean);
  const syns = teamChars.length ? computeSynergy(teamChars) : [];
  const teamAttrs = new Set(teamChars.map((c) => c.attr));
  const targetWeak = mode === 'chaos'
    ? CHAOS_WEAKNESSES
    : [...new Set(MISSIONS.filter((_, i) => missionUnlocked(progress, i)).map((m) => m.rec))];

  const synHtml = syns.length
    ? syns.map((s) => `<span class="syn-pill${s.id.startsWith('lead_') ? ' lead' : ''}" title="${s.desc}"><b>${s.name}</b> · ${s.desc}</span>`).join('')
    : '<span class="relic-empty">Select combatants to preview Leader &amp; Team Synergies.</span>';

  const weakHtml = targetWeak.map((wKey) => {
    const a = attr(wKey);
    const cov = teamAttrs.has(wKey);
    return `<span class="wpill${cov ? ' covered' : ''}" style="color:${a.color}">${a.glyph} ${a.name}</span>`;
  }).join('');

  box.innerHTML = `
    <div class="syn-list">${synHtml}</div>
    <div class="weak-preview"><span class="weak-preview-label">WEAKNESS COVERAGE</span>${weakHtml}</div>`;
}

/* ============================================================ GUIDE / CODEX */
const GUIDE_CATS = [
  ['all', 'ALL'], ['core', 'CORE TURN'], ['scaling', 'FURY & SCALING'], ['defense', 'DEFENCE'],
  ['status', 'STATUS EFFECTS'], ['enemy', 'ENEMY & BREAK'], ['cards', 'CARD KEYWORDS'], ['team', 'TEAM & META'],
];
const GUIDE_ENTRIES = [
  { cat: 'core', icon: 'i-bolt', name: 'AP (Action Points)', short: 'Your spending money each turn', body: 'You start every turn with 3 AP (some Leaders, Upgrades and relics raise this). A card’s number in its top-left gem is its AP cost. When AP runs out, End Turn. Unspent AP does not carry over — spending your last AP is sometimes a bonus (see Finale).', example: 'Overclock (Kaito Upgrade) gives +1 AP every turn for the whole fight. That is why Upgrades are played early.', tags: ['ap', 'cost', 'turn', 'energy'] },
  { cat: 'core', icon: 'i-cell', name: 'Draw, Hand & Piles', short: '5 new cards a turn · 7 on turn 1', body: 'You draw 7 cards on turn 1, then 5 each turn, up to a 10-card hand. Played cards go to the Graveyard; when the Draw pile empties the Graveyard shuffles back in. Exhausted cards are gone for the rest of the fight. Tap DRAW or GRAVE in battle to inspect a pile.', example: 'Retain cards survive End Turn instead of being discarded — everyone else leaves.', tags: ['draw', 'hand', 'graveyard', 'discard', 'deck'] },
  { cat: 'core', icon: 'i-target', name: 'Enemy Action Counter', short: 'The small number under each enemy', body: 'Every non-Haste card you play ticks every living enemy’s counter down by 1. At 0, that enemy acts immediately, then resets (usually 2–4). Haste and 0-AP token cards do NOT tick it. This is the real clock of the game: three cheap cards can be more dangerous than one big one.', example: 'Each character’s Buff Upgrade is Exhaust + Initiation: it lands in your opening hand and is spent once, not cycled.', tags: ['counter', 'clock', 'haste', 'enemy turn', 'intent'] },
  { cat: 'core', icon: 'i-eye', name: 'Intent (enemy badge)', short: 'What the enemy will do next', body: 'The diamond/badge above an enemy shows its next action: a number is incoming damage, a shield is defence, arrows are buffs/debuffs and a bolt with “T” is a charged mega-hit counting down. Enemy hits target your weakest living combatant unless someone is Taunting. Shield the right person before the counter hits 0.', example: 'A “42 · 2T” badge means: you have about 2 enemy-actions to kill, break or out-shield it.', tags: ['intent', 'attack', 'charge', 'telegraph'] },
  { cat: 'scaling', icon: 'i-bolt', name: 'FURY — the headline mechanic', short: 'Stored damage. Spend it, don’t hoard it', body: 'Fury is mainly Kaito’s resource. Fury alone adds NO damage. It becomes damage only through cards: “consume Fury” converts every stack then resets Fury to 0; “+X per Fury / scale with Fury” converts stacks but keeps them. Gain Fury from Cytokine Jab (+1), Adrenal Brace, Fever Surge, Overclock (+1 per Attack), taking Stress (Kaito gains +1 Fury whenever he gains Stress), Counter hits with PHALANX synergy, and some Egos/relics.', example: '6 Fury + Last Shift = 12 + (6×8) = 60, plus 6 more if it is your last AP — before Weakness and Crit multipliers.', tags: ['fury', 'kaito', 'consume', 'scale', 'burst damage'] },
  { cat: 'scaling', icon: 'i-buff', name: 'Strength (STR)', short: 'Permanent +damage on every hit', body: 'Each point of Strength adds +1 damage to every hit of every Attack that character makes, for the rest of the fight. Multi-hit cards gain it per hit, so 4 hits × +3 Strength is +12, not +3. Strength also increases Counter damage. It never expires — early Strength is an investment.', example: 'Neutrophil Flurry (4 hits) with +5 Strength deals +20 total before any multiplier.', tags: ['strength', 'str', 'buff', 'multi-hit', 'scaling'] },
  { cat: 'scaling', icon: 'i-buff', name: 'Buff ATK (this turn)', short: 'Temporary Strength', body: '“+X Attack this turn” works like Strength but is wiped at the start of your next turn. Use it on the turn you gain it, ideally before a multi-hit or Echo attack. Card previews already include it — trust the big number on the card.', example: 'Histamine gives the team +4 ATK this turn: play it first, then attack.', tags: ['buff atk', 'temporary', 'attack this turn'] },
  { cat: 'scaling', icon: 'i-star', name: 'Crit (×1.75)', short: 'Guaranteed, never random', body: 'There is no crit chance in Cell Warriors. Crits are guaranteed by effects: “Crit on next Attack”, Fever Surge, Finale Last Shift, Recovery and Over-Exalt. A crit multiplies the whole per-hit damage by ×1.75 after most other multipliers. Save guaranteed crits for your biggest Fury/Resonance hit.', example: 'Overclock first, build Fury with Jabs, then Last Shift as your final AP: Finale + guaranteed Crit on the same card.', tags: ['crit', 'critical', '1.75', 'guaranteed'] },
  { cat: 'scaling', icon: 'i-cell', name: 'Resonance & Burst (×1.6)', short: 'Skills charge the team battery', body: 'Playing a Skill gives +1 Resonance (max 10); Sparks and several cards add more. At 5+ Resonance, an eligible Attack (costs 2+ AP, is a Finale, scales with Resonance, or says “always Bursts”) consumes 5 Resonance to deal ×1.6 damage and grant +1 EP. The card glows when Burst is live. Bibi’s Resonance Singularity always Bursts and also gains +10 damage per Resonance stack before the multiplier.', example: 'Do not waste Burst on a 6-damage jab. Charge it, Mark the enemy, then spend it on the finisher.', tags: ['resonance', 'burst', 'battery', 'bibi', 'skills'] },
  { cat: 'scaling', icon: 'i-star', name: 'EP, Ego & Over-Exalt', short: 'Your ultimate meter (max 7)', body: 'Gain +1 EP every 2 cards played, +1 when an enemy dies, and +1 on a Resonance Burst. At 4 EP an Ego skill (the portraits on the left rail) fires. At the full 7 EP, arm EXALT and the same Ego becomes an Over-Exalt: roughly double power, bonus effects, and damaging Egos auto-crit. Broken-down characters cannot use their Ego.', example: 'Bibi Leader starts with +2 EP, so her team ultimates arrive a full turn earlier.', tags: ['ep', 'ego', 'ultimate', 'over-exalt', 'exalt', '7 ep'] },
  { cat: 'defense', icon: 'i-shield', name: 'Shield', short: 'Blocks damage AND Stress', body: 'Shield absorbs damage before HP. Crucially, damage fully absorbed by Shield causes no Stress at all. Normally Shield vanishes at End Turn unless Barricade keeps it. The number on a portrait’s shield badge is that character’s personal Shield; Aegis Slam uses the whole team’s total.', example: 'Momo with 20 Shield can eat a 19-damage intent for 0 HP and 0 Stress — then Counter hits back anyway.', tags: ['shield', 'block', 'armour', 'defence'] },
  { cat: 'defense', icon: 'i-shield', name: 'Barricade', short: 'Shield that survives End Turn', body: 'Barricade level 1 keeps 50% of Shield when your turn ends; level 2 keeps 100% (for its duration). Field Protocol instead gives every ally 3 Shield at the start of each turn, so the wall is rebuilt for free.', example: 'End a turn on 40 Shield with Barricade 1: you start the next turn already holding 20.', tags: ['barricade', 'retain shield', 'momo', 'stand firm'] },
  { cat: 'defense', icon: 'i-shield', name: 'Counter', short: 'Hit me. I dare you', body: 'When an enemy attacks a character with Counter, they retaliate for Counter + Strength damage — even if Shield blocked the hit completely. Counter can trigger Bleed and benefits from Weakness/Mark/Vulnerable. At End Turn Counter decays by 25%, so it is a “use it soon” defence. With PHALANX synergy (Kaito+Momo), Counter hits also give Kaito +1 Fury.', example: 'Guard Stance is not passive: 8 Shield + 3 Counter, then Aegis Slam adds 100% of whatever Shield survived.', tags: ['counter', 'retaliate', 'thorns', 'momo'] },
  { cat: 'defense', icon: 'i-shield', name: 'Fortitude & Taunt', short: 'Take less · take it for the team', body: 'Fortitude reduces damage that character takes by 20% per active duration. Taunt forces enemies to target that character instead of your weakest ally (charged attacks included). Together on Momo they read: “hit the tank, for less, into her Counter.”', example: 'Stand Firm = Shield + Taunt + Fortitude + Barricade in one card. It is four mechanics wearing a trench coat.', tags: ['fortitude', 'taunt', 'tank', 'damage reduction'] },
  { cat: 'status', icon: 'i-skull', name: 'STRESS & Mental Breakdown', short: 'The second health bar (0–100)', body: 'Unblocked damage adds Stress (roughly 1.5× the HP lost + 4, minimum 6). Debuffs, Fever curses and some of your own cards add more. At 100 Stress: Mental Breakdown — one third of Max HP becomes locked (unhealable), that character’s cards in hand/draw become Recovery status cards, and their Ego is sealed. Play their Recovery card enough times (5, then 6, 8, 10… after repeat breakdowns) to recover: full HP, Stress 0, +2 Strength, next Ego free, and the team heals. Shield prevents Stress; heals and skills remove it.', example: 'Kaito deliberately farms Stress for Fury and Apex bonuses. Everyone else should treat 70+ Stress as a fire alarm.', tags: ['stress', 'breakdown', 'mental', 'recovery', 'locked hp', '100'] },
  { cat: 'status', icon: 'i-skull', name: 'Bleed', short: 'Damage that triggers on hits', body: 'Bleed stacks sit on an enemy. Whenever that enemy takes an Attack hit, Bleed ruptures for damage equal to its stacks (then loses 1 stack). Detonate effects trigger it on demand. Because every attack hit triggers it, Bleed loves cheap multi-hit turns. No lean-kit card applies Bleed yet — it is reserved for later card passes.', example: 'A 6-stack of Bleed adds 6 damage to every Attack hit — six damage per Jab, not six per turn.', tags: ['bleed', 'dot', 'goro', 'kaito', 'rupture'] },
  { cat: 'status', icon: 'i-skull', name: 'Toxin', short: 'Damage when the enemy acts', body: 'Toxin ticks for its full stack value whenever that enemy’s action counter reaches 0 and it acts, also chewing through Tenacity, then slowly decays. It punishes slow enemies and rewards Goro for simply staying alive. Goro applies it with Scalpel (2) and Devour (4), so a boss that acts often melts itself while he tanks.', example: 'A 12-Toxin enemy that acts 3 more times is already dead — it just hasn’t noticed.', tags: ['toxin', 'poison', 'dot', 'goro'] },
  { cat: 'status', icon: 'i-poison', name: 'POISON — Damage over Time (DoT)', short: 'Stacks x 3 at End Turn, and her attacks scale off it', body: 'Poison is Yuna’s DoT and it SCALES. Stacks collect on the enemy during your turn; when you press END TURN each enemy takes damage = Poison stacks x 3, then its Poison falls by 1 (10 Poison ticks 30, then 27, then 24…). Two multipliers make it snowball: Incubate DOUBLES the stacks, and her Potency upgrades (Living Culture / Virulence Engine) add +damage PER STACK (4-5+ per stack), so tick = stacks x per-stack damage. Her attacks scale off it too: Venom Sting deals +1 damage per Poison on the target (+2 upgraded) and Spore Mites +1 per Poison — build the stack, then hit into it. Poison caps at 20 stacks. Necrotic Feast detonates all stacks at once for stacks x 3+ and heals per stack; Apex Parasite triggers a tick immediately. It ignores Strength timing and Shield, does not reduce Tenacity by itself, and can kill before the enemy acts. CASCADE adds +1 stack per application.', example: 'Creeping Dose (4) + Spore Mist (2) + Sting (2) + leader (3) = 11 stacks → Incubate grows it to 17 → End Turn melts for 51, and Venom Sting into 20 Poison hits for 26+.', tags: ['poison', 'dot', 'damage over time', 'yuna', 'eosinophil', 'end turn', 'stacks', 'potency', 'scale'] },
  { cat: 'scaling', icon: 'i-buff', name: 'PERCENT SCALING (%HP) — Sable', short: 'Damage, Shield and heals as percentages of HP pools', body: 'Sable the Memory B works in percentages, not flat numbers. Her attacks add a % of the target’s HP pool: Annotate/Titer Lance add % of MAX HP (steady — the bigger the enemy, the bigger the bonus: 3% is +1 vs a 34-HP Spore and +14 vs a 460-HP boss), while Recall Strike adds % of MISSING HP, an execute that grows as the target is wounded. Living Index permanently adds +2% to every % effect. Her defence scales too: Margin Note shields for 14% of HER Max HP, and Second Reading/Century Recall heal a % of her MISSING HP — small at full health, enormous near death. % damage still takes Weakness ×1.5, Mark ×1.5, Vulnerable, Burst and Crit multipliers, and the live number on the card (tagged +%HP) already includes the % bonus against the current target.', example: 'Vs Prion Sovereign (460 HP): Living Index → Annotate = 6 + 5% (23) = 29; Titer Lance Marks it, then Apex Entry = 10 + 12% Max (55+) + 12% missing, all ×1.5 Marked.', tags: ['percent', '%', 'scaling', 'sable', 'memory b', 'max hp', 'execute', 'boss'] },
  { cat: 'status', icon: 'i-target', name: 'Mark (×1.5) & Vulnerable (×1.35)', short: 'Paint the target, then everyone hits it', body: 'Marked enemies take ×1.5 damage and Vulnerable enemies take ×1.35 from all direct hits, for a number of enemy actions/turns shown on their chips. They stack multiplicatively with Weakness (×1.5), Ravaged (×1.3), Burst (×1.6) and Crit (×1.75). This multiplication is how 30-damage cards become 200-damage cards. Apply these BEFORE the big spend, not after.', example: 'Flare (Mark all enemies, +50% taken) → Titer Lance or Cytokine Storm into that Mark is the basic one-two.', tags: ['mark', 'vulnerable', 'vuln', 'multiplier', 'bibi', 'setup'] },
  { cat: 'cards', icon: 'i-sword', name: 'The 5-card kit', short: '1 Basic · 2 Skills · 1 Heavy · 1 one-use Buff', body: 'Each combatant brings exactly FIVE cards, one copy of each, and that is the whole kit: (1) a 1-AP Basic Attack with one small rider, (2) two 1-AP Skills — a light support card and their signature tool, (3) one Heavy costing 2-3 AP: the big damage, shield, heal, HP or DoT payoff, and (4) one permanent Buff Upgrade that Exhausts, so it can only be used ONCE per battle. Upgrades are also Initiation, so they always appear in your opening hand. A full team of three therefore fields a 15-card deck: simple, readable, and easy to extend later.', example: 'Kaito = Cytokine Jab · Adrenal Brace · War Cry · Last Shift (Heavy) · Overclock (Buff, one use).', tags: ['kit', 'basic attack', 'heavy', 'buff', 'upgrade', 'deckbuilding', '5 cards'] },
  { cat: 'enemy', icon: 'i-eye', name: 'Enemy status icons & long-press inspect', short: 'Icons live under the HP bar', body: 'Directly under each enemy’s HP/Tenacity bars is its status row: green flask = Poison stacks (next End-Turn tick), drop = Bleed, flask = Toxin, target = Mark, down-arrow = Vulnerable/Weaken, plus buffs like ATK UP, CHARGING and innate mods. Click an enemy to target it. HOLD (long-press) or right-click an enemy to open a full inspect panel listing every buff and debuff with stacks, duration, exact numbers and what will happen next — including how much Poison will tick at End Turn.', example: 'See “POISON 14” under the bar? Long-press: it will take 14 (+ Potency) when you End Turn, then drop to 13.', tags: ['enemy', 'buff', 'debuff', 'status icons', 'long press', 'inspect', 'hp bar'] },
  { cat: 'status', icon: 'i-debuff', name: 'Weaken, Curses & Statuses', short: 'Enemy debuffs and hand-cloggers', body: 'Weakened enemies deal 35% less damage while it lasts. Curses (Fever/Doubt) are unplayable cards that clog your hand; Fever also adds 6 Stress when drawn. Status cards are usually Breakdown Recovery cards — those you DO want to play. Shops can purge curses from a run deck.', example: 'Drawing Fever at 94 Stress can cause a Breakdown before you play a single card. Respect the curse.', tags: ['weaken', 'curse', 'fever', 'doubt', 'status', 'unplayable'] },
  { cat: 'enemy', icon: 'i-target', name: 'Weakness (×1.5)', short: 'Match the attribute, break faster', body: 'Every enemy is weak to one attribute (Passion/Order/Justice/Void/Instinct), shown as its coloured glyph badge. Weakness hits deal ×1.5 damage (×1.75 with Antigen Lens, +0.15 more if Attuned) and deal 2.5× Tenacity damage. Your selected enemy’s weakness is also in the banner above the arena. Bosses change weakness at 66% and 33% HP — watch for PHASE SHIFT.', example: 'The damage preview on a card already includes Weakness. Yellow “WEAK” means you matched it.', tags: ['weakness', 'attribute', 'passion', 'order', 'justice', 'void', 'instinct'] },
  { cat: 'enemy', icon: 'i-bolt', name: 'Tenacity & RAVAGED (Break)', short: 'The amber bar under enemy HP', body: 'Damaging cards reduce Tenacity by roughly 3 + (2× card cost), multiplied ×2.5 on a Weakness hit. 0-cost cards do not reduce it. At 0 Tenacity the enemy is RAVAGED: your team gains +1 AP immediately, everyone loses 10 Stress, the enemy’s counter is delayed, and it takes +30% damage. Some enemies resist or are immune. Breaking at the right moment is worth more than raw HP damage.', example: 'Three cheap Weakness hits can break faster than one huge off-weakness hit — and fund the huge hit with the bonus AP.', tags: ['tenacity', 'break', 'ravaged', 'amber bar', 'stagger'] },
  { cat: 'enemy', icon: 'i-crown', name: 'Elites, Bosses & Phases', short: 'Badges above the enemy name', body: 'ELITE/BOSS chips and mod chips (REGEN, IRON SHELL, QUICK) change the rules: Regen restores Tenacity, Iron Shell resists Tenacity damage and cannot be Ravaged, Quick resets its action counter 1 faster. Bosses shift phase (and weakness/name) at HP thresholds. The live intent badge and counter still tell the truth — plan around them.', example: 'Against IRON SHELL, stop trying to break it. Race HP and use the fight’s other mechanics.', tags: ['elite', 'boss', 'regen', 'iron shell', 'quick', 'phase'] },
  { cat: 'cards', icon: 'i-sword', name: 'Reading a card (live numbers)', short: 'The big number is the real number', body: 'Top-left gem = AP cost. The pill = Attack/Skill/Upgrade. The big FX number is a live preview against your selected enemy including Strength, Fury, Shield totals, Weakness, Mark, Vulnerable, Resonance Burst, Crit and multi-hits. Hold/right-click a card for the full maths breakdown, upgrade text and tags. If the preview says LETHAL, it is lethal — previews and resolution use the same code.', example: 'Switch targets by clicking an enemy and watch every card in hand re-price itself instantly.', tags: ['card', 'preview', 'damage number', 'cost', 'type', 'hold'] },
  { cat: 'cards', icon: 'i-bolt', name: 'Combo · Chain · Finale', short: 'Order-of-play bonuses', body: 'Combo: if your previous card this turn was the same type, gain the listed bonus. Chain: if your previous card belonged to a different character, gain the listed effect (+1 Resonance from the engine; EDGE teams also get +20% damage). Finale: if this card spends your last AP, gain the bonus — Last Shift also guarantees a Crit. Sequence is a resource: cheap first, spender last.', example: 'Jab (Fury) → Adrenal Brace (Shield) → Last Shift as your last AP is a complete Kaito sentence.', tags: ['combo', 'chain', 'finale', 'sequence', 'last ap'] },
  { cat: 'cards', icon: 'i-star', name: 'Retain · Haste · Exhaust · Tokens', short: 'The four tag words that change timing', body: 'Retain: the card stays in hand at End Turn. Haste: playing it does not tick enemy counters. Exhaust: after use it leaves the fight — that is how every character’s Buff Upgrade is limited to ONE use per battle. Tokens are free cards created mid-fight by special effects.', example: 'Overclock is Initiation + Exhaust: it opens in hand, grants +1 AP per turn, then is gone for the fight.', tags: ['retain', 'haste', 'exhaust', 'token', 'spark', 'timing'] },
  { cat: 'cards', icon: 'i-star', name: 'Epiphany & Glint cards', short: 'Free evolved cards mid-fight', body: 'Most turns have a chance to spark an Epiphany for a character; the next card played opens a 3-way choice (BRUTAL power, FLOW speed, SURGE sustain) and adds an evolved 0-AP version of one of their cards straight to hand. Separately, drawn cards can Glint (gold border): they cost 0 AP and deal ×1.4. Never waste a Glint on a card you were about to discard.', example: 'If Epiphany is armed for Bibi, play a cheap card first to open the choice before your real turn plan.', tags: ['epiphany', 'glint', 'evolution', 'free card', 'mutation'] },
  { cat: 'cards', icon: 'i-sands', name: 'Sands of Time', short: 'Paid undo buttons (run mode)', body: 'The hourglass (right rail, limited charges per run) buys time tricks: 1 charge undoes your last card, 2 redraws your Ego queue, 3 rewinds to the start of the turn. Snapshots are taken automatically. It cannot save a finished fight — spend it when a misclick or a bad draw is about to cost a run, not after.', example: 'Misclicked your finisher into the wrong enemy? 1-charge Undo is cheaper than a lost run.', tags: ['sands', 'undo', 'rewind', 'hourglass', 'run'] },
  { cat: 'team', icon: 'i-cell', name: 'Attributes, Classes & Synergies', short: 'Why Slot 1 and team mix matter', body: 'Each combatant has an Attribute (their damage colour/weakness coverage) and a Class (Striker/Vanguard/Controller/Psionic — what their cards do). Slot 1 is Leader and grants their Leader bonus. Class pairs create Synergies: BASTION (Vanguard+Controller), EDGE (Striker+Psionic), PHALANX (Striker+Vanguard), CASCADE (Controller+Psionic); two of one Attribute creates ATTUNED (+weakness damage). The roster screen previews all of this live as you pick.', example: 'Kaito+Momo is not two good cards decks — PHALANX turns Momo’s defence into Kaito’s Fury.', tags: ['synergy', 'leader', 'attribute', 'class', 'team', 'slot 1'] },
  { cat: 'team', icon: 'i-flask', name: 'Levels, Awakening & the Lab', short: 'Permanent power between runs', body: 'Combatants earn XP and levels (+HP, periodic +ATK). In the Cell Lab you spend Cells on Awakening slots (+10 Max HP, +2 Attack, −1 Ego cost) and Skill Potency (+damage/healing numbers on that character’s cards and Egos). None of this is required to learn a character — the Simulation Chamber ignores your save pressure and just lets you practise.', example: 'Open any combatant’s DETAILS to see their full pool, then LAB to grow them, then SIMULATION to test the result solo.', tags: ['lab', 'level', 'awakening', 'skill potency', 'xp', 'cells', 'meta'] },
  { cat: 'team', icon: 'i-target', name: 'Simulation Chamber', short: 'The 999,999 HP practice boss', body: 'Pick ONE combatant and fight a Training Colossus that effectively cannot die. Choose the Starter kit or the Upgraded kit (both are that combatant’s 5 cards — upgraded shows the ceiling); set the dummy to passive/training/live-fire; track damage, damage-per-turn, best hit and character Trials live. Lab Controls can grant Fury/Resonance/EP/AP to test a threshold instantly. Ending the test gives a report — your save and run are never touched.', example: 'New card confusing you? Upgraded kit + Target Dummy + read the card, play it, watch the log.', tags: ['simulation', 'practice', 'dummy', '999999', 'trials', 'dps'] },
];

function openGuide(cat = 'all') {
  if (GUIDE_CATS.some(([id]) => id === cat)) guideCat = cat;
  renderGuide();
  showView('guide');
}
function renderGuide() {
  const cats = $('guide-cats');
  if (!cats) return;
  cats.innerHTML = '';
  GUIDE_CATS.forEach(([id, label]) => {
    const b = el('button', guideCat === id ? 'active' : '', label);
    b.addEventListener('click', () => { guideCat = id; renderGuide(); });
    cats.appendChild(b);
  });
  const q = guideQuery.trim().toLowerCase();
  const list = GUIDE_ENTRIES.filter((g) => (guideCat === 'all' || g.cat === guideCat)
    && (!q || `${g.name} ${g.short} ${g.body} ${g.example} ${g.tags.join(' ')}`.toLowerCase().includes(q)));
  const grid = $('guide-grid');
  grid.innerHTML = list.map((g) => `
    <article class="guide-card">
      <h3>${ico(g.icon)} ${g.name}</h3>
      <span class="g-short">${g.short}</span>
      <p>${g.body}</p>
      <div class="g-example"><b>Example —</b> ${g.example}</div>
      <div class="g-tags">${g.tags.slice(0, 4).map((t) => `<span class="tag">${t}</span>`).join('')}</div>
    </article>`).join('');
  $('guide-empty').classList.toggle('hidden', list.length > 0);
}

/* ========================================================= CHARACTER DETAILS */
function charCards(id) {
  return Object.entries(CARDS)
    .filter(([, c]) => c.owner === id && !c.token && c.type !== 'status' && c.type !== 'curse')
    .map(([cid, c]) => ({ id: cid, ...c }));
}
function openCharacter(id, from = 'roster') {
  detailCharId = CHARACTERS[id] ? id : 'kaito';
  charReturnView = from;
  renderCharacter();
  showView('character');
}
function renderCharacter() {
  const ch = CHARACTERS[detailCharId];
  const guide = CHARACTER_GUIDES[detailCharId] || {};
  const a = attr(ch.attr);
  const rec = progress.chars[detailCharId] || { xp: 0, awaken: [false, false, false], skillLv: 0 };
  const st = charStats(progress)[detailCharId];
  const lv = levelOf(rec.xp);
  const inTeam = progress.team.includes(detailCharId);
  const cards = charCards(detailCharId);

  const rail = $('char-rail');
  rail.innerHTML = '';
  Object.values(CHARACTERS).forEach((c) => {
    const b = el('button', c.id === detailCharId ? 'active' : '', `<img src="${c.art}" alt="" />${c.name.toUpperCase()}`);
    b.addEventListener('click', () => { sfx('click'); detailCharId = c.id; renderCharacter(); });
    rail.appendChild(b);
  });
  $('char-title').textContent = `${ch.name.toUpperCase()} — DETAILS`;

  const cardSlots = cards.map((c) => {
    const inStarter = ch.deck.includes(c.id);
    const obj = makeStaticCard(c.id, false);
    const { className, html } = cardHTML(obj, null);
    const slot = c.basic ? '★ BASIC ATTACK · 1 AP'
      : c.type === 'upgrade' ? 'BUFF UPGRADE · 1 USE PER BATTLE'
        : (c.cost || 0) >= 2 ? 'HEAVY · BIG PAYOFF' : 'SKILL · SIMPLE SUPPORT';
    return `<div class="char-card-slot"><div class="${className}" style="--rot:0deg;--lift:0px" data-char-card="${c.id}">${html}</div><span class="char-card-where">${slot}</span></div>`;
  }).join('');

  $('char-main').innerHTML = `
    <div class="char-hero" style="--skin:${ch.skin}">
      <div class="char-hero-art"><img src="${ch.art}" alt="${ch.name}" /></div>
      <div class="char-hero-info">
        <span class="czn-id">COMBATANT FILE // ${ch.id.toUpperCase()} · SAVE DATA</span>
        <h2 style="color:${ch.skin}">${ch.name}</h2>
        <div class="char-classline">
          <span class="cls-chip">${CLASSES[ch.cls].name}</span>
          <span class="attr-tag" style="color:${a.color}">${a.glyph} ${a.name}</span>
          <span class="attr-tag">${ROLES[ch.cls] || ''}</span>
          <span class="attr-tag">LV ${lv} · ${xpIntoLevel(rec.xp)}/100 XP</span>
        </div>
        <p class="char-blurb"><b>${ch.full}.</b> ${ch.blurb}</p>
        <p class="char-blurb"><b>Core mechanic —</b> ${guide.core || ''}</p>
        <div class="char-statgrid">
          <div><b>${ch.hp + st.hp}</b><span>MAX HP (WITH LAB)</span></div>
          <div><b>+${st.atk}</b><span>BONUS ATTACK</span></div>
          <div><b>+${st.skillLv}</b><span>SKILL POTENCY</span></div>
          <div><b>-${st.egoDiscount} EP</b><span>EGO DISCOUNT</span></div>
        </div>
        <div class="char-hpbar"><i style="width:${Math.min(100, ((ch.hp + st.hp) / 140) * 100)}%"></i><span>HP ${ch.hp + st.hp}</span></div>
        <div class="char-leader"><b>LEADER SKILL — ${ch.leader ? ch.leader.name : ''}.</b> ${ch.leader ? ch.leader.desc : ''}<br/><span style="color:var(--ink-dim)">Only active when ${ch.name} is in team Slot 1. Class: ${CLASSES[ch.cls].desc}</span></div>
        <div class="char-actions">
          <button class="btn-primary" id="char-sim">${ico('i-target')} TEST SOLO IN SIMULATION</button>
          <button class="btn-ghost" id="char-team">${inTeam ? 'REMOVE FROM TEAM' : 'ADD TO TEAM'}</button>
          <button class="btn-ghost" id="char-lab">${ico('i-flask')} OPEN IN LAB</button>
          <button class="btn-ghost" id="char-guide-btn">${ico('i-book')} MECHANICS GUIDE</button>
        </div>
      </div>
    </div>

    <div class="char-tabs"><button data-sec="char-sec-play">PLAYBOOK</button><button data-sec="char-sec-cards">CARDS</button><button data-sec="char-sec-ego">EGO — TAP TO PREVIEW</button></div>

    <h3 class="char-section-title" id="char-sec-play">${ico('i-sword')} HOW TO PLAY ${ch.name.toUpperCase()} <small>${guide.difficulty || ''} — ${guide.fantasy || ''}</small></h3>
    <div class="char-playbook">
      <div class="char-mini"><span>THE LOOP</span><ol>${(guide.loop || []).map((x) => `<li>${x}</li>`).join('')}</ol></div>
      <div class="char-mini"><span>SIGNATURE COMBO ROUTE</span><ol>${(guide.combo || []).map((x) => `<li>${x}</li>`).join('')}</ol></div>
      <div class="char-mini"><span>PRO TIPS & SYNERGY</span><ul>${(guide.tips || []).map((x) => `<li>${x}</li>`).join('')}<li><b>Partners:</b> ${guide.partners || ''}</li><li><b>Simulation goal:</b> ${guide.simGoal || ''}</li></ul></div>
    </div>

    <h3 class="char-section-title" id="char-sec-cards">${ico('i-eye')} CARDS (${cards.length}) <small>The whole kit — every card below is in ${ch.name}'s deck. Tap one for its maths, upgrade text and keywords. Lean-kit rule: 1 Basic Attack, 2 Skills, 1 Heavy (2-3 AP), 1 Buff Upgrade you can use once per battle.</small></h3>
    <div class="char-cards">${cardSlots}</div>

    <h3 class="char-section-title" id="char-sec-ego">${ico('i-star')} EGO SKILLS <small>4 EP normally · arm EXALT at 7 EP for the Over-Exalt version. Broken-down combatants cannot use Ego.</small></h3>
    <div class="char-ego-grid">
      ${(EGOS[detailCharId] || []).map((e) => `<div class="char-ego"><b style="color:${a.color}">${e.name}</b> <span class="tag">${e.cost} EP</span><p>${e.text}</p><p class="exalt">${e.exaltText}</p></div>`).join('')}
    </div>`;

  $('char-main').querySelectorAll('[data-char-card]').forEach((node) => {
    node.addEventListener('click', () => { sfx('click'); openStaticDetail(makeStaticCard(node.dataset.charCard, false)); });
  });
  // section tabs remember where you left off on this page
  try { window.localStorage.setItem('cw_last_char', detailCharId); } catch { /* ignore */ }
  $('char-main').querySelectorAll('.char-tabs button').forEach((b) => b.addEventListener('click', () => {
    sfx('click');
    try { window.localStorage.setItem('cw_char_sec', b.dataset.sec); } catch { /* ignore */ }
    const target = document.getElementById(b.dataset.sec);
    if (target && target.scrollIntoView) target.scrollIntoView({ block: 'start' });
  }));
  try {
    const sec = window.localStorage.getItem('cw_char_sec');
    const target = sec && document.getElementById(sec);
    if (target && target.scrollIntoView) setTimeout(() => target.scrollIntoView({ block: 'start' }), 30);
  } catch { /* ignore */ }
  // tap an Ego = cut-in preview
  $('char-main').querySelectorAll('.char-ego').forEach((node, i) => node.addEventListener('click', () => previewEgo(ch, (EGOS[detailCharId] || [])[i])));
  $('char-sim').addEventListener('click', () => { sfx('click'); openSim(detailCharId); });
  $('char-lab').addEventListener('click', () => { sfx('click'); openLab(detailCharId); });
  $('char-guide-btn').addEventListener('click', () => { sfx('click'); openGuide('scaling'); });
  $('char-team').addEventListener('click', () => { sfx('click'); toggleTeam(detailCharId); renderCharacter(); renderRoster(); });
}

let egoPreviewTimer = null;
function previewEgo(ch, ego) {
  const box = $('ego-preview'); if (!box || !ego) return;
  $('ego-preview-img').src = ch.art;
  $('ego-preview-name').textContent = ego.name.toUpperCase();
  $('ego-preview-name').style.color = ch.skin || '';
  $('ego-preview-text').textContent = ego.text;
  box.classList.remove('hidden');
  box.classList.remove('play'); void box.offsetWidth; box.classList.add('play');
  sfx('ego');
  clearTimeout(egoPreviewTimer);
  egoPreviewTimer = setTimeout(() => box.classList.add('hidden'), 2600);
}

/* ========================================================= SIMULATION CHAMBER */
function simTrialsFor(id) {
  const common = [
    { label: 'Deal 300 total damage', check: (b) => b.stats.damage >= 300 },
    { label: 'Play 15 cards', check: (b) => b.cardsPlayed >= 15 },
    { label: 'Break Tenacity → RAVAGED (or deal 800 unbreakable damage)', check: (b, t) => b.enemies[0].ravaged || b.stats.damage >= 800 },
  ];
  const byChar = {
    kaito: [
      { label: 'Reach 8 Fury at once', check: (b, t) => t.maxFury >= 8 },
      { label: 'Land a single hit of 60+ damage', check: (b) => b.stats.maxHit >= 60 },
      { label: 'Spend a full Fury stack on Last Shift (last AP = Finale Crit)', check: (b, t) => t.sawStressSpend },
    ],
    momo: [
      { label: 'Hold 20+ Shield at once', check: (b, t) => t.maxShield >= 20 },
      { label: 'Deal Counter damage (let it hit your Shield)', check: (b, t) => t.sawCounter },
      { label: 'Land a single hit of 40+ (Aegis Slam ceiling)', check: (b) => b.stats.maxHit >= 40 },
    ],
    goro: [
      { label: 'Stack 12+ Toxin on the Colossus', check: (b, t) => t.maxStatus >= 12 },
      { label: 'Heal the squad with Marrow Broth while holding the line', check: (b) => b.stats.healed >= 20 },
      { label: 'Land a single hit of 40+ (Devour)', check: (b) => b.stats.maxHit >= 40 },
    ],
    yuna: [
      { label: 'Stack 15+ Poison on the Colossus', check: (b, t) => t.maxPoison >= 15 },
      { label: 'Watch a 45+ Poison tick at End Turn (stacks x 3+)', check: (b, t) => t.maxPoisonTick >= 45 },
      { label: 'Stack Poison on the whole board (Spore Mist / Epidemic Bloom)', check: (b, t) => t.sawPoisonPlay },
    ],
    bibi: [
      { label: 'Reach 8 Resonance', check: (b, t) => t.maxResonance >= 8 },
      { label: 'Mark the Colossus, then hit it', check: (b, t) => t.sawMark },
      { label: 'Land a single hit of 50+ (Cytokine Storm with Resonance)', check: (b) => b.stats.maxHit >= 50 },
    ],
    sable: [
      { label: 'Play Living Index, then land a 40+ %HP hit', check: (b) => b.stats.maxHit >= 40 },
      { label: 'Mark the Colossus with Titer Lance, then hit it', check: (b, t) => t.sawMark },
      { label: 'Heal 30% of your missing HP with Second Reading', check: (b) => b.stats.healed >= 20 },
    ],
  };
  return [...(byChar[id] || []), ...common];
}
function simDeckFor(id, loadout) {
  // The kit is exactly 5 cards: Starter = base versions, Upgraded = the
  // upgraded versions (see the ceiling). The four non-Upgrade cards are
  // duplicated so a solo combatant still draws real hands — the one-use Buff
  // Upgrade is never duplicated, or its permanent passive would stack twice.
  const kit = CHARACTERS[id].deck.slice();
  const repeatable = kit.filter((cid) => CARDS[cid].type !== 'upgrade');
  const ids = [...kit, ...repeatable];
  return ids.map((cid) => ({ id: cid, upgraded: loadout === 'upgraded' }));
}
function openSim(charId = simCharId) {
  simCharId = CHARACTERS[charId] ? charId : 'kaito';
  renderSimSetup();
  showView('sim');
}
function renderSimSetup() {
  const wrap = $('sim-chars');
  if (!wrap) return;
  wrap.innerHTML = '';
  Object.values(CHARACTERS).forEach((c) => {
    const a = attr(c.attr);
    const b = el('button', `sim-char${c.id === simCharId ? ' active' : ''}`,
      `<img src="${c.art}" alt="" /><div><b style="color:${c.skin}">${c.name}</b><span>${a.glyph} ${a.name} · ${CLASSES[c.cls].name}</span><span>${CHARACTER_GUIDES[c.id].simGoal}</span></div>`);
    b.style.setProperty('--skin', c.skin);
    b.addEventListener('click', () => { sfx('click'); simCharId = c.id; renderSimSetup(); });
    wrap.appendChild(b);
  });
  const bindOpts = (id, get, set) => {
    $(id).querySelectorAll('button').forEach((b) => {
      b.classList.toggle('active', b.dataset.val === get());
      b.onclick = () => { sfx('click'); set(b.dataset.val); renderSimSetup(); };
    });
  };
  bindOpts('sim-loadout', () => simLoadout, (v) => { simLoadout = v; });
  bindOpts('sim-behaviour', () => simBehaviour, (v) => { simBehaviour = v; });
  $('sim-trials').innerHTML = `<h3>${ico('i-target')} ${CHARACTERS[simCharId].name.toUpperCase()} TRIALS FOR THIS TEST</h3><ul>${simTrialsFor(simCharId).map((t) => `<li>${t.label}</li>`).join('')}</ul><p style="font-size:11px;color:var(--muted);line-height:1.5">Trials tick live in battle. They are learning goals, not unlocks — no save data is changed by simulation.</p>`;
}
function beginSimBattle(charId = simCharId) {
  simCharId = CHARACTERS[charId] ? charId : 'kaito';
  const ch = CHARACTERS[simCharId];
  const weaknessSel = $('sim-weakness') ? $('sim-weakness').value : 'match';
  const tenacitySel = $('sim-tenacity') ? $('sim-tenacity').value : 'breakable';
  const vitalitySel = $('sim-vitality') ? $('sim-vitality').value : 'training';
  battleCtx = { kind: 'sim', charId: simCharId, loadout: simLoadout, behaviour: simBehaviour, weaknessSel, tenacitySel, vitalitySel };
  simReported = false;
  simTracker = { maxFury: 0, maxShield: 0, maxResonance: 0, maxStatus: 0, maxStr: 0, maxPoison: 0, maxPoisonTick: 0, sawPoisonPlay: false, sawCounter: false, sawDetonate: false, sawMark: false, sawStressSpend: false };
  battle = startBattle({
    name: `SIMULATION // ${ch.name.toUpperCase()} SOLO`,
    place: 'Training Colossus · 999,999 HP · no save impact',
    enemies: ['sim_colossus'],
    missionCode: 'sim',
    party: [simCharId],
    deck: simDeckFor(simCharId, simLoadout),
    charStats: charStats(progress),
    seed: Date.now(),
  });
  const c = battle.characters[0];
  const e = battle.enemies[0];
  if (vitalitySel === 'training') { c.maxHp *= 5; c.hp = c.maxHp; }
  e.hp = 999999; e.maxHp = 999999;
  e.weakness = weaknessSel === 'match' ? ch.attr : weaknessSel;
  if (tenacitySel === 'unbreakable') { e.tenacity = 9999; e.maxTenacity = 9999; if (!e.mods.includes('immuneRavage')) e.mods = [...e.mods, 'immuneRavage']; }
  else { e.tenacity = 140; e.maxTenacity = 140; }
  if (simBehaviour === 'passive') { e.intents = [{ type: 'defend', value: 0 }]; e.counter = 9999; e.maxCounter = 9999; }
  else if (simBehaviour === 'live') { e.intents = [{ type: 'attack', value: 14 }, { type: 'attack', value: 14 }, { type: 'charge', value: 34, turns: 2 }]; e.counter = 3; e.maxCounter = 3; }
  else { e.intents = [{ type: 'attack', value: 8 }, { type: 'attack', value: 8 }, { type: 'debuff', value: 8 }]; e.counter = 4; e.maxCounter = 4; }
  battle.targetUid = e.uid;
  enterBattleView(`SIMULATION // ${ch.name.toUpperCase()} SOLO`, 'Training Colossus · 999,999 HP');
}
function updateSimTracker() {
  if (!battle || !simTracker) return;
  const c = battle.characters[0];
  const e = battle.enemies[0];
  if (!c || !e) return;
  simTracker.maxFury = Math.max(simTracker.maxFury, c.fury || 0);
  simTracker.maxShield = Math.max(simTracker.maxShield, c.shield || 0);
  simTracker.maxResonance = Math.max(simTracker.maxResonance, battle.resonance || 0);
  simTracker.maxStatus = Math.max(simTracker.maxStatus, (e.bleed || 0) + (e.toxin || 0) + (e.poison || 0));
  simTracker.maxPoison = Math.max(simTracker.maxPoison, e.poison || 0);
  battle.log.forEach((l) => { const m = /POISON — .* takes (\d+)/.exec(l.text); if (m) simTracker.maxPoisonTick = Math.max(simTracker.maxPoisonTick, Number(m[1])); });
  if (/POISON/.test(battle.log.map((l) => l.text).join('\n'))) simTracker.sawPoisonPlay = true;
  simTracker.maxStr = Math.max(simTracker.maxStr, c.str || 0);
  const logText = battle.log.map((l) => l.text).join('\n');
  if (/COUNTER/.test(logText)) simTracker.sawCounter = true;
  if (/Devour/i.test(logText)) simTracker.sawDetonate = true;
  if (e.mark > 0 || /Mark/i.test(logText)) simTracker.sawMark = true;
  if (/Consumed .* Fury/.test(logText)) simTracker.sawStressSpend = true;
}
function renderSimHud() {
  const hud = $('sim-hud');
  if (!hud || !battle || !battleCtx || battleCtx.kind !== 'sim') return;
  updateSimTracker();
  applySimHudVisibility();
  $('sim-hud-char').textContent = CHARACTERS[battleCtx.charId].name.toUpperCase();
  if ($('sim-pill-dmg')) $('sim-pill-dmg').textContent = `${battle.stats.damage.toLocaleString()} DMG`;
  if ($('sim-pill-trials')) {
    const trials = simTrialsFor(battleCtx.charId);
    $('sim-pill-trials').textContent = `· ${trials.filter((x) => x.check(battle, simTracker)).length}/${trials.length} TRIALS`;
  }
  $('sim-dmg').textContent = battle.stats.damage.toLocaleString();
  $('sim-dpt').textContent = Math.round(battle.stats.damage / Math.max(1, battle.turn)).toLocaleString();
  $('sim-maxhit').textContent = battle.stats.maxHit.toLocaleString();
  $('sim-cards').textContent = battle.cardsPlayed;
  $('sim-trial-list').innerHTML = simTrialsFor(battleCtx.charId).map((t) => {
    const done = t.check(battle, simTracker);
    return `<div class="sim-trial${done ? ' done' : ''}"><i>${done ? '✓' : '○'}</i><span>${t.label}</span></div>`;
  }).join('');
}
function endSimTest(manual = true) {
  if (!battle || simReported) return;
  simReported = true;
  updateSimTracker();
  const trials = simTrialsFor(battleCtx.charId);
  const done = trials.filter((t) => t.check(battle, simTracker)).length;
  const title = battle.result === 'win' ? 'COLOSSUS DOWN?!' : (battle.characters[0].hp <= 0 ? 'COMBATANT DOWN — TEST ENDED' : 'SIMULATION REPORT');
  showOverlay(title,
    `${CHARACTERS[battleCtx.charId].name} solo · ${battle.stats.damage.toLocaleString()} damage in ${battle.turn} turns (${Math.round(battle.stats.damage / Math.max(1, battle.turn))}/turn) · best hit ${battle.stats.maxHit} · trials ${done}/${trials.length}. No save data was changed.`,
    'BACK TO SIMULATION SETUP', () => { renderSimSetup(); showView('sim'); }, battle.result === 'win');
  $('overlay-retry').style.display = 'inline-block';
  $('overlay-retry').textContent = 'RESTART TEST';
  $('overlay-retry').onclick = () => beginSimBattle(battleCtx.charId);
}

function applyTeamPulse(id) {
  const card = $('roster')?.querySelector(`.roster-card[data-rid="${id}"]`);
  if (card) {
    card.classList.add('picked');
    setTimeout(() => card.classList.remove('picked'), 620);
  }
}
function toggleTeam(id) {
  const i = progress.team.indexOf(id);
  if (i >= 0) progress.team.splice(i, 1);
  else if (progress.team.length < 3) progress.team.push(id);
  saveProgress(progress);
  renderRoster();
  applyTeamPulse(id);
}

/* ============================================================ missions */
function renderMissions() {
  const list = $('mission-list');
  list.innerHTML = '';
  $('mission-team').textContent = progress.team.map((p) => CHARACTERS[p].name).join(' · ');
  MISSIONS.forEach((m, i) => {
    const unlocked = missionUnlocked(progress, i);
    const cleared = progress.cleared.includes(m.code);
    const bestRank = progress.missionRanks && progress.missionRanks[m.code];
    const a = attr(m.rec);
    const tile = el('button', `mission-tile${unlocked ? '' : ' locked'}`);
    tile.innerHTML = `
      <div>
        <div class="code">${m.code.toUpperCase()}</div>
        <div class="threat ${m.threat}">${m.threat.toUpperCase()}</div>
      </div>
      <div>
        <div class="m-name">${m.name}${cleared ? ` <span style="color:#46e08a;font-size:11px">✓${bestRank ? ' · ' + bestRank : ''}</span>` : ''}</div>
        <div class="m-place">${m.place} · <span style="color:#ffc94d">◆ ${m.reward || 40}${cleared ? ' (claimed)' : ''}</span></div>
        ${m.hero && CHARACTERS[m.hero] ? `<div class="m-hero">★ REQUIRES ${CHARACTERS[m.hero].name.toUpperCase()} — ${CHARACTERS[m.hero].full.split('—')[1].trim().toUpperCase()}</div>` : ''}
      </div>
      <div class="m-right">
        <div class="m-weak">WEAK TO <b style="color:${a.color}">${a.glyph} ${a.name}</b><br>
          <span style="font-size:10px">${m.enemies.map((e) => ENEMIES[e].name).join(' · ')}</span></div>
        <span style="font-size:18px;color:#8b93b5">›</span>
      </div>`;
    if (unlocked) tile.addEventListener('click', () => { sfx('click'); openStory(m); });
    list.appendChild(tile);
  });
}

/* =============================================================== story */
// Story beats are plain strings (older missions) or scripted beats
// { art, who, text } with per-beat art (Mission 01+). Normalise here.
function storyBeat(s) { return typeof s === 'string' ? { text: s } : s; }

let storyRun = 0; // guards the art crossfade against rapid advancing
function showStoryBeat() {
  const beat = storyBeat(mission.story[storyIndex]);
  const art = $('story-art');
  const run = ++storyRun;
  art.style.opacity = '0';
  setTimeout(() => {
    if (run !== storyRun) return; // a newer beat already took over
    art.style.backgroundImage = `url(${beat.art || 'images/cell-warriors-battle.png'})`;
    art.style.opacity = '1';
  }, 170);
  $('story-who').textContent = (beat.who || mission.place).toUpperCase();
  typewriter($('story-text'), beat.text);
  $('btn-story-next').textContent = storyIndex === mission.story.length - 1 ? 'ENGAGE' : 'NEXT';
}

// Every story mission has a mandatory hero (m.hero) — the character the
// story is about must be in the deployed team. If they are missing, they
// are swapped in (last slot) and the player is told via the story note.
function ensureMissionHero(m) {
  if (!m.hero || progress.team.includes(m.hero)) return false;
  if (progress.team.length < 3) progress.team.push(m.hero);
  else progress.team[progress.team.length - 1] = m.hero;
  saveProgress(progress);
  return true;
}

function openStory(m) {
  mission = m;
  storyIndex = 0;
  const heroSwapped = ensureMissionHero(m);
  const note = $('story-note');
  if (note) {
    note.textContent = heroSwapped && CHARACTERS[m.hero]
      ? `${CHARACTERS[m.hero].name.toUpperCase()} ADDED TO YOUR TEAM — THIS STORY REQUIRES ${CHARACTERS[m.hero].name.toUpperCase()}`
      : '';
    note.classList.toggle('hidden', !heroSwapped);
  }
  // Preload every beat's art so panel swaps never flash empty.
  m.story.forEach((s) => { const b = storyBeat(s); if (b.art && typeof Image !== 'undefined') { const im = new Image(); im.src = b.art; } });
  showStoryBeat();
  showView('story');
}

function advanceStory() {
  // First click while a line is still typing completes it; the next
  // click advances. Prevents the interleaved-text scramble at speed.
  if (typewriterFinish($('story-text'))) { sfx('click'); return; }
  sfx('click');
  storyIndex += 1;
  if (storyIndex >= mission.story.length) { beginBattle(mission); return; }
  showStoryBeat();
}

/* ============================================================ chaos map */
function startNewRun() {
  const stats = charStats(progress);
  progress.run = createRun(progress.team, Date.now(), stats);
  saveProgress(progress);
  renderMap();
  showView('map');
}

function renderMap() {
  const run = progress.run;
  if (!run) return;
  const stats = charStats(progress);
  const avail = new Set(availableNodes(run).map((n) => n.id));
  $('map-floor').textContent = `FLOOR ${Math.max(0, run.floor + 1)} / ${run.map.length} · ${run.floor < 0 ? 'CHOOSE ENTRY SECTOR' : 'SELECT NEXT NODE'}`;
  $('map-sands').textContent = run.sands;
  $('map-cells').textContent = run.earned;
  $('map-deck-n').textContent = run.deck.length;

  const teamEl = $('map-team');
  teamEl.innerHTML = '';
  run.team.forEach((pid) => {
    const ch = CHARACTERS[pid];
    const hp = runHp(run, pid, stats);
    const max = maxHpOf(pid, stats, run.team[0] === 'goro');
    const stress = (run.carry[pid] && run.carry[pid].stress) || 0;
    const card = el('div', 'map-char', `
      <img src="${ch.art}" alt="${ch.name}" />
      <div class="map-char-bars">
        <span>${ch.name}<b>${hp}/${max}</b></span>
        <div class="mbar"><i style="width:${(hp / max) * 100}%"></i></div>
        <div class="mbar stress"><i style="width:${Math.min(100, stress)}%"></i></div>
      </div>`);
    teamEl.appendChild(card);
  });

  const relBox = $('map-relics');
  relBox.innerHTML = run.relics.length
    ? run.relics.map((rid) => {
        const r = RELICS[rid];
        return `<span class="relic-chip" title="${r.text}">${r.glyph} <b>${r.name}</b></span>`;
      }).join('')
    : '<span class="relic-empty">NO ANTIBODY RELICS YET — CLEAR ELITES OR VISIT SHOPS</span>';

  const floorsEl = $('map-floors');
  floorsEl.innerHTML = '';
  run.map.forEach((row, f) => {
    const rowEl = el('div', 'map-floor-row');
    rowEl.appendChild(el('span', 'floor-num', `F${f + 1}`));
    row.forEach((node) => {
      const meta = NODE_META[node.type] || NODE_META.battle;
      const isAvail = avail.has(node.id);
      const isCur = run.floor === node.floor && run.lane === node.lane;
      const isNew = node.__entered && Date.now() - node.__entered < 1600;
      const cls = `map-node ${node.type}${isAvail ? ' avail' : (node.cleared ? ' cleared' : ' locked')}${isCur ? ' current' : ''}${isNew ? ' entered' : ''}`;
      const btn = el('button', cls, `<span class="n-ico">${ico(meta.ico)}</span><span class="n-lbl">${node.cleared ? '✓ ' : ''}${meta.lbl}</span>`);
      btn.dataset.nid = node.id;
      btn.disabled = !isAvail;
      if (isAvail) btn.addEventListener('click', () => { sfx('click'); enterRunNode(node.lane); });
      rowEl.appendChild(btn);
    });
    floorsEl.appendChild(rowEl);
  });

  raf(drawMapLines);
}

function drawMapLines() {
  const run = progress.run;
  const svg = $('map-lines');
  const wrap = $('map-wrap');
  const floorsEl = $('map-floors');
  if (!run || !svg || !wrap || !floorsEl) return;
  const wrapRect = wrap.getBoundingClientRect();
  if (!wrapRect.width) return;
  svg.setAttribute('width', wrap.scrollWidth);
  svg.setAttribute('height', Math.max(wrap.clientHeight, floorsEl.offsetHeight + 48));
  svg.innerHTML = '';

  const curId = run.floor >= 0 ? `f${run.floor}n${run.lane}` : null;
  const posOf = (id) => {
    const n = floorsEl.querySelector(`[data-nid="${id}"]`);
    if (!n) return null;
    const r = n.getBoundingClientRect();
    return {
      x: r.left - wrapRect.left + wrap.scrollLeft + r.width / 2,
      y: r.top - wrapRect.top + wrap.scrollTop + r.height / 2,
    };
  };

  run.map.forEach((row, f) => {
    if (f >= run.map.length - 1) return;
    row.forEach((node) => {
      const a = posOf(node.id);
      if (!a) return;
      (node.edges || []).forEach((toLane) => {
        const nextNode = run.map[f + 1][toLane];
        if (!nextNode) return;
        const b = posOf(nextNode.id);
        if (!b) return;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
        line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
        if (node.id === curId || (node.cleared && nextNode.cleared)) line.setAttribute('class', 'active');
        svg.appendChild(line);
      });
    });
  });
}

function enterRunNode(lane) {
  const run = progress.run;
  const node = enterNode(run, lane);
  if (!node) return null;
  node.__entered = Date.now();
  saveProgress(progress);
  if (node.type === 'battle' || node.type === 'elite' || node.type === 'boss') {
    const enc = encounterFor(run, node);
    beginRunBattle(node, enc);
  } else if (node.type === 'event') {
    openEvent(node);
  } else if (node.type === 'shop') {
    openShop();
  } else if (node.type === 'rest') {
    openRest();
  }
  return node;
}

/* =============================================================== event */
function openEvent(node) {
  const run = progress.run;
  const rng = makeRng(run.seed + node.floor * 41 + node.lane * 7);
  currentEvent = EVENTS[Math.floor(rng() * EVENTS.length)];
  $('event-art').style.backgroundImage = `url(${currentEvent.art})`;
  $('event-name').textContent = currentEvent.name.toUpperCase();
  $('event-text').textContent = currentEvent.text;
  $('event-outcome').classList.add('hidden');
  const box = $('event-choices');
  box.classList.remove('hidden');
  box.innerHTML = '';
  currentEvent.choices.forEach((ch) => {
    const btn = el('button', 'event-choice', `<b>${ch.label}</b><span>${ch.note}</span>`);
    btn.addEventListener('click', () => {
      sfx('click');
      const lines = applyEffect(run, ch.effect, makeRng(Date.now()), charStats(progress));
      markCleared(run);
      saveProgress(progress);
      box.classList.add('hidden');
      $('event-outcome').classList.remove('hidden');
      $('event-outcome-lines').innerHTML = (lines.length ? lines : ['Nothing happened.']).map((l) => `<li>${l}</li>`).join('');
    });
    box.appendChild(btn);
  });
  showView('event');
}

/* ================================================================ shop */
function openShop() {
  const run = progress.run;
  currentShop = makeShop(run);
  renderShop();
  showView('shop');
}

function renderShop() {
  const run = progress.run;
  const shop = currentShop;
  $('shop-cells').textContent = run.earned;

  const cardsBox = $('shop-cards');
  cardsBox.innerHTML = '';
  shop.cards.forEach((item, idx) => {
    const isNew = !(progress.run && progress.run.deck.some((c) => c.id === item.id));
    const wrap = el('div', 'shop-item');
    const card = makeStaticCard(item.id, item.upgraded);
    const { className, html } = cardHTML(card, null);
    const cNode = el('div', className, html);
    cNode.classList.add('reward-in');
    cNode.style.animationDelay = `${idx * 90}ms`;
    if (isNew) cNode.insertAdjacentHTML('beforeend', '<span class="new-badge">NEW</span>');
    cNode.addEventListener('contextmenu', (ev) => { ev.preventDefault(); openStaticDetail(card); });
    cNode.addEventListener('click', () => openStaticDetail(card));
    const btn = el('button', 'shop-buy', item.sold ? 'SOLD' : `BUY · ◆ ${item.cost}`);
    btn.disabled = item.sold || run.earned < item.cost;
    btn.addEventListener('click', () => {
      if (item.sold || run.earned < item.cost) return;
      run.earned -= item.cost;
      item.sold = true;
      addCard(run, item.id, item.upgraded);
      sfx('coin');
      saveProgress(progress);
      renderShop();
    });
    wrap.appendChild(cNode);
    wrap.appendChild(btn);
    cardsBox.appendChild(wrap);
  });

  const relBox = $('shop-relic');
  relBox.innerHTML = '';
  if (shop.relic) {
    const r = RELICS[shop.relic.id];
    const rc = el('div', 'shop-relic-card', `
      <b>${r.glyph} ${r.name}</b>
      <p>${r.text}</p>
      <button class="shop-buy"${shop.relic.sold || run.earned < shop.relic.cost ? ' disabled' : ''}>
        ${shop.relic.sold ? 'ACQUIRED' : `BUY RELIC · ◆ ${shop.relic.cost}`}
      </button>`);
    rc.querySelector('button').addEventListener('click', () => {
      if (shop.relic.sold || run.earned < shop.relic.cost) return;
      run.earned -= shop.relic.cost;
      shop.relic.sold = true;
      grantRelic(run, shop.relic.id);
      sfx('coin');
      saveProgress(progress);
      renderShop();
    });
    relBox.appendChild(rc);
  } else {
    relBox.innerHTML = '<div class="shop-relic-card"><b>ALL RELICS OWNED</b><p>Your kit is complete.</p></div>';
  }

  $('shop-remove-cost').innerHTML = `${ico('i-cell')} ${shop.removeCost}`;
  $('btn-shop-remove').disabled = run.earned < shop.removeCost || run.deck.length <= 6;
}

/* ================================================================ rest */
function openRest() {
  renderRest(false, '');
  showView('rest');
}

function renderRest(done, text) {
  const run = progress.run;
  const stats = charStats(progress);
  const teamEl = $('rest-team');
  teamEl.innerHTML = '';
  run.team.forEach((pid) => {
    const ch = CHARACTERS[pid];
    const hp = runHp(run, pid, stats);
    const max = maxHpOf(pid, stats, run.team[0] === 'goro');
    const stress = (run.carry[pid] && run.carry[pid].stress) || 0;
    teamEl.appendChild(el('div', 'map-char', `
      <img src="${ch.art}" alt="${ch.name}" />
      <div class="map-char-bars">
        <span>${ch.name}<b>${hp}/${max}</b></span>
        <div class="mbar"><i style="width:${(hp / max) * 100}%"></i></div>
        <div class="mbar stress"><i style="width:${Math.min(100, stress)}%"></i></div>
      </div>`));
  });

  $('btn-rest-heal').disabled = done;
  $('btn-rest-calm').disabled = done;
  $('btn-rest-upgrade').disabled = done || upgradableIndexes(run).length === 0;
  $('rest-outcome').classList.toggle('hidden', !done);
  if (done) $('rest-outcome-text').textContent = text;
}

/* ======================================================= reward / rank */
function openReward(node, summary, gained) {
  const run = progress.run;
  $('reward-rank').textContent = rankOf(summary);
  $('reward-title').textContent = node.type === 'elite' ? 'ELITE CONTAINED' : 'SECTOR CLEARED';
  $('reward-cells').textContent = `+${gained} run cells gained (total ◆ ${run.earned})`;

  const relBox = $('reward-relic');
  if (node.type === 'elite') {
    const pickRelic = relicChoices(run, 1)[0];
    if (pickRelic && grantRelic(run, pickRelic)) {
      const r = RELICS[pickRelic];
      relBox.innerHTML = `RELIC FOUND: ${r.glyph} <b>${r.name}</b> — ${r.text}`;
      relBox.classList.remove('hidden');
    } else relBox.classList.add('hidden');
  } else relBox.classList.add('hidden');

  const choices = cardRewardChoices(run);
  const grid = $('reward-cards');
  grid.innerHTML = '';
  choices.forEach((item, idx) => {
    const isNew = !(progress.run && progress.run.deck.some((c) => c.id === item.id));
    const card = makeStaticCard(item.id, item.upgraded);
    const { className, html } = cardHTML(card, null);
    const cNode = el('div', className, html);
    cNode.classList.add('reward-in');
    cNode.style.animationDelay = `${idx * 90}ms`;
    if (isNew) cNode.insertAdjacentHTML('beforeend', '<span class="new-badge">NEW</span>');
    cNode.addEventListener('contextmenu', (ev) => { ev.preventDefault(); openStaticDetail(card); });
    cNode.addEventListener('click', () => {
      sfx('upgrade');
      addCard(run, item.id, item.upgraded);
      markCleared(run);
      saveProgress(progress);
      renderMap();
      showView('map');
    });
    grid.appendChild(cNode);
  });

  saveProgress(progress);
  showView('reward');
}

function finishChaosRun(won) {
  const run = progress.run;
  const firstClear = won && !progress.chaosCleared;
  if (firstClear) progress.chaosCleared = true;
  const sum = runSummary(run, won, firstClear);
  progress.cells += sum.metaCells;
  progress.runs += 1;
  run.finished = true;
  run.rank = sum.rank;
  const leveled = addXp(progress, sum.xp, run.team);
  if (!progress.best || (RANK_ORDER[sum.rank] || 0) > (RANK_ORDER[progress.best.rank] || 0)) {
    progress.best = { rank: sum.rank, floors: sum.floors, won };
  }
  saveProgress(progress);

  $('rank-letter').textContent = sum.rank;
  $('rank-title').textContent = won ? 'CHAOS EXPEDITION CLEAR' : 'SIGNAL LOST IN SECTOR';
  $('rank-sub').textContent = won
    ? 'The host stabilized. All carried relics and battle telemetry recorded.'
    : `Squad collapsed on Floor ${sum.floors}. Salvaged telemetry converted to Meta Cells.`;
  $('rank-stats').innerHTML = `
    <div><b>${sum.floors} / 11</b>FLOORS</div>
    <div><b>${sum.turns}</b>TURNS</div>
    <div><b>${sum.damage}</b>DAMAGE</div>
    <div><b>${sum.breakdowns}</b>BREAKDOWNS</div>
    <div><b>${sum.relics}</b>RELICS</div>`;
  $('rank-cells').textContent = `+${sum.metaCells} META CELLS EARNED${sum.firstBonus ? ` (includes +${sum.firstBonus} First-Clear Bonus!)` : ''}`;
  renderRankXp(run.team, sum.xp, leveled);
  showView('rank');
}

function renderRankXp(team, xpGain, leveled) {
  const lvMap = Object.fromEntries(leveled.map((l) => [l.id, l.level]));
  const box = $('rank-xp');
  box.innerHTML = '';
  team.forEach((pid) => {
    const ch = CHARACTERS[pid];
    const rec = progress.chars[pid];
    const lv = levelOf(rec.xp);
    box.appendChild(el('div', 'rxp-card', `
      <img src="${ch.art}" alt="${ch.name}" />
      <div>
        <b>${ch.name} · LV ${lv}${lvMap[pid] ? ' ↑ LEVEL UP!' : ''}</b>
        <span>+${xpGain} XP (${xpIntoLevel(rec.xp)}/100)</span>
      </div>`));
  });
}

/* ============================================================== battle */
function beginBattle(m) {
  battleCtx = { kind: 'story', mission: m };
  mission = m;
  battle = startBattle({
    name: m.name,
    place: m.place,
    enemies: m.enemies,
    missionCode: m.code,
    party: progress.team,
    charStats: charStats(progress),
    seed: Date.now(),
  });
  enterBattleView(`${m.code.toUpperCase()} · ${m.name.toUpperCase()}`, m.place);
}

function beginRunBattle(node, enc) {
  const run = progress.run;
  battleCtx = { kind: 'run', node, encounter: enc };
  battle = startBattle({
    name: enc.name,
    place: enc.place,
    enemies: enc.enemies,
    enemyScale: enc.scale,
    missionCode: enc.key,
    party: run.team,
    deck: run.deck,
    relics: run.relics,
    carry: run.carry,
    sands: run.sands,
    charStats: charStats(progress),
    seed: run.seed + node.floor * 101 + node.lane * 17,
  });
  enterBattleView(`FLOOR ${node.floor + 1} · ${enc.name.toUpperCase()}`, enc.place);
}

function enterBattleView(title, place) {
  cutBusy = false;
  exaltArmed = false;
  closeDetail();
  $('cutin').classList.add('hidden');
  $('epiphany-modal').classList.add('hidden');
  $('sands-menu').classList.add('hidden');
  $('bark-toast').classList.add('hidden');
  $('dmg-rail').innerHTML = '';
  showView('battle');
  $('overlay').classList.add('hidden');
  $('pause').classList.add('hidden');
  $('b-mission').textContent = title;
  $('b-place').textContent = place || '';
  const isSim = battleCtx && battleCtx.kind === 'sim';
  if ($('battle-bg-img')) $('battle-bg-img').src = isSim ? './images/bg-sim.jpg' : './images/bg-battle.jpg';
  applySimHudVisibility();
  $('pause-restart').style.display = battleCtx && battleCtx.kind === 'run' ? 'none' : 'block';
  $('pause-restart').textContent = isSim ? 'RESTART SIMULATION' : 'RESTART FIGHT';
  $('pause-quit').textContent = isSim ? 'EXIT SIMULATION' : (battleCtx && battleCtx.kind === 'run' ? 'ABANDON TO MAP' : 'QUIT TO MISSIONS');
  renderBattle();
}

let lastTurnShown = 0;
let lastBreakdownShown = '';
function showTurnBanner(turn) {
  const b = $('turn-banner');
  if (!b) return;
  $('turn-banner-text').textContent = `TURN ${turn}`;
  $('turn-banner-sub').textContent = turn === 1 ? 'ENGAGE' : 'YOUR MOVE';
  b.classList.remove('hidden');
  const tp = $('turn-plate');
  if (tp) { tp.classList.add('just-changed'); clearTimeout(tp._tp); tp._tp = setTimeout(() => tp.classList.remove('just-changed'), 800); }
  clearTimeout(b._t);
  b._t = setTimeout(() => b.classList.add('hidden'), 1200);
}
function showBreakdownOverlay(name) {
  const o = $('breakdown-overlay');
  if (!o) return;
  $('breakdown-name').textContent = name.toUpperCase();
  o.classList.remove('hidden');
  clearTimeout(o._t);
  o._t = setTimeout(() => o.classList.add('hidden'), 1400);
}
function hideTargetLine() { const t = $('target-line'); if (t) t.classList.add('hidden'); }
function showTargetLine(fromEl, toEl) {
  const svg = $('target-line'), line = $('target-line-el');
  if (!svg || !line || !fromEl || !toEl) return;
  const view = $('view-battle').getBoundingClientRect();
  const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
  line.setAttribute('x1', a.left - view.left + a.width / 2);
  line.setAttribute('y1', a.top - view.top + a.height / 2);
  line.setAttribute('x2', b.left - view.left + b.width / 2);
  line.setAttribute('y2', b.top - view.top + b.height / 2);
  svg.classList.remove('hidden');
}

function ensureStageParticles() {
  const pp = $('stage-particles');
  if (!pp || pp.querySelector('.stage-particle')) return;
  for (let i = 0; i < 34; i++) {
    const p = document.createElement('i');
    p.classList.add('stage-particle');
    p.style.left = `${Math.random() * 100}%`;
    p.style.top = `${50 + Math.random() * 70}%`;
    p.style.animationDelay = `${-Math.random() * 30}s`;
    pp.appendChild(p);
  }
}

function renderBattle() {
  if (!battle) return;
  flushFx();
  ensureStageParticles();
  if (battle.turn !== lastTurnShown) { lastTurnShown = battle.turn; showTurnBanner(battle.turn); }
  const broken = battle.characters.find((c) => c.broken);
  const bKey = broken ? broken.id + broken.breakdownCount : '';
  if (bKey && bKey !== lastBreakdownShown) { lastBreakdownShown = bKey; showBreakdownOverlay(broken.name); }
  if (!broken) lastBreakdownShown = '';
  if (battle.ep < MAX_EP) exaltArmed = false;
  renderTeam();
  renderEnemies();
  renderHand();
  renderResources();
  renderTopBar();
  renderLog();
  if (battleCtx && battleCtx.kind === 'sim') renderSimHud();
  $('b-turn').textContent = battle.turn;
  const w = attr(battle.enemies[0] ? battle.enemies[0].weakness : null);
  $('weak-banner').innerHTML = `BREAK <b style="color:${w.color}">${w.glyph} ${w.name.toUpperCase()}</b> TENACITY → +1 AP`;
  $('end-turn').disabled = !!battle.result;
  $('ap-now').textContent = battle.ap;
  $('ap-now').parentElement.classList.toggle('zero', battle.ap <= 0);

  $('battle-relics').innerHTML = battle.relics.map((r) => `<span class="hpill" title="${r.text}">${r.glyph} ${r.name}</span>`).join('');
  $('battle-synergy').innerHTML = battle.synergy.map((s) => `<span class="hpill syn" title="${s.desc}">${s.name}</span>`).join('');

  const tips = [`RESONANCE <b>${battle.resonance}/${MAX_RESONANCE}</b>`];
  if (battle.resonance >= BURST_COST) tips.push('<b style="color:#ffc94d">BURST READY ×1.6</b>');
  if (battle.echoNext) tips.push('<b style="color:#b06bff">PRISM ECHO ×2</b>');
  if (battle.ep >= MAX_EP) tips.push('<b style="color:#ffc94d">OVER-EXALT READY</b>');
  if (battle.epiphany) tips.push(`» EPIPHANY <b>${CHARACTERS[battle.epiphany].name.toUpperCase()}</b>`);
  if (battle.freeFirstLeft > 0) tips.push('◇ <b>FIRST CARD FREE</b>');
  if (battle.enemies.some((e) => e.ravaged)) tips.push('<b>RAVAGED</b> +30% DMG');
  tips.push('HOLD A CARD TO READ IT');
  $('battle-tips').innerHTML = tips.join('');

  if (battle.pendingEpiphany && !battle.result) showEpiphanyModal();
  else $('epiphany-modal').classList.add('hidden');

  if (battle.result) resolveBattleOutcome();
  else $('overlay').classList.add('hidden');
}

function showEpiphanyModal() {
  const p = battle.pendingEpiphany;
  if (!p) return;
  $('epi-title').textContent = `EPIPHANY · ${p.charName.toUpperCase()}`;
  const grid = $('epi-choices');
  grid.innerHTML = '';
  p.options.forEach((opt, idx) => {
    const btn = el('div', 'epi-choice');
    const { className, html } = cardHTML(opt.card, battle);
    btn.innerHTML = `
      <span class="epi-branch" style="color:${opt.color}">${opt.label}</span>
      <div class="${className}" style="--rot:0deg;--lift:0px">${html}</div>
      <span class="epi-desc">${opt.desc}</span>`;
    btn.addEventListener('click', () => {
      sfx('upgrade');
      chooseEpiphany(battle, idx);
      $('epiphany-modal').classList.add('hidden');
      renderBattle();
    });
    grid.appendChild(btn);
  });
  if ($('epiphany-modal').classList.contains('hidden')) sfx('epiphany');
  $('epiphany-modal').classList.remove('hidden');
}

function resolveBattleOutcome() {
  // renderBattle() calls this on every render after the result lands —
  // run the rewards/overlay exactly once per battle, never per render.
  if (battle._outcomeDone) return;
  battle._outcomeDone = true;
  const sum = battleSummary(battle);
  if (battleCtx && battleCtx.kind === 'sim') { endSimTest(false); return; }
  if (battleCtx && battleCtx.kind === 'run') {
    const run = progress.run;
    const node = battleCtx.node;
    const gained = recordBattle(run, sum, node, charStats(progress));
    if (battle.result === 'win') {
      sfx('win');
      showBark(run.team[0], 'win');
      if (node.type === 'boss') { finishChaosRun(true); return; }
      openReward(node, sum, gained);
    } else {
      sfx('loss');
      finishChaosRun(false);
    }
    return;
  }

  // Story mission outcome
  if (battle.result === 'win') {
    sfx('win');
    showBark(progress.team[0], 'win');
    const code = battle.mission.code;
    const first = !progress.cleared.includes(code);
    if (first) {
      progress.cleared.push(code);
      progress.cells += (mission && mission.reward) || 40;
    }
    const r = rankOf(sum);
    if (!progress.missionRanks[code] || RANK_ORDER[r] > RANK_ORDER[progress.missionRanks[code]]) {
      progress.missionRanks[code] = r;
    }
    addXp(progress, 35, progress.team);
    saveProgress(progress);
    const note = first ? `Rank ${r} · +${(mission && mission.reward) || 40} Cells · +35 XP` : `Rank ${r} · +35 XP`;
    showOverlay('MISSION CLEAR', `The line holds. (${note})`, 'CONTINUE', () => { renderMissions(); showView('missions'); }, true);
  } else {
    sfx('loss');
    showOverlay('TEAM COLLAPSED', 'Stress took them before the pathogen did. Regroup.', 'RETRY', () => beginBattle(battle.mission), false);
  }
}

/* --- big numbers & impact juice --- */
function pulseStage(cls, ms = 320) {
  const st = $('battle-stage');
  if (!st) return;
  st.classList.remove(cls);
  void st.offsetWidth;
  st.classList.add(cls);
  setTimeout(() => st.classList.remove(cls), ms);
}

function triggerFlash() {
  const f = $('impact-flash');
  if (!f) return;
  f.classList.remove('hidden');
  clearTimeout(f._t);
  f._t = setTimeout(() => f.classList.add('hidden'), 260);
}

function triggerBanner(text) {
  const b = $('slowmo-banner');
  if (!b) return;
  b.textContent = text;
  b.classList.remove('hidden');
  clearTimeout(b._t);
  b._t = setTimeout(() => b.classList.add('hidden'), 1100);
}

function sizeClass(amt, isBreak = false) {
  if (amt >= 100) return 'sz-mega';
  if (isBreak || amt >= 35) return 'sz-xl';
  if (amt >= 20) return 'sz-lg';
  if (amt >= 10) return 'sz-md';
  return 'sz-sm';
}

function flushFx() {
  const rail = $('dmg-rail');
  if (!rail) { battle.fx.length = 0; return; }
  const events = battle.fx.splice(0, battle.fx.length);
  let strongHit = false, megaAmt = 0, broke = false, phased = false, playerHurt = false, brokeDown = false;
  let celestial = false, didShield = false, didHeal = false, egoUsed = false, exaltUsed = false, critHit = false;

  events.slice(-9).forEach((ev) => {
    let main = '', label = '', cls = '';
    if (ev.kind === 'dmg') {
      main = `-${ev.amt}`; label = `${ev.name}${ev.crit ? ' CRIT!' : ''}`;
      cls = `${ev.weak ? 'weak' : 'dmg'}${ev.ravaged ? ' rav' : ''} ${sizeClass(ev.amt)}`;
      if (ev.amt >= 100) megaAmt = Math.max(megaAmt, ev.amt);
      if (ev.crit) critHit = true;
      if (ev.weak || ev.amt >= 16) strongHit = true;
    } else if (ev.kind === 'bleed') {
      main = `-${ev.amt}`; label = `${ev.name} BLEED`; cls = `dmg ${sizeClass(ev.amt)}`;
    } else if (ev.kind === 'toxin') {
      main = `-${ev.amt}`; label = `${ev.name} TOXIN`; cls = `heal ${sizeClass(ev.amt)}`;
    } else if (ev.kind === 'poison') {
      main = `-${ev.amt}`; label = `${ev.name} POISON · END TURN`; cls = `poison ${sizeClass(ev.amt)}`;
    } else if (ev.kind === 'counter') {
      main = `»${ev.amt}`; label = `${ev.name} COUNTER`; cls = `weak ${sizeClass(ev.amt)}`;
    } else if (ev.kind === 'chain') {
      main = 'CHAIN'; label = `${ev.name} +1 RES`; cls = 'shield sz-sm';
    } else if (ev.kind === 'break') {
      main = 'BREAK'; label = `${ev.name} RAVAGED`; cls = 'break sz-xl'; broke = true;
    } else if (ev.kind === 'hurt') {
      main = `-${ev.amt}`; label = ev.name; cls = `hurt ${sizeClass(ev.amt)}`; playerHurt = true;
    } else if (ev.kind === 'stress') {
      main = `+${Math.round(ev.amt)}`; label = `${ev.name} STRESS`; cls = 'stress sz-sm';
    } else if (ev.kind === 'breakdown') {
      main = 'BREAKDOWN'; label = ev.name; cls = 'stress sz-lg'; brokeDown = true;
    } else if (ev.kind === 'heal') {
      main = `+${ev.amt}`; label = `${ev.name} HEAL`; cls = `heal ${sizeClass(ev.amt)}`; didHeal = true;
    } else if (ev.kind === 'shield') {
      main = `+${ev.amt}`; label = `${ev.name} SHIELD`; cls = `shield ${sizeClass(ev.amt)}`; didShield = true;
    } else if (ev.kind === 'recover') {
      main = 'RECOVER'; label = ev.name; cls = 'heal sz-md'; didHeal = true;
    } else if (ev.kind === 'phase') {
      main = 'PHASE SHIFT'; label = ev.name; cls = 'break sz-xl'; phased = true;
    } else if (ev.kind === 'celestial') {
      main = 'CELESTIAL'; label = ev.name; cls = 'shield sz-md'; celestial = true;
    } else if (ev.kind === 'curse') {
      main = 'FEVER'; label = `${ev.name} +CURSE`; cls = 'stress sz-sm';
    } else if (ev.kind === 'ego') {
      main = 'EGO'; label = ev.name; cls = 'break sz-lg'; egoUsed = true;
    } else if (ev.kind === 'exalt') {
      main = 'EXALT 2×'; label = ev.name; cls = 'break sz-mega'; exaltUsed = true;
    }
    if (!main) return;
    const line = el('div', `fx-line ${cls}`, `<b>${main}</b><span>${label}</span>`);
    rail.appendChild(line);
    while (rail.children.length > 5) rail.removeChild(rail.firstChild);
    setTimeout(() => line.remove(), 1800);
  });

  // ——— Dynamic damage audio: tiered by the actual numbers dealt ———
  const dmgEvs = events.filter((e) => e.kind === 'dmg');
  const poisonEvs = events.filter((e) => e.kind === 'poison');
  if (dmgEvs.length) {
    sfxDamage({
      amt: dmgEvs.reduce((n, e) => n + (e.amt || 0), 0),
      weak: dmgEvs.some((e) => e.weak),
      crit: dmgEvs.some((e) => e.crit),
      killed: dmgEvs.some((e) => e.killed),
      hits: dmgEvs.length,
      owner: (dmgEvs[dmgEvs.length - 1] || {}).actor || null,
      stamp: dmgEvs.some((e) => e.pct),
    });
  } else if (events.some((e) => e.kind === 'blocked')) {
    sfxDamage({ blocked: true }); // shield held: dull donk, no sparkle
  }
  if (poisonEvs.length) sfx('poison-tick', { amt: poisonEvs.reduce((n, e) => n + (e.amt || 0), 0) });
  if (events.some((e) => e.kind === 'counter')) sfx('counter');
  if (brokeDown) duckMix(0.18, 0.55); // everything else goes quiet for the breakdown beat

  if (megaAmt >= 100 && settings.shake && settings.motion) {
    const st = $('battle-stage');
    if (st) { st.classList.remove('shake'); void st.offsetWidth; st.classList.add('shake'); setTimeout(() => st.classList.remove('shake'), 340); }
  }
  if (megaAmt >= 100) {
    // Sound already handled by sfxDamage's mega tier (inhale -> boom).
    pulseStage('zoom', 420);
    triggerFlash();
    triggerBanner(megaAmt >= 250 ? `OVERKILL · ${megaAmt} DMG!` : `MEGA STRIKE · ${megaAmt} DMG!`);
  } else if (exaltUsed) {
    sfx('exalt');
    pulseStage('zoom', 420);
    triggerFlash();
    triggerBanner('OVER-EXALT · 2× BURST!');
  } else if (broke) {
    sfx('break');
    pulseStage('zoom', 380);
    triggerFlash();
    triggerBanner('RAVAGED · +1 AP');
  } else if (phased) {
    sfx('phase');
    pulseStage('shake', 320);
    triggerFlash();
    triggerBanner('PATHOGEN PHASE SHIFT!');
  } else if (egoUsed) {
    sfx('ego');
    pulseStage('zoom', 360);
    triggerFlash();
  } else if (critHit) {
    if (!dmgEvs.length) sfx('crit'); // else sfxDamage already layered the crit crack
    pulseStage('shake', 280);
  } else if (strongHit) {
    if (!dmgEvs.length) sfx('weak');
    pulseStage('shake', 260);
  } else if (playerHurt) {
    sfx('hurt');
    pulseStage('shake', 260);
  } else if (celestial) {
    sfx('celestial');
  } else if (didShield) {
    sfx('shield');
  } else if (didHeal) {
    sfx('heal');
  }
  if (brokeDown) sfx('breakdown');
}

function showOverlay(title, sub, btn, fn, win) {
  const ov = $('overlay');
  ov.classList.remove('hidden');
  $('overlay-title').textContent = title;
  $('overlay-title').style.color = win ? '#46e08a' : '#ff3355';
  $('overlay-sub').textContent = sub;
  $('overlay-stats').innerHTML = `
    <div><b>${battle.turn}</b>TURNS</div>
    <div><b>${battle.cardsPlayed}</b>CARDS</div>
    <div><b>${battle.characters.reduce((n, c) => n + c.breakdownCount, 0)}</b>BREAKDOWNS</div>`;
  const btnEl = $('overlay-btn');
  btnEl.textContent = btn;
  // The overlay is a fixed body-level element, NOT part of any view —
  // showView() cannot hide it. Always dismiss it before running the
  // button's action, or the game navigates behind a stuck overlay.
  btnEl.onclick = () => { ov.classList.add('hidden'); if (fn) fn(); };
  $('overlay-retry').style.display = win ? 'none' : 'inline-block';
  $('overlay-retry').textContent = 'RETRY';
  $('overlay-retry').onclick = () => {
    if (battleCtx && battleCtx.kind === 'sim') beginSimBattle(battleCtx.charId);
    else if (battleCtx && battleCtx.kind === 'run') { /* runs restart from map */ renderMap(); showView('map'); }
    else beginBattle(battle.mission);
  };
}

/* --- top hud --- */
function renderTeam() {
  const hp = battle.characters.reduce((n, c) => n + Math.max(0, c.hp), 0);
  const max = battle.characters.reduce((n, c) => n + c.maxHp, 0);
  $('team-hp-fill').style.width = `${(hp / max) * 100}%`;
  $('team-hp-num').textContent = `${hp} / ${max}`;

  const box = $('team-portraits');
  box.innerHTML = '';
  battle.characters.forEach((c) => {
    const p = el('div', `portrait${c.hp <= 0 ? ' down' : ''}${c.broken ? ' broken' : ''}`);
    p.style.setProperty('--pc', CHARACTERS[c.id].skin);
    p.title = `${c.name} — ${c.hp}/${c.maxHp} HP · ${Math.round(c.stress)} Stress`;
    const need = RECOVERY_PLAYS[Math.min(Math.max(c.breakdownCount - 1, 0), RECOVERY_PLAYS.length - 1)];
    const tags = [
      c.fortitude > 0 ? `<span class="p-tag">FORT ${c.fortitude}</span>` : '',
      c.taunt > 0 ? '<span class="p-tag">TAUNT</span>' : '',
      c.barricade > 0 ? '<span class="p-tag">KEEP</span>' : '',
    ].join('');
    const statsPills = [
      c.str > 0 ? `<span class="p-stat str">STR +${c.str}</span>` : '',
      c.fury > 0 ? `<span class="p-stat fury">${c.fury}× FURY</span>` : '',
      c.counter > 0 ? `<span class="p-stat ctr">${c.counter}× CTR</span>` : '',
      c.critNext ? '<span class="p-stat crit">CRIT</span>' : '',
    ].join('');
    p.innerHTML = `
      <img src="${c.art}" alt="${c.name}" />
      ${tags ? `<div class="p-tags">${tags}</div>` : ''}
      ${statsPills ? `<div class="p-stats">${statsPills}</div>` : ''}
      ${c.shield > 0 ? `<span class="p-shield">◆${c.shield}</span>` : ''}
      <div class="p-stress"><i style="width:${Math.min(100, c.stress)}%"></i></div>
      <div class="p-hp"><i style="width:${(c.hp / c.maxHp) * 100}%"></i></div>
      ${c.broken ? `<div class="p-broken">BREAK<br>${c.recovery}/${need}</div>` : ''}`;
    box.appendChild(p);
  });

  const dots = $('team-stress');
  dots.innerHTML = '';
  battle.characters.forEach((c) => {
    const d = el('div', `sdot${c.stress > 66 ? ' high' : ''}`);
    d.title = `${c.name} Stress ${Math.round(c.stress)}/100`;
    d.innerHTML = `<i style="height:${Math.min(100, c.stress)}%"></i>`;
    dots.appendChild(d);
  });
}

/* --- enemy buffs / debuffs (icons under HP bar + long-press inspect) --- */
function enemyStatuses(e, battleState = battle) {
  const potency = battleState ? (battleState.passives.poisonPotency || 0) : 0;
  const buffs = [], debuffs = [];
  if (e.atkBuff > 0) buffs.push({ key: 'atkbuff', icon: 'i-buff', cls: 'buff', label: 'ATK UP', value: `+${e.atkBuff}`, title: 'Attack Up', desc: `This enemy's attacks deal +${e.atkBuff} more damage. Gained from its Buff intent. It does not expire on its own.` });
  if (e.charging) buffs.push({ key: 'charging', icon: 'i-bolt', cls: 'buff charge', label: 'CHARGING', value: `${e.charging.turns}T`, turns: e.charging.turns, title: `Charging — ${e.charging.value} damage`, desc: `In ${e.charging.turns} enemy action(s) it unleashes ${e.charging.value} damage on your weakest combatant. Kill it, Break its Tenacity, or Shield the target first.` });
  (e.mods || []).forEach((mKey) => { const m = MOD_INFO[mKey]; if (m) buffs.push({ key: `mod-${mKey}`, icon: 'i-star', cls: 'buff', label: m.label, value: '', title: m.label, desc: m.desc + ' (innate passive — cannot be removed).' }); });
  if (e.tenacity >= e.maxTenacity && e.maxTenacity > 0) buffs.push({ key: 'tenacityfull', icon: 'i-shield', cls: 'buff', label: 'TENACITY', value: `${e.tenacity}`, title: 'Tenacity (guard bar)', desc: `Amber guard bar at ${e.tenacity}/${e.maxTenacity}. Damaging cards reduce it (Weakness hits ×2.5); at 0 the enemy is Ravaged: +30% damage taken, +1 AP for you. 0-AP cards do not reduce Tenacity.` });
  if ((e.poison || 0) > 0) { const perStack = poisonPerStack(battleState); debuffs.push({ key: 'poison', icon: 'i-poison', cls: 'poison', label: 'POISON', value: `${e.poison}×`, title: `Poison ${e.poison}× — DoT`, desc: `Damage over Time that scales: at the end of YOUR turn it takes ${e.poison * perStack} damage (${e.poison} stacks x ${perStack} per stack${potency ? ` — includes +${potency} Potency` : ''}), then Poison falls by 1 stack. Yuna's Venom Sting also deals +1 damage per stack on this target. Stack it, Incubate (double) it, or Detonate it with Necrotic Feast.` }); }
  if (e.bleed > 0) debuffs.push({ key: 'bleed', icon: 'i-drop', cls: 'bleed', label: 'BLEED', value: `${e.bleed}×`, title: `Bleed ${e.bleed}×`, desc: `Whenever this enemy takes an Attack hit, it ruptures for ${e.bleed} damage, then loses 1 Bleed. Multi-hit attacks trigger it repeatedly.` });
  if (e.toxin > 0) debuffs.push({ key: 'toxin', icon: 'i-flask', cls: 'toxin', label: 'TOXIN', value: `${e.toxin}×`, title: `Toxin ${e.toxin}×`, desc: `Whenever this enemy ACTS (its counter hits 0), it takes ${e.toxin} damage and chews Tenacity, then Toxin decays by 25%. Different from Poison, which ticks at End Turn.` });
  if (e.mark > 0) debuffs.push({ key: 'mark', icon: 'i-target', cls: 'mark', label: 'MARK', value: `${e.mark}T`, turns: e.mark, title: `Mark — ${e.mark} action(s) left`, desc: 'Takes ×1.5 damage from all direct hits while Marked. Duration ticks down each time this enemy acts. Apply before your big finisher.' });
  if (e.vuln > 0) debuffs.push({ key: 'vuln', icon: 'i-debuff', cls: 'vuln', label: 'VULNERABLE', value: `${e.vuln}T`, turns: e.vuln, title: `Vulnerable — ${e.vuln} action(s) left`, desc: 'Takes ×1.35 damage from all direct hits. Stacks multiplicatively with Mark (×1.5), Weakness (×1.5) and Ravaged (×1.3).' });
  if (e.weaken > 0) debuffs.push({ key: 'weaken', icon: 'i-debuff', cls: 'weaken', label: 'WEAKEN', value: `${e.weaken}T`, turns: e.weaken, title: `Weaken — ${e.weaken} action(s) left`, desc: 'This enemy deals 35% less damage while Weakened.' });
  if (e.ravaged) debuffs.push({ key: 'ravaged', icon: 'i-bolt', cls: 'ravaged', label: 'RAVAGED', value: '×1.3', title: 'RAVAGED (Tenacity broken)', desc: 'Tenacity is broken: takes +30% damage from all direct hits until it recovers Tenacity. Breaking it granted your team +1 AP and -10 Stress.' });
  return { buffs, debuffs, potency };
}
function statusIconsHTML(e) {
  const { buffs, debuffs } = enemyStatuses(e);
  const all = [...buffs, ...debuffs];
  if (!all.length) return '<div class="enemy-status empty"><span>NO STATUS</span></div>';
  return `<div class="enemy-status">${all.map((s) => `<span class="status-icon ${s.cls}" data-status="${s.key}" title="${s.title}: ${s.desc}">${ico(s.icon)}<b>${s.label}</b>${s.value ? `<i>${s.value}</i>` : ''}${s.turns ? `<u class="pips">${'<u></u>'.repeat(Math.min(5, s.turns))}</u>` : ''}</span>`).join('')}</div>`;
}
function openEnemyDetail(uid) {
  if (!battle) return;
  const e = battle.enemies.find((x) => x.uid === uid);
  if (!e) return;
  const a = attr(e.weakness);
  const intent = intentOf(e);
  const { buffs, debuffs } = enemyStatuses(e);
  $('enemy-detail-art').src = ENEMY_ART[e.id] || 'images/pathogen-strep-cut.png';
  $('enemy-detail-head').textContent = e.name.toUpperCase();
  $('enemy-detail-sub').innerHTML = `${e.boss ? 'BOSS' : e.elite ? 'ELITE' : 'HOSTILE'} · WEAKNESS <b style="color:${a.color}">${a.glyph} ${a.name}</b> · acts in ${e.counter} card(s)`;
  $('enemy-detail-bars').innerHTML = `
    <div class="ed-row"><span>HP</span><div class="ed-bar hp"><i style="width:${(e.hp / e.maxHp) * 100}%"></i></div><b>${e.hp} / ${e.maxHp}</b></div>
    <div class="ed-row"><span>TENACITY</span><div class="ed-bar ten"><i style="width:${(e.tenacity / e.maxTenacity) * 100}%"></i></div><b>${e.tenacity} / ${e.maxTenacity}${e.ravaged ? ' · RAVAGED ×1.3' : ''}</b></div>
    <div class="ed-row"><span>NEXT</span><b>${intent.type.toUpperCase()}${intent.value ? ` ${intent.value}` : ''}${e.charging ? ` (charges in ${e.charging.turns})` : ''}</b><span>NEXT AFTER: ${e.intents[(e.intentIndex + 1) % e.intents.length].type.toUpperCase()}</span></div>`;
  const row = (s) => `<div class="status-row ${s.cls}">${ico(s.icon)}<div><b>${s.title}</b><p>${s.desc}</p></div></div>`;
  $('enemy-buffs').innerHTML = buffs.length ? buffs.map(row).join('') : '<p class="none">No buffs. What you see is what it is.</p>';
  $('enemy-debuffs').innerHTML = debuffs.length ? debuffs.map(row).join('') : '<p class="none">No debuffs yet. Apply Poison, Bleed, Toxin, Mark or Vulnerable.</p>';
  $('enemy-passives').innerHTML = `<p class="none">Action counter: acts after ${e.counter} more non-Haste card(s), then resets to ${e.maxCounter}. Weakness hits deal ×1.5 damage and ×2.5 Tenacity damage. Long-press any enemy any time to re-check this panel.</p>`;
  $('enemy-detail').classList.remove('hidden');
}
function closeEnemyDetail() { const n = $('enemy-detail'); if (n) n.classList.add('hidden'); }

/* --- enemies --- */
function renderEnemies() {
  const row = $('enemies');
  row.innerHTML = '';
  battle.enemies.forEach((e) => {
    const a = attr(e.weakness);
    const intent = intentOf(e);
    const isSel = battle.targetUid === e.uid && e.hp > 0;
    const solo = battle.enemies.filter((x) => x.hp > 0).length === 1 && e.hp > 0;
    const node = el('div', `enemy enemy-${e.id}${e.hp <= 0 ? ' dead' : ''}${isSel ? ' selected' : ''}${e.ravaged ? ' ravaged' : ''}${e.boss ? ' is-boss' : e.elite ? ' is-elite' : ''}${solo ? ' solo' : ''}`);
    e._dom = node;
    node.classList.toggle('idle', e.hp > 0 && e.counter > 0);
    if (!e._entered) { e._entered = true; node.classList.add('entered'); }

    const isAttack = intent.type === 'attack';
    const isCharge = intent.type === 'charge';
    const dmgShown = (isAttack || isCharge)
      ? Math.round((intent.value + e.atkBuff) * (e.weaken > 0 ? 0.65 : 1))
      : null;
    const intentIco = INTENT_ICON[intent.type];
    const badge = isCharge
      ? `<span class="badge dmg charge" title="Charged strike in ${intent.turns} turn(s)">${ico('i-bolt')}${dmgShown} · ${intent.turns}T</span>`
      : (isAttack
          ? `<span class="badge dmg" title="Incoming damage">${dmgShown}</span>`
          : `<span class="badge dmg support" title="Intent: ${intent.type}">${intentIco ? ico(intentIco) : '?'}</span>`);

    const modChips = [];
    if (e.boss) modChips.push('<span class="mod-chip boss">BOSS</span>');
    else if (e.elite) modChips.push('<span class="mod-chip">ELITE</span>');
    (e.mods || []).forEach((mKey) => {
      const m = MOD_INFO[mKey];
      if (m) modChips.push(`<span class="mod-chip" title="${m.desc}">${m.label}</span>`);
    });

    // damage prediction: white segment = selected card's preview damage on this enemy
    let predW = 0;
    if (isSel && battle.hand && battle.hand.length) {
      const best = battle.hand.reduce((m, c) => {
        if (!(c.dmg > 0)) return m;
        try { const p = previewCard(battle, c, e.uid); return Math.max(m, p.total || 0); } catch { return m; }
      }, 0);
      predW = Math.min(100, (best / e.maxHp) * 100);
    }
    node.dataset.uid = e.uid;
    node.innerHTML = `
      <div class="enemy-badges">
        <span class="badge weak" style="color:${a.color}" title="Weakness: ${a.name}">${a.glyph}</span>
        ${badge}
        ${isAttack ? '<span class="badge counter" title="hits">×1</span>' : ''}
        <span class="badge counter${e.counter <= 1 ? ' low' : ''}" title="action counter — hits in ${e.counter} card(s)">${e.counter}</span>
        ${e.ravaged ? '<span class="badge ravage">RAVAGED</span>' : ''}
      </div>
      ${modChips.length ? `<div class="enemy-mods">${modChips.join('')}</div>` : ''}
      <div class="enemy-art">
        <img src="${ENEMY_ART[e.id] || 'images/pathogen-strep-cut.png'}" alt="${e.name}" style="filter:${ENEMY_HUE[e.id] || 'none'}" />
      </div>
      <div class="enemy-plate">
        <div class="enemy-hp"><i style="width:${(e.hp / e.maxHp) * 100}%"></i>${predW ? `<em style="width:${predW}%"></em>` : ''}<span>${e.hp} / ${e.maxHp}</span></div>
        <div class="ten-bar${e.ravaged ? ' broken' : ''}"><i style="width:${(e.tenacity / e.maxTenacity) * 100}%"></i></div>
        ${statusIconsHTML(e)}
        <div class="enemy-name">${e.name}</div>
        <div class="enemy-hint">HOLD TO INSPECT STATUS</div>
      </div>`;

    let enemyPressTimer = null, enemyLongPressed = false, enemyDownX = 0, enemyDownY = 0;
    node.addEventListener('pointerdown', (ev) => {
      enemyDownX = ev.clientX; enemyDownY = ev.clientY;
      clearTimeout(enemyPressTimer);
      enemyPressTimer = setTimeout(() => {
        enemyLongPressed = true;
        node.classList.add('pressing');
        openEnemyDetail(e.uid);
      }, ev.pointerType === 'touch' ? 430 : 380);
    });
    node.addEventListener('pointermove', (ev) => {
      if (!enemyPressTimer) return;
      if (Math.hypot(ev.clientX - enemyDownX, ev.clientY - enemyDownY) > 12) clearTimeout(enemyPressTimer);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((evName) => node.addEventListener(evName, () => {
      clearTimeout(enemyPressTimer); enemyPressTimer = null; node.classList.remove('pressing');
    }));
    node.addEventListener('contextmenu', (ev) => { ev.preventDefault(); openEnemyDetail(e.uid); });
    node.addEventListener('click', () => {
      if (enemyLongPressed) { enemyLongPressed = false; return; }
      if (e.hp <= 0) return;
      sfx('click');
      battle.targetUid = e.uid;
      renderBattle();
      // Touch has no hover to explain what the tap did — say it out loud once.
      if (isPhoneLayout()) toastTarget(e.name);
    });
    row.appendChild(node);
  });
}

/* --- boss HP bar, objective tracker, action timeline, end-turn danger --- */
function renderTopBar() {
  const bar = $('boss-bar'); if (!bar || !battle) return;
  const alive = battle.enemies.filter((e) => e.hp > 0);
  const pri = alive.find((e) => e.boss) || alive.find((e) => e.elite) || alive.find((e) => e.uid === battle.targetUid) || alive[0];
  const showBoss = !!(pri && (pri.boss || pri.elite || (battleCtx && battleCtx.kind === 'sim')));
  bar.classList.toggle('hidden', !showBoss);
  if (showBoss) {
    $('boss-bar-name').textContent = `${pri.boss ? 'BOSS · ' : pri.elite ? 'ELITE · ' : ''}${pri.name.toUpperCase()}`;
    $('boss-bar-hp').textContent = `${pri.hp.toLocaleString()} / ${pri.maxHp.toLocaleString()} · ${Math.max(0, Math.ceil((pri.hp / pri.maxHp) * 100))}%`;
    $('boss-bar-fill').style.width = `${(pri.hp / pri.maxHp) * 100}%`;
    $('boss-bar-tenfill').style.width = `${pri.maxTenacity ? (pri.tenacity / pri.maxTenacity) * 100 : 0}%`;
    $('boss-bar-status').innerHTML = statusIconsHTML(pri);
    if (pri.hpStat) {
      const stats = [];
      if (pri.atkBuff > 0) stats.push(`atkBuff ${pri.atkBuff}`);
      if (pri.hpStat > 0) stats.push(`hpStat ${pri.hpStat}`);
      if (pri.weaken > 0) stats.push(`weaken ${pri.weaken}`);
      if (pri.mark > 0) stats.push(`mark ${pri.mark}`);
      const statChip = el('span', 'stat-detail', `<i class="ico">🟡</i>${stats.join(' · ')}`);
      $('boss-bar-status').prepend(statChip);
    }
  }
  const obj = $('objective-bar');
  if (obj) {
    if (battleCtx && battleCtx.kind === 'sim' && simTracker) {
      const trials = simTrialsFor(battleCtx.charId);
      const done = trials.filter((x) => x.check(battle, simTracker)).length;
      const next = trials.find((x) => !x.check(battle, simTracker));
      obj.innerHTML = `OBJECTIVE — TRIALS <b>${done}/${trials.length}</b>${next ? ` · NEXT: ${next.label}` : ' · ALL TRIALS CLEAR!'}`;
    } else if (battleCtx && battleCtx.kind === 'run') {
      obj.innerHTML = `OBJECTIVE — CLEAR THIS NODE · <b>${alive.length} HOSTILE${alive.length === 1 ? '' : 'S'} LEFT</b> · TURN ${battle.turn}`;
    } else {
      obj.innerHTML = `OBJECTIVE — DEFEAT ALL HOSTILES · <b>${alive.length} LEFT</b> · TURN ${battle.turn}`;
    }
  }
  const tl = $('action-timeline');
  if (tl) {
    tl.innerHTML = alive.slice().sort((a, b) => a.counter - b.counter).map((e) => {
      const it = intentOf(e);
      const lbl = it.type === 'attack' || it.type === 'charge' ? `${it.value || ''} DMG` : it.type.toUpperCase();
      return `<div class="tl-chip${e.counter <= 1 ? ' soon' : ''}${e.uid === battle.targetUid ? ' sel' : ''}"><b>${e.name.split(' ')[0].toUpperCase()}</b><span>${lbl}</span><i>${e.counter <= 0 ? 'ACTS NOW' : `IN ${e.counter}`}</i></div>`;
    }).join('');
  }
  const et = $('end-turn');
  if (et) {
    const weakest = Math.min(...battle.characters.filter((c) => c.hp > 0).map((c) => c.hp + c.shield), Infinity);
    const danger = !battle.result && alive.some((e) => {
      if (e.counter > 1) return false;
      const it = intentOf(e);
      if (it.type !== 'attack' && it.type !== 'charge') return false;
      const dmg = Math.round(((it.value || 0) + (e.atkBuff || 0)) * (e.weaken > 0 ? 0.65 : 1));
      return weakest !== Infinity && dmg >= weakest * 0.5;
    });
    et.classList.toggle('danger', danger);
    et.title = danger ? 'DANGER — an enemy acts next and can badly hurt your weakest combatant. Shield, Break or finish it first!' : 'End turn';
  }
}

/* --- card markup --- */
function makeStaticCard(id, upgraded = false) {
  const def = CARDS[id];
  const up = upgraded && def.up ? def.up : null;
  const merged = up ? { ...def, ...up } : { ...def };
  if (up) merged.name = `${def.name}+`;
  return { ...merged, id, defId: id, upgraded: !!up };
}

function previewOf(card, battleState) {
  if (battleState) return previewCard(battleState, card, battleState.targetUid);
  return {
    dmg: card.dmg || 0, per: card.dmg || 0, hits: card.hits || 1,
    total: (card.dmg || 0) * (card.hits || 1),
    weak: false, ravaged: false, mark: 0, lethal: false,
    shield: card.shield || 0, teamShield: card.teamShield || 0,
    heal: card.heal || 0, teamHeal: card.teamHeal || 0,
    stressHeal: card.stressHeal || 0, teamStressHeal: card.teamStressHeal || 0,
    ap: card.apGain || card.maxAp || 0, draw: card.draw || 0, targets: 1,
    poison: card.poison || 0, poisonAll: card.poisonAll || 0, poisonNextTick: ((card.poison || 0) + (card.poisonAll || 0)) * POISON_PER_STACK, poisonStacks: 0,
  };
}

function fxBadge(card, p, battleState) {
  if (card.type === 'curse' || card.unplayable) return `<div class="card-fx bad"><b>×</b><span>UNPLAYABLE</span></div>`;
  if (card.breakdown && battleState) {
    const ch = battleState.characters.find((c) => c.id === card.owner);
    const need = ch ? RECOVERY_PLAYS[Math.min(Math.max(ch.breakdownCount - 1, 0), RECOVERY_PLAYS.length - 1)] : 5;
    return `<div class="card-fx status"><b>${ch ? ch.recovery : 0}/${need}</b><span>RECOVERY</span></div>`;
  }
  if (p.total > 0) {
    const cls = p.crit ? 'crit' : (p.weak ? 'weak' : 'dmg');
    const tags = [
      p.hits > 1 ? `×${p.hits}` : '',
      p.weak ? 'WEAK' : '',
      p.crit ? 'CRIT!' : '',
      p.burst ? 'BURST' : '',
      p.pctBonus ? '+%HP' : '',
      p.poison ? `+${p.poison} POISON` : '',
    ].filter(Boolean).join(' · ');
    return `<div class="card-fx ${cls}${p.burst ? ' burst' : ''}${p.lethal ? ' lethal' : ''}">
      <b>${p.total}</b><span>DMG${tags ? ' · ' + tags : ''}</span>
      ${p.lethal ? '<i>LETHAL</i>' : ''}</div>`;
  }
  if (p.poisonAll) return `<div class="card-fx poison"><b>+${p.poisonAll}</b><span>POISON · ALL ENEMIES</span></div>`;
  if (p.poison) return `<div class="card-fx poison"><b>+${p.poison}</b><span>POISON · TICKS ${p.poisonNextTick || p.poison} AT END TURN</span></div>`;
  if (card.doublePoison) return `<div class="card-fx poison"><b>×2</b><span>DOUBLE POISON</span></div>`;
  if (card.detonatePoison) return `<div class="card-fx poison"><b>BOOM</b><span>DETONATE POISON NOW</span></div>`;
  if (card.triggerPoisonTick) return `<div class="card-fx poison"><b>+${card.poison || 0}</b><span>POISON + TICK NOW</span></div>`;
  if (p.teamShield) return `<div class="card-fx shield"><b>+${p.teamShield}</b><span>SHIELD ALL</span></div>`;
  if (p.shield) return `<div class="card-fx shield"><b>+${p.shield}</b><span>SHIELD</span></div>`;
  if (p.teamHeal) return `<div class="card-fx heal"><b>+${p.teamHeal}</b><span>HEAL ALL</span></div>`;
  if (p.heal) return `<div class="card-fx heal"><b>+${p.heal}</b><span>HEAL</span></div>`;
  if (p.ap) return `<div class="card-fx ap"><b>+${p.ap}</b><span>AP</span></div>`;
  if (p.draw) return `<div class="card-fx ap"><b>+${p.draw}</b><span>DRAW</span></div>`;
  if (p.teamStressHeal) return `<div class="card-fx heal"><b>-${p.teamStressHeal}</b><span>STRESS</span></div>`;
  if (card.weakenAll) return `<div class="card-fx ap"><b>-35%</b><span>ENEMY DMG</span></div>`;
  if (card.type === 'upgrade') return `<div class="card-fx ap"><b>∞</b><span>THIS FIGHT</span></div>`;
  if (card.taunt) return `<div class="card-fx shield"><b>TAUNT</b><span>1 TURN</span></div>`;
  return '';
}

function cardArtHTML(card, owner) {
  const artKey = CARD_ART[card.defId || card.id];
  if (artKey) return `<div class="card-art" style="background-image:url(${artKey})"></div>`;
  return `<img class="card-artimg" src="${owner ? owner.art : ''}" alt="" />`;
}

/* Game-feel: drag a card across the hand to play it, then drop. */
function dragMoveNode(ev, node, i) {
  if (!node) return;
  const rect = node.getBoundingClientRect();
  const inside = ev && document.elementFromPoint && document.elementFromPoint(ev.clientX, ev.clientY);
  const overEnemy = inside && inside.closest('.enemy');
  node.classList.toggle('dragging', !!overEnemy);
  node.classList.toggle('drag-fast', !!overEnemy);
  if (ev && overEnemy) {
    node.style.transform = `translate(${ev.clientX - rect.left - rect.width / 2}px, ${ev.clientY - rect.top - rect.height / 2}px)`;
  }
  // ALT GESTURE — Attack Draw: Alt + hover enemy during drag
  node._altDraw = !!(ev && overEnemy && ev.altKey);
  node.classList.toggle('drag-draw', node._altDraw);
}

function cardHTML(card, battleState = battle) {
  const freeFirst = battleState && battleState.freeFirstLeft > 0 && card.cost > 0;
  const cost = (card.zeroCost || freeFirst) ? 0 : card.cost;
  const owner = CHARACTERS[card.owner];
  const a = attr(card.attr);
  const p = previewOf(card, battleState);
  const playable = battleState ? (canPlay(battleState, card) && !battleState.result) : true;
  // Status-heavy enemies (their own upgrades matter) read bigger than raw damage.
  if (STATUS_SENSITIVE.has(card.type) && battleState && !battleState.result && p.dmg > 0 && p.total > 0) {
    const scale = statusEnemyHealthScale(battleState);
    p.dmg = Math.round(p.dmg * scale);
    p.total = Math.round(p.total * scale);
  }
  return {
    className: `card ${card.type}${playable ? '' : ' unaffordable'}${card.glint ? ' glint' : ''}${card.upgraded ? ' upgraded' : ''}${card.rare ? ' rare' : ''}${card.token ? ' token' : ''}${p.burst ? ' burst-ready' : ''}${cost === 0 ? ' card-free' : ''}`,
    html: `
      ${cardArtHTML(card, owner)}
      <div class="card-frame"></div>
      <div class="card-corner"></div>
      <div class="card-topline">
        <div class="card-cost" style="${cost === 0 ? '' : `border-color:${a.color}`}">${cost}</div>
        <span class="card-type-pill">${card.type}${card.rare ? ' · RARE' : ''}</span>
        ${card.glint ? '<span class="card-glint">✦</span>' : ''}
      </div>
      ${fxBadge(card, p, battleState)}
      <div class="card-info">
        <div class="card-name">${KIND_ICON[card.type] ? ico(KIND_ICON[card.type]) : ''} ${card.name}</div>
        <div class="card-kind" style="color:${a.color}">${a.glyph} ${a.name} · ${card.type}${card.glint ? ' · epiphany' : ''}${card.upgraded ? ' · +' : ''}</div>
        <div class="card-text">${card.text || ''}</div>
        <div class="card-tags">${(card.tags || []).map((t) => `<span class="tag">${t}</span>`).join('')}</div>
      </div>
      <div class="card-acc"></div>`,
  };
}

const badgeAmtCache = new Map(); // card uid -> last previewed total (for badge chirps)

function renderHand() {
  const hand = $('hand');
  badgeHeartbeatStop(); // hand is being rebuilt; never leave a heartbeat running
  hand.innerHTML = '';
  const n = Math.max(1, battle.hand.length);
  const avail = hand.clientWidth || window.innerWidth * 0.72;
  // Phone layout drives the card height from the height left under the stage;
  // desktop keeps the fixed 148x200 card. Both are read from the same vars so
  // the two paths can never drift apart.
  const compact = isPhoneLayout();
  // A phone hand is a bottom strip: the card height comes from the space the
  // stage leaves over, and the width follows the 0.74 art ratio. Whatever the
  // height allows, the cards must still fit side by side.
  const hCap = compact ? Math.max(88, Math.min(156, Math.round(window.innerHeight * 0.34))) : 200;
  // The real footprint of n cards is w*n - overlap*(n-1) — negative margins pull
  // neighbours together. A phone hand must fit BOTH budgets: the strip width and
  // the height left under the stage. Whichever is tighter wins, and the result
  // is never allowed to overflow (a 320px-wide window still fits seven cards).
  const overlapRatio = compact ? 0.26 : 0.42;
  // Derive the width from an *integer* gap so rounding can never push the row
  // 1-2px past the strip on an edge-of-range viewport.
  const wFromWidth = (() => {
    // Model the CSS exactly: margin = -floor(overlap/2) per side, so the gap
    // between neighbours is 2*floor(overlap/2) — never more than the
    // theoretical overlap. Decrement until the real footprint fits.
    let cand = Math.max(24, Math.floor(avail / (n - overlapRatio * (n - 1))));
    for (let i = 0; i < 80 && cand > 24; i++) {
      const gap = 2 * Math.floor((cand * overlapRatio) / 2);
      if (cand * n - gap * (n - 1) <= avail) return cand;
      cand -= 1;
    }
    return Math.max(24, cand);
  })();
  const wFromHeight = compact ? Math.round(hCap * 0.74) : 158;
  // The floor only guards against a degenerate 0-width hand during boot; it is
  // deliberately low so a 320px-wide window still fits a full hand.
  let w = compact
    ? Math.max(40, Math.min(wFromHeight, wFromWidth))
    : Math.max(104, Math.min(158, wFromWidth));
  const h = compact ? Math.round(w / 0.74) : 200;
  const overlap = Math.round(w * overlapRatio);
  hand.style.setProperty('--card-w', `${w}px`);
  hand.style.setProperty('--card-m', `${-Math.floor(overlap / 2)}px`);
  hand.style.setProperty('--card-h', `${h}px`);
  const endTurnLabel = battle.drawStarted
    ? 'Draw started — ends on next turn'
    : (battle.cardsPlayedThisTurn > 0 ? `Draw: +${DRAW_NEXT} on End Turn` : 'End Turn');
  const endTurn = $('end-turn');
  if (endTurn) {
    endTurn.textContent = endTurnLabel;
    endTurn.classList.toggle('draw-started', !!battle.drawStarted);
    endTurn.style.fontSize = (endTurn.textContent.length > 22 ? 9 : 11) + 'px';
    endTurn.title = 'Press End Turn to end your turn';
  }

  const mid = (battle.hand.length - 1) / 2;
  let priorityIdx = -1;
  let priorityAtk = 0;
  battle.hand.forEach((c, i) => {
    if (!STATUS_SENSITIVE.has(c.type) || !c.dmg) return;
    const p = previewOf(c, battle);
    if (p.total > 0 && p.total > priorityAtk) { priorityIdx = i; priorityAtk = p.total; }
  });
  battle.hand.forEach((card, i) => {
    const { className, html } = cardHTML(card, battle);
    const node = el('div', className, html);
    if (i === priorityIdx) node.dataset.priority = 'weak';
    // Native tooltip: attack preview + status note (hovering an attack card while an enemy is selected)
    const ai = attr(card.attr);
    const tt = [`${card.name} — ${ai.glyph} ${ai.name} · ${card.type}`];
    const pp = previewOf(card, battle);
    if (pp.total > 0 && pp.targets > 0) tt.push(`→ ${pp.total} dmg on ${pp.targets} target(s)`);
    if (STATUS_SENSITIVE.has(card.type) && pp.total > 0) tt.push('⚖ Takes longer to land on status-heavy enemies');
    node.title = tt.join(' · ');
    const rot = battle.hand.length > 1 ? (i - mid) * 1.8 : 0;
    node.style.setProperty('--rot', `${rot.toFixed(2)}deg`);
    node.style.setProperty('--lift', `${(Math.abs(i - mid) * 2.5).toFixed(1)}px`);
    node.classList.toggle('hoverable', canPlay(battle, card));
    if (card.source === 'draw' || card.draw) node.querySelector('.card-tags')?.prepend(el('span', 'tag', '↓ drawn'));

    let startX = 0, startY = 0, upHandled = false;
    let dragStartX = 0, dragStartY = 0;
    const playIfPlaced = () => { if (!upHandled && node._placed && Math.abs(node._offX) > 4) { upHandled = true; playFromUI(i); } };
    node._placed = false;
    node.addEventListener('pointerdown', (ev) => {
      startX = ev.clientX; startY = ev.clientY; upHandled = false;
      // A touch pointer is one-shot: if we ignore its follow-up click the card
      // can only be played by dragging, which is not discoverable with a thumb.
      node._touch = ev.pointerType === 'touch';
      dragStartX = ev.clientX; dragStartY = ev.clientY;
      clearTimeout(pressTimer);
      pressTimer = setTimeout(() => {
        longPressed = true;
        openDetail(i);
      }, node._touch ? 430 : 320);
    });
    node.addEventListener('pointermove', (ev) => {
      // A drag lifts the card by its CENTRE under the finger. Freshly drawn
      // cards start near the bottom edge, so they must first travel far enough
      // to clear the thumb; until then the press can still become a long-press.
      if (!node._dragging) {
        if (Math.hypot(ev.clientX - dragStartX, ev.clientY - dragStartY) < 18) return;
        clearTimeout(pressTimer);
        node._dragging = true;
      }
      if (canPlay(battle, card)) {
        node._placed = true;
        node._offX = ev.clientX - startX;
      }
      dragMoveNode(ev, node, i);
    });
    node.addEventListener('pointerup', (ev) => {
      clearTimeout(pressTimer);
      hideTargetLine();
      const wasTouch = node._touch;
      const dragged = !!node._dragging;
      node._dragging = false;
      // Alt+Gesture — Attack Draw: the card stays out, card enters your hand, Draw+1 starts.
      if (node._altDraw) {
        node._altDraw = false;
        node.classList.remove('drag-draw');
        const drew = startDraw(battle, 1);
        renderHand();
        void drew;
        return;
      }
      if (dragged) playIfPlaced();                  // dropped on/over an enemy
      if (!upHandled && !dragged) {
        // Tap (or short drag) = play. On touch this is the primary gesture:
        // no synthetic click ever follows a consumed pointerup.
        upHandled = true;
        node._swallowClick = true;                  // the click below must not re-play
        playFromUI(i);
      }
      if (wasTouch) node._swallowClick = true;      // swallow the ghost click
      upHandled = false;
    });
    node.addEventListener('pointerleave', () => { clearTimeout(pressTimer); hideTargetLine(); node._dragging = false; });
    node.addEventListener('pointercancel', () => { clearTimeout(pressTimer); hideTargetLine(); node._dragging = false; });
    node.addEventListener('mouseenter', () => {
      if (node.classList.contains('hoverable')) node.classList.add('hovering');
      // Side-badge audio: charge whine pitched by the previewed number,
      // LETHAL heartbeat, BURST sparkle, and up/down chirps when buffs
      // change this card's number between hovers.
      if (pp.total > 0 || pp.shield > 0 || pp.heal > 0) {
        const key = card.uid || card.id;
        const prev = badgeAmtCache.get(key);
        if (prev != null && pp.total !== prev) sfx(pp.total > prev ? 'chirp-up' : 'chirp-down');
        badgeAmtCache.set(key, pp.total);
        sfxBadgeHover({ amt: pp.total, lethal: !!pp.lethal, burst: !!pp.burst });
      }
      if (card.dmg > 0 && !card.aoe) {
        const target = document.querySelector(`.enemy[data-uid="${battle.targetUid}"]`);
        if (target) showTargetLine(node, target);
      }
    });
    node.addEventListener('mouseleave', () => { node.classList.remove('hovering'); hideTargetLine(); badgeHeartbeatStop(); });
    node.addEventListener('contextmenu', (ev) => { ev.preventDefault(); openDetail(i); });
    node.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (longPressed) { longPressed = false; return; }
      // The pointerup above already played the card — never play it twice.
      if (node._swallowClick) { node._swallowClick = false; if (node._touch) node._touch = false; return; }
      if (node._touch) { node._touch = false; return; }
      playFromUI(i, ev);
    });
    hand.appendChild(node);
  });
}

/* --- card detail (long press & static inspection) --- */
function openDetail(index) {
  const card = battle && battle.hand[index];
  if (!card) return;
  showDetailFor(card, battle);
}

function openStaticDetail(card) {
  showDetailFor(card, null);
}

function showDetailFor(card, battleState) {
  const owner = CHARACTERS[card.owner];
  const a = attr(card.attr);
  const p = previewOf(card, battleState);
  const { className, html } = cardHTML(card, battleState);
  $('detail-card').innerHTML = `<div class="${className}" style="--rot:0deg;--lift:0px">${html}</div>`;
  $('detail-head').textContent = card.name.toUpperCase();
  $('detail-sub').innerHTML = `${owner ? owner.name.toUpperCase() + ' · ' : ''}${card.type.toUpperCase()} · ${a.glyph} ${a.name.toUpperCase()} · ${card.zeroCost ? 0 : card.cost} AP`;
  $('detail-text').textContent = card.text || '';
  const def = CARDS[card.defId || card.id];
  $('detail-up').innerHTML = (!card.upgraded && def && def.up)
    ? `<b>UPGRADE (+):</b> ${def.up.text || 'Enhanced stats'}`
    : '';
  $('detail-tags').innerHTML = (card.tags || []).map((t) => `<span class="tag">${t}</span>`).join('');

  const rows = [];
  if (p.total > 0) {
    const parts = [`${card.dmg || 0} base`];
    const actor = battleState && battleState.characters.find((c) => c.id === card.owner);
    if (actor && actor.str) parts.push(`+${actor.str} Strength`);
    if (actor && actor.buffAtk) parts.push(`+${actor.buffAtk} turn ATK`);
    if (card.shieldDmgPct && battleState) {
      const ts = battleState.characters.reduce((n, c) => n + (c.hp > 0 ? c.shield : 0), 0);
      parts.push(`+${Math.round(ts * card.shieldDmgPct)} Shield-Slam`);
    }
    if (card.consumeFury && actor && actor.fury) parts.push(`+${actor.fury * card.consumeFury} Fury`);
    if (card.scaleFury && actor && actor.fury) parts.push(`+${actor.fury * card.scaleFury} Fury`);
    if (card.scaleResonance && battleState) parts.push(`+${battleState.resonance * card.scaleResonance} Res`);
    if (card.scaleExhaust && battleState) parts.push(`+${battleState.exhaust.length * card.scaleExhaust} Exhaust`);
    if (p.combo) parts.push(`+${p.combo} combo`);
    if (p.finale) parts.push(`+${p.finale} finale`);
    if (p.isChain) parts.push('Chain');
    if (p.weak) parts.push('×1.5+ weak');
    if (p.ravaged) parts.push('×1.3 ravaged');
    if (p.mark) parts.push('×1.5 marked');
    if (p.vuln) parts.push('×1.35 vuln');
    if (p.burst) parts.push('×1.6 BURST');
    if (p.crit) parts.push('×1.75 CRIT');
    if (p.hits > 1) parts.push(`×${p.hits} hits`);
    if (p.targets > 1) parts.push(`×${p.targets} enemies`);
    rows.push(`<div class="math-row dmg"><b>${p.total}</b><span>DAMAGE</span><i>${parts.join(' ')}</i></div>`);
  }
  if (card.dmgPerPoison) rows.push(`<div class="math-row poison"><b>+${card.dmgPerPoison}/stack</b><span>POISON SCALING</span><i>+${p.poisonBonus || 0} damage from the target's current Poison — grows as you stack</i></div>`);
  if (card.pctMaxHp || card.pctCurrentHp || card.pctMissingHp) {
    const pctParts = [
      card.pctMaxHp ? `${Math.round(card.pctMaxHp * 100)}% of Max HP` : '',
      card.pctCurrentHp ? `${Math.round(card.pctCurrentHp * 100)}% of Current HP` : '',
      card.pctMissingHp ? `${Math.round(card.pctMissingHp * 100)}% of Missing HP` : '',
    ].filter(Boolean).join(' + ');
    rows.push(`<div class="math-row dmg"><b>+${p.pctBonus || 0}</b><span>PERCENT SCALING</span><i>${pctParts} — +${p.pctBonus || 0} damage against this target right now. Bigger HP pool, bigger bonus.</i></div>`);
  }
  if (card.shieldPctMax) rows.push(`<div class="math-row shield"><b>${Math.round(card.shieldPctMax * 100)}%</b><span>SHIELD % MAX HP</span><i>Shield scales with Sable's Max HP, not a flat number</i></div>`);
  if (card.healPctMissing) rows.push(`<div class="math-row heal"><b>${Math.round(card.healPctMissing * 100)}%</b><span>HEAL % MISSING HP</span><i>Heals more the closer Sable is to death</i></div>`);
  if (p.poison || p.poisonAll) rows.push(`<div class="math-row poison"><b>+${p.poisonAll || p.poison}</b><span>POISON${p.poisonAll ? ' / ALL' : ''}</span><i>ticks ${p.poisonNextTick || p.poison || p.poisonAll} at End Turn (${p.poisonPerStack || POISON_PER_STACK} per stack), then -1 stack</i></div>`);
  if (card.doublePoison) rows.push(`<div class="math-row poison"><b>×2</b><span>DOUBLE POISON</span><i>doubles current stacks on target</i></div>`);
  if (card.detonatePoison) rows.push(`<div class="math-row poison"><b>DETONATE</b><span>POISON NOW</span><i>consume all stacks as immediate damage + team heal per stack</i></div>`);
  if (p.shield) rows.push(`<div class="math-row shield"><b>+${p.shield}</b><span>SHIELD</span><i>absorbs damage, blocks stress</i></div>`);
  if (p.teamShield) rows.push(`<div class="math-row shield"><b>+${p.teamShield}</b><span>SHIELD / ALLY</span><i>whole team</i></div>`);
  if (p.heal) rows.push(`<div class="math-row heal"><b>+${p.heal}</b><span>HEAL</span><i>capped at max HP</i></div>`);
  if (p.teamHeal) rows.push(`<div class="math-row heal"><b>+${p.teamHeal}</b><span>HEAL / TEAM</span><i>total across the team</i></div>`);
  if (p.teamStressHeal) rows.push(`<div class="math-row stress"><b>-${p.teamStressHeal}</b><span>STRESS</span><i>clears mental stress</i></div>`);
  if (p.stressHeal) rows.push(`<div class="math-row stress"><b>-${p.stressHeal}</b><span>STRESS</span><i>self</i></div>`);
  if (p.ap) rows.push(`<div class="math-row ap"><b>+${p.ap}</b><span>AP</span></div>`);
  if (p.draw) rows.push(`<div class="math-row ap"><b>+${p.draw}</b><span>CARDS</span></div>`);
  if (card.selfStress) rows.push(`<div class="math-row stress"><b>+${card.selfStress}</b><span>STRESS</span><i>cost of using it</i></div>`);
  if (!rows.length) rows.push('<div class="math-row"><b>—</b><span>NO DIRECT EFFECT</span></div>');
  $('detail-math').innerHTML = rows.join('');

  $('detail').classList.remove('hidden');
}

function closeDetail() {
  $('detail').classList.add('hidden');
  longPressed = false;
}

/* --- play --- */
function playFromUI(index, ev) {
  if (cutBusy || !battle || battle.result) return;
  const card = battle.hand[index];
  if (!card || !canPlay(battle, card)) return;
  const cardNode = ev && ev.target ? ev.target.closest('.card') : null;
  const rect = cardNode ? cardNode.getBoundingClientRect() : null;
  // Major-card stingers: rares riser-boom, finishers get signatures, glint sings.
  if (card.glint) sfxMajor('epiphany', { owner: card.owner, cardId: card.defId || card.id });
  else if (card.rare) sfxMajor('rare', { owner: card.owner, cardId: card.defId || card.id });
  else if (card.cost >= 3 || card.finale || (card.tags || []).includes('Finale')) sfxMajor('finisher', { owner: card.owner, cardId: card.defId || card.id });
  const res = playCard(battle, index, card.dmg > 0 && !card.aoe ? battle.targetUid : undefined);
  if (!res.ok) return;
  if (card.owner) showBark(card.owner, 'attack');
  else if (card.type === 'attack') sfx('slash');
  renderBattle();
  if (cardNode && rect) launchPlayArc(cardNode, rect, card);
  apFlash(battle.ap);
  touchFlash();
  // No character cut-in on card plays (removed by request) — the play arc,
  // barks, damage numbers and SFX carry the moment. Ego cut-ins remain.
}

/* Game-feel: the played card arcs off the hand onto its target. */
function launchPlayArc(cardNode, rect, card) {
  const stage = $('battle-stage');
  const target = battle && battle.enemies.find((e) => e.hp > 0);
  if (!stage || !target || !target._dom) return;
  const arc = cardNode.cloneNode(true);
  arc.className = `${arc.className || ''} arc-card`;
  arc.style.position = 'absolute';
  arc.style.margin = '0';
  arc.style.left = `${rect.left}px`;
  arc.style.top = `${rect.top}px`;
  arc.style.width = `${rect.width}px`;
  arc.style.height = `${rect.height}px`;
  stage.appendChild(arc);
  const t = target._dom.getBoundingClientRect();
  const endX = t.left + t.width / 2 - rect.width / 2;
  const endY = t.top + t.height * 0.35 - rect.height / 2;
  arc.style.transitionProperty = 'transform';
  arc.style.transitionDuration = '650ms';
  arc.style.transitionTimingFunction = 'cubic-bezier(0.16,0.9,0.3,1)';
  raf(() => {
    arc.style.transform = `translate(${endX - rect.left}px, ${endY - rect.top}px)`;
  });
  setTimeout(() => arc.remove(), 850);
}

/* ============================================================ AUTOPLAY
   Stacking AI: rounds 1-2 it BUILDS (engines, Poison/Bleed/Toxin/Mark,
   Fury, Resonance, free tokens), then round 3+ it CASHES OUT (Burst
   finishers, Fury spenders, detonates, Ego/Exalt) for mega damage.
   Also auto: target, Ego, End Turn, Epiphany, reward draft, next fight. */
let autoplay = (() => { try { return window.localStorage.getItem('cw_autoplay') === '1'; } catch { return false; } })();
let autoTimer = null;
let lastAutoPlan = '';
function setAutoPlan(txt) {
  lastAutoPlan = txt;
  const pill = $('auto-plan');
  if (pill) { pill.textContent = txt; pill.classList.toggle('hidden', !autoplay); }
  const btn = $('btn-autoplay');
  if (btn) { btn.classList.toggle('on', autoplay); btn.textContent = autoplay ? 'AUTO ▶' : 'AUTO'; }
}
function setAutoplay(on) {
  autoplay = !!on;
  try { window.localStorage.setItem('cw_autoplay', autoplay ? '1' : '0'); } catch { /* ignore */ }
  setAutoPlan(autoplay ? 'AUTO · THINKING…' : '');
  if (autoplay) autoLoop(); else if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
}
function autoLoop() {
  if (!autoplay) return;
  if (autoTimer) clearTimeout(autoTimer);
  autoTimer = setTimeout(() => {
    autoTimer = null;
    try { autoTick(); } catch { /* never let autoplay kill the game */ }
    if (autoplay) autoLoop();
  }, 620);
}
function autoTick() {
  if (!autoplay) return;
  // Epiphany choice modal: pick the most stacking/payoff branch
  if (battle && battle.pendingEpiphany && !$('epiphany-modal').classList.contains('hidden')) { autoStepOnce(); return; }
  // Result overlay: sim loops the test, everything else continues onward
  if (battle && battle.result && !$('overlay').classList.contains('hidden')) {
    if (battleCtx && battleCtx.kind === 'sim') { const r = $('overlay-retry'); if (r && r.style.display !== 'none') { r.click(); return; } }
    $('overlay-btn').click(); return;
  }
  if (cutBusy) return;
  if (battle && !$('view-battle').classList.contains('hidden')) { autoStepOnce(); return; }
  // --- auto everything outside battle ---
  if (!$('view-story').classList.contains('hidden')) { $('btn-story-next').click(); return; }
  if (!$('view-reward').classList.contains('hidden')) {
    const kids = [...$('reward-cards').children];
    if (kids.length) {
      const score = (n) => (n.classList.contains('rare') ? 50 : 0) + (/NEW/.test(n.textContent) ? 15 : 0)
        + (/Poison|Detonate|Fury|Resonance/i.test(n.textContent) ? 30 : 0) + (/\bDMG\b|\d+ DMG/.test(n.textContent) ? 10 : 0);
      kids.sort((a, b) => score(b) - score(a))[0].click();
    } else { const skip = $('btn-reward-skip'); if (skip) skip.click(); }
    return;
  }
  if (!$('view-map').classList.contains('hidden')) {
    const nodes = [...document.querySelectorAll('.map-node.avail:not([disabled])')];
    const pick = ['boss', 'elite', 'battle', 'event', 'shop', 'rest'].map((ty) => nodes.find((n) => n.classList.contains(ty))).find(Boolean) || nodes[0];
    if (pick) pick.click();
    return;
  }
  if (!$('view-missions').classList.contains('hidden')) {
    const tile = [...document.querySelectorAll('.mission-tile:not(.locked)')].find((n) => !/✓/.test(n.textContent));
    if (tile) tile.click();
    return;
  }
  if (!$('view-sim').classList.contains('hidden')) { $('btn-sim-start').click(); }
}
const autoStacks = (e) => (e.poison || 0) * 3 + (e.bleed || 0) + (e.toxin || 0);
function autoMainTarget() {
  const alive = battle.enemies.filter((e) => e.hp > 0);
  return alive.find((e) => e.boss) || alive.find((e) => e.elite) || alive.slice().sort((a, b) => b.hp - a.hp)[0] || null;
}
function autoAttackTarget(card) {
  const alive = battle.enemies.filter((e) => e.hp > 0);
  if (!alive.length) return null;
  for (const e of alive) { // lethal first — always take the kill
    try { const pv = previewCard(battle, card, e.uid); if (pv && pv.total >= e.hp) return { enemy: e, lethal: true, dmg: pv.total }; } catch { /* ignore */ }
  }
  const main = autoMainTarget();
  const scored = alive.map((e) => {
    let pv = null;
    try { pv = previewCard(battle, card, e.uid); } catch { /* ignore */ }
    const setup = autoStacks(e) + (e.mark > 0 ? 18 : 0) + (e.vuln > 0 ? 10 : 0) + (e.ravaged ? 22 : 0) + (e === main ? 6 : 0);
    return { enemy: e, lethal: false, dmg: pv ? pv.total : 0, setup };
  }).sort((a, b) => (b.dmg + b.setup) - (a.dmg + a.setup));
  return scored[0];
}
function autoScoreCard(card, idx) {
  const actor = battle.characters.find((c) => c.id === card.owner) || battle.characters[0];
  const turn = battle.turn;
  const main = autoMainTarget();
  if (!main) return { score: -1 };
  const stacks = autoStacks(main);
  const lowestHpPct = Math.min(...battle.characters.filter((c) => c.hp > 0).map((c) => c.hp / c.maxHp), 1);
  const dangerSoon = battle.enemies.some((e) => e.hp > 0 && e.counter <= 1 && intentOf(e).type === 'attack');
  if (card.breakdown) return actor && actor.broken ? { score: 1000, target: main, why: 'RECOVER' } : { score: -1 };
  if (card.type === 'curse' || card.unplayable) return { score: 4, target: main, why: 'CLEAR' };
  if (card.type === 'upgrade') return { score: turn <= 2 ? 280 : 200, target: main, why: 'ENGINE' };
  // Poison stacking engine (Yuna) — build, incubate, then detonate for mega
  if (card.detonatePoison) return (main.poison >= 9 || (turn >= 3 && main.poison >= 6)) ? { score: 340, target: main, why: 'DETONATE' } : { score: 12, target: main, why: 'HOLD' };
  if (card.doublePoison) return main.poison >= 5 ? { score: 240, target: main, why: 'INCUBATE ×2' } : { score: -1 };
  if (card.poison || card.poisonAll) {
    if (main.poison >= 17) return { score: 30, target: main, why: 'STACKED' };
    return { score: 150 + (card.poison || card.poisonAll || 0) * 9, target: main, why: 'STACK POISON' };
  }
  if (card.triggerPoisonTick) return { score: main.poison >= 8 ? 230 : 110, target: main, why: 'TICK NOW' };
  // other status primers
  if ((card.bleed || card.toxin) && !(card.dmg > 0)) return { score: 130 + ((card.bleed || 0) + (card.toxin || 0)) * 8, target: main, why: 'STACK STATUS' };
  if (card.mark || card.vuln || card.vulnAll) return { score: (main.mark > 0 && main.vuln > 0) ? 45 : 165, target: main, why: 'SETUP ×DMG' };
  if ((card.heal || card.teamHeal) && lowestHpPct < 0.55) return { score: 320, target: main, why: 'HEAL' };
  if ((card.shield || card.teamShield) && dangerSoon) return { score: 190, target: main, why: 'BRACE' };
  if (card.draw && battle.hand.length <= 5) return { score: 145, target: main, why: 'REFILL' };
  if (card.apGain || card.maxAp) return { score: 150, target: main, why: '+AP' };
  if (card.spawnTokens) return { score: 175, target: main, why: 'SWARM' };
  if (card.dmg > 0 || card.shieldDmgPct) {
    const pick = autoAttackTarget(card);
    if (!pick) return { score: -1 };
    if (pick.lethal) return { score: 950, target: pick.enemy, why: 'LETHAL' };
    let score = pick.dmg * 0.92 + pick.setup * 0.6;
    const fury = actor ? actor.fury || 0 : 0;
    if (card.consumeFury) { if (fury >= 5 || turn >= 3) score += 130 + fury * card.consumeFury * 0.7; else return { score: -1, why: 'HOLD FURY' }; }
    if (card.scaleFury) score += fury * 5;
    if (card.dmgPerPoison) score += (pick.enemy.poison || 0) * card.dmgPerPoison * 1.4;
    if (card.cost >= 2 && battle.resonance >= BURST_COST) score *= 1.55; // Resonance Burst window = mega
    if (card.finale && battle.ap - card.cost <= 0) score += 45;
    if (turn <= 1 && card.cost >= 3) score *= 0.45; // don't blow the mega on round 1
    return { score, target: pick.enemy, why: turn >= 3 ? 'PAYOFF' : 'BUILD HIT' };
  }
  if (card.shield || card.teamShield) return { score: 70, target: main, why: 'SHIELD' };
  if (card.heal || card.teamHeal) return { score: 55, target: main, why: 'TOP UP' };
  if (card.draw) return { score: 80, target: main, why: 'DRAW' };
  return { score: 40, target: main, why: 'PLAY' };
}
function autoPickEgo() {
  if (!battle || battle.result || !battle.egoQueue) return false;
  const turn = battle.turn;
  const stacks = Math.max(...battle.enemies.map((e) => autoStacks(e)), 0);
  const lowestHpPct = Math.min(...battle.characters.filter((c) => c.hp > 0).map((c) => c.hp / c.maxHp), 1);
  for (let i = 0; i < battle.egoQueue.length; i++) {
    const ego = battle.egoQueue[i];
    const owner = battle.characters.find((c) => c.id === ego.owner);
    if (!owner || owner.broken || owner.hp <= 0) continue;
    const useExalt = battle.ep >= MAX_EP && turn >= 3 && !!(ego.dmg || ego.poison);
    const cost = useExalt ? MAX_EP : Math.max(1, ego.cost - (owner.egoDiscount || 0));
    if (battle.ep < cost) continue;
    const healEgo = !!(ego.teamHeal || ego.heal);
    const want = healEgo ? (lowestHpPct < 0.55 || battle.ep >= MAX_EP)
      : (turn >= 3 || stacks >= 12 || (battle.ep >= MAX_EP && turn >= 2) || useExalt);
    if (!want) continue;
    if (useExalt) exaltArmed = true;
    const res = playEgo(battle, i, { exalt: useExalt });
    if (res && res.ok) {
      exaltArmed = false;
      setAutoPlan(`AUTO · ${useExalt ? 'OVER-EXALT' : 'EGO'} — ${ego.name.toUpperCase()}`);
      renderBattle();
      return true;
    }
    exaltArmed = false;
  }
  return false;
}
function autoStepOnce() {
  if (!autoplay || !battle || battle.result) return 'idle';
  if (battle.pendingEpiphany) {
    const p = battle.pendingEpiphany;
    let best = 0, bestScore = -1;
    p.options.forEach((opt, i) => {
      const c = opt.card || {};
      const s = (c.dmg || 0) + (c.poison || 0) * 8 + (c.dmgPerPoison || 0) * 10 + (c.detonatePoison ? 60 : 0) + (c.draw || 0) * 9 + (c.hits || 1) * 4;
      if (s > bestScore) { bestScore = s; best = i; }
    });
    chooseEpiphany(battle, best);
    $('epiphany-modal').classList.add('hidden');
    setAutoPlan('AUTO · EPIPHANY PICKED');
    renderBattle();
    return 'epiphany';
  }
  if (autoPickEgo()) return 'ego';
  let bestIdx = -1, best = { score: -1 };
  battle.hand.forEach((card, idx) => {
    if (!canPlay(battle, card)) return;
    const s = autoScoreCard(card, idx);
    if (s.score > best.score) { best = s; bestIdx = idx; }
  });
  const card = bestIdx >= 0 ? battle.hand[bestIdx] : null;
  if (card && best.score >= 38) {
    if (best.target) battle.targetUid = best.target.uid;
    const res = playCard(battle, bestIdx, best.target ? best.target.uid : undefined);
    if (res && res.ok) {
      setAutoPlan(`AUTO · T${battle.turn} ${best.why} — ${card.name.toUpperCase()}`);
      renderBattle();
      return 'card';
    }
  }
  setAutoPlan(`AUTO · END TURN ${battle.turn} — STACKS TICKING`);
  exaltArmed = false;
  endTurn(battle);
  renderBattle();
  return 'endturn';
}

/* --- resources --- */
function renderResources() {
  $('draw-count').textContent = battle.drawPile.length;
  $('grave-count').textContent = battle.discard.length;
  $('grave-used').textContent = `+${battle.cardsUsedThisTurn}`;
  $('ep-num').textContent = battle.ep;
  $('sands-count').textContent = battle.sands;
  $('btn-sands').classList.toggle('empty', battle.sands <= 0);

  if ($('res-num')) $('res-num').textContent = battle.resonance;
  if ($('res-fill')) $('res-fill').style.width = `${(battle.resonance / MAX_RESONANCE) * 100}%`;
  if ($('res-box')) $('res-box').classList.toggle('burst', battle.resonance >= BURST_COST);

  const exBtn = $('btn-exalt');
  if (exBtn) {
    exBtn.classList.toggle('hidden', battle.ep < MAX_EP);
    exBtn.classList.toggle('armed', exaltArmed && battle.ep === MAX_EP);
    exBtn.textContent = exaltArmed ? 'EXALT ON!' : 'EXALT 7';
  }

  const pips = $('ep-pips');
  pips.innerHTML = '';
  for (let i = 0; i < MAX_EP; i++) pips.appendChild(el('i', `ep-pip${i < battle.ep ? ' on' : ''}`));

  const list = $('ego-list');
  list.innerHTML = '';
  const useExalt = exaltArmed && battle.ep === MAX_EP;
  battle.egoQueue.forEach((ego, i) => {
    const owner = battle.characters.find((c) => c.id === ego.owner);
    const disc = owner ? (owner.egoDiscount || 0) : 0;
    const cost = useExalt ? MAX_EP : (owner && owner.egoFree ? 0 : Math.max(1, ego.cost - disc));
    const b = el('button', `ego-btn${battle.ep >= cost && owner && !owner.broken ? ' ready' : ''}${useExalt ? ' exalt' : ''}`);
    b.innerHTML = `<img src="${owner ? owner.art : ''}" alt="${ego.name}" /><span class="ego-cost">${cost}</span>`;
    b.title = useExalt && ego.exaltText ? `${ego.name} — ${ego.exaltText}` : `${ego.name} — ${cost} EP · ${ego.text}`;
    b.disabled = !!battle.result || !owner || owner.broken || battle.ep < cost;
    b.addEventListener('click', () => {
      if (cutBusy) return;
      const res = playEgo(battle, i, { exalt: useExalt });
      if (!res.ok) return;
      exaltArmed = false;
      sfxMajor(res.exalt ? 'exalt' : 'ego', { owner: ego.owner, cardId: ego.id });
      showBark(ego.owner, 'ego');
      renderBattle();
      if (!battle.result) showEgoCutIn(ego, owner, res.exalt);
    });
    list.appendChild(b);
  });

  const menu = $('sands-menu');
  [...menu.querySelectorAll('button')].forEach((b) => {
    const n = Number(b.dataset.sand);
    b.disabled = battle.sands < n || !!battle.result;
    b.onclick = () => {
      sfx('sands');
      useSands(battle, n);
      menu.classList.add('hidden');
      renderBattle();
    };
  });
}

function showEgoCutIn(ego, owner, isExalt = false) {
  cutBusy = true;
  $('cutin-art').src = ACTION_ART[ego.owner] || (owner ? owner.art : 'images/action-kaito.jpg');
  $('cutin-name').textContent = `${isExalt ? 'OVER-EXALT: ' : ''}${ego.name.toUpperCase()}`;
  $('cutin-type').textContent = `${isExalt ? '7 EP BURST' : 'EGO SKILL'} · ${owner ? owner.name.toUpperCase() : ''}`;
  $('cutin-fx').innerHTML = `<li>${isExalt && ego.exaltText ? ego.exaltText : ego.text}</li>`;
  $('cutin-card').innerHTML = '';
  $('cutin').classList.remove('hidden');
  setTimeout(() => {
    $('cutin').classList.add('hidden');
    cutBusy = false;
    renderBattle();
  }, 900);
}

function renderLog() {
  const log = $('battle-log');
  log.classList.toggle('hidden', logMode === 0);
  log.classList.toggle('mini', logMode === 1);
  log.innerHTML = battle.log.slice(logMode === 1 ? -3 : -8).map((l) => `<div class="${l.kind}">${l.text}</div>`).join('');
}

/* ========================================================= deck modal */
function applyDeckFilter() {
  const active = document.querySelector('#deck-filters button.active');
  const type = active ? active.dataset.dtype : 'all';
  document.querySelectorAll('#deck-modal-grid .deck-item').forEach((item) => {
    const card = item.querySelector('.card');
    item.style.display = (type === 'all' || (card && card.classList.contains(type))) ? '' : 'none';
  });
}
function openDeckModal({ modalMode, title, sub, cards, onPick }) {
  deckModalCtx = { mode: modalMode, title, sub, cards, onPick };
  $('deck-modal-title').textContent = title;
  $('deck-modal-sub').textContent = sub;
  const df = $('deck-filters');
  if (df) { df.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.dtype === 'all')); }
  const grid = $('deck-modal-grid');
  grid.innerHTML = '';

  cards.forEach((entry) => {
    const cObj = entry.card ? entry.card : makeStaticCard(entry.id, entry.upgraded);
    const wrap = el('div', 'deck-item');
    const { className, html } = cardHTML(cObj, null);
    const cNode = el('div', className, html);
    cNode.addEventListener('click', () => {
      if (onPick) onPick(entry);
      else openStaticDetail(cObj);
    });
    wrap.appendChild(cNode);
    if (modalMode === 'remove' || modalMode === 'upgrade') {
      const btn = el('button', 'shop-buy', modalMode === 'remove' ? 'PURGE' : 'UPGRADE +');
      btn.addEventListener('click', () => onPick(entry));
      wrap.appendChild(btn);
    }
    grid.appendChild(wrap);
  });
  $('deck-modal').classList.remove('hidden');
  applyDeckFilter();
}

function closeDeckModal() {
  $('deck-modal').classList.add('hidden');
  deckModalCtx = null;
}

/* =========================================================== lab modal */
function openLab(charId = progress.team[0] || 'kaito') {
  labCharId = CHARACTERS[charId] ? charId : 'kaito';
  renderLab();
  $('lab-modal').classList.remove('hidden');
}

function renderLab() {
  syncMeta();
  const tabs = $('lab-tabs');
  tabs.innerHTML = '';
  Object.values(CHARACTERS).forEach((ch) => {
    const b = el('button', `lab-tab${ch.id === labCharId ? ' active' : ''}`, ch.name.toUpperCase());
    b.addEventListener('click', () => { sfx('click'); labCharId = ch.id; renderLab(); });
    tabs.appendChild(b);
  });

  const ch = CHARACTERS[labCharId];
  const rec = progress.chars[labCharId] || { xp: 0, awaken: [false, false, false], skillLv: 0 };
  const lv = levelOf(rec.xp);
  const st = charStats(progress)[labCharId];
  const awkLabels = ['+10 Max HP', '+2 Attack', '-1 Ego Cost'];
  const skLv = rec.skillLv || 0;
  const nextSkCost = skLv < SKILL_COST.length ? SKILL_COST[skLv] : null;

  $('lab-body').innerHTML = `
    <div class="lab-art">
      <img src="${ch.art}" alt="${ch.name}" />
      <b>${ch.full}</b>
      <span class="head-sub">${ch.blurb}</span>
      <span style="font-size:11px;color:#ffe7a8">${ch.leader ? ch.leader.desc : ''}</span>
    </div>
    <div class="lab-info">
      <div class="lab-box">
        <b>LEVEL ${lv} · ${xpIntoLevel(rec.xp)} / 100 XP</b>
        <span class="head-sub">HP ${ch.hp + st.hp} (+${st.hp}) · Bonus ATK +${st.atk} · Skill Lv +${st.skillLv} · Ego Discount -${st.egoDiscount} EP</span>
      </div>
      <div class="lab-box">
        <b>AWAKENING SLOTS</b>
        <div class="awk-row">
          ${[0, 1, 2].map((slot) => {
            const done = !!rec.awaken[slot];
            const ok = canAwaken(progress, labCharId, slot);
            return `<button class="awk-btn${done ? ' done' : ''}" data-slot="${slot}"${done || !ok ? ' disabled' : ''}>
              <b>SLOT ${slot + 1}</b>
              <span>${awkLabels[slot]}</span>
              <i>${done ? 'AWAKENED' : `◆ ${AWAKEN_COST[slot]}`}</i>
            </button>`;
          }).join('')}
        </div>
      </div>
      <div class="lab-box">
        <b>SKILL POTENCY (${skLv} / ${SKILL_COST.length})</b>
        <span class="head-sub">+1 Damage, Shield, and Heal on every card this combatant plays.</span>
        <button class="shop-buy" id="btn-lab-skill"${!canSkillUp(progress, labCharId) ? ' disabled' : ''}>
          ${nextSkCost == null ? 'MAX SKILL LEVEL' : `UPGRADE SKILL POTENCY · ◆ ${nextSkCost}`}
        </button>
      </div>
    </div>`;

  $('lab-body').querySelectorAll('.awk-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const slot = Number(btn.dataset.slot);
      if (awaken(progress, labCharId, slot)) {
        sfx('upgrade');
        saveProgress(progress);
        renderLab();
        if (!$('view-roster').classList.contains('hidden')) renderRoster();
      }
    });
  });

  const skBtn = $('btn-lab-skill');
  if (skBtn) {
    skBtn.addEventListener('click', () => {
      if (skillUp(progress, labCharId)) {
        sfx('upgrade');
        saveProgress(progress);
        renderLab();
        if (!$('view-roster').classList.contains('hidden')) renderRoster();
      }
    });
  }
}

/* ============================================================== wiring */
function bind() {
  const toggleSound = () => { toggleMute(); syncMeta(); sfx('click'); };
  $('btn-mute-title').addEventListener('click', toggleSound);
  $('btn-mute').addEventListener('click', toggleSound);

  $('btn-start').addEventListener('click', () => {
    sfx('click');
    setMode('chaos');
    renderRoster();
    showView('roster');
  });
  $('btn-missions-mode').addEventListener('click', () => {
    sfx('click');
    setMode('story');
    renderRoster();
    showView('roster');
  });
  $('btn-resume-run').addEventListener('click', () => {
    sfx('click');
    if (progress.run && !progress.run.finished) { renderMap(); showView('map'); }
  });
  $('btn-open-lab').addEventListener('click', () => { sfx('click'); openLab(); });
  $('btn-open-guide').addEventListener('click', () => { sfx('click'); openGuide('all'); });
  $('btn-open-sim').addEventListener('click', () => { sfx('click'); openSim(progress.team[0] || 'kaito'); });
  $('btn-roster-guide').addEventListener('click', () => { sfx('click'); openGuide('all'); });
  $('btn-roster-sim').addEventListener('click', () => { sfx('click'); openSim(progress.team[0] || 'kaito'); });
  $('btn-guide-back').addEventListener('click', () => { sfx('click'); showView('title'); });
  $('guide-search').addEventListener('input', (e) => { guideQuery = e.target.value; renderGuide(); });
  $('btn-guide-sim-kaito').addEventListener('click', () => { sfx('click'); openSim('kaito'); });
  $('btn-char-back').addEventListener('click', () => { sfx('click'); renderRoster(); showView(charReturnView === 'title' ? 'title' : 'roster'); });
  $('btn-char-guide').addEventListener('click', () => { sfx('click'); openGuide('all'); });
  $('btn-char-sim-top').addEventListener('click', () => { sfx('click'); openSim(detailCharId); });
  $('btn-sim-back').addEventListener('click', () => { sfx('click'); renderRoster(); showView('roster'); });
  $('btn-sim-guide').addEventListener('click', () => { sfx('click'); openGuide('all'); });
  $('btn-sim-start').addEventListener('click', () => { sfx('click'); beginSimBattle(simCharId); });
  $('lab-close').addEventListener('click', () => $('lab-modal').classList.add('hidden'));

  $('btn-reset').addEventListener('click', () => {
    progress = resetProgress();
    syncMeta();
    renderRoster();
  });

  $('btn-roster-back').addEventListener('click', () => { sfx('click'); showView('title'); });
  $('mode-chaos').addEventListener('click', () => { sfx('click'); setMode('chaos'); });
  $('mode-story').addEventListener('click', () => { sfx('click'); setMode('story'); });

  $('btn-deploy').addEventListener('click', () => {
    sfx('click');
    if (mode === 'chaos') startNewRun();
    else { renderMissions(); showView('missions'); }
  });

  $('btn-missions-back').addEventListener('click', () => { sfx('click'); renderRoster(); showView('roster'); });
  $('btn-story-next').addEventListener('click', advanceStory);

  /* Chaos Map / Event / Shop / Rest / Reward / Rank */
  $('btn-map-deck').addEventListener('click', () => {
    const run = progress.run;
    if (!run) return;
    openDeckModal({
      modalMode: 'view',
      title: `RUN DECK (${run.deck.length})`,
      sub: 'Tap any card to inspect stats and upgrade preview.',
      cards: run.deck.map((d, index) => ({ ...d, index })),
    });
  });
  $('btn-map-quit').addEventListener('click', () => { sfx('click'); showView('title'); });

  $('btn-event-done').addEventListener('click', () => { sfx('click'); renderMap(); showView('map'); });

  $('btn-shop-deck').addEventListener('click', () => {
    const run = progress.run;
    if (!run) return;
    openDeckModal({
      modalMode: 'view',
      title: `RUN DECK (${run.deck.length})`,
      sub: 'Inspect your deck.',
      cards: run.deck.map((d, index) => ({ ...d, index })),
    });
  });
  $('btn-shop-remove').addEventListener('click', () => {
    const run = progress.run;
    if (!run || !currentShop || run.earned < currentShop.removeCost) return;
    openDeckModal({
      modalMode: 'remove',
      title: 'PURGE A CARD',
      sub: `Select 1 card to permanently remove for ◆ ${currentShop.removeCost}.`,
      cards: run.deck.map((d, index) => ({ ...d, index })),
      onPick(entry) {
        if (removeCard(run, entry.index)) {
          run.earned -= currentShop.removeCost;
          sfx('upgrade');
          saveProgress(progress);
          closeDeckModal();
          renderShop();
        }
      },
    });
  });
  $('btn-shop-leave').addEventListener('click', () => {
    sfx('click');
    markCleared(progress.run);
    saveProgress(progress);
    renderMap();
    showView('map');
  });

  $('btn-rest-heal').addEventListener('click', () => {
    const run = progress.run;
    restHealAll(run, 0.3, charStats(progress));
    markCleared(run);
    sfx('heal');
    saveProgress(progress);
    renderRest(true, 'All combatants healed 30% Max HP.');
  });
  $('btn-rest-calm').addEventListener('click', () => {
    const run = progress.run;
    restCalm(run, 40);
    markCleared(run);
    sfx('sands');
    saveProgress(progress);
    renderRest(true, 'Cleared 40 Stress across the entire squad.');
  });
  $('btn-rest-upgrade').addEventListener('click', () => {
    const run = progress.run;
    const idxs = upgradableIndexes(run);
    openDeckModal({
      modalMode: 'upgrade',
      title: 'EVOLVE CARD (+)',
      sub: 'Select one card to permanently upgrade for this run.',
      cards: idxs.map((index) => ({ ...run.deck[index], index })),
      onPick(entry) {
        if (upgradeCard(run, entry.index)) {
          markCleared(run);
          sfx('upgrade');
          saveProgress(progress);
          closeDeckModal();
          renderRest(true, `Upgraded ${CARDS[entry.id].name}+!`);
        }
      },
    });
  });
  $('btn-rest-done').addEventListener('click', () => { sfx('click'); renderMap(); showView('map'); });

  $('btn-reward-skip').addEventListener('click', () => {
    sfx('click');
    markCleared(progress.run);
    saveProgress(progress);
    renderMap();
    showView('map');
  });

  $('btn-rank-done').addEventListener('click', () => {
    sfx('click');
    renderRoster();
    showView('title');
  });

  $('deck-modal-close').addEventListener('click', closeDeckModal);

  /* Battle Controls */
  $('draw-pile').addEventListener('click', () => {
    if (!battle) return;
    openDeckModal({
      modalMode: 'pile',
      title: `DRAW PILE (${battle.drawPile.length})`,
      sub: 'Cards remaining in draw pile (sorted).',
      cards: battle.drawPile.slice().sort((a, b) => a.name.localeCompare(b.name)).map((card) => ({ card })),
    });
  });
  $('grave-pile').addEventListener('click', () => {
    if (!battle) return;
    openDeckModal({
      modalMode: 'pile',
      title: `GRAVEYARD (${battle.discard.length})`,
      sub: 'Used and discarded cards.',
      cards: battle.discard.map((card) => ({ card })),
    });
  });

  $('end-turn').addEventListener('click', () => {
    if (cutBusy || !battle || battle.result) return;
    const btn = $('end-turn');
    btn.classList.add('sparkle');
    clearTimeout(btn._sp); btn._sp = setTimeout(() => btn.classList.remove('sparkle'), 560);
    exaltArmed = false;
    sfx('turn');
    endTurn(battle);
    renderBattle();
  });

  if ($('btn-exalt')) {
    $('btn-exalt').addEventListener('click', () => {
      if (!battle || battle.ep < MAX_EP) return;
      exaltArmed = !exaltArmed;
      sfx('click');
      renderResources();
    });
  }

  $('btn-sands').addEventListener('click', (ev) => {
    ev.stopPropagation();
    $('sands-menu').classList.toggle('hidden');
  });
  document.addEventListener('click', (ev) => {
    const menu = $('sands-menu');
    if (!menu.classList.contains('hidden') && !ev.target.closest('.sands-wrap')) menu.classList.add('hidden');
  });

  $('log-toggle').addEventListener('click', () => {
    logMode = (logMode + 1) % 3; // hidden -> mini (last 3) -> full -> hidden
    $('log-toggle').style.color = logMode ? '#fff' : '';
    $('log-toggle').title = logMode === 1 ? 'Battle log: mini (click for full)' : logMode === 2 ? 'Battle log: full (click to hide)' : 'Battle log';
    renderLog();
  });

  $('btn-menu').addEventListener('click', () => $('pause').classList.remove('hidden'));
  $('pause-resume').addEventListener('click', () => $('pause').classList.add('hidden'));
  $('pause-restart').addEventListener('click', () => {
    $('pause').classList.add('hidden');
    if (battleCtx && battleCtx.kind === 'story') beginBattle(battleCtx.mission);
    else if (battleCtx && battleCtx.kind === 'sim') beginSimBattle(battleCtx.charId);
  });
  $('pause-quit').addEventListener('click', () => {
    $('pause').classList.add('hidden');
    if (battleCtx && battleCtx.kind === 'run') { renderMap(); showView('map'); }
    else if (battleCtx && battleCtx.kind === 'sim') { renderSimSetup(); showView('sim'); }
    else { renderMissions(); showView('missions'); }
  });
  document.querySelectorAll('#deck-filters button').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('#deck-filters button').forEach((x) => x.classList.toggle('active', x === b));
    applyDeckFilter();
  }));
  if ($('btn-open-settings-title')) $('btn-open-settings-title').addEventListener('click', () => { sfx('click'); openSettings(); });
  if ($('pause-settings')) $('pause-settings').addEventListener('click', () => { sfx('click'); $('pause').classList.add('hidden'); openSettings(); });
  if ($('settings-close')) $('settings-close').addEventListener('click', () => { sfx('click'); closeSettings(); });
  if ($('settings-modal')) $('settings-modal').addEventListener('click', (e) => { if (e.target.id === 'settings-modal') closeSettings(); });
  if ($('set-volume')) $('set-volume').addEventListener('input', (e) => { settings.volume = Number(e.target.value); $('set-volume-val').textContent = `${settings.volume}%`; setSfxVolume(settings.volume / 100); saveSettings(); });
  if ($('set-uiscale')) $('set-uiscale').addEventListener('input', (e) => { settings.uiScale = Number(e.target.value); $('set-uiscale-val').textContent = `${settings.uiScale}%`; applySettings(); saveSettings(); });
  if ($('set-fxsize')) $('set-fxsize').addEventListener('change', (e) => { settings.fxSize = e.target.value; applySettings(); saveSettings(); });
  if ($('set-shake')) $('set-shake').addEventListener('change', (e) => { settings.shake = e.target.checked; saveSettings(); });
  if ($('set-motion')) $('set-motion').addEventListener('change', (e) => { settings.motion = e.target.checked; applySettings(); saveSettings(); });
  if ($('set-cb')) $('set-cb').addEventListener('change', (e) => { settings.cb = e.target.checked; applySettings(); saveSettings(); });
  if ($('btn-autoplay')) $('btn-autoplay').addEventListener('click', () => { sfx(autoplay ? 'click' : 'buff'); setAutoplay(!autoplay); });
  setAutoPlan(autoplay ? 'AUTO · THINKING…' : '');
  if (autoplay) autoLoop();
  if ($('btn-sim-hud-hide')) $('btn-sim-hud-hide').addEventListener('click', () => { sfx('click'); setSimHudHidden(true); });
  if ($('sim-hud-pill')) $('sim-hud-pill').addEventListener('click', () => { sfx('click'); setSimHudHidden(false); });
  if ($('btn-sim-end')) $('btn-sim-end').addEventListener('click', () => { sfx('click'); endSimTest(true); });
  if ($('btn-sim-restart')) $('btn-sim-restart').addEventListener('click', () => { sfx('click'); if (battleCtx && battleCtx.kind === 'sim') beginSimBattle(battleCtx.charId); });
  document.querySelectorAll('[data-sim-act]').forEach((b) => b.addEventListener('click', () => {
    if (!battle || !battleCtx || battleCtx.kind !== 'sim' || battle.result) return;
    const c = battle.characters[0];
    const act = b.dataset.simAct;
    if (act === 'fury') c.fury += 5;
    else if (act === 'resonance') battle.resonance = MAX_RESONANCE;
    else if (act === 'ep') battle.ep = MAX_EP;
    else if (act === 'ap') battle.ap += 3;
    else if (act === 'recover') { c.hp = c.maxHp; c.stress = 0; c.shield += 20; }
    sfx('upgrade');
    renderBattle();
  }));

  $('detail').addEventListener('click', closeDetail);
  $('enemy-detail').addEventListener('click', closeEnemyDetail);
  $('detail').addEventListener('pointerup', () => setTimeout(() => { longPressed = false; }, 10));

  document.addEventListener('keydown', (e) => {
    if (!$('detail').classList.contains('hidden')) { closeDetail(); return; }
    if (!$('deck-modal').classList.contains('hidden')) { if (e.key === 'Escape') closeDeckModal(); return; }
    if (!$('lab-modal').classList.contains('hidden')) { if (e.key === 'Escape') $('lab-modal').classList.add('hidden'); return; }
    if ($('view-battle').classList.contains('hidden') || !battle) return;
    if (e.key === 'Escape') { $('pause').classList.toggle('hidden'); return; }
    if ((e.key === 'a' || e.key === 'A') && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) { setAutoplay(!autoplay); return; }
    if ((e.key === 'h' || e.key === 'H') && battleCtx && battleCtx.kind === 'sim' && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) { setSimHudHidden(!simHudHidden); return; }
    if (battle.result || cutBusy) return;
    if (e.key === ' ') { e.preventDefault(); sfx('turn'); endTurn(battle); renderBattle(); return; }
    const n = Number(e.key);
    if (n >= 1 && n <= battle.hand.length) playFromUI(n - 1);
  });

  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    if (resizeRaf) return;
    resizeRaf = raf(() => {
      resizeRaf = 0;
      if (!$('view-map').classList.contains('hidden')) drawMapLines();
      syncRootVars();
      // Rotation / split-screen changes the hand strip: re-lay the cards out
      // with the new width instead of leaving stale pixel sizes behind.
      if (battle && !$('view-battle').classList.contains('hidden')) renderHand();
    });
  });

  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('.btn-primary, .btn-ghost, .chip-btn');
    if (b) ripple(b);
  });

  /* ------------------------- platform / touch wiring ------------------------ */
  /* Android hardware back: close the topmost thing, then walk the screen graph.
     Returns true when the press was consumed; false means "quit the app". */
  const backFromOverlay = () => {
    const anyOpen = (id) => { const n = $(id); return n && !n.classList.contains('hidden'); };
    if (anyOpen('settings-modal')) { closeSettings(); return true; }
    if (anyOpen('deck-modal')) { closeDeckModal(); return true; }
    if (anyOpen('lab-modal')) { $('lab-modal').classList.add('hidden'); return true; }
    if (anyOpen('epi-modal')) { return true; }          // a run choice must be made
    if (anyOpen('detail')) { closeDetail(); return true; }
    if (anyOpen('enemy-detail')) { closeEnemyDetail(); return true; }
    if (anyOpen('pause')) { $('pause').classList.add('hidden'); return true; }
    if (anyOpen('overlay')) { const b = $('overlay-btn'); if (b) b.click(); return true; }
    return false;
  };
  const backFromView = () => {
    const view = currentView;
    if (view === 'battle') {
      if (battle && battle.result) return false;        // the overlay handles it
      $('pause').classList.remove('hidden');
      return true;
    }
    if (view === 'title') return false;                 // exiting from here quits
    if (view === 'map' || view === 'roster' || view === 'missions') {
      showView(view === 'map' ? 'map' : 'title');
      if (view === 'map') return false;                 // map has its own EXIT
      showView('title');
      return true;
    }
    if (view === 'character' || view === 'guide' || view === 'sim') { showView('title'); return true; }
    if (view === 'story' || view === 'event' || view === 'shop' || view === 'rest' || view === 'reward') {
      return false;                                     // run decisions block back
    }
    showView('title');
    return true;
  };
  installPlatformBridge({
    goBack() {
      if (backFromOverlay()) return true;
      return backFromView();
    },
    onAppPause() {
      // Android backgrounded us: stop audio loops and drop into pause.
      badgeHeartbeatStop();
      if (currentView === 'battle' && battle && !battle.result) {
        $('pause').classList.remove('hidden');
      }
    },
  });

  /* Long-press inspect: the touch equivalent of a right-click / hover tooltip.
     The battle card + enemy renderers already bind their own hold timers, so we
     only guard the document against long-press text selection + context menus. */
  document.addEventListener('contextmenu', (ev) => {
    if (!(ev.target.closest && ev.target.closest('input, textarea'))) ev.preventDefault();
  });

  /* Touch hardware: never let a stray double-tap zoom the canvas. */
  installDoubleTapGuard();
  raf(syncRootVars);
  updateAdaptiveUI();

  /* ---------------- first-run thumb tutorial (touch devices only) ----------
     The desktop ships with a keybind legend and hover tooltips; a phone has
     neither, so the gesture language is taught once, right after install. */
  const TUT_KEY = 'cw_touch_tut_v1';
  const tut = $('touch-tut');
  const touchDevice = (() => { try { return (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window; } catch { return false; } })();
  // Default to "not seen": a player who has never dismissed it should learn the
  // gestures. The flag is persisted through localStorage OR the Android
  // SharedPreferences bridge, so it survives a WebView storage eviction.
  const tutSeen = storageGet(TUT_KEY) === '1';
  if (tut && touchDevice && !tutSeen) {
    tut.classList.remove('hidden');
    const dismiss = () => {
      tut.classList.add('hidden');
      storageSet(TUT_KEY, '1');
      sfx('click');
    };
    $('tt-dismiss').addEventListener('click', dismiss);
    tut.addEventListener('click', (ev) => { if (ev.target === tut) dismiss(); });
  } else if (tut) {
    tut.classList.add('hidden');
  }
}

bind();
applySettings();
renderRoster();
syncMeta();
showView('title');

// exposed for the E2E harness
window.__cw = {
  CARDS, CHARACTERS, EGOS,
  get battle() { return battle; },
  get progress() { return progress; },
  get run() { return progress.run; },
  setMode, startNewRun, enterRunNode, renderMap,
  beginBattle, beginRunBattle, renderBattle, startBattle, playCard, endTurn, playEgo, useSands, previewCard, POISON_PER_STACK, poisonPerStack, setSimHudHidden, setAutoplay, autoStepOnce, get autoplayOn() { return autoplay; },
  chooseEpiphany, setExalt(on) { exaltArmed = !!on; renderResources(); },
  showView, playFromUI, openDetail, closeDetail, openLab, openDeckModal, closeDeckModal, advanceStory,
  openGuide, renderGuide, openCharacter, renderCharacter, openSim, renderSimSetup, beginSimBattle, endSimTest,
  openEnemyDetail, closeEnemyDetail, enemyStatuses,
  setTeam(ids) {
    const t = ids.slice(0, 3);
    progress.team = t;
    saveProgress(progress);
    renderRoster();
    t.forEach((id) => applyTeamPulse(id));
  },
  openMission(code) {
    const m = MISSIONS.find((x) => x.code === code);
    beginBattle(m);
  },
};
