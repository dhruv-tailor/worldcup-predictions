import { createContext } from 'react';
import type { Game, Prediction, PlayerScore, ScoringSystem } from '../types';

export interface AppContextValue {
  games: Game[];
  predictions: Prediction[];
  selectedSystem: ScoringSystem;
  setSelectedSystem: (system: ScoringSystem) => void;
  standings: PlayerScore[];
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

export const AppContext = createContext<AppContextValue | null>(null);
