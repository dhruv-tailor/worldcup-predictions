import { useAppContext } from '../context/useAppContext';
import UpcomingGames from '../components/UpcomingGames';

export default function UpcomingPage() {
  const { games, predictions } = useAppContext();

  return (
    <UpcomingGames
      games={games}
      predictions={predictions}
    />
  );
}
