import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Link } from 'react-router';
import type { PlayerScore, Game, ScoringSystem } from '../types';
import { getGameLabelShort } from '../utils/flags';

type SortKey = 'rank' | 'total' | 'delta' | `game-${number}`;
type SortDir = 'asc' | 'desc';

interface LeaderboardProps {
  standings: PlayerScore[];
  games: Game[];
  system: ScoringSystem;
}

export default function Leaderboard({ standings, games, system }: LeaderboardProps) {
  const navigate = useNavigate();
  const playedGames = games.filter((g) => g.homeScore !== null).sort((a, b) => a.id - b.id);
  const sysName = system.name;
  const lastGameId = playedGames.length > 0 ? playedGames[playedGames.length - 1].id : null;

  const [showGames, setShowGames] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [highlightedPlayers, setHighlightedPlayers] = useState<Set<string>>(new Set());
  const [filterTop, setFilterTop] = useState<number | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'rank' ? 'asc' : 'desc');
    }
  };

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const getPlayerDelta = (player: PlayerScore) => {
    if (lastGameId == null) return 0;
    return player.gameBreakdowns.find((gb) => gb.gameId === lastGameId)?.points.total ?? 0;
  };

  const getPlayerGamePts = (player: PlayerScore, gameId: number) => {
    return player.gameBreakdowns.find((gb) => gb.gameId === gameId)?.points.total ?? 0;
  };

  // Apply sorting
  const sortedStandings = [...standings].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'rank') {
      // Default rank = standings order (by total desc already)
      cmp = standings.indexOf(a) - standings.indexOf(b);
    } else if (sortKey === 'total') {
      cmp = a.totalPoints - b.totalPoints;
    } else if (sortKey === 'delta') {
      cmp = getPlayerDelta(a) - getPlayerDelta(b);
    } else if (sortKey.startsWith('game-')) {
      const gameId = Number(sortKey.slice(5));
      cmp = getPlayerGamePts(a, gameId) - getPlayerGamePts(b, gameId);
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  // Apply filter
  const displayStandings = filterTop
    ? sortedStandings.slice(0, filterTop)
    : sortedStandings;

  const toggleHighlight = (name: string) => {
    setHighlightedPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="leaderboard">
      <div className="leaderboard-controls">
        <button
          className="lb-toggle-btn"
          onClick={() => setShowGames((v) => !v)}
          aria-pressed={showGames}
        >
          {showGames ? 'Hide Games' : 'Show Games'}
        </button>
        <select
          className="lb-filter-select"
          value={filterTop ?? 'all'}
          onChange={(e) => setFilterTop(e.target.value === 'all' ? null : Number(e.target.value))}
          aria-label="Filter top N players"
        >
          <option value="all">All Players</option>
          <option value="3">Top 3</option>
          <option value="5">Top 5</option>
          <option value="10">Top 10</option>
        </select>
        {highlightedPlayers.size > 0 && (
          <button
            className="lb-toggle-btn lb-clear-btn"
            onClick={() => setHighlightedPlayers(new Set())}
          >
            Clear Highlights
          </button>
        )}
      </div>
      <table>
        <thead>
          <tr>
            <th
              className="rank-col sortable"
              onClick={() => handleSort('rank')}
              aria-sort={sortKey === 'rank' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
            >
              #{sortIndicator('rank')}
            </th>
            <th className="name-col">Player</th>
            <th
              className="total-col sortable"
              onClick={() => handleSort('total')}
              aria-sort={sortKey === 'total' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
            >
              Total{sortIndicator('total')}
            </th>
            {lastGameId != null && (
              <th
                className="delta-col sortable"
                title="Change from last game"
                onClick={() => handleSort('delta')}
                aria-sort={sortKey === 'delta' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                +/−{sortIndicator('delta')}
              </th>
            )}
            {sysName === 'Ted Classic' && <th className="stat-col" title="Exact score predictions">🎯</th>}
            {sysName === 'Ted Classic' && <th className="stat-col" title="Correct winner percentage">Win%</th>}
            {sysName === 'Ted+' && <th className="stat-col" title="Exact score predictions">🎯</th>}
            {sysName === 'Ted+' && <th className="stat-col" title="Perfect games (7 pts)">⭐</th>}
            {sysName === 'Ted28' && <th className="stat-col" title="Exact result predictions">🎯</th>}
            {sysName === 'Ted28' && <th className="stat-col" title="Perfect games (7 pts)">⭐</th>}
            {sysName === "Gambler's" && <th className="stat-col" title="Best multiplier">Best×</th>}
            {sysName === "Gambler's" && <th className="stat-col" title="Average multiplier">Avg×</th>}
            {sysName === '$5 Bets' && <th className="stat-col" title="Correct winner percentage">Win%</th>}
            {sysName === 'Ladder' && <th className="stat-col" title="Peak ELO rating">Peak</th>}
            {sysName === 'Ladder' && <th className="stat-col" title="Lowest ELO rating">Low</th>}
            {sysName === 'Hot Streak' && <th className="streak-col" title="Current streak">🔥</th>}
            {sysName === 'Hot Streak' && <th className="streak-col" title="Longest streak">Best</th>}
            {sysName === 'Participation Trophy' && <th className="stat-col" title="Exact score predictions">🎯</th>}
            {sysName === 'Participation Trophy' && <th className="stat-col" title="Perfect games (11 pts)">⭐</th>}
            {(sysName === 'Equal Aggregate' || sysName === 'Weighted Aggregate') && <th className="stat-col" title="Best performing system">Best</th>}
            {(sysName === 'Equal Aggregate' || sysName === 'Weighted Aggregate') && <th className="stat-col" title="Worst performing system">Worst</th>}
            {showGames && playedGames.map((game) => (
              <th
                key={game.id}
                className={`game-col clickable sortable ${sortKey === `game-${game.id}` ? 'sorted' : ''}`}
                onClick={() => navigate(`/game/${game.id}`)}
                title={`${game.home} vs ${game.away}`}
                aria-label={`${game.home} vs ${game.away}, Game ${game.id}`}
              >
                {getGameLabelShort(game)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayStandings.map((player) => {
            const rank = standings.indexOf(player) + 1;
            const isHighlighted = highlightedPlayers.size > 0 && highlightedPlayers.has(player.name);
            const isDimmed = highlightedPlayers.size > 0 && !highlightedPlayers.has(player.name);
            const rankLabel = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;
            return (
              <tr
                key={player.name}
                className={isHighlighted ? 'row-highlighted' : isDimmed ? 'row-dimmed' : ''}
                onClick={() => toggleHighlight(player.name)}
              >
                <td className="rank-col">{rank === 1 ? `👑 ${rankLabel}` : rankLabel}</td>
                <td className="name-col">
                  <Link
                    to={`/player/${encodeURIComponent(player.name)}`}
                    className="inline-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {player.name}
                  </Link>
                </td>
                <td className="total-col">{player.totalPoints}</td>
                {lastGameId != null && (() => {
                  const lastBreakdown = player.gameBreakdowns.find((gb) => gb.gameId === lastGameId);
                  const delta = lastBreakdown?.points.total ?? 0;
                  return (
                    <td className={`delta-col ${delta > 0 ? 'delta-pos' : delta < 0 ? 'delta-neg' : ''}`}>
                      {lastBreakdown ? (delta >= 0 ? `+${delta}` : `${delta}`) : '-'}
                    </td>
                  );
                })()}
                {sysName === 'Ted Classic' && <td className="stat-col">{player.exactCount ?? '-'}</td>}
                {sysName === 'Ted Classic' && <td className="stat-col">{player.winnerPct != null ? `${player.winnerPct}%` : '-'}</td>}
                {sysName === 'Ted+' && <td className="stat-col">{player.exactCount ?? '-'}</td>}
                {sysName === 'Ted+' && <td className="stat-col">{player.perfectCount ?? '-'}</td>}
                {sysName === 'Ted28' && <td className="stat-col">{player.exactCount ?? '-'}</td>}
                {sysName === 'Ted28' && <td className="stat-col">{player.perfectCount ?? '-'}</td>}
                {sysName === "Gambler's" && <td className="stat-col">{player.bestMultiplier ? `×${player.bestMultiplier}` : '-'}</td>}
                {sysName === "Gambler's" && <td className="stat-col">{player.avgMultiplier ? `×${player.avgMultiplier}` : '-'}</td>}
                {sysName === '$5 Bets' && <td className="stat-col">{player.winnerPct != null ? `${player.winnerPct}%` : '-'}</td>}
                {sysName === 'Ladder' && <td className="stat-col">{player.peakRating ?? '-'}</td>}
                {sysName === 'Ladder' && <td className="stat-col">{player.lowestRating ?? '-'}</td>}
                {sysName === 'Hot Streak' && (
                  <td className="streak-col">{player.currentStreak ? `${player.currentStreak} ${streakFlames(player.currentStreak)}` : '-'}</td>
                )}
                {sysName === 'Hot Streak' && (
                  <td className="streak-col">{player.longestStreak ? `${player.longestStreak} ${streakFlames(player.longestStreak)}` : '-'}</td>
                )}
                {sysName === 'Participation Trophy' && <td className="stat-col">{player.exactCount ?? '-'}</td>}
                {sysName === 'Participation Trophy' && <td className="stat-col">{player.perfectCount ?? '-'}</td>}
                {(sysName === 'Equal Aggregate' || sysName === 'Weighted Aggregate') && <td className="stat-col">{player.bestSystem ?? '-'}</td>}
                {(sysName === 'Equal Aggregate' || sysName === 'Weighted Aggregate') && <td className="stat-col">{player.worstSystem ?? '-'}</td>}
                {showGames && playedGames.map((game) => {
                  const breakdown = player.gameBreakdowns.find(
                    (gb) => gb.gameId === game.id
                  );
                  const pts = breakdown?.points.total ?? 0;
                  return (
                    <td
                      key={game.id}
                      className={`game-col ${pointsClass(pts, system.maxPerGame)}`}
                    >
                      {breakdown ? formatDelta(pts, system) : '-'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Formats a per-game point value for display.
 * For the Ladder system, shows explicit +/− signs since deltas can be negative.
 * For all other systems, shows the raw number.
 */
function formatDelta(points: number, system: ScoringSystem): string {
  // For systems with negative per-game values, show +/- sign
  if (system.name === 'Ladder' || system.name === "Gambler's" || system.name === 'Black Sheep') {
    return points >= 0 ? `+${points}` : `${points}`;
  }
  return `${points}`;
}

/**
 * Maps a point value to a CSS class for color-coding.
 * Scales thresholds based on the system's maximum per-game points.
 *
 * @param points - The point value to classify
 * @param max - Maximum achievable points per game (defaults to 4)
 * @returns CSS class name: 'pts-perfect' | 'pts-great' | 'pts-good' | 'pts-ok' | 'pts-zero'
 */
function pointsClass(points: number, max?: number): string {
  const m = max ?? 4;
  if (points >= m) return 'pts-perfect';
  if (points >= m * 0.75) return 'pts-great';
  if (points >= m * 0.5) return 'pts-good';
  if (points >= 1) return 'pts-ok';
  return 'pts-zero';
}

function streakFlames(streak: number): string {
  if (streak >= 6) return '🔥🔥🔥';
  if (streak >= 4) return '🔥🔥';
  if (streak >= 2) return '🔥';
  return '';
}
