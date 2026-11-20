import { CARDS, START, REGIONS, UNLOCKABLE, ART, ENEMY_ART, SIGIL, REGION_ART } from './data.js';
import { createGame, endTurn, playCard, atkOf, previewEndTurn } from './engine.js';
import {
  loadProgress, saveProgress, resetProgress, regionUnlocked, buildDeck, totalCleared,
} from './progress.js';

const $ = (id) => document.getElementById(id);

let progress = loadProgress();
let game = null;
let region = null;
let settled = false;
let lastWin = null;

const VIEWS = ['menu', 'map', 'lab', 'battle'];
function showView(name) {
  for (const v of VIEWS) $('view-' + v).classList.toggle('hidden', v !== name);
}

function el(tag, cls, html) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

/* ---------------------------------------------------------------- menu */

function renderMenu() {
  $('menu-stem').textContent = progress.stem;
  $('menu-cleared').textContent = totalCleared(progress);
}

/* ----------------------------------------------------------------- map */

function renderMap() {
  $('map-stem').textContent = progress.stem;
  const list = $('region-list');
  list.innerHTML = '';

  REGIONS.forEach((r, i) => {
    const unlocked = regionUnlocked(progress, i);
    const cleared = progress.cleared.includes(r.id);
    const btn = el('button', `region${unlocked ? '' : ' locked'}${cleared ? ' cleared' : ''}`);
    btn.innerHTML = `
      <div class="region-art" style="--art:url('${REGION_ART[r.id]}')"></div>
      <div class="region-top">
        <span class="region-name">${r.name}</span>
        <span class="threat">${'▮'.repeat(r.threat)}</span>
      </div>
      <div class="region-foot">
        <span>${unlocked ? '◈ ' + (cleared ? Math.round(r.reward * 0.25) : r.reward) : '🔒'}</span>
        <span>${r.coreHp}</span>
      </div>`;
    btn.addEventListener('click', () => {
      if (!unlocked) return;
      startRegion(r.id);
    });
    list.appendChild(btn);
  });
}

/* ----------------------------------------------------------------- lab */

function renderLab() {
  $('lab-stem').textContent = progress.stem;
  const list = $('lab-list');
  list.innerHTML = '';

  const ids = Object.keys(UNLOCKABLE).sort((a, b) => UNLOCKABLE[a].cost - UNLOCKABLE[b].cost);

  for (const id of ids) {
    const card = CARDS[id];
    const meta = UNLOCKABLE[id];
    const owned = progress.unlocked.includes(id);
    const affordable = progress.stem >= meta.cost;

    const item = el('div', 'lab-item');
    item.dataset.rarity = card.rarity;
    item.innerHTML = `
      <div class="lab-row">
        <div class="lab-id">
          <div class="lab-thumb" style="--art:url('${ART[id] || ''}')"></div>
          <div>
            <div class="lab-name">${card.name}</div>
            <div class="region-organ">${meta.faction} · ${card.rarity}</div>
          </div>
        </div>
        <button class="buy${owned ? ' owned' : ''}" ${owned || !affordable ? 'disabled' : ''}>
          ${owned ? 'OWNED' : '◈ ' + meta.cost}
        </button>
      </div>
      <div class="lab-text">${card.text}</div>
      ${owned ? '' : `<div class="lab-text" style="color:#6a4f57">adds one copy of ${card.name} to your deck</div>`}`;
    list.appendChild(item);

    if (!owned) {
      item.querySelector('.buy').addEventListener('click', () => {
        if (progress.stem < meta.cost) return;
        progress.stem -= meta.cost;
        progress.unlocked.push(id);
        saveProgress(progress);
        renderLab();
      });
    }
  }
}

/* --------------------------------------------------------------- battle */

function startRegion(id) {
  region = REGIONS.find((r) => r.id === id) || REGIONS[0];
  progress.lastRegion = region.id;
  saveProgress(progress);
  settled = false;
  lastWin = null;

  game = createGame({
    deck: buildDeck(progress),
    coreHp: region.coreHp,
    infection: region.infection,
    infectionGain: region.infectionGain,
    spawnEvery: region.spawnEvery,
    wave: region.wave,
  });

  $('overlay').classList.add('hidden');
  showView('battle');
  renderBattle();
}

