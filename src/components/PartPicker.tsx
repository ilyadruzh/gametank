import { CANNONS, COUNTRIES, HULLS, PART_LABELS, TRACKS, TURRETS } from '../game/parts';
import { sClick } from '../game/audio';
import { useGame } from '../store/gameStore';
import type { PartCategory } from '../game/types';
import type { UnlockSet } from '../game/campaign';

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

export default function PartPicker({ index, unlocked }: { index: 0 | 1; unlocked?: UnlockSet }) {
  const cfg = useGame((s) => s.players[index]);
  const setPart = useGame((s) => s.setPart);

  const isLocked = (cat: CatKey, id: string): boolean =>
    !!unlocked && cat !== 'country' && !unlocked[cat].has(id);

  return (
    <div className="build-options" id="options" data-testid="options">
      {CATS.map((cat) => (
        <div className="cat" key={cat.key} data-testid={`cat-${cat.key}`}>
          <h3>{PART_LABELS[cat.key]}</h3>
          <div className="cards">
            {Object.entries(cat.data).map(([id, opt]) => {
              const selected = cfg[cat.key] === id;
              const locked = isLocked(cat.key, id);
              const choose = () => {
                if (locked) return;
                setPart(index, cat.key, id);
                sClick();
              };
              return (
                <div
                  key={id}
                  className={`card${selected ? ' selected' : ''}${locked ? ' locked' : ''}`}
                  data-testid={`card-${cat.key}-${id}`}
                  data-selected={selected}
                  data-locked={locked}
                  role="button"
                  aria-disabled={locked}
                  tabIndex={locked ? -1 : 0}
                  onClick={choose}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      choose();
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
                    {locked && '🔒 '}
                    {opt.name}
                  </div>
                  {cat.isCountry ? (
                    <div className="country-perk">{opt.perk}</div>
                  ) : (
                    <div className="desc">{locked ? 'Открой в кампании' : opt.desc}</div>
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
