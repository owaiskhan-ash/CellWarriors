import { CHARACTERS, MISSIONS, ENEMIES, ATTRIBUTES, CLASSES, ROLES } from './data.js';
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
let storyIndex = 0;
let logOpen = false;
let cutBusy = false;
let prevState = null;

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
const ENEMY_HUE = {
  strain: 'hue-rotate(250deg) saturate(1.4)',
  prion: 'hue-rotate(300deg)',
  spore: 'hue-rotate(60deg)',
};
const CARD_ART = {
  k_jab: 'card-k1', k_rush: 'card-k2', k_last: 'card-k3',
  m_strike: 'card-m1', m_guard: 'card-m2', m_patch: 'card-m3',
};
const KIND_ICON = { attack: '⚔', skill: '❖', upgrade: '⬆', status: '☓', curse: '✖' };
const INTENT_ICON = { attack: null, defend: '❖', buff: '↑', debuff: '☠', heal: '✚' };

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
        <div class="roster-stats"><span>HP <b>${c.hp}</b></span><span>EGO <b>4 EP</b></span></div>
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
      : '<div>EMPTY SLOT</div>';
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
        <div class="m-name">${m.name}${cleared ? ' <span style="color:#46e08a;font-size:11px">✓</span>' : ''}</div>
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
  $('story-art').style.backgroundImage = 'url(images/cell-warriors-battle.png)';
  $('story-who').textContent = m.place.toUpperCase();
  $('story-text').textContent = m.story[0];
  $('btn-story-next').textContent = 'NEXT';
  showView('story');
}

function advanceStory() {
  storyIndex += 1;
  if (storyIndex >= mission.story.length) { beginBattle(mission); return; }
  $('story-text').textContent = mission.story[storyIndex];
  if (storyIndex === mission.story.length - 1) $('btn-story-next').textContent = 'ENGAGE';
}

/* ============================================================== battle */
function beginBattle(m) {
  battle = startBattle(m.code, progress.team, Date.now());
  prevState = null;
  cutBusy = false;
  $('cutin').classList.add('hidden');
  $('sands-menu').classList.add('hidden');
  showView('battle');
  $('overlay').classList.add('hidden');
  $('pause').classList.add('hidden');
  $('b-mission').textContent = `${m.code.toUpperCase()} · ${m.name.toUpperCase()}`;
  $('b-place').textContent = m.place;
  renderBattle();
}

function renderBattle() {
  if (!battle) return;
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

  const tips = [`CARDS PLAYED <b>${battle.cardsPlayedThisTurn}</b>`];
  if (battle.epiphany) tips.push(`⚡ EPIPHANY <b>${CHARACTERS[battle.epiphany].name.toUpperCase()}</b>`);
  if (battle.enemies.some((e) => e.ravaged)) tips.push('<b>RAVAGED</b> +30% DMG');
  $('battle-tips').innerHTML = tips.join('');
  prevState = snapshotOf();

  if (battle.result === 'win') {
    if (!progress.cleared.includes(battle.mission.code)) {
      progress.cleared.push(battle.mission.code);
      saveProgress(progress);
    }
    showOverlay('MISSION CLEAR', 'The line holds. The body is still yours.', 'CONTINUE', () => { renderMissions(); showView('missions'); }, true);
  } else if (battle.result === 'loss') {
    showOverlay('TEAM COLLAPSED', 'Stress took them before the pathogen did. Regroup.', 'RETRY', () => beginBattle(battle.mission), false);
  } else {
    $('overlay').classList.add('hidden');
  }
}

const snapshotOf = () => ({
  enemies: Object.fromEntries(battle.enemies.map((e) => [e.uid, { hp: e.hp, tenacity: e.tenacity, ravaged: e.ravaged }])),
  chars: Object.fromEntries(battle.characters.map((c) => [c.id, { hp: c.hp, stress: c.stress, broken: c.broken, shield: c.shield }])),
});

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

/* --- top hud: pooled HP + portraits + stress --- */
function renderTeam() {
  $('team-hp-fill').style.width = '100%';
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
    p.innerHTML = `
      <img src="${c.art}" alt="${c.name}" />
      ${c.shield > 0 ? `<span class="p-shield">◈${c.shield}</span>` : ''}
      <div class="p-stress"><i style="width:${Math.min(100, c.stress)}%"></i></div>
      <div class="p-hp"><i style="width:${(c.hp / c.maxHp) * 100}%"></i></div>
      ${c.broken ? `<div class="p-broken">BREAK<br>${c.recovery}/${need}</div>` : ''}`;
    p.addEventListener('click', () => {
      if (c.hp <= 0) return;
    });
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

  // stress / damage floats
  if (prevState) {
    battle.characters.forEach((c) => {
      const was = prevState.chars[c.id];
      const node = box.querySelectorAll('.portrait')[battle.characters.indexOf(c)];
      if (!was || !node) return;
      if (c.stress > was.stress + 1) spawnFloat(node, `+${Math.round(c.stress - was.stress)}`, 'stress');
      else if (c.hp < was.hp) spawnFloat(node, `-${was.hp - c.hp}`, '');
    });
  }
}

