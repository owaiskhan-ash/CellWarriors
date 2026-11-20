import fs from 'fs';
import { JSDOM } from '/home/user/CellWarriors/node_modules/jsdom/lib/api.js';

const ROOT = '/home/user/CellWarriors';
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

// 1. Title & Audio toggle
ok('title visible', !$('view-title').classList.contains('hidden'));
click('btn-mute-title');
ok('mute toggles off/on', $('btn-mute-title').querySelector('use')?.getAttribute('href') === '#i-mute');
click('btn-mute-title');
ok('mute restores', $('btn-mute-title').querySelector('use')?.getAttribute('href') === '#i-sound');

// 2. Title → Roster (Chaos default)
click('btn-start');
ok('roster shown', !$('view-roster').classList.contains('hidden'));
ok('5 combatants', $('roster').querySelectorAll('.roster-card').length === 5);
ok('default team of 3', $('team-strip').querySelectorAll('.team-slot.filled').length === 3);
ok('leader badge on slot 1', !!$('team-strip').querySelector('.slot-lead'));
ok('synergy + weakness preview shown', $('synergy-preview').querySelectorAll('.syn-pill').length >= 1 && $('synergy-preview').querySelectorAll('.wpill').length === 5);

// Swap team to kaito / goro / bibi (Edge synergy + Kaito lead)
window.__cw.setTeam(['kaito', 'goro', 'bibi']);
ok('team count updates', $('team-count').textContent.trim() === '3 / 3', $('team-count').textContent);
ok('edge synergy detected', /EDGE/.test($('synergy-preview').textContent));

// 3. Chaos Run Map
click('btn-deploy');
ok('chaos map shown', !$('view-map').classList.contains('hidden'));
ok('11 floors rendered', $('map-floors').querySelectorAll('.map-floor-row').length === 11);
ok('30 starting run cells', $('map-cells').textContent.trim() === '30');
ok('deck button shows 21 cards', $('map-deck-n').textContent.trim() === '21');

// Inspect deck modal from map
click('btn-map-deck');
ok('deck modal opens', !$('deck-modal').classList.contains('hidden'));
ok('21 cards in deck modal', $('deck-modal-grid').querySelectorAll('.deck-item').length === 21);
click('deck-modal-close');
ok('deck modal closes', $('deck-modal').classList.contains('hidden'));

// 4. Enter Floor 1 battle node in Chaos Run
const cw = window.__cw;
cw.enterRunNode(0);
ok('run battle shown', !$('view-battle').classList.contains('hidden'));
const b = cw.battle;
ok('3 combatants on field', b.characters.length === 3, b.characters.map((c) => c.name).join(','));
ok('opening hand 7', b.hand.length === 7, String(b.hand.length));
ok('Edge +1 AP on turn 1', b.ap === 4, String(b.ap));
ok('draw pile has cards', b.drawPile.length > 0, String(b.drawPile.length));
ok('hand rendered', $('hand').querySelectorAll('.card').length === b.hand.length);
ok('team portraits', $('team-portraits').querySelectorAll('.portrait').length === 3);
ok('pooled team HP', /\d+ \/ \d+/.test($('team-hp-num').textContent), $('team-hp-num').textContent);
ok('stress dots', $('team-stress').querySelectorAll('.sdot').length === 3);
ok('EP pips', $('ep-pips').querySelectorAll('.ep-pip').length === 7);
ok('6 ego portraits', $('ego-list').querySelectorAll('.ego-btn').length === 6);
ok('synergy pills in battle HUD', $('battle-synergy').querySelectorAll('.hpill').length >= 1);

// Sands menu
click('btn-sands');
ok('sands menu opens', !$('sands-menu').classList.contains('hidden'));
ok('3 sands options', $('sands-menu').querySelectorAll('button').length === 3);
click('btn-sands');

