/**
 * **Gambler's Mode** — Rewards going against the grain.
 *
 * Uses a uniqueness multiplier based on how many players predicted the same outcome.
 * Fewer people agreeing with you = bigger payoff when you're right.
 *
 * **Formula:**
 * - `base` = 1 for correct winner, +2 bonus for exact score
 * - `multiplier` = totalPlayers / playersWhoPickedSameOutcome
 * - `uniqueBonus` = round(base × multiplier) − base
 * - Wrong winner = 0 points
 *
 * **Example:** 11 players, only 2 predicted a draw, draw happens:
 * - base = 1, multiplier = 11/2 = 5.5, total = round(5.5) = 6 points
 *
 * Requires all predictions for a game (context-aware), so it uses a custom
 * `calculateStandings` instead of the `simpleScoring` helper.
 *
 * @module scoring/gamblers
 */

import type { Game, Prediction, ScoringSystem, PlayerScore, GameBreakdown } from '../../types';
import { getWinner } from './helpers';

const gamblers: ScoringSystem = {
  name: "Gambler's",
  description: '+1 correct winner (+2 exact) × uniqueness multiplier',
  categoryLabels: [
    { key: 'base', label: 'Base' },
    { key: 'uniqueBonus', label: 'Bonus' },
  ],
  maxPerGame: 15,
  calculateStandings(games: Game[], predictions: Prediction[]): PlayerScore[] {
    const playerNames = [...new Set(predictions.map((p) => p.name))];
    const playerMap = new Map<string, GameBreakdown[]>();

    for (const prediction of predictions) {
      if (!playerMap.has(prediction.name)) {
        playerMap.set(prediction.name, []);
      }
    }

    const sortedGames = [...games].sort((a, b) => a.id - b.id);

    for (const game of sortedGames) {
      if (game.homeScore === null || game.awayScore === null) {
        // Unplayed — zero points for everyone
        for (const prediction of predictions.filter((p) => p.gameId === game.id)) {
          playerMap.get(prediction.name)!.push({
            gameId: game.id,
            prediction,
            points: { categories: { base: 0, uniqueBonus: 0 }, total: 0 },
          });
        }
        continue;
      }

      const gamePredictions = predictions.filter((p) => p.gameId === game.id);
      const totalPlayers = gamePredictions.length;
      const actualWinner = getWinner(game.homeScore, game.awayScore);

      // Count how many players predicted each outcome (home win, away win, draw)
      const outcomeCounts = { home: 0, away: 0, draw: 0 };
      for (const p of gamePredictions) {
        outcomeCounts[getWinner(p.homeScore, p.awayScore)]++;
      }

      for (const prediction of gamePredictions) {
        const predictedWinner = getWinner(prediction.homeScore, prediction.awayScore);
        const correct = predictedWinner === actualWinner;

        if (!correct) {
          playerMap.get(prediction.name)!.push({
            gameId: game.id,
            prediction,
            points: { categories: { base: 0, uniqueBonus: 0 }, total: 0 },
          });
          continue;
        }

        // Uniqueness multiplier: ratio of total players to those who picked the same outcome
        const sameOutcomeCount = outcomeCounts[actualWinner];
        const multiplier = totalPlayers / sameOutcomeCount;

        // Base points: +1 for correct winner, +2 bonus for exact score match
        let base = 1;
        const isExact = game.homeScore === prediction.homeScore && game.awayScore === prediction.awayScore;
        if (isExact) base += 2;

        // Apply multiplier: boosted = round(base × multiplier), bonus = boosted − base
        const boosted = Math.round(base * multiplier);
        const uniqueBonus = boosted - base;

        playerMap.get(prediction.name)!.push({
          gameId: game.id,
          prediction,
          points: { categories: { base, uniqueBonus }, total: base + uniqueBonus },
        });
      }
    }

    const standings: PlayerScore[] = [];
    for (const [name, gameBreakdowns] of playerMap) {
      const totalPoints = gameBreakdowns.reduce((sum, gb) => sum + gb.points.total, 0);
      standings.push({ name, totalPoints, gameBreakdowns });
    }
    standings.sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
    return standings;
  },
};

export default gamblers;
