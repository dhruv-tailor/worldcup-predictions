import type { Game, PlayerScore, Prediction, ScoringSystem } from '../types';
import { getWinner } from './scoring/helpers';

export interface PlayerAccuracyStats {
  predictionsMade: number;
  playedPredictions: number;
  winnerCorrectCount: number;
  winnerPct: number;
  exactCount: number;
  exactPct: number;
  avgError: number;
  homeAvgError: number;
  awayAvgError: number;
  bestTeam: string | null;
  bestTeamError: number | null;
  worstTeam: string | null;
  worstTeamError: number | null;
}

export interface PlayerGameHistoryItem {
  gameId: number;
  home: string;
  away: string;
  actualHome: number;
  actualAway: number;
  predictedHome: number;
  predictedAway: number;
  totalPoints: number;
  error: number;
}

export interface CrossSystemRank {
  systemName: string;
  rank: number;
  totalPoints: number;
  keyStat: string;
}

const MAX_REASONABLE_PREDICTED_GOALS = 50;

const countryAliases: Record<string, string> = {
  Equador: 'Ecuador',
};

function canonicalTeamName(team: string): string {
  const normalized = team.trim();
  return countryAliases[normalized] ?? normalized;
}

function isReasonablePredictedScore(score: number): boolean {
  return Number.isFinite(score) && score >= 0 && score <= MAX_REASONABLE_PREDICTED_GOALS;
}

function shouldIncludePredictionInErrorAverages(homeScore: number, awayScore: number): boolean {
  return isReasonablePredictedScore(homeScore) && isReasonablePredictedScore(awayScore);
}

export function getPlayerGameHistory(player: PlayerScore, games: Game[]): PlayerGameHistoryItem[] {
  const gameMap = new Map<number, Game>(games.map((g) => [g.id, g]));

  return player.gameBreakdowns
    .map((gb) => {
      const game = gameMap.get(gb.gameId);
      if (!game || game.homeScore === null || game.awayScore === null) return null;

      const error =
        Math.abs(gb.prediction.homeScore - game.homeScore) +
        Math.abs(gb.prediction.awayScore - game.awayScore);

      return {
        gameId: game.id,
        home: game.home,
        away: game.away,
        actualHome: game.homeScore,
        actualAway: game.awayScore,
        predictedHome: gb.prediction.homeScore,
        predictedAway: gb.prediction.awayScore,
        totalPoints: gb.points.total,
        error,
      };
    })
    .filter((item): item is PlayerGameHistoryItem => item !== null)
    .sort((a, b) => a.gameId - b.gameId);
}