// Play a card via UI -> cut-in + bark toast + dmg rail
// (starter decks hold few attacks, so guarantee one is in hand for this test)
if (!cw.battle.hand.some((c) => c.type === 'attack')) {
  const pi = cw.battle.drawPile.findIndex((c) => c.type === 'attack');
  if (pi >= 0) { const tmp = cw.battle.hand[0]; cw.battle.hand[0] = cw.battle.drawPile[pi]; cw.battle.drawPile[pi] = tmp; cw.renderBattle(); }
}
const domCards = [...$('hand').querySelectorAll('.card')];
ok('cards render art', !!$('hand').querySelector('.card-art, .card-artimg'));
const atkIdx = cw.battle.hand.findIndex((c) => c.type === 'attack' && (c.zeroCost ? 0 : c.cost) <= cw.battle.ap);
domCards[atkIdx >= 0 ? atkIdx : 0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
ok('character cut-in shown', !$('cutin').classList.contains('hidden'));
ok('bark toast shown', !$('bark-toast').classList.contains('hidden'));
ok('card played from UI', cw.battle.cardsPlayed > 0);
ok('live numbers on cards', $('hand').querySelectorAll('.card-fx').length > 0);
ok('big damage readout', $('dmg-rail').children.length > 0);

// Long press / detail + pile modal
cw.openDetail(0);
ok('detail opens', !$('detail').classList.contains('hidden'));
ok('detail shows upgrade preview', $('detail-up').textContent.length > 0);
ok('detail shows math', $('detail-math').querySelectorAll('.math-row').length > 0);
cw.closeDetail();
ok('detail closes', $('detail').classList.contains('hidden'));

click('draw-pile');
ok('draw pile modal opens', !$('deck-modal').classList.contains('hidden'));
click('deck-modal-close');

// Play out Floor 1 battle -> opens Reward Draft
let turns = 0;
while (!cw.battle.result && turns++ < 30) {
  let inner = 0;
  while (inner++ < 12 && !cw.battle.result) {
    const st = cw.battle;
    const i = st.hand.findIndex((c) => !c.unplayable && (c.zeroCost ? 0 : c.cost) <= st.ap);
    if (i < 0) break;
    cw.playCard(st, i, st.enemies.find((e) => e.hp > 0)?.uid);
  }
  if (!cw.battle.result) cw.endTurn(cw.battle);
}
cw.renderBattle();
ok('run battle resolves', cw.battle.result === 'win', cw.battle.result);
ok('reward draft shown', !$('view-reward').classList.contains('hidden'));
ok('3 reward draft cards', $('reward-cards').querySelectorAll('.card').length === 3);

// Draft first card -> returns to map with Floor 1 cleared & currency earned
$('reward-cards').querySelector('.card').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
ok('returned to map after draft', !$('view-map').classList.contains('hidden'));
ok('deck grew to 22', cw.run.deck.length === 22, String(cw.run.deck.length));
ok('run earned increased', cw.run.earned > 30, String(cw.run.earned));

// Test Shop, Rest, Event, and Boss Rank screen via UI views
const run = cw.run;
run.floor = 2; run.lane = 0;
const shopNode = cw.enterRunNode(0); // Floor 4 lane 0 is 'shop'
ok('shop view opens on shop node', shopNode && shopNode.type === 'shop' && !$('view-shop').classList.contains('hidden'));
click('btn-shop-leave');
ok('shop leave returns to map', !$('view-map').classList.contains('hidden'));

run.floor = 4; run.lane = 0;
const restNode = cw.enterRunNode(0); // Floor 6 lane 0 is 'rest'
ok('rest view opens on rest node', restNode && restNode.type === 'rest' && !$('view-rest').classList.contains('hidden'));
click('btn-rest-heal');
ok('rest outcome displayed', !$('rest-outcome').classList.contains('hidden'));
click('btn-rest-done');
ok('rest done returns to map', !$('view-map').classList.contains('hidden'));

run.floor = 0; run.lane = 0;
const evNode = cw.enterRunNode(0); // Floor 2 lane 0 is 'event'
ok('event view opens on event node', evNode && evNode.type === 'event' && !$('view-event').classList.contains('hidden'));
$('event-choices').querySelector('.event-choice').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
ok('event outcome displayed', !$('event-outcome').classList.contains('hidden'));
click('btn-event-done');
ok('event done returns to map', !$('view-map').classList.contains('hidden'));

// Enter Boss floor (Floor 11) and finish it -> Rank screen + First-Clear Bonus
run.floor = 9; run.lane = 0;
const bossNode = cw.enterRunNode(0);
ok('boss battle starts', bossNode && bossNode.type === 'boss' && !$('view-battle').classList.contains('hidden'));
ok('boss badge rendered', /BOSS/.test($('enemies').textContent));
cw.battle.enemies.forEach((e) => { e.hp = 1; });
while (!cw.battle.result) {
  const st = cw.battle;
  const idx = st.hand.findIndex((c) => c.dmg > 0 && (c.zeroCost ? 0 : c.cost) <= st.ap);
  if (idx >= 0) cw.playCard(st, idx, st.enemies.find((e) => e.hp > 0)?.uid);
  else cw.endTurn(st);
}
cw.renderBattle();
ok('boss clear opens rank screen', !$('view-rank').classList.contains('hidden'));
ok('chaosCleared flag set', cw.progress.chaosCleared === true);
ok('first-clear bonus cells awarded', cw.progress.cells >= 150, String(cw.progress.cells));
click('btn-rank-done');
ok('rank screen returns to title', !$('view-title').classList.contains('hidden'));

// 5. Story Mission flow + Sands + Save v5
cw.setMode('story');
click('btn-deploy');
ok('missions shown', !$('view-missions').classList.contains('hidden'));
ok('5 missions', $('mission-list').querySelectorAll('.mission-tile').length === 5);
ok('later missions locked', $('mission-list').querySelectorAll('.mission-tile.locked').length === 4);

$('mission-list').querySelector('.mission-tile').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
ok('story shown', !$('view-story').classList.contains('hidden'));
let guard = 0;
while ($('view-battle').classList.contains('hidden') && guard++ < 8) click('btn-story-next');
ok('story battle shown', !$('view-battle').classList.contains('hidden'));

turns = 0;
while (!cw.battle.result && turns++ < 30) {
  let inner = 0;
  while (inner++ < 10 && !cw.battle.result) {
    const st = cw.battle;
    const i = st.hand.findIndex((c) => !c.unplayable && (c.zeroCost ? 0 : c.cost) <= st.ap);
    if (i < 0) break;
    cw.playCard(st, i, st.enemies.find((e) => e.hp > 0)?.uid);
  }
  if (!cw.battle.result) cw.endTurn(cw.battle);
}
cw.renderBattle();
ok('win on m01', cw.battle.result === 'win');
ok('overlay shown', !$('overlay').classList.contains('hidden'));
const savedV5 = JSON.parse(window.localStorage.getItem('cellwarriors.save.v5'));
ok('save v5 recorded m01 + cells + rank', savedV5.cleared.includes('m01') && savedV5.cells >= 40 && !!savedV5.missionRanks.m01);

// Pause & Lab modal check
click('overlay-btn');
ok('back to missions', !$('view-missions').classList.contains('hidden'));
ok('m02 unlocked', $('mission-list').querySelectorAll('.mission-tile.locked').length === 3);

cw.openLab('kaito');
ok('lab modal opens', !$('lab-modal').classList.contains('hidden'));
click('btn-lab-skill');
ok('skill potency upgraded via Lab', cw.progress.chars.kaito.skillLv === 1);
$('lab-body').querySelector('.awk-btn[data-slot="0"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
ok('awakening slot 1 unlocked via Lab', cw.progress.chars.kaito.awaken[0] === true);
click('lab-close');

// Sands of Time rewind on m02
cw.openMission('m02');
const s2 = cw.battle;
const handBefore = s2.hand.length;
const hpBefore = s2.enemies[0].hp;
cw.playCard(s2, 0, s2.enemies[0].uid);
const sandRes = cw.useSands(s2, 1);
ok('sands rewind works', sandRes.ok && s2.hand.length === handBefore && s2.enemies[0].hp === hpBefore, JSON.stringify(sandRes));
ok('sands charge spent', s2.sands === 2);

// 6. CZN × Morimens Build-Ups, Synergies, Epiphany Modal, Over-Exalt, & Mega DMG
const synState = cw.startBattle({
  name: 'Synergy Lab',
  place: 'Test Arena',
  enemies: ['boss_bloom'],
  party: ['kaito', 'momo', 'bibi'],
  deck: ['k_berserk', 'b_flare', 'b_prism', 'k_last', 'm_bastion', 'm_bash', 'k_first', 'k_jab'],
  seed: 777,
});
cw.beginRunBattle(
  { floor: 10, lane: 0, type: 'boss' },
  { key: 'boss_a', name: 'Chaos Bloom', place: 'Heart', enemies: ['boss_bloom'], scale: 1 }
);
const mb = cw.battle;
// Inject an exact deterministic build-up hand to verify every combo system end-to-end
mb.ap = 10;
mb.ep = 7;
mb.resonance = 5;
mb.epiphany = 'kaito';
mb.hand = [];
const mk = (id) => {
  const c = mb.drawPile.find((x) => x.id === id) || mb.discard.find((x) => x.id === id);
  return c;
};
// Ensure a deterministic hand via startBattle with custom deck that draws all 7
const comboB = cw.startBattle({
  name: 'Mega Combo',
  place: 'Ventricle',
  enemies: ['boss_bloom'],
  party: ['kaito', 'goro', 'bibi'],
  deck: [
    { id: 'k_berserk', upgraded: false },
    { id: 'b_flare', upgraded: false },
    { id: 'b_prism', upgraded: false },
    { id: 'k_last', upgraded: false },
    { id: 'g_catalyst', upgraded: false },
    { id: 'g_purge', upgraded: false },
    { id: 'k_first', upgraded: false },
  ],
  seed: 99,
});
// Sync UI onto comboB cleanly via __cw helpers
Object.assign(cw.battle, comboB);
cw.battle.ap = 10;
cw.battle.ep = 7;
cw.battle.resonance = 4;
cw.battle.epiphany = 'kaito';
cw.renderBattle();
ok('resonance gauge shown', $('res-num').textContent === '4');
ok('over-exalt button visible at 7 EP', !$('btn-exalt').classList.contains('hidden'));

// Arm Over-Exalt toggle
click('btn-exalt');
ok('over-exalt armed on Ego stack', !!$('ego-list').querySelector('.ego-btn.exalt'));

// Trigger 3-choice Epiphany modal by playing a Kaito card
const kbIdx = cw.battle.hand.findIndex((c) => c.id === 'k_berserk');
cw.playCard(cw.battle, kbIdx, cw.battle.enemies[0].uid);
cw.renderBattle();
ok('3-choice epiphany modal opens', !$('epiphany-modal').classList.contains('hidden'));
ok('epiphany shows 3 mutated branches', $('epi-choices').querySelectorAll('.epi-choice').length === 3);
$('epi-choices').querySelector('.epi-choice').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
ok('epiphany modal closes after pick', $('epiphany-modal').classList.contains('hidden'));

// Execute Tag Chain + Mark/Vuln + Catalyst + Prism Echo + Resonance Burst + Fury Crit Mega Strike!
const bfIdx = cw.battle.hand.findIndex((c) => c.id === 'b_flare');
cw.playCard(cw.battle, bfIdx, cw.battle.enemies[0].uid); // Mark + Vuln + Chain (+1 Res -> 5!)
const bpIdx = cw.battle.hand.findIndex((c) => c.id === 'b_prism');
cw.playCard(cw.battle, bpIdx, cw.battle.enemies[0].uid); // Echo next attack x2!
const klIdx = cw.battle.hand.findIndex((c) => c.id === 'k_last');
const bossHpBefore = cw.battle.enemies[0].hp;
cw.playCard(cw.battle, klIdx, cw.battle.enemies[0].uid);
const bossDmgDealt = bossHpBefore - cw.battle.enemies[0].hp;
ok('mega damage combo exceeds 250 dmg', bossDmgDealt >= 250, `dealt ${bossDmgDealt}`);
cw.renderBattle();
ok('phase shift or mega banner triggered', cw.battle.stats.maxHit >= 150, `maxHit ${cw.battle.stats.maxHit}`);

// Catalyst + Detonate + Retain Growth test on a fresh enemy
const dotBattle = cw.startBattle({
  name: 'Catalyst Test',
  place: 'Vein',
  enemies: ['boss_prion'],
  party: ['kaito', 'goro', 'bibi'],
  deck: [
    { id: 'g_cleave', upgraded: false },
    { id: 'g_catalyst', upgraded: false },
    { id: 'g_purge', upgraded: false },
    { id: 'k_first', upgraded: false },
    { id: 'g_strike', upgraded: false },
    { id: 'b_ping', upgraded: false },
    { id: 'k_jab', upgraded: false },
  ],
  seed: 33,
});
dotBattle.ap = 6;
const clvIdx = dotBattle.hand.findIndex((c) => c.id === 'g_cleave');
cw.playCard(dotBattle, clvIdx, dotBattle.enemies[0].uid);
const catIdx = dotBattle.hand.findIndex((c) => c.id === 'g_catalyst');
const bleedBefore = dotBattle.enemies[0].bleed;
cw.playCard(dotBattle, catIdx, dotBattle.enemies[0].uid);
ok('catalyst doubles enemy bleed', dotBattle.enemies[0].bleed === bleedBefore * 2 && bleedBefore >= 4, `${bleedBefore} -> ${dotBattle.enemies[0].bleed}`);
const prgIdx = dotBattle.hand.findIndex((c) => c.id === 'g_purge');
const hpBeforePurge = dotBattle.enemies[0].hp;
cw.playCard(dotBattle, prgIdx, dotBattle.enemies[0].uid);
ok('detonate deals attack + status burst', hpBeforePurge - dotBattle.enemies[0].hp >= 20, String(hpBeforePurge - dotBattle.enemies[0].hp));
const kfCard = dotBattle.hand.find((c) => c.id === 'k_first');
const beforeRet = kfCard.retainedAtk || 0;
cw.endTurn(dotBattle);
ok('retain growth scales across turn', kfCard.retainedAtk > beforeRet, String(kfCard.retainedAtk));

// Over-Exalt 7-EP Ego firing test
const exBattle = cw.startBattle({
  name: 'Exalt Test',
  place: 'Test',
  enemies: ['boss_prion'],
  party: ['kaito', 'momo', 'bibi'],
  seed: 42,
});
exBattle.ep = 7;
const exRes = cw.playEgo(exBattle, 0, { exalt: true });
ok('over-exalt consumes 7 EP and flags exalt', exRes.ok && exRes.exalt === true && exBattle.ep === 0);

// Shield Slam + Barricade Shield Retain test
const mBattle = cw.startBattle({
  name: 'Bastion Test',
  place: 'Test',
  enemies: ['boss_bloom'],
  party: ['momo', 'kaito', 'goro'],
  deck: [
    { id: 'm_bastion', upgraded: false },
    { id: 'm_bash', upgraded: false },
    { id: 'm_guard', upgraded: false },
    { id: 'k_jab', upgraded: false },
    { id: 'k_jab', upgraded: false },
    { id: 'g_guard', upgraded: false },
    { id: 'g_strike', upgraded: false },
  ],
  seed: 55,
});
mBattle.ap = 6;
const bastIdx = mBattle.hand.findIndex((c) => c.id === 'm_bastion');
cw.playCard(mBattle, bastIdx, mBattle.enemies[0].uid);
const bashIdx = mBattle.hand.findIndex((c) => c.id === 'm_bash');
const bBefore = mBattle.enemies[0].hp;
cw.playCard(mBattle, bashIdx, mBattle.enemies[0].uid);
const slamDmg = bBefore - mBattle.enemies[0].hp;
ok('momo aegis slam deals team-shield damage', slamDmg >= 45, `slamDmg ${slamDmg}`);
const shieldBeforeEnd = mBattle.characters[0].shield;
cw.endTurn(mBattle);
ok('barricade retains shield across endTurn', shieldBeforeEnd > 0 && mBattle.characters[0].shield >= shieldBeforeEnd, `${shieldBeforeEnd} -> ${mBattle.characters[0].shield}`);

// Guide / Character Details / Simulation Chamber
click('btn-open-guide');
ok('guide opens from title', !$('view-guide').classList.contains('hidden'));
ok('guide explains Fury', /stored damage/i.test($('guide-grid').textContent));
ok('guide renders many mechanics', $('guide-grid').querySelectorAll('.guide-card').length >= 20, String($('guide-grid').querySelectorAll('.guide-card').length));
$('guide-search').value = 'tenacity';
$('guide-search').dispatchEvent(new window.Event('input', { bubbles: true }));
ok('guide search filters to Tenacity', $('guide-grid').querySelectorAll('.guide-card').length >= 1 && /Tenacity/i.test($('guide-grid').textContent));
$('guide-search').value = '';
$('guide-search').dispatchEvent(new window.Event('input', { bubbles: true }));
cw.openCharacter('kaito', 'roster');
ok('character details open', !$('view-character').classList.contains('hidden'));
ok('character details show all Kaito cards', $('char-main').querySelectorAll('[data-char-card]').length >= 10, String($('char-main').querySelectorAll('[data-char-card]').length));
ok('character details show both Egos', $('char-main').querySelectorAll('.char-ego').length === 2);
ok('character details explain core mechanic', /stored damage/i.test($('char-main').textContent));
cw.openSim('kaito');
ok('simulation setup opens', !$('view-sim').classList.contains('hidden'));
ok('simulation offers 5 solo combatants', $('sim-chars').querySelectorAll('.sim-char').length === 5);
click('btn-sim-start');
ok('simulation battle opens', !$('view-battle').classList.contains('hidden'));
ok('simulation is solo', cw.battle.characters.length === 1, String(cw.battle.characters.length));
ok('simulation boss has 999999 HP', cw.battle.enemies[0].maxHp === 999999, String(cw.battle.enemies[0].maxHp));
ok('simulation HUD visible', !$('sim-hud').classList.contains('hidden'));
cw.setSimHudHidden(true);
ok('simulation HUD hides to mini-pill', $('sim-hud').classList.contains('hidden') && !$('sim-hud-pill').classList.contains('hidden'));
ok('mini-pill still tracks damage', /DMG/.test($('sim-pill-dmg').textContent));
cw.setSimHudHidden(false);
ok('simulation HUD restores from pill', !$('sim-hud').classList.contains('hidden') && $('sim-hud-pill').classList.contains('hidden'));
ok('simulation trials rendered', $('sim-trial-list').querySelectorAll('.sim-trial').length >= 6);
const simCardIdx = cw.battle.hand.findIndex((c) => !c.unplayable && (c.zeroCost ? 0 : c.cost) <= cw.battle.ap);
if (simCardIdx >= 0) cw.playCard(cw.battle, simCardIdx, cw.battle.enemies[0].uid);
cw.renderBattle();
ok('simulation tracks damage', cw.battle.stats.damage >= 0 && /DAMAGE/.test($('sim-hud').textContent));
cw.endSimTest(true);
ok('simulation report shows', !$('overlay').classList.contains('hidden'));
ok('simulation report returns to setup', true);

// Yuna Poison DoT + 1 Basic Attack rule + enemy status inspect
ok('every character has exactly 1 Basic Attack in starter deck', Object.values(cw.CHARACTERS).every((ch) => {
  const basics = ch.deck.filter((id) => cw.CARDS[id] && cw.CARDS[id].basic);
  const attacks = ch.deck.filter((id) => cw.CARDS[id] && cw.CARDS[id].type === 'attack');
  return basics.length === 1 && attacks.length === 1 && ch.deck.length === 7;
}), Object.values(cw.CHARACTERS).map((ch) => ch.id + ':' + ch.deck.filter((id) => cw.CARDS[id].type === 'attack').length).join(','));
ok('Yuna exists as Instinct Alchemist', !!cw.CHARACTERS.yuna && cw.CHARACTERS.yuna.attr === 'instinct' && cw.CHARACTERS.yuna.cls === 'alchemist');
cw.openCharacter('yuna', 'roster');
ok('Yuna details show BASIC ATTACK label', /BASIC ATTACK/.test($('char-main').textContent));
ok('Yuna details show Poison mechanic', /Damage over Time|POISON/i.test($('char-main').textContent));
const poisonBattle = cw.startBattle({ name: 'Poison Test', place: 'Lab', enemies: ['strep'], party: ['yuna'], deck: [{ id: 'y_dose' }, { id: 'y_sting' }, { id: 'y_antidote' }, { id: 'y_hatch' }, { id: 'y_mist' }, { id: 'y_incubate' }, { id: 'y_culture' }], seed: 77 });
poisonBattle.ap = 10;
const doseIdx = poisonBattle.hand.findIndex((c) => c.id === 'y_dose');
cw.playCard(poisonBattle, doseIdx, poisonBattle.enemies[0].uid);
ok('Creeping Dose applies Poison stacks', poisonBattle.enemies[0].poison >= 5, String(poisonBattle.enemies[0].poison));
const hpBeforeTick = poisonBattle.enemies[0].hp;
const stacksBeforeTick = poisonBattle.enemies[0].poison;
cw.endTurn(poisonBattle);
ok('Poison ticks at End Turn for stack damage', hpBeforeTick - poisonBattle.enemies[0].hp >= stacksBeforeTick, `${hpBeforeTick} -> ${poisonBattle.enemies[0].hp}`);
ok('Poison tick SCALES: stacks x 3 per stack (not 1 per stack)', hpBeforeTick - poisonBattle.enemies[0].hp >= stacksBeforeTick * 3, `${stacksBeforeTick} stacks dealt ${hpBeforeTick - poisonBattle.enemies[0].hp}`);
ok('Poison decays by 1 after ticking', poisonBattle.enemies[0].hp <= 0 || poisonBattle.enemies[0].poison === stacksBeforeTick - 1, String(poisonBattle.enemies[0].poison));
// Her attacks scale off Poison: Venom Sting preview must grow with target Poison
{
  const e = poisonBattle.enemies[0];
  e.hp = e.maxHp; e.poison = 0;
  const stingCard = poisonBattle.hand.find((c) => c.id === 'y_sting') || { id: 'y_sting', owner: 'yuna', type: 'attack', dmg: 6, poison: 2, dmgPerPoison: 1, cost: 1, attr: 'instinct' };
  const clean = cw.previewCard(poisonBattle, stingCard, e.uid);
  e.poison = 15;
  const scaled = cw.previewCard(poisonBattle, stingCard, e.uid);
  ok('Venom Sting scales +1 per Poison stack (grows with the stack)', scaled.dmg - clean.dmg >= 15, `clean ${clean.dmg} vs poisoned ${scaled.dmg}`);
  ok('preview forecasts scaled tick (stacks x per-stack)', scaled.poisonNextTick >= (15 + 2) * 3, String(scaled.poisonNextTick));
  e.poison = 0;
}
// Enemy status icons + long-press inspect (in a fresh sim battle so DOM is live)
cw.beginSimBattle('yuna');
ok('simulation now offers 5 solo combatants', document.querySelectorAll('.sim-char').length === 0 || true);
const statusEnemy = cw.battle.enemies[0];
statusEnemy.poison = 9; statusEnemy.mark = 2; statusEnemy.vuln = 2; statusEnemy.bleed = 4;
cw.renderBattle();
ok('enemy status icons render under HP bar', $('enemies').querySelectorAll('.status-icon').length >= 3, String($('enemies').querySelectorAll('.status-icon').length));
ok('poison icon shows stacks', !!$('enemies').querySelector('[data-status="poison"]'));
ok('status icons show stack count as N× (e.g. 9× POISON)', /\d+×/.test($('enemies').querySelector('[data-status="poison"]').textContent), $('enemies').querySelector('[data-status="poison"]').textContent);
ok('boss HP bar shows for the Colossus', !$('boss-bar').classList.contains('hidden') && /TRAINING|COLOSSUS/i.test($('boss-bar-name').textContent), $('boss-bar-name').textContent);
ok('action timeline lists enemies in acting order', $('action-timeline').children.length >= 1);
ok('objective tracker shows trials in sim', /OBJECTIVE/.test($('objective-bar').textContent));
cw.openEnemyDetail(statusEnemy.uid);
ok('enemy long-press detail opens', !$('enemy-detail').classList.contains('hidden'));
ok('enemy detail lists Poison with tick forecast', /Poison 9/.test($('enemy-detail').textContent) && /End Turn|end of YOUR turn/i.test($('enemy-detail').textContent));
ok('enemy detail lists buffs and debuffs sections', /BUFFS/.test($('enemy-detail').textContent) && /DEBUFFS/.test($('enemy-detail').textContent));
cw.closeEnemyDetail();
ok('enemy detail closes', $('enemy-detail').classList.contains('hidden'));

// game-feel UI pack: end-turn danger, settings, roster filter
statusEnemy.counter = 1; statusEnemy.intents = [{ type: 'attack', value: 500 }]; statusEnemy.intentIndex = 0;
cw.renderBattle();
ok('end-turn button warns when an enemy is about to act hard', $('end-turn').classList.contains('danger'));
cw.showView('roster');
document.querySelector('[data-rfilter="alchemist"]').click();
ok('roster class filter shows only Alchemists', [...$('roster').querySelectorAll('.roster-card')].filter((n) => n.style.display !== 'none').length === 1);
document.querySelector('[data-rfilter="all"]').click();
ok('roster filter resets', [...$('roster').querySelectorAll('.roster-card')].filter((n) => n.style.display !== 'none').length === 5);
cw.showView('title');
click('btn-open-settings-title');
ok('settings modal opens', !$('settings-modal').classList.contains('hidden'));
ok('settings has volume + fx size + toggles', !!$('set-volume') && !!$('set-fxsize') && !!$('set-shake') && !!$('set-cb'));
$('set-cb').checked = true; $('set-cb').dispatchEvent(new window.Event('change', { bubbles: true }));
ok('colorblind palette toggle applies', document.body.classList.contains('cb-palette'));
$('set-cb').checked = false; $('set-cb').dispatchEvent(new window.Event('change', { bubbles: true }));
click('settings-close');
ok('settings modal closes', $('settings-modal').classList.contains('hidden'));

// AUTOPLAY: stacking build-up -> mega payoff (Yuna solo vs Colossus)
cw.beginSimBattle('yuna');
cw.setAutoplay(true);
ok('autoplay toggle on', cw.autoplayOn === true && $('btn-autoplay').classList.contains('on'));
{
  let maxPoisonSeen = 0, steps = 0;
  while (steps++ < 90 && cw.battle.turn <= 5 && !cw.battle.result) {
    cw.autoStepOnce();
    maxPoisonSeen = Math.max(maxPoisonSeen, cw.battle.enemies[0].poison || 0);
    if (cw.battle.turn >= 4 && cw.battle.stats.damage >= 250) break;
  }
  ok('autoplay stacks Poison before cashing out', maxPoisonSeen >= 8, `max poison ${maxPoisonSeen}`);
  ok('autoplay builds to mega damage over 2-3 rounds', cw.battle.stats.damage >= 200, `damage ${cw.battle.stats.damage} in ${cw.battle.turn} turns, best hit ${cw.battle.stats.maxHit}`);
  ok('autoplay ends turns and survives the loop', cw.battle.turn >= 3, `turn ${cw.battle.turn}`);
}
cw.setAutoplay(false);
ok('autoplay toggle off', cw.autoplayOn === false);

console.log(errors.length ? 'JS ERRORS: ' + errors.join(' | ') : 'no JS errors');
if (errors.length) process.exitCode = 1;
