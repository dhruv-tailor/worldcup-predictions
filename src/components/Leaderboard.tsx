import type { PlayerScore, Game, ScoringSystem } from '../types';

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
  const isHotStreak = system.name === 'Hot Streak';

  return (
    <div className="leaderboard">
      <table>
        <thead>
          <tr>
            <th className="rank-col">#</th>
            <th className="name-col">Player</th>
            {playedGames.map((game) => (
              <th
                key={game.id}
                className="game-col clickable"
                onClick={() => onSelectGame(game.id)}
                title={`${game.home} vs ${game.away}`}
              >
                G{game.id}
              </th>
            ))}
            <th className="total-col">Total</th>
            {isHotStreak && <th className="streak-col" title="Current streak">🔥</th>}
            {isHotStreak && <th className="streak-col" title="Longest streak">Best</th>}
          </tr>
        </thead>
        <tbody>
          {standings.map((player, index) => (
            <tr key={player.name}>
              <td className="rank-col">{index + 1}</td>
              <td className="name-col">{player.name}</td>
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
              <td className="total-col">{player.totalPoints}</td>
              {isHotStreak && (
                <td className="streak-col">{player.currentStreak ? `${player.currentStreak}` : '-'}</td>
              )}
              {isHotStreak && (
                <td className="streak-col">{player.longestStreak ? `${player.longestStreak}` : '-'}</td>
              )}
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
  // For Ladder, show +/- sign
  if (system.name === 'Ladder') {
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
