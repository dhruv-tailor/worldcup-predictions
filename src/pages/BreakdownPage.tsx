import { useAppContext } from '../context/AppContext';
import CategoryBreakdown from '../components/CategoryBreakdown';

export default function BreakdownPage() {
  const { games, predictions } = useAppContext();

  return (
    <CategoryBreakdown
      games={games}
      predictions={predictions}
    />
  );
}
