import { useParams, Navigate } from 'react-router';
import { useAppContext } from '../context/AppContext';
import GameCard from '../components/GameCard';

export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const { games, standings, selectedSystem } = useAppContext();

  const gameId = Number(id);
  const game = games.find((g) => g.id === gameId);

  if (!game) {
    return <Navigate to="/" replace />;
  }

  return (
    <GameCard
      game={game}
      games={games}
      standings={standings}
      system={selectedSystem}
    />
  );
}
