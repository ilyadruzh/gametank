// Каталог деталей и стран. Значения подобраны под аркадный баланс.
import type {
  CannonPart,
  Country,
  HullPart,
  PlayerConfig,
  TrackPart,
  TurretPart,
} from './types';

export const TRACKS: Record<string, TrackPart> = {
  sport: { name: 'Спорт', desc: 'Очень быстрые, бумажные', hp: -10, speed: 3.1, len: 60, wid: 38, thick: 8 },
  light: { name: 'Лёгкие', desc: 'Быстрые, тонкая броня', hp: 0, speed: 2.7, len: 64, wid: 42, thick: 9 },
  medium: { name: 'Средние', desc: 'Золотая середина', hp: 45, speed: 2.1, len: 74, wid: 50, thick: 12 },
  heavy: { name: 'Тяжёлые', desc: 'Медленные, но крепкие', hp: 95, speed: 1.55, len: 86, wid: 58, thick: 15 },
  siege: { name: 'Осадные', desc: 'Ползёт, но как крепость', hp: 150, speed: 1.15, len: 94, wid: 64, thick: 18 },
};

export const TURRETS: Record<string, TurretPart> = {
  small: { name: 'Лёгкая башня', desc: 'Шустрый поворот', turn: 0.06, armor: 0, size: 24 },
  twin: { name: 'Спаренная', desc: 'Средняя во всём', turn: 0.05, armor: 22, size: 28 },
  big: { name: 'Тяжёлая башня', desc: '+броня, но медленнее', turn: 0.038, armor: 45, size: 34 },
};

export const CANNONS: Record<string, CannonPart> = {
  mg: { name: 'Пулемёт', desc: 'Слабо, но очень часто', kind: 'normal', dmg: 4, reload: 120, bspeed: 9, blen: 30, bw: 5, bullet: 3 },
  gun: { name: 'Пушка', desc: 'Сбалансированный выстрел', kind: 'normal', dmg: 16, reload: 620, bspeed: 8, blen: 40, bw: 8, bullet: 5 },
  howitzer: { name: 'Гаубица', desc: 'Бьёт больно, но редко', kind: 'normal', dmg: 34, reload: 1450, bspeed: 6, blen: 30, bw: 13, bullet: 8 },
  flame: { name: 'Огнемёт', desc: 'Жарит вблизи частыми язычками', kind: 'flame', dmg: 3, reload: 70, bspeed: 6, blen: 26, bw: 11, bullet: 6, blife: 24 },
  tesla: { name: 'Электропушка', desc: 'Быстрый разряд, бьёт больно', kind: 'electric', dmg: 22, reload: 720, bspeed: 16, blen: 34, bw: 6, bullet: 4 },
  fart: { name: 'Пукалка', desc: 'Медленное облако, толкает врага', kind: 'fart', dmg: 6, reload: 480, bspeed: 3.4, blen: 22, bw: 13, bullet: 9, blife: 95, push: 16 },
  chicken: { name: 'Курострел', desc: 'Курицы скачут от стен!', kind: 'chicken', dmg: 18, reload: 820, bspeed: 7, blen: 26, bw: 10, bullet: 7, blife: 220, bounces: 3 },
};

// "что-то ещё" из ТЗ — корпус, влияет на броню/скорость/габариты.
export const HULLS: Record<string, HullPart> = {
  glass: { name: 'Стеклопушка', desc: 'Хрупкий, но быстрый', hp: -20, speedMul: 1.2, sizeMul: 0.85 },
  scout: { name: 'Разведкорпус', desc: 'Лёгкий и юркий', hp: 0, speedMul: 1.12, sizeMul: 0.92 },
  standard: { name: 'Стандарт', desc: 'Без сюрпризов', hp: 20, speedMul: 1.0, sizeMul: 1.0 },
  bunker: { name: 'Бункер', desc: 'Толстая шкура, тяжёлый', hp: 70, speedMul: 0.9, sizeMul: 1.08 },
  fortress: { name: 'Крепость', desc: 'Ходячая стена', hp: 120, speedMul: 0.8, sizeMul: 1.15 },
};

export const COUNTRIES: Record<string, Country> = {
  rud: { name: 'Рудберг', cols: ['#c0392b', '#1a1a1a', '#f4f4f4'], perk: '+25% урон', mod: { dmg: 1.25 } },
  grn: { name: 'Гринланд', cols: ['#2e7d32', '#f4d03f', '#2e7d32'], perk: '+60 брони', mod: { hp: 60 } },
  aqu: { name: 'Аквамар', cols: ['#1f6fb2', '#ffffff', '#1f6fb2'], perk: '+25% скорость', mod: { speed: 1.25 } },
  sol: { name: 'Сольтерра', cols: ['#e67e22', '#8e4b16', '#f4c542'], perk: '−25% перезарядка', mod: { reload: 0.75 } },
  nor: { name: 'Нордвинд', cols: ['#4aa3c4', '#eaf6fb', '#7d8a99'], perk: '+40% поворот', mod: { turn: 1.4 } },
  vul: { name: 'Вулкания', cols: ['#7b1f10', '#e8541e', '#1a1a1a'], perk: '+снаряд +урон', mod: { bspeed: 1.35, dmgAdd: 3 } },
};

export const PART_LABELS: Record<string, string> = {
  country: '🌍 Страна',
  tracks: '⚙️ Гусеницы',
  turret: '🛡️ Башня',
  cannon: '💥 Пушка',
  hull: '🧱 Корпус',
};

export function defaultConfig(): PlayerConfig {
  return { country: 'rud', tracks: 'medium', turret: 'small', cannon: 'gun', hull: 'standard', control: 'keys' };
}
