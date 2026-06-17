import { useCallback, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Game, Prediction } from '../types';
import { scoringSystems } from '../utils/scoring';

interface CategoryBreakdownProps {
  games: Game[];
  predictions: Prediction[];
}

const systemAccentPalette = [
  '#5de2e7',
  '#f9d25f',
  '#f5727f',
  '#85a8ff',
  '#7bf0a6',
  '#f8a361',
  '#c89bff',
  '#8bf1df',
  '#f6c77a',
];

export default function CategoryBreakdown({ games, predictions }: CategoryBreakdownProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const playedGames = useMemo(() => games.filter((g) => g.homeScore !== null), [games]);
  const lastGameId = useMemo(
    () => (playedGames.length ? Math.max(...playedGames.map((g) => g.id)) : null),
    [playedGames]
  );

  const allStandings = useMemo(
    () => scoringSystems.map((sys) => ({ system: sys, standings: sys.calculateStandings(games, predictions) })),
    [games, predictions]
  );

  const totalPlayers = useMemo(() => {
    return new Set(predictions.map((prediction) => prediction.name)).size;
  }, [predictions]);

  const focusedPlayerSummary = useMemo(() => {
    if (!selectedPlayer) return null;

    const ranks = allStandings
      .map(({ standings }) => [...standings].sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name)))
      .map((sorted) => sorted.findIndex((player) => player.name === selectedPlayer))
      .filter((index) => index >= 0)
      .map((index) => index + 1);

    if (ranks.length === 0) return null;

    const avgRank = ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length;

    return {
      avgRank: avgRank.toFixed(1),
      bestRank: Math.min(...ranks),
      worstRank: Math.max(...ranks),
    };
  }, [allStandings, selectedPlayer]);

  const handleExport = useCallback(async () => {
    if (!gridRef.current || isExporting || lastGameId === null) return;
    setIsExporting(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(gridRef.current, { backgroundColor: '#1a1a2e', pixelRatio: 4 });
      const link = document.createElement('a');
      link.download = `leaderboards-game${lastGameId}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExporting(false);
    }
  }, [lastGameId, isExporting]);

  if (lastGameId === null) return null;

  const selectedPlayerLabel = selectedPlayer ?? 'None';

  return (
    <section className="category-breakdown systems-broadcast-shell" aria-label="All systems standings">
      <div className="category-breakdown-header">
        <div className="systems-hero-copy">
          <p className="systems-kicker">Broadcast View</p>
          <h3>All Systems Control Room</h3>
        </div>
        <div className="systems-controls">
          <div className="systems-actions">
            <p className="systems-selected-label">Focused Player: {selectedPlayerLabel}</p>
            <button className="export-btn" onClick={handleExport} disabled={isExporting} title="Export as PNG">
              {isExporting ? <><span className="spinner" />Exporting…</> : 'Export Feed PNG'}
            </button>
          </div>
        </div>
      </div>
      <div className="systems-live-strip" role="status" aria-live="polite">
        <span className="systems-live-pill">Game {lastGameId} Finalized</span>
        <span className="systems-live-stat">Systems: {allStandings.length}</span>
        <span className="systems-live-stat">Players: {totalPlayers}</span>
        <span className="systems-live-stat">
          {focusedPlayerSummary
            ? `Focus Avg Rank: #${focusedPlayerSummary.avgRank} (Best #${focusedPlayerSummary.bestRank}, Worst #${focusedPlayerSummary.worstRank})`
            : 'Focus: none selected'}
        </span>
      </div>
      <div className="cat-grid" ref={gridRef}>
        {allStandings.map(({ system, standings }, index) => {
          const sorted = [...standings].sort(
            (a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name)
          );
          const leader = sorted[0];
          const runnerUp = sorted[1];
          const leadGap = leader && runnerUp ? leader.totalPoints - runnerUp.totalPoints : 0;

          const deltas = sorted.map((player) => {
            const breakdown = player.gameBreakdowns.find((gameBreakdown) => gameBreakdown.gameId === lastGameId);
            return breakdown?.points.total ?? 0;
          });

          const maxDelta = deltas.length ? Math.max(...deltas) : 0;
          const minDelta = deltas.length ? Math.min(...deltas) : 0;

          return (
            <article
              key={system.name}
              className="cat-card"
              style={{ '--system-accent': systemAccentPalette[index % systemAccentPalette.length] } as CSSProperties}
            >
              <header className="cat-card-head">
                <div>
                  <h4>{system.name}</h4>
                  <p className="cat-card-meta">
                    Leader {leader?.name ?? 'N/A'} | Gap {leadGap}
                  </p>
                </div>
              </header>

              <div className="cat-card-summary" aria-label={`${system.name} momentum summary`}>
                <span>Heat +{maxDelta}</span>
                <span>Drop {minDelta}</span>
              </div>

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
                    const medalLabel = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                    const isSelected = selectedPlayer === player.name;
                    const isDimmed = selectedPlayer !== null && !isSelected;
                    const rowClass = [
                      isSelected ? 'row-player-selected' : '',
                      i === 0 ? 'row-leader' : '',
                      isDimmed ? 'row-dimmed' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <tr key={player.name} className={rowClass}>
                        <td className="rank-col">
                          {medalLabel ?? (
                            <span className="rank-badge">{i + 1}</span>
                          )}
                        </td>
                        <td className="name-col">
                          <button
                            type="button"
                            className={`player-focus-btn ${isSelected ? 'active' : ''}`}
                            onClick={() => setSelectedPlayer(isSelected ? null : player.name)}
                            aria-pressed={isSelected}
                          >
                            {player.name}
                          </button>
                        </td>
                        <td className="total-col">{player.totalPoints}</td>
                        <td className={`delta-col ${delta > 0 ? 'delta-pos' : delta < 0 ? 'delta-neg' : ''}`}>
                          {delta > 0 ? (
                            <><span className="delta-arrow" aria-hidden="true">▲</span>{delta}</>
                          ) : delta < 0 ? (
                            <><span className="delta-arrow" aria-hidden="true">▼</span>{Math.abs(delta)}</>
                          ) : (
                            <span className="delta-neutral">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </article>
          );
        })}
      </div>
    </section>
  );
}
