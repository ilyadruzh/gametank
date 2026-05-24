// Сценарии кампании: миссии с целями, противником, наградой-разблокировкой
// и сложностью (влияет на ИИ бота).
import type { Difficulty, PartCategory, PlayerConfig } from './types';

export type ObjectiveKind = 'destroy' | 'survive';

export interface Objective {
  kind: ObjectiveKind;
  text: string;
  duration?: number; // секунды — только для 'survive'
}

export interface Mission {
  id: string;
  title: string;
  brief: string;
  difficulty: Difficulty;
  objective: Objective;
  enemy: PlayerConfig;
  reward: string;
  // что открывается за прохождение
  unlocks?: Partial<Record<PartCategory, string>>;
  rank?: string;
}

export const MISSIONS: Mission[] = [
  {
    id: 'm1-patrol',
    title: 'Первый выезд',
    brief: 'Лёгкий патруль Аквамара кружит у границы. Догони и подбей — он быстрый, но картонный.',
    difficulty: 'easy',
    objective: { kind: 'destroy', text: 'Уничтожить вражеский танк' },
    enemy: { country: 'aqu', tracks: 'light', turret: 'small', cannon: 'mg', hull: 'scout' },
    reward: 'Открыта тяжёлая башня 🛡️',
    unlocks: { turret: 'big' },
  },
  {
    id: 'm2-hold',
    title: 'Удержать рубеж',
    brief: 'Рудберг прёт в лоб и лупит больно. Не дай себя подбить — продержись, пока не подойдёт подмога.',
    difficulty: 'normal',
    objective: { kind: 'survive', text: 'Продержаться 25 секунд', duration: 25 },
    enemy: { country: 'rud', tracks: 'medium', turret: 'small', cannon: 'gun', hull: 'standard' },
    reward: 'Открыта гаубица 💥',
    unlocks: { cannon: 'howitzer' },
  },
  {
    id: 'm3-bunker',
    title: 'Крепкий орешек',
    brief: 'Бункер Гринланда сидит в глухой обороне. Брони у него вагон — бей метко и не подставляйся.',
    difficulty: 'normal',
    objective: { kind: 'destroy', text: 'Пробить тяжёлую броню' },
    enemy: { country: 'grn', tracks: 'heavy', turret: 'big', cannon: 'gun', hull: 'bunker' },
    reward: 'Открыты тяжёлые гусеницы ⚙️',
    unlocks: { tracks: 'heavy' },
  },
  {
    id: 'm4-duel',
    title: 'Дуэль чемпионов',
    brief: 'Вулкания выставила лучшую машину с гаубицей. Победит тот, кто точнее и хитрее.',
    difficulty: 'hard',
    objective: { kind: 'destroy', text: 'Победить в финальной дуэли' },
    enemy: { country: 'vul', tracks: 'medium', turret: 'big', cannon: 'howitzer', hull: 'standard' },
    reward: 'Корпус «Бункер» 🧱 и звание Маршала 🎖️',
    unlocks: { hull: 'bunker' },
    rank: 'Маршал',
  },
];

export function missionById(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id);
}

export function missionIndex(id: string): number {
  return MISSIONS.findIndex((m) => m.id === id);
}
