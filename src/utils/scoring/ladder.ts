/**
 * **Ladder (ELO)** — Competitive ranking based on the ELO rating system.
 *
 * Every player starts at **1000 ELO**. For each played game, every pair of
 * players is compared head-to-head. The player with the better prediction
 * (measured by Ted+ raw score) "wins" the matchup and gains ELO.
 *
 * **ELO formula per matchup:**
 * - Expected score: `E_A = 1 / (1 + 10^((R_B - R_A) / 400))`
 * - Rating change: `Δ = k × (S − E)` where `k = K / (numPlayers - 1)`
 * - K-factor = 32, scaled by opponent count to keep deltas reasonable
 * - Equal raw scores = draw (S = 0.5 for both)
 *
 * **Key difference:** `totalPoints` is the final ELO rating, NOT a cumulative
 * point sum. The `delta` category shows per-game rating changes (+/−).
 *
 * This is a stateful system — ratings carry over between sequential games.
 *
 * @module scoring/ladder
 */

import type { Game, Prediction, ScoringSystem, PlayerScore, GameBreakdown } from '../../types';
import { tedPlusRawScore } from './helpers';

const ladder: ScoringSystem = {
  name: 'Ladder',
  description: 'ELO rating. Everyone playes everyone each game',
  categoryLabels: [
    { key: 'delta', label: 'Δ' },
  ],
  calculateStandings(games: Game[], predictions: Prediction[]): PlayerScore[] {
    const playerNames = [...new Set(predictions.map((p) => p.name))];
    const ratings = new Map<string, number>();
    const peakRatings = new Map<string, number>();
    const lowRatings = new Map<string, number>();
    const playerBreakdowns = new Map<string, GameBreakdown[]>();

    for (const name of playerNames) {
      ratings.set(name, 1000);
      peakRatings.set(name, 1000);
      lowRatings.set(name, 1000);
      playerBreakdowns.set(name, []);
    }

    const sortedGames = [...games].sort((a, b) => a.id - b.id);
    const K = 32;

    for (const game of sortedGames) {
      const gamePredictions = predictions.filter((p) => p.gameId === game.id);

      if (game.homeScore === null || game.awayScore === null) {
        for (const prediction of gamePredictions) {
          playerBreakdowns.get(prediction.name)!.push({
            gameId: game.id,
            prediction,
            points: { categories: { delta: 0 }, total: 0 },
          });
        }
        continue;
      }

      // Use Ted+ raw score (0–7) as the quality measure for each prediction
      const rawScores = new Map<string, { score: number; prediction: Prediction }>();
      for (const prediction of gamePredictions) {
        rawScores.set(prediction.name, {
          score: tedPlusRawScore(game, prediction),
          prediction,
        });
      }

      // Pairwise ELO matchups: compare every player against every other player
      const deltas = new Map<string, number>();
      for (const name of rawScores.keys()) deltas.set(name, 0);

      const players = [...rawScores.keys()];
      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          const a = players[i];
          const b = players[j];
          const rA = ratings.get(a)!;
          const rB = ratings.get(b)!;
          const scoreA = rawScores.get(a)!.score;
          const scoreB = rawScores.get(b)!.score;

          // ELO expected scores based on current ratings
          const eA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
          const eB = 1 - eA;

          // Actual result: 1 = win, 0 = loss, 0.5 = tied prediction quality
          let sA: number, sB: number;
          if (scoreA > scoreB) { sA = 1; sB = 0; }
          else if (scoreA < scoreB) { sA = 0; sB = 1; }
          else { sA = 0.5; sB = 0.5; }

          // Scale K by number of opponents so total delta is reasonable
          const k = K / (players.length - 1);
          deltas.set(a, deltas.get(a)! + k * (sA - eA));
          deltas.set(b, deltas.get(b)! + k * (sB - eB));
        }
      }

      // Apply rating changes and record per-game breakdowns
      for (const [name, delta] of deltas) {
        const roundedDelta = Math.round(delta);
        const newRating = ratings.get(name)! + roundedDelta;
        ratings.set(name, newRating);
        if (newRating > peakRatings.get(name)!) peakRatings.set(name, newRating);
        if (newRating < lowRatings.get(name)!) lowRatings.set(name, newRating);
        playerBreakdowns.get(name)!.push({
          gameId: game.id,
          prediction: rawScores.get(name)!.prediction,
          points: { categories: { delta: roundedDelta }, total: roundedDelta },
        });
      }
    }

    // Final standings: totalPoints = current ELO rating (not a cumulative sum)
    const standings: PlayerScore[] = [];
    for (const [name, breakdowns] of playerBreakdowns) {
      standings.push({
        name,
        totalPoints: ratings.get(name)!,
        gameBreakdowns: breakdowns,
        peakRating: peakRatings.get(name)!,
        lowestRating: lowRatings.get(name)!,
      });
    }
    standings.sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
    return standings;
  },
};

export default ladder;
