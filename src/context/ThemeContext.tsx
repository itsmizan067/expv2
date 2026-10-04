import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark';

/** localStorage key — must stay in sync with the boot script in index.html */
export const THEME_STORAGE_KEY = 'exp-tracker-theme';

const THEME_COLORS: Record<Theme, string> = {
  light: '#0f172a',
  dark: '#0b1220',
};

interface ThemeContextValue {
  /** The theme currently applied to the document */
  theme: Theme;
  /** True when the user has not chosen explicitly and we follow the OS setting */
  isSystemDefault: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  /** Forget the explicit choice and follow the OS preference again */
  resetToSystem: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const getSystemTheme = (): Theme =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

const getStoredTheme = (): Theme | null => {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null; // storage unavailable (private mode, etc.)
  }
};

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[theme]);
};

/** Briefly enable colour transitions so a user-initiated switch fades smoothly */
const withTransition = () => {
  const root = document.documentElement;
  root.classList.add('theme-transition');
  window.setTimeout(() => root.classList.remove('theme-transition'), 350);
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storedTheme, setStoredTheme] = useState<Theme | null>(getStoredTheme);
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme);

  const theme: Theme = storedTheme ?? systemTheme;

  // Apply to <html> whenever the effective theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Track OS preference changes (only matters while no explicit choice is stored)
  useEffect(() => {
    const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mql) return;
    const onChange = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // Keep multiple open tabs in sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) setStoredTheme(getStoredTheme());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    withTransition();
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    setStoredTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const resetToSystem = useCallback(() => {
    withTransition();
    try {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setStoredTheme(null);
  }, []);

  const value = useMemo(
    () => ({ theme, isSystemDefault: storedTheme === null, setTheme, toggleTheme, resetToSystem }),
    [theme, storedTheme, setTheme, toggleTheme, resetToSystem]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};
