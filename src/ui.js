import { CHAPTERS, CARDS, CHARACTERS, ROLES } from './data.js';
import { startBattle, playCard, endTurn, damageOf } from './battle.js';
import { loadProgress, saveProgress, resetProgress, chapterUnlocked } from './progress.js';

const $ = (id) => document.getElementById(id);

let progress = loadProgress();
let battle = null;
let chapter = null;
let storyChapter = null;
let storyIndex = 0;
let settled = false;

const VIEWS = ['title', 'story', 'map', 'battle'];
function showView(name) {
  for (const v of VIEWS) $('view-' + v).classList.toggle('hidden', v !== name);
}

function el(tag, cls, html) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

/* ------------------------------------------------------------- map */

function renderMap() {
  const grid = $('chapter-grid');
  grid.innerHTML = '';

  CHAPTERS.forEach((ch, i) => {
    const unlocked = chapterUnlocked(progress, i);
    const cleared = progress.cleared.includes(ch.id);
    const tile = el('button', `chapter${unlocked ? '' : ' locked'}${cleared ? ' cleared' : ''}`);
    tile.innerHTML = `
      <div class="chapter-art" style="--art:url('${CHARACTERS[ch.party[0]].art}')"></div>
      <div class="chapter-title">${ch.title}</div>
      <div class="chapter-place">${ch.place}${cleared ? ' · cleared' : ''}</div>
      <div class="chapter-party">
        ${ch.party.map((id) => `<span class="pip-face" style="--art:url('${CHARACTERS[id].art}')"></span>`).join('')}
        <span class="pip-face" style="--art:url('${enemyArt(ch)}');border-color:#5b1420"></span>
      </div>`;
    tile.addEventListener('click', () => {
      if (!unlocked) return;
      openStory(ch, i);
    });
    grid.appendChild(tile);
  });
}

function enemyArt(ch) {
  const ids = { strep: './images/pathogen-strep.png', toxin: './images/pathogen-toxin.png', biofilm: './images/pathogen-biofilm.png', strain: './images/pathogen-strep.png' };
  return ids[ch.enemies[0]];
}

/* ----------------------------------------------------------- story */

function openStory(ch, index) {
  storyChapter = ch;
  storyIndex = 0;
  renderStoryLine();
  showView('story');
}

function renderStoryLine() {
  const line = storyChapter.story[storyIndex];
  const speaker = line.art ? CHARACTERS[line.art] : null;
  const fallback = CHARACTERS[storyChapter.party[0]];

  $('story-art').style.setProperty('--art', `url('${(speaker || fallback).art}')`);
  $('story-who').textContent = line.who || '';
  $('story-text').textContent = line.text;
  $('btn-story-next').textContent = storyIndex >= storyChapter.story.length - 1 ? 'FIGHT' : 'NEXT';
}

/* ---------------------------------------------------------- battle */

function openChapter(ch, index) {
  chapter = ch;
  battle = startBattle(ch);
  settled = false;
  $('overlay').classList.add('hidden');
  $('battle-title').textContent = ch.title.toUpperCase();
  showView('battle');
  renderBattle();
}

function fighterNode(unit, { enemy = false } = {}) {
  const node = el('div', `fighter${enemy ? ' enemy' : ''}${unit.hp <= 0 ? ' down' : ''}`);
  if (enemy && battle.target === unit.uid) node.classList.add('selected');

  const role = ROLES[unit.role];
  const pct = Math.max(0, (unit.hp / unit.maxHp) * 100);
  const atk = enemy ? Math.max(0, unit.atk - unit.weaken) : unit.atk + unit.atkBuff + unit.tempAtk;

  node.innerHTML = `
    <div class="fighter-art" style="--art:url('${unit.art}')"></div>
    <div class="fighter-shade"></div>
    ${!enemy && unit.shield > 0 ? `<div class="shield-badge">⛨ ${unit.shield}</div>` : ''}
    ${!enemy && unit.taunt > 0 ? '<div class="taunt-badge">TAUNT</div>' : ''}
    <div class="fighter-info">
      <div class="fighter-top">
        <span class="fighter-name">${unit.name}</span>
        ${role ? `<span class="role-chip role-${unit.role}">${role.label}</span>` : ''}
      </div>
      <div class="hpbar"><i style="width:${pct}%"></i></div>
      <div class="fighter-stats">
        <span>♥ <b>${Math.max(0, unit.hp)}</b>/${unit.maxHp}</span>
        <span>⚔ <b>${atk}</b></span>
      </div>
    </div>`;

  if (enemy) {
    node.addEventListener('click', () => {
      if (unit.hp <= 0) return;
      battle.target = unit.uid;
      renderBattle();
    });
  }
  return node;
}

