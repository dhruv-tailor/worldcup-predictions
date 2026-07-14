import { describe, expect, it } from 'vitest';
import type { Game } from '../../../types';
import { findTimelineKeyMarker, findTimelineStabilityMarker } from '../../timelines';

function buildGames(count: number): Game[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    home: `Home ${index + 1}`,
    away: `Away ${index + 1}`,
    homeScore: 1,
    awayScore: 0,
  }));
}

describe('findTimelineKeyMarker', () => {
  it('finds the earliest point where the top 5 stays fixed', () => {
    const rankings = [
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
      ['A', 'C', 'B', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
      ['A', 'C', 'B', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
      ['A', 'C', 'B', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    ];

    const marker = findTimelineKeyMarker(
      rankings,
      buildGames(rankings.length),
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
      5,
    );

    expect(marker?.gameId).toBe(3);
    expect(marker?.summary).toContain('Top 5');
  });

  it('returns different marker points for top 10 and top 3 when lower places keep moving', () => {
    const rankings = [
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
      ['A', 'B', 'C', 'D', 'E', 'G', 'F', 'H', 'I', 'J'],
      ['A', 'B', 'C', 'D', 'E', 'H', 'G', 'F', 'I', 'J'],
      ['A', 'B', 'C', 'D', 'E', 'H', 'G', 'F', 'I', 'J'],
      ['A', 'B', 'C', 'D', 'E', 'H', 'G', 'F', 'I', 'J'],
    ];

    const games = buildGames(rankings.length);
    const players = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const topTenMarker = findTimelineKeyMarker(rankings, games, players, 10);
    const topThreeMarker = findTimelineKeyMarker(rankings, games, players, 3);

    expect(topTenMarker?.gameId).toBe(3);
    expect(topThreeMarker?.gameId).toBe(2);
  });

  it('returns null when there are too few played games', () => {
    const rankings = [
      ['A', 'B', 'C'],
      ['A', 'C', 'B'],
    ];

    expect(findTimelineKeyMarker(rankings, buildGames(rankings.length), ['A', 'B', 'C'], 3)).toBeNull();
  });

  it('falls back to the final game when the requested top slice never settles early', () => {
    const rankings = [
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
      ['A', 'C', 'B', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
      ['A', 'C', 'B', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    ];

    const marker = findTimelineKeyMarker(
      rankings,
      buildGames(rankings.length),
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
      3,
    );

    expect(marker?.gameId).toBe(5);
    expect(marker?.summary).toContain('Top 3');
  });
});

describe('findTimelineStabilityMarker', () => {
  it('returns the earlier mostly-stabilized point when only minor swaps remain', () => {
    const rankings = [
      ['A', 'B', 'C', 'D'],
      ['A', 'C', 'B', 'D'],
      ['A', 'B', 'C', 'D'],
      ['A', 'B', 'D', 'C'],
      ['A', 'B', 'D', 'C'],
    ];

    const marker = findTimelineStabilityMarker(rankings, buildGames(rankings.length), ['A', 'B', 'C', 'D']);

    expect(marker?.gameId).toBe(2);
    expect(marker?.summary).toContain('minor swaps');
  });
});