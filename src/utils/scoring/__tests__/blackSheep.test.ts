import { describe, it, expect } from 'vitest';
import type { Game, Prediction } from '../../../types';
import blackSheep from '../blackSheep';

const pred = (name: string, gameId: number, h: number, a: number): Prediction => ({
  name, gameId, homeScore: h, awayScore: a,
});

describe('Black Sheep', () => {
  it('awards points when player beats the crowd average', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 }];
    // Crowd avg: home=(2+0)/2=1, away=(1+3)/2=2
    // Crowd error: |1-2|+|2-1|=2
    // Alice error: |2-2|+|1-1|=0, edge=2, points=round(2*2)=4
    // Bob error: |0-2|+|3-1|=4, edge=2-4=-2, points=0
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1), // exact
      pred('Bob', 1, 0, 3),   // way off
    ];
    const standings = blackSheep.calculateStandings(games, predictions);

    const alice = standings.find((s) => s.name === 'Alice')!;
    const bob = standings.find((s) => s.name === 'Bob')!;

    expect(alice.gameBreakdowns[0].points.categories.edge).toBe(4);
    expect(alice.gameBreakdowns[0].points.categories.bonus).toBe(1); // exact
    expect(alice.totalPoints).toBe(5);
    expect(bob.totalPoints).toBe(-4); // edge=-2, points=round(-4)=-4
  });

  it('awards exact score bonus even when not beating crowd', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 1, awayScore: 0 }];
    // Only one player: crowd = their prediction, crowdError = playerError, edge = 0
    const predictions: Prediction[] = [pred('Alice', 1, 1, 0)];
    const standings = blackSheep.calculateStandings(games, predictions);

    // Edge = 0 → 0 edge points, but exact → +1 bonus
    expect(standings[0].gameBreakdowns[0].points.categories.edge).toBe(0);
    expect(standings[0].gameBreakdowns[0].points.categories.bonus).toBe(1);
    expect(standings[0].totalPoints).toBe(1);
  });

  it('penalizes when crowd is closer than player', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 1, awayScore: 1 }];
    // 3 players: crowd avg home=(1+1+5)/3=2.33, away=(1+0+0)/3=0.33
    // Crowd error: |2.33-1|+|0.33-1| = 1.33 + 0.67 = 2.0
    // Charlie error: |5-1|+|0-1| = 5, edge = 2-5 = -3, points = round(-6) = -6
    const predictions: Prediction[] = [
      pred('Alice', 1, 1, 1),
      pred('Bob', 1, 1, 0),
      pred('Charlie', 1, 5, 0),
    ];
    const standings = blackSheep.calculateStandings(games, predictions);

    const charlie = standings.find((s) => s.name === 'Charlie')!;
    expect(charlie.gameBreakdowns[0].points.categories.edge).toBe(-6);
    expect(charlie.totalPoints).toBe(-6);
  });

  it('handles unplayed games (0 points)', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: null, awayScore: null }];
    const predictions: Prediction[] = [pred('Alice', 1, 2, 1)];
    const standings = blackSheep.calculateStandings(games, predictions);

    expect(standings[0].totalPoints).toBe(0);
  });

  it('handles missing prediction for a game', () => {
    const games: Game[] = [
      { id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 },
      { id: 2, home: 'C', away: 'D', homeScore: 1, awayScore: 0 },
    ];
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1),
      pred('Alice', 2, 1, 0),
      pred('Bob', 1, 2, 1), // Bob has no prediction for game 2
    ];
    const standings = blackSheep.calculateStandings(games, predictions);

    const bob = standings.find((s) => s.name === 'Bob')!;
    expect(bob.gameBreakdowns).toHaveLength(1);
    expect(bob.gameBreakdowns[0].gameId).toBe(1);
  });

  it('handles late joiner', () => {
    const games: Game[] = [
      { id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 },
      { id: 2, home: 'C', away: 'D', homeScore: 1, awayScore: 0 },
    ];
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1),
      pred('Alice', 2, 1, 0),
      pred('Charlie', 2, 1, 0), // joined late
    ];
    const standings = blackSheep.calculateStandings(games, predictions);

    const charlie = standings.find((s) => s.name === 'Charlie')!;
    expect(charlie.gameBreakdowns).toHaveLength(1);
    expect(charlie.gameBreakdowns[0].gameId).toBe(2);
  });

  it('computes crowdBeatPct and avgEdge stats', () => {
    const games: Game[] = [
      { id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 },
      { id: 2, home: 'C', away: 'D', homeScore: 0, awayScore: 0 },
    ];
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1), // exact → beats crowd
      pred('Bob', 1, 0, 3),   // way off → loses to crowd
      pred('Alice', 2, 0, 0), // exact → beats crowd
      pred('Bob', 2, 0, 0),   // exact → ties crowd (edge = 0)
    ];
    const standings = blackSheep.calculateStandings(games, predictions);

    const alice = standings.find((s) => s.name === 'Alice')!;
    // Alice beat crowd both games
    expect(alice.crowdBeatPct).toBeGreaterThan(0);
    expect(alice.avgEdge).toBeGreaterThan(0);
  });

  it('sorts by total points descending', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 }];
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1),
      pred('Bob', 1, 0, 3),
    ];
    const standings = blackSheep.calculateStandings(games, predictions);

    expect(standings[0].name).toBe('Alice');
  });
});
