import fs from 'fs';
import { JSDOM } from '/home/user/Township/node_modules/jsdom/lib/api.js';

const ROOT = '/home/user/Township';
const html = fs.readFileSync(`${ROOT}/index.html`, 'utf8');
const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true });
const { window } = dom;

global.window = window;
global.document = window.document;
global.localStorage = window.localStorage;
global.HTMLElement = window.HTMLElement;
global.Event = window.Event;
Object.defineProperty(global, 'navigator', { value: window.navigator, configurable: true });

const errors = [];
window.addEventListener('error', (e) => errors.push(e.message));

await import(`${ROOT}/src/ui.js?t=${Date.now()}`);
const $ = (id) => window.document.getElementById(id);
const click = (id) => $(id).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const ok = (label, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' — ' + extra : ''}`);
  if (!cond) process.exitCode = 1;
};

// title → roster
ok('title visible', !$('view-title').classList.contains('hidden'));
click('btn-start');
ok('roster shown', !$('view-roster').classList.contains('hidden'));
ok('4 combatants', $('roster').querySelectorAll('.roster-card').length === 4);
ok('default team of 3', $('team-strip').querySelectorAll('.team-slot.filled').length === 3);

// pick a different team (kaito / goro / bibi)
window.__cw.setTeam(['kaito', 'goro', 'bibi']);
ok('team count updates', $('team-count').textContent.trim() === '3 / 3', $('team-count').textContent);
click('btn-deploy');
ok('missions shown', !$('view-missions').classList.contains('hidden'));
ok('5 missions', $('mission-list').querySelectorAll('.mission-tile').length === 5);
ok('later missions locked', $('mission-list').querySelectorAll('.mission-tile.locked').length === 4);

// enter m01
$('mission-list').querySelector('.mission-tile').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
ok('story shown', !$('view-story').classList.contains('hidden'));
let guard = 0;
while ($('view-battle').classList.contains('hidden') && guard++ < 8) click('btn-story-next');
ok('battle shown', !$('view-battle').classList.contains('hidden'));

const cw = window.__cw;
const b = cw.battle;
ok('3 combatants on field', b.characters.length === 3, b.characters.map((c) => c.name).join(','));
ok('opening hand 7', b.hand.length === 7, String(b.hand.length));
ok('3 AP', b.ap === 3, String(b.ap));
ok('draw pile has cards', b.drawPile.length > 0, String(b.drawPile.length));
ok('hand rendered', $('hand').querySelectorAll('.card').length === b.hand.length);
ok('party rendered', $('party').querySelectorAll('.pc').length === 3);
ok('enemy counter badge', !!$('enemies').querySelector('.counter'));
ok('enemy weakness glyph', !!$('enemies').querySelector('.weak-glyph'));
ok('enemy intent shown', !!$('enemies').querySelector('.intent-pill'));
ok('tenacity bar', !!$('enemies').querySelector('.bar.tenacity'));
ok('stress bars', $('party').querySelectorAll('.bar.stress').length === 3);
ok('EP pips', $('ep-pips').querySelectorAll('.ep-pip').length === 7);
ok('ego list', $('ego-list').querySelectorAll('.ego-btn').length === 3);
ok('sands charges', $('sands').querySelectorAll('.sands-btn').length === 3);
ok('AP orb', $('ap-now').textContent === '3');

// play a card by clicking it
const before = b.hand.length;
const attacks = [...$('hand').querySelectorAll('.card')];
attacks[attacks.length - 1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
ok('card played from UI', cw.battle.hand.length === before - 1, `${before} → ${cw.battle.hand.length}`);
ok('card hits enemy', cw.battle.enemies[0].hp < cw.battle.enemies[0].maxHp || cw.battle.enemies[0].tenacity < cw.battle.enemies[0].maxTenacity);

// play out the fight with the bot
let turns = 0;
while (!cw.battle.result && turns++ < 30) {
  let inner = 0;
  while (inner++ < 10 && !cw.battle.result) {
    const st = cw.battle;
    const i = st.hand.findIndex((c) => !c.unplayable && (c.zeroCost ? 0 : c.cost) <= st.ap);
    if (i < 0) break;
    cw.playCard(st, i, st.enemies.find((e) => e.hp > 0)?.uid);
  }
  if (cw.battle.result) break;
  cw.endTurn(cw.battle);
}
cw.renderBattle();
ok('battle resolves', !!cw.battle.result, cw.battle.result);
ok('win on m01', cw.battle.result === 'win');
ok('overlay shown', !$('overlay').classList.contains('hidden'));
ok('overlay says clear', /CLEAR/.test($('overlay-title').textContent));
ok('save recorded m01', JSON.parse(window.localStorage.getItem('cellwarriors.save.v4')).cleared.includes('m01'));

// Sands of Time: rewind
click('overlay-btn');
ok('back to missions', !$('view-missions').classList.contains('hidden'));
ok('m02 unlocked', $('mission-list').querySelectorAll('.mission-tile.locked').length === 3);

cw.openMission('m02');
const s2 = cw.battle;
const handBefore = s2.hand.length;
const hpBefore = s2.enemies[0].hp;
cw.playCard(s2, 0, s2.enemies[0].uid);
const sandRes = (await import(`${ROOT}/src/engine.js`)).useSands(s2, 1);
ok('sands rewind works', sandRes.ok && s2.hand.length === handBefore && s2.enemies[0].hp === hpBefore, JSON.stringify(sandRes));
ok('sands charge spent', s2.sands === 2);

console.log(errors.length ? 'JS ERRORS: ' + errors.join(' | ') : 'no JS errors');
if (errors.length) process.exitCode = 1;
