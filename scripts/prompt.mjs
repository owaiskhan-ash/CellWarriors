#!/usr/bin/env node
// Builds a locked, on-model image prompt from docs/characters.json.
// Usage:
//   node scripts/prompt.mjs <id> [--shot=full|portrait|card|chibi] [--pose="..."] [--json]
//   node scripts/prompt.mjs --list
//   node scripts/prompt.mjs all --shot=card        # prompt for every character, one per block
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const bible = JSON.parse(readFileSync(join(here, '..', 'docs', 'characters.json'), 'utf8'));

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
const flag = (name, fallback) => {
  const raw = args.find((a) => a.startsWith(`--${name}=`));
  return raw ? raw.slice(name.length + 3) : fallback;
};

const all = { ...bible.characters, ...bible.pathogens };

if (!id || id === '--list' || args.includes('--list')) {
  console.log('Characters:', Object.keys(bible.characters).join(', '));
  console.log('Pathogens: ', Object.keys(bible.pathogens).join(', '));
  console.log('Shots:     ', Object.keys(bible.shots).join(', '));
  process.exit(0);
}

const shotKey = flag('shot', 'full');
const shot = bible.shots[shotKey];
if (!shot) {
  console.error(`Unknown shot "${shotKey}". Options: ${Object.keys(bible.shots).join(', ')}`);
  process.exit(1);
}

function buildPrompt(character, ctx) {
  const s = bible.style;
  const pose = ctx.pose || character.pose;
  const isPathogen = character.kind === 'pathogen';

  const parts = [
    s.art,
    s.palette,
    `CHARACTER: ${character.identity}`,
    isPathogen ? '' : `COSTUME: ${character.costume}`,
    character.prop ? `WEAPON/PROP: ${character.prop}` : '',
    `POSE: ${pose}`,
    ctx.shot,
    s.background,
    isPathogen
      ? 'Not a human: no face, no clothing, no weapons, no human anatomy.'
      : 'Strictly on-model: same hair, same costume, same colours as specified — only pose and expression may vary.',
  ].filter(Boolean);

  return parts.join(' ');
}

function render(key, pose) {
  const character = all[key];
  if (!character) {
    console.error(`Unknown id "${key}". Run: node scripts/prompt.mjs --list`);
    process.exit(1);
  }
  const prompt = buildPrompt(character, { shot, pose });
  const negative = [bible.style.negative, character.never].filter(Boolean).join(', ');
  return { key, name: character.name || key, prompt, negative };
}

const keys = id === 'all' ? Object.keys(all) : [id];

if (args.includes('--json')) {
  console.log(JSON.stringify(keys.map((k) => render(k, flag('pose'))), null, 2));
  process.exit(0);
}

for (const key of keys) {
  const r = render(key, flag('pose'));
  console.log(`\n=== ${r.name.toUpperCase()} (${r.key}) · shot: ${shotKey} ===`);
  console.log(`PROMPT:\n${r.prompt}\n`);
  console.log(`NEGATIVE:\n${r.negative}`);
  if (keys.length > 1) console.log('\n' + '-'.repeat(72));
}
