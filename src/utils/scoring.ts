import type { Game, Prediction, PointBreakdown, ScoringSystem, PlayerScore, GameBreakdown } from '../types';

function getWinner(homeScore: number, awayScore: number): 'home' | 'away' | 'draw' {
  if (homeScore > awayScore) return 'home';
  if (awayScore > homeScore) return 'away';
  return 'draw';
}

const tedClassic: ScoringSystem = {
  name: 'Ted Classic',
  description: '+2 correct winner, +1 correct goal difference, +1 exact score',
  calculate(game: Game, prediction: Prediction): PointBreakdown {
    if (game.homeScore === null || game.awayScore === null) {
      return { winner: 0, goalDifference: 0, exactScore: 0, total: 0 };
    }

    let winner = 0;
    let goalDifference = 0;
    let exactScore = 0;

    const actualWinner = getWinner(game.homeScore, game.awayScore);
    const predictedWinner = getWinner(prediction.homeScore, prediction.awayScore);

    if (actualWinner === predictedWinner) {
      winner = 2;
    }

    const actualDiff = game.homeScore - game.awayScore;
    const predictedDiff = prediction.homeScore - prediction.awayScore;

    if (actualDiff === predictedDiff) {
      goalDifference = 1;
    }

    if (game.homeScore === prediction.homeScore && game.awayScore === prediction.awayScore) {
      exactScore = 1;
    }

    return {
      winner,
      goalDifference,
      exactScore,
      total: winner + goalDifference + exactScore,
    };
  },
};

export const scoringSystems: ScoringSystem[] = [tedClassic];

export function calculateStandings(
  games: Game[],
  predictions: Prediction[],
  system: ScoringSystem
): PlayerScore[] {
  const playerMap = new Map<string, GameBreakdown[]>();

  // Group predictions by player
  for (const prediction of predictions) {
    if (!playerMap.has(prediction.name)) {
      playerMap.set(prediction.name, []);
    }
  }

  // Games are sequential by ID — process in order
  const sortedGames = [...games].sort((a, b) => a.id - b.id);

  for (const game of sortedGames) {
    const gamePredictions = predictions.filter((p) => p.gameId === game.id);

    for (const prediction of gamePredictions) {
      const points = system.calculate(game, prediction);
      const breakdowns = playerMap.get(prediction.name)!;
      breakdowns.push({ gameId: game.id, prediction, points });
    }
  }

  const standings: PlayerScore[] = [];

  for (const [name, gameBreakdowns] of playerMap) {
    const totalPoints = gameBreakdowns.reduce((sum, gb) => sum + gb.points.total, 0);
    standings.push({ name, totalPoints, gameBreakdowns });
  }

  // Sort by total points descending, then alphabetically
  standings.sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));

  return standings;
}
