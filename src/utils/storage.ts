import type { Game, Prediction } from '../types';

const GAMES_KEY = 'wc-games';
const PREDICTIONS_KEY = 'wc-predictions';
const ADMIN_MODE_KEY = 'wc-admin';

export function loadGames(): Game[] | null {
  try {
    const stored = localStorage.getItem(GAMES_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function saveGames(games: Game[]): void {
  localStorage.setItem(GAMES_KEY, JSON.stringify(games));
}

export function loadPredictions(): Prediction[] | null {
  try {
    const stored = localStorage.getItem(PREDICTIONS_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function savePredictions(predictions: Prediction[]): void {
  localStorage.setItem(PREDICTIONS_KEY, JSON.stringify(predictions));
}

export function isAdminMode(): boolean {
  return localStorage.getItem(ADMIN_MODE_KEY) === 'true';
}

export function setAdminMode(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem(ADMIN_MODE_KEY, 'true');
  } else {
    localStorage.removeItem(ADMIN_MODE_KEY);
  }
}

export function clearStorage(): void {
  localStorage.removeItem(GAMES_KEY);
  localStorage.removeItem(PREDICTIONS_KEY);
}
