/**
 * **Equal Aggregate** — Normalized average across all scoring systems, weighted equally.
 *
 * For each game, every base scoring system produces a raw score per player.
 * These are normalized to a 0–100 scale using min-max normalization across
 * players within that game, then averaged equally across all systems.
 *
 * This gives a balanced "consensus" ranking — a player must perform well
 * across all scoring philosophies to rank highly.
 *
 * Normalization per game per system:
 * - `normalized = (score - min) / (max - min) * 100`
 * - If all players tied (max === min): 0 if all zero, else 50
 * - Handles negative values (e.g., Ladder ELO deltas)
 *
 * @module scoring/equalAggregate
 */

import type { Game, Prediction, ScoringSystem, PlayerScore, GameBreakdown } from '../../types';
import tedClassic from './tedClassic';
import tedPlus from './tedPlus';
import gamblers from './gamblers';
import blackSheep from './blackSheep';
import ladder from './ladder';
import hotStreak from './hotStreak';
import participationTrophy from './participationTrophy';

/** Base scoring systems to aggregate */
const baseSystems: ScoringSystem[] = [tedClassic, tedPlus, gamblers, blackSheep, ladder, hotStreak, participationTrophy];

/** Short labels for per-game breakdown columns */
const systemLabels: { key: string; label: string }[] = [
  { key: 'tc', label: 'Ted Classic' },
  { key: 'tp', label: 'Ted+' },
  { key: 'gam', label: "Gambler's" },
  { key: 'bs', label: 'Black Sheep' },
  { key: 'lad', label: 'Ladder' },
  { key: 'hs', label: 'Hot Streak' },
  { key: 'pt', label: 'Participation Trophy' },
];

/**
 * Normalizes an array of scores to 0–100 using min-max scaling.
 * Returns 0 for all if everyone scored 0, 50 if all tied at a non-zero value.
 */
function normalize(scores: number[]): number[] {
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (max === min) return scores.map(() => (max === 0 ? 0 : 50));
  return scores.map((s) => ((s - min) / (max - min)) * 100);
}

const equalAggregate: ScoringSystem = {
  name: 'Equal Aggregate',
  description: 'Normalized average across all 7 scoring systems, weighted equally',
  categoryLabels: systemLabels,
  maxPerGame: 100,
  calculateStandings(games: Game[], predictions: Prediction[]): PlayerScore[] {
    // Run all base systems
    const allStandings = baseSystems.map((sys) => sys.calculateStandings(games, predictions));

    // Get player names from first system (all systems have the same players)
    const playerNames = allStandings[0].map((s) => s.name);
    const sortedGames = [...games].sort((a, b) => a.id - b.id);

    // Build per-game breakdowns
    const playerBreakdowns = new Map<string, GameBreakdown[]>();
    for (const name of playerNames) {
      playerBreakdowns.set(name, []);
    }

    for (const game of sortedGames) {
      // For each base system, get raw per-game scores for all players
      const perSystemScores: Map<string, number>[] = allStandings.map((standings) => {
        const scoreMap = new Map<string, number>();
        for (const player of standings) {
          const gb = player.gameBreakdowns.find((b) => b.gameId === game.id);
          scoreMap.set(player.name, gb?.points.total ?? 0);
        }
        return scoreMap;
      });

      // Normalize each system's scores for this game
      const normalizedPerSystem: Map<string, number>[] = perSystemScores.map((scoreMap) => {
        const scores = playerNames.map((n) => scoreMap.get(n) ?? 0);
        const normed = normalize(scores);
        const result = new Map<string, number>();
        playerNames.forEach((n, i) => result.set(n, normed[i]));
        return result;
      });

      // For each player, average the normalized scores and build breakdown
      for (const name of playerNames) {
        const categories: Record<string, number> = {};
        let sum = 0;

        systemLabels.forEach((lbl, i) => {
          const val = Math.round(normalizedPerSystem[i].get(name) ?? 0);
          categories[lbl.key] = val;
          sum += val;
        });

        const total = Math.round(sum / baseSystems.length);

        // Find this player's prediction for this game (from any system's breakdown)
        const prediction = allStandings[0]
          .find((s) => s.name === name)
          ?.gameBreakdowns.find((b) => b.gameId === game.id)?.prediction;

        if (prediction) {
          playerBreakdowns.get(name)!.push({
            gameId: game.id,
            prediction,
            points: { categories, total },
          });
        } else {
          // Player has no prediction for this game — record zero-point breakdown
          const zeroCategories: Record<string, number> = {};
          for (const lbl of systemLabels) zeroCategories[lbl.key] = 0;
          playerBreakdowns.get(name)!.push({
            gameId: game.id,
            prediction: { name, gameId: game.id, homeScore: 0, awayScore: 0 },
            points: { categories: zeroCategories, total: 0 },
          });
        }
      }
    }

    // Sum per-game totals
    const standings: PlayerScore[] = [];
    for (const [name, breakdowns] of playerBreakdowns) {
      const totalPoints = breakdowns.reduce((sum, gb) => sum + gb.points.total, 0);
      // Compute best/worst system by average normalized score
      const systemAvgs = systemLabels.map((lbl) => {
        const vals = breakdowns.map((gb) => gb.points.categories[lbl.key] ?? 0);
        return { label: lbl.label, avg: vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 };
      });
      systemAvgs.sort((a, b) => b.avg - a.avg);
      standings.push({
        name, totalPoints, gameBreakdowns: breakdowns,
        bestSystem: systemAvgs[0]?.label,
        worstSystem: systemAvgs[systemAvgs.length - 1]?.label,
      });
    }
    standings.sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
    return standings;
  },
};

export default equalAggregate;
