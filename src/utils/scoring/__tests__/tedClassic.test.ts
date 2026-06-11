import { describe, it, expect } from 'vitest';
import type { Game, Prediction } from '../../../types';
import tedClassic from '../tedClassic';

/** Helper to build a prediction */
const pred = (name: string, gameId: number, h: number, a: number): Prediction => ({
  name, gameId, homeScore: h, awayScore: a,
});

describe('Ted Classic', () => {
  it('awards 4 points for exact score', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 }];
    const predictions: Prediction[] = [pred('Alice', 1, 2, 1)];
    const standings = tedClassic.calculateStandings(games, predictions);

    expect(standings).toHaveLength(1);
    expect(standings[0].totalPoints).toBe(4);
    expect(standings[0].gameBreakdowns[0].points.categories).toEqual({
      winner: 2, goalDifference: 1, exactScore: 1,
    });
  });

  it('awards 0 for wrong winner', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 }];
    const predictions: Prediction[] = [pred('Alice', 1, 0, 3)];
    const standings = tedClassic.calculateStandings(games, predictions);

    expect(standings[0].totalPoints).toBe(0);
  });

  it('awards 2 for correct winner only (wrong GD)', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 }];
    const predictions: Prediction[] = [pred('Alice', 1, 3, 0)];
    const standings = tedClassic.calculateStandings(games, predictions);

    expect(standings[0].totalPoints).toBe(2);
  });

  it('skips unplayed games (0 points)', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: null, awayScore: null }];
    const predictions: Prediction[] = [pred('Alice', 1, 2, 1)];
    const standings = tedClassic.calculateStandings(games, predictions);

    expect(standings[0].totalPoints).toBe(0);
  });

  it('sorts by total points descending, then name ascending', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 }];
    const predictions: Prediction[] = [
      pred('Bob', 1, 0, 1),   // wrong winner → 0
      pred('Alice', 1, 2, 1), // exact → 4
    ];
    const standings = tedClassic.calculateStandings(games, predictions);

    expect(standings[0].name).toBe('Alice');
    expect(standings[1].name).toBe('Bob');
  });

  it('handles missing prediction — player has no prediction for a game', () => {
    const games: Game[] = [
      { id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 },
      { id: 2, home: 'C', away: 'D', homeScore: 1, awayScore: 0 },
    ];
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1), // exact → 4
      pred('Alice', 2, 1, 0), // exact → 4
      pred('Bob', 1, 2, 1),   // exact → 4, no prediction for game 2
    ];
    const standings = tedClassic.calculateStandings(games, predictions);

    const alice = standings.find((s) => s.name === 'Alice')!;
    const bob = standings.find((s) => s.name === 'Bob')!;

    expect(alice.totalPoints).toBe(8);
    expect(alice.gameBreakdowns).toHaveLength(2);
    expect(bob.totalPoints).toBe(4);
    expect(bob.gameBreakdowns).toHaveLength(1); // no breakdown for game 2
  });

  it('handles late joiner — player only has predictions for later games', () => {
    const games: Game[] = [
      { id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 },
      { id: 2, home: 'C', away: 'D', homeScore: 1, awayScore: 0 },
    ];
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1),
      pred('Alice', 2, 1, 0),
      pred('Charlie', 2, 1, 0), // joined late, only game 2
    ];
    const standings = tedClassic.calculateStandings(games, predictions);

    const charlie = standings.find((s) => s.name === 'Charlie')!;
    expect(charlie.totalPoints).toBe(4);
    expect(charlie.gameBreakdowns).toHaveLength(1);
    expect(charlie.gameBreakdowns[0].gameId).toBe(2);
  });
});
