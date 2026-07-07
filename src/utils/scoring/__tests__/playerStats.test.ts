import { describe, expect, it } from 'vitest';
import type { Game, PlayerScore, Prediction } from '../../../types';
import { getPlayerAccuracy } from '../../playerStats';

function makeBreakdown(prediction: Prediction) {
  return {
    gameId: prediction.gameId,
    prediction,
    points: { categories: {}, total: 0 },
  };
}

describe('getPlayerAccuracy team face/heel derivation', () => {
  it('uses per-team score error (not combined game error) for best/worst team', () => {
    const games: Game[] = [
      { id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 0 },
      { id: 2, home: 'A', away: 'C', homeScore: 3, awayScore: 1 },
      { id: 3, home: 'B', away: 'C', homeScore: 1, awayScore: 2 },
    ];

    const predictions: Prediction[] = [
      { name: 'P1', gameId: 1, homeScore: 2, awayScore: 3 }, // A err 0, B err 3
      { name: 'P1', gameId: 2, homeScore: 2, awayScore: 1 }, // A err 1, C err 0
      { name: 'P1', gameId: 3, homeScore: 0, awayScore: 0 }, // B err 1, C err 2
    ];

    const player: PlayerScore = {
      name: 'P1',
      totalPoints: 0,
      gameBreakdowns: predictions.map(makeBreakdown),
    };

    const accuracy = getPlayerAccuracy(player, games);

    // Team averages:
    // A: (0 + 1) / 2 = 0.5
    // B: (3 + 1) / 2 = 2.0
    // C: (0 + 2) / 2 = 1.0
    expect(accuracy.bestTeam).toBe('A');
    expect(accuracy.worstTeam).toBe('B');
    expect(accuracy.bestTeamError).toBe(0.5);
    expect(accuracy.worstTeamError).toBe(2);
  });

  it('does not assign the same team to both best and worst when only one team exists', () => {
    const games: Game[] = [
      { id: 1, home: 'A', away: 'A', homeScore: 1, awayScore: 0 },
    ];

    const prediction: Prediction = { name: 'P1', gameId: 1, homeScore: 3, awayScore: 0 };

    const player: PlayerScore = {
      name: 'P1',
      totalPoints: 0,
      gameBreakdowns: [makeBreakdown(prediction)],
    };

    const accuracy = getPlayerAccuracy(player, games);

    expect(accuracy.bestTeam).toBe('A');
    expect(accuracy.worstTeam).toBeNull();
  });

  it('treats Equador and Ecuador as the same nation bucket', () => {
    const games: Game[] = [
      { id: 1, home: 'Equador', away: 'Germany', homeScore: 1, awayScore: 0 },
      { id: 2, home: 'Mexico', away: 'Ecuador', homeScore: 2, awayScore: 1 },
    ];

    const predictions: Prediction[] = [
      { name: 'P1', gameId: 1, homeScore: 1, awayScore: 3 }, // Ecuador err 0, Germany err 3
      { name: 'P1', gameId: 2, homeScore: 2, awayScore: 1 }, // Ecuador err 0, Mexico err 0
    ];

    const player: PlayerScore = {
      name: 'P1',
      totalPoints: 0,
      gameBreakdowns: predictions.map(makeBreakdown),
    };

    const accuracy = getPlayerAccuracy(player, games);

    // Ecuador bucket should combine Equador + Ecuador rows and remain best.
    expect(accuracy.bestTeam).toBe('Ecuador');
    expect(accuracy.bestTeamError).toBe(0);
    expect(accuracy.worstTeam).toBe('Germany');
  });
});
