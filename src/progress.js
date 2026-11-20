// Save state. localStorage for now — this is the exact payload that later syncs
// to Supabase, so the shape must stay small and boring.
import { DECK_LIST, REGIONS } from './data.js';

const KEY = 'cellwarriors.save.v1';
const BASE_UNLOCKS = [...new Set(DECK_LIST)];

export function defaultProgress() {
  return { version: 1, stem: 0, unlocked: [...BASE_UNLOCKS], cleared: [], lastRegion: REGIONS[0].id };
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return defaultProgress();
    return {
      version: 1,
      stem: Number(parsed.stem) || 0,
      unlocked: Array.isArray(parsed.unlocked) ? [...new Set([...BASE_UNLOCKS, ...parsed.unlocked])] : [...BASE_UNLOCKS],
      cleared: Array.isArray(parsed.cleared) ? parsed.cleared.filter((id) => REGIONS.some((r) => r.id === id)) : [],
      lastRegion: parsed.lastRegion || REGIONS[0].id,
    };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode — the game still plays, it just won't remember */
  }
}

export function resetProgress() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return defaultProgress();
}

/** Region is playable if it's the first one or the previous one is cleared. */
export function regionUnlocked(p, index) {
  if (index === 0) return true;
  return p.cleared.includes(REGIONS[index - 1].id);
}

/** Weakest basics get swapped out when you buy something better, so the deck
 *  never grows past 19 cards — upgrades must feel like upgrades, not dilution. */
const SWAP_ORDER = ['histamine', 'platelet', 'antipyretic', 'neutrophil'];

/** Removes one copy of the weakest basic still duplicated in the deck, so buying
 *  something better never guts a card entirely. */
function removeWeakestBasic(deck) {
  let best = null;
  let bestCount = 0;
  for (const id of SWAP_ORDER) {
    const count = deck.filter((c) => c === id).length;
    if (count > bestCount) {
      best = id;
      bestCount = count;
    }
  }
  if (!best) return;
  deck.splice(deck.indexOf(best), 1);
}

export function buildDeck(p) {
  const extras = p.unlocked.filter((id) => !DECK_LIST.includes(id));
  const deck = [...DECK_LIST];
  for (const id of extras) {
    removeWeakestBasic(deck);
    deck.push(id);
  }
  return deck;
}

export function totalCleared(p) {
  return p.cleared.length;
}
