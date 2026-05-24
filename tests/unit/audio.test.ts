import { afterAll, describe, expect, it } from 'vitest';
import {
  initAudio,
  noiseBurst,
  sBoom,
  setEngineLevel,
  setMuted,
  setMusicOn,
  sHit,
  sMine,
  sShoot,
  startEngineHum,
  stopEngineHum,
  sWin,
} from '../../src/game/audio';

// В jsdom нет AudioContext — все звуковые функции обязаны безопасно ничего не
// делать и не падать.

afterAll(() => setMusicOn(false));

describe('audio без AudioContext (jsdom)', () => {
  it('initAudio не падает и не создаёт контекст', () => {
    expect(() => initAudio()).not.toThrow();
  });

  it('звуки пушек по типу не падают', () => {
    for (const k of ['mg', 'gun', 'howitzer', 'flame', 'electric', 'fart', 'chicken']) {
      expect(() => sShoot(k)).not.toThrow();
    }
  });

  it('эффекты и шум не падают', () => {
    expect(() => {
      sHit();
      sBoom();
      sMine();
      sWin();
      noiseBurst(0.1, 0.5, 200);
    }).not.toThrow();
  });

  it('мотор и музыка управляются без ошибок', () => {
    expect(() => {
      startEngineHum();
      setEngineLevel(0.7);
      stopEngineHum();
      setMusicOn(true);
      setMusicOn(false);
      setMuted(true);
      setMuted(false);
    }).not.toThrow();
  });
});
