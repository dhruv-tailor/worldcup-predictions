import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { parseGames, parsePredictions } from '../utils/parseData';
import { scoringSystems } from '../utils/scoring';
import { AppContext } from './appContextStore';

export function AppProvider({ children }: { children: ReactNode }) {
  const games = useMemo(() => parseGames(), []);
  const predictions = useMemo(() => parsePredictions(), []);

  const [selectedSystem, setSelectedSystem] = useState(scoringSystems[0]);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const standings = useMemo(
    () => selectedSystem.calculateStandings(games, predictions),
    [games, predictions, selectedSystem],
  );

  return (
    <AppContext value={{
      games,
      predictions,
      selectedSystem,
      setSelectedSystem,
      standings,
      theme,
      setTheme,
    }}>
      {children}
    </AppContext>
  );
}
