import type { Game, PlayerScore } from '../types';

interface GameCardProps {
  game: Game;
  standings: PlayerScore[];
  onClose: () => void;
}

export default function GameCard({ game, standings, onClose }: GameCardProps) {
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
                <th>Winner</th>
                <th>GD</th>
                <th>Exact</th>
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
                  <td className={p!.points.winner > 0 ? 'pts-good' : 'pts-zero'}>
                    {p!.points.winner > 0 ? `+${p!.points.winner}` : '0'}
                  </td>
                  <td className={p!.points.goalDifference > 0 ? 'pts-good' : 'pts-zero'}>
                    {p!.points.goalDifference > 0 ? `+${p!.points.goalDifference}` : '0'}
                  </td>
                  <td className={p!.points.exactScore > 0 ? 'pts-perfect' : 'pts-zero'}>
                    {p!.points.exactScore > 0 ? `+${p!.points.exactScore}` : '0'}
                  </td>
                  <td className={`total ${pointsClass(p!.points.total)}`}>
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

function pointsClass(points: number): string {
  if (points === 4) return 'pts-perfect';
  if (points >= 3) return 'pts-great';
  if (points >= 2) return 'pts-good';
  if (points >= 1) return 'pts-ok';
  return 'pts-zero';
}
