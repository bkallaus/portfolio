import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

const isTheme = (value: unknown): value is Theme =>
  value === 'light' || value === 'dark' || value === 'system';

// Fallback preference for when localStorage is unavailable (private browsing, quota).
let memoryTheme: Theme | null = null;

/** Reads the saved preference, falling back to `system`. */
export const getStoredTheme = (): Theme => {
  if (memoryTheme) return memoryTheme;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
};

export const prefersDark = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;

export const resolveTheme = (theme: Theme): ResolvedTheme =>
  theme === 'system' ? (prefersDark() ? 'dark' : 'light') : theme;

export const applyTheme = (theme: Theme) => {
  document.documentElement.classList.toggle('dark', resolveTheme(theme) === 'dark');
};

// The View Transitions API isn't in TS 4.9's DOM lib yet.
interface DocumentWithViewTransitions extends Document {
  startViewTransition?: (callback: () => void) => { ready: Promise<void> };
}

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// localStorage is the source of truth, so every ThemeToggle on the page stays in
// step with the others and with the pre-paint script in index.html.
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) {
      applyTheme(getStoredTheme());
      listener();
    }
  };
  window.addEventListener('storage', onStorage);

  const mql =
    typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null;
  const onSystemChange = () => {
    applyTheme(getStoredTheme());
    listener();
  };
  // `addListener` is the deprecated fallback for older Safari.
  if (mql?.addEventListener) mql.addEventListener('change', onSystemChange);
  else mql?.addListener(onSystemChange);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
    if (mql?.removeEventListener) mql.removeEventListener('change', onSystemChange);
    else mql?.removeListener(onSystemChange);
  };
};

export const setTheme = (theme: Theme) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    memoryTheme = null;
  } catch {
    // Storage unavailable — keep the choice in memory so it still holds for this session.
    memoryTheme = theme;
  }
  applyTheme(theme);
  emit();
};

type Point = { x: number; y: number };

/**
 * Sets the theme with a circular reveal expanding outward from `origin` (typically the
 * click that triggered the change), via the View Transitions API. Falls back to a plain
 * switch — the `@layer base` colour transition in App.css still cross-fades it — when the
 * API is unsupported, no origin is given, or the user prefers reduced motion.
 */
export const setThemeAnimated = (theme: Theme, origin?: Point) => {
  const startViewTransition = (document as DocumentWithViewTransitions).startViewTransition;

  if (!startViewTransition || !origin || prefersReducedMotion()) {
    setTheme(theme);
    return;
  }

  const { x, y } = origin;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  const root = document.documentElement;
  root.style.setProperty('--theme-toggle-x', `${x}px`);
  root.style.setProperty('--theme-toggle-y', `${y}px`);
  root.style.setProperty('--theme-toggle-radius', `${radius}px`);

  startViewTransition.call(document, () => setTheme(theme));
};

/**
 * Current theme preference and the light/dark it currently resolves to.
 * `system` (the default) follows the OS, including changes made while the page is open.
 */
export const useTheme = () => {
  const theme = useSyncExternalStore(subscribe, getStoredTheme, () => 'system' as Theme);
  const resolved = useSyncExternalStore(
    subscribe,
    () => resolveTheme(getStoredTheme()),
    () => 'light' as ResolvedTheme,
  );

  return { theme, resolved, setTheme, setThemeAnimated };
};
