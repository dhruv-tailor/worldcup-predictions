import { describe, it, expect } from 'vitest';
import type { Game, Prediction } from '../../../types';
import gamblers from '../gamblers';

const pred = (name: string, gameId: number, h: number, a: number): Prediction => ({
  name, gameId, homeScore: h, awayScore: a,
});

describe("Gambler's", () => {
  const game: Game = { id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 };

  it('awards higher bonus for unique predictions', () => {
    // 3 players, only Alice predicted home win correctly, others predicted away
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 0),   // home win — correct, unique
      pred('Bob', 1, 0, 1),     // away win — wrong
      pred('Charlie', 1, 0, 2), // away win — wrong
    ];
    const standings = gamblers.calculateStandings([game], predictions);

    const alice = standings.find((s) => s.name === 'Alice')!;
    // base=1, multiplier=3/1=3, boosted=3, bonus=2
    expect(alice.gameBreakdowns[0].points.categories.base).toBe(1);
    expect(alice.gameBreakdowns[0].points.categories.uniqueBonus).toBe(2);
    expect(alice.totalPoints).toBe(3);
  });

  it('awards smaller bonus when many agree', () => {
    // 3 players all predict home win correctly
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1),
      pred('Bob', 1, 3, 0),
      pred('Charlie', 1, 1, 0),
    ];
    const standings = gamblers.calculateStandings([game], predictions);

    // multiplier = 3/3 = 1, no bonus
    for (const s of standings) {
      expect(s.gameBreakdowns[0].points.categories.uniqueBonus).toBe(0);
    }
  });

  it('awards bonus for exact score match', () => {
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1), // exact
      pred('Bob', 1, 0, 1),   // wrong
    ];
    const standings = gamblers.calculateStandings([game], predictions);

    const alice = standings.find((s) => s.name === 'Alice')!;
    // base=3 (1+2 exact), multiplier=2/1=2, boosted=6, bonus=3
    expect(alice.gameBreakdowns[0].points.categories.base).toBe(3);
    expect(alice.totalPoints).toBe(6);
  });

  it('gives 0 for wrong winner', () => {
    const predictions: Prediction[] = [pred('Alice', 1, 0, 3)];
    const standings = gamblers.calculateStandings([game], predictions);

    expect(standings[0].totalPoints).toBe(0);
  });

  it('uses total player count (not just those who predicted this game) for multiplier', () => {
    const games: Game[] = [
      { id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 },
      { id: 2, home: 'C', away: 'D', homeScore: 1, awayScore: 0 },
    ];
    // Alice and Bob predict game 1, Charlie only predicts game 2
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 0),   // correct home win
      pred('Bob', 1, 0, 1),     // wrong
      pred('Charlie', 2, 1, 0), // only game 2
    ];
    const standings = gamblers.calculateStandings(games, predictions);

    const alice = standings.find((s) => s.name === 'Alice')!;
    const g1 = alice.gameBreakdowns.find((b) => b.gameId === 1)!;
    // totalPlayers = 3 (all players), sameOutcome = 1 (only Alice), multiplier = 3/1 = 3
    expect(g1.points.categories.base).toBe(1);
    expect(g1.points.categories.uniqueBonus).toBe(2);
    expect(g1.points.total).toBe(3);
  });

  it('handles unplayed game', () => {
    const unplayed: Game = { id: 1, home: 'A', away: 'B', homeScore: null, awayScore: null };
    const predictions: Prediction[] = [pred('Alice', 1, 2, 1)];
    const standings = gamblers.calculateStandings([unplayed], predictions);

    expect(standings[0].totalPoints).toBe(0);
  });

  it('handles player with no prediction for a game', () => {
    const games: Game[] = [
      { id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 },
    ];
    const predictions: Prediction[] = [
      pred('Alice', 1, 2, 1),
      // Bob has a prediction for a different game so he exists as a player
      pred('Bob', 99, 1, 0), // dummy to register Bob
    ];
    // Need game 99 to exist
    games.push({ id: 99, home: 'X', away: 'Y', homeScore: 1, awayScore: 0 });
    const standings = gamblers.calculateStandings(games, predictions);

    const bob = standings.find((s) => s.name === 'Bob')!;
    // Bob has no prediction for game 1 → no breakdown for game 1
    const g1 = bob.gameBreakdowns.find((b) => b.gameId === 1);
    expect(g1).toBeUndefined();
  });
});
