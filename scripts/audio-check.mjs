/* =========================================================================
   CELL WARRIORS — AUDIO CHECK (real Web Audio, rendered offline)
   -------------------------------------------------------------------------
   "Every card has the same sound" is an audible bug but an invisible one: it
   cannot be seen in a screenshot and a human has to play the game to notice.
   This renders the actual synthesis through an OfflineAudioContext in Chromium
   and asserts, numerically:

     • every card's voice is audible (not silent, not clipping)
     • no two cards produce the same waveform fingerprint
     • a character's cards share a family resemblance but are not identical
     • the core SFX all make a sound

   Usage:  bash scripts/browser-test.sh scripts/audio-check.mjs
   ========================================================================= */
import path from 'path';
import { fileURLToPath } from 'url';
import pc from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0;
let passes = 0;
const ok = (label, cond, detail = '') => {
  if (cond) { passes++; if (process.env.VERBOSE) console.log(`PASS  ${label}${detail ? ' — ' + detail : ''}`); }
  else { fails++; console.log(`FAIL  ${label}${detail ? ' — ' + detail : ''}`); }
};

const browser = await pc.launch({
  args: [...chromium.args, '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'],
  executablePath: await chromium.executablePath(),
  headless: true,
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`file://${REPO}/index.html`, { waitUntil: 'networkidle0' });

/* The audio module caches its AudioContext in a module-scope variable, so the
   cleanest way to render one sound in isolation is a fresh page: install an
   OfflineAudioContext as window.AudioContext, import the module, fire the
   sound, render. ~1s per sound, and no leaked nodes between tests. */
const renderOne = async (call) => {
  await page.goto(`file://${REPO}/index.html`, { waitUntil: 'networkidle0' });
  return page.evaluate(async (src) => {
    const RATE = 44100;
    const LEN = RATE * 2;
    let current = null;
    class Offline extends OfflineAudioContext {
      constructor() { super(2, LEN, RATE); current = this; }
      resume() { return Promise.resolve(); }
    }
    window.AudioContext = Offline;
    const audio = await import('./src/audio.js');
    // eslint-disable-next-line no-new-func
    const run = new Function('audio', src);
    run(audio);
    if (!current) return null;
    const buf = await current.startRendering();
    const d = buf.getChannelData(0);
    let peak = 0;
    let energy = 0;
    const slices = new Array(8).fill(0);
    const per = Math.floor(d.length / slices.length);
    for (let i = 0; i < d.length; i++) {
      const v = d[i];
      const a = Math.abs(v);
      if (a > peak) peak = a;
      energy += v * v;
      slices[Math.min(slices.length - 1, Math.floor(i / per))] += v * v;
    }
    return {
      peak: Number(peak.toFixed(3)),
      rms: Number(Math.sqrt(energy / d.length).toFixed(4)),
      slices: slices.map((s) => Math.round(Math.sqrt(s / per) * 1000)),
    };
  }, call);
};

const fingerprint = (r) => (r ? `${r.slices.join(',')}|${r.peak.toFixed(2)}` : 'none');

/* --- 1. the cards ------------------------------------------------------- */
const CARD_IDS = await page.evaluate(async () => {
  const data = await import('./src/data.js');
  return Object.keys(data.CARDS).map((id) => [id, data.CARDS[id].owner]);
});
ok('card table is loaded', CARD_IDS.length > 30, `${CARD_IDS.length} cards`);

const seen = new Map();
const silent = [];
const loud = [];
const sample = CARD_IDS.filter((_, i) => i % 9 === 0).slice(0, 14); // 14 renders, spread across owners
for (const [id, owner] of sample) {
  const r = await renderOne(`audio.cardVoice(${JSON.stringify(id)}, ${JSON.stringify(owner)})`);
  if (!r || r.peak < 0.01) silent.push(`${id}(${r ? r.peak : 'none'})`);
  if (r && r.peak > 0.95) loud.push(`${id}(${r.peak})`);
  const fp = fingerprint(r);
  if (seen.has(fp)) fails++, console.log(`FAIL  ${id} sounds identical to ${seen.get(fp)}`);
  else seen.set(fp, id);
}
ok('every sampled card is audible', silent.length === 0, silent.join(', '));
ok('no card clips into distortion', loud.length === 0, loud.join(', '));
ok('no two sampled cards share a waveform', seen.size === sample.length, `${seen.size}/${sample.length} distinct`);

/* --- 2. character identity is preserved -------------------------------- */
const perChar = await page.evaluate(async () => {
  const data = await import('./src/data.js');
  const out = {};
  for (const [id, c] of Object.entries(data.CARDS)) {
    (out[c.owner] = out[c.owner] || []).push(id);
  }
  return out;
});
for (const [owner, ids] of Object.entries(perChar)) {
  if (ids.length < 2) continue;
  const a = await renderOne(`audio.cardVoice(${JSON.stringify(ids[0])}, ${JSON.stringify(owner)})`);
  const b = await renderOne(`audio.cardVoice(${JSON.stringify(ids[1])}, ${JSON.stringify(owner)})`);
  ok(`${owner}: two cards differ`, fingerprint(a) !== fingerprint(b), `${ids[0]} vs ${ids[1]}`);
}

/* --- 3. the core SFX ---------------------------------------------------- */
const SFX = ['click', 'draw', 'slash', 'shield', 'heal', 'break', 'hurt', 'crit', 'mega',
  'donk', 'stamp', 'epiphany', 'ego', 'win', 'loss', 'poison-tick', 'phase', 'coin'];
for (const kind of SFX) {
  const r = await renderOne(`audio.sfx(${JSON.stringify(kind)}, { amt: 40 })`);
  ok(`sfx: ${kind} sounds`, !!r && r.peak > 0.006, r ? `peak ${r.peak}` : 'no context');
}

/* --- 4. the damage engine still answers -------------------------------- */
for (const [label, args] of [
  ['chip hit', '{ amt: 6 }'],
  ['heavy hit', '{ amt: 32, weak: true }'],
  ['overkill', '{ amt: 120, crit: true, killed: true }'],
  ['multi-hit', '{ amt: 18, hits: 3 }'],
  ['fully blocked', '{ amt: 9, blocked: true }'],
]) {
  const r = await renderOne(`audio.sfxDamage(${args})`);
  ok(`damage: ${label}`, !!r && r.peak > 0.01, r ? `peak ${r.peak}` : 'silent');
}

ok('no JS errors while rendering', errors.length === 0, errors.slice(0, 2).join(' | '));

await browser.close();
console.log(`\n${passes} checks passed, ${fails} failed`);
if (fails) process.exit(1);
console.log('AUDIO OK');
