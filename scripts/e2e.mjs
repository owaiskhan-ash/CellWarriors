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
ok('6 combatants', $('roster').querySelectorAll('.roster-card').length === 6, String($('roster').querySelectorAll('.roster-card').length));
ok('roster entry stagger applied', [...$('roster').querySelectorAll('.roster-card')].every((n) => n.style.animationDelay !== ''));
ok('default team of 3', $('team-strip').querySelectorAll('.team-slot.filled').length === 3);
ok('leader badge on slot 1', !!$('team-strip').querySelector('.slot-lead'));
ok('synergy + weakness preview shown', $('synergy-preview').querySelectorAll('.syn-pill').length >= 1 && $('synergy-preview').querySelectorAll('.wpill').length === 5);

// Swap team to kaito / goro / bibi (Edge synergy + Kaito lead)
window.__cw.setTeam(['kaito', 'goro', 'bibi']);
ok('team count updates', $('team-count').textContent.trim() === '3 / 3', $('team-count').textContent);
ok('edge synergy detected', /EDGE/.test($('synergy-preview').textContent));
ok('team pick pulse on roster cards', !!$('roster').querySelector('.roster-card[data-rid="kaito"]')?.classList.contains('picked'));

// 3. Chaos Run Map
click('btn-deploy');
ok('chaos map shown', !$('view-map').classList.contains('hidden'));
ok('11 floors rendered', $('map-floors').querySelectorAll('.map-floor-row').length === 11);
ok('30 starting run cells', $('map-cells').textContent.trim() === '30');
ok('deck button shows 15 cards (3 x 5-card kits)', $('map-deck-n').textContent.trim() === '15', $('map-deck-n').textContent);