function renderBattle() {
  const party = $('party');
  party.innerHTML = '';
  battle.party.forEach((p) => party.appendChild(fighterNode(p)));

  const foes = $('foes');
  foes.innerHTML = '';
  battle.enemies.forEach((e) => foes.appendChild(fighterNode(e, { enemy: true })));

  $('turn').textContent = battle.turn;

  const energy = $('energy');
  energy.innerHTML = '<div class="energy-label">ATP</div><div class="energy-pips"></div>';
  const pips = el('div', 'energy-pips');
  for (let i = 0; i < Math.max(battle.maxEnergy, battle.energy); i++) {
    pips.appendChild(el('span', `pip${i < battle.energy ? ' on' : ''}`));
  }
  energy.appendChild(pips);

  const hand = $('hand');
  hand.innerHTML = '';
  battle.hand.forEach((id, i) => {
    const card = CARDS[id];
    const owner = battle.party.find((p) => p.id === card.owner);
    const down = !owner || owner.hp <= 0;
    const playable = !down && card.cost <= battle.energy && !battle.result;

    const node = el('div', `card${playable ? '' : ' unplayable'}`);
    const dmg = card.dmg ? damageOf(card, owner) : 0;
    node.innerHTML = `
      <div class="card-art" style="--art:url('${CHARACTERS[card.owner].art}')"></div>
      <span class="card-cost">${card.cost}</span>
      <span class="card-caster">${CHARACTERS[card.owner].name}</span>
      <div class="card-body">
        <div class="card-name">${card.name}</div>
        ${dmg ? `<div class="card-dmg">⚔ ${dmg}${card.hits ? ` ×${card.hits}` : ''}</div>` : ''}
        <div class="card-text">${card.text}</div>
      </div>`;
    node.addEventListener('click', () => {
      const res = playCard(battle, i, battle.target);
      if (!res.ok) return;
      renderBattle();
    });
    hand.appendChild(node);
  });

  const box = $('battle-log');
  box.innerHTML = '';
  battle.log.slice(-2).forEach((entry) => box.appendChild(el('div', entry.kind, entry.text)));

  renderResult();
}

function renderResult() {
  const overlay = $('overlay');
  if (!battle || !battle.result) {
    overlay.classList.add('hidden');
    return;
  }
  overlay.classList.remove('hidden');

  if (!settled) {
    settled = true;
    if (battle.result === 'win' && !progress.cleared.includes(chapter.id)) {
      progress.cleared.push(chapter.id);
      saveProgress(progress);
    }
  }

  const won = battle.result === 'win';
  $('overlay-title').textContent = won ? 'BODY HELD' : 'SQUAD LOST';
  $('overlay-sub').textContent = won
    ? `${chapter.title} cleared in ${battle.turn} turns.`
    : `${chapter.title} — the squad went down in ${battle.turn} turns.`;
  $('overlay-btn').textContent = won ? 'BACK TO MAP' : 'RETRY';
  $('overlay-retry').classList.toggle('hidden', won);
}

/* ---------------------------------------------------------- events */

$('btn-start').addEventListener('click', () => {
  renderMap();
  showView('map');
});

$('btn-title').addEventListener('click', () => showView('title'));

$('btn-reset').addEventListener('click', () => {
  progress = resetProgress();
  renderMap();
});

$('btn-story-next').addEventListener('click', () => {
  if (storyIndex < storyChapter.story.length - 1) {
    storyIndex += 1;
    renderStoryLine();
    return;
  }
  openChapter(storyChapter, CHAPTERS.indexOf(storyChapter));
});

$('end-turn').addEventListener('click', () => {
  endTurn(battle);
  renderBattle();
});

$('overlay-btn').addEventListener('click', () => {
  if (battle.result === 'win') {
    renderMap();
    showView('map');
  } else {
    openChapter(chapter, CHAPTERS.indexOf(chapter));
  }
});

$('overlay-retry').addEventListener('click', () => openChapter(chapter, CHAPTERS.indexOf(chapter)));

/* ------------------------------------------------------------ boot */

showView('title');
