import { describe, it, expect } from 'vitest';
import type { Game, Prediction } from '../../../types';
import ted28 from '../ted28';

const pred = (name: string, gameId: number, h: number, a: number, homeWin?: 'W' | 'L' | null): Prediction => ({
  name, gameId, homeScore: h, awayScore: a, homeWin,
});

describe('Ted28', () => {
  it('awards max 7 for an exact result', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 }];
    const predictions: Prediction[] = [pred('Alice', 1, 2, 1)];

    const standings = ted28.calculateStandings(games, predictions);
    expect(standings[0].totalPoints).toBe(7);
    expect(standings[0].gameBreakdowns[0].points.categories).toEqual({
      tendency: 1,
      homeGoals: 2,
      awayGoals: 2,
      goalDifference: 1,
      exactResult: 1,
    });
  });

  it('awards closeness points even when tendency is wrong', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 0 }];
    const predictions: Prediction[] = [pred('Alice', 1, 1, 1)];

    const standings = ted28.calculateStandings(games, predictions);
    const categories = standings[0].gameBreakdowns[0].points.categories;
    expect(categories.tendency).toBe(0);
    expect(categories.homeGoals).toBe(1);
    expect(categories.awayGoals).toBe(1);
    expect(standings[0].totalPoints).toBe(2);
  });

  it('awards one-side exact and one-side within-one correctly', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 3, awayScore: 1 }];
    const predictions: Prediction[] = [pred('Alice', 1, 3, 2)];

    const standings = ted28.calculateStandings(games, predictions);
    const categories = standings[0].gameBreakdowns[0].points.categories;
    expect(categories.homeGoals).toBe(2);
    expect(categories.awayGoals).toBe(1);
    expect(categories.goalDifference).toBe(0);
    expect(categories.exactResult).toBe(0);
    expect(standings[0].totalPoints).toBe(4); // tendency + 2 + 1
  });

  it('requires shootout winner for exact result on draw scoreline', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 1, awayScore: 1, homeWin: 'W' }];
    const predictions: Prediction[] = [pred('Alice', 1, 1, 1, 'L')];

    const standings = ted28.calculateStandings(games, predictions);
    const categories = standings[0].gameBreakdowns[0].points.categories;
    expect(categories.tendency).toBe(0);
    expect(categories.exactResult).toBe(0);
    expect(standings[0].totalPoints).toBe(5); // home exact 2 + away exact 2 + GD 1
  });

  it('tracks exactCount and perfectCount', () => {
    const games: Game[] = [
      { id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 },
      { id: 2, home: 'C', away: 'D', homeScore: 1, awayScore: 0 },
    ];
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1),
      pred('Alice', 2, 1, 1),
    ];

    const standings = ted28.calculateStandings(games, predictions);
    expect(standings[0].exactCount).toBe(1);
    expect(standings[0].perfectCount).toBe(1);
  });
});