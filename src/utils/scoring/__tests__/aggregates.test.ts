import { describe, it, expect } from 'vitest';
import type { Game, Prediction } from '../../../types';
import equalAggregate from '../equalAggregate';
import weightedAggregate from '../weightedAggregate';

const pred = (name: string, gameId: number, h: number, a: number): Prediction => ({
  name, gameId, homeScore: h, awayScore: a,
});

describe('Equal Aggregate', () => {
  it('produces standings for all players', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 }];
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1),
      pred('Bob', 1, 0, 3),
    ];
    const standings = equalAggregate.calculateStandings(games, predictions);

    expect(standings).toHaveLength(2);
    // Alice should rank higher (better across all systems)
    expect(standings[0].name).toBe('Alice');
  });

  it('creates breakdown entries even for missing predictions', () => {
    const games: Game[] = [
      { id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 },
      { id: 2, home: 'C', away: 'D', homeScore: 1, awayScore: 0 },
    ];
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1),
      pred('Alice', 2, 1, 0),
      pred('Bob', 1, 2, 1), // Bob has no prediction for game 2
    ];
    const standings = equalAggregate.calculateStandings(games, predictions);

    const bob = standings.find((s) => s.name === 'Bob')!;
    // Bob should have breakdowns for BOTH games (game 2 = zero points)
    expect(bob.gameBreakdowns).toHaveLength(2);
    const g2 = bob.gameBreakdowns.find((b) => b.gameId === 2)!;
    expect(g2.points.total).toBe(0);
  });

  it('handles late joiner with zero breakdowns for missed games', () => {
    const games: Game[] = [
      { id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 },
      { id: 2, home: 'C', away: 'D', homeScore: 1, awayScore: 0 },
    ];
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1),
      pred('Alice', 2, 1, 0),
      pred('Charlie', 2, 1, 0), // late joiner
    ];
    const standings = equalAggregate.calculateStandings(games, predictions);

    const charlie = standings.find((s) => s.name === 'Charlie')!;
    // Should have breakdowns for both games (game 1 = 0 points)
    expect(charlie.gameBreakdowns).toHaveLength(2);
    const g1 = charlie.gameBreakdowns.find((b) => b.gameId === 1)!;
    expect(g1.points.total).toBe(0);
  });

  it('normalized scores are in 0-100 range', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 }];
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1),
      pred('Bob', 1, 0, 3),
    ];
    const standings = equalAggregate.calculateStandings(games, predictions);

    for (const s of standings) {
      for (const gb of s.gameBreakdowns) {
        expect(gb.points.total).toBeGreaterThanOrEqual(0);
        expect(gb.points.total).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('Weighted Aggregate', () => {
  it('produces standings for all players', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 }];
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1),
      pred('Bob', 1, 0, 3),
    ];
    const standings = weightedAggregate.calculateStandings(games, predictions);

    expect(standings).toHaveLength(2);
    expect(standings[0].name).toBe('Alice');
  });

  it('creates breakdown entries even for missing predictions', () => {
    const games: Game[] = [
      { id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 },
      { id: 2, home: 'C', away: 'D', homeScore: 1, awayScore: 0 },
    ];
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1),
      pred('Alice', 2, 1, 0),
      pred('Bob', 1, 2, 1), // no prediction for game 2
    ];
    const standings = weightedAggregate.calculateStandings(games, predictions);

    const bob = standings.find((s) => s.name === 'Bob')!;
    expect(bob.gameBreakdowns).toHaveLength(2);
    const g2 = bob.gameBreakdowns.find((b) => b.gameId === 2)!;
    expect(g2.points.total).toBe(0);
  });

  it('weighted scores are in 0-100 range', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 }];
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1),
      pred('Bob', 1, 0, 3),
    ];
    const standings = weightedAggregate.calculateStandings(games, predictions);

    for (const s of standings) {
      for (const gb of s.gameBreakdowns) {
        expect(gb.points.total).toBeGreaterThanOrEqual(0);
        expect(gb.points.total).toBeLessThanOrEqual(100);
      }
    }
  });

  it('handles all players missing prediction for the same game', () => {
    const games: Game[] = [
      { id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 },
      { id: 2, home: 'C', away: 'D', homeScore: 1, awayScore: 0 },
    ];
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1),
      pred('Bob', 1, 0, 3),
      // nobody predicts game 2
    ];
    const standings = weightedAggregate.calculateStandings(games, predictions);

    for (const s of standings) {
      // Both games should have breakdowns
      expect(s.gameBreakdowns).toHaveLength(2);
      const g2 = s.gameBreakdowns.find((b) => b.gameId === 2)!;
      expect(g2.points.total).toBe(0);
    }
  });
});
