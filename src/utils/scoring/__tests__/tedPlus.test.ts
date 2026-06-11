import { describe, it, expect } from 'vitest';
import type { Game, Prediction } from '../../../types';
import tedPlus from '../tedPlus';

const pred = (name: string, gameId: number, h: number, a: number): Prediction => ({
  name, gameId, homeScore: h, awayScore: a,
});

describe('Ted+', () => {
  it('awards max 7 for exact draw prediction', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 1, awayScore: 1 }];
    const predictions: Prediction[] = [pred('Alice', 1, 1, 1)];
    const standings = tedPlus.calculateStandings(games, predictions);

    // draw winner +3, GD +1, total goals +1, exact +2 = 7
    expect(standings[0].totalPoints).toBe(7);
    expect(standings[0].gameBreakdowns[0].points.categories).toEqual({
      winner: 3, goalDifference: 1, totalGoals: 1, exactScore: 2,
    });
  });

  it('awards +3 for correct draw even if not exact', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 2 }];
    const predictions: Prediction[] = [pred('Alice', 1, 0, 0)];
    const standings = tedPlus.calculateStandings(games, predictions);

    // correct draw +3, GD match +1, total goals mismatch, not exact
    expect(standings[0].gameBreakdowns[0].points.categories.winner).toBe(3);
    expect(standings[0].totalPoints).toBe(4); // 3 + 1 + 0 + 0
  });

  it('awards +2 for correct home/away winner', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 3, awayScore: 1 }];
    const predictions: Prediction[] = [pred('Alice', 1, 1, 0)];
    const standings = tedPlus.calculateStandings(games, predictions);

    // correct home win +2, GD mismatch, total goals mismatch, not exact
    expect(standings[0].gameBreakdowns[0].points.categories.winner).toBe(2);
    expect(standings[0].totalPoints).toBe(2);
  });

  it('awards total goals point when sum matches', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 3, awayScore: 1 }];
    const predictions: Prediction[] = [pred('Alice', 1, 2, 2)]; // sum=4 matches, wrong winner
    const standings = tedPlus.calculateStandings(games, predictions);

    expect(standings[0].gameBreakdowns[0].points.categories.totalGoals).toBe(1);
    expect(standings[0].gameBreakdowns[0].points.categories.winner).toBe(0);
  });

  it('handles missing prediction for a game', () => {
    const games: Game[] = [
      { id: 1, home: 'A', away: 'B', homeScore: 1, awayScore: 0 },
      { id: 2, home: 'C', away: 'D', homeScore: 2, awayScore: 2 },
    ];
    const predictions: Prediction[] = [
      pred('Alice', 1, 1, 0),
      pred('Alice', 2, 2, 2),
      pred('Bob', 1, 1, 0), // Bob has no prediction for game 2
    ];
    const standings = tedPlus.calculateStandings(games, predictions);

    const bob = standings.find((s) => s.name === 'Bob')!;
    expect(bob.gameBreakdowns).toHaveLength(1);
  });
});
