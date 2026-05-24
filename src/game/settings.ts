// Простые настройки игры с сохранением в localStorage.
import type { Theme, View } from './types';

const THEME_KEY = 'tankoboy.theme.v1';
const VIEW_KEY = 'tankoboy.view.v1';

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

export function loadView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === '3d' ? '3d' : '2d';
  } catch {
    return '2d';
  }
}

export function saveView(view: View): void {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    /* недоступно — не сохраняем */
  }
}