function renderHud() {
  $('turn').textContent = game.turn;

  const atp = $('atp');
  atp.innerHTML = '';
  for (let i = 0; i < game.maxAtp; i++) {
    atp.appendChild(el('span', `pip${i < game.atp ? ' on' : ''}`));
  }

  $('infection-val').textContent = `${Math.round(game.infection)}%`;
  $('infection-fill').style.width = `${Math.max(0, Math.min(100, game.infection))}%`;
  $('fever-val').textContent = `${game.inflammation} / ${game.fever}`;
  $('fever-fill').style.width = `${Math.min(100, (game.inflammation / game.fever) * 100)}%`;
  $('core-hp').textContent = `INFECTION SITE ${Math.max(0, game.enemy.coreHp)}`;
}

function renderEnemy() {
  const wrap = $('enemy-slots');
  wrap.innerHTML = '';
  for (let i = 0; i < START.slots; i++) {
    const unit = game.enemy.units[i];
    if (!unit) {
      wrap.appendChild(el('div', 'slot empty', '<span class="muted">—</span>'));
      continue;
    }
    const node = el('div', 'slot unit enemy');
    const atk = Math.max(0, unit.atk - (game.enemy.weaken > 0 ? 2 : 0));
    node.innerHTML = `
      <div class="unit-art" style="--art:url('${ENEMY_ART[unit.id] || ''}')"></div>
      <div class="unit-shade"></div>
      <div class="unit-body">
        <div class="unit-name">${unit.name}</div>
        <div class="unit-stats"><span class="atk">⚔ ${atk}</span><span class="hp">♥ ${Math.max(0, unit.hp)}</span></div>
        <div class="spread">SPREAD +${unit.spread}%</div>
      </div>
      <div class="hpbar"><i style="width:${Math.max(0, unit.hp) / unit.maxHp * 100}%"></i></div>`;
    wrap.appendChild(node);
  }
}

function renderPlayer() {
  const wrap = $('player-slots');
  wrap.innerHTML = '';
  for (let i = 0; i < START.slots; i++) {
    const cell = game.player.cells[i];
    if (!cell) {
      wrap.appendChild(el('div', 'slot empty', '<span class="muted">empty tissue</span>'));
      continue;
    }
    const node = el('div', 'slot unit');
    node.innerHTML = `
      <div class="unit-art" style="--art:url('${ART[cell.id] || ''}')"></div>
      <div class="unit-shade"></div>
      <div class="unit-body">
        <div class="unit-name">${cell.name}</div>
        <div class="unit-stats"><span class="atk">⚔ ${atkOf(game, cell)}</span><span class="hp">♥ ${Math.max(0, cell.hp)}</span></div>
      </div>
      <div class="hpbar"><i style="width:${Math.max(0, cell.hp) / cell.maxHp * 100}%"></i></div>`;
    wrap.appendChild(node);
  }
}

function renderHand() {
  const hand = $('hand');
  hand.innerHTML = '';
  game.hand.forEach((id, index) => {
    const card = CARDS[id];
    const affordable = card.cost <= game.atp && !game.result;
    const node = el('div', `card type-${card.type}${affordable ? '' : ' unaffordable'}`);
    node.dataset.rarity = card.rarity || 'common';

    const art = ART[id];
    const artHtml = art
      ? `<div class="card-art" style="--art:url('${art}')"></div>`
      : `<div class="card-art sigil">${SIGIL[id] || '✷'}</div>`;

    node.innerHTML = `
      ${artHtml}
      <span class="card-cost">${card.cost}</span>
      <span class="card-type">${card.type === 'cell' ? 'CELL' : 'CYTOKINE'}</span>
      <div class="card-body">
        <div class="card-name">${card.name}</div>
        ${card.type === 'cell'
          ? `<div class="card-stats"><span class="atk">⚔ ${card.atk}</span><span class="hp">♥ ${card.hp}</span></div>`
          : `<div class="card-text">${card.text}</div>`}
      </div>`;
    node.addEventListener('click', () => {
      const res = playCard(game, index);
      if (!res.ok) return flash(res.error);
      renderBattle();
    });
    hand.appendChild(node);
  });

  $('deck-count').textContent = `deck ${game.deck.length} · discard ${game.discard.length}`;
  $('antibodies').textContent = game.player.antibodies ? `antibodies ${game.player.antibodies}` : '';
}

