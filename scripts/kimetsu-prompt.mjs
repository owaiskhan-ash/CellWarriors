#!/usr/bin/env node
// Builds locked, on-model Demon Slayer-style prompts from docs/kimetsu.json.
// Sibling to scripts/prompt.mjs (which serves docs/characters.json — do not merge them).
//
// Usage:
//   node scripts/kimetsu-prompt.mjs --list
//   node scripts/kimetsu-prompt.mjs hotaru [--shot=full|portrait|card|action] [--pose="..."]
//                                     [--bg=blur|vessel|paper|fujikasane|ember-dusk|grey-dawn]
//   node scripts/kimetsu-prompt.mjs fujikasane [--camera="..."]
//   node scripts/kimetsu-prompt.mjs all [--json] [--shot=card]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const bible = JSON.parse(readFileSync(join(here, '..', 'docs', 'kimetsu.json'), 'utf8'));

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
const flag = (name, fallback) => {
  const raw = args.find((a) => a.startsWith(`--${name}=`));
  return raw ? raw.slice(name.length + 3) : fallback;
};

const charKeys = Object.keys(bible.characters);
const envKeys = Object.keys(bible.environments);

if (!id || args.includes('--list')) {
  console.log('Characters:  ', charKeys.join(', '));
  console.log('Environments:', envKeys.join(', '));
  console.log('Shots:       ', Object.keys(bible.shots).join(', '));
  console.log('Backgrounds: ', Object.keys(bible.backgrounds).join(', '));
  process.exit(0);
}

const stylePreamble = () => `${bible.style.art} ${bible.style.palette} ${bible.style.effect}`;

function characterPrompt(key, shot, pose, bg) {
  const c = bible.characters[key];
  if (!c) {
    console.error(`Unknown character "${key}". Run: node scripts/kimetsu-prompt.mjs --list`);
    process.exit(1);
  }
  const background = bible.backgrounds[bg] || bible.environments[bg]?.lock || bible.backgrounds.blur;
  return [
    stylePreamble(),
    `CHARACTER: ${c.identity}`,
    `COSTUME: ${c.costume}`,
    `WEAPON/PROP: ${c.prop}`,
    `POSITION: ${pose || c.pose}`,
    shot,
    background,
    'Strictly on-model: same hair, hair gradient, eye colour, haori pattern and blade colour as specified — only pose, expression and camera may vary.',
  ].join(' ');
}

function environmentPrompt(key, camera, withFigure) {
  const e = bible.environments[key];
  if (!e) {
    console.error(`Unknown environment "${key}". Run: node scripts/kimetsu-prompt.mjs --list`);
    process.exit(1);
  }
  const parts = [
    `${bible.style.art} ${bible.style.palette}`,
    `ENVIRONMENT: ${e.lock}`,
    `CAMERA: ${camera || e.camera}`,
    'Horizontal 16:9 background plate, no human figure',
    withFigure
      ? 'except one distant human silhouette at one-sixth frame height at the top of the stair, scale reference only, no facial detail, no readable costume pattern.'
      : '.',
    'Landscape plate only: no faces, no text, no signage, no kanji, no watermark.',
  ];
  return parts.join(' ');
}

function build(key, opts) {
  const shotKey = opts.shot || 'full';
  const shot = bible.shots[shotKey];
  if (!shot) {
    console.error(`Unknown shot "${shotKey}". Options: ${Object.keys(bible.shots).join(', ')}`);
    process.exit(1);
  }

  if (bible.environments[key]) {
    return {
      key,
      name: bible.environments[key].name,
      kind: 'environment',
      prompt: environmentPrompt(key, opts.camera, opts.figure),
      negative: `${bible.style.negative}, characters, people in frame, portrait`,
    };
  }

  const c = bible.characters[key];
  if (!c) {
    console.error(`Unknown id "${key}". Run: node scripts/kimetsu-prompt.mjs --list`);
    process.exit(1);
  }
  return {
    key,
    name: c.name,
    kind: 'character',
    prompt: characterPrompt(key, shot, opts.pose, opts.bg),
    negative: `${bible.style.negative}, ${c.never}`,
  };
}

const keys = id === 'all' ? [...charKeys, ...envKeys] : [id];
const opts = {
  shot: flag('shot', 'full'),
  pose: flag('pose'),
  bg: flag('bg'),
  camera: flag('camera'),
  figure: args.includes('--figure'),
};

const results = keys.map((k) => build(k, opts));

if (args.includes('--json')) {
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

for (const r of results) {
  const meta = r.kind === 'character' ? `shot: ${opts.shot}` : 'environment';
  console.log(`\n=== ${r.name} (${r.key}) · ${meta} ===`);
  console.log(`PROMPT:\n${r.prompt}\n`);
  console.log(`NEGATIVE:\n${r.negative}\n`);
}
