import { describe, expect, it } from 'vitest';
import { GERAND_TANKS } from '../../src/game/garage';
import { CANNONS, COUNTRIES, HULLS, TRACKS, TURRETS } from '../../src/game/parts';

describe('гараж танков-характеров', () => {
  it('в гараже достаточно вариантов', () => {
    expect(GERAND_TANKS.length).toBeGreaterThanOrEqual(9);
  });

  it('id уникальны', () => {
    const ids = GERAND_TANKS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('все детали пресетов существуют в каталогах', () => {
    for (const t of GERAND_TANKS) {
      expect(COUNTRIES[t.config.country], `country ${t.config.country}`).toBeDefined();
      expect(TRACKS[t.config.tracks], `tracks ${t.config.tracks}`).toBeDefined();
      expect(TURRETS[t.config.turret], `turret ${t.config.turret}`).toBeDefined();
      expect(CANNONS[t.config.cannon], `cannon ${t.config.cannon}`).toBeDefined();
      expect(HULLS[t.config.hull], `hull ${t.config.hull}`).toBeDefined();
      expect(t.config.faceId).toBe(t.faceId);
    }
  });

  it('задействованы разные пушки (есть спецпушки)', () => {
    const cannons = new Set(GERAND_TANKS.map((t) => t.config.cannon));
    expect(cannons.size).toBeGreaterThanOrEqual(5);
    expect([...cannons].some((c) => ['flame', 'tesla', 'fart', 'chicken'].includes(c))).toBe(true);
  });
});
