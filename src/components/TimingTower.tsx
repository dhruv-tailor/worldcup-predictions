import { getPlayerColor } from '../utils/playerColors';
import type { TimingTowerEntry } from '../utils/timelines';

interface TimingTowerProps {
  entries: TimingTowerEntry[];
  visiblePlayers: Set<string>;
  maxRows?: number;
}

function formatMetric(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}

export default function TimingTower({ entries, visiblePlayers, maxRows = entries.length }: TimingTowerProps) {
  const visibleEntries = entries.filter((entry) => visiblePlayers.has(entry.name));
  const displayedEntries = visibleEntries.slice(0, maxRows);
  const hiddenCount = Math.max(0, visibleEntries.length - displayedEntries.length);

  return (
    <aside className="timeline-tower" aria-label="Timing tower">
      <div className="timeline-tower-head">
        <span>POS</span>
        <span>DRIVER</span>
        <span>GAP</span>
      </div>
      {visibleEntries.length === 0 ? (
        <p className="timeline-tower-empty">No visible drivers</p>
      ) : (
        <ul className="timeline-tower-list">
          {displayedEntries.map((entry) => (
            <li key={entry.name} className="timeline-tower-row">
              <span className="timeline-tower-pos">P{entry.position}</span>
              <span className="timeline-tower-driver">
                <i
                  className="timeline-tower-stripe"
                  style={{ backgroundColor: getPlayerColor(entry.name) }}
                  aria-hidden="true"
                />
                <span className="timeline-tower-name">{entry.name}</span>
              </span>
              <span className="timeline-tower-gap">
                {entry.position === 1 ? formatMetric(entry.total) : `-${formatMetric(entry.gapToAbove)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
      {hiddenCount > 0 && <p className="timeline-tower-more">+{hiddenCount} more drivers</p>}
    </aside>
  );
}
