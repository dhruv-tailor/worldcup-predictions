import type { PlayerScore, Game, ScoringSystem } from '../types';
import { getGameLabelShort } from '../utils/flags';

interface LeaderboardProps {
  /** Sorted player standings from the active scoring system */
  standings: PlayerScore[];
  /** All games (played and unplayed) */
  games: Game[];
  /** The currently active scoring system (used for color scaling and formatting) */
  system: ScoringSystem;
  /** Callback when a game column header is clicked to view game details */
  onSelectGame: (gameId: number) => void;
}

/**
 * Main leaderboard table showing ranked player standings.
 *
 * Displays one row per player, sorted by total points (descending).
 * Columns include rank, player name, per-game points for each played game,
 * and the overall total. Game column headers are clickable to navigate
 * to the detailed {@link GameCard} view.
 *
 * Point cells are color-coded using the active system's `maxPerGame`
 * to scale thresholds (perfect, great, good, ok, zero).
 *
 * For the Ladder (ELO) system, per-game values are displayed with +/− signs.
 */
export default function Leaderboard({ standings, games, system, onSelectGame }: LeaderboardProps) {
  const playedGames = games.filter((g) => g.homeScore !== null).sort((a, b) => a.id - b.id);
  const sysName = system.name;
  const lastGameId = playedGames.length > 0 ? playedGames[playedGames.length - 1].id : null;

  return (
    <div className="leaderboard">
      <table>
        <thead>
          <tr>
            <th className="rank-col">#</th>
            <th className="name-col">Player</th>
            <th className="total-col">Total</th>
            {lastGameId != null && <th className="delta-col" title="Change from last game">+/−</th>}
            {sysName === 'Ted Classic' && <th className="stat-col" title="Exact score predictions">🎯</th>}
            {sysName === 'Ted Classic' && <th className="stat-col" title="Correct winner percentage">Win%</th>}
            {sysName === 'Ted+' && <th className="stat-col" title="Exact score predictions">🎯</th>}
            {sysName === 'Ted+' && <th className="stat-col" title="Perfect games (7 pts)">⭐</th>}
            {sysName === "Gambler's" && <th className="stat-col" title="Best multiplier">Best×</th>}
            {sysName === "Gambler's" && <th className="stat-col" title="Average multiplier">Avg×</th>}
            {sysName === 'Black Sheep' && <th className="stat-col" title="% of games beating the crowd">Beat%</th>}
            {sysName === 'Black Sheep' && <th className="stat-col" title="Average edge over crowd">Edge</th>}
            {sysName === 'Ladder' && <th className="stat-col" title="Peak ELO rating">Peak</th>}
            {sysName === 'Ladder' && <th className="stat-col" title="Lowest ELO rating">Low</th>}
            {sysName === 'Hot Streak' && <th className="streak-col" title="Current streak">🔥</th>}
            {sysName === 'Hot Streak' && <th className="streak-col" title="Longest streak">Best</th>}
            {sysName === 'Participation Trophy' && <th className="stat-col" title="Exact score predictions">🎯</th>}
            {sysName === 'Participation Trophy' && <th className="stat-col" title="Perfect games (11 pts)">⭐</th>}
            {(sysName === 'Equal Aggregate' || sysName === 'Weighted Aggregate') && <th className="stat-col" title="Best performing system">Best</th>}
            {(sysName === 'Equal Aggregate' || sysName === 'Weighted Aggregate') && <th className="stat-col" title="Worst performing system">Worst</th>}
            {playedGames.map((game) => (
              <th
                key={game.id}
                className="game-col clickable"
                onClick={() => onSelectGame(game.id)}
                title={`${game.home} vs ${game.away}`}
              >
                {getGameLabelShort(game)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {standings.map((player, index) => (
            <tr key={player.name}>
              <td className="rank-col">{index + 1}</td>
              <td className="name-col">{player.name}</td>
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
              {sysName === "Gambler's" && <td className="stat-col">{player.bestMultiplier ? `×${player.bestMultiplier}` : '-'}</td>}
              {sysName === "Gambler's" && <td className="stat-col">{player.avgMultiplier ? `×${player.avgMultiplier}` : '-'}</td>}
              {sysName === 'Black Sheep' && <td className="stat-col">{player.crowdBeatPct != null ? `${player.crowdBeatPct}%` : '-'}</td>}
              {sysName === 'Black Sheep' && <td className="stat-col">{player.avgEdge != null ? `${player.avgEdge}` : '-'}</td>}
              {sysName === 'Ladder' && <td className="stat-col">{player.peakRating ?? '-'}</td>}
              {sysName === 'Ladder' && <td className="stat-col">{player.lowestRating ?? '-'}</td>}
              {sysName === 'Hot Streak' && (
                <td className="streak-col">{player.currentStreak ? `${player.currentStreak}` : '-'}</td>
              )}
              {sysName === 'Hot Streak' && (
                <td className="streak-col">{player.longestStreak ? `${player.longestStreak}` : '-'}</td>
              )}
              {sysName === 'Participation Trophy' && <td className="stat-col">{player.exactCount ?? '-'}</td>}
              {sysName === 'Participation Trophy' && <td className="stat-col">{player.perfectCount ?? '-'}</td>}
              {(sysName === 'Equal Aggregate' || sysName === 'Weighted Aggregate') && <td className="stat-col">{player.bestSystem ?? '-'}</td>}
              {(sysName === 'Equal Aggregate' || sysName === 'Weighted Aggregate') && <td className="stat-col">{player.worstSystem ?? '-'}</td>}
              {playedGames.map((game) => {
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
          ))}
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
