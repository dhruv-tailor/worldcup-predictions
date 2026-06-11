import type { PlayerScore, Game } from '../types';

interface LeaderboardProps {
  standings: PlayerScore[];
  games: Game[];
  onSelectGame: (gameId: number) => void;
}

export default function Leaderboard({ standings, games, onSelectGame }: LeaderboardProps) {
  const playedGames = games.filter((g) => g.homeScore !== null).sort((a, b) => a.id - b.id);

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
                return (
                  <td
                    key={game.id}
                    className={`game-col ${pointsClass(breakdown?.points.total ?? 0)}`}
                  >
                    {breakdown?.points.total ?? '-'}
                  </td>
                );
              })}
              <td className="total-col">{player.totalPoints}</td>
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
