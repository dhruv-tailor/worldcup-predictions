/**
 * Shared helpers used across multiple scoring systems.
 *
 * Provides common utilities for determining match outcomes, wrapping
 * stateless scoring functions, and computing Ted Classic raw scores.
 *
 * @module scoring/helpers
 */

import type { Game, Prediction, PointBreakdown, PlayerScore, GameBreakdown } from '../types';

/**
 * Determines the match outcome from a pair of scores.
 * @returns 'home' if home wins, 'away' if away wins, 'draw' if tied
 */
export function getWinner(homeScore: number, awayScore: number): 'home' | 'away' | 'draw' {
  if (homeScore > awayScore) return 'home';
  if (awayScore > homeScore) return 'away';
  return 'draw';
}

/**
 * Factory that wraps a stateless per-game scoring function into a full
 * `calculateStandings` implementation.
 *
 * Handles the common boilerplate of:
 * 1. Grouping predictions by player
 * 2. Iterating games in sequential ID order
 * 3. Applying the scoring function to each (game, prediction) pair
 * 4. Aggregating totals and sorting the final standings
 *
 * @param scoreFn - Pure function that scores a single prediction against a single game
 * @returns A `calculateStandings` function suitable for a {@link ScoringSystem}
 */
export function simpleScoring(
  scoreFn: (game: Game, prediction: Prediction) => PointBreakdown
): (games: Game[], predictions: Prediction[]) => PlayerScore[] {
  return (games, predictions) => {
    const playerMap = new Map<string, GameBreakdown[]>();

    for (const prediction of predictions) {
      if (!playerMap.has(prediction.name)) {
        playerMap.set(prediction.name, []);
      }
    }

    const sortedGames = [...games].sort((a, b) => a.id - b.id);

    for (const game of sortedGames) {
      const gamePredictions = predictions.filter((p) => p.gameId === game.id);
      for (const prediction of gamePredictions) {
        const points = scoreFn(game, prediction);
        playerMap.get(prediction.name)!.push({ gameId: game.id, prediction, points });
      }
    }

    const standings: PlayerScore[] = [];
    for (const [name, gameBreakdowns] of playerMap) {
      const totalPoints = gameBreakdowns.reduce((sum, gb) => sum + gb.points.total, 0);
      standings.push({ name, totalPoints, gameBreakdowns });
    }
    standings.sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
    return standings;
  };
}

/**
 * Computes a Ted Classic raw score for a single prediction.
 *
 * This is extracted as a shared helper because both the Ladder (ELO)
 * and Hot Streak systems use Ted Classic scoring as their base measure
 * for comparing prediction quality.
 *
 * Scoring: +2 correct winner, +1 correct goal difference, +1 exact score = max 4
 *
 * @param game - The game with actual scores (must be played)
 * @param prediction - The player's predicted scores
 * @returns Raw point total (0–4)
 */
export function tedClassicRawScore(game: Game, prediction: Prediction): number {
  if (game.homeScore === null || game.awayScore === null) return 0;

  let pts = 0;
  if (getWinner(game.homeScore, game.awayScore) === getWinner(prediction.homeScore, prediction.awayScore)) {
    pts += 2;
  }
  if ((game.homeScore - game.awayScore) === (prediction.homeScore - prediction.awayScore)) {
    pts += 1;
  }
  if (game.homeScore === prediction.homeScore && game.awayScore === prediction.awayScore) {
    pts += 1;
  }
  return pts;
}
