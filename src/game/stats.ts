// Расчёт итоговых характеристик танка. Использует WASM-ядро, если оно
// загружено; иначе — идентичный JS-фолбэк (та же формула), чтобы UI работал
// до окончания загрузки wasm и в тестовой среде.

import { CANNONS, COUNTRIES, HULLS, TRACKS, TURRETS } from './parts';
import type { PlayerConfig, TankStats } from './types';
import { getPhysics } from '../wasm/loader';

export function computeStats(cfg: PlayerConfig): TankStats {
  const t = TRACKS[cfg.tracks];
  const tu = TURRETS[cfg.turret];
  const cn = CANNONS[cfg.cannon];
  const hu = HULLS[cfg.hull];
  const co = COUNTRIES[cfg.country];
  const m = co.mod;

  const phys = getPhysics()?.exports;

  const hp = phys
    ? phys.computeHp(t.hp, tu.armor, hu.hp, m.hp ?? 0)
    : Math.round(100 + t.hp + tu.armor + hu.hp + (m.hp ?? 0));

  const speed = phys
    ? phys.computeSpeed(t.speed, hu.speedMul, m.speed ?? 1)
    : t.speed * hu.speedMul * (m.speed ?? 1);

  const turn = phys ? phys.computeTurn(tu.turn, m.turn ?? 1) : tu.turn * (m.turn ?? 1);

  const dmg = phys
    ? phys.computeDamage(cn.dmg, m.dmgAdd ?? 0, m.dmg ?? 1)
    : Math.round((cn.dmg + (m.dmgAdd ?? 0)) * (m.dmg ?? 1));

  const reload = phys ? phys.computeReload(cn.reload, m.reload ?? 1) : cn.reload * (m.reload ?? 1);
  const bspeed = phys ? phys.computeBulletSpeed(cn.bspeed, m.bspeed ?? 1) : cn.bspeed * (m.bspeed ?? 1);

  const radius = t.len * 0.5 * 0.72 * hu.sizeMul;

  return {
    hp,
    maxHp: hp,
    speed,
    turn,
    dmg,
    reload,
    bspeed,
    blen: cn.blen,
    bw: cn.bw,
    bsize: cn.bullet,
    cannonKind: cn.kind,
    blife: cn.blife ?? 140,
    bounces: cn.bounces ?? 0,
    push: cn.push ?? 0,
    len: t.len * hu.sizeMul,
    wid: t.wid * hu.sizeMul,
    thick: t.thick,
    tsize: tu.size,
    cannon: cfg.cannon,
    radius,
    color: co.cols[0],
    color2: co.cols[1],
    faceId: cfg.faceId,
  };
}

// Нормировочные максимумы для шкал в конструкторе.
export const STAT_MAX = { hp: 260, speed: 3.6, dmg: 46, fire: 8, turn: 0.09 };

export interface StatRow {
  label: string;
  value: string;
  ratio: number;
}

export function statRows(st: TankStats): StatRow[] {
  const fire = 1000 / st.reload;
  return [
    { label: 'Броня', value: String(st.maxHp), ratio: clamp01(st.maxHp / STAT_MAX.hp) },
    { label: 'Скорость', value: st.speed.toFixed(1), ratio: clamp01(st.speed / STAT_MAX.speed) },
    { label: 'Урон', value: String(st.dmg), ratio: clamp01(st.dmg / STAT_MAX.dmg) },
    { label: 'Скорострельность', value: `${fire.toFixed(1)}/с`, ratio: clamp01(fire / STAT_MAX.fire) },
    { label: 'Поворот', value: String((st.turn * 1000) | 0), ratio: clamp01(st.turn / STAT_MAX.turn) },
  ];
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
