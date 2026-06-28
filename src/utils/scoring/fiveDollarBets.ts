/**
 * **$5 Bets** — Everyone ante's up, winners split the pot.
 *
 * For each game every player who predicted pays $5 into a shared pool.
 * Players who correctly predicted the match winner (home/away/draw)
 * split the pool evenly, rounded to 2 decimal places.
 * If nobody predicted correctly, the pot is lost.
 *
 * Players start at $0 and can go negative.
 *
 * @module scoring/fiveDollarBets
 */

import type { Game, Prediction, ScoringSystem, PlayerScore, GameBreakdown } from '../../types';
import { getWinner } from './helpers';

const BET_AMOUNT = 5;

const fiveDollarBets: ScoringSystem = {
  name: '$5 Bets',
  description: 'Everyone bets $5 per game — correct-winner predictors split the pot',
  categoryLabels: [
    { key: 'bet', label: 'Bet' },
    { key: 'winnings', label: 'Win' },
  ],
  maxPerGame: undefined, // dynamic — depends on number of players
  calculateStandings(games: Game[], predictions: Prediction[]): PlayerScore[] {
    const playerMap = new Map<string, GameBreakdown[]>();
    let winCountMap = new Map<string, number>();
    let gamesPlayedMap = new Map<string, number>();

    for (const prediction of predictions) {
      if (!playerMap.has(prediction.name)) {
        playerMap.set(prediction.name, []);
        winCountMap.set(prediction.name, 0);
        gamesPlayedMap.set(prediction.name, 0);
      }
    }

    const sortedGames = [...games].sort((a, b) => a.id - b.id);

    for (const game of sortedGames) {
      if (game.homeScore === null || game.awayScore === null) {
        // Unplayed — zero points for everyone who predicted
        for (const prediction of predictions.filter((p) => p.gameId === game.id)) {
          playerMap.get(prediction.name)!.push({
            gameId: game.id,
            prediction,
            points: { categories: { bet: 0, winnings: 0 }, total: 0 },
          });
        }
        continue;
      }

      const gamePredictions = predictions.filter((p) => p.gameId === game.id);
      if (gamePredictions.length === 0) continue;

      const actualWinner = getWinner(game.homeScore, game.awayScore, game.homeWin);
      const pool = gamePredictions.length * BET_AMOUNT;

      // Find who predicted the correct winner
      const winners: Prediction[] = [];
      for (const prediction of gamePredictions) {
        const predictedWinner = getWinner(prediction.homeScore, prediction.awayScore, prediction.homeWin);
        if (predictedWinner === actualWinner) {
          winners.push(prediction);
        }
      }

      const winningsPerWinner = winners.length > 0
        ? Math.floor((pool / winners.length) * 100) / 100  // truncate to 2 decimal places
        : 0;

      for (const prediction of gamePredictions) {
        const isWinner = winners.includes(prediction);
        const winnings = isWinner ? winningsPerWinner : 0;
        const net = Math.round((winnings - BET_AMOUNT) * 100) / 100;

        playerMap.get(prediction.name)!.push({
          gameId: game.id,
          prediction,
          points: {
            categories: { bet: -BET_AMOUNT, winnings },
            total: net,
          },
        });

        gamesPlayedMap.set(prediction.name, gamesPlayedMap.get(prediction.name)! + 1);
        if (isWinner) {
          winCountMap.set(prediction.name, winCountMap.get(prediction.name)! + 1);
        }
      }
    }

    const standings: PlayerScore[] = [];
    for (const [name, gameBreakdowns] of playerMap) {
      const totalPoints = Math.round(
        gameBreakdowns.reduce((sum, gb) => sum + gb.points.total, 0) * 100
      ) / 100;
      const played = gamesPlayedMap.get(name)!;
      const wins = winCountMap.get(name)!;
      const winPct = played > 0 ? Math.round((wins / played) * 100) : 0;
      standings.push({ name, totalPoints, gameBreakdowns, winnerPct: winPct });
    }
    standings.sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
    return standings;
  },
};

export default fiveDollarBets;
