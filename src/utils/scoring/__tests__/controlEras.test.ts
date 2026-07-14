import { describe, expect, it } from 'vitest';
import type { ControlRankSnapshot, EraLabels } from '../../controlEras';
import { computeEras } from '../../controlEras';

const TEST_LABELS: EraLabels = {
  stable: (player) => `${player} stable`,
  chaotic: 'chaotic',
  goldenAge: (player) => `${player} golden`,
};

function entry(gameId: number, counts: Record<string, number>) {
  return {
    gameId,
    game: `G${gameId}`,
    gameLabel: `Game ${gameId}`,
    ...counts,
  };
}

function snapshot(gameId: number, top1: string[] = [], top2: string[] = [], top3: string[] = []): ControlRankSnapshot {
  return {
    gameId,
    top1: new Set(top1),
    top2: new Set(top2),
    top3: new Set(top3),
  };
}

describe('computeEras Golden Age promotion', () => {
  it('does not promote a Silver stable era without an all-leaderboards top-2 game inside that era', () => {
    const eras = computeEras(
      [
        entry(1, { A: 3, B: 1 }),
        entry(2, { A: 3, B: 1 }),
        entry(3, { A: 2, B: 2 }),
      ],
      ['A', 'B'],
      5,
      TEST_LABELS,
      [
        snapshot(1, [], ['B'], []),
        snapshot(2, [], [], []),
        snapshot(3, [], ['A'], []),
      ],
      'top2',
    );

    expect(eras[0]?.label).toBe('A stable');
    expect(eras[0]?.isGoldenAge).toBe(false);
  });

  it('promotes a Silver stable era when the player reaches the all-leaderboards top-2 band inside that era', () => {
    const eras = computeEras(
      [
        entry(1, { A: 3, B: 1 }),
        entry(2, { A: 3, B: 1 }),
        entry(3, { A: 2, B: 2 }),
      ],
      ['A', 'B'],
      5,
      TEST_LABELS,
      [
        snapshot(1, [], [], []),
        snapshot(2, [], ['A'], []),
        snapshot(3, [], [], []),
      ],
      'top2',
    );

    expect(eras[0]?.label).toBe('A golden');
    expect(eras[0]?.isGoldenAge).toBe(true);
  });

  it('promotes a Bronze stable era when the player reaches the all-leaderboards top-3 band inside that era', () => {
    const eras = computeEras(
      [
        entry(1, { A: 3, B: 1 }),
        entry(2, { A: 3, B: 1 }),
        entry(3, { A: 2, B: 2 }),
      ],
      ['A', 'B'],
      5,
      TEST_LABELS,
      [
        snapshot(1, [], [], []),
        snapshot(2, [], [], ['A']),
        snapshot(3, [], [], []),
      ],
      'top3',
    );

    expect(eras[0]?.label).toBe('A golden');
    expect(eras[0]?.isGoldenAge).toBe(true);
  });

  it('does not promote a Bronze stable era when the all-leaderboards top-3 band happens only outside that era', () => {
    const eras = computeEras(
      [
        entry(1, { A: 3, B: 1 }),
        entry(2, { A: 3, B: 1 }),
        entry(3, { A: 2, B: 2 }),
      ],
      ['A', 'B'],
      5,
      TEST_LABELS,
      [
        snapshot(1, [], [], []),
        snapshot(2, [], [], []),
        snapshot(3, [], [], ['A']),
      ],
      'top3',
    );

    expect(eras[0]?.label).toBe('A stable');
    expect(eras[0]?.isGoldenAge).toBe(false);
  });
});