import { describe, it, expect } from 'vitest';
import type { Game, Prediction } from '../../../types';
import ladder from '../ladder';

const pred = (name: string, gameId: number, h: number, a: number): Prediction => ({
  name, gameId, homeScore: h, awayScore: a,
});

describe('Ladder (ELO)', () => {
  it('starts all players at 1000 ELO', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: null, awayScore: null }];
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1),
      pred('Bob', 1, 1, 0),
    ];
    const standings = ladder.calculateStandings(games, predictions);

    // Unplayed game → no ELO change → everyone stays at 1000
    for (const s of standings) {
      expect(s.totalPoints).toBe(1000);
    }
  });

  it('better prediction gains ELO, worse loses ELO', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 }];
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1), // exact → raw 4
      pred('Bob', 1, 0, 3),   // wrong winner → raw 0
    ];
    const standings = ladder.calculateStandings(games, predictions);

    const alice = standings.find((s) => s.name === 'Alice')!;
    const bob = standings.find((s) => s.name === 'Bob')!;

    expect(alice.totalPoints).toBeGreaterThan(1000);
    expect(bob.totalPoints).toBeLessThan(1000);
    // ELO is zero-sum: Alice's gain = Bob's loss
    expect(alice.totalPoints + bob.totalPoints).toBe(2000);
  });

  it('equal predictions result in negligible ELO change', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 }];
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1),
      pred('Bob', 1, 2, 1),
    ];
    const standings = ladder.calculateStandings(games, predictions);

    // Both predicted the same → draw → equal ELO → delta ≈ 0
    for (const s of standings) {
      expect(s.totalPoints).toBe(1000);
    }
  });

  it('handles player missing a prediction — ELO frozen', () => {
    const games: Game[] = [
      { id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 },
      { id: 2, home: 'C', away: 'D', homeScore: 1, awayScore: 0 },
    ];
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1),
      pred('Alice', 2, 1, 0),
      pred('Bob', 1, 2, 1),
      // Bob has no prediction for game 2
    ];
    const standings = ladder.calculateStandings(games, predictions);

    const alice = standings.find((s) => s.name === 'Alice')!;
    const bob = standings.find((s) => s.name === 'Bob')!;

    // Game 1: Both predict exact → draw → ELO stays 1000
    // Game 2: Only Alice predicts → Bob doesn't participate → Bob stays 1000
    // Alice has no opponents in game 2 → her ELO also doesn't change
    expect(bob.totalPoints).toBe(1000);
    expect(bob.gameBreakdowns).toHaveLength(1); // only game 1
  });

  it('handles late joiner', () => {
    const games: Game[] = [
      { id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 },
      { id: 2, home: 'C', away: 'D', homeScore: 1, awayScore: 0 },
    ];
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1),
      pred('Alice', 2, 1, 0),
      pred('Charlie', 2, 1, 0), // late joiner
    ];
    const standings = ladder.calculateStandings(games, predictions);

    const charlie = standings.find((s) => s.name === 'Charlie')!;
    expect(charlie.totalPoints).toBe(1000); // both tied exact → no change
    expect(charlie.gameBreakdowns).toHaveLength(1);
    expect(charlie.gameBreakdowns[0].gameId).toBe(2);
  });

  it('ELO carries across games', () => {
    const games: Game[] = [
      { id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 },
      { id: 2, home: 'C', away: 'D', homeScore: 0, awayScore: 0 },
    ];
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1), // exact → raw 4
      pred('Bob', 1, 0, 3),   // wrong → raw 0
      pred('Alice', 2, 0, 0), // exact → raw 4
      pred('Bob', 2, 0, 0),   // exact → raw 4
    ];
    const standings = ladder.calculateStandings(games, predictions);

    const alice = standings.find((s) => s.name === 'Alice')!;
    const bob = standings.find((s) => s.name === 'Bob')!;

    // After game 1, Alice gained and Bob lost
    // Game 2: tied → expected advantage for Alice (higher rated), tiny adjustment
    // Still zero-sum
    expect(alice.totalPoints + bob.totalPoints).toBe(2000);
    expect(alice.totalPoints).toBeGreaterThan(1000);
  });
});
