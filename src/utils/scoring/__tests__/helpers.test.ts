import { describe, it, expect } from 'vitest';
import { getWinner, tedClassicRawScore } from '../helpers';
import type { Game, Prediction } from '../../../types';

describe('getWinner', () => {
  it('returns home when home score is higher', () => {
    expect(getWinner(2, 1)).toBe('home');
  });

  it('returns away when away score is higher', () => {
    expect(getWinner(0, 3)).toBe('away');
  });

  it('returns draw when scores are equal', () => {
    expect(getWinner(1, 1)).toBe('draw');
  });

  it('handles 0-0', () => {
    expect(getWinner(0, 0)).toBe('draw');
  });
});

describe('tedClassicRawScore', () => {
  const game: Game = { id: 1, home: 'A', away: 'B', homeScore: 2, awayScore: 1 };

  it('returns 4 for exact score', () => {
    const pred: Prediction = { name: 'P', gameId: 1, homeScore: 2, awayScore: 1 };
    expect(tedClassicRawScore(game, pred)).toBe(4);
  });

  it('returns 3 for correct winner + correct GD but wrong scores', () => {
    const pred: Prediction = { name: 'P', gameId: 1, homeScore: 3, awayScore: 2 };
    expect(tedClassicRawScore(game, pred)).toBe(3);
  });

  it('returns 2 for correct winner only', () => {
    const pred: Prediction = { name: 'P', gameId: 1, homeScore: 3, awayScore: 0 };
    expect(tedClassicRawScore(game, pred)).toBe(2);
  });

  it('returns 0 for wrong winner', () => {
    const pred: Prediction = { name: 'P', gameId: 1, homeScore: 0, awayScore: 1 };
    expect(tedClassicRawScore(game, pred)).toBe(0);
  });

  it('returns 0 for unplayed game', () => {
    const unplayed: Game = { id: 2, home: 'A', away: 'B', homeScore: null, awayScore: null };
    const pred: Prediction = { name: 'P', gameId: 2, homeScore: 1, awayScore: 0 };
    expect(tedClassicRawScore(unplayed, pred)).toBe(0);
  });
});
