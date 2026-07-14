import { describe, expect, it } from 'vitest';
import type { FinalWinnerPrediction, Game, PlayerScore } from '../../../types';
import { applyFinalWinnerBonus, resolveChampionNation } from '../../finalWinnerBonus';

const makeScore = (name: string, totalPoints: number): PlayerScore => ({
  name,
  totalPoints,
  gameBreakdowns: [],
});

describe('resolveChampionNation', () => {
  it('uses winner of highest game id as champion', () => {
    const games: Game[] = [
      { id: 98, home: 'Spain', away: 'Belgium', homeScore: 2, awayScore: 1 },
      { id: 99, home: 'Norway', away: 'England', homeScore: 1, awayScore: 3 },
    ];

    expect(resolveChampionNation(games)).toBe('England');
  });

  it('handles penalty shootout winner for a drawn scoreline', () => {
    const games: Game[] = [
      { id: 99, home: 'Norway', away: 'England', homeScore: 1, awayScore: 1, homeWin: 'L' },
    ];

    expect(resolveChampionNation(games)).toBe('England');
  });

  it('returns null when final game is unplayed', () => {
    const games: Game[] = [
      { id: 99, home: 'Norway', away: 'England', homeScore: null, awayScore: null },
    ];

    expect(resolveChampionNation(games)).toBeNull();
  });
});

describe('applyFinalWinnerBonus', () => {
  it('splits 20% spread pool equally among correct predictors', () => {
    const standings = [
      makeScore('Alice', 100),
      makeScore('Bob', 90),
      makeScore('Cara', 80),
    ];
    const picks: FinalWinnerPrediction[] = [
      { name: 'Alice', nation: 'France' },
      { name: 'Bob', nation: 'France' },
      { name: 'Cara', nation: 'Spain' },
    ];

    const boosted = applyFinalWinnerBonus(standings, picks, 'France');
    const alice = boosted.find((p) => p.name === 'Alice');
    const bob = boosted.find((p) => p.name === 'Bob');
    const cara = boosted.find((p) => p.name === 'Cara');

    // spread = 20, pool = 4.00, each correct = 2.00
    expect(alice?.finalWinnerBonus).toBe(2);
    expect(bob?.finalWinnerBonus).toBe(2);
    expect(cara?.finalWinnerBonus).toBe(0);

    expect(alice?.totalPoints).toBe(102);
    expect(bob?.totalPoints).toBe(92);
    expect(cara?.totalPoints).toBe(80);
  });

  it('awards no bonus when nobody picks champion', () => {
    const standings = [
      makeScore('Alice', 100),
      makeScore('Bob', 90),
    ];
    const picks: FinalWinnerPrediction[] = [
      { name: 'Alice', nation: 'France' },
      { name: 'Bob', nation: 'Spain' },
    ];

    const boosted = applyFinalWinnerBonus(standings, picks, 'Brazil');
    expect(boosted.every((p) => p.finalWinnerBonus === 0)).toBe(true);
    expect(boosted.find((p) => p.name === 'Alice')?.totalPoints).toBe(100);
    expect(boosted.find((p) => p.name === 'Bob')?.totalPoints).toBe(90);
  });

  it('is case-insensitive for names and nations', () => {
    const standings = [
      makeScore('Alice', 100),
    ];
    const picks: FinalWinnerPrediction[] = [
      { name: 'alice', nation: 'france' },
    ];

    const boosted = applyFinalWinnerBonus(standings, picks, 'France');
    expect(boosted[0].pickedChampion).toBe(true);
    expect(boosted[0].finalWinnerBonus).toBe(0);
    expect(boosted[0].totalPoints).toBe(100);
  });
});
