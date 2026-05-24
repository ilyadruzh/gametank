import { create } from 'zustand';
import { defaultConfig } from '../game/parts';
import type { PartCategory, PlayerConfig } from '../game/types';
import type { BattleMode } from '../game/engine';

export type Screen = 'title' | 'build' | 'battle';

interface GameState {
  screen: Screen;
  mode: BattleMode;
  players: [PlayerConfig, PlayerConfig];
  buildIndex: 0 | 1;
  muted: boolean;
  result: { winner: number } | null;

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
}

const BOT_ENEMY: PlayerConfig = { country: 'vul', tracks: 'heavy', turret: 'big', cannon: 'gun', hull: 'bunker' };

export const useGame = create<GameState>((set, get) => ({
  screen: 'title',
  mode: 'versus',
  players: [defaultConfig(), { ...defaultConfig(), country: 'aqu' }],
  buildIndex: 0,
  muted: false,
  result: null,

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
      // в одиночной игре противника собирает компьютер
      set((s) => {
        const players = [...s.players] as [PlayerConfig, PlayerConfig];
        players[1] = { ...BOT_ENEMY };
        return { players, screen: 'battle', result: null };
      });
      return;
    }
    if (buildIndex === 0) set({ buildIndex: 1 });
    else set({ screen: 'battle', result: null });
  },

  backBuild: () => {
    const { buildIndex } = get();
    if (buildIndex === 1) set({ buildIndex: 0 });
    else set({ screen: 'title' });
  },

  goBattle: () => set({ screen: 'battle', result: null }),
  setResult: (winner) => set({ result: { winner } }),
  rematch: () => set({ screen: 'battle', result: null }),
  rebuild: () => set({ screen: 'build', buildIndex: 0, result: null }),
  toMenu: () => set({ screen: 'title', result: null }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
}));
