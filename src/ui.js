import { CHARACTERS, CARDS, MISSIONS, ENEMIES, ATTRIBUTES, CLASSES, ROLES } from './data.js';
import {
  startBattle, playCard, endTurn, playEgo, useSands, canPlay, intentOf,
  MAX_EP, STRESS_MAX, RECOVERY_PLAYS,
} from './engine.js';
import { loadProgress, saveProgress, resetProgress, missionUnlocked } from './progress.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
};
const attr = (a) => ATTRIBUTES[a] || { name: '—', glyph: '·', color: '#888' };

let progress = loadProgress();
let battle = null;
let mission = null;
let pendingMission = null;
let storyIndex = 0;
let logOpen = true;

const VIEWS = ['title', 'roster', 'missions', 'story', 'battle'];
const showView = (name) => VIEWS.forEach((v) => $('view-' + v).classList.toggle('hidden', v !== name));

const ENEMY_ART = {
  strep: 'images/pathogen-strep-cut.png',
  toxin: 'images/pathogen-toxin-cut.png',
  biofilm: 'images/pathogen-biofilm-cut.png',
  strain: 'images/pathogen-biofilm-cut.png',
  prion: 'images/pathogen-toxin-cut.png',
  spore: 'images/pathogen-strep-cut.png',
};
const ENEMY_HUE = { strain: 'hue-rotate(255deg) saturate(1.3)', prion: 'hue-rotate(300deg)', spore: 'hue-rotate(60deg)' };
const INTENT_ICON = { attack: '⚔', defend: '◈', buff: '↑', debuff: '☠', heal: '✚' };

/* ============================================================== roster */
function renderRoster() {
  const grid = $('roster');
  grid.innerHTML = '';
  for (const [id, c] of Object.entries(CHARACTERS)) {
    const inTeam = progress.team.includes(id);
    const a = attr(c.attr);
    const card = el('button', `roster-card${inTeam ? ' selected' : ''}`);
    card.innerHTML = `
      <div class="roster-top">
        <span class="cls-chip">${CLASSES[c.cls].name}</span>
        <span class="attr-tag" style="color:${a.color}">${a.glyph} ${a.name}</span>
      </div>
      <div class="roster-art"><img src="${c.art}" alt="${c.name}" /></div>
      <div class="roster-info">
        <span class="roster-name">${c.name}</span>
        <span class="roster-cell">${c.full.split('— ')[1] || ''}</span>
        <span class="roster-cell" style="color:#9aa3c4">${ROLES[c.cls]} · ${c.deck.length} cards</span>
        <div class="roster-stats"><span>HP <b>${c.hp}</b></span><span>EGO <b>${c.cls}</b></span></div>
      </div>`;
    card.addEventListener('click', () => toggleTeam(id));
    grid.appendChild(card);
  }
  $('team-count').textContent = `${progress.team.length} / 3`;
  const strip = $('team-strip');
  strip.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const id = progress.team[i];
    const slot = el('div', `team-slot${id ? ' filled' : ''}`);
    slot.innerHTML = id
      ? `<img src="${CHARACTERS[id].art}" alt="" /><div><b>${CHARACTERS[id].name}</b><br>${attr(CHARACTERS[id].attr).glyph} ${CLASSES[CHARACTERS[id].cls].name}</div>`
      : `<div>EMPTY SLOT</div>`;
    strip.appendChild(slot);
  }
  $('btn-deploy').disabled = progress.team.length !== 3;
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
    const a = attr(m.rec);
    const tile = el('button', `mission-tile${unlocked ? '' : ' locked'}`);
    tile.innerHTML = `
      <div>
        <div class="code">${m.code.toUpperCase()}</div>
        <div class="threat ${m.threat}">${m.threat.toUpperCase()}</div>
      </div>
      <div>
        <div class="m-name">${m.name}${cleared ? ' <span style="color:#4ddc9a;font-size:11px">✓</span>' : ''}</div>
        <div class="m-place">${m.place}</div>
      </div>
      <div class="m-right">
        <div class="m-weak">WEAK TO <b style="color:${a.color}">${a.glyph} ${a.name}</b><br>
          <span style="font-size:10px">${m.enemies.map((e) => ENEMIES[e].name).join(' · ')}</span></div>
        <span style="font-size:18px;color:#8b93b5">›</span>
      </div>`;
    if (unlocked) tile.addEventListener('click', () => openStory(m));
    list.appendChild(tile);
  });
}

