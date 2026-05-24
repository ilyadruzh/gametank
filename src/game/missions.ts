// Сценарии и миссии. Заготовка под кампанию: список миссий с целями,
// настройкой противника и условиями победы. Боевой движок пока запускает
// дуэль; поля enemy/objective используются для брифинга и будут расширены.
import type { PlayerConfig } from './types';

export type ObjectiveKind = 'destroy' | 'survive';

export interface Mission {
  id: string;
  title: string;
  brief: string;
  objective: { kind: ObjectiveKind; text: string };
  enemy: PlayerConfig;
  reward: string;
}

export const MISSIONS: Mission[] = [
  {
    id: 'm1-recon',
    title: 'Разведка боем',
    brief: 'Лёгкий патруль Аквамара кружит у границы. Догони и подбей — он быстрый, но хрупкий.',
    objective: { kind: 'destroy', text: 'Уничтожить вражеский танк' },
    enemy: { country: 'aqu', tracks: 'light', turret: 'small', cannon: 'mg', hull: 'scout' },
    reward: 'Открыта тяжёлая башня',
  },
  {
    id: 'm2-bunker',
    title: 'Крепкий орешек',
    brief: 'Бункер Гринланда сидит в обороне. Брони у него вагон — бей метко и не подставляйся.',
    objective: { kind: 'destroy', text: 'Пробить тяжёлую броню' },
    enemy: { country: 'grn', tracks: 'heavy', turret: 'big', cannon: 'gun', hull: 'bunker' },
    reward: 'Открыта гаубица',
  },
  {
    id: 'm3-duel',
    title: 'Дуэль чемпионов',
    brief: 'Вулкания выставила лучшую машину. Урон у неё страшный — победит тот, кто точнее.',
    objective: { kind: 'destroy', text: 'Победить в честной дуэли' },
    enemy: { country: 'vul', tracks: 'medium', turret: 'big', cannon: 'howitzer', hull: 'standard' },
    reward: 'Звание Маршала',
  },
];

export function missionById(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id);
}
