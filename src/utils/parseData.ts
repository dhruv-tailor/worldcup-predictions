import Papa from 'papaparse';
import type { Game, Prediction } from '../types';

import gamesRaw from '../data/games.csv?raw';
import predictionsRaw from '../data/predictions.csv?raw';

export function parseGames(): Game[] {
  const result = Papa.parse(gamesRaw, {
    delimiter: ';',
    header: true,
    skipEmptyLines: true,
  });

  return (result.data as Record<string, string>[]).map((row) => ({
    id: parseInt(row.id, 10),
    home: row.home,
    away: row.away,
    homeScore: row.home_score !== '' ? parseInt(row.home_score, 10) : null,
    awayScore: row.away_score !== '' ? parseInt(row.away_score, 10) : null,
  }));
}

export function parsePredictions(): Prediction[] {
  const result = Papa.parse(predictionsRaw, {
    delimiter: ';',
    header: true,
    skipEmptyLines: true,
  });

  return (result.data as Record<string, string>[]).map((row) => ({
    name: row.name,
    gameId: parseInt(row.game_id, 10),
    homeScore: parseInt(row.home_score, 10),
    awayScore: parseInt(row.away_score, 10),
  }));
}
