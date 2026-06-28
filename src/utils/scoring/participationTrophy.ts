/**
 * **Participation Trophy** — Awards as many points as possible for partial matches.
 *
 * | Category       | Points | Condition                                              |
 * |----------------|--------|--------------------------------------------------------|
 * | Winner         | +2     | Correct match outcome (home/away/draw)                 |
 * | Home Goals     | +1     | Predicted exact home team score                        |
 * | Away Goals     | +1     | Predicted exact away team score                        |
 * | Goal Difference| +1     | Predicted goal difference matches actual                |
 * | Total Goals    | +1     | Predicted total goals (home+away) matches actual        |
 * | Within One     | +1     | Both predicted scores within ±1 of actual               |
 * | Exact Score    | +4     | Both home and away scores match exactly (jackpot)       |
 *
 * Maximum per game: **11 points** (2+1+1+1+1+1+4)
 *
 * No negative points — this is a feel-good system.
 *
 * @module scoring/participationTrophy
 */

import type { ScoringSystem } from '../../types';
import { getWinner, simpleScoring } from './helpers';

const baseCalculate = simpleScoring((game, prediction) => {
  if (game.homeScore === null || game.awayScore === null) {
    return {
      categories: { winner: 0, homeGoals: 0, awayGoals: 0, goalDifference: 0, totalGoals: 0, withinOne: 0, exactScore: 0 },
      total: 0,
    };
  }

  const actualWinner = getWinner(game.homeScore, game.awayScore, game.homeWin);
  const predictedWinner = getWinner(prediction.homeScore, prediction.awayScore, prediction.homeWin);

  const winner = actualWinner === predictedWinner ? 2 : 0;
  const homeGoals = game.homeScore === prediction.homeScore ? 1 : 0;
  const awayGoals = game.awayScore === prediction.awayScore ? 1 : 0;
  const goalDifference = (game.homeScore - game.awayScore) === (prediction.homeScore - prediction.awayScore) ? 1 : 0;
  const totalGoals = (game.homeScore + game.awayScore) === (prediction.homeScore + prediction.awayScore) ? 1 : 0;
  const withinOne = (Math.abs(game.homeScore - prediction.homeScore) <= 1 && Math.abs(game.awayScore - prediction.awayScore) <= 1) ? 1 : 0;
  const exactScore = (
    game.homeScore === prediction.homeScore &&
    game.awayScore === prediction.awayScore &&
    (game.homeScore !== game.awayScore || game.homeWin === prediction.homeWin)
  ) ? 4 : 0;

  const total = winner + homeGoals + awayGoals + goalDifference + totalGoals + withinOne + exactScore;

  return {
    categories: { winner, homeGoals, awayGoals, goalDifference, totalGoals, withinOne, exactScore },
    total,
  };
});

const participationTrophy: ScoringSystem = {
  name: 'Participation Trophy',
  description: '+2 winner, +1 home goals, +1 away goals, +1 GD, +1 total goals, +1 within one, +4 exact',
  categoryLabels: [
    { key: 'winner', label: 'Winner' },
    { key: 'homeGoals', label: 'Home' },
    { key: 'awayGoals', label: 'Away' },
    { key: 'goalDifference', label: 'GD' },
    { key: 'totalGoals', label: 'Goals' },
    { key: 'withinOne', label: 'Close' },
    { key: 'exactScore', label: 'Exact' },
  ],
  maxPerGame: 11,
  calculateStandings(games, predictions) {
    const standings = baseCalculate(games, predictions);
    for (const player of standings) {
      player.exactCount = player.gameBreakdowns.filter((gb) => gb.points.categories.exactScore > 0).length;
      player.perfectCount = player.gameBreakdowns.filter((gb) => gb.points.total === 11).length;
    }
    return standings;
  },
};

export default participationTrophy;
