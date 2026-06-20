import LeaderboardControlChart from '../components/LeaderboardControlChart';
import { useAppContext } from '../context/useAppContext';

export default function ControlPage() {
  const { games, predictions } = useAppContext();

  return <LeaderboardControlChart games={games} predictions={predictions} />;
}
