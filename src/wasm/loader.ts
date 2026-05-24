// Мост между JS и WASM-ядром физики (assembly/index.ts).
// Модуль не импортирует ничего из хоста, поэтому instantiate с пустым importObject.

import wasmUrl from './physics.wasm?url';

export interface PhysicsExports {
  memory: WebAssembly.Memory;
  scratchPtr(): number;
  computeHp(trackHp: number, turretArmor: number, hullHp: number, countryHpAdd: number): number;
  computeSpeed(trackSpeed: number, hullSpeedMul: number, countrySpeedMul: number): number;
  computeTurn(turretTurn: number, countryTurnMul: number): number;
  computeDamage(cannonDmg: number, countryDmgAdd: number, countryDmgMul: number): number;
  computeReload(cannonReload: number, countryReloadMul: number): number;
  computeBulletSpeed(cannonBspeed: number, countryBspeedMul: number): number;
  stepTank(
    x: number, y: number, angle: number, spd: number,
    moveInput: number, turnInput: number, maxSpeed: number, turnRate: number, dt: number
  ): void;
  clampToArena(x: number, y: number, spd: number, r: number, w: number, h: number): void;
  pushOutOfCircle(x: number, y: number, spd: number, r: number, ox: number, oy: number, orad: number): void;
  separateCircles(ax: number, ay: number, ar: number, bx: number, by: number, br: number): void;
  circleHit(px: number, py: number, cx: number, cy: number, radius: number): number;
}

export interface PhysicsModule {
  exports: PhysicsExports;
  /** Float64-вид на scratch-буфер результатов (16 слотов). */
  scratch: Float64Array;
}

export async function instantiateFromBytes(bytes: BufferSource): Promise<PhysicsModule> {
  const { instance } = await WebAssembly.instantiate(bytes, {});
  return wrap(instance);
}

function wrap(instance: WebAssembly.Instance): PhysicsModule {
  const exports = instance.exports as unknown as PhysicsExports;
  const scratch = new Float64Array(exports.memory.buffer, exports.scratchPtr(), 16);
  return { exports, scratch };
}

let cached: PhysicsModule | null = null;
let pending: Promise<PhysicsModule> | null = null;

/** Загрузить и закэшировать модуль (для браузера/Vite). */
export async function initPhysics(): Promise<PhysicsModule> {
  if (cached) return cached;
  if (!pending) {
    pending = fetch(wasmUrl)
      .then((r) => r.arrayBuffer())
      .then(instantiateFromBytes)
      .then((m) => {
        cached = m;
        return m;
      });
  }
  return pending;
}

/** Синхронный доступ к уже загруженному модулю (или null). */
export function getPhysics(): PhysicsModule | null {
  return cached;
}
