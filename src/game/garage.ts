// Гараж танков-персонажей в духе анимаций про оживших танков (оригинальные
// дизайны, без копирования защищённых персонажей). Каждый — готовый пресет,
// который можно выбрать целиком, а потом докрутить в конструкторе.
import type { PlayerConfig } from './types';

export type FaceId = 'happy' | 'angry' | 'silly' | 'fang' | 'grumpy';

export interface GarageTank {
  id: string;
  name: string;
  personality: string;
  faceId: FaceId;
  config: PlayerConfig;
}

export const GERAND_TANKS: GarageTank[] = [
  {
    id: 'beep',
    name: 'Малыш Бип',
    personality: 'Шустрый трусишка, удирает и пощёлкивает',
    faceId: 'happy',
    config: { country: 'aqu', tracks: 'sport', turret: 'small', cannon: 'mg', hull: 'scout', faceId: 'happy', control: 'keys' },
  },
  {
    id: 'broneboy',
    name: 'Бронебой',
    personality: 'Злой здоровяк, ломится напролом',
    faceId: 'angry',
    config: { country: 'rud', tracks: 'heavy', turret: 'big', cannon: 'gun', hull: 'bunker', faceId: 'angry', control: 'keys' },
  },
  {
    id: 'kurokidala',
    name: 'Курокидала',
    personality: 'Хохмач — стреляет курицами!',
    faceId: 'silly',
    config: { country: 'grn', tracks: 'medium', turret: 'twin', cannon: 'chicken', hull: 'standard', faceId: 'silly', control: 'keys' },
  },
  {
    id: 'drakosha',
    name: 'Дракоша',
    personality: 'Огнедышащий зубастик',
    faceId: 'fang',
    config: { country: 'vul', tracks: 'medium', turret: 'big', cannon: 'flame', hull: 'standard', faceId: 'fang', control: 'keys' },
  },
  {
    id: 'gromozeka',
    name: 'Громозека',
    personality: 'Ворчливая крепость с гаубицей',
    faceId: 'grumpy',
    config: { country: 'sol', tracks: 'siege', turret: 'big', cannon: 'howitzer', hull: 'fortress', faceId: 'grumpy', control: 'keys' },
  },
  {
    id: 'sparky',
    name: 'Электрончик',
    personality: 'Бодрый разрядник, бьёт током',
    faceId: 'happy',
    config: { country: 'nor', tracks: 'light', turret: 'twin', cannon: 'tesla', hull: 'scout', faceId: 'happy', control: 'keys' },
  },
];
