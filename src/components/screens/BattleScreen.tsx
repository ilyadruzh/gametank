import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../store/gameStore';
import { COUNTRIES } from '../../game/parts';
import { missionById } from '../../game/missions';
import { ARENA_H, ARENA_W, BattleEngine, flagGradient, type BattleOptions } from '../../game/engine';
import { getPhysics } from '../../wasm/loader';

export default function BattleScreen() {
  const players = useGame((s) => s.players);
  const mode = useGame((s) => s.mode);
  const muted = useGame((s) => s.muted);
  const theme = useGame((s) => s.theme);
  const toggleTheme = useGame((s) => s.toggleTheme);
  const result = useGame((s) => s.result);
  const currentMissionId = useGame((s) => s.currentMissionId);
  const setResult = useGame((s) => s.setResult);
  const completeMission = useGame((s) => s.completeMission);
  const rematch = useGame((s) => s.rematch);
  const rebuild = useGame((s) => s.rebuild);
  const toMenu = useGame((s) => s.toMenu);
  const openCampaign = useGame((s) => s.openCampaign);
  const toggleMute = useGame((s) => s.toggleMute);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hp1Ref = useRef<HTMLElement>(null);
  const hp2Ref = useRef<HTMLElement>(null);
  const [roundKey, setRoundKey] = useState(0);
  const [noPhys, setNoPhys] = useState(false);
  const [timerLeft, setTimerLeft] = useState<number | null>(null);

  const isCampaign = mode === 'campaign';
  const mission = isCampaign && currentMissionId ? missionById(currentMissionId) : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    const phys = getPhysics();
    if (!canvas || !phys) {
      setNoPhys(!phys);
      return;
    }
    const opts: BattleOptions = { theme };
    if (mission) {
      opts.difficulty = mission.difficulty;
      opts.objective = { kind: mission.objective.kind, duration: mission.objective.duration };
    }
    const engine = new BattleEngine(
      canvas,
      players,
      mode,
      phys,
      {
        onHp: (hp1, hp2) => {
          if (hp1Ref.current) hp1Ref.current.style.width = `${hp1}%`;
          if (hp2Ref.current) hp2Ref.current.style.width = `${hp2}%`;
        },
        onWin: (winner) => {
          if (isCampaign && winner === 0 && currentMissionId) completeMission(currentMissionId);
          setResult(winner);
        },
        onTimer: (secs) => setTimerLeft(secs),
      },
      opts
    );
    engine.start();
    return () => engine.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundKey]);

  const c1 = COUNTRIES[players[0].country];
  const c2 = COUNTRIES[players[1].country];
  const aiEnemy = mode === 'bot' || isCampaign;
  const playerWon = result ? result.winner === 0 : false;
  const p1Mouse = players[0].control === 'mouse';
  const p2Mouse = mode === 'versus' && players[1].control === 'mouse';
  const anyMouse = p1Mouse || p2Mouse;

  const restart = () => {
    rematch();
    setTimerLeft(null);
    setRoundKey((k) => k + 1);
  };

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
          <button
            className="iconbtn"
            data-testid="btn-theme-battle"
            title="день/ночь"
            onClick={() => {
              toggleTheme();
              restart();
            }}
          >
            {theme === 'day' ? '🌙' : '☀️'}
          </button>
          <button className="iconbtn" data-testid="btn-quit" title="в меню" onClick={isCampaign ? openCampaign : toMenu}>
            ✕
          </button>
        </div>
        <div className="side s2">
          <div className="nm">
            <span className="flagchip" style={{ background: flagGradient(players[1].country) }} />
            <span data-testid="hud2-name">
              {c2.name}
              {aiEnemy ? ' 🤖' : ''}
            </span>
          </div>
          <div className="hp">
            <i ref={hp2Ref} data-testid="hp2" style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      <div id="arena-wrap">
        <canvas
          id="arena"
          className={anyMouse ? 'mouse-aim' : undefined}
          ref={canvasRef}
          width={ARENA_W}
          height={ARENA_H}
          data-testid="arena"
        />

        {mission?.objective.kind === 'survive' && timerLeft !== null && !result && (
          <div className="survive-timer" data-testid="survive-timer">
            ⏱ Продержись: {timerLeft}с
          </div>
        )}

        {noPhys && (
          <div className="overlay show" data-testid="overlay-error">
            <h2>Физика не загрузилась 😢</h2>
            <button className="btn ghost" onClick={toMenu}>
              В меню
            </button>
          </div>
        )}

        {result && isCampaign && (
          <div className="overlay" data-testid="overlay-win">
            <h2 data-testid="overlay-title">{playerWon ? 'МИССИЯ ПРОЙДЕНА! 🎖️' : 'МИССИЯ ПРОВАЛЕНА 💥'}</h2>
            {playerWon && mission && <div className="winflag" style={{ width: 'auto', height: 'auto', border: 'none', color: '#fff', fontFamily: 'Caveat', fontSize: 24 }}>🏆 {mission.reward}</div>}
            <div>
              {playerWon ? (
                <>
                  <button className="btn primary" data-testid="btn-to-map" onClick={openCampaign}>
                    На карту →
                  </button>
                  <button className="btn" data-testid="btn-rematch" onClick={restart}>
                    Реванш 🔁
                  </button>
                </>
              ) : (
                <>
                  <button className="btn primary" data-testid="btn-rematch" onClick={restart}>
                    Ещё раз 🔁
                  </button>
                  <button className="btn" data-testid="btn-rebuild" onClick={rebuild}>
                    Новый танк 🔧
                  </button>
                  <button className="btn ghost" data-testid="btn-to-map" onClick={openCampaign}>
                    На карту
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {result && !isCampaign && (
          <div className="overlay" data-testid="overlay-win">
            <h2 data-testid="overlay-title">ПОБЕДА — {COUNTRIES[players[result.winner].country].name}!</h2>
            <div className="winflag" style={{ background: flagGradient(players[result.winner].country) }} />
            <div>
              <button className="btn primary" data-testid="btn-rematch" onClick={restart}>
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
          <b>Игрок 1:</b>{' '}
          {p1Mouse ? 'мышь — ехать к курсору, ЛКМ — огонь' : 'W A S D — ехать, ПРОБЕЛ — огонь, 1–9 — веер'}
        </span>
        {mode === 'versus' ? (
          <span style={{ color: 'var(--p2)' }}>
            <b>Игрок 2:</b>{' '}
            {p2Mouse ? 'мышь — ехать к курсору, ЛКМ — огонь' : '← ↑ ↓ → — ехать, ENTER — огонь, Num 1–9 — веер'}
          </span>
        ) : (
          <span style={{ color: 'var(--p2)' }}>
            <b>Противник</b> управляется ИИ 🤖
          </span>
        )}
      </div>
    </section>
  );
}
