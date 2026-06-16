import { useAppContext } from '../context/AppContext';
import Leaderboard from '../components/Leaderboard';
import ScoreChart from '../components/ScoreChart';

export default function DashboardPage() {
  const { standings, games, selectedSystem } = useAppContext();

  return (
    <>
      <Leaderboard
        standings={standings}
        games={games}
        system={selectedSystem}
      />
      <ScoreChart
        standings={standings}
        games={games}
        system={selectedSystem}
      />
    </>
  );
}
