import { useEffect, useMemo, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Game, Prediction } from '../types';
import { parseGames, parsePredictions } from '../utils/parseData';
import { scoringSystems } from '../utils/scoring';
import {
  loadGames,
  saveGames,
  loadPredictions,
  savePredictions,
  isAdminMode,
  setAdminMode,
  loadSeedSignature,
  saveSeedSignature,
} from '../utils/storage';
import { AppContext } from './appContextStore';

function isPlayedGame(game: Game): boolean {
  return game.homeScore !== null && game.awayScore !== null;
}

function isUnplayedGame(game: Game): boolean {
  return game.homeScore === null || game.awayScore === null;
}

function reconcileGamesWithCsv(storedGames: Game[], csvGames: Game[]): Game[] {
  const csvById = new Map(csvGames.map((game) => [game.id, game]));

  const merged = storedGames.map((storedGame) => {
    const csvGame = csvById.get(storedGame.id);
    if (!csvGame) return storedGame;

    // Keep user edits by default, but if CSV now marks a game as played while
    // stored data still has it unplayed, promote the CSV result.
    if (isUnplayedGame(storedGame) && isPlayedGame(csvGame)) {
      return {
        ...storedGame,
        homeScore: csvGame.homeScore,
        awayScore: csvGame.awayScore,
      };
    }

    return storedGame;
  });

  const storedIds = new Set(storedGames.map((game) => game.id));
  const missingCsvGames = csvGames.filter((game) => !storedIds.has(game.id));
  return [...merged, ...missingCsvGames].sort((a, b) => a.id - b.id);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const csvGames = useMemo(() => parseGames(), []);
  const csvPredictions = useMemo(() => parsePredictions(), []);
  const csvSeedSignature = useMemo(
    () => JSON.stringify({ games: csvGames, predictions: csvPredictions }),
    [csvGames, csvPredictions],
  );
  const storedSeedSignature = useMemo(() => loadSeedSignature(), []);
  const hasSeedChanged = storedSeedSignature !== csvSeedSignature;

  // Initialize games from localStorage or CSV
  const [games, setGames] = useState<Game[]>(() => {
    if (hasSeedChanged) {
      return csvGames;
    }

    const stored = loadGames();
    if (!stored) return csvGames;
    return reconcileGamesWithCsv(stored, csvGames);
  });

  // Initialize predictions from localStorage or CSV
  const [predictions, setPredictions] = useState<Prediction[]>(() => {
    if (hasSeedChanged) {
      return csvPredictions;
    }

    const stored = loadPredictions();
    return stored || csvPredictions;
  });

  useEffect(() => {
    if (hasSeedChanged) {
      setGames(csvGames);
      setPredictions(csvPredictions);
      saveSeedSignature(csvSeedSignature);
    }
  }, [hasSeedChanged, csvGames, csvPredictions, csvSeedSignature]);

  // Admin mode is enabled by default; persisted value is respected once set.
  const [isAdmin, setIsAdminInternal] = useState(() => {
    const hasStoredValue = localStorage.getItem('wc-admin') !== null;
    if (!hasStoredValue) return true;
    return isAdminMode();
  });

  const setIsAdmin = useCallback((enabled: boolean) => {
    setAdminMode(enabled);
    setIsAdminInternal(enabled);
  }, []);

  // Persist games to localStorage whenever they change
  useEffect(() => {
    saveGames(games);
  }, [games]);

  // Persist predictions to localStorage whenever they change
  useEffect(() => {
    savePredictions(predictions);
  }, [predictions]);

  // Mutation functions
  const updateGame = useCallback((id: number, homeScore: number | null, awayScore: number | null) => {
    setGames((prev) =>
      prev.map((g) => (g.id === id ? { ...g, homeScore, awayScore } : g))
    );
  }, []);

  const addGame = useCallback((game: Omit<Game, 'id'>) => {
    setGames((prev) => {
      const nextId = Math.max(...prev.map((g) => g.id), 0) + 1;
      return [...prev, { ...game, id: nextId }];
    });
  }, []);

  const updatePrediction = useCallback(
    (name: string, gameId: number, homeScore: number, awayScore: number) => {
      setPredictions((prev) =>
        prev.map((p) =>
          p.name === name && p.gameId === gameId
            ? { ...p, homeScore, awayScore }
            : p
        )
      );
    },
    []
  );

  const addPrediction = useCallback((prediction: Prediction) => {
    setPredictions((prev) => [...prev, prediction]);
  }, []);

  const deletePrediction = useCallback((name: string, gameId: number) => {
    setPredictions((prev) => prev.filter((p) => !(p.name === name && p.gameId === gameId)));
  }, []);

  const resetData = useCallback(() => {
    setGames(csvGames);
    setPredictions(csvPredictions);
    saveSeedSignature(csvSeedSignature);
  }, [csvGames, csvPredictions, csvSeedSignature]);

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
      isAdmin,
      setIsAdmin,
      updateGame,
      addGame,
      updatePrediction,
      addPrediction,
      deletePrediction,
      resetData,
    }}>
      {children}
    </AppContext>
  );
}