/* =============================================================== story */
function openStory(m) {
  mission = m;
  storyIndex = 0;
  const speaker = CHARACTERS[progress.team[0]];
  $('story-art').style.backgroundImage = `url(images/cell-warriors-battle.png)`;
  $('story-who').textContent = `${m.place.toUpperCase()}`;
  $('story-text').textContent = m.story[0];
  $('btn-story-next').textContent = 'NEXT';
  showView('story');
}

function advanceStory() {
  storyIndex += 1;
  if (storyIndex >= mission.story.length) {
    beginBattle(mission);
    return;
  }
  $('story-text').textContent = mission.story[storyIndex];
  if (storyIndex === mission.story.length - 1) $('btn-story-next').textContent = 'ENGAGE';
}

/* ============================================================== battle */
function beginBattle(m) {
  battle = startBattle(m.code, progress.team, Date.now());
  showView('battle');
  $('overlay').classList.add('hidden');
  $('b-mission').textContent = `${m.code.toUpperCase()} · ${m.name.toUpperCase()}`;
  $('b-place').textContent = m.place;
  renderBattle();
}

function renderBattle() {
  if (!battle) return;
  renderParty();
  renderEnemies();
  renderHand();
  renderResources();
  renderLog();
  $('b-turn').textContent = battle.turn;
  const w = attr(battle.enemies[0] ? battle.enemies[0].weakness : null);
  $('weak-banner').innerHTML = `BREAK <b style="color:${w.color}">${w.glyph} ${w.name.toUpperCase()}</b> TENACITY FOR +1 AP`;
  $('end-turn').disabled = !!battle.result;
  const tips = [];
  tips.push(`CARDS PLAYED <b>${battle.cardsPlayedThisTurn}</b>`);
  if (battle.epiphany) tips.push(`⚡ EPIPHANY ON <b>${CHARACTERS[battle.epiphany].name.toUpperCase()}</b>`);
  if (battle.enemies.some((e) => e.ravaged)) tips.push('<b>RAVAGED</b> — TAKES +30% DAMAGE');
  $('battle-tips').innerHTML = tips.join('');
  const overlay = $('overlay');
  if (battle.result === 'win') {
    if (!progress.cleared.includes(battle.mission.code)) {
      progress.cleared.push(battle.mission.code);
      saveProgress(progress);
    }
    showOverlay('MISSION CLEAR', 'The line holds. The body is still yours.', 'CONTINUE', () => { renderMissions(); showView('missions'); }, true);
  } else if (battle.result === 'loss') {
    showOverlay('TEAM COLLAPSED', 'Stress took them before the pathogen did. Regroup.', 'RETRY', () => beginBattle(battle.mission), false);
  } else {
    overlay.classList.add('hidden');
  }
}

