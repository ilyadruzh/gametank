import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { instantiateFromBytes, type PhysicsModule } from '../../src/wasm/loader';

let phys: PhysicsModule;

beforeAll(async () => {
  const bytes = readFileSync(resolve(process.cwd(), 'src/wasm/physics.wasm'));
  phys = await instantiateFromBytes(bytes);
});

describe('WASM: расчёт характеристик', () => {
  it('computeHp складывает все источники брони и округляет', () => {
    expect(phys.exports.computeHp(45, 0, 20, 0)).toBe(165);
    expect(phys.exports.computeHp(95, 45, 70, 60)).toBe(370);
  });

  it('computeSpeed перемножает базу и множители', () => {
    expect(phys.exports.computeSpeed(2.1, 1, 1)).toBeCloseTo(2.1, 5);
    expect(phys.exports.computeSpeed(2.7, 1.12, 1.25)).toBeCloseTo(2.7 * 1.12 * 1.25, 5);
  });

  it('computeDamage прибавляет, потом умножает, округляет', () => {
    expect(phys.exports.computeDamage(16, 0, 1.25)).toBe(20);
    expect(phys.exports.computeDamage(16, 3, 1)).toBe(19);
  });

  it('computeReload и computeBulletSpeed — простое умножение', () => {
    expect(phys.exports.computeReload(620, 0.75)).toBeCloseTo(465, 5);
    expect(phys.exports.computeBulletSpeed(8, 1.35)).toBeCloseTo(10.8, 5);
  });
});

describe('WASM: физика', () => {
  it('stepTank двигает танк вперёд по направлению угла', () => {
    phys.exports.stepTank(100, 100, 0, 0, 1, 0, 3, 0.06, 1);
    const [x, y, angle, spd] = phys.scratch;
    expect(spd).toBeGreaterThan(0);
    expect(x).toBeGreaterThan(100); // движется по +X при angle=0
    expect(y).toBeCloseTo(100, 1);
    expect(angle).toBe(0);
  });

  it('stepTank поворачивает при turnInput', () => {
    phys.exports.stepTank(100, 100, 0, 0, 0, 1, 3, 0.06, 1);
    expect(phys.scratch[2]).toBeCloseTo(0.06, 5);
  });

  it('clampToArena удерживает танк в границах и гасит скорость', () => {
    phys.exports.clampToArena(-5, 700, 2, 20, 960, 600);
    const [x, y, spd] = phys.scratch;
    expect(x).toBe(20);
    expect(y).toBe(580);
    expect(spd).toBeCloseTo(2 * 0.4 * 0.4, 5); // зажат по обеим осям
  });

  it('pushOutOfCircle выталкивает при пересечении и ставит флаг', () => {
    phys.exports.pushOutOfCircle(100, 100, 2, 20, 110, 100, 20);
    const [x, , , hit] = phys.scratch;
    expect(hit).toBe(1);
    expect(x).toBeLessThan(100); // оттолкнут влево от препятствия справа
  });

  it('pushOutOfCircle не трогает танк вне радиуса', () => {
    phys.exports.pushOutOfCircle(100, 100, 2, 20, 300, 300, 20);
    expect(phys.scratch[3]).toBe(0);
    expect(phys.scratch[0]).toBe(100);
  });

  it('separateCircles разводит два пересекающихся танка', () => {
    phys.exports.separateCircles(100, 100, 20, 110, 100, 20);
    const [ax, , bx, , hit] = phys.scratch;
    expect(hit).toBe(1);
    expect(ax).toBeLessThan(100);
    expect(bx).toBeGreaterThan(110);
  });

  it('circleHit детектирует попадание', () => {
    expect(phys.exports.circleHit(105, 100, 100, 100, 10)).toBe(1);
    expect(phys.exports.circleHit(130, 100, 100, 100, 10)).toBe(0);
  });
});
