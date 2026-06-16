import { describe, expect, it } from 'vitest';
import { createBarcodePattern } from '../../barcode';

describe('createBarcodePattern', () => {
  it('returns deterministic output for the same key and variant', () => {
    const a = createBarcodePattern('17:France:Senegal', { variant: 'upcoming' });
    const b = createBarcodePattern('17:France:Senegal', { variant: 'upcoming' });
    expect(a).toBe(b);
  });

  it('varies output for different matches', () => {
    const a = createBarcodePattern('17:France:Senegal');
    const b = createBarcodePattern('18:Brazil:Japan');
    expect(a).not.toBe(b);
  });

  it('supports deterministic variants for same match key', () => {
    const upcoming = createBarcodePattern('17:France:Senegal', { variant: 'upcoming' });
    const detail = createBarcodePattern('17:France:Senegal', { variant: 'detail' });
    expect(upcoming).not.toBe(detail);
  });

  it('emits a css linear-gradient string', () => {
    const output = createBarcodePattern('17:France:Senegal');
    expect(output.startsWith('linear-gradient(90deg, ')).toBe(true);
    expect(output.includes('rgba(37, 50, 69,')).toBe(true);
    expect(output.includes('transparent')).toBe(true);
  });
});
