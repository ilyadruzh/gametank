// Простые настройки игры с сохранением в localStorage.
import type { Theme } from './types';

const THEME_KEY = 'tankoboy.theme.v1';

export function loadTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'night' ? 'night' : 'day';
  } catch {
    return 'day';
  }
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* недоступно — не сохраняем */
  }
}
