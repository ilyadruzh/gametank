// Прогресс кампании: какие миссии пройдены, какие детали открыты,
// сохранение в localStorage и приведение конфигурации танка к открытым деталям.
import { MISSIONS, missionIndex } from './missions';
import type { PartCategory, PlayerConfig } from './types';

const STORAGE_KEY = 'tankoboy.campaign.v1';

// Что доступно с самого начала (страны не блокируются — это «флаг», а не деталь).
export const BASE_UNLOCKS: Record<PartCategory, string[]> = {
  tracks: ['sport', 'light', 'medium', 'siege', 'wheels'], // heavy — награда за миссию
  turret: ['small', 'twin', 'mortar'], // big — награда
  cannon: ['mg', 'gun', 'flame', 'tesla', 'fart', 'chicken', 'rocket'], // howitzer — награда
  hull: ['glass', 'scout', 'standard', 'fortress', 'wedge'], // bunker — награда
};

export type UnlockSet = Record<PartCategory, Set<string>>;

/** Набор открытых деталей по списку пройденных миссий. */
export function computeUnlocked(completed: string[]): UnlockSet {
  const out: UnlockSet = {
    tracks: new Set(BASE_UNLOCKS.tracks),
    turret: new Set(BASE_UNLOCKS.turret),
    cannon: new Set(BASE_UNLOCKS.cannon),
    hull: new Set(BASE_UNLOCKS.hull),
  };
  for (const id of completed) {
    const m = MISSIONS.find((x) => x.id === id);
    if (!m?.unlocks) continue;
    for (const [cat, partId] of Object.entries(m.unlocks) as [PartCategory, string][]) {
      out[cat].add(partId);
    }
  }
  return out;
}

/** Миссия доступна, если она первая или предыдущая пройдена. */
export function isMissionUnlocked(id: string, completed: string[]): boolean {
  const idx = missionIndex(id);
  if (idx <= 0) return true;
  const prev = MISSIONS[idx - 1];
  return completed.includes(prev.id);
}

/** Заменить заблокированные детали на базовые, чтобы конфиг был валиден. */
export function sanitizeConfig(cfg: PlayerConfig, unlocked: UnlockSet): PlayerConfig {
  const fix = (cat: PartCategory, val: string) => (unlocked[cat].has(val) ? val : BASE_UNLOCKS[cat][0]);
  return {
    ...cfg,
    tracks: fix('tracks', cfg.tracks),
    turret: fix('turret', cfg.turret),
    cannon: fix('cannon', cfg.cannon),
    hull: fix('hull', cfg.hull),
  };
}

export function loadCompleted(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string');
  } catch {
    /* нет хранилища или битые данные — начинаем с нуля */
  }
  return [];
}

export function saveCompleted(completed: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
  } catch {
    /* приватный режим/недоступно — просто не сохраняем */
  }
}
