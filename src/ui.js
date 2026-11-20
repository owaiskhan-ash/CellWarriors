import { CHARACTERS, CARDS, MISSIONS, ROLES, ELEMENTS } from './data.js';
import { startBattle, playCard, endTurn, damageOf } from './battle.js';
import { loadProgress, saveProgress, resetProgress, missionUnlocked } from './progress.js';

const $ = (id) => document.getElementById(id);

let progress = loadProgress();
let battle = null;
let mission = null;
let pendingMission = null;
let storyIndex = 0;
let settled = false;

const VIEWS = ['title', 'roster', 'missions', 'story', 'battle'];
const showView = (name) => VIEWS.forEach((v) => $('view-' + v).classList.toggle('hidden', v !== name));

const el = (tag, cls, html) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html !== undefined) node.innerHTML = html;
  return node;
};

/* ------------------------------------------------------------ roster */

function renderRoster() {
  const grid = $('roster');
  grid.innerHTML = '';

  for (const [id, c] of Object.entries(CHARACTERS)) {
    const selected = progress.team.includes(id);
    const elem = ELEMENTS[c.element];
    const role = ROLES[c.role];

    const card = el('button', `roster-card${selected ? ' selected' : ''}`);
    card.innerHTML = `
      <div class="roster-top">
        <span class="lvl">LV <b>${c.level}</b></span>
        <span class="elem" style="color:${elem.colour}">${elem.glyph}</span>
      </div>
      <div class="roster-art"><img src="${c.art}" alt="${c.name}" /></div>
      <div class="roster-info">
        <span class="roster-name">${c.name}</span>
        <span class="roster-cell">${c.cell}</span>
        <span class="role-chip ${role.cls}">${role.label}</span>
        <div class="roster-stats">
          <span>♥ <b>${c.hp}</b></span>
          <span>⚔ <b>${c.atk}</b></span>
        </div>
      </div>`;

    card.addEventListener('click', () => toggleTeam(id));
    grid.appendChild(card);
  }

  $('team-count').textContent = `${progress.team.length} / 3`;

  const strip = $('team-strip');
  strip.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const id = progress.team[i];
    const slot = el('div', 'team-slot');
    if (id) slot.innerHTML = `<img src="${CHARACTERS[id].art}" alt="${CHARACTERS[id].name}" />`;
    strip.appendChild(slot);
  }

  $('btn-deploy').disabled = progress.team.length !== 3;
}

function toggleTeam(id) {
  const at = progress.team.indexOf(id);
  if (at !== -1) {
    progress.team.splice(at, 1);
  } else {
    if (progress.team.length >= 3) progress.team.shift();
    progress.team.push(id);
  }
  saveProgress(progress);
  renderRoster();
}

/* ---------------------------------------------------------- missions */

function renderMissions() {
  const list = $('mission-list');
  list.innerHTML = '';
  $('mission-team').textContent = `${progress.team.map((id) => CHARACTERS[id].name).join(' · ')}`;

  MISSIONS.forEach((m, i) => {
    const unlocked = missionUnlocked(progress, i);
    const cleared = progress.cleared.includes(m.id);
    const tile = el('button', `mission${unlocked ? '' : ' locked'}${cleared ? ' cleared' : ''}`);
    tile.innerHTML = `
      <div class="mission-art" style="--art:url('${CHARACTERS[MISSIONS[i].id === m.id ? progress.team[0] : 'kaito'].art}')"></div>
      <div class="mission-code">${m.code}${cleared ? ' · CLEARED' : ''}</div>
      <div class="mission-name">${m.name}</div>
      <div class="mission-place">${m.place} · threat ${'▮'.repeat(m.threat)}</div>`;
    tile.addEventListener('click', () => {
      if (!unlocked) return;
      openStory(m);
    });
    list.appendChild(tile);
  });
}

/* ------------------------------------------------------------- story */

function openStory(m) {
  pendingMission = m;
  storyIndex = 0;
  paintStory();
  showView('story');
}

function paintStory() {
  const line = pendingMission.story[storyIndex];
  const art = line.art ? CHARACTERS[line.art].art : CHARACTERS[progress.team[0]].art;
  $('story-art').style.setProperty('--art', `url('${art}')`);
  $('story-who').textContent = line.who || '';
  $('story-text').textContent = line.text;
  const last = storyIndex >= pendingMission.story.length - 1;
  $('btn-story-next').textContent = last ? 'DEPLOY' : 'NEXT';
}

/* ------------------------------------------------------------ battle */

function openBattle(m) {
  mission = m;
  battle = startBattle(m, progress.team);
  settled = false;
  $('overlay').classList.add('hidden');
  showView('battle');
  renderBattle();
}

