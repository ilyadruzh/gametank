import { statRows } from '../game/stats';
import type { TankStats } from '../game/types';

export default function StatsPanel({ stats }: { stats: TankStats }) {
  const rows = statRows(stats);
  return (
    <div className="stats" data-testid="stats">
      {rows.map((r) => (
        <div className="stat" key={r.label} data-testid={`stat-${r.label}`}>
          <div className="lab">
            <span>{r.label}</span>
            <span>{r.value}</span>
          </div>
          <div className="bar">
            <i style={{ width: `${(r.ratio * 100).toFixed(0)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
