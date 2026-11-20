// Save state v3 — cleared missions and the saved team of three.
import { MISSIONS, CHARACTERS } from './data.js';

const KEY = 'cellwarriors.save.v3';
const DEFAULT_TEAM = ['kaito', 'momo', 'goro'];

export function defaultProgress() {
  return { version: 3, cleared: [], team: [...DEFAULT_TEAM] };
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProgress();
    const p = JSON.parse(raw);
    if (!p || p.version !== 3) return defaultProgress();
    const team = Array.isArray(p.team) ? p.team.filter((id) => CHARACTERS[id]).slice(0, 3) : [...DEFAULT_TEAM];
    return {
      version: 3,
      cleared: Array.isArray(p.cleared) ? p.cleared.filter((id) => MISSIONS.some((m) => m.id === id)) : [],
      team: team.length === 3 ? team : [...DEFAULT_TEAM],
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

export function missionUnlocked(p, index) {
  return index === 0 || p.cleared.includes(MISSIONS[index - 1].id);
}
