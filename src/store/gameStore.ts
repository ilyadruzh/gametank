import { create } from 'zustand';
import { defaultConfig } from '../game/parts';
import { computeUnlocked, loadCompleted, sanitizeConfig, saveCompleted } from '../game/campaign';
import { loadMusic, loadTheme, loadView, saveMusic, saveTheme, saveView } from '../game/settings';
import { missionById } from '../game/missions';
import type { ControlMode, PartCategory, PlayerConfig, Theme, View } from '../game/types';
import type { BattleMode } from '../game/engine';

export type Screen = 'title' | 'campaign' | 'build' | 'battle';

interface GameState {
  screen: Screen;
  mode: BattleMode;
  players: [PlayerConfig, PlayerConfig];
  buildIndex: 0 | 1;
  muted: boolean;
  music: boolean;
  theme: Theme;
  view: View;
  result: { winner: number } | null;

  // кампания
  completed: string[];
  currentMissionId: string | null;

  startBuild: (mode: BattleMode) => void;
  setPart: (index: 0 | 1, category: PartCategory | 'country', value: string) => void;
  setControl: (index: 0 | 1, mode: ControlMode) => void;
  pickGarage: (index: 0 | 1, config: PlayerConfig) => void;
  nextBuild: () => void;
  backBuild: () => void;
  goBattle: () => void;
  setResult: (winner: number) => void;
  rematch: () => void;
  rebuild: () => void;
  toMenu: () => void;
  toggleMute: () => void;
  toggleMusic: () => void;
  toggleTheme: () => void;
  toggleView: () => void;

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
  music: loadMusic(),
  theme: loadTheme(),
  view: loadView(),
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

  // мышь одна на двоих: при выборе мыши у одного — второму ставим клавиатуру
  setControl: (index, mode) =>
    set((s) => {
      const players = [...s.players] as [PlayerConfig, PlayerConfig];
      players[index] = { ...players[index], control: mode };
      if (mode === 'mouse') {
        const other = (index === 0 ? 1 : 0) as 0 | 1;
        players[other] = { ...players[other], control: 'keys' };
      }
      return { players };
    }),

  pickGarage: (index, config) =>
    set((s) => {
      const players = [...s.players] as [PlayerConfig, PlayerConfig];
      // сохраняем выбранный способ управления игрока
      players[index] = { ...config, control: players[index].control ?? 'keys' };
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
  toggleMusic: () =>
    set((s) => {
      const music = !s.music;
      saveMusic(music);
      return { music };
    }),
  toggleTheme: () =>
    set((s) => {
      const theme: Theme = s.theme === 'day' ? 'night' : 'day';
      saveTheme(theme);
      return { theme };
    }),
  toggleView: () =>
    set((s) => {
      const view: View = s.view === '2d' ? '3d' : '2d';
      saveView(view);
      return { view };
    }),

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
