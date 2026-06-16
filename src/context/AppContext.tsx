import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { parseGames, parsePredictions } from '../utils/parseData';
import { scoringSystems } from '../utils/scoring';
import type { Game, Prediction, PlayerScore, ScoringSystem } from '../types';

interface AppContextValue {
  games: Game[];
  predictions: Prediction[];
  selectedSystem: ScoringSystem;
  setSelectedSystem: (system: ScoringSystem) => void;
  standings: PlayerScore[];
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

const AppContext = createContext<AppContextValue | null>(null);

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

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
