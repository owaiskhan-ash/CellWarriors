import { CARDS, START } from './data.js';
import { createGame, endTurn, playCard, atkOf, previewEndTurn } from './engine.js';

const $ = (id) => document.getElementById(id);
let state = createGame();
let lastLogLength = 0;

function el(tag, cls, html) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function renderHud() {
  $('turn').textContent = state.turn;

  const atp = $('atp');
  atp.innerHTML = '';
  for (let i = 0; i < state.maxAtp; i++) {
    atp.appendChild(el('span', `pip${i < state.atp ? ' on' : ''}`));
  }

  $('infection-val').textContent = `${Math.round(state.infection)}%`;
  $('infection-fill').style.width = `${Math.max(0, Math.min(100, state.infection))}%`;

  $('fever-val').textContent = `${state.inflammation} / ${state.fever}`;
  $('core-hp').textContent = `INFECTION SITE ${Math.max(0, state.enemy.coreHp)}`;
  $('fever-fill').style.width = `${Math.min(100, (state.inflammation / state.fever) * 100)}%`;
}

function renderEnemy() {
  const wrap = $('enemy-slots');
  wrap.innerHTML = '';
  for (let i = 0; i < START.slots; i++) {
    const unit = state.enemy.units[i];
    if (!unit) {
      wrap.appendChild(el('div', 'slot empty', '<span class="muted">—</span>'));
      continue;
    }
    const node = el('div', 'slot unit enemy');
    node.innerHTML = `
      <div>
        <div class="unit-name">${unit.name}</div>
        <div class="unit-stats">
          <span class="atk">⚔ ${Math.max(0, unit.atk - (state.enemy.weaken > 0 ? 2 : 0))}</span>
          <span class="hp">♥ ${Math.max(0, unit.hp)}</span>
        </div>
      </div>
      <div class="spread">SPREAD +${unit.spread}%</div>
      <div class="hpbar"><i style="width:${(Math.max(0, unit.hp) / unit.maxHp) * 100}%"></i></div>
    `;
    wrap.appendChild(node);
  }
}

function renderPlayer() {
  const wrap = $('player-slots');
  wrap.innerHTML = '';
  for (let i = 0; i < START.slots; i++) {
    const cell = state.player.cells[i];
    if (!cell) {
      wrap.appendChild(el('div', 'slot empty', '<span class="muted">empty tissue</span>'));
      continue;
    }
    const node = el('div', 'slot unit');
    node.innerHTML = `
      <div>
        <div class="unit-name">${cell.name}</div>
        <div class="unit-stats">
          <span class="atk">⚔ ${atkOf(state, cell)}</span>
          <span class="hp">♥ ${Math.max(0, cell.hp)}</span>
        </div>
      </div>
      <div class="hpbar"><i style="width:${(Math.max(0, cell.hp) / cell.maxHp) * 100}%"></i></div>
    `;
    wrap.appendChild(node);
  }
}

function renderHand() {
  const hand = $('hand');
  hand.innerHTML = '';
  state.hand.forEach((id, index) => {
    const card = CARDS[id];
    const affordable = card.cost <= state.atp && !state.result;
    const node = el('div', `card type-${card.type}${affordable ? '' : ' unaffordable'}`);
    node.dataset.rarity = card.rarity || 'common';
    node.innerHTML = `
      <div class="card-top">
        <span class="card-cost">${card.cost}</span>
        <span class="card-type">${card.type === 'cell' ? 'CELL' : 'CYTOKINE'}</span>
      </div>
      <div class="card-name">${card.name}</div>
      ${card.type === 'cell'
        ? `<div class="card-stats"><span class="atk">⚔ ${card.atk}</span><span class="hp">♥ ${card.hp}</span></div>`
        : ''}
      <div class="card-text">${card.text}</div>
    `;
    node.addEventListener('click', () => {
      const res = playCard(state, index);
      if (!res.ok) return flash(res.error);
      render();
    });
    hand.appendChild(node);
  });
}

function renderLog() {
  const box = $('log');
  box.innerHTML = '';
  state.log.slice(-4).forEach((entry) => {
    box.appendChild(el('div', entry.kind, entry.text));
  });
  if (state.log.length !== lastLogLength) {
    lastLogLength = state.log.length;
  }
}

function renderPreview() {
  const p = previewEndTurn(state);
  const box = $('preview');
  if (state.result) {
    box.innerHTML = '';
    return;
  }
  const feverWarn = p.feverAtEnd
    ? '<span class="danger">FEVER fires at end of turn.</span>'
    : `${state.fever - state.inflammation} Inflammation until fever.`;
  box.innerHTML = `End turn → you hit for <b>${p.myDamage}</b>, pathogens spread <b>+${p.theirSpread}%</b> (site ${p.coreHp}).<br>${feverWarn}`;
}

function renderOverlay() {
  const overlay = $('overlay');
  if (!state.result) {
    overlay.classList.add('hidden');
    return;
  }
  overlay.classList.remove('hidden');
  $('overlay-title').textContent = state.result === 'win' ? 'BODY HELD' : 'HOST LOST';
  $('overlay-sub').textContent =
    state.result === 'win'
      ? `Infection cleared on turn ${state.turn}. Antibodies ${state.player.antibodies}.`
      : `Infection hit 100% on turn ${state.turn}. Rebuild the deck and try again.`;
}

function render() {
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
  const box = $('log');
  box.appendChild(el('div', 'bad', message));
}

$('end-turn').addEventListener('click', () => {
  endTurn(state);
  render();
  if (state.log.some((l) => l.kind === 'fever')) {
    document.getElementById('app').classList.add('fevering');
    setTimeout(() => document.getElementById('app').classList.remove('fevering'), 600);
  }
});

$('restart').addEventListener('click', () => {
  state = createGame();
  lastLogLength = 0;
  render();
});

$('overlay-btn').addEventListener('click', () => {
  state = createGame();
  lastLogLength = 0;
  render();
});

render();
