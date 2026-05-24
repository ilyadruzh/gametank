// Общие типы данных игры.

export type PartCategory = 'tracks' | 'turret' | 'cannon' | 'hull';
export type CountryId = string;
export type PartId = string;
export type Difficulty = 'easy' | 'normal' | 'hard';
export type Theme = 'day' | 'night';
export type View = '2d' | '3d';
export type CannonKind = 'normal' | 'flame' | 'electric' | 'fart' | 'chicken';
export type ControlMode = 'keys' | 'mouse';

export interface TrackPart {
  name: string;
  desc: string;
  hp: number; // прибавка к броне
  speed: number; // базовая скорость
  len: number; // геометрия корпуса
  wid: number;
  thick: number; // толщина гусеницы
}

export interface TurretPart {
  name: string;
  desc: string;
  turn: number; // скорость поворота (рад/тик)
  armor: number; // прибавка к броне
  size: number;
}

export interface CannonPart {
  name: string;
  desc: string;
  kind: CannonKind;
  dmg: number;
  reload: number; // мс
  bspeed: number; // скорость снаряда
  blen: number; // длина ствола
  bw: number; // ширина ствола
  bullet: number; // радиус снаряда
  blife?: number; // время жизни снаряда (тики); по умолчанию 140
  bounces?: number; // сколько раз отскакивает (курица)
  push?: number; // отталкивание цели при попадании (пукалка)
}

export interface HullPart {
  name: string;
  desc: string;
  hp: number; // прибавка к броне
  speedMul: number; // множитель скорости
  sizeMul: number; // множитель габаритов (влияет на хитбокс)
}

export interface CountryMod {
  dmg?: number; // множитель урона
  hp?: number; // прибавка брони
  speed?: number; // множитель скорости
  reload?: number; // множитель перезарядки
  turn?: number; // множитель поворота
  bspeed?: number; // множитель скорости снаряда
  dmgAdd?: number; // прибавка к урону до множителя
}

export interface Country {
  name: string;
  cols: [string, string, string];
  perk: string;
  mod: CountryMod;
}

export interface PlayerConfig {
  country: CountryId;
  tracks: PartId;
  turret: PartId;
  cannon: PartId;
  hull: PartId;
  control?: ControlMode; // способ управления (клавиатура/мышь)
  faceId?: string; // лицо персонажа из гаража
}

export interface TankStats {
  hp: number;
  maxHp: number;
  speed: number;
  turn: number;
  dmg: number;
  reload: number;
  bspeed: number;
  blen: number;
  bw: number;
  bsize: number;
  cannonKind: CannonKind;
  blife: number;
  bounces: number;
  push: number;
  len: number;
  wid: number;
  thick: number;
  tsize: number;
  cannon: string;
  trackId: string;
  turretId: string;
  hullId: string;
  radius: number;
  color: string;
  color2: string;
  faceId?: string;
}