function showOverlay(title, sub, btn, fn, win) {
  const ov = $('overlay');
  ov.classList.remove('hidden');
  $('overlay-title').textContent = title;
  $('overlay-title').style.color = win ? '#4ddc9a' : '#ff3355';
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

function renderParty() {
  const party = $('party');
  party.innerHTML = '';
  battle.characters.forEach((c) => {
    const isEpi = battle.epiphany === c.id;
    const node = el('div', `pc${c.hp <= 0 ? ' down' : ''}${c.broken ? ' broken' : ''}`);
    node.style.setProperty('--pc', CHARACTERS[c.id].skin);
    const need = RECOVERY_PLAYS[Math.min(Math.max(c.breakdownCount - 1, 0), RECOVERY_PLAYS.length - 1)];
    node.innerHTML = `
      <div class="pc-art">
        <img src="${c.art}" alt="${c.name}" />
        ${isEpi ? '<span class="bulb">💡</span>' : ''}
      </div>
      <div class="pc-meta">
        <div class="pc-name">${c.name.toUpperCase()}<i>${attr(c.attr).glyph}</i></div>
        <div class="bar hp"><i style="width:${(c.hp / c.maxHp) * 100}%"></i></div>
        <div class="bar stress"><i style="width:${(c.stress / STRESS_MAX) * 100}%"></i></div>
        <div class="pc-nums"><span>${c.hp}/${c.maxHp}</span><span>${c.broken ? 'BROKEN' : Math.round(c.stress) + ' STRESS'}</span></div>
      </div>
      <div class="pc-flags">
        ${c.shield > 0 ? `<span class="flag shield">◈ ${c.shield}</span>` : ''}
        ${c.broken ? `<span class="flag breakdown">${c.recovery}/${need}</span>` : ''}
      </div>`;
    party.appendChild(node);
  });
}

function renderEnemies() {
  const row = $('enemies');
  row.innerHTML = '';
  battle.enemies.forEach((e) => {
    const a = attr(e.weakness);
    const intent = intentOf(e);
    const isSel = battle.targetUid === e.uid;
    const node = el('div', `enemy${e.hp <= 0 ? ' dead' : ''}${isSel ? ' selected' : ''}${e.ravaged ? ' ravaged' : ''}`);
    node.innerHTML = `
      <div class="enemy-top">
        <span class="weak-glyph" style="color:${a.color};border-color:${a.color}55">${a.glyph}</span>
        <span class="counter${e.counter <= 1 ? ' low' : ''}${e.ravaged ? ' ravaged' : ''}">${e.counter}</span>
        <span class="intent-pill${['defend', 'buff', 'heal'].includes(intent.type) ? ' support' : ''}">
          ${INTENT_ICON[intent.type] || '?'} ${intent.type === 'attack' ? intent.value : intent.type.toUpperCase()}
        </span>
      </div>
      <div class="enemy-art">
        <img src="${ENEMY_ART[e.id] || 'images/pathogen-strep-cut.png'}" alt="${e.name}" style="filter:${ENEMY_HUE[e.id] || 'none'}" />
      </div>
      <div class="enemy-info">
        <div class="enemy-name">${e.name}</div>
        <div class="bar hp"><i style="width:${(e.hp / e.maxHp) * 100}%"></i></div>
        <div class="bar tenacity${e.ravaged ? ' broken' : ''}"><i style="width:${(e.tenacity / e.maxTenacity) * 100}%"></i></div>
      </div>`;
    node.addEventListener('click', () => {
      if (e.hp <= 0) return;
      battle.targetUid = e.uid;
      renderEnemies();
    });
    row.appendChild(node);
  });
}

function renderHand() {
  const hand = $('hand');
  hand.innerHTML = '';
  // fit the fan: cards shrink and overlap harder as the hand grows (cap is 10)
  const n = Math.max(1, battle.hand.length);
  const avail = hand.clientWidth || 760;
  const w = Math.max(86, Math.min(132, Math.floor(avail / (n + 0.2 * (n - 1)))));
  const overlap = Math.round(w * 0.2);
  hand.style.setProperty('--card-w', `${w}px`);
  hand.style.setProperty('--card-m', `${-Math.floor(overlap / 2)}px`);
  battle.hand.forEach((card, i) => {
    const free = card.zeroCost;
    const cost = free ? 0 : card.cost;
    const playable = canPlay(battle, card) && !battle.result;
    const owner = CHARACTERS[card.owner];
    const node = el('div', `card ${card.type}${playable ? '' : ' unaffordable'}${card.glint ? ' glint' : ''}${cost === 0 ? ' card-free' : ''}`);
    const a = attr(card.attr);
    node.innerHTML = `
      <div class="card-cost" style="color:${cost === 0 ? '#ffc94d' : a.color}">${cost}</div>
      ${owner ? `<div class="card-photo" style="background-image:url(${owner.art})"></div>` : ''}
      <div class="card-head">${card.name}</div>
      <div class="card-type" style="color:${a.color}">${card.type}${card.glint ? ' · epiphany' : ''}</div>
      <div class="card-body">${card.text || ''}</div>
      <div class="card-tags">${(card.tags || []).map((t) => `<span class="tag">${t}</span>`).join('')}</div>
      <div class="card-owner" style="background:${owner ? owner.skin : '#666'}"></div>`;
    node.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (battle.result) return;
      const needsTarget = card.dmg > 0 && !card.aoe;
      playCard(battle, i, needsTarget ? battle.targetUid : undefined);
      renderBattle();
    });
    hand.appendChild(node);
  });
}