export function getPlayerAccuracy(player: PlayerScore, games: Game[]): PlayerAccuracyStats {
  const gameMap = new Map<number, Game>(games.map((g) => [g.id, g]));

  let playedPredictions = 0;
  let winnerCorrectCount = 0;
  let exactCount = 0;
  let totalError = 0;
  let totalHomeError = 0;
  let totalAwayError = 0;
  let errorSampleCount = 0;

  // Per-nation absolute scoring error: home nation tracks home-goal error,
  // away nation tracks away-goal error.
  const teamErrorBuckets = new Map<string, number[]>();

  for (const gb of player.gameBreakdowns) {
    const game = gameMap.get(gb.gameId);
    if (!game || game.homeScore === null || game.awayScore === null) continue;

    playedPredictions += 1;

    const actualWinner = getWinner(game.homeScore, game.awayScore);
    const predictedWinner = getWinner(gb.prediction.homeScore, gb.prediction.awayScore);
    if (actualWinner === predictedWinner) winnerCorrectCount += 1;

    if (gb.prediction.homeScore === game.homeScore && gb.prediction.awayScore === game.awayScore) {
      exactCount += 1;
    }

    const homeError = Math.abs(gb.prediction.homeScore - game.homeScore);
    const awayError = Math.abs(gb.prediction.awayScore - game.awayScore);
    const gameError = homeError + awayError;

    if (!shouldIncludePredictionInErrorAverages(gb.prediction.homeScore, gb.prediction.awayScore)) {
      continue;
    }

    totalError += gameError;
    totalHomeError += homeError;
    totalAwayError += awayError;
    errorSampleCount += 1;

    const homeTeam = canonicalTeamName(game.home);
    const awayTeam = canonicalTeamName(game.away);

    const homeBucket = teamErrorBuckets.get(homeTeam) ?? [];
    homeBucket.push(homeError);
    teamErrorBuckets.set(homeTeam, homeBucket);

    const awayBucket = teamErrorBuckets.get(awayTeam) ?? [];
    awayBucket.push(awayError);
    teamErrorBuckets.set(awayTeam, awayBucket);
  }

  const teamAverages = Array.from(teamErrorBuckets.entries())
    .filter(([, errors]) => errors.length > 0)
    .map(([team, errors]) => ({
      team,
      avg: errors.reduce((sum, val) => sum + val, 0) / errors.length,
    }))
    .sort((a, b) => a.avg - b.avg || a.team.localeCompare(b.team));

  const best = teamAverages[0] ?? null;
  const worst = teamAverages.length > 1 ? teamAverages[teamAverages.length - 1] : null;

  const bestTeam: string | null = best?.team ?? null;
  const bestTeamError: number | null = best?.avg ?? null;
  const worstTeam: string | null = worst?.team ?? null;
  const worstTeamError: number | null = worst?.avg ?? null;

  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    predictionsMade: player.gameBreakdowns.length,
    playedPredictions,
    winnerCorrectCount,
    winnerPct: playedPredictions > 0 ? round((winnerCorrectCount / playedPredictions) * 100) : 0,
    exactCount,
    exactPct: playedPredictions > 0 ? round((exactCount / playedPredictions) * 100) : 0,
    avgError: errorSampleCount > 0 ? round(totalError / errorSampleCount) : 0,
    homeAvgError: errorSampleCount > 0 ? round(totalHomeError / errorSampleCount) : 0,
    awayAvgError: errorSampleCount > 0 ? round(totalAwayError / errorSampleCount) : 0,
    bestTeam,
    bestTeamError: bestTeamError !== null ? round(bestTeamError) : null,
    worstTeam,
    worstTeamError: worstTeamError !== null ? round(worstTeamError) : null,
  };
}

export function getCrossSystemRanks(
  playerName: string,
  games: Game[],
  predictions: Prediction[],
  systems: ScoringSystem[],
): CrossSystemRank[] {
  return systems.map((system) => {
    const standings = system.calculateStandings(games, predictions);
    const rank = standings.findIndex((p) => p.name === playerName) + 1;
    const player = standings.find((p) => p.name === playerName);

    let keyStat = '-';
    if (system.name === 'Ted Classic' && player?.winnerPct != null) keyStat = `${player.winnerPct}% win`;
    else if (system.name === 'Ted+' && player?.perfectCount != null) keyStat = `${player.perfectCount} perfect`;
    else if (system.name === 'Ted28' && player?.perfectCount != null) keyStat = `${player.perfectCount} perfect`;
    else if (system.name === "Gambler's" && player?.bestMultiplier != null) keyStat = `best x${player.bestMultiplier}`;
    else if (system.name === 'Ladder' && player?.peakRating != null) keyStat = `peak ${player.peakRating}`;
    else if (system.name === 'Hot Streak' && player?.longestStreak != null) keyStat = `best ${player.longestStreak}`;
    else if (system.name === 'Participation Trophy' && player?.exactCount != null) keyStat = `${player.exactCount} exact`;
    else if (player?.bestSystem && (system.name === 'Equal Aggregate' || system.name === 'Weighted Aggregate')) {
      keyStat = `${player.bestSystem} best`;
    }

    return {
      systemName: system.name,
      rank: rank > 0 ? rank : standings.length,
      totalPoints: player?.totalPoints ?? 0,
      keyStat,
    };
  });
}
