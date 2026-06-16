import type { Game, PlayerScore, ScoringSystem } from '../types';
import { getGameLabel } from '../utils/flags';

interface GameCardProps {
  /** The game to show details for */
  game: Game;
  /** All games (for prev/next navigation) */
  games: Game[];
  /** Full standings (used to extract per-game breakdowns for each player) */
  standings: PlayerScore[];
  /** The currently active scoring system (drives dynamic column rendering) */
  system: ScoringSystem;
  /** Callback to return to the leaderboard view */
  onClose: () => void;
  /** Callback to navigate to a different game */
  onSelectGame: (gameId: number) => void;
}

export default function GameCard({ game, games, standings, system, onClose, onSelectGame }: GameCardProps) {
  const isPlayed = game.homeScore !== null && game.awayScore !== null;
  const playedGames = games.filter((g) => g.homeScore !== null).sort((a, b) => a.id - b.id);
  const currentIdx = playedGames.findIndex((g) => g.id === game.id);
  const prevGame = currentIdx > 0 ? playedGames[currentIdx - 1] : null;
  const nextGame = currentIdx < playedGames.length - 1 ? playedGames[currentIdx + 1] : null;

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
        <div className="game-card-nav">
          <button className="back-btn" onClick={onClose}>← Back</button>
          <div className="game-card-nav-spacer" />
          <button
            className="nav-btn"
            onClick={() => prevGame && onSelectGame(prevGame.id)}
            disabled={!prevGame}
            aria-label="Previous game"
          >
            ← Prev
          </button>
          <button
            className="nav-btn"
            onClick={() => nextGame && onSelectGame(nextGame.id)}
            disabled={!nextGame}
            aria-label="Next game"
          >
            Next →
          </button>
        </div>
        <h2>
          {getGameLabel(game)}
        </h2>
        {isPlayed ? (
          <div className="actual-score">
            Final: {game.home} {game.homeScore}{game.homeScore! > game.awayScore! ? ' 🏆' : ''} – {game.awayScore! > game.homeScore! ? '🏆 ' : ''}{game.awayScore} {game.away}
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
