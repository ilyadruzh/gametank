import { describe, expect, it } from 'vitest';
import { fanAngles } from '../../src/game/engine';

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
