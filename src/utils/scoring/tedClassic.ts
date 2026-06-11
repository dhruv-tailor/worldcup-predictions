/**
 * **Ted Classic** — The original scoring system.
 *
 * | Category       | Points | Condition                                  |
 * |----------------|--------|--------------------------------------------|
 * | Winner         | +2     | Correctly predicted home win, away win, or draw |
 * | Goal Difference| +1     | Predicted goal difference matches actual    |
 * | Exact Score    | +1     | Both home and away scores match exactly     |
 *
 * Maximum per game: **4 points** (exact score implies correct GD and winner)
 *
 * @module scoring/tedClassic
 */

import type { ScoringSystem } from '../../types';
import { getWinner, simpleScoring } from './helpers';

const baseCalculate = simpleScoring((game, prediction) => {
    if (game.homeScore === null || game.awayScore === null) {
      return { categories: { winner: 0, goalDifference: 0, exactScore: 0 }, total: 0 };
    }

    const winner = getWinner(game.homeScore, game.awayScore) === getWinner(prediction.homeScore, prediction.awayScore) ? 2 : 0;
    const goalDifference = (game.homeScore - game.awayScore) === (prediction.homeScore - prediction.awayScore) ? 1 : 0;
    const exactScore = (game.homeScore === prediction.homeScore && game.awayScore === prediction.awayScore) ? 1 : 0;

    return {
      categories: { winner, goalDifference, exactScore },
      total: winner + goalDifference + exactScore,
    };
  });

const tedClassic: ScoringSystem = {
  name: 'Ted Classic',
  description: '+2 correct winner, +1 correct goal difference, +1 exact score',
  categoryLabels: [
    { key: 'winner', label: 'Winner' },
    { key: 'goalDifference', label: 'GD' },
    { key: 'exactScore', label: 'Exact' },
  ],
  maxPerGame: 4,
  calculateStandings(games, predictions) {
    const standings = baseCalculate(games, predictions);
    const playedCount = games.filter((g) => g.homeScore !== null).length;
    for (const player of standings) {
      const exactCount = player.gameBreakdowns.filter((gb) => gb.points.categories.exactScore > 0).length;
      const winnerCorrect = player.gameBreakdowns.filter((gb) => gb.points.categories.winner > 0).length;
      player.exactCount = exactCount;
      player.winnerPct = playedCount > 0 ? Math.round((winnerCorrect / playedCount) * 100) : 0;
    }
    return standings;
  },
};

export default tedClassic;
