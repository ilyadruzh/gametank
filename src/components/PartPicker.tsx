import { CANNONS, COUNTRIES, HULLS, PART_LABELS, TRACKS, TURRETS } from '../game/parts';
import { sClick } from '../game/audio';
import { useGame } from '../store/gameStore';
import type { PartCategory } from '../game/types';

type CatKey = PartCategory | 'country';

interface CatDef {
  key: CatKey;
  data: Record<string, { name: string; desc?: string; perk?: string; cols?: [string, string, string] }>;
  isCountry?: boolean;
}

const CATS: CatDef[] = [
  { key: 'country', data: COUNTRIES, isCountry: true },
  { key: 'tracks', data: TRACKS },
  { key: 'turret', data: TURRETS },
  { key: 'cannon', data: CANNONS },
  { key: 'hull', data: HULLS },
];

export default function PartPicker({ index }: { index: 0 | 1 }) {
  const cfg = useGame((s) => s.players[index]);
  const setPart = useGame((s) => s.setPart);

  return (
    <div className="build-options" id="options" data-testid="options">
      {CATS.map((cat) => (
        <div className="cat" key={cat.key} data-testid={`cat-${cat.key}`}>
          <h3>{PART_LABELS[cat.key]}</h3>
          <div className="cards">
            {Object.entries(cat.data).map(([id, opt]) => {
              const selected = cfg[cat.key] === id;
              return (
                <div
                  key={id}
                  className={`card${selected ? ' selected' : ''}`}
                  data-testid={`card-${cat.key}-${id}`}
                  data-selected={selected}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setPart(index, cat.key, id);
                    sClick();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setPart(index, cat.key, id);
                    }
                  }}
                >
                  <div className="name">
                    {cat.isCountry && opt.cols && (
                      <span
                        className="flagchip"
                        style={{
                          background: `linear-gradient(180deg,${opt.cols[0]} 33%,${opt.cols[1]} 33% 66%,${opt.cols[2]} 66%)`,
                        }}
                      />
                    )}
                    {opt.name}
                  </div>
                  {cat.isCountry ? (
                    <div className="country-perk">{opt.perk}</div>
                  ) : (
                    <div className="desc">{opt.desc}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
