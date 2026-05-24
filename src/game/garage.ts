// Гараж танков-характеров. Это НАШИ оригинальные дизайны «в духе жанра»
// (ожившие танки с лицами), а НЕ копии персонажей сериала Gerand — авторские
// права. Каждый — готовый пресет: выбираешь целиком, потом докручиваешь.
import type { PlayerConfig } from './types';

export type FaceId = 'happy' | 'angry' | 'silly' | 'fang' | 'grumpy' | 'cool' | 'derp';

export interface GarageTank {
  id: string;
  name: string;
  personality: string;
  faceId: FaceId;
  config: PlayerConfig;
}

const tank = (
  id: string,
  name: string,
  personality: string,
  faceId: FaceId,
  config: Omit<PlayerConfig, 'faceId' | 'control'>
): GarageTank => ({ id, name, personality, faceId, config: { ...config, faceId, control: 'keys' } });

export const GERAND_TANKS: GarageTank[] = [
  tank('beep', 'Малыш Бип', 'Шустрый трусишка, удирает и пощёлкивает', 'happy', {
    country: 'aqu', tracks: 'sport', turret: 'small', cannon: 'mg', hull: 'scout',
  }),
  tank('broneboy', 'Бронебой', 'Злой здоровяк, ломится напролом', 'angry', {
    country: 'rud', tracks: 'heavy', turret: 'big', cannon: 'gun', hull: 'bunker',
  }),
  tank('kurokidala', 'Курокидала', 'Хохмач — стреляет курицами!', 'silly', {
    country: 'grn', tracks: 'medium', turret: 'twin', cannon: 'chicken', hull: 'standard',
  }),
  tank('drakosha', 'Дракоша', 'Огнедышащий зубастик', 'fang', {
    country: 'vul', tracks: 'medium', turret: 'big', cannon: 'flame', hull: 'standard',
  }),
  tank('gromozeka', 'Громозека', 'Ворчливая крепость с гаубицей', 'grumpy', {
    country: 'sol', tracks: 'siege', turret: 'big', cannon: 'howitzer', hull: 'fortress',
  }),
  tank('sparky', 'Электрончик', 'Бодрый разрядник, бьёт током', 'happy', {
    country: 'nor', tracks: 'light', turret: 'twin', cannon: 'tesla', hull: 'scout',
  }),
  tank('vonyuchka', 'Вонючка', 'Газовый шутник — толкает врага «пшиком»', 'derp', {
    country: 'grn', tracks: 'medium', turret: 'small', cannon: 'fart', hull: 'standard',
  }),
  tank('steklyashka', 'Стекляшка', 'Хрупкий франт в очках, бьёт точно', 'cool', {
    country: 'aqu', tracks: 'sport', turret: 'small', cannon: 'gun', hull: 'glass',
  }),
  tank('nosorog', 'Носорог', 'Бронированный таран с гаубицей', 'angry', {
    country: 'sol', tracks: 'heavy', turret: 'big', cannon: 'howitzer', hull: 'bunker',
  }),
  tank('shmyg', 'Шмыг', 'Самый быстрый разведчик в гараже', 'derp', {
    country: 'nor', tracks: 'sport', turret: 'small', cannon: 'mg', hull: 'scout',
  }),
];
