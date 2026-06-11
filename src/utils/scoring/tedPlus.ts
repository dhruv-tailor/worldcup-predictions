/**
 * **Ted+** — Enhanced version of Ted Classic with additional reward categories.
 *
 * | Category       | Points | Condition                                  |
 * |----------------|--------|--------------------------------------------|
 * | Winner         | +2/+3  | +2 for correct home/away win, +3 for correct draw (draws are harder to predict) |
 * | Goal Difference| +1     | Predicted goal difference matches actual    |
 * | Total Goals    | +1     | Predicted total goals (home+away) matches actual |
 * | Exact Score    | +2     | Both home and away scores match exactly     |
 *
 * Maximum per game: **7 points** (correct draw + GD + total goals + exact = 3+1+1+2)
 *
 * @module scoring/tedPlus
 */

import type { ScoringSystem } from '../../types';
import { getWinner, simpleScoring } from './helpers';

const tedPlus: ScoringSystem = {
  name: 'Ted+',
  description: '+2 winner (+3 draw), +1 GD, +1 total goals, +2 exact score',
  categoryLabels: [
    { key: 'winner', label: 'Winner' },
    { key: 'goalDifference', label: 'GD' },
    { key: 'totalGoals', label: 'Goals' },
    { key: 'exactScore', label: 'Exact' },
  ],
  maxPerGame: 7,
  calculateStandings: simpleScoring((game, prediction) => {
    if (game.homeScore === null || game.awayScore === null) {
      return { categories: { winner: 0, goalDifference: 0, totalGoals: 0, exactScore: 0 }, total: 0 };
    }

    const actualWinner = getWinner(game.homeScore, game.awayScore);
    const predictedWinner = getWinner(prediction.homeScore, prediction.awayScore);
    const correctWinner = actualWinner === predictedWinner;

    // +2 for correct winner, +3 if correctly predicted a draw
    const winner = correctWinner ? (actualWinner === 'draw' ? 3 : 2) : 0;

    const goalDifference = (game.homeScore - game.awayScore) === (prediction.homeScore - prediction.awayScore) ? 1 : 0;

    const actualTotal = game.homeScore + game.awayScore;
    const predictedTotal = prediction.homeScore + prediction.awayScore;
    const totalGoals = actualTotal === predictedTotal ? 1 : 0;

    const exactScore = (game.homeScore === prediction.homeScore && game.awayScore === prediction.awayScore) ? 2 : 0;

    return {
      categories: { winner, goalDifference, totalGoals, exactScore },
      total: winner + goalDifference + totalGoals + exactScore,
    };
  }),
};

export default tedPlus;
