import {
  CARDS, CHARACTERS, EGOS, MISSIONS, ENEMIES, ATTRIBUTES, CLASSES, ROLES,
  RELICS, EVENTS, MOD_INFO, CHAOS_WEAKNESSES,
} from './data.js';
import {
  startBattle, playCard, endTurn, playEgo, useSands, canPlay, previewCard, intentOf,
  computeSynergy, battleSummary, rankOf, MAX_EP, RECOVERY_PLAYS,
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
import { sfx, bark, isMuted, toggleMute } from './audio.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
};
const attr = (a) => ATTRIBUTES[a] || { name: '—', glyph: '·', color: '#888' };

let progress = loadProgress();
let mode = 'chaos'; // 'chaos' | 'story'
let battle = null;
let battleCtx = null; // { kind: 'story', mission } | { kind: 'run', node, encounter }
let mission = null;
let storyIndex = 0;
let logOpen = false;
let cutBusy = false;
let longPressed = false;
let pressTimer = null;
let currentEvent = null;
let currentShop = null;
let labCharId = 'kaito';
let deckModalCtx = null; // { mode: 'view'|'remove'|'upgrade'|'pile', title, cards, onPick }
let barkTimer = null;

const VIEWS = ['title', 'roster', 'missions', 'story', 'map', 'event', 'shop', 'rest', 'reward', 'battle', 'rank'];
const raf = (fn) => (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(fn) : fn());
const showView = (name) => {
  VIEWS.forEach((v) => $('view-' + v).classList.toggle('hidden', v !== name));
  syncMeta();
  if (name === 'map') raf(drawMapLines);
};

const ENEMY_ART = {
  strep: 'images/pathogen-strep-cut.png',
  toxin: 'images/pathogen-toxin-cut.png',
  biofilm: 'images/pathogen-biofilm-cut.png',
  strain: 'images/pathogen-biofilm-cut.png',
  prion: 'images/pathogen-toxin-cut.png',
  spore: 'images/pathogen-strep-cut.png',
  elite_hive: 'images/pathogen-hive-cut.png',
  elite_wall: 'images/pathogen-cathedral-cut.png',
  elite_prime: 'images/pathogen-prime-cut.png',
  boss_bloom: 'images/boss-bloom-cut.png',
  boss_prion: 'images/boss-prion-cut.png',
};
const ENEMY_HUE = {
  strain: 'hue-rotate(250deg) saturate(1.4)',
  prion: 'hue-rotate(300deg)',
  spore: 'hue-rotate(60deg)',
};
const CARD_ART = {
  k_jab: 'images/card-k1.jpg', k_rush: 'images/card-k2.jpg', k_last: 'images/card-k3.jpg',
  m_strike: 'images/card-m1.jpg', m_guard: 'images/card-m2.jpg', m_patch: 'images/card-m3.jpg',
  g_strike: 'images/card-g1.jpg', g_cleave: 'images/card-g2.jpg', g_devour: 'images/card-g3.jpg',
  b_ping: 'images/card-b1.jpg', b_flare: 'images/card-b2.jpg', b_hist: 'images/card-b3.jpg',
};
const ACTION_ART = {
  kaito: 'images/action-kaito.jpg',
  momo: 'images/action-momo.jpg',
  goro: 'images/action-goro.jpg',
  bibi: 'images/action-bibi.jpg',
};
const KIND_ICON = { attack: '⚔', skill: '❖', upgrade: '⬆', status: '☓', curse: '✖' };
const INTENT_ICON = { attack: null, defend: '❖', buff: '↑', debuff: '☠', heal: '✚' };
const NODE_META = {
  battle: { ico: '⚔', lbl: 'HOSTILE' },
  elite: { ico: '☠', lbl: 'ELITE' },
  boss: { ico: '♛', lbl: 'BOSS' },
  event: { ico: '✧', lbl: 'ANOMALY' },
  shop: { ico: '⛁', lbl: 'SHOP' },
  rest: { ico: '✚', lbl: 'SANCTUARY' },
};
const RANK_ORDER = { S: 4, A: 3, B: 2, C: 1 };

