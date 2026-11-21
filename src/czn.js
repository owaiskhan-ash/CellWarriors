/* =========================================================================
   CELL WARRIORS — CZN SHELL
   -------------------------------------------------------------------------
   Chaos Zero Nightmare gives every screen the same furniture: a paper-white
   (menus) or ink-black (battle) backdrop, a chevron back chip, a cyan corridor
   rail, hex/plate chips for currency, a mission rail down the right edge, and
   a bottom command ribbon. This module owns that furniture for the whole app
   so no screen invents its own header again.

   It also owns the two *lobby* surfaces the game did not have:
     · CZN HUB  — the ship-deck landing screen (big character cut-out, right
                  mission rail, live counters). This is the real CZN title.
     · the screens' currency/ID header, painted above the functional row.

   Nothing here touches battle geometry: scripts/battle-fit.mjs still owns the
   hand strip and the rails, and this file never adds a node inside
   #view-battle's .battle-stage.
   ========================================================================= */

/* ------------------------------------------------------------------ */
/* 1 - artwork swapping                                                */
/* ------------------------------------------------------------------ */
const CZN_BG = {
  'view-roster': 'images/czn/bg-hub.jpg',
  'view-title': 'images/czn/bg-lobby.jpg',
  'view-character': 'images/czn/bg-showcase.jpg',
  'view-missions': 'images/czn/bg-showcase.jpg',
};
let cznBgReady = false;
function cznPaintBackdrops() {
  if (cznBgReady) return;
  cznBgReady = true;
  for (const [viewId, src] of Object.entries(CZN_BG)) {
    const view = document.getElementById(viewId);
    if (!view || view.querySelector(':scope > .czn-backdrop')) continue;
    const plate = document.createElement('div');
    plate.className = 'czn-backdrop';
    plate.setAttribute('aria-hidden', 'true');
    plate.innerHTML = `<img src="${src}" alt="" /><i class="czn-backdrop-veil"></i><span class="czn-backdrop-scan"></span>`;
    view.insertBefore(plate, view.firstChild);
  }
  const bg = document.getElementById('battle-bg-img');
  if (bg) bg.src = 'images/czn/bg-battle.jpg';
  const battle = document.getElementById('view-battle');
  if (battle && !battle.querySelector(':scope > .czn-battle-glow')) {
    const glow = document.createElement('span');
    glow.className = 'czn-battle-glow';
    glow.setAttribute('aria-hidden', 'true');
    battle.insertBefore(glow, battle.firstChild);
  }
  const mapBg = document.querySelector('#view-map .map-bg img');
  if (mapBg) mapBg.src = 'images/czn/bg-chaosmap.jpg';
  const rosterBg = document.querySelector('#view-roster .roster-bg');
  if (rosterBg) rosterBg.remove();
}

/* ------------------------------------------------------------------ */
/* 2 - icon set (thin line glyphs, CZN plate language)                 */
/* ------------------------------------------------------------------ */
const CZN_ICONS = {
  energy: 'M13 2L4 14h6l-1 8 9-12h-6z',
  gear: 'M12 8.2a3.8 3.8 0 100 7.6 3.8 3.8 0 000-7.6zM19.6 14.6l1.6 1.1-1.1 2.7-1.9-.5-1.4 1.4.5 1.9-2.7 1.1-1.1-1.6h-2l-1.1 1.6-2.7-1.1.5-1.9L6.4 17.9l-1.9.5-1.1-2.7 1.6-1.1v-2L3.4 11.5l1.1-2.7 1.9.5 1.4-1.4-.5-1.9 2.7-1.1 1.1 1.6h2l1.1-1.6 2.7 1.1-.5 1.9 1.4 1.4 1.9-.5 1.1 2.7-1.6 1.1z',
  star: 'M12 3.2l2.5 5.4 5.9.7-4.3 4.1 1.1 5.9-5.2-2.9-5.2 2.9 1.1-5.9L4 9.3l5.9-.7z',
  book: 'M6 4.5h12a1 1 0 011 1V20a1 1 0 01-1.4.9L12 18.3l-5.6 2.6A1 1 0 015 20V5.5a1 1 0 011-1z',
  layers: 'M12 3.1l8.4 4.6-8.4 4.6-8.4-4.6 8.4-4.6zM3.6 12l8.4 4.6 8.4-4.6M3.6 16.4l8.4 4.6 8.4-4.6',
  diamond: 'M12 2.4l9.6 9.6-9.6 9.6L2.4 12z',
  chevron: 'M9 5l7 7-7 7',
};
const cznIco = (d, cls = '') => `<svg class="czn-ico ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/></svg>`;

