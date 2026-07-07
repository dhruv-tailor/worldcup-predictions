import type { FinalWinnerPrediction, Game, PlayerScore } from '../types';
import { getWinner } from './scoring/helpers';

const FINAL_WINNER_POOL_PCT = 0.15;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Resolves champion nation from the final scheduled game (highest game id).
 * Returns null if the final game is not yet played or ends in unresolved draw.
 */
export function resolveChampionNation(games: Game[]): string | null {
  if (games.length === 0) return null;

  const finalGame = [...games].sort((a, b) => a.id - b.id)[games.length - 1];
  if (finalGame.homeScore === null || finalGame.awayScore === null) return null;

  const winner = getWinner(finalGame.homeScore, finalGame.awayScore, finalGame.homeWin);
  if (winner === 'home') return finalGame.home;
  if (winner === 'away') return finalGame.away;
  return null;
}

/**
 * Applies the final-winner side-pot bonus to a system leaderboard.
 * Pool = 15% of pre-bonus spread, split equally among correct champion pickers.
 */
export function applyFinalWinnerBonus(
  standings: PlayerScore[],
  finalWinnerPredictions: FinalWinnerPrediction[],
  championNation: string | null,
): PlayerScore[] {
  const picksByPlayer = new Map(
    finalWinnerPredictions.map((prediction) => [normalize(prediction.name), prediction.nation]),
  );

  if (standings.length === 0) return standings;

  const baseTotals = standings.map((player) => player.totalPoints);
  const spread = Math.max(...baseTotals) - Math.min(...baseTotals);
  const pool = round2(spread * FINAL_WINNER_POOL_PCT);

  const normalizedChampion = championNation ? normalize(championNation) : null;
  const correctPicks = standings.filter((player) => {
    if (!normalizedChampion) return false;
    const pick = picksByPlayer.get(normalize(player.name));
    return pick ? normalize(pick) === normalizedChampion : false;
  });

  const bonusPerCorrect = correctPicks.length > 0 ? round2(pool / correctPicks.length) : 0;

  const boosted = standings.map((player) => {
    const pick = picksByPlayer.get(normalize(player.name)) ?? null;
    const pickedChampion =
      normalizedChampion !== null && pick !== null && normalize(pick) === normalizedChampion;
    const finalWinnerBonus = pickedChampion ? bonusPerCorrect : 0;

    return {
      ...player,
      basePoints: player.totalPoints,
      finalWinnerPick: pick,
      pickedChampion,
      finalWinnerBonus,
      totalPoints: round2(player.totalPoints + finalWinnerBonus),
    };
  });

  boosted.sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
  return boosted;
}
