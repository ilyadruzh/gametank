import { useGame } from '../../store/gameStore';
import { MISSIONS } from '../../game/missions';
import { isMissionUnlocked } from '../../game/campaign';
import { COUNTRIES, CANNONS, TRACKS } from '../../game/parts';
import { initAudio } from '../../game/audio';
import type { Difficulty } from '../../game/types';

const DIFF_LABEL: Record<Difficulty, string> = { easy: 'Лёгкая', normal: 'Средняя', hard: 'Высокая' };
const DIFF_COLOR: Record<Difficulty, string> = { easy: '#2e7d32', normal: '#d98c2b', hard: '#c0392b' };

export default function CampaignScreen() {
  const completed = useGame((s) => s.completed);
  const currentMissionId = useGame((s) => s.currentMissionId);
  const selectMission = useGame((s) => s.selectMission);
  const beginMission = useGame((s) => s.beginMission);
  const toMenu = useGame((s) => s.toMenu);

  const selected = MISSIONS.find((m) => m.id === currentMissionId) ?? null;
  const doneCount = completed.length;

  return (
    <section id="screen-campaign" className="screen" data-testid="screen-campaign">
      <div className="build-head">
        <span className="player-badge" style={{ background: 'var(--accent)' }}>
          КАМПАНИЯ 🎖️
        </span>
        <span style={{ fontFamily: 'Caveat', fontSize: 22, fontWeight: 700 }} data-testid="campaign-progress">
          пройдено {doneCount} из {MISSIONS.length}
        </span>
      </div>

      <div className="campaign-wrap">
        <div className="mission-list" data-testid="mission-list">
          {MISSIONS.map((m, i) => {
            const isDone = completed.includes(m.id);
            const unlocked = isMissionUnlocked(m.id, completed);
            const isSel = currentMissionId === m.id;
            return (
              <div
                key={m.id}
                className={`card mission-card${isSel ? ' selected' : ''}${unlocked ? '' : ' locked'}`}
                data-testid={`mission-${m.id}`}
                data-locked={!unlocked}
                data-done={isDone}
                role="button"
                aria-disabled={!unlocked}
                tabIndex={unlocked ? 0 : -1}
                onClick={() => unlocked && selectMission(m.id)}
              >
                <div className="name">
                  {isDone ? '✅ ' : unlocked ? `${i + 1}. ` : '🔒 '}
                  {m.title}
                </div>
                <div className="desc">
                  <span style={{ color: DIFF_COLOR[m.difficulty], fontWeight: 700 }}>{DIFF_LABEL[m.difficulty]}</span>
                  {' • '}
                  {m.objective.text}
                </div>
              </div>
            );
          })}
        </div>

        <div className="briefing" data-testid="briefing">
          {selected ? (
            <>
              <h3 data-testid="briefing-title">{selected.title}</h3>
              <p className="brief-text">{selected.brief}</p>
              <div className="brief-row">
                🎯 <b>Цель:</b> {selected.objective.text}
              </div>
              <div className="brief-row">
                💀 <b>Противник:</b> {COUNTRIES[selected.enemy.country].name} —{' '}
                {TRACKS[selected.enemy.tracks].name.toLowerCase()}, {CANNONS[selected.enemy.cannon].name.toLowerCase()}
              </div>
              <div className="brief-row brief-reward">🏆 {selected.reward}</div>
              <button
                className="btn primary"
                data-testid="btn-begin-mission"
                onClick={() => {
                  initAudio();
                  beginMission();
                }}
              >
                Собрать танк →
              </button>
            </>
          ) : (
            <p className="brief-text" data-testid="briefing-empty">
              Выбери миссию слева. Проходи их по очереди — за победы открываются новые детали для твоего танка.
            </p>
          )}
        </div>
      </div>

      <div className="topbar" style={{ marginTop: 8 }}>
        <button className="btn ghost" data-testid="btn-campaign-back" onClick={toMenu}>
          ← В меню
        </button>
      </div>
    </section>
  );
}
