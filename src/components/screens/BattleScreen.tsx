import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../store/gameStore';
import { COUNTRIES } from '../../game/parts';
import { BattleEngine, flagGradient } from '../../game/engine';
import { getPhysics } from '../../wasm/loader';

export default function BattleScreen() {
  const players = useGame((s) => s.players);
  const mode = useGame((s) => s.mode);
  const muted = useGame((s) => s.muted);
  const result = useGame((s) => s.result);
  const setResult = useGame((s) => s.setResult);
  const rematch = useGame((s) => s.rematch);
  const rebuild = useGame((s) => s.rebuild);
  const toMenu = useGame((s) => s.toMenu);
  const toggleMute = useGame((s) => s.toggleMute);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hp1Ref = useRef<HTMLElement>(null);
  const hp2Ref = useRef<HTMLElement>(null);
  const [roundKey, setRoundKey] = useState(0);
  const [noPhys, setNoPhys] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const phys = getPhysics();
    if (!canvas || !phys) {
      setNoPhys(!phys);
      return;
    }
    const engine = new BattleEngine(canvas, players, mode, phys, {
      onHp: (hp1, hp2) => {
        if (hp1Ref.current) hp1Ref.current.style.width = `${hp1}%`;
        if (hp2Ref.current) hp2Ref.current.style.width = `${hp2}%`;
      },
      onWin: (winner) => setResult(winner),
    });
    engine.start();
    return () => engine.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundKey]);

  const c1 = COUNTRIES[players[0].country];
  const c2 = COUNTRIES[players[1].country];

  return (
    <section id="screen-battle" className="screen" data-testid="screen-battle">
      <div className="hud">
        <div className="side s1">
          <div className="nm">
            <span className="flagchip" style={{ background: flagGradient(players[0].country) }} />
            <span data-testid="hud1-name">{c1.name}</span>
          </div>
          <div className="hp">
            <i ref={hp1Ref} data-testid="hp1" style={{ width: '100%' }} />
          </div>
        </div>
        <div className="topbar">
          <button className="iconbtn" data-testid="btn-mute" title="звук" onClick={toggleMute}>
            {muted ? '🔇' : '🔊'}
          </button>
          <button className="iconbtn" data-testid="btn-quit" title="в меню" onClick={toMenu}>
            ✕
          </button>
        </div>
        <div className="side s2">
          <div className="nm">
            <span className="flagchip" style={{ background: flagGradient(players[1].country) }} />
            <span data-testid="hud2-name">{mode === 'bot' ? `${c2.name} 🤖` : c2.name}</span>
          </div>
          <div className="hp">
            <i ref={hp2Ref} data-testid="hp2" style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      <div id="arena-wrap">
        <canvas id="arena" ref={canvasRef} width={960} height={600} data-testid="arena" />
        {noPhys && (
          <div className="overlay show" data-testid="overlay-error">
            <h2>Физика не загрузилась 😢</h2>
            <button className="btn ghost" onClick={toMenu}>
              В меню
            </button>
          </div>
        )}
        {result && (
          <div className="overlay" data-testid="overlay-win">
            <h2 data-testid="overlay-title">ПОБЕДА — {COUNTRIES[players[result.winner].country].name}!</h2>
            <div className="winflag" style={{ background: flagGradient(players[result.winner].country) }} />
            <div>
              <button
                className="btn primary"
                data-testid="btn-rematch"
                onClick={() => {
                  rematch();
                  setRoundKey((k) => k + 1);
                }}
              >
                Реванш 🔁
              </button>
              <button className="btn" data-testid="btn-rebuild" onClick={rebuild}>
                Новые танки 🔧
              </button>
              <button className="btn ghost" data-testid="btn-menu" onClick={toMenu}>
                В меню
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="ctrl-hint">
        <span style={{ color: 'var(--p1)' }}>
          <b>Игрок 1:</b> W A S D — ехать/крутить, ПРОБЕЛ — огонь
        </span>
        {mode === 'versus' ? (
          <span style={{ color: 'var(--p2)' }}>
            <b>Игрок 2:</b> ← ↑ ↓ → — ехать/крутить, ENTER — огонь
          </span>
        ) : (
          <span style={{ color: 'var(--p2)' }}>
            <b>Бот</b> сражается сам 🤖
          </span>
        )}
      </div>
    </section>
  );
}
