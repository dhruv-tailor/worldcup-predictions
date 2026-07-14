import { describe, expect, it } from 'vitest';
import { getPlayerColor, getPlayerColorKey } from '../../playerColors';

describe('player colors', () => {
  it('returns stable colors for the same player name', () => {
    const a = getPlayerColor('Ted');
    const b = getPlayerColor('Ted');
    expect(a).toBe(b);
  });

  it('normalizes case and extra spaces in the color key', () => {
    const keyA = getPlayerColorKey('  TED   Alvarez  ');
    const keyB = getPlayerColorKey('ted alvarez');
    expect(keyA).toBe(keyB);
    expect(getPlayerColor('  TED   Alvarez  ')).toBe(getPlayerColor('ted alvarez'));
  });

  it('produces distinct colors for a small sample set', () => {
    const names = ['Ava', 'Ben', 'Chris', 'Dina', 'Eli', 'Fatima', 'Gio', 'Hana'];
    const colors = new Set(names.map((name) => getPlayerColor(name)));
    expect(colors.size).toBe(names.length);
  });

  it('outputs an hsl color string', () => {
    expect(getPlayerColor('Raf')).toMatch(/^hsl\(\d+ \d+% \d+%\)$/);
  });
});
