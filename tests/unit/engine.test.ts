import { describe, expect, it } from 'vitest';
import { fanAngles, mineTriggered } from '../../src/game/engine';
import { CANNONS } from '../../src/game/parts';

describe('fanAngles (веер мультивыстрела)', () => {
  it('один снаряд — без смещения', () => {
    expect(fanAngles(1, 0)).toEqual([0]);
  });

  it('три снаряда симметрично распределены', () => {
    const a = fanAngles(3, 0.28);
    expect(a).toHaveLength(3);
    expect(a[0]).toBeCloseTo(-0.14, 5);
    expect(a[1]).toBeCloseTo(0, 5);
    expect(a[2]).toBeCloseTo(0.14, 5);
  });

  it('сумма смещений ≈ 0 (симметрия)', () => {
    const sum = fanAngles(5, 0.6).reduce((s, x) => s + x, 0);
    expect(sum).toBeCloseTo(0, 6);
  });

  it('число снарядов ограничено сверху девятью', () => {
    expect(fanAngles(20, 1)).toHaveLength(9);
  });
});

describe('mineTriggered (мины-ловушки)', () => {
  const mine = { x: 100, y: 100, triggerR: 26, armed: true };

  it('срабатывает, когда танк наехал', () => {
    expect(mineTriggered(mine, 110, 100, 20)).toBe(true);
  });

  it('не срабатывает на расстоянии', () => {
    expect(mineTriggered(mine, 200, 200, 20)).toBe(false);
  });

  it('обезвреженная мина не срабатывает', () => {
    expect(mineTriggered({ ...mine, armed: false }, 100, 100, 20)).toBe(false);
  });
});

describe('баланс пушек', () => {
  it('у всех пушек положительные урон и перезарядка', () => {
    for (const c of Object.values(CANNONS)) {
      expect(c.dmg).toBeGreaterThan(0);
      expect(c.reload).toBeGreaterThan(0);
    }
  });

  it('эффективный DPS в разумном коридоре (нет доминирующей пушки)', () => {
    const dps = Object.values(CANNONS).map((c) => (c.dmg / c.reload) * 1000);
    for (const d of dps) {
      expect(d).toBeGreaterThanOrEqual(10);
      expect(d).toBeLessThanOrEqual(45);
    }
  });
});
