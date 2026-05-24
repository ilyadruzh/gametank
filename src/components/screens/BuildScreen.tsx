import { lazy, Suspense, useMemo } from 'react';
import { useGame } from '../../store/gameStore';
import { CANNONS, COUNTRIES } from '../../game/parts';
import { computeStats } from '../../game/stats';
import { computeUnlocked } from '../../game/campaign';
import { missionById } from '../../game/missions';
import { initAudio } from '../../game/audio';
import PartPicker from '../PartPicker';
import StatsPanel from '../StatsPanel';

const TankPreview3D = lazy(() => import('../TankPreview3D'));

export default function BuildScreen() {
  const buildIndex = useGame((s) => s.buildIndex);
  const mode = useGame((s) => s.mode);
  const cfg = useGame((s) => s.players[buildIndex]);
  const completed = useGame((s) => s.completed);
  const currentMissionId = useGame((s) => s.currentMissionId);
  const nextBuild = useGame((s) => s.nextBuild);
  const backBuild = useGame((s) => s.backBuild);

  const stats = useMemo(() => computeStats(cfg), [cfg]);
  const isCampaign = mode === 'campaign';
  const unlocked = useMemo(() => (isCampaign ? computeUnlocked(completed) : undefined), [isCampaign, completed]);
  const mission = isCampaign && currentMissionId ? missionById(currentMissionId) : undefined;

  const isLastStep = mode === 'bot' || isCampaign || buildIndex === 1;
  const nextLabel = isLastStep ? 'В БОЙ! ⚔️' : 'Готово →';
  const badgeColor = buildIndex === 1 ? 'var(--p2)' : 'var(--p1)';

  return (
    <section id="screen-build" className="screen" data-testid="screen-build">
      <div className="build-head">
        {mission ? (
          <>
            <span className="player-badge" data-testid="pl-badge" style={{ background: 'var(--accent)' }}>
              {mission.title}
            </span>
            <span style={{ fontFamily: 'Caveat', fontSize: 22, fontWeight: 700 }}>🎯 {mission.objective.text}</span>
          </>
        ) : (
          <>
            <span className="player-badge" data-testid="pl-badge" style={{ background: badgeColor }}>
              ИГРОК {buildIndex + 1}
            </span>
            <span style={{ fontFamily: 'Caveat', fontSize: 24, fontWeight: 700 }}>собирает свой танк</span>
          </>
        )}
      </div>

      <div className="build-wrap">
        <PartPicker index={buildIndex} unlocked={unlocked} />
        <div className="build-side">
          <div id="preview-box">
            <div className="ttl" data-testid="prev-name">
              {COUNTRIES[cfg.country].name} • {CANNONS[cfg.cannon].name}
            </div>
            <Suspense fallback={<div className="preview-3d" data-testid="preview-3d-loading" />}>
              <TankPreview3D stats={stats} />
            </Suspense>
          </div>
          <StatsPanel stats={stats} />
        </div>
      </div>

      <div className="topbar" style={{ marginTop: 8 }}>
        <button className="btn ghost" data-testid="btn-back" onClick={backBuild}>
          ← Назад
        </button>
        <button
          className="btn primary"
          data-testid="btn-next"
          onClick={() => {
            initAudio();
            nextBuild();
          }}
        >
          {nextLabel}
        </button>
      </div>
    </section>
  );
}
