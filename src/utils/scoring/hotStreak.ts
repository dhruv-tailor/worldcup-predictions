/**
 * **Hot Streak** — Ted Classic with escalating streak bonuses.
 *
 * Base scoring is identical to Ted Classic (max 4 per game). On top of that,
 * tracks each player's consecutive correct-winner streak across sequential games:
 *
 * | Consecutive correct winners | Streak bonus |
 * |----------------------------|-------------|
 * | 1st correct                | +0          |
 * | 2nd consecutive            | +1          |
 * | 3rd consecutive            | +2          |
 * | nth consecutive            | +(n-1)      |
 *
 * Wrong winner prediction resets the streak to 0.
 *
 * This is a stateful system — streak counters persist across sequential games.
 *
 * @module scoring/hotStreak
 */

import type { Game, Prediction, ScoringSystem, PlayerScore, GameBreakdown } from '../../types';
import { getWinner, tedClassicRawScore } from './helpers';

const hotStreak: ScoringSystem = {
  name: 'Hot Streak',
  description: 'Ted Classic + escalating bonus for consecutive correct winners',
  categoryLabels: [
    { key: 'base', label: 'Base' },
    { key: 'streakBonus', label: 'Streak' },
  ],
  maxPerGame: 8,
  calculateStandings(games: Game[], predictions: Prediction[]): PlayerScore[] {
    const playerNames = [...new Set(predictions.map((p) => p.name))];
    const playerBreakdowns = new Map<string, GameBreakdown[]>();
    const streaks = new Map<string, number>();
    const maxStreaks = new Map<string, number>();

    for (const name of playerNames) {
      playerBreakdowns.set(name, []);
      streaks.set(name, 0);
      maxStreaks.set(name, 0);
    }

    const sortedGames = [...games].sort((a, b) => a.id - b.id);

    for (const game of sortedGames) {
      const gamePredictions = predictions.filter((p) => p.gameId === game.id);

      if (game.homeScore === null || game.awayScore === null) {
        for (const prediction of gamePredictions) {
          playerBreakdowns.get(prediction.name)!.push({
            gameId: game.id,
            prediction,
            points: { categories: { base: 0, streakBonus: 0 }, total: 0 },
          });
        }
        continue;
      }

      const actualWinner = getWinner(game.homeScore, game.awayScore);

      for (const prediction of gamePredictions) {
        const base = tedClassicRawScore(game, prediction);
        const predictedWinner = getWinner(prediction.homeScore, prediction.awayScore);
        const correctWinner = predictedWinner === actualWinner;

        let streakBonus = 0;
        if (correctWinner) {
          const currentStreak = streaks.get(prediction.name)!;
          streakBonus = currentStreak; // 0 for first correct, +1 for second, etc.
          const newStreak = currentStreak + 1;
          streaks.set(prediction.name, newStreak);
          const best = maxStreaks.get(prediction.name)!;
          if (newStreak > best) maxStreaks.set(prediction.name, newStreak);
        } else {
          streaks.set(prediction.name, 0);
        }

        playerBreakdowns.get(prediction.name)!.push({
          gameId: game.id,
          prediction,
          points: { categories: { base, streakBonus }, total: base + streakBonus },
        });
      }

      // Reset streak for players who didn't submit a prediction for this game
      for (const name of playerNames) {
        const hasPrediction = gamePredictions.some((p) => p.name === name);
        if (!hasPrediction) {
          streaks.set(name, 0);
        }
      }
    }

    const standings: PlayerScore[] = [];
    for (const [name, breakdowns] of playerBreakdowns) {
      const totalPoints = breakdowns.reduce((sum, gb) => sum + gb.points.total, 0);
      const currentStreak = streaks.get(name) ?? 0;
      const longestStreak = maxStreaks.get(name) ?? 0;
      standings.push({ name, totalPoints, gameBreakdowns: breakdowns, currentStreak, longestStreak });
    }
    standings.sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
    return standings;
  },
};

export default hotStreak;
