import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from '../components/theme-toggle';
import {
  getStoredTheme,
  resolveTheme,
  setTheme,
  setThemeAnimated,
  THEME_STORAGE_KEY,
} from './theme';

type Listener = () => void;

const mockMatchMedia = (matches: boolean) => {
  const listeners = new Set<Listener>();
  const mql = {
    matches,
    addEventListener: (_: string, cb: Listener) => listeners.add(cb),
    removeEventListener: (_: string, cb: Listener) => listeners.delete(cb),
  };
  window.matchMedia = (() => mql) as unknown as typeof window.matchMedia;
  return {
    emit: (next: boolean) => {
      mql.matches = next;
      listeners.forEach((cb) => cb());
    },
  };
};

const isDark = () => document.documentElement.classList.contains('dark');

describe('theme', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    mockMatchMedia(false);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  describe('resolveTheme', () => {
    it('follows the OS when set to system', () => {
      mockMatchMedia(true);
      expect(resolveTheme('system')).toBe('dark');
      mockMatchMedia(false);
      expect(resolveTheme('system')).toBe('light');
    });

    it('ignores the OS for explicit choices', () => {
      mockMatchMedia(true);
      expect(resolveTheme('light')).toBe('light');
      mockMatchMedia(false);
      expect(resolveTheme('dark')).toBe('dark');
    });
  });

  describe('getStoredTheme', () => {
    it('defaults to system when nothing is stored', () => {
      expect(getStoredTheme()).toBe('system');
    });

    it('ignores a junk value in storage', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'chartreuse');
      expect(getStoredTheme()).toBe('system');
    });
  });

  describe('setTheme', () => {
    it('persists the choice and applies the class', () => {
      setTheme('dark');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
      expect(isDark()).toBe(true);

      setTheme('light');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
      expect(isDark()).toBe(false);
    });
  });

  describe('setThemeAnimated', () => {
    const mockReducedMotion = (matches: boolean) => {
      window.matchMedia = ((query: string) => ({
        matches: query.includes('reduced-motion') ? matches : false,
        addEventListener: () => {},
        removeEventListener: () => {},
      })) as unknown as typeof window.matchMedia;
    };

    afterEach(() => {
      delete (document as { startViewTransition?: unknown }).startViewTransition;
      document.documentElement.style.removeProperty('--theme-toggle-x');
      document.documentElement.style.removeProperty('--theme-toggle-y');
      document.documentElement.style.removeProperty('--theme-toggle-radius');
    });

    it('falls back to a plain switch when the API is unsupported', () => {
      setThemeAnimated('dark', { x: 10, y: 10 });
      expect(isDark()).toBe(true);
    });

    it('falls back to a plain switch with no origin, even if supported', () => {
      const startViewTransition = vi.fn();
      (document as { startViewTransition?: unknown }).startViewTransition =
        startViewTransition;

      setThemeAnimated('dark');
      expect(isDark()).toBe(true);
      expect(startViewTransition).not.toHaveBeenCalled();
    });

    it('falls back to a plain switch under reduced motion', () => {
      mockReducedMotion(true);
      const startViewTransition = vi.fn();
      (document as { startViewTransition?: unknown }).startViewTransition =
        startViewTransition;

      setThemeAnimated('dark', { x: 10, y: 10 });
      expect(isDark()).toBe(true);
      expect(startViewTransition).not.toHaveBeenCalled();
    });

    it('drives the change through startViewTransition and sets the reveal origin', () => {
      mockReducedMotion(false);
      const startViewTransition = vi.fn((cb: () => void) => {
        cb();
        return { ready: Promise.resolve() };
      });
      (document as { startViewTransition?: unknown }).startViewTransition =
        startViewTransition;

      setThemeAnimated('dark', { x: 42, y: 7 });

      expect(startViewTransition).toHaveBeenCalledTimes(1);
      expect(isDark()).toBe(true);
      const style = document.documentElement.style;
      expect(style.getPropertyValue('--theme-toggle-x')).toBe('42px');
      expect(style.getPropertyValue('--theme-toggle-y')).toBe('7px');
      expect(style.getPropertyValue('--theme-toggle-radius')).not.toBe('');
    });
  });

  describe('ThemeToggle', () => {
    it('marks the stored theme as the selected option', () => {
      setTheme('dark');
      render(<ThemeToggle />);
      expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Light' })).not.toBeChecked();
    });

    it('defaults to System', () => {
      render(<ThemeToggle />);
      expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
    });

    it('switches the theme when an option is clicked', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      await user.click(screen.getByRole('radio', { name: 'Dark' }));
      expect(isDark()).toBe(true);
      expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();

      await user.click(screen.getByRole('radio', { name: 'Light' }));
      expect(isDark()).toBe(false);
      expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
    });

    it('keeps every toggle on the page in step', async () => {
      const user = userEvent.setup();
      render(
        <>
          <div data-testid="a"><ThemeToggle /></div>
          <div data-testid="b"><ThemeToggle /></div>
        </>,
      );

      const inB = (name: string) =>
        screen.getByTestId('b').querySelector<HTMLElement>(`[aria-label="${name}"]`)!;

      await user.click(
        screen.getByTestId('a').querySelector<HTMLElement>('[aria-label="Dark"]')!,
      );
      expect(inB('Dark')).toHaveAttribute('aria-checked', 'true');
    });

    it('tracks the OS while set to system, but not once overridden', () => {
      const media = mockMatchMedia(false);
      render(<ThemeToggle />);

      act(() => media.emit(true));
      expect(isDark()).toBe(true);

      act(() => setTheme('light'));
      act(() => media.emit(true));
      expect(isDark()).toBe(false);
    });
  });
});
