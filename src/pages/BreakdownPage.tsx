import { useAppContext } from '../context/useAppContext';
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