function syncMeta() {
  const c = progress.cells || 0;
  ['title-cells', 'roster-cells', 'missions-cells', 'lab-cells'].forEach((id) => {
    if ($(id)) $(id).textContent = c;
  });
  const muteIcon = isMuted() ? '🔇' : '🔊';
  if ($('btn-mute-title')) $('btn-mute-title').textContent = muteIcon;
  if ($('btn-mute')) $('btn-mute').textContent = muteIcon;
  const hasActiveRun = !!(progress.run && !progress.run.finished);
  if ($('btn-resume-run')) $('btn-resume-run').classList.toggle('hidden', !hasActiveRun);
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
        <span class="roster-name">${c.name}</span>
        <span class="roster-cell">${c.full.split('— ')[1] || ''}</span>
        <span class="roster-leader">${c.leader ? c.leader.desc : ''}</span>
        <div class="roster-xp" title="${xpPct}/100 XP"><i style="width:${xpPct}%"></i></div>
        <div class="roster-stats"><span>HP <b>${c.hp + st.hp}</b></span><span>SK <b>+${st.skillLv}</b></span></div>
        <div class="roster-foot-row">
          <span class="awk-pips" title="Awakenings">${pips}</span>
          <button class="lab-link" type="button">LAB</button>
        </div>
      </div>`;
    card.querySelector('.lab-link').addEventListener('click', (ev) => {
      ev.stopPropagation();
      sfx('click');
      openLab(id);
    });
    card.addEventListener('click', () => { sfx('click'); toggleTeam(id); });
    grid.appendChild(card);
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

function toggleTeam(id) {
  const i = progress.team.indexOf(id);
  if (i >= 0) progress.team.splice(i, 1);
  else if (progress.team.length < 3) progress.team.push(id);
  saveProgress(progress);
  renderRoster();
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
        <div class="m-place">${m.place} · <span style="color:#ffc94d">⛁ ${m.reward || 40}${cleared ? ' (claimed)' : ''}</span></div>
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
function openStory(m) {
  mission = m;
  storyIndex = 0;
  $('story-art').style.backgroundImage = 'url(images/cell-warriors-battle.png)';
  $('story-who').textContent = m.place.toUpperCase();
  $('story-text').textContent = m.story[0];
  $('btn-story-next').textContent = 'NEXT';
  showView('story');
}

function advanceStory() {
  sfx('click');
  storyIndex += 1;
  if (storyIndex >= mission.story.length) { beginBattle(mission); return; }
  $('story-text').textContent = mission.story[storyIndex];
  if (storyIndex === mission.story.length - 1) $('btn-story-next').textContent = 'ENGAGE';
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
      const cls = `map-node ${node.type}${isAvail ? ' avail' : (node.cleared ? ' cleared' : ' locked')}${isCur ? ' current' : ''}`;
      const btn = el('button', cls, `<span class="n-ico">${meta.ico}</span><span class="n-lbl">${node.cleared ? '✓ ' : ''}${meta.lbl}</span>`);
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
  shop.cards.forEach((item) => {
    const wrap = el('div', 'shop-item');
    const card = makeStaticCard(item.id, item.upgraded);
    const { className, html } = cardHTML(card, null);
    const cNode = el('div', className, html);
    cNode.addEventListener('contextmenu', (ev) => { ev.preventDefault(); openStaticDetail(card); });
    cNode.addEventListener('click', () => openStaticDetail(card));
    const btn = el('button', 'shop-buy', item.sold ? 'SOLD' : `BUY · ⛁ ${item.cost}`);
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
        ${shop.relic.sold ? 'ACQUIRED' : `BUY RELIC · ⛁ ${shop.relic.cost}`}
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

  $('shop-remove-cost').textContent = `⛁ ${shop.removeCost}`;
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
  $('reward-cells').textContent = `+${gained} run cells gained (total ⛁ ${run.earned})`;

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
  choices.forEach((item) => {
    const card = makeStaticCard(item.id, item.upgraded);
    const { className, html } = cardHTML(card, null);
    const cNode = el('div', className, html);
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
  closeDetail();
  $('cutin').classList.add('hidden');
  $('sands-menu').classList.add('hidden');
  $('bark-toast').classList.add('hidden');
  $('dmg-rail').innerHTML = '';
  showView('battle');
  $('overlay').classList.add('hidden');
  $('pause').classList.add('hidden');
  $('b-mission').textContent = title;
  $('b-place').textContent = place || '';
  $('pause-restart').style.display = battleCtx && battleCtx.kind === 'run' ? 'none' : 'block';
  $('pause-quit').textContent = battleCtx && battleCtx.kind === 'run' ? 'ABANDON TO MAP' : 'QUIT TO MISSIONS';
  renderBattle();
}

function renderBattle() {
  if (!battle) return;
  flushFx();
  renderTeam();
  renderEnemies();
  renderHand();
  renderResources();
  renderLog();
  $('b-turn').textContent = battle.turn;
  const w = attr(battle.enemies[0] ? battle.enemies[0].weakness : null);
  $('weak-banner').innerHTML = `BREAK <b style="color:${w.color}">${w.glyph} ${w.name.toUpperCase()}</b> TENACITY → +1 AP`;
  $('end-turn').disabled = !!battle.result;
  $('ap-now').textContent = battle.ap;
  $('ap-now').parentElement.classList.toggle('zero', battle.ap <= 0);

  $('battle-relics').innerHTML = battle.relics.map((r) => `<span class="hpill" title="${r.text}">${r.glyph} ${r.name}</span>`).join('');
  $('battle-synergy').innerHTML = battle.synergy.map((s) => `<span class="hpill syn" title="${s.desc}">${s.name}</span>`).join('');

  const tips = [`CARDS PLAYED <b>${battle.cardsPlayedThisTurn}</b>`];
  if (battle.epiphany) tips.push(`⚡ EPIPHANY <b>${CHARACTERS[battle.epiphany].name.toUpperCase()}</b>`);
  if (battle.freeFirstLeft > 0) tips.push('⟡ <b>FIRST CARD FREE</b>');
  if (battle.enemies.some((e) => e.ravaged)) tips.push('<b>RAVAGED</b> +30% DMG');
  tips.push('HOLD A CARD TO READ IT');
  $('battle-tips').innerHTML = tips.join('');

  if (battle.result) resolveBattleOutcome();
  else $('overlay').classList.add('hidden');
}

function resolveBattleOutcome() {
  const sum = battleSummary(battle);
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
  if (isBreak || amt >= 35) return 'sz-xl';
  if (amt >= 20) return 'sz-lg';
  if (amt >= 10) return 'sz-md';
  return 'sz-sm';
}

function flushFx() {
  const rail = $('dmg-rail');
  if (!rail) { battle.fx.length = 0; return; }
  const events = battle.fx.splice(0, battle.fx.length);
  let strongHit = false, broke = false, phased = false, playerHurt = false, brokeDown = false;
  let celestial = false, didShield = false, didHeal = false, egoUsed = false;

  events.slice(-8).forEach((ev) => {
    let main = '', label = '', cls = '';
    if (ev.kind === 'dmg') {
      main = `-${ev.amt}`; label = ev.name;
      cls = `${ev.weak ? 'weak' : 'dmg'}${ev.ravaged ? ' rav' : ''} ${sizeClass(ev.amt)}`;
      if (ev.weak || ev.amt >= 16) strongHit = true;
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
      main = 'PHASE II'; label = ev.name; cls = 'break sz-xl'; phased = true;
    } else if (ev.kind === 'celestial') {
      main = 'CELESTIAL'; label = ev.name; cls = 'shield sz-md'; celestial = true;
    } else if (ev.kind === 'curse') {
      main = 'FEVER'; label = `${ev.name} +CURSE`; cls = 'stress sz-sm';
    } else if (ev.kind === 'ego') {
      main = 'EGO'; label = ev.name; cls = 'break sz-lg'; egoUsed = true;
    }
    if (!main) return;
    const line = el('div', `fx-line ${cls}`, `<b>${main}</b><span>${label}</span>`);
    rail.appendChild(line);
    while (rail.children.length > 5) rail.removeChild(rail.firstChild);
    setTimeout(() => line.remove(), 1800);
  });

  if (broke) {
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
  } else if (strongHit) {
    sfx('weak');
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
  btnEl.onclick = fn;
  $('overlay-retry').style.display = win ? 'none' : 'inline-block';
  $('overlay-retry').onclick = () => beginBattle(battle.mission);
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
    ].join('');
    p.innerHTML = `
      <img src="${c.art}" alt="${c.name}" />
      ${tags ? `<div class="p-tags">${tags}</div>` : ''}
      ${c.shield > 0 ? `<span class="p-shield">◈${c.shield}</span>` : ''}
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

/* --- enemies --- */
function renderEnemies() {
  const row = $('enemies');
  row.innerHTML = '';
  battle.enemies.forEach((e) => {
    const a = attr(e.weakness);
    const intent = intentOf(e);
    const isSel = battle.targetUid === e.uid && e.hp > 0;
    const node = el('div', `enemy${e.hp <= 0 ? ' dead' : ''}${isSel ? ' selected' : ''}${e.ravaged ? ' ravaged' : ''}`);

    const isAttack = intent.type === 'attack';
    const isCharge = intent.type === 'charge';
    const dmgShown = (isAttack || isCharge)
      ? Math.round((intent.value + e.atkBuff) * (e.weaken > 0 ? 0.65 : 1))
      : null;
    const badge = isCharge
      ? `<span class="badge dmg charge" title="Charged strike in ${intent.turns} turn(s)">⚡${dmgShown} · ${intent.turns}T</span>`
      : (isAttack
          ? `<span class="badge dmg">${dmgShown}</span>`
          : `<span class="badge dmg support">${INTENT_ICON[intent.type] || '?'}</span>`);

    const modChips = [];
    if (e.boss) modChips.push('<span class="mod-chip boss">BOSS</span>');
    else if (e.elite) modChips.push('<span class="mod-chip">ELITE</span>');
    (e.mods || []).forEach((mKey) => {
      const m = MOD_INFO[mKey];
      if (m) modChips.push(`<span class="mod-chip" title="${m.desc}">${m.label}</span>`);
    });
    if (e.mark > 0) modChips.push(`<span class="mod-chip mark">MARK ×1.5 (${e.mark})</span>`);

    node.innerHTML = `
      <div class="enemy-badges">
        <span class="badge weak" style="color:${a.color}">${a.glyph}</span>
        ${badge}
        ${isAttack ? '<span class="badge counter" title="hits">×1</span>' : ''}
        <span class="badge counter${e.counter <= 1 ? ' low' : ''}" title="action counter">${e.counter}</span>
        ${e.ravaged ? '<span class="badge ravage">RAVAGED</span>' : ''}
      </div>
      ${modChips.length ? `<div class="enemy-mods">${modChips.join('')}</div>` : ''}
      <div class="enemy-art">
        <img src="${ENEMY_ART[e.id] || 'images/pathogen-strep-cut.png'}" alt="${e.name}" style="filter:${ENEMY_HUE[e.id] || 'none'}" />
      </div>
      <div class="enemy-plate">
        <div class="enemy-hp"><i style="width:${(e.hp / e.maxHp) * 100}%"></i><span>${e.hp} / ${e.maxHp}</span></div>
        <div class="ten-bar${e.ravaged ? ' broken' : ''}"><i style="width:${(e.tenacity / e.maxTenacity) * 100}%"></i></div>
        <div class="enemy-name">${e.name}</div>
      </div>`;

    node.addEventListener('click', () => {
      if (e.hp <= 0) return;
      sfx('click');
      battle.targetUid = e.uid;
      renderBattle();
    });
    row.appendChild(node);
  });
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
  };
}

