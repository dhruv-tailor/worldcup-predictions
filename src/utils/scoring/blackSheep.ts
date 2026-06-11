/**
 * **Black Sheep** — Stand out from the flock.
 *
 * For each game, the "crowd prediction" is the average of all players' predictions.
 * Points are awarded based on how much closer your prediction was to the actual
 * result compared to the crowd average — and penalties for doing worse.
 *
 * **Formula:**
 * - `crowdError` = |avgHome − actualHome| + |avgAway − actualAway|
 * - `playerError` = |predictedHome − actualHome| + |predictedAway − actualAway|
 * - `edge` = crowdError − playerError (positive = beat the crowd)
 * - `points` = round(edge × 2) — positive when you beat the crowd, **negative** when the crowd beats you
 * - `bonus` = +1 for exact score match
 *
 * **Example (win):** Crowd averages 1.5–0.8, actual is 2–1.
 * Crowd error = 0.7. You predicted 2–1 (exact), error = 0. Edge = 0.7. Points = round(1.4) = 1 + 1 bonus = 2.
 *
 * **Example (loss):** Same game, you predicted 0–3, error = 4. Edge = 0.7 − 4 = −3.3.
 * Points = round(−6.6) = −7.
 *
 * Requires all predictions for a game (context-aware), so it uses a custom
 * `calculateStandings` instead of the `simpleScoring` helper.
 *
 * @module scoring/blackSheep
 */

import type { Game, Prediction, ScoringSystem, PlayerScore, GameBreakdown } from '../../types';

const blackSheep: ScoringSystem = {
  name: 'Black Sheep',
  description: 'Edge × 2 vs crowd average (can go negative), +1 exact',
  categoryLabels: [
    { key: 'edge', label: 'Edge' },
    { key: 'bonus', label: 'Bonus' },
  ],
  maxPerGame: 12,
  calculateStandings(games: Game[], predictions: Prediction[]): PlayerScore[] {
    const playerMap = new Map<string, GameBreakdown[]>();
    const playerEdges = new Map<string, number[]>();
    let beatCount = new Map<string, number>();
    let playedWithPrediction = new Map<string, number>();

    for (const prediction of predictions) {
      if (!playerMap.has(prediction.name)) {
        playerMap.set(prediction.name, []);
        playerEdges.set(prediction.name, []);
        beatCount.set(prediction.name, 0);
        playedWithPrediction.set(prediction.name, 0);
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
            points: { categories: { edge: 0, bonus: 0 }, total: 0 },
          });
        }
        continue;
      }

      const gamePredictions = predictions.filter((p) => p.gameId === game.id);

      if (gamePredictions.length === 0) continue;

      // Compute crowd average prediction
      const avgHome = gamePredictions.reduce((sum, p) => sum + p.homeScore, 0) / gamePredictions.length;
      const avgAway = gamePredictions.reduce((sum, p) => sum + p.awayScore, 0) / gamePredictions.length;

      // Crowd error vs actual result
      const crowdError = Math.abs(avgHome - game.homeScore) + Math.abs(avgAway - game.awayScore);

      for (const prediction of gamePredictions) {
        const playerError = Math.abs(prediction.homeScore - game.homeScore) +
                           Math.abs(prediction.awayScore - game.awayScore);
        const rawEdge = crowdError - playerError;

        const edgePoints = Math.round(rawEdge * 2);
        const isExact = game.homeScore === prediction.homeScore && game.awayScore === prediction.awayScore;
        const bonus = isExact ? 1 : 0;

        playerMap.get(prediction.name)!.push({
          gameId: game.id,
          prediction,
          points: { categories: { edge: edgePoints, bonus }, total: edgePoints + bonus },
        });

        playerEdges.get(prediction.name)!.push(rawEdge);
        playedWithPrediction.set(prediction.name, playedWithPrediction.get(prediction.name)! + 1);
        if (rawEdge > 0) {
          beatCount.set(prediction.name, beatCount.get(prediction.name)! + 1);
        }
      }
    }

    const standings: PlayerScore[] = [];
    for (const [name, gameBreakdowns] of playerMap) {
      const totalPoints = gameBreakdowns.reduce((sum, gb) => sum + gb.points.total, 0);
      const played = playedWithPrediction.get(name)!;
      const edges = playerEdges.get(name)!;
      const crowdBeatPct = played > 0 ? Math.round((beatCount.get(name)! / played) * 100) : 0;
      const avgEdge = edges.length > 0 ? Math.round((edges.reduce((a, b) => a + b, 0) / edges.length) * 10) / 10 : 0;
      standings.push({ name, totalPoints, gameBreakdowns, crowdBeatPct, avgEdge });
    }
    standings.sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
    return standings;
  },
};

export default blackSheep;