function renderBattle() {
  const totalMax = battle.party.reduce((n, p) => n + p.maxHp, 0);
  const totalNow = battle.party.reduce((n, p) => n + Math.max(0, p.hp), 0);
  $('hp-now').textContent = totalNow;
  $('hp-max').textContent = totalMax;
  $('hp-fill').style.width = `${(totalNow / totalMax) * 100}%`;
  $('turn').textContent = battle.turn;

  const lineup = $('lineup');
  lineup.innerHTML = '';
  for (const p of battle.party) {
    const node = el('div', `fighter${p.hp <= 0 ? ' down' : ''}`);
    node.innerHTML = `
      <img src="${p.art}" alt="${p.name}" />
      ${p.shield > 0 ? `<span class="shield-dot">⛨ ${p.shield}</span>` : ''}
      <div class="fighter-tag">
        <div class="mini-hp"><i style="width:${Math.max(0, (p.hp / p.maxHp) * 100)}%"></i></div>
        <span class="fighter-name">${p.name} ${p.hp > 0 ? p.hp : 'DOWN'}</span>
      </div>`;
    lineup.appendChild(node);
  }

  const row = $('enemies');
  row.innerHTML = '';
  for (const e of battle.enemies) {
    const node = el('div', `enemy${e.hp <= 0 ? ' dead' : ''}${battle.target === e.uid ? ' selected' : ''}`);
    node.innerHTML = `
      <div class="enemy-hud">
        <div class="enemy-hp"><i style="width:${Math.max(0, (e.hp / e.maxHp) * 100)}%"></i></div>
        <div class="enemy-stats"><span>♥ ${Math.max(0, e.hp)}</span><span>⚔ ${Math.max(0, e.atk - e.weaken)}</span></div>
      </div>
      <div class="enemy-frame">
        <img src="${e.art}" alt="${e.name}" />
        <span class="atk-badge">${Math.max(0, e.atk - e.weaken)}</span>
        <span class="enemy-name">${e.name}</span>
      </div>`;
    node.addEventListener('click', () => {
      if (e.hp <= 0) return;
      battle.target = e.uid;
      renderBattle();
    });
    row.appendChild(node);
  }

  const pips = $('ep-pips');
  pips.innerHTML = '';
  for (let i = 0; i < battle.maxEnergy; i++) {
    pips.appendChild(el('i', i < battle.energy ? 'on' : ''));
  }
  $('ep').textContent = battle.energy;

  const hand = $('hand');
  hand.innerHTML = '';
  battle.hand.forEach((id, i) => {
    const card = CARDS[id];
    const owner = battle.party.find((p) => p.id === card.owner);
    const playable = owner && owner.hp > 0 && card.cost <= battle.energy && !battle.result;
    const dmg = card.dmg ? damageOf(card, owner) : 0;

    const node = el('div', `card${playable ? '' : ' unplayable'}`);
    node.dataset.type = card.type;
    node.innerHTML = `
      <div class="card-head">
        <span class="card-cost">${card.cost}</span>
        <span class="card-title">
          <span class="card-name">${card.name}</span>
          <span class="card-type">${card.type === 'Attack' ? '✖ Attack' : '◈ Skill'} · ${CHARACTERS[card.owner].name}</span>
        </span>
      </div>
      <div class="card-art" style="--art:url('${card.art}')">
        ${dmg ? `<span class="card-dmg">⚔ ${dmg}${card.hits ? ` ×${card.hits}` : ''}</span>` : ''}
      </div>
      <div class="card-foot"><div class="card-text">${describe(card)}</div></div>`;

    node.addEventListener('click', () => {
      if (!playable) return;
      const res = playCard(battle, i, battle.target);
      if (res.ok) renderBattle();
    });
    hand.appendChild(node);
  });

  const logBox = $('combat-log');
  logBox.innerHTML = '';
  battle.log.slice(-2).forEach((entry) => logBox.appendChild(el('div', entry.kind, entry.text)));

  renderResult();
}

function describe(card) {
  const bits = [];
  if (card.dmg) bits.push(`${card.dmg} dmg${card.hits ? ` ×${card.hits}` : ''}${card.target === 'allEnemies' ? ' to all' : ''}`);
  if (card.heal) bits.push(`heal ${card.heal}${card.target === 'allAllies' ? ' (squad)' : ''}`);
  if (card.shield) bits.push(`shield ${card.shield}${card.target === 'allAllies' ? ' (squad)' : ''}`);
  if (card.tempAtk) bits.push(`+${card.tempAtk} ATK this turn`);
  if (card.energy) bits.push(`+${card.energy} EP`);
  if (card.taunt) bits.push(`taunt ${card.taunt}`);
  if (card.selfDamage) bits.push(`self −${card.selfDamage}`);
  return bits.join(' · ') || '—';
}

function renderResult() {
  const overlay = $('overlay');
  if (!battle.result) {
    overlay.classList.add('hidden');
    return;
  }
  overlay.classList.remove('hidden');

  if (!settled) {
    settled = true;
    if (battle.result === 'win' && !progress.cleared.includes(mission.id)) {
      progress.cleared.push(mission.id);
      saveProgress(progress);
    }
  }

  const won = battle.result === 'win';
  $('overlay-title').textContent = won ? 'MISSION CLEAR' : 'SQUAD WIPED';
  $('overlay-sub').textContent = won
    ? `${mission.code} ${mission.name} — cleared in ${battle.turn} turns.`
    : `${mission.name} — the squad went down in ${battle.turn} turns.`;
  $('overlay-btn').textContent = won ? 'BACK TO MISSIONS' : 'RETRY';
  $('overlay-retry').classList.toggle('hidden', won);
}

/* ------------------------------------------------------------ events */

$('btn-start').addEventListener('click', () => {
  renderRoster();
  showView('roster');
});

$('btn-deploy').addEventListener('click', () => {
  if (progress.team.length !== 3) return;
  renderMissions();
  showView('missions');
});

$('btn-missions-back').addEventListener('click', () => {
  renderRoster();
  showView('roster');
});

$('btn-reset').addEventListener('click', () => {
  progress = resetProgress();
  renderRoster();
});

$('btn-story-next').addEventListener('click', () => {
  if (storyIndex < pendingMission.story.length - 1) {
    storyIndex += 1;
    paintStory();
    return;
  }
  openBattle(pendingMission);
});

$('end-turn').addEventListener('click', () => {
  if (battle.result) return;
  endTurn(battle);
  renderBattle();
});

$('overlay-btn').addEventListener('click', () => {
  if (battle.result === 'win') {
    renderMissions();
    showView('missions');
  } else {
    openBattle(mission);
  }
});

$('overlay-retry').addEventListener('click', () => openBattle(mission));

/* -------------------------------------------------------------- boot */

showView('title');
