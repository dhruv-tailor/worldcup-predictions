import { useCallback, useMemo, useRef, useState } from 'react';
import SystemTimelineChart from '../components/SystemTimelineChart';
import { useAppContext } from '../context/useAppContext';
import { getPlayerColor } from '../utils/playerColors';
import { scoringSystems } from '../utils/scoring';
import { buildSystemTimelines } from '../utils/timelines';

export default function TimelinesPage() {
  const { games, predictions } = useAppContext();
  const pageRef = useRef<HTMLElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [hiddenPlayers, setHiddenPlayers] = useState<Set<string>>(new Set());
  const hasPlayedGames = games.some((game) => game.homeScore !== null && game.awayScore !== null);
  const playedCount = games.filter((game) => game.homeScore !== null && game.awayScore !== null).length;
  const startLightsOn = games.length > 0 ? Math.min(5, Math.round((playedCount / games.length) * 5)) : 0;

  const handleExportPage = useCallback(async () => {
    if (!pageRef.current || isExporting) return;

    setIsExporting(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(pageRef.current, {
        backgroundColor: '#0f1319',
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `timelines-feed-game-${playedCount}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, playedCount]);

  const timelines = useMemo(() => {
    return buildSystemTimelines(scoringSystems, games, predictions);
  }, [games, predictions]);

  const allPlayers = useMemo(() => {
    return Array.from(new Set(predictions.map((prediction) => prediction.name))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [predictions]);

  const visiblePlayerSet = useMemo(() => {
    return new Set(allPlayers.filter((name) => !hiddenPlayers.has(name)));
  }, [allPlayers, hiddenPlayers]);

  const playerRankMap = useMemo(() => {
    const map = new Map<string, number>();
    const rankedPlayers = timelines[0]?.playerNames ?? [];
    for (const [index, name] of rankedPlayers.entries()) {
      map.set(name, index + 1);
    }
    return map;
  }, [timelines]);

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
    <section className="timelines-page" aria-label="All systems score timelines" ref={pageRef}>
      <header className="timelines-header">
        <p className="timeline-kicker">RACE CONTROL</p>
        <h2>Score Timelines</h2>
        <p>Live telemetry feed for every scoring system leaderboard.</p>
        <div className="timeline-start-lights" aria-label="Race start lights">
          {Array.from({ length: 5 }).map((_, index) => (
            <span key={index} className={`timeline-start-light ${index < startLightsOn ? 'on' : ''}`} />
          ))}
        </div>
        <div className="timeline-gauge" aria-hidden="true" />
      </header>
      <section className="timeline-filters" aria-label="Timeline player filters">
        <div className="timeline-filters-header">
          <div>
            <p className="timeline-kicker">PIT WALL</p>
            <h3>Visible Drivers ({visiblePlayerSet.size}/{allPlayers.length})</h3>
          </div>
          <div className="timeline-filter-actions">
            <button type="button" className="timeline-filter-btn" onClick={showAllPlayers}>DRS Open</button>
            <button type="button" className="timeline-filter-btn" onClick={() => showTopPlayers(3)}>Grid Top 3</button>
            <button type="button" className="timeline-filter-btn" onClick={() => showTopPlayers(5)}>Grid Top 5</button>
            <button type="button" className="timeline-filter-btn" onClick={hideAllPlayers}>Box Box</button>
            <button
              type="button"
              className="timeline-filter-btn export-btn timeline-print-btn"
              onClick={handleExportPage}
              disabled={isExporting}
              title="Export this page as PNG"
            >
              {isExporting ? <><span className="spinner" />Exporting...</> : 'Export PNG'}
            </button>
          </div>
        </div>
        <div className="timeline-player-pills">
          {allPlayers.map((name) => {
            const visible = visiblePlayerSet.has(name);
            const color = getPlayerColor(name);
            const rank = playerRankMap.get(name);
            return (
              <button
                key={name}
                type="button"
                className={`timeline-player-pill ${visible ? 'visible' : 'hidden'}`}
                onClick={() => togglePlayer(name)}
                style={{ borderColor: color, color: color }}
                aria-pressed={visible}
              >
                <span className="timeline-grid-pos">P{rank ?? '-'}</span>
                {name}
              </button>
            );
          })}
        </div>
      </section>
      <div className="timelines-list">
        {timelines.map((timeline, index) => (
          <SystemTimelineChart
            key={timeline.systemName}
            timeline={timeline}
            visiblePlayers={visiblePlayerSet}
            sectorIndex={index + 1}
          />
        ))}
      </div>
    </section>
  );
}
