import { beforeEach, describe, expect, it } from 'vitest';
import {
  BASE_UNLOCKS,
  computeUnlocked,
  isMissionUnlocked,
  loadCompleted,
  sanitizeConfig,
  saveCompleted,
} from '../../src/game/campaign';
import { MISSIONS } from '../../src/game/missions';
import { defaultConfig } from '../../src/game/parts';

describe('computeUnlocked', () => {
  it('без пройденных миссий открыт только базовый набор', () => {
    const u = computeUnlocked([]);
    expect([...u.turret]).toEqual(BASE_UNLOCKS.turret);
    expect(u.turret.has('big')).toBe(false);
    expect(u.cannon.has('howitzer')).toBe(false);
  });

  it('прохождение миссии открывает её награду', () => {
    const u = computeUnlocked(['m1-patrol']);
    expect(u.turret.has('big')).toBe(true); // m1 открывает тяжёлую башню
  });

  it('прохождение всех миссий открывает все награды', () => {
    const u = computeUnlocked(MISSIONS.map((m) => m.id));
    expect(u.turret.has('big')).toBe(true);
    expect(u.cannon.has('howitzer')).toBe(true);
    expect(u.tracks.has('heavy')).toBe(true);
    expect(u.hull.has('bunker')).toBe(true);
  });
});

describe('isMissionUnlocked', () => {
  it('первая миссия всегда доступна', () => {
    expect(isMissionUnlocked(MISSIONS[0].id, [])).toBe(true);
  });

  it('вторая доступна только после первой', () => {
    expect(isMissionUnlocked(MISSIONS[1].id, [])).toBe(false);
    expect(isMissionUnlocked(MISSIONS[1].id, [MISSIONS[0].id])).toBe(true);
  });
});

describe('sanitizeConfig', () => {
  it('заменяет заблокированную деталь на базовую', () => {
    const unlocked = computeUnlocked([]);
    const cfg = { ...defaultConfig(), cannon: 'howitzer', turret: 'big' };
    const fixed = sanitizeConfig(cfg, unlocked);
    expect(fixed.cannon).toBe(BASE_UNLOCKS.cannon[0]); // 'mg'
    expect(fixed.turret).toBe(BASE_UNLOCKS.turret[0]); // 'small'
  });

  it('оставляет открытые детали как есть', () => {
    const unlocked = computeUnlocked(['m1-patrol']);
    const cfg = { ...defaultConfig(), turret: 'big', cannon: 'gun' };
    const fixed = sanitizeConfig(cfg, unlocked);
    expect(fixed.turret).toBe('big');
    expect(fixed.cannon).toBe('gun');
  });
});

describe('persistence', () => {
  beforeEach(() => localStorage.clear());

  it('сохраняет и читает список пройденных миссий', () => {
    expect(loadCompleted()).toEqual([]);
    saveCompleted(['m1-patrol', 'm2-hold']);
    expect(loadCompleted()).toEqual(['m1-patrol', 'm2-hold']);
  });

  it('игнорирует битые данные', () => {
    localStorage.setItem('tankoboy.campaign.v1', '{not json');
    expect(loadCompleted()).toEqual([]);
  });
});
