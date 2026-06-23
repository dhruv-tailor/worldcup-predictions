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
  isAdmin: boolean;
  setIsAdmin: (enabled: boolean) => void;
  updateGame: (id: number, homeScore: number | null, awayScore: number | null) => void;
  addGame: (game: Omit<Game, 'id'>) => void;
  updatePrediction: (name: string, gameId: number, homeScore: number, awayScore: number) => void;
  addPrediction: (prediction: Prediction) => void;
  deletePrediction: (name: string, gameId: number) => void;
  resetData: () => void;
}

export const AppContext = createContext<AppContextValue | null>(null);
