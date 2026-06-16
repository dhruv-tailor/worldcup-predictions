import { Link } from 'react-router';
import type { Game, PlayerScore, ScoringSystem } from '../types';
import { getGameLabel } from '../utils/flags';

interface GameCardProps {
  game: Game;
  games: Game[];
  standings: PlayerScore[];
  system: ScoringSystem;
}

export default function GameCard({ game, games, standings, system }: GameCardProps) {
  const isPlayed = game.homeScore !== null && game.awayScore !== null;
  const isHomeWinner = isPlayed && game.homeScore! > game.awayScore!;
  const isAwayWinner = isPlayed && game.awayScore! > game.homeScore!;
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
          <Link to="/" className="back-btn">← Back</Link>
          <div className="game-card-nav-spacer" />
          {prevGame ? (
            <Link to={`/game/${prevGame.id}`} className="nav-btn" aria-label="Previous game">← Prev</Link>
          ) : (
            <span className="nav-btn disabled" aria-disabled="true">← Prev</span>
          )}
          {nextGame ? (
            <Link to={`/game/${nextGame.id}`} className="nav-btn" aria-label="Next game">Next →</Link>
          ) : (
            <span className="nav-btn disabled" aria-disabled="true">Next →</span>
          )}
        </div>
        <h2>
          {getGameLabel(game)}
        </h2>
        {isPlayed ? (
          <div className="actual-score final-scoreline">
            <span className={`final-team ${isHomeWinner ? 'winner-team' : ''}`}>
              {game.home} {game.homeScore}{isHomeWinner ? ' 🏆' : ''}
            </span>
            <span className="final-sep"> – </span>
            <span className={`final-team ${isAwayWinner ? 'winner-team' : ''}`}>
              {isAwayWinner ? '🏆 ' : ''}{game.awayScore} {game.away}
            </span>
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
                {isPlayed && p!.prediction.homeScore === game.homeScore && p!.prediction.awayScore === game.awayScore && (
                  <span className="exact-hit-badge">🎯 EXACT!</span>
                )}
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