function renderResources() {
  $('ap-now').textContent = battle.ap;
  $('ap-orb').classList.toggle('zero', battle.ap <= 0);
  $('draw-count').textContent = battle.drawPile.length;
  $('grave-count').textContent = battle.discard.length;
  $('grave-used').textContent = `+${battle.cardsUsedThisTurn}`;
  $('ep-num').textContent = `${battle.ep}/${MAX_EP}`;
  const pips = $('ep-pips');
  pips.innerHTML = '';
  for (let i = 0; i < MAX_EP; i++) pips.appendChild(el('i', `ep-pip${i < battle.ep ? ' on' : ''}`));

  const list = $('ego-list');
  list.innerHTML = '';
  battle.egoQueue.forEach((ego, i) => {
    const owner = battle.characters.find((c) => c.id === ego.owner);
    const cost = owner && owner.egoFree ? 0 : ego.cost;
    const b = el('button', 'ego-btn', `<b>${ego.name}</b><span>${cost} EP</span>`);
    b.disabled = !!battle.result || !owner || owner.broken || battle.ep < cost;
    b.addEventListener('click', () => { playEgo(battle, i); renderBattle(); });
    list.appendChild(b);
  });

  const sands = $('sands');
  sands.innerHTML = '';
  [['⧗', 1, 'Undo last card'], ['⟳', 2, 'Redraw Ego'], ['↺', 3, 'Rewind turn']].forEach(([icon, n, title]) => {
    const b = el('button', `sands-btn${battle.sands < n ? ' used' : ''}`, `${icon}<i>${n}</i>`);
    b.title = title;
    b.disabled = battle.sands < n || !!battle.result;
    b.addEventListener('click', () => { useSands(battle, n); renderBattle(); });
    sands.appendChild(b);
  });
}

function renderLog() {
  const log = $('battle-log');
  log.style.display = logOpen ? 'flex' : 'none';
  log.innerHTML = battle.log.slice(-7).map((l) => `<div class="${l.kind}">${l.text}</div>`).join('');
}

/* ============================================================== wiring */
function bind() {
  $('btn-start').addEventListener('click', () => { renderRoster(); showView('roster'); });
  $('btn-reset').addEventListener('click', () => { progress = resetProgress(); renderRoster(); });
  $('btn-deploy').addEventListener('click', () => { renderMissions(); showView('missions'); });
  $('btn-missions-back').addEventListener('click', () => { renderRoster(); showView('roster'); });
  $('btn-story-next').addEventListener('click', advanceStory);
  $('end-turn').addEventListener('click', () => { if (!battle.result) { endTurn(battle); renderBattle(); } });
  $('btn-flee').addEventListener('click', () => { renderMissions(); showView('missions'); });
  $('log-toggle').addEventListener('click', () => {
    logOpen = !logOpen;
    $('log-toggle').classList.toggle('on', logOpen);
    renderLog();
  });
  document.addEventListener('keydown', (e) => {
    if ($('view-battle').classList.contains('hidden') || !battle || battle.result) return;
    if (e.key === ' ') { e.preventDefault(); endTurn(battle); renderBattle(); return; }
    const n = Number(e.key);
    if (n >= 1 && n <= battle.hand.length) {
      const card = battle.hand[n - 1];
      playCard(battle, n - 1, card && card.dmg > 0 && !card.aoe ? battle.targetUid : undefined);
      renderBattle();
    }
  });
}

bind();
renderRoster();
showView('title');

// exposed for the E2E harness
window.__cw = {
  get battle() { return battle; },
  get progress() { return progress; },
  beginBattle, renderBattle, startBattle, playCard, endTurn, showView,
  setTeam(ids) { progress.team = ids.slice(0, 3); saveProgress(progress); renderRoster(); },
  openMission(code) {
    const m = MISSIONS.find((x) => x.code === code);
    beginBattle(m);
  },
};
