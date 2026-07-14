import { useMemo, useState } from 'react';
import SystemTimelineChart from '../components/SystemTimelineChart';
import { useAppContext } from '../context/useAppContext';
import { getPlayerColor } from '../utils/playerColors';
import { scoringSystems } from '../utils/scoring';
import { buildSystemTimelines } from '../utils/timelines';

export default function TimelinesPage() {
  const { games, predictions } = useAppContext();
  const [hiddenPlayers, setHiddenPlayers] = useState<Set<string>>(new Set());

  const timelines = useMemo(() => {
    return buildSystemTimelines(scoringSystems, games, predictions);
  }, [games, predictions]);

  const hasPlayedGames = games.some((game) => game.homeScore !== null && game.awayScore !== null);
  const allPlayers = useMemo(() => {
    return Array.from(new Set(predictions.map((prediction) => prediction.name))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [predictions]);

  const visiblePlayerSet = useMemo(() => {
    return new Set(allPlayers.filter((name) => !hiddenPlayers.has(name)));
  }, [allPlayers, hiddenPlayers]);

  const primaryTimeline = timelines[0];

  const togglePlayer = (name: string) => {
    setHiddenPlayers((previous) => {
      const next = new Set(previous);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const showAllPlayers = () => setHiddenPlayers(new Set());
  const hideAllPlayers = () => setHiddenPlayers(new Set(allPlayers));
  const showTopPlayers = (count: number) => {
    const topPlayers = new Set((primaryTimeline?.playerNames ?? []).slice(0, count));
    setHiddenPlayers(new Set(allPlayers.filter((name) => !topPlayers.has(name))));
  };

  if (!hasPlayedGames) {
    return <div className="timeline-empty">No games played yet</div>;
  }

  return (
    <section className="timelines-page" aria-label="All systems score timelines">
      <header className="timelines-header">
        <h2>Score Timelines</h2>
        <p>Every leaderboard, one timeline per scoring system.</p>
      </header>
      <section className="timeline-filters" aria-label="Timeline player filters">
        <div className="timeline-filters-header">
          <h3>Visible Players ({visiblePlayerSet.size}/{allPlayers.length})</h3>
          <div className="timeline-filter-actions">
            <button type="button" className="timeline-filter-btn" onClick={showAllPlayers}>Show all</button>
            <button type="button" className="timeline-filter-btn" onClick={() => showTopPlayers(3)}>Top 3</button>
            <button type="button" className="timeline-filter-btn" onClick={() => showTopPlayers(5)}>Top 5</button>
            <button type="button" className="timeline-filter-btn" onClick={hideAllPlayers}>Hide all</button>
          </div>
        </div>
        <div className="timeline-player-pills">
          {allPlayers.map((name) => {
            const visible = visiblePlayerSet.has(name);
            const color = getPlayerColor(name);
            return (
              <button
                key={name}
                type="button"
                className={`timeline-player-pill ${visible ? 'visible' : 'hidden'}`}
                onClick={() => togglePlayer(name)}
                style={{ borderColor: color, color: color }}
                aria-pressed={visible}
              >
                {name}
              </button>
            );
          })}
        </div>
      </section>
      <div className="timelines-list">
        {timelines.map((timeline) => (
          <SystemTimelineChart
            key={timeline.systemName}
            timeline={timeline}
            visiblePlayers={visiblePlayerSet}
          />
        ))}
      </div>
    </section>
  );
}