/* ------------------------------------------------------------------ */
/* 3 - currency / ID header  (CZN:  (hex) 240/240+   *  []  (gear)  = ) */
/* ------------------------------------------------------------------ */
function cznHeaderHTML({ energy = '240/240+', id = 'ID-07A' } = {}) {
  return `
    <div class="czn-hud-meter" title="Host energy - spends on expeditions">
      <span class="czn-hud-core">${cznIco(CZN_ICONS.energy)}</span>
      <b class="czn-hud-energy" data-czn="energy">${energy}</b>
      <i class="czn-hud-plus">+</i>
    </div>
    <div class="czn-hud-icons">
      <button class="czn-hud-cell" data-czn-act="lab" title="Cell Lab - awaken combatants">${cznIco(CZN_ICONS.star)}</button>
      <button class="czn-hud-cell" data-czn-act="codex" title="Combat Guide">${cznIco(CZN_ICONS.book)}</button>
      <button class="czn-hud-cell" data-czn-act="settings" title="Settings">${cznIco(CZN_ICONS.gear)}</button>
      <button class="czn-hud-cell" data-czn-act="menu" title="Menu">${cznIco(CZN_ICONS.layers)}</button>
      <span class="czn-hud-id">${id}</span>
      <i class="czn-hud-tick"></i>
    </div>`;
}
function cznWireHeader(hud) {
  hud.querySelectorAll('[data-czn-act]').forEach((b) => {
    b.addEventListener('click', () => {
      const act = b.dataset.cznAct;
      window.__cw && window.__cw.sfx && window.__cw.sfx('click');
      if (act === 'settings') document.getElementById('btn-open-settings-title').click();
      else if (act === 'codex') document.getElementById('btn-open-guide').click();
      else if (act === 'lab') document.getElementById('btn-open-lab').click();
      else if (act === 'menu') window.__cw && window.__cw.showView && window.__cw.showView('title');
    });
  });
}
const CZN_HEAD_SCREENS = ['view-roster', 'view-missions', 'view-character'];
function cznBuildHeaders() {
  for (const viewId of CZN_HEAD_SCREENS) {
    const view = document.getElementById(viewId);
    if (!view || view.querySelector(':scope > .czn-screen-hud')) continue;
    const hud = document.createElement('div');
    hud.className = 'czn-screen-hud';
    hud.innerHTML = cznHeaderHTML();
    view.insertBefore(hud, view.firstChild);
    cznWireHeader(hud);
  }
}

/* ------------------------------------------------------------------ */
/* 4 - the CZN HUB                                                     */
/* ------------------------------------------------------------------ */
const HUB_MISSIONS = [
  { key: 'missions', name: 'Missions', sub: 'Chapter 3 Completed', glyph: 'missions' },
  { key: 'simulation', name: 'Simulation', sub: 'Chamber - 999,999', glyph: 'sim' },
  { key: 'chaos', name: 'Chaos', sub: 'Expedition - 11 floors', glyph: 'chaos' },
  { key: 'ark', name: 'Ark City', sub: 'Awaiting policies', glyph: 'ark', badge: '5' },
  { key: 'combatants', name: 'Combatants', sub: '6 online - pick 3', glyph: 'crew' },
  { key: 'rescue', name: 'Rescue', sub: 'Recover vestiges', glyph: 'rescue' },
];
const CZN_GLYPH = {
  missions: '<circle cx="24" cy="24" r="15"/><circle cx="24" cy="24" r="9"/><path d="M24 4v6M24 38v6M4 24h6M38 24h6"/>',
  sim: '<circle cx="24" cy="24" r="2.5"/><ellipse cx="24" cy="24" rx="18" ry="7"/><ellipse cx="24" cy="24" rx="18" ry="7" transform="rotate(60 24 24)"/><ellipse cx="24" cy="24" rx="18" ry="7" transform="rotate(120 24 24)"/>',
  chaos: '<path d="M24 5l16.5 9.5v19L24 43 7.5 33.5v-19z"/><path d="M24 15l8.5 5v8l-8.5 5-8.5-5v-8z"/>',
  ark: '<path d="M8 30h32M11 30l6-16h14l6 16M18 20h12M24 14v16M7 37h34"/>',
  crew: '<circle cx="17" cy="19" r="6"/><circle cx="32" cy="21" r="5"/><path d="M6 40c0-7 5-11 11-11s11 4 11 11M28 32c6 0 10 3 10 8"/>',
  rescue: '<circle cx="24" cy="24" r="15"/><circle cx="24" cy="24" r="6"/><path d="M24 9v7M24 32v7M9 24h7M32 24h7"/>',
};

