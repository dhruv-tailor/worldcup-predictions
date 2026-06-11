import { describe, it, expect } from 'vitest';
import type { Game, Prediction } from '../../../types';
import participationTrophy from '../participationTrophy';

const pred = (name: string, gameId: number, h: number, a: number): Prediction => ({
  name, gameId, homeScore: h, awayScore: a,
});

describe('Participation Trophy', () => {
  it('awards max 11 for exact score prediction', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 0 }];
    const predictions: Prediction[] = [pred('Alice', 1, 2, 0)];
    const standings = participationTrophy.calculateStandings(games, predictions);

    expect(standings[0].totalPoints).toBe(11);
    expect(standings[0].gameBreakdowns[0].points.categories).toEqual({
      winner: 2, homeGoals: 1, awayGoals: 1, goalDifference: 1, totalGoals: 1, withinOne: 1, exactScore: 4,
    });
  });

  it('awards 0 for completely wrong prediction', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 0, awayScore: 3 }];
    const predictions: Prediction[] = [pred('Alice', 1, 4, 0)];
    const standings = participationTrophy.calculateStandings(games, predictions);

    expect(standings[0].totalPoints).toBe(0);
    expect(standings[0].gameBreakdowns[0].points.categories).toEqual({
      winner: 0, homeGoals: 0, awayGoals: 0, goalDifference: 0, totalGoals: 0, withinOne: 0, exactScore: 0,
    });
  });

  it('awards +2 for correct winner only', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 3, awayScore: 0 }];
    const predictions: Prediction[] = [pred('Alice', 1, 1, 0)];
    const standings = participationTrophy.calculateStandings(games, predictions);

    const cats = standings[0].gameBreakdowns[0].points.categories;
    expect(cats.winner).toBe(2);
    expect(cats.awayGoals).toBe(1);    // away goals both 0
    expect(cats.withinOne).toBe(0);    // home off by 2, not within one
    expect(cats.exactScore).toBe(0);
  });

  it('awards withinOne when both scores within 1', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 }];
    const predictions: Prediction[] = [pred('Alice', 1, 3, 0)];
    const standings = participationTrophy.calculateStandings(games, predictions);

    expect(standings[0].gameBreakdowns[0].points.categories.withinOne).toBe(1);
  });

  it('does not award withinOne when one score is more than 1 off', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 }];
    const predictions: Prediction[] = [pred('Alice', 1, 0, 0)];
    const standings = participationTrophy.calculateStandings(games, predictions);

    expect(standings[0].gameBreakdowns[0].points.categories.withinOne).toBe(0);
  });

  it('awards correct draw prediction', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 1, awayScore: 1 }];
    const predictions: Prediction[] = [pred('Alice', 1, 1, 1)];
    const standings = participationTrophy.calculateStandings(games, predictions);

    expect(standings[0].totalPoints).toBe(11); // all categories
  });

  it('awards partial credit for draw with wrong score', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 2 }];
    const predictions: Prediction[] = [pred('Alice', 1, 0, 0)];
    const standings = participationTrophy.calculateStandings(games, predictions);

    const cats = standings[0].gameBreakdowns[0].points.categories;
    expect(cats.winner).toBe(2);          // correct draw
    expect(cats.goalDifference).toBe(1);  // GD both 0
    expect(cats.homeGoals).toBe(0);
    expect(cats.awayGoals).toBe(0);
    expect(cats.totalGoals).toBe(0);
    expect(cats.withinOne).toBe(0);       // 2 off on both
    expect(cats.exactScore).toBe(0);
  });

  it('awards individual goals when only one matches', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 }];
    const predictions: Prediction[] = [pred('Alice', 1, 2, 3)];
    const standings = participationTrophy.calculateStandings(games, predictions);

    const cats = standings[0].gameBreakdowns[0].points.categories;
    expect(cats.homeGoals).toBe(1);  // home correct
    expect(cats.awayGoals).toBe(0);  // away wrong
  });

  it('tracks exactCount and perfectCount', () => {
    const games: Game[] = [
      { id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 0 },
      { id: 2, home: 'C', away: 'D', homeScore: 1, awayScore: 1 },
    ];
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 0),   // exact — 11 pts
      pred('Alice', 2, 0, 0),   // not exact
    ];
    const standings = participationTrophy.calculateStandings(games, predictions);

    expect(standings[0].exactCount).toBe(1);
    expect(standings[0].perfectCount).toBe(1);
  });

  it('sorts players by total descending', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 0 }];
    const predictions: Prediction[] = [
      pred('Alice', 1, 0, 3),  // everything wrong
      pred('Bob', 1, 2, 0),    // exact = 11
    ];
    const standings = participationTrophy.calculateStandings(games, predictions);

    expect(standings[0].name).toBe('Bob');
    expect(standings[1].name).toBe('Alice');
  });
});
