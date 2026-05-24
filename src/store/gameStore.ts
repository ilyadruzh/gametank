import { create } from 'zustand';
import { defaultConfig } from '../game/parts';
import { computeUnlocked, loadCompleted, sanitizeConfig, saveCompleted } from '../game/campaign';
import { missionById } from '../game/missions';
import type { PartCategory, PlayerConfig } from '../game/types';
import type { BattleMode } from '../game/engine';

export type Screen = 'title' | 'campaign' | 'build' | 'battle';

interface GameState {
  screen: Screen;
  mode: BattleMode;
  players: [PlayerConfig, PlayerConfig];
  buildIndex: 0 | 1;
  muted: boolean;
  result: { winner: number } | null;

  // кампания
  completed: string[];
  currentMissionId: string | null;

  startBuild: (mode: BattleMode) => void;
  setPart: (index: 0 | 1, category: PartCategory | 'country', value: string) => void;
  nextBuild: () => void;
  backBuild: () => void;
  goBattle: () => void;
  setResult: (winner: number) => void;
  rematch: () => void;
  rebuild: () => void;
  toMenu: () => void;
  toggleMute: () => void;

  openCampaign: () => void;
  selectMission: (id: string) => void;
  beginMission: () => void;
  completeMission: (id: string) => void;
}

const BOT_ENEMY: PlayerConfig = { country: 'vul', tracks: 'heavy', turret: 'big', cannon: 'gun', hull: 'bunker' };

export const useGame = create<GameState>((set, get) => ({
  screen: 'title',
  mode: 'versus',
  players: [defaultConfig(), { ...defaultConfig(), country: 'aqu' }],
  buildIndex: 0,
  muted: false,
  result: null,

  completed: loadCompleted(),
  currentMissionId: null,

  startBuild: (mode) => set({ mode, buildIndex: 0, screen: 'build', result: null }),

  setPart: (index, category, value) =>
    set((s) => {
      const players = [...s.players] as [PlayerConfig, PlayerConfig];
      players[index] = { ...players[index], [category]: value };
      return { players };
    }),

  nextBuild: () => {
    const { mode, buildIndex } = get();
    if (mode === 'bot') {
      set((s) => {
        const players = [...s.players] as [PlayerConfig, PlayerConfig];
        players[1] = { ...BOT_ENEMY };
        return { players, screen: 'battle', result: null };
      });
      return;
    }
    if (mode === 'campaign') {
      // противника уже задала миссия — сразу в бой
      set({ screen: 'battle', result: null });
      return;
    }
    if (buildIndex === 0) set({ buildIndex: 1 });
    else set({ screen: 'battle', result: null });
  },

  backBuild: () => {
    const { mode, buildIndex } = get();
    if (mode === 'campaign') {
      set({ screen: 'campaign' });
      return;
    }
    if (buildIndex === 1) set({ buildIndex: 0 });
    else set({ screen: 'title' });
  },

  goBattle: () => set({ screen: 'battle', result: null }),
  setResult: (winner) => set({ result: { winner } }),
  rematch: () => set({ screen: 'battle', result: null }),
  rebuild: () => set({ screen: 'build', buildIndex: 0, result: null }),
  toMenu: () => set({ screen: 'title', result: null }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),

  openCampaign: () => set({ screen: 'campaign', result: null, currentMissionId: null }),

  selectMission: (id) => set({ currentMissionId: id }),

  beginMission: () => {
    const { currentMissionId, completed, players } = get();
    if (!currentMissionId) return;
    const mission = missionById(currentMissionId);
    if (!mission) return;
    const unlocked = computeUnlocked(completed);
    const next = [...players] as [PlayerConfig, PlayerConfig];
    next[0] = sanitizeConfig(players[0], unlocked);
    next[1] = { ...mission.enemy };
    set({ mode: 'campaign', players: next, buildIndex: 0, screen: 'build', result: null });
  },

  completeMission: (id) =>
    set((s) => {
      if (s.completed.includes(id)) return s;
      const completed = [...s.completed, id];
      saveCompleted(completed);
      return { completed };
    }),
}));