let cznHubReady = false;
let hubHero = 'kaito';

function cznBuildHub() {
  if (cznHubReady) return;
  const title = document.getElementById('view-title');
  if (!title) return;
  cznHubReady = true;

  const layer = document.createElement('div');
  layer.className = 'czn-hub';
  layer.innerHTML = [
    '<div class="czn-hub-hud">', cznHeaderHTML({ energy: '240/240+', id: 'ID-07A' }), '</div>',
    '<div class="czn-hub-top">',
    '  <div class="czn-lvplate">',
    '    <span class="czn-lv-word">LV</span>',
    '    <b class="czn-lv-num" id="czn-hub-lv">25</b>',
    '    <div class="czn-lv-meter"><i style="width:2%"></i></div>',
    '    <span class="czn-lv-note"><b id="czn-hub-lead">Kaito</b><br>2%</span>',
    '  </div>',
    '  <button class="czn-taskcard" id="czn-hub-task" type="button">',
    '    <span class="czn-task-ico">', cznIco(CZN_ICONS.diamond), '</span>',
    '    <span class="czn-task-txt"><b id="czn-task-main">to level 30</b><small><i id="czn-task-prog">2 / 3</i> Raise a combatant</small></span>',
    '  </button>',
    '</div>',
    '<div class="czn-hub-crew" aria-hidden="true">',
    '  <div class="czn-crew-pod pod-a"><span class="pod-plate"></span></div>',
    '  <div class="czn-crew-pod pod-b"><span class="pod-plate"></span></div>',
    '  <div class="czn-crew-pod pod-c"><span class="pod-plate"></span></div>',
    '  <div class="czn-crew-pod pod-d"><span class="pod-plate"></span></div>',
    '  <div class="czn-crew-pod pod-e"><span class="pod-plate"></span></div>',
    '  <div class="czn-crew-pod pod-f"><span class="pod-plate"></span></div>',
    '</div>',
    '<div class="czn-hub-stage">',
    '  <div class="czn-hub-portrait" id="czn-hub-portrait">',
    '    <span class="czn-portrait-halo"></span>',
    '    <img id="czn-hub-img" src="" alt="" />',
    '    <span class="czn-portrait-plinth"></span>',
    '  </div>',
    '  <button class="czn-hub-name" id="czn-hub-namebtn" type="button">',
    '    <b id="czn-hub-cname">Kaito</b>',
    '    <small id="czn-hub-cmeta">Neutrophil - Striker</small>',
    '  </button>',
    '  <div class="czn-hub-thumbs" id="czn-hub-thumbs"></div>',
    '</div>',
    '<div class="czn-hub-rail" id="czn-hub-rail"></div>',
    '<div class="czn-hub-gift">',
    '  <span class="czn-gift-figure"></span>',
    '  <span class="czn-gift-txt"><small>CORONOVIRIDAE</small><b>GIFT</b><i>Awaiting signal</i></span>',
    '  <span class="czn-gift-dot"></span>',
    '</div>',
    /* HOME: one primary action and three destinations. TEAM is the fourth
       (it is where CONTINUE RUN lives when a run is in progress), SIM/LAB is
       one entry, and CONFIG holds settings + reset. Same controls as before,
       a third of the chrome. */
    '<div class="czn-hub-cmd">',
    '  <button class="czn-cmd-main" id="czn-cmd-expedition" type="button">',
    '    <span class="czn-cmd-chev">', cznIco(CZN_ICONS.chevron), '</span><b>CHAOS EXPEDITION</b><small>Elite route - 11 floors</small>',
    '  </button>',
    '  <button class="czn-cmd-link" id="czn-cmd-resume" type="button"><b>CONTINUE RUN</b></button>',
    '  <button class="czn-cmd-link" id="czn-cmd-deck" type="button">', cznIco(CZN_ICONS.layers), 'TEAM</button>',
    '  <button class="czn-cmd-link" id="czn-cmd-sim" type="button">', cznIco(CZN_ICONS.diamond), 'SIM - LAB</button>',
    '  <button class="czn-cmd-link quiet" id="czn-cmd-settings" type="button">', cznIco(CZN_ICONS.gear), 'CONFIG</button>',
    '  <button class="czn-cmd-link quiet" id="czn-cmd-reset" type="button">RESET</button>',
    '</div>',
  ].join('');
  title.appendChild(layer);

  const rail = layer.querySelector('#czn-hub-rail');
  rail.innerHTML = HUB_MISSIONS.map((m) => [
    `<button class="czn-rail-row" data-hub="${m.key}" type="button">`,
    '<i class="czn-rail-line" aria-hidden="true"></i>',
    m.badge ? `<i class="czn-rail-badge">${m.badge}</i>` : '',
    `<span class="czn-rail-txt"><b>${m.name}</b><small>${m.sub}</small></span>`,
    `<span class="czn-rail-glyph"><svg viewBox="0 0 48 48" aria-hidden="true">${CZN_GLYPH[m.glyph]}</svg></span>`,
    '</button>',
  ].join('')).join('');

  const go = (k) => {
    const cw = window.__cw;
    if (!cw) return;
    cw.sfx && cw.sfx('click');
    if (k === 'missions') { cw.setMode('story'); cw.showView('missions'); }
    else if (k === 'simulation') cw.openSim();
    else if (k === 'chaos') layer.querySelector('#czn-cmd-expedition').click();
    else if (k === 'ark') cw.openLab((cw.progress && cw.progress.team[0]) || 'kaito');
    else if (k === 'combatants') { cw.setMode('chaos'); cw.showView('roster'); }
    else if (k === 'rescue') { cw.setMode('story'); cw.showView('missions'); }
  };
  rail.querySelectorAll('[data-hub]').forEach((b) => b.addEventListener('click', () => go(b.dataset.hub)));

  const thumbs = layer.querySelector('#czn-hub-thumbs');
  const paintHero = () => {
    const cw = window.__cw;
    if (!cw) return;
    const c = cw.CHARACTERS[hubHero] || cw.CHARACTERS.kaito;
    if (!c) return;
    const img = layer.querySelector('#czn-hub-img');
    img.src = c.art;
    img.alt = c.name;
    layer.querySelector('#czn-hub-cname').textContent = c.name;
    const cls = cw.CLASSES && cw.CLASSES[c.cls] ? cw.CLASSES[c.cls].name : c.cls;
    const cell = String(c.full).split(/[\u2014-] /).pop() || '';
    layer.querySelector('#czn-hub-cmeta').textContent = cell + ' - ' + cls;
    const lead = layer.querySelector('#czn-hub-lead');
    if (lead) lead.textContent = c.name;
  };
  const drawThumbs = () => {
    const cw = window.__cw;
    if (!cw) return;
    const team = (cw.progress && cw.progress.team.length) ? cw.progress.team : ['kaito', 'momo', 'goro'];
    thumbs.innerHTML = team.map((id) => {
      const c = cw.CHARACTERS[id];
      return c ? `<button class="czn-thumb${id === hubHero ? ' on' : ''}" data-hero="${id}" type="button" title="${c.name}"><img src="${c.art}" alt="" /></button>` : '';
    }).join('');
    thumbs.querySelectorAll('[data-hero]').forEach((b) => b.addEventListener('click', () => {
      window.__cw && window.__cw.sfx && window.__cw.sfx('click');
      hubHero = b.dataset.hero;
      drawThumbs();
      paintHero();
    }));
  };
  window.__cznHub = { drawThumbs, paintHero, layer };

  layer.querySelector('#czn-hub-namebtn').addEventListener('click', () => {
    window.__cw && window.__cw.sfx && window.__cw.sfx('click');
    window.__cw && window.__cw.openCharacter && window.__cw.openCharacter(hubHero, 'title');
  });
  layer.querySelector('#czn-hub-task').addEventListener('click', () => {
    window.__cw && window.__cw.sfx && window.__cw.sfx('click');
    window.__cw && window.__cw.setMode && window.__cw.setMode('story');
    window.__cw && window.__cw.showView && window.__cw.showView('missions');
  });
  layer.querySelector('#czn-cmd-expedition').addEventListener('click', () => {
    window.__cw && window.__cw.sfx && window.__cw.sfx('click');
    document.getElementById('btn-start').click();
  });
  layer.querySelector('#czn-cmd-deck').addEventListener('click', () => {
    window.__cw && window.__cw.sfx && window.__cw.sfx('click');
    window.__cw && window.__cw.setMode && window.__cw.setMode('chaos');
    window.__cw && window.__cw.showView && window.__cw.showView('roster');
  });
  layer.querySelector('#czn-cmd-sim').addEventListener('click', () => window.__cw && window.__cw.openSim && window.__cw.openSim());
  layer.querySelector('#czn-cmd-resume').addEventListener('click', () => document.getElementById('btn-resume-run').click());
  layer.querySelector('#czn-cmd-settings').addEventListener('click', () => document.getElementById('btn-open-settings-title').click());
  layer.querySelector('#czn-cmd-reset').addEventListener('click', () => document.getElementById('btn-reset').click());

  const legacyTop = title.querySelector('.title-top');
  if (legacyTop) legacyTop.classList.add('czn-legacy-hide');
  const legacyInner = title.querySelector('.title-inner');
  if (legacyInner) legacyInner.classList.add('czn-legacy-hide');
}

