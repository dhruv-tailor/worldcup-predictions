import type { Game, PlayerScore, ScoringSystem } from '../types';

interface GameCardProps {
  /** The game to show details for */
  game: Game;
  /** Full standings (used to extract per-game breakdowns for each player) */
  standings: PlayerScore[];
  /** The currently active scoring system (drives dynamic column rendering) */
  system: ScoringSystem;
  /** Callback to return to the leaderboard view */
  onClose: () => void;
}

/**
 * Detailed view for a single game showing all players' predictions and point breakdowns.
 *
 * Renders:
 * - Game header with teams and final score (or "Not yet played")
 * - Table of all predictions sorted by points earned (descending)
 * - Dynamic breakdown columns driven by the active scoring system's `categoryLabels`
 *
 * Column headers and values adapt automatically when switching scoring systems.
 * For example, Ted Classic shows "Winner | GD | Exact" while Gambler's shows "Base | Bonus".
 */
export default function GameCard({ game, standings, system, onClose }: GameCardProps) {
  const isPlayed = game.homeScore !== null && game.awayScore !== null;

  // Gather all predictions for this game, sorted by points (desc)
  const predictions = standings
    .map((player) => {
      const breakdown = player.gameBreakdowns.find((gb) => gb.gameId === game.id);
      return breakdown ? { name: player.name, ...breakdown } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b!.points.total - a!.points.total);

  return (
    <div className="game-card">
      <div className="game-card-header">
        <button className="back-btn" onClick={onClose}>
          ← Back
        </button>
        <h2>
          Game {game.id}: {game.home} vs {game.away}
        </h2>
        {isPlayed ? (
          <div className="actual-score">
            Final: {game.home} {game.homeScore} – {game.awayScore} {game.away}
          </div>
        ) : (
          <div className="actual-score pending">Not yet played</div>
        )}
      </div>

      <table className="predictions-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Prediction</th>
            {isPlayed && (
              <>
                {system.categoryLabels.map((cat) => (
                  <th key={cat.key}>{cat.label}</th>
                ))}
                <th>Total</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {predictions.map((p) => (
            <tr key={p!.name}>
              <td>{p!.name}</td>
              <td>
                {p!.prediction.homeScore} – {p!.prediction.awayScore}
              </td>
              {isPlayed && (
                <>
                  {system.categoryLabels.map((cat) => {
                    const val = p!.points.categories[cat.key] ?? 0;
                    return (
                      <td key={cat.key} className={val > 0 ? 'pts-good' : 'pts-zero'}>
                        {val > 0 ? `+${val}` : '0'}
                      </td>
                    );
                  })}
                  <td className={`total ${pointsClass(p!.points.total, system.maxPerGame)}`}>
                    {p!.points.total}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Maps a point value to a CSS class for color-coding.
 * @see Leaderboard's pointsClass for identical logic
 */
function pointsClass(points: number, max?: number): string {
  const m = max ?? 4;
  if (points >= m) return 'pts-perfect';
  if (points >= m * 0.75) return 'pts-great';
  if (points >= m * 0.5) return 'pts-good';
  if (points >= 1) return 'pts-ok';
  return 'pts-zero';
}
