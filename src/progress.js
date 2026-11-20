// Save v5 — meta progression (cells, XP, awakening, skill levels), saved team, and active run.
// v5 also carries the card-set version: bumping CARD_SET_VERSION discards an
// in-progress run (its deck still holds the old card ids) while keeping every
// meta unlock — cells, XP, awakening, skill levels, cleared missions.
import { MISSIONS, CHARACTERS } from './data.js';

export const CARD_SET_VERSION = 2; // 2 = the lean 5-card kits

const KEY = 'cellwarriors.save.v5';
const OLD = ['cellwarriors.save.v4', 'cellwarriors.save.v3'];
const DEFAULT_TEAM = ['kaito', 'momo', 'goro'];
export const AWAKEN_COST = [60, 120, 200];
export const SKILL_COST = [40, 80, 140];

const emptyChar = () => ({ xp: 0, awaken: [false, false, false], skillLv: 0 });

export function defaultProgress() {
  const chars = {};
  Object.keys(CHARACTERS).forEach((id) => { chars[id] = emptyChar(); });
  return {
    version: 5, cardSet: CARD_SET_VERSION, cells: 0, cleared: [], missionRanks: {},
    team: [...DEFAULT_TEAM], chars,
    run: null, runs: 0, best: null, chaosCleared: false,
  };
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      for (const k of OLD) { if (localStorage.getItem(k)) break; }
      return defaultProgress();
    }
    const p = JSON.parse(raw);
    if (!p || p.version !== 5) return defaultProgress();
    const team = Array.isArray(p.team) ? p.team.filter((id) => CHARACTERS[id]).slice(0, 3) : [...DEFAULT_TEAM];
    const chars = {};
    Object.keys(CHARACTERS).forEach((id) => {
      chars[id] = { ...emptyChar(), ...((p.chars && p.chars[id]) || {}) };
    });
    const staleRun = (p.cardSet || 1) !== CARD_SET_VERSION;
    return {
      version: 5,
      cardSet: CARD_SET_VERSION,
      cells: p.cells || 0,
      cleared: Array.isArray(p.cleared) ? p.cleared : [],
      missionRanks: (p.missionRanks && typeof p.missionRanks === 'object') ? p.missionRanks : {},
      team: team.length === 3 ? team : [...DEFAULT_TEAM],
      chars,
      run: staleRun ? null : (p.run || null),
      runs: p.runs || 0,
      best: p.best || null,
      chaosCleared: !!p.chaosCleared,
    };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode */ }
}

export function resetProgress() {
  try { localStorage.removeItem(KEY); OLD.forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
  return defaultProgress();
}

export function missionUnlocked(p, index) {
  return index === 0 || p.cleared.includes(MISSIONS[index - 1].code);
}

export const levelOf = (xp) => 1 + Math.floor((xp || 0) / 100);
export const xpIntoLevel = (xp) => (xp || 0) % 100;

export function charStats(progress) {
  const out = {};
  Object.keys(CHARACTERS).forEach((id) => {
    const rec = progress.chars[id] || emptyChar();
    const level = levelOf(rec.xp);
    const awk = rec.awaken || [];
    out[id] = {
      level,
      hp: (level - 1) * 4 + (awk[0] ? 10 : 0),
      atk: Math.floor(level / 3) + (awk[1] ? 2 : 0),
      egoDiscount: awk[2] ? 1 : 0,
      skillLv: rec.skillLv || 0,
    };
  });
  return out;
}

export function addXp(progress, amount, teamOverride = null) {
  const each = Math.max(1, Math.round(amount));
  const team = teamOverride || progress.team;
  const leveled = [];
  team.forEach((pid) => {
    const rec = progress.chars[pid] || emptyChar();
    const before = levelOf(rec.xp);
    rec.xp = (rec.xp || 0) + each;
    const after = levelOf(rec.xp);
    progress.chars[pid] = rec;
    if (after > before) leveled.push({ id: pid, level: after });
  });
  return leveled;
}

export function canAwaken(progress, id, slot) {
  const rec = progress.chars[id] || emptyChar();
  if (rec.awaken[slot]) return false;
  if (slot > 0 && !rec.awaken[slot - 1]) return false;
  return progress.cells >= AWAKEN_COST[slot];
}

export function awaken(progress, id, slot) {
  if (!canAwaken(progress, id, slot)) return false;
  progress.cells -= AWAKEN_COST[slot];
  const rec = progress.chars[id] || emptyChar();
  rec.awaken[slot] = true;
  progress.chars[id] = rec;
  return true;
}

export function canSkillUp(progress, id) {
  const rec = progress.chars[id] || emptyChar();
  const lv = rec.skillLv || 0;
  if (lv >= SKILL_COST.length) return false;
  return progress.cells >= SKILL_COST[lv];
}

export function skillUp(progress, id) {
  if (!canSkillUp(progress, id)) return false;
  const rec = progress.chars[id] || emptyChar();
  const lv = rec.skillLv || 0;
  progress.cells -= SKILL_COST[lv];
  rec.skillLv = lv + 1;
  progress.chars[id] = rec;
  return true;
}