function cznSyncHub() {
  const hub = window.__cznHub;
  const cw = window.__cw;
  if (!hub || !cw) return;
  const p = cw.progress;
  const team = (p && p.team) || [];
  if (team.length && team.indexOf(hubHero) < 0) hubHero = team[0];
  const total = (p && p.chars) ? Object.values(p.chars).reduce((n, r) => n + (r.xp || 0), 0) : 0;
  const lvEl = document.getElementById('czn-hub-lv');
  if (lvEl) lvEl.textContent = Math.min(99, 25 + Math.floor(total / 260));
  const done = (p && p.cleared) ? (Array.isArray(p.cleared) ? p.cleared.length : Object.keys(p.cleared).length) : 0;
  const prog = document.getElementById('czn-task-prog');
  if (prog) prog.textContent = Math.min(5, done) + ' / 5';
  const main = document.getElementById('czn-task-main');
  if (main) main.textContent = done >= 5 ? 'sector secure' : 'to level 30';
  hub.drawThumbs && hub.drawThumbs();
  hub.paintHero && hub.paintHero();
  const cells = document.getElementById('title-cells');
  const en = document.querySelector('.czn-hub [data-czn="energy"]');
  if (en && cells) en.textContent = (cells.textContent || 0) + ' / 240+';
  /* CONTINUE only exists when there is a run to continue. */
  const resume = hub.layer && hub.layer.querySelector('#czn-cmd-resume');
  if (resume) resume.classList.toggle('hidden', !(cw.progress && cw.progress.run && !cw.progress.run.finished));
}

/* ------------------------------------------------------------------ */
/* 5 - mount                                                           */
/* ------------------------------------------------------------------ */
function cznMount() {
  if (!window.__cw) return;
  cznPaintBackdrops();
  cznBuildHeaders();
  cznBuildHub();
  document.body.classList.add('czn-shell');
  cznSyncHub();
  const original = window.__cw.showView;
  if (original && !window.__cznPatchedShowView) {
    window.__cznPatchedShowView = true;
    window.__cw.showView = function patchedShowView(name) {
      original(name);
      if (name === 'title') cznSyncHub();
      if (name === 'character') {
        const view = document.getElementById('view-character');
        if (view) view.classList.add('czn-char-mode');
      }
    };
  }
  window.__cznSyncHub = cznSyncHub;
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(cznMount, 0));
} else {
  setTimeout(cznMount, 0);
}
window.__czn = { mount: cznMount, sync: cznSyncHub };