function renderLog() {
  const box = $('log');
  box.innerHTML = '';
  for (const entry of game.log.slice(-2)) {
    box.appendChild(el('div', entry.kind, entry.text));
  }
}

function renderPreview() {
  const box = $('preview');
  if (game.result) {
    box.innerHTML = '';
    return;
  }
  const p = previewEndTurn(game);
  const feverWarn = p.feverAtEnd
    ? '<span class="danger">🔥 FEVER</span>'
    : `<span style="opacity:.6">🌡 ${game.fever - game.inflammation}</span>`;
  box.innerHTML = `<b>⚔ ${p.myDamage}</b> · <span class="danger">+${p.theirSpread}%</span> · ◆ ${p.coreHp} · ${feverWarn}`;
}

function settle() {
  if (!game || !game.result || settled) return;
  settled = true;
  const first = !progress.cleared.includes(region.id);

  if (game.result === 'win') {
    const gain = first ? region.reward : Math.round(region.reward * 0.25);
    if (first) progress.cleared.push(region.id);
    progress.stem += gain;
    saveProgress(progress);
    lastWin = { gain, first };
  } else {
    lastWin = null;
  }
}

function renderOverlay() {
  const overlay = $('overlay');
  if (!game || !game.result) {
    overlay.classList.add('hidden');
    return;
  }
  settle();
  overlay.classList.remove('hidden');

  const won = game.result === 'win';
  $('overlay-title').textContent = won ? 'BODY HELD' : 'HOST LOST';
  $('overlay-sub').textContent = won
    ? `${region.name} cleared on turn ${game.turn}. ${region.organ}.`
    : `Infection hit 100% on turn ${game.turn}. ${region.name} is still yours to take.`;

  const rewardBox = $('overlay-reward');
  if (won && lastWin) {
    rewardBox.classList.remove('hidden');
    rewardBox.innerHTML = `+${lastWin.gain} STEM CELLS${lastWin.first ? ' · FIRST CLEAR' : ' · REPLAY'}`;
  } else {
    rewardBox.classList.add('hidden');
  }

  $('overlay-btn').textContent = won ? 'BACK TO MAP' : 'GIVE UP';
  $('overlay-retry').classList.toggle('hidden', won);
}

function renderBattle() {
  renderHud();
  renderEnemy();
  renderPlayer();
  renderHand();
  renderLog();
  renderPreview();
  renderOverlay();
}

function flash(message) {
  if (!message) return;
  $('log').appendChild(el('div', 'bad', message));
}

/* --------------------------------------------------------------- events */

$('btn-continue').addEventListener('click', () => {
  renderMap();
  showView('map');
});
$('btn-map-back').addEventListener('click', () => {
  renderMenu();
  showView('menu');
});
$('btn-lab-menu').addEventListener('click', () => {
  renderLab();
  showView('lab');
});
$('btn-lab').addEventListener('click', () => {
  renderLab();
  showView('lab');
});
$('btn-lab-back').addEventListener('click', () => {
  renderMap();
  showView('map');
});
$('btn-reset').addEventListener('click', () => {
  progress = resetProgress();
  renderMenu();
});

$('end-turn').addEventListener('click', () => {
  endTurn(game);
  renderBattle();
  if (game.log.some((l) => l.kind === 'fever')) {
    $('app').classList.add('fevering');
    setTimeout(() => $('app').classList.remove('fevering'), 600);
  }
});
$('restart').addEventListener('click', () => startRegion(region.id));
$('btn-quit').addEventListener('click', () => {
  renderMap();
  showView('map');
});

$('overlay-btn').addEventListener('click', () => {
  renderMap();
  showView('map');
});
$('overlay-retry').addEventListener('click', () => startRegion(region.id));

/* ---------------------------------------------------------------- boot */

renderMenu();
showView('menu');
