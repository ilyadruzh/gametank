import { GERAND_TANKS } from '../game/garage';
import { COUNTRIES } from '../game/parts';
import { sClick } from '../game/audio';
import { useGame } from '../store/gameStore';
import type { PlayerConfig } from '../game/types';

function sameBuild(a: PlayerConfig, b: PlayerConfig): boolean {
  return (
    a.country === b.country &&
    a.tracks === b.tracks &&
    a.turret === b.turret &&
    a.cannon === b.cannon &&
    a.hull === b.hull
  );
}

export default function GarageGrid({ index, onPick }: { index: 0 | 1; onPick: (config: PlayerConfig) => void }) {
  const cfg = useGame((s) => s.players[index]);
  return (
    <div className="garage-strip" data-testid="garage">
      {GERAND_TANKS.map((g) => {
        const selected = sameBuild(cfg, g.config);
        const cols = COUNTRIES[g.config.country].cols;
        return (
          <div
            key={g.id}
            className={`card garage-card${selected ? ' selected' : ''}`}
            data-testid={`garage-${g.id}`}
            data-selected={selected}
            role="button"
            tabIndex={0}
            onClick={() => {
              onPick(g.config);
              sClick();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPick(g.config);
              }
            }}
          >
            <div className="name">
              <span
                className="flagchip"
                style={{ background: `linear-gradient(180deg,${cols[0]} 33%,${cols[1]} 33% 66%,${cols[2]} 66%)` }}
              />
              {g.name}
            </div>
            <div className="desc">{g.personality}</div>
          </div>
        );
      })}
    </div>
  );
}
