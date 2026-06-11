import { useCallback, useMemo, useRef } from 'react';
import { toPng } from 'html-to-image';
import type { Game, Prediction } from '../types';
import { scoringSystems } from '../utils/scoring';

interface CategoryBreakdownProps {
  games: Game[];
  predictions: Prediction[];
}

export default function CategoryBreakdown({ games, predictions }: CategoryBreakdownProps) {
  const playedGames = games.filter((g) => g.homeScore !== null);
  if (playedGames.length === 0) return null;

  const lastGameId = Math.max(...playedGames.map((g) => g.id));
  const gridRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const allStandings = useMemo(
    () => scoringSystems.map((sys) => ({ system: sys, standings: sys.calculateStandings(games, predictions) })),
    [games, predictions]
  );

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleExport = useCallback(() => {
    if (!gridRef.current) return;
    toPng(gridRef.current, { backgroundColor: '#1a1a2e', pixelRatio: 4 })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `leaderboards-game${lastGameId}.png`;
        link.href = dataUrl;
        link.click();
      });
  }, [lastGameId]);

  return (
    <div className="category-breakdown">
      <div className="category-breakdown-header">
        <h3>All System Leaderboards</h3>
        <button className="export-btn" onClick={handleExport} title="Export as PNG">
          📷 Export PNG
        </button>
      </div>
      <div className="cat-grid" ref={gridRef}>
        {allStandings.map(({ system, standings }) => {
          const sorted = [...standings].sort(
            (a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name)
          );
          return (
            <div key={system.name} className="cat-card">
              <h4>{system.name}</h4>
              <table>
                <thead>
                  <tr>
                    <th className="rank-col">#</th>
                    <th className="name-col">Player</th>
                    <th className="total-col">Pts</th>
                    <th className="delta-col">+/−</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((player, i) => {
                    const lastBd = player.gameBreakdowns.find((gb) => gb.gameId === lastGameId);
                    const delta = lastBd?.points.total ?? 0;
                    return (
                      <tr key={player.name}>
                        <td className="rank-col">{i + 1}</td>
                        <td className="name-col">{player.name}</td>
                        <td className="total-col">{player.totalPoints}</td>
                        <td className={`delta-col ${delta > 0 ? 'delta-pos' : delta < 0 ? 'delta-neg' : ''}`}>
                          {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '–'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
