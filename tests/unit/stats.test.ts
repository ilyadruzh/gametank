import { describe, expect, it } from 'vitest';
import { computeStats, statRows } from '../../src/game/stats';
import { defaultConfig } from '../../src/game/parts';
import type { PlayerConfig } from '../../src/game/types';

// В среде Vitest WASM не загружен (getPhysics() === null), поэтому проверяется
// JS-фолбэк. Его формула обязана совпадать с WASM (см. wasm.test.ts).

describe('computeStats (JS-фолбэк)', () => {
  it('считает базовый танк Рудберга (+25% урон)', () => {
    const st = computeStats(defaultConfig());
    expect(st.hp).toBe(165);
    expect(st.speed).toBeCloseTo(2.1, 5);
    expect(st.turn).toBeCloseTo(0.06, 5);
    expect(st.dmg).toBe(20); // round(16 * 1.25)
    expect(st.reload).toBe(620);
    expect(st.bspeed).toBe(8);
    expect(st.radius).toBeCloseTo(26.64, 2);
    expect(st.color).toBe('#c0392b');
  });

  it('перк Аквамара даёт +25% скорости', () => {
    const cfg: PlayerConfig = { ...defaultConfig(), country: 'aqu' };
    expect(computeStats(cfg).speed).toBeCloseTo(2.625, 5);
  });

  it('тяжёлый бункер с большой башней набирает много брони', () => {
    const cfg: PlayerConfig = { country: 'grn', tracks: 'heavy', turret: 'big', cannon: 'gun', hull: 'bunker' };
    // 100 + 95 + 45 + 70 + 60 = 370
    expect(computeStats(cfg).hp).toBe(370);
  });

  it('корпус-разведчик уменьшает габариты и хитбокс', () => {
    const scout = computeStats({ ...defaultConfig(), hull: 'scout' });
    const std = computeStats(defaultConfig());
    expect(scout.radius).toBeLessThan(std.radius);
    expect(scout.speed).toBeGreaterThan(std.speed);
  });

  it('спецпушки пробрасывают тип и свои поля', () => {
    const chicken = computeStats({ ...defaultConfig(), cannon: 'chicken' });
    expect(chicken.cannonKind).toBe('chicken');
    expect(chicken.bounces).toBe(3);
    expect(chicken.blife).toBe(220);

    const fart = computeStats({ ...defaultConfig(), cannon: 'fart' });
    expect(fart.cannonKind).toBe('fart');
    expect(fart.push).toBe(16);

    const gun = computeStats(defaultConfig());
    expect(gun.cannonKind).toBe('normal');
    expect(gun.bounces).toBe(0);
  });
});

describe('statRows', () => {
  it('возвращает 5 шкал с долями в [0,1]', () => {
    const rows = statRows(computeStats(defaultConfig()));
    expect(rows).toHaveLength(5);
    for (const r of rows) {
      expect(r.ratio).toBeGreaterThanOrEqual(0);
      expect(r.ratio).toBeLessThanOrEqual(1);
      expect(typeof r.value).toBe('string');
    }
  });
});
