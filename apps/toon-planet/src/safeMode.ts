const STORAGE_KEY = 'toon-planet-safe-mode';

export const SAFE_LEVELS = ['all effects on', 'shadows off', 'shadows and comic outlines off'];

export type SafeState = {
  level: number;
  history: string[];
};

function load(): SafeState {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null');
    if (stored && typeof stored.level === 'number' && Array.isArray(stored.history)) return stored;
  } catch {}
  return { level: 0, history: [] };
}

function save(state: SafeState): boolean {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function readSafeState(): SafeState {
  const state = load();
  const forced = Number(new URLSearchParams(window.location.search).get('safe'));
  if (Number.isInteger(forced) && forced > 0) state.level = Math.min(forced, SAFE_LEVELS.length - 1);
  return state;
}

export function retrySimpler(state: SafeState, note: string): boolean {
  const next = { level: state.level + 1, history: [...state.history, note] };
  if (next.level >= SAFE_LEVELS.length || !save(next)) return false;
  window.location.reload();
  return true;
}
