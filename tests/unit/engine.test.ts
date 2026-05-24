import { describe, expect, it } from 'vitest';
import { applyTether, computeCamera, fanAngles, mineTriggered, WORLD_H, WORLD_W } from '../../src/game/engine';
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

describe('computeCamera (камера-слежка)', () => {
  it('центрируется на середине двух точек', () => {
    const cam = computeCamera([{ x: 1000, y: 800 }, { x: 1400, y: 1000 }], 1280, 800);
    expect(cam.x).toBeCloseTo(1200, 5);
    expect(cam.y).toBeCloseTo(900, 5);
  });

  it('отъезжает (зум меньше) когда танки далеко', () => {
    const near = computeCamera([{ x: 1000, y: 1000 }, { x: 1100, y: 1000 }], 1280, 800);
    const far = computeCamera([{ x: 600, y: 1000 }, { x: 2000, y: 1000 }], 1280, 800);
    expect(far.zoom).toBeLessThan(near.zoom);
  });

  it('без точек возвращает центр мира', () => {
    const cam = computeCamera([], 1280, 800);
    expect(cam.x).toBeCloseTo(WORLD_W / 2, 5);
    expect(cam.y).toBeCloseTo(WORLD_H / 2, 5);
  });
});

describe('applyTether (привязка танков)', () => {
  it('не трогает близкие танки', () => {
    expect(applyTether(0, 0, 100, 0, 760)).toEqual([0, 0, 100, 0]);
  });

  it('стягивает далёкие танки к середине на maxSep', () => {
    const [ax, , bx] = applyTether(0, 0, 2000, 0, 760);
    expect(bx - ax).toBeCloseTo(760, 5);
    expect((ax + bx) / 2).toBeCloseTo(1000, 5); // середина сохраняется
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
