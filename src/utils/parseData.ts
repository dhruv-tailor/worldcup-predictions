/**
 * CSV data parsing utilities.
 *
 * Both CSV files use semicolons as delimiters and are imported as raw strings
 * via Vite's `?raw` suffix. PapaParse handles the parsing with header mode
 * so column names map directly to object keys.
 *
 * @module parseData
 */

import Papa from 'papaparse';
import type { Game, Prediction } from '../types';

import gamesRaw from '../data/games.csv?raw';
import predictionsRaw from '../data/predictions.csv?raw';

/**
 * Parses the games CSV into typed {@link Game} objects.
 *
 * CSV format: `id;home;away;home_score;away_score`
 * - Empty score fields are parsed as `null` (game not yet played)
 *
 * @returns Array of all games, both played and unplayed
 */
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

/**
 * Parses the predictions CSV into typed {@link Prediction} objects.
 *
 * CSV format: `name;game_id;home_score;away_score`
 * - Each row is one player's predicted score for one game
 *
 * @returns Array of all predictions across all players and games
 */
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