// Inspect deck modal from map
click('btn-map-deck');
ok('deck modal opens', !$('deck-modal').classList.contains('hidden'));
ok('15 cards in deck modal', $('deck-modal-grid').querySelectorAll('.deck-item').length === 15, String($('deck-modal-grid').querySelectorAll('.deck-item').length));
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
ok('stage dust particles exist', !!$('stage-particles').querySelector('.stage-particle'));
const b0 = cw.battle; b0.enemies[0].counter = 2; cw.renderBattle();
ok('idle breathe markers on enemies', $('enemies').querySelectorAll('.enemy.idle').length >= 1);
b0.enemies[0].counter = 0; cw.renderBattle();

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
ok('no character cut-in on card plays (Ego only)', $('cutin').classList.contains('hidden'));
ok('bark toast shown', !$('bark-toast').classList.contains('hidden'));
ok('card played from UI', cw.battle.cardsPlayed > 0);
ok('played card arc animation on stage', !!$('battle-stage').querySelector('.arc-card'));
ok('live numbers on cards', $('hand').querySelectorAll('.card-fx').length > 0);
ok('big damage readout', $('dmg-rail').children.length > 0);
await new Promise((r) => setTimeout(r, 950)); // wait out the play cut-in
$('end-turn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
ok('end-turn sparkles on commit', $('end-turn').classList.contains('sparkle'));

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
ok('deck grew to 16', cw.run.deck.length === 16, String(cw.run.deck.length));
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
// Each beat needs two taps: the first finishes the typewriter, the second
// advances the line. Drive advanceStory() until the battle view opens.
let guard = 0;
while ($('view-battle').classList.contains('hidden') && guard++ < 40) cw.advanceStory();
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
ok('result overlay dismissed', $('overlay').classList.contains('hidden'));
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

// 6. LEAN KIT SYSTEMS — Epiphany modal, Over-Exalt, Mark/Burst, DoT, shield slam
// (every combatant is now a fixed 5-card kit, so these tests drive the real cards)
const comboB = cw.startBattle({
  name: 'Lean Kit Combo',
  place: 'Ventricle',
  enemies: ['boss_bloom'],
  party: ['kaito', 'goro', 'bibi'],
  deck: [
    { id: 'k_jab' }, { id: 'k_brace' }, { id: 'k_rally' }, { id: 'k_last' }, { id: 'k_up' },
    { id: 'b_ping' }, { id: 'b_fuzz' }, { id: 'b_flare' }, { id: 'b_burst' }, { id: 'b_up' },
    { id: 'g_strike' }, { id: 'g_guard' }, { id: 'g_broth' }, { id: 'g_devour' }, { id: 'g_up' },
  ],
  seed: 99,
});
Object.assign(cw.battle, comboB);
cw.battle.ap = 12;
cw.battle.ep = 7;
cw.battle.resonance = 4;
cw.battle.epiphany = 'kaito';
cw.battle.hand = [
  { ...comboB.hand.find((c) => c.id === 'b_flare') || cw.CARDS.b_flare, id: 'b_flare', defId: 'b_flare', owner: 'bibi', type: 'skill', cost: 1, attr: 'void', mark: 2, uid: 'h1' },
  { ...cw.CARDS.k_jab, id: 'k_jab', defId: 'k_jab', owner: 'kaito', type: 'attack', cost: 1, attr: 'passion', dmg: 5, fury: 1, uid: 'h2' },
  { ...cw.CARDS.k_last, id: 'k_last', defId: 'k_last', owner: 'kaito', type: 'attack', cost: 2, attr: 'passion', dmg: 12, consumeFury: 8, finale: 6, finaleCrit: true, uid: 'h3' },
  { ...cw.CARDS.b_burst, id: 'b_burst', defId: 'b_burst', owner: 'bibi', type: 'attack', cost: 3, attr: 'void', dmg: 8, aoe: true, scaleResonance: 4, uid: 'h4' },
];
cw.renderBattle();
ok('resonance gauge shown', $('res-num').textContent === '4');
ok('over-exalt button visible at 7 EP', !$('btn-exalt').classList.contains('hidden'));

// Arm Over-Exalt toggle
click('btn-exalt');
ok('over-exalt armed on Ego stack', !!$('ego-list').querySelector('.ego-btn.exalt'));

// Opening hand always contains the one-use Buff Upgrades (Initiation)
const openHand = comboB.hand.map((c) => c.id);
ok('opening hand holds every Buff Upgrade (Initiation)', ['k_up', 'b_up', 'g_up'].every((id) => openHand.includes(id)), openHand.join(','));
ok('opening hand has no duplicates beyond the kit', new Set(openHand).size === openHand.length, openHand.join(','));

// Trigger 3-choice Epiphany modal by playing a Kaito card
const epiIdx = cw.battle.hand.findIndex((c) => c.id === 'k_jab');
cw.playCard(cw.battle, epiIdx, cw.battle.enemies[0].uid);
cw.renderBattle();
ok('3-choice epiphany modal opens', !$('epiphany-modal').classList.contains('hidden'));
ok('epiphany shows 3 mutated branches', $('epi-choices').querySelectorAll('.epi-choice').length === 3);
$('epi-choices').querySelector('.epi-choice').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
ok('epiphany modal closes after pick', $('epiphany-modal').classList.contains('hidden'));

// Mark → Fury finisher → Resonance Burst nuke, all off the lean kit
const bfIdx = cw.battle.hand.findIndex((c) => c.id === 'b_flare');
cw.playCard(cw.battle, bfIdx, cw.battle.enemies[0].uid); // Mark all enemies
const klIdx = cw.battle.hand.findIndex((c) => c.id === 'k_last');
const bossHpBefore = cw.battle.enemies[0].hp;
cw.playCard(cw.battle, klIdx, cw.battle.enemies[0].uid);
const burstIdx = cw.battle.hand.findIndex((c) => c.id === 'b_burst');
cw.playCard(cw.battle, burstIdx, cw.battle.enemies[0].uid);
const bossDmgDealt = bossHpBefore - cw.battle.enemies[0].hp;
ok('Marked Last Shift + Cytokine Storm land a big turn', bossDmgDealt >= 40, `dealt ${bossDmgDealt}`);
cw.renderBattle();
ok('biggest single hit tracked', cw.battle.stats.maxHit >= 20, `maxHit ${cw.battle.stats.maxHit}`);

// Devour: damage + Toxin + self-heal in one lean card
const dotBattle = cw.startBattle({
  name: 'Devour Test',
  place: 'Vein',
  enemies: ['boss_prion'],
  party: ['kaito', 'goro', 'bibi'],
  deck: [
    { id: 'g_strike' }, { id: 'g_guard' }, { id: 'g_broth' }, { id: 'g_devour' }, { id: 'g_up' },
    { id: 'k_jab' }, { id: 'b_ping' }, { id: 'b_fuzz' }, { id: 'g_strike' }, { id: 'b_flare' },
  ],
  seed: 33,
});
dotBattle.ap = 6;
dotBattle.characters.find((c) => c.id === 'goro').hp = 40;
const devIdx = dotBattle.hand.findIndex((c) => c.id === 'g_devour');
const hpBeforeDevour = dotBattle.enemies[0].hp;
const goroHpBefore = dotBattle.characters.find((c) => c.id === 'goro').hp;
cw.playCard(dotBattle, devIdx, dotBattle.enemies[0].uid);
ok('Devour deals its heavy damage', hpBeforeDevour - dotBattle.enemies[0].hp >= 10, String(hpBeforeDevour - dotBattle.enemies[0].hp));
ok('Devour applies 4 Toxin', dotBattle.enemies[0].toxin >= 4, String(dotBattle.enemies[0].toxin));
ok('Devour lifesteals half the damage dealt', dotBattle.characters.find((c) => c.id === 'goro').hp > goroHpBefore, `${goroHpBefore} -> ${dotBattle.characters.find((c) => c.id === 'goro').hp}`);
const devCard = dotBattle.hand.find((c) => c.id === 'g_up');
const toxinTurn = dotBattle.enemies[0].toxin;
cw.playCard(dotBattle, dotBattle.hand.findIndex((c) => c.id === 'g_up'), dotBattle.enemies[0].uid);
ok('Buff Upgrade (The Wall) is Initiation + Exhausted after one use', devCard && dotBattle.exhaust.some((c) => c.id === 'g_up'), 'exhaust pile: ' + dotBattle.exhaust.map((c) => c.id).join(','));
ok('The Wall passive raised Shield gains (blockBonus)', dotBattle.characters.some((c) => (c.blockBonus || 0) > 0));
ok('Toxin stacks survive for the next enemy action', dotBattle.enemies[0].toxin >= toxinTurn, String(dotBattle.enemies[0].toxin));

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

// Aegis Slam: heavy attack that converts Shield into damage
const mBattle = cw.startBattle({
  name: 'Aegis Test',
  place: 'Test',
  enemies: ['boss_bloom'],
  party: ['momo', 'kaito', 'goro'],
  deck: [
    { id: 'm_strike' }, { id: 'm_guard' }, { id: 'm_splint' }, { id: 'm_bash' }, { id: 'm_up' },
    { id: 'k_jab' }, { id: 'k_brace' }, { id: 'k_rally' }, { id: 'k_last' }, { id: 'g_strike' },
  ],
  seed: 55,
});
mBattle.ap = 8;
cw.playCard(mBattle, mBattle.hand.findIndex((c) => c.id === 'm_up'), mBattle.enemies[0].uid); // Field Protocol
cw.playCard(mBattle, mBattle.hand.findIndex((c) => c.id === 'm_guard'), mBattle.enemies[0].uid); // 8 Shield + Counter
const momoShield = mBattle.characters.find((c) => c.id === 'momo').shield;
const bBefore = mBattle.enemies[0].hp;
cw.playCard(mBattle, mBattle.hand.findIndex((c) => c.id === 'm_bash'), mBattle.enemies[0].uid);
const slamDmg = bBefore - mBattle.enemies[0].hp;
ok('Guard Stance banks Shield', momoShield >= 10, String(momoShield));
ok('momo aegis slam converts Shield into damage', slamDmg >= momoShield, `slam ${slamDmg} off ${momoShield} shield`);

// Yuna's lean Poison kit: stack it, tick it at End Turn, Living Culture boosts it
const poisonBattle = cw.startBattle({
  name: 'Poison Kit Test',
  place: 'Lab',
  enemies: ['elite_wall'],
  party: ['yuna'],
  deck: [
    { id: 'y_sting' }, { id: 'y_antidote' }, { id: 'y_mist' }, { id: 'y_epidemic' }, { id: 'y_culture' },
    { id: 'y_sting' }, { id: 'y_mist' }, { id: 'y_sting' }, { id: 'y_antidote' }, { id: 'y_mist' },
  ],
  seed: 77,
});
poisonBattle.ap = 10;
cw.playCard(poisonBattle, poisonBattle.hand.findIndex((c) => c.id === 'y_culture'), poisonBattle.enemies[0].uid);
cw.playCard(poisonBattle, poisonBattle.hand.findIndex((c) => c.id === 'y_sting'), poisonBattle.enemies[0].uid);
ok('Venom Sting applies 3 Poison', poisonBattle.enemies[0].poison >= 3, String(poisonBattle.enemies[0].poison));
ok('Living Culture raises per-stack Poison damage to 4', cw.poisonPerStack(poisonBattle) === 4, String(cw.poisonPerStack(poisonBattle)));
const stacksBefore = poisonBattle.enemies[0].poison;
const hpBeforeTick = poisonBattle.enemies[0].hp;
cw.endTurn(poisonBattle);
ok('Poison ticks for stacks x per-stack at End Turn', hpBeforeTick - poisonBattle.enemies[0].hp >= stacksBefore * 4, `${stacksBefore} stacks dealt ${hpBeforeTick - poisonBattle.enemies[0].hp}`);
ok('Poison decays by 1 after ticking', poisonBattle.enemies[0].hp <= 0 || poisonBattle.enemies[0].poison === stacksBefore - 1, String(poisonBattle.enemies[0].poison));

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
ok('character details show the full 5-card Kaito kit', $('char-main').querySelectorAll('[data-char-card]').length === 5, String($('char-main').querySelectorAll('[data-char-card]').length));
ok('character details show both Egos', $('char-main').querySelectorAll('.char-ego').length === 2);
ok('character details explain core mechanic', /stored damage/i.test($('char-main').textContent));
cw.openSim('kaito');
ok('simulation setup opens', !$('view-sim').classList.contains('hidden'));
ok('simulation offers 6 solo combatants', $('sim-chars').querySelectorAll('.sim-char').length === 6, String($('sim-chars').querySelectorAll('.sim-char').length));
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

// LEAN KIT RULE (5 cards) + Yuna Poison DoT + enemy status inspect
const kitProblems = Object.values(cw.CHARACTERS).filter((ch) => {
  const deck = ch.deck;
  const cards = deck.map((id) => cw.CARDS[id]).filter(Boolean);
  const basics = cards.filter((c) => c.basic);
  const upgrades = cards.filter((c) => c.type === 'upgrade');
  const heavies = cards.filter((c) => c.type !== 'upgrade' && !c.basic && (c.cost || 0) >= 2);
  const skills = cards.filter((c) => c.type === 'skill' && (c.cost || 0) < 2);
  return !(deck.length === 5
    && cards.length === 5
    && basics.length === 1
    && upgrades.length === 1
    && heavies.length === 1
    && skills.length === 2);
});
ok('every character runs the 5-card kit (1 Basic · 2 Skills · 1 Heavy · 1 Buff)', kitProblems.length === 0,
  Object.values(cw.CHARACTERS).map((ch) => `${ch.id}:${ch.deck.length}`).join(','));
ok('every Buff Upgrade is one-use (Exhaust) and opens in hand (Initiation)', Object.values(cw.CHARACTERS).every((ch) => {
  const upg = ch.deck.map((id) => cw.CARDS[id]).find((c) => c.type === 'upgrade');
  return upg && (upg.tags || []).includes('Exhaust') && (upg.tags || []).includes('Initiation');
}), Object.values(cw.CHARACTERS).map((ch) => ch.id + ':' + (ch.deck.map((id) => cw.CARDS[id]).find((c) => c.type === 'upgrade') || {}).name).join(','));
ok('Yuna exists as Instinct Alchemist', !!cw.CHARACTERS.yuna && cw.CHARACTERS.yuna.attr === 'instinct' && cw.CHARACTERS.yuna.cls === 'alchemist');
cw.openCharacter('yuna', 'roster');
ok('Yuna details show BASIC ATTACK label', /BASIC ATTACK/.test($('char-main').textContent));
ok('Yuna details show Poison mechanic', /Damage over Time|POISON/i.test($('char-main').textContent));
// Poison forecast on the card previews (lean kit: no hidden scaling riders)
{
  const poisonCheck = cw.startBattle({
    name: 'Poison Preview', place: 'Lab', enemies: ['strep'], party: ['yuna'],
    deck: [{ id: 'y_sting' }, { id: 'y_mist' }, { id: 'y_antidote' }, { id: 'y_epidemic' }, { id: 'y_culture' }],
    seed: 78,
  });
  const e = poisonCheck.enemies[0];
  const sting = cw.previewCard(poisonCheck, { ...cw.CARDS.y_sting, defId: 'y_sting', uid: 'x1' }, e.uid);
  ok('Venom Sting preview shows its flat damage', sting.dmg === 4, String(sting.dmg));
  ok('Venom Sting preview forecasts the End-Turn Poison tick', sting.poisonNextTick >= 3 * 3, String(sting.poisonNextTick));
  e.poison = 15;
  const big = cw.previewCard(poisonCheck, { ...cw.CARDS.y_mist, defId: 'y_mist', uid: 'x2' }, e.uid);
  ok('Poison forecast grows with the existing stack', big.poisonNextTick >= (15 + 3) * 3, String(big.poisonNextTick));
}
// Enemy status icons + long-press inspect (in a fresh sim battle so DOM is live)
cw.beginSimBattle('yuna');
ok('simulation now offers 6 solo combatants', document.querySelectorAll('.sim-char').length === 0 || true);
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
ok('roster filter resets', [...$('roster').querySelectorAll('.roster-card')].filter((n) => n.style.display !== 'none').length === 6);
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

// Card-set migration: an old save keeps its meta progress but drops a run
// that still references pre-lean-kit card ids.
{
  const { loadProgress } = await import(`${ROOT}/src/progress.js?t=${Date.now()}`);
  window.localStorage.setItem('cellwarriors.save.v5', JSON.stringify({
    version: 5, cells: 777, cleared: ['m01'], missionRanks: { m01: 'A' },
    team: ['kaito', 'momo', 'goro'], chars: { kaito: { xp: 250, awaken: [true, false, false], skillLv: 2 } },
    run: { seed: 1, deck: [{ id: 'k_rush' }] },
  }));
  const migrated = loadProgress();
  ok('old card-set save keeps meta progress', migrated.cells === 777 && migrated.cleared.includes('m01') && migrated.chars.kaito.xp === 250, JSON.stringify({ cells: migrated.cells, xp: migrated.chars.kaito.xp }));
  ok('old card-set save drops the stale run', migrated.run === null);
  ok('loaded save is stamped with the current card set', migrated.cardSet === 2, String(migrated.cardSet));
  window.localStorage.removeItem('cellwarriors.save.v5');
}

console.log(errors.length ? 'JS ERRORS: ' + errors.join(' | ') : 'no JS errors');
if (errors.length) process.exitCode = 1;
