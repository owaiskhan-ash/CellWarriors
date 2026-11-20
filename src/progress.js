// Save state v4 — cleared missions + the chosen team of three.
import { MISSIONS, CHARACTERS } from './data.js';

const KEY = 'cellwarriors.save.v4';
const DEFAULT_TEAM = ['kaito', 'momo', 'goro'];

export function defaultProgress() {
  return { version: 4, cleared: [], team: [...DEFAULT_TEAM] };
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem('cellwarriors.save.v3');
    if (!raw) return defaultProgress();
    const p = JSON.parse(raw);
    if (!p) return defaultProgress();
    const team = Array.isArray(p.team) ? p.team.filter((id) => CHARACTERS[id]).slice(0, 3) : [...DEFAULT_TEAM];
    return {
      version: 4,
      cleared: Array.isArray(p.cleared) ? p.cleared.filter((id) => MISSIONS.some((m) => m.code === id)) : [],
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
    localStorage.removeItem('cellwarriors.save.v3');
  } catch {
    /* ignore */
  }
  return defaultProgress();
}

export function missionUnlocked(p, index) {
  return index === 0 || p.cleared.includes(MISSIONS[index - 1].code);
}