function fxBadge(card, p, battleState) {
  if (card.type === 'curse' || card.unplayable) return `<div class="card-fx bad"><b>✖</b><span>UNPLAYABLE</span></div>`;
  if (card.breakdown && battleState) {
    const ch = battleState.characters.find((c) => c.id === card.owner);
    const need = ch ? RECOVERY_PLAYS[Math.min(Math.max(ch.breakdownCount - 1, 0), RECOVERY_PLAYS.length - 1)] : 5;
    return `<div class="card-fx status"><b>${ch ? ch.recovery : 0}/${need}</b><span>RECOVERY</span></div>`;
  }
  if (p.total > 0) {
    const cls = p.weak ? 'weak' : 'dmg';
    return `<div class="card-fx ${cls}${p.lethal ? ' lethal' : ''}">
      <b>${p.total}</b><span>DMG${p.hits > 1 ? ` ×${p.hits}` : ''}${p.weak ? ' · WEAK' : ''}</span>
      ${p.lethal ? '<i>LETHAL</i>' : ''}</div>`;
  }
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

function cardHTML(card, battleState = battle) {
  const freeFirst = battleState && battleState.freeFirstLeft > 0 && card.cost > 0;
  const cost = (card.zeroCost || freeFirst) ? 0 : card.cost;
  const owner = CHARACTERS[card.owner];
  const a = attr(card.attr);
  const p = previewOf(card, battleState);
  const playable = battleState ? (canPlay(battleState, card) && !battleState.result) : true;
  return {
    className: `card ${card.type}${playable ? '' : ' unaffordable'}${card.glint ? ' glint' : ''}${card.upgraded ? ' upgraded' : ''}${cost === 0 ? ' card-free' : ''}`,
    html: `
      ${cardArtHTML(card, owner)}
      <div class="card-frame"></div>
      <div class="card-corner"></div>
      <div class="card-topline">
        <div class="card-cost" style="${cost === 0 ? '' : `border-color:${a.color}`}">${cost}</div>
        ${card.glint ? '<span class="card-glint">✦</span>' : ''}
      </div>
      ${fxBadge(card, p, battleState)}
      <div class="card-info">
        <div class="card-name">${KIND_ICON[card.type] || ''} ${card.name}</div>
        <div class="card-kind" style="color:${a.color}">${card.type}${card.glint ? ' · epiphany' : ''}${card.upgraded ? ' · +' : ''}</div>
        <div class="card-text">${card.text || ''}</div>
        <div class="card-tags">${(card.tags || []).map((t) => `<span class="tag">${t}</span>`).join('')}</div>
      </div>
      <div class="card-acc"></div>`,
  };
}

function renderHand() {
  const hand = $('hand');
  hand.innerHTML = '';
  const n = Math.max(1, battle.hand.length);
  const avail = hand.clientWidth || window.innerWidth * 0.72;
  const w = Math.max(92, Math.min(144, Math.floor(avail / (n + 0.42 * (n - 1)))));
  const overlap = Math.round(w * 0.42);
  hand.style.setProperty('--card-w', `${w}px`);
  hand.style.setProperty('--card-m', `${-Math.floor(overlap / 2)}px`);

  const mid = (battle.hand.length - 1) / 2;
  battle.hand.forEach((card, i) => {
    const { className, html } = cardHTML(card, battle);
    const node = el('div', className, html);
    const rot = battle.hand.length > 1 ? (i - mid) * 1.8 : 0;
    node.style.setProperty('--rot', `${rot.toFixed(2)}deg`);
    node.style.setProperty('--lift', `${(Math.abs(i - mid) * 2.5).toFixed(1)}px`);

    let startX = 0, startY = 0;
    node.addEventListener('pointerdown', (ev) => {
      startX = ev.clientX; startY = ev.clientY;
      clearTimeout(pressTimer);
      pressTimer = setTimeout(() => {
        longPressed = true;
        openDetail(i);
      }, 320);
    });
    node.addEventListener('pointermove', (ev) => {
      if (Math.abs(ev.clientX - startX) > 12 || Math.abs(ev.clientY - startY) > 12) clearTimeout(pressTimer);
    });
    node.addEventListener('pointerup', () => clearTimeout(pressTimer));
    node.addEventListener('pointerleave', () => clearTimeout(pressTimer));
    node.addEventListener('pointercancel', () => clearTimeout(pressTimer));
    node.addEventListener('contextmenu', (ev) => { ev.preventDefault(); openDetail(i); });
    node.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (longPressed) { longPressed = false; return; }
      playFromUI(i);
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
    const parts = [`${card.dmg} base`];
    const actor = battleState && battleState.characters.find((c) => c.id === card.owner);
    if (actor && actor.buffAtk) parts.push(`+${actor.buffAtk} buff`);
    if (p.combo) parts.push(`+${p.combo} combo`);
    if (p.finale) parts.push(`+${p.finale} finale`);
    if (p.weak) parts.push('×1.5 weakness');
    if (p.ravaged) parts.push('×1.3 ravaged');
    if (p.mark) parts.push('×1.5 marked');
    if (p.hits > 1) parts.push(`×${p.hits} hits`);
    if (p.targets > 1) parts.push(`×${p.targets} enemies`);
    rows.push(`<div class="math-row dmg"><b>${p.total}</b><span>DAMAGE</span><i>${parts.join(' ')}</i></div>`);
  }
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
function playFromUI(index) {
  if (cutBusy || !battle || battle.result) return;
  const card = battle.hand[index];
  if (!card || !canPlay(battle, card)) return;
  const res = playCard(battle, index, card.dmg > 0 && !card.aoe ? battle.targetUid : undefined);
  if (!res.ok) return;
  if (card.owner) showBark(card.owner, 'attack');
  else if (card.type === 'attack') sfx('slash');
  renderBattle();
  if (!battle.result) showCutIn(card);
}

function showCutIn(card) {
  const owner = CHARACTERS[card.owner];
  cutBusy = true;
  $('cutin-art').src = ACTION_ART[card.owner] || (owner ? owner.art : 'images/action-kaito.jpg');
  $('cutin-name').textContent = card.name.toUpperCase();
  $('cutin-type').textContent = `${owner ? owner.name.toUpperCase() + ' · ' : ''}${card.type.toUpperCase()} · ${card.zeroCost ? 0 : card.cost} AP`;
  $('cutin-fx').innerHTML = '';
  const slot = $('cutin-card');
  const { className, html } = cardHTML(card, battle);
  slot.innerHTML = `<div class="${className}" style="--rot:0deg;--lift:0px">${html}</div>`;
  $('cutin').classList.remove('hidden');
  setTimeout(() => {
    $('cutin').classList.add('hidden');
    cutBusy = false;
    renderBattle();
  }, 820);
}

/* --- resources --- */
function renderResources() {
  $('draw-count').textContent = battle.drawPile.length;
  $('grave-count').textContent = battle.discard.length;
  $('grave-used').textContent = `+${battle.cardsUsedThisTurn}`;
  $('ep-num').textContent = battle.ep;
  $('sands-count').textContent = battle.sands;
  $('btn-sands').classList.toggle('empty', battle.sands <= 0);

  const pips = $('ep-pips');
  pips.innerHTML = '';
  for (let i = 0; i < MAX_EP; i++) pips.appendChild(el('i', `ep-pip${i < battle.ep ? ' on' : ''}`));

  const list = $('ego-list');
  list.innerHTML = '';
  battle.egoQueue.forEach((ego, i) => {
    const owner = battle.characters.find((c) => c.id === ego.owner);
    const disc = owner ? (owner.egoDiscount || 0) : 0;
    const cost = owner && owner.egoFree ? 0 : Math.max(1, ego.cost - disc);
    const b = el('button', `ego-btn${battle.ep >= cost && owner && !owner.broken ? ' ready' : ''}`);
    b.innerHTML = `<img src="${owner ? owner.art : ''}" alt="${ego.name}" /><span class="ego-cost">${cost}</span>`;
    b.title = `${ego.name} — ${cost} EP · ${ego.text}`;
    b.disabled = !!battle.result || !owner || owner.broken || battle.ep < cost;
    b.addEventListener('click', () => {
      if (cutBusy) return;
      const res = playEgo(battle, i);
      if (!res.ok) return;
      showBark(ego.owner, 'ego');
      renderBattle();
      if (!battle.result) showEgoCutIn(ego, owner);
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

function showEgoCutIn(ego, owner) {
  cutBusy = true;
  $('cutin-art').src = ACTION_ART[ego.owner] || (owner ? owner.art : 'images/action-kaito.jpg');
  $('cutin-name').textContent = ego.name.toUpperCase();
  $('cutin-type').textContent = `EGO SKILL · ${owner ? owner.name.toUpperCase() : ''}`;
  $('cutin-fx').innerHTML = `<li>${ego.text}</li>`;
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
  log.classList.toggle('hidden', !logOpen);
  log.innerHTML = battle.log.slice(-8).map((l) => `<div class="${l.kind}">${l.text}</div>`).join('');
}

/* ========================================================= deck modal */
function openDeckModal({ modalMode, title, sub, cards, onPick }) {
  deckModalCtx = { mode: modalMode, title, sub, cards, onPick };
  $('deck-modal-title').textContent = title;
  $('deck-modal-sub').textContent = sub;
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
              <i>${done ? 'AWAKENED' : `⛁ ${AWAKEN_COST[slot]}`}</i>
            </button>`;
          }).join('')}
        </div>
      </div>
      <div class="lab-box">
        <b>SKILL POTENCY (${skLv} / ${SKILL_COST.length})</b>
        <span class="head-sub">+1 Damage, Shield, and Heal on every card this combatant plays.</span>
        <button class="shop-buy" id="btn-lab-skill"${!canSkillUp(progress, labCharId) ? ' disabled' : ''}>
          ${nextSkCost == null ? 'MAX SKILL LEVEL' : `UPGRADE SKILL POTENCY · ⛁ ${nextSkCost}`}
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
      sub: `Select 1 card to permanently remove for ⛁ ${currentShop.removeCost}.`,
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
    sfx('turn');
    endTurn(battle);
    renderBattle();
  });

  $('btn-sands').addEventListener('click', (ev) => {
    ev.stopPropagation();
    $('sands-menu').classList.toggle('hidden');
  });
  document.addEventListener('click', (ev) => {
    const menu = $('sands-menu');
    if (!menu.classList.contains('hidden') && !ev.target.closest('.sands-wrap')) menu.classList.add('hidden');
  });

  $('log-toggle').addEventListener('click', () => {
    logOpen = !logOpen;
    $('log-toggle').style.color = logOpen ? '#fff' : '';
    renderLog();
  });

  $('btn-menu').addEventListener('click', () => $('pause').classList.remove('hidden'));
  $('pause-resume').addEventListener('click', () => $('pause').classList.add('hidden'));
  $('pause-restart').addEventListener('click', () => {
    if (battleCtx && battleCtx.kind === 'story') beginBattle(battleCtx.mission);
  });
  $('pause-quit').addEventListener('click', () => {
    $('pause').classList.add('hidden');
    if (battleCtx && battleCtx.kind === 'run') { renderMap(); showView('map'); }
    else { renderMissions(); showView('missions'); }
  });

  $('detail').addEventListener('click', closeDetail);
  $('detail').addEventListener('pointerup', () => setTimeout(() => { longPressed = false; }, 10));

  document.addEventListener('keydown', (e) => {
    if (!$('detail').classList.contains('hidden')) { closeDetail(); return; }
    if (!$('deck-modal').classList.contains('hidden')) { if (e.key === 'Escape') closeDeckModal(); return; }
    if (!$('lab-modal').classList.contains('hidden')) { if (e.key === 'Escape') $('lab-modal').classList.add('hidden'); return; }
    if ($('view-battle').classList.contains('hidden') || !battle) return;
    if (e.key === 'Escape') { $('pause').classList.toggle('hidden'); return; }
    if (battle.result || cutBusy) return;
    if (e.key === ' ') { e.preventDefault(); sfx('turn'); endTurn(battle); renderBattle(); return; }
    const n = Number(e.key);
    if (n >= 1 && n <= battle.hand.length) playFromUI(n - 1);
  });

  window.addEventListener('resize', () => {
    if (!$('view-map').classList.contains('hidden')) raf(drawMapLines);
  });
}

bind();
renderRoster();
syncMeta();
showView('title');

// exposed for the E2E harness
window.__cw = {
  get battle() { return battle; },
  get progress() { return progress; },
  get run() { return progress.run; },
  setMode, startNewRun, enterRunNode, renderMap,
  beginBattle, beginRunBattle, renderBattle, startBattle, playCard, endTurn, playEgo, useSands,
  showView, playFromUI, openDetail, closeDetail, openLab, openDeckModal, closeDeckModal,
  setTeam(ids) { progress.team = ids.slice(0, 3); saveProgress(progress); renderRoster(); },
  openMission(code) {
    const m = MISSIONS.find((x) => x.code === code);
    beginBattle(m);
  },
};
