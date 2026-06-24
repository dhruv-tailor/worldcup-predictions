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

function parseNullableInt(value: string | undefined): number | null {
  const normalized = (value ?? '').trim();
  if (normalized === '') return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseRequiredInt(value: string | undefined): number {
  const normalized = (value ?? '').trim();
  return Number.parseInt(normalized, 10);
}

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

  return (result.data as Record<string, string>[])
    .map((row) => ({
      id: parseRequiredInt(row.id),
      home: (row.home ?? '').trim(),
      away: (row.away ?? '').trim(),
      homeScore: parseNullableInt(row.home_score),
      awayScore: parseNullableInt(row.away_score),
    }))
    .filter((game) => Number.isFinite(game.id) && game.home !== '' && game.away !== '');
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

  return (result.data as Record<string, string>[])
    .map((row) => ({
      name: (row.name ?? '').trim(),
      gameId: parseRequiredInt(row.game_id),
      homeScore: parseRequiredInt(row.home_score),
      awayScore: parseRequiredInt(row.away_score),
    }))
    .filter(
      (prediction) =>
        prediction.name !== '' &&
        Number.isFinite(prediction.gameId) &&
        Number.isFinite(prediction.homeScore) &&
        Number.isFinite(prediction.awayScore),
    );
}
