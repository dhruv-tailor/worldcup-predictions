/**
 * **Black Sheep** — Stand out from the flock.
 *
 * For each game, the "crowd prediction" is the mode (most common prediction).
 * If you follow the crowd (predict the mode), you score 0 — neither gaining nor losing.
 * If you deviate, you're rewarded for being closer to the actual result than the crowd,
 * or penalized for being further away.
 *
 * **Formula:**
 * - `modeError` = |modeHome − actualHome| + |modeAway − actualAway|
 * - `playerError` = |predictedHome − actualHome| + |predictedAway − actualAway|
 * - `edge` = modeError − playerError (positive = beat the crowd)
 * - `points` = round(edge × 2) — positive when you beat the crowd, **negative** when the crowd beats you
 * - `bonus` = +1 for exact score match
 *
 * If your prediction matches the mode, edge is always exactly 0.
 * Ties for mode are broken by choosing the prediction with the smallest error.
 *
 * @module scoring/blackSheep
 */

import type { Game, Prediction, ScoringSystem, PlayerScore, GameBreakdown } from '../../types';

const blackSheep: ScoringSystem = {
  name: 'Black Sheep',
  description: 'Edge × 2 vs crowd mode (can go negative), +1 exact',
  categoryLabels: [
    { key: 'edge', label: 'Edge' },
    { key: 'bonus', label: 'Bonus' },
  ],
  maxPerGame: 12,
  calculateStandings(games: Game[], predictions: Prediction[]): PlayerScore[] {
    const playerMap = new Map<string, GameBreakdown[]>();
    const playerEdges = new Map<string, number[]>();
    const beatCount = new Map<string, number>();
    const playedWithPrediction = new Map<string, number>();

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

      // Find the mode prediction (most common home-away-homeWin triplet).
      // Ties broken by smallest error vs actual result.
      const freqMap = new Map<string, { count: number; home: number; away: number; homeWin: 'W' | 'L' | null }>();
      for (const p of gamePredictions) {
        const key = `${p.homeScore}-${p.awayScore}-${p.homeWin ?? ''}`;
        const entry = freqMap.get(key);
        if (entry) {
          entry.count++;
        } else {
          freqMap.set(key, { count: 1, home: p.homeScore, away: p.awayScore, homeWin: p.homeWin ?? null });
        }
      }
      let mode = { home: 0, away: 0, homeWin: null as 'W' | 'L' | null };
      let bestCount = 0;
      let bestError = Infinity;
      for (const { count, home, away, homeWin } of freqMap.values()) {
        const error = Math.abs(home - game.homeScore!) + Math.abs(away - game.awayScore!);
        if (count > bestCount || (count === bestCount && error < bestError)) {
          bestCount = count;
          bestError = error;
          mode = { home, away, homeWin };
        }
      }

      // Crowd (mode) error vs actual result
      const crowdError = Math.abs(mode.home - game.homeScore) + Math.abs(mode.away - game.awayScore);

      for (const prediction of gamePredictions) {
        const playerError = Math.abs(prediction.homeScore - game.homeScore) +
                           Math.abs(prediction.awayScore - game.awayScore);
        const rawEdge = crowdError - playerError;

        const edgePoints = Math.round(rawEdge * 2);
        const isExact = (
          game.homeScore === prediction.homeScore &&
          game.awayScore === prediction.awayScore &&
          (game.homeScore !== game.awayScore || game.homeWin === prediction.homeWin)
        );
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
