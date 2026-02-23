'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

const THEMES = {
  dark: 'dark',
  light: 'light',
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(THEMES.dark);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('theme');
    const initialTheme = saved === THEMES.light ? THEMES.light : THEMES.dark;
    applyTheme(initialTheme);
  }, []);

  const applyTheme = (nextTheme) => {
    const root = document.documentElement;
    root.classList.remove(THEMES.dark, THEMES.light);
    root.classList.add(nextTheme);
    root.style.colorScheme = nextTheme;
    localStorage.setItem('theme', nextTheme);
    setTheme(nextTheme);
  };

  const toggleTheme = () => {
    const nextTheme = theme === THEMES.dark ? THEMES.light : THEMES.dark;
    applyTheme(nextTheme);
  };

  const value = useMemo(
    () => ({ theme, toggleTheme, isMounted }),
    [theme, isMounted]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
