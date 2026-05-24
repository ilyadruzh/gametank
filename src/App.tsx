import { useEffect, useState } from 'react';
import { useGame } from './store/gameStore';
import { initPhysics } from './wasm/loader';
import { setMuted } from './game/audio';
import TitleScreen from './components/screens/TitleScreen';
import CampaignScreen from './components/screens/CampaignScreen';
import BuildScreen from './components/screens/BuildScreen';
import BattleScreen from './components/screens/BattleScreen';

export default function App() {
  const screen = useGame((s) => s.screen);
  const muted = useGame((s) => s.muted);
  const [physReady, setPhysReady] = useState(false);

  useEffect(() => {
    initPhysics()
      .then(() => setPhysReady(true))
      .catch((e) => {
        console.error('Не удалось загрузить WASM-физику:', e);
        // Фолбэк в stats.ts позволяет конструктору работать и без wasm.
        setPhysReady(true);
      });
  }, []);

  useEffect(() => {
    setMuted(muted);
  }, [muted]);

  // Тестовый хук: в dev-сборке отдаём store наружу для E2E (Playwright).
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as unknown as { __game?: typeof useGame }).__game = useGame;
    }
  }, []);

  return (
    <div id="app" data-testid="app">
      {!physReady && (
        <section className="screen" data-testid="screen-loading">
          <div className="loading">Загружаем боевые модули…</div>
        </section>
      )}
      {physReady && screen === 'title' && <TitleScreen />}
      {physReady && screen === 'campaign' && <CampaignScreen />}
      {physReady && screen === 'build' && <BuildScreen />}
      {physReady && screen === 'battle' && <BattleScreen />}
    </div>
  );
}
