import { useAppContext } from '../context/AppContext';
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