function spawnFloat(parent, text, kind) {
  const f = el('div', `dmg-float ${kind}`, text);
  parent.appendChild(f);
  setTimeout(() => f.remove(), 950);
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
    const dmgShown = isAttack ? Math.round((intent.value + e.atkBuff) * (e.weaken > 0 ? 0.65 : 1)) : null;
    const badge = isAttack
      ? `<span class="badge dmg">${dmgShown}</span>`
      : `<span class="badge dmg support">${INTENT_ICON[intent.type] || '?'}</span>`;

    node.innerHTML = `
      <div class="enemy-badges">
        <span class="badge weak" style="color:${a.color}">${a.glyph}</span>
        ${badge}
        ${isAttack ? '<span class="badge counter" title="hits">×1</span>' : ''}
        <span class="badge counter${e.counter <= 1 ? ' low' : ''}" title="action counter">${e.counter}</span>
        ${e.ravaged ? '<span class="badge ravage">RAVAGED</span>' : ''}
      </div>
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
      battle.targetUid = e.uid;
      renderEnemies();
    });
    row.appendChild(node);

    if (prevState) {
      const was = prevState.enemies[e.uid];
      if (was) {
        if (e.hp < was.hp) {
          const crit = was.tenacity > e.tenacity;
          spawnFloat(node, `-${was.hp - e.hp}`, crit ? 'weak' : '');
        }
        if (!was.ravaged && e.ravaged) spawnFloat(node, 'BREAK', 'weak');
      }
    }
  });
}

/* --- hand --- */
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
    const cost = card.zeroCost ? 0 : card.cost;
    const playable = canPlay(battle, card) && !battle.result;
    const owner = CHARACTERS[card.owner];
    const a = attr(card.attr);
    const artKey = CARD_ART[card.defId];
    const node = el('div', `card ${card.type}${playable ? '' : ' unaffordable'}${card.glint ? ' glint' : ''}${cost === 0 ? ' card-free' : ''}`);
    const rot = battle.hand.length > 1 ? (i - mid) * 1.8 : 0;
    const lift = Math.abs(i - mid) * 2.5;
    node.style.setProperty('--rot', `${rot.toFixed(2)}deg`);
    node.style.setProperty('--lift', `${lift.toFixed(1)}px`);

    node.innerHTML = `
      ${artKey ? `<div class="card-art" style="background-image:url(images/${artKey}.png)"></div>`
        : `<img class="card-artimg" src="${owner ? owner.art : ''}" alt="" style="position:absolute;inset:10% 6% 30%;width:88%;height:60%;object-fit:contain;filter:drop-shadow(0 6px 12px rgba(0,0,0,.7))" />`}
      <div class="card-frame"></div>
      <div class="card-corner"></div>
      <div class="card-topline">
        <div class="card-cost" style="${cost === 0 ? '' : `border-color:${a.color}`}">${cost}</div>
        ${card.glint ? '<span class="card-glint">✦</span>' : ''}
      </div>
      <div class="card-info">
        <div class="card-name">${KIND_ICON[card.type] || ''} ${card.name}</div>
        <div class="card-kind" style="color:${a.color}">${card.type}${card.glint ? ' · epiphany' : ''}</div>
        <div class="card-text">${card.text || ''}</div>
        <div class="card-tags">${(card.tags || []).map((t) => `<span class="tag">${t}</span>`).join('')}</div>
      </div>
      <div class="card-acc"></div>`;

    node.addEventListener('click', (ev) => { ev.stopPropagation(); playFromUI(i); });
    hand.appendChild(node);
  });
}

/* --- play with cut-in --- */
function playFromUI(index) {
  if (cutBusy || !battle || battle.result) return;
  const card = battle.hand[index];
  if (!card || !canPlay(battle, card)) return;
  const logLen = battle.log.length;
  const res = playCard(battle, index, card.dmg > 0 && !card.aoe ? battle.targetUid : undefined);
  if (!res.ok) return;

  const newLines = battle.log.slice(logLen)
    .filter((l) => ['hurt', 'break', 'kill', 'breakdown', 'weak', 'recover', 'epiphany'].includes(l.kind))
    .map((l) => l.text.trim())
    .slice(0, 3);

  renderBattle();
  if (!battle.result) showCutIn(card, newLines);
}

function showCutIn(card, fx) {
  const owner = CHARACTERS[card.owner];
  cutBusy = true;
  const art = $('cutin-art');
  art.src = owner ? owner.art : 'images/cut-kaito-cut.png';
  $('cutin-name').textContent = card.name.toUpperCase();
  $('cutin-type').textContent = `${owner ? owner.name.toUpperCase() + ' · ' : ''}${card.type.toUpperCase()} · ${card.zeroCost ? 0 : card.cost} AP`;
  $('cutin-fx').innerHTML = fx.length ? fx.map((t) => `<li>${t}</li>`).join('') : '<li>Resolved.</li>';

  const slot = $('cutin-card');
  slot.innerHTML = '';
  const ghost = el('div', `card ${card.type}${card.zeroCost ? ' card-free' : ''}`);
  ghost.innerHTML = `
    ${CARD_ART[card.defId] ? `<div class="card-art" style="background-image:url(images/${CARD_ART[card.defId]}.png)"></div>`
      : `<img src="${owner ? owner.art : ''}" alt="" style="position:absolute;inset:10% 6% 30%;width:88%;height:60%;object-fit:contain" />`}
    <div class="card-frame"></div><div class="card-corner"></div>
    <div class="card-topline"><div class="card-cost">${card.zeroCost ? 0 : card.cost}</div></div>
    <div class="card-info">
      <div class="card-name">${KIND_ICON[card.type] || ''} ${card.name}</div>
      <div class="card-kind">${card.type}</div>
      <div class="card-text">${card.text || ''}</div>
    </div>
    <div class="card-acc"></div>`;
  slot.appendChild(ghost);

  const cu = $('cutin');
  cu.classList.remove('hidden');
  setTimeout(() => {
    cu.classList.add('hidden');
    cutBusy = false;
    renderBattle();
  }, 780);
}

/* --- resources: piles, EP, egos, sands --- */
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
    const cost = owner && owner.egoFree ? 0 : ego.cost;
    const b = el('button', `ego-btn${battle.ep >= cost && owner && !owner.broken ? ' ready' : ''}`);
    b.innerHTML = `<img src="${owner ? owner.art : ''}" alt="${ego.name}" /><span class="ego-cost">${cost}</span>`;
    b.title = `${ego.name} — ${cost} EP${owner && owner.broken ? ' (sealed)' : ''}`;
    b.disabled = !!battle.result || !owner || owner.broken || battle.ep < cost;
    b.addEventListener('click', () => {
      if (cutBusy) return;
      const logLen = battle.log.length;
      const res = playEgo(battle, i);
      if (!res.ok) return;
      const fx = battle.log.slice(logLen).map((l) => l.text.trim()).slice(0, 3);
      renderBattle();
      if (!battle.result) showEgoCutIn(ego, owner, fx);
    });
    list.appendChild(b);
  });

  const menu = $('sands-menu');
  [...menu.querySelectorAll('button')].forEach((b) => {
    const n = Number(b.dataset.sand);
    b.disabled = battle.sands < n || !!battle.result;
    b.onclick = () => {
      useSands(battle, n);
      menu.classList.add('hidden');
      renderBattle();
    };
  });
}

function showEgoCutIn(ego, owner, fx) {
  cutBusy = true;
  $('cutin-art').src = owner ? owner.art : 'images/cut-kaito-cut.png';
  $('cutin-name').textContent = ego.name.toUpperCase();
  $('cutin-type').textContent = `EGO SKILL · ${owner ? owner.name.toUpperCase() : ''}`;
  $('cutin-fx').innerHTML = fx.length ? fx.map((t) => `<li>${t}</li>`).join('') : '<li>Ego unleashed.</li>';
  $('cutin-card').innerHTML = '';
  const cu = $('cutin');
  cu.classList.remove('hidden');
  setTimeout(() => {
    cu.classList.add('hidden');
    cutBusy = false;
    renderBattle();
  }, 820);
}

function renderLog() {
  const log = $('battle-log');
  log.classList.toggle('hidden', !logOpen);
  log.innerHTML = battle.log.slice(-7).map((l) => `<div class="${l.kind}">${l.text}</div>`).join('');
}

/* ============================================================== wiring */
function bind() {
  $('btn-start').addEventListener('click', () => { renderRoster(); showView('roster'); });
  $('btn-reset').addEventListener('click', () => { progress = resetProgress(); renderRoster(); });
  $('btn-deploy').addEventListener('click', () => { renderMissions(); showView('missions'); });
  $('btn-missions-back').addEventListener('click', () => { renderRoster(); showView('roster'); });
  $('btn-story-next').addEventListener('click', advanceStory);

  $('end-turn').addEventListener('click', () => {
    if (cutBusy || !battle || battle.result) return;
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
  $('pause-restart').addEventListener('click', () => { if (battle) beginBattle(battle.mission); });
  $('pause-quit').addEventListener('click', () => {
    $('pause').classList.add('hidden');
    renderMissions();
    showView('missions');
  });
  $('btn-flee') && $('btn-flee').addEventListener('click', () => { renderMissions(); showView('missions'); });

  document.addEventListener('keydown', (e) => {
    if ($('view-battle').classList.contains('hidden') || !battle) return;
    if (e.key === 'Escape') { $('pause').classList.toggle('hidden'); return; }
    if (battle.result || cutBusy) return;
    if (e.key === ' ') { e.preventDefault(); endTurn(battle); renderBattle(); return; }
    const n = Number(e.key);
    if (n >= 1 && n <= battle.hand.length) playFromUI(n - 1);
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
  playFromUI(index) { playFromUI(index); },
  setTeam(ids) { progress.team = ids.slice(0, 3); saveProgress(progress); renderRoster(); },
  openMission(code) {
    const m = MISSIONS.find((x) => x.code === code);
    beginBattle(m);
  },
};
