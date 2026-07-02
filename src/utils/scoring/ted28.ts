/**
 * **Ted28** — Partial-credit system that rewards closeness on each team score.
 *
 * | Category         | Points | Condition                                      |
 * |------------------|--------|------------------------------------------------|
 * | Tendency         | +1     | Correct home/away/draw outcome                 |
 * | Home Goals       | +1/+2  | +1 within one goal, +2 exact                   |
 * | Away Goals       | +1/+2  | +1 within one goal, +2 exact                   |
 * | Goal Difference  | +1     | Predicted goal difference matches actual       |
 * | Exact Result     | +1     | Entire scoreline (and shootout winner) correct |
 *
 * Maximum per game: **7 points**
 *
 * @module scoring/ted28
 */

import type { ScoringSystem } from '../../types';
import { getWinner, simpleScoring } from './helpers';

const baseCalculate = simpleScoring((game, prediction) => {
  if (game.homeScore === null || game.awayScore === null) {
    return {
      categories: { tendency: 0, homeGoals: 0, awayGoals: 0, goalDifference: 0, exactResult: 0 },
      total: 0,
    };
  }

  const actualWinner = getWinner(game.homeScore, game.awayScore, game.homeWin);
  const predictedWinner = getWinner(prediction.homeScore, prediction.awayScore, prediction.homeWin);

  const tendency = actualWinner === predictedWinner ? 1 : 0;

  const homeDelta = Math.abs(game.homeScore - prediction.homeScore);
  const awayDelta = Math.abs(game.awayScore - prediction.awayScore);
  const homeGoals = homeDelta === 0 ? 2 : homeDelta === 1 ? 1 : 0;
  const awayGoals = awayDelta === 0 ? 2 : awayDelta === 1 ? 1 : 0;

  const goalDifference = (game.homeScore - game.awayScore) === (prediction.homeScore - prediction.awayScore) ? 1 : 0;

  const exactResult = (
    game.homeScore === prediction.homeScore &&
    game.awayScore === prediction.awayScore &&
    (game.homeScore !== game.awayScore || game.homeWin === prediction.homeWin)
  ) ? 1 : 0;

  const total = tendency + homeGoals + awayGoals + goalDifference + exactResult;

  return {
    categories: { tendency, homeGoals, awayGoals, goalDifference, exactResult },
    total,
  };
});

const ted28: ScoringSystem = {
  name: 'Ted28',
  description: '+1 tendency, home/away +1 within one (+2 exact), +1 GD, +1 exact result',
  categoryLabels: [
    { key: 'tendency', label: 'Tend' },
    { key: 'homeGoals', label: 'Home' },
    { key: 'awayGoals', label: 'Away' },
    { key: 'goalDifference', label: 'GD' },
    { key: 'exactResult', label: 'Exact' },
  ],
  maxPerGame: 7,
  calculateStandings(games, predictions) {
    const standings = baseCalculate(games, predictions);
    for (const player of standings) {
      player.exactCount = player.gameBreakdowns.filter((gb) => gb.points.categories.exactResult > 0).length;
      player.perfectCount = player.gameBreakdowns.filter((gb) => gb.points.total === 7).length;
    }
    return standings;
  },
};

export default ted28;