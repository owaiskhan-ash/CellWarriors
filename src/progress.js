// Save state v2 — chapters cleared. Small, boring, ready to sync to Supabase later.
import { CHAPTERS } from './data.js';

const KEY = 'cellwarriors.save.v2';

export function defaultProgress() {
  return { version: 2, cleared: [] };
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProgress();
    const p = JSON.parse(raw);
    if (!p || p.version !== 2) return defaultProgress();
    return {
      version: 2,
      cleared: Array.isArray(p.cleared) ? p.cleared.filter((id) => CHAPTERS.some((c) => c.id === id)) : [],
    };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode — plays fine, just won't remember */
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

export function chapterUnlocked(p, index) {
  return index === 0 || p.cleared.includes(CHAPTERS[index - 1].id);
}
