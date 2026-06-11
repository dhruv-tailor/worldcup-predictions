import { describe, it, expect } from 'vitest';
import type { Game, Prediction } from '../../../types';
import hotStreak from '../hotStreak';

const pred = (name: string, gameId: number, h: number, a: number): Prediction => ({
  name, gameId, homeScore: h, awayScore: a,
});

describe('Hot Streak', () => {
  it('awards base Ted Classic score with no streak on first game', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 }];
    const predictions: Prediction[] = [pred('Alice', 1, 2, 1)];
    const standings = hotStreak.calculateStandings(games, predictions);

    expect(standings[0].gameBreakdowns[0].points.categories.base).toBe(4);
    expect(standings[0].gameBreakdowns[0].points.categories.streakBonus).toBe(0);
    expect(standings[0].totalPoints).toBe(4);
  });

  it('awards escalating streak bonus for consecutive correct winners', () => {
    const games: Game[] = [
      { id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 },
      { id: 2, home: 'C', away: 'D', homeScore: 3, awayScore: 0 },
      { id: 3, home: 'E', away: 'F', homeScore: 0, awayScore: 1 },
    ];
    const predictions: Prediction[] = [
      pred('Alice', 1, 1, 0), // correct winner (home) → streak=1, bonus=0
      pred('Alice', 2, 1, 0), // correct winner (home) → streak=2, bonus=+1
      pred('Alice', 3, 0, 2), // correct winner (away) → streak=3, bonus=+2
    ];
    const standings = hotStreak.calculateStandings(games, predictions);

    const breakdowns = standings[0].gameBreakdowns;
    expect(breakdowns[0].points.categories.streakBonus).toBe(0);
    expect(breakdowns[1].points.categories.streakBonus).toBe(1);
    expect(breakdowns[2].points.categories.streakBonus).toBe(2);
  });

  it('resets streak on wrong winner', () => {
    const games: Game[] = [
      { id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 },
      { id: 2, home: 'C', away: 'D', homeScore: 3, awayScore: 0 },
      { id: 3, home: 'E', away: 'F', homeScore: 0, awayScore: 1 },
    ];
    const predictions: Prediction[] = [
      pred('Alice', 1, 1, 0), // correct → streak=1
      pred('Alice', 2, 0, 1), // WRONG winner → streak resets
      pred('Alice', 3, 0, 2), // correct → streak=1 again, bonus=0
    ];
    const standings = hotStreak.calculateStandings(games, predictions);

    const breakdowns = standings[0].gameBreakdowns;
    expect(breakdowns[0].points.categories.streakBonus).toBe(0);
    expect(breakdowns[1].points.categories.streakBonus).toBe(0);
    expect(breakdowns[2].points.categories.streakBonus).toBe(0); // streak reset
  });

  it('resets streak when player misses a prediction', () => {
    const games: Game[] = [
      { id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 },
      { id: 2, home: 'C', away: 'D', homeScore: 3, awayScore: 0 },
      { id: 3, home: 'E', away: 'F', homeScore: 0, awayScore: 1 },
    ];
    const predictions: Prediction[] = [
      pred('Alice', 1, 1, 0), // correct → streak=1
      // Alice has NO prediction for game 2 → streak should reset
      pred('Alice', 3, 0, 2), // correct → streak=1 (reset), bonus=0
    ];
    const standings = hotStreak.calculateStandings(games, predictions);

    const breakdowns = standings[0].gameBreakdowns;
    expect(breakdowns).toHaveLength(2); // only games 1 and 3
    // Game 3 bonus should be 0 (streak was reset by missing game 2)
    expect(breakdowns[1].points.categories.streakBonus).toBe(0);
  });

  it('handles late joiner — no streak carryover from before they joined', () => {
    const games: Game[] = [
      { id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 },
      { id: 2, home: 'C', away: 'D', homeScore: 3, awayScore: 0 },
      { id: 3, home: 'E', away: 'F', homeScore: 0, awayScore: 1 },
    ];
    const predictions: Prediction[] = [
      pred('Alice', 1, 1, 0),
      pred('Alice', 2, 1, 0),
      pred('Alice', 3, 0, 1),
      // Charlie joins at game 2
      pred('Charlie', 2, 1, 0), // correct → streak=1 (but missed game 1 → reset)
      pred('Charlie', 3, 0, 1), // correct → bonus depends on streak
    ];
    const standings = hotStreak.calculateStandings(games, predictions);

    const charlie = standings.find((s) => s.name === 'Charlie')!;
    // Game 1: missed → streak reset to 0
    // Game 2: correct → streak becomes 1, bonus = 0
    // Game 3: correct → streak becomes 2, bonus = 1
    // But wait — Charlie missed game 1, which resets streak
    // Then game 2 correct → streak=1, bonus=0
    // Game 3 correct → streak=2, bonus=1
    expect(charlie.gameBreakdowns).toHaveLength(2);
    expect(charlie.gameBreakdowns[0].points.categories.streakBonus).toBe(0);
    expect(charlie.gameBreakdowns[1].points.categories.streakBonus).toBe(1);
  });

  it('handles unplayed games', () => {
    const games: Game[] = [{ id: 1, home: 'A', away: 'B', homeScore: null, awayScore: null }];
    const predictions: Prediction[] = [pred('Alice', 1, 2, 1)];
    const standings = hotStreak.calculateStandings(games, predictions);

    expect(standings[0].totalPoints).toBe(0);
    expect(standings[0].gameBreakdowns[0].points.categories.streakBonus).toBe(0);
  });
});
