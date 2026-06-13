import { describe, it, expect } from 'vitest';
import type { Game, Prediction } from '../../../types';
import blackSheep from '../blackSheep';

const pred = (name: string, gameId: number, h: number, a: number): Prediction => ({
  name, gameId, homeScore: h, awayScore: a,
});

describe('Black Sheep', () => {
  it('awards points when player beats the crowd mode', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 }];
    // No duplicate predictions → each is equally "the mode"; tie broken by smallest error
    // Alice(2,1) error=0, Bob(0,3) error=4 → mode=(2,1), crowdError=0
    // Alice matches mode → edge=0, +1 bonus (exact) = 1
    // Bob error=4, edge=0-4=-4, points=round(-8)=-8
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1), // exact
      pred('Bob', 1, 0, 3),   // way off
    ];
    const standings = blackSheep.calculateStandings(games, predictions);

    const alice = standings.find((s) => s.name === 'Alice')!;
    const bob = standings.find((s) => s.name === 'Bob')!;

    expect(alice.gameBreakdowns[0].points.categories.edge).toBe(0);
    expect(alice.gameBreakdowns[0].points.categories.bonus).toBe(1); // exact
    expect(alice.totalPoints).toBe(1);
    expect(bob.totalPoints).toBe(-8);
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

  it('gives 0 to crowd followers who predicted the mode', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 1, awayScore: 1 }];
    // Mode = (1,0) with count=2, error=|1-1|+|0-1|=1
    // Alice predicted (1,1) — not the mode, error=0, edge=1-0=1, pts=round(2)=2
    // Bob predicted (1,0) — IS the mode, edge=0, pts=0
    // Charlie predicted (5,0) — not mode, error=5, edge=1-5=-4, pts=round(-8)=-8
    const predictions: Prediction[] = [
      pred('Alice', 1, 1, 1),
      pred('Bob', 1, 1, 0),
      pred('Charlie', 1, 1, 0),
    ];
    const standings = blackSheep.calculateStandings(games, predictions);

    const alice = standings.find((s) => s.name === 'Alice')!;
    const bob = standings.find((s) => s.name === 'Bob')!;
    const charlie = standings.find((s) => s.name === 'Charlie')!;
    expect(alice.gameBreakdowns[0].points.categories.edge).toBe(2);
    expect(alice.totalPoints).toBe(3); // 2 edge + 1 exact bonus
    expect(bob.gameBreakdowns[0].points.categories.edge).toBe(0);
    expect(bob.totalPoints).toBe(0);
    expect(charlie.gameBreakdowns[0].points.categories.edge).toBe(0);
    expect(charlie.totalPoints).toBe(0);
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

  it('penalizes deviators who do worse than the mode', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 1, awayScore: 1 }];
    // Mode = (1,1) count=2, error=0
    // Charlie predicted (5,0), error=5, edge=0-5=-5, pts=round(-10)=-10
    const predictions: Prediction[] = [
      pred('Alice', 1, 1, 1),
      pred('Bob', 1, 1, 1),
      pred('Charlie', 1, 5, 0),
    ];
    const standings = blackSheep.calculateStandings(games, predictions);

    const charlie = standings.find((s) => s.name === 'Charlie')!;
    expect(charlie.gameBreakdowns[0].points.categories.edge).toBe(-10);
    expect(charlie.totalPoints).toBe(-10);
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
