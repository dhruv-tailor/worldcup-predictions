export interface BarcodeOptions {
  segments?: number;
  variant?: string;
}

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function chooseWeighted(prng: () => number, weighted: Array<[number, number]>): number {
  const total = weighted.reduce((acc, [, w]) => acc + w, 0);
  let needle = prng() * total;
  for (const [value, weight] of weighted) {
    needle -= weight;
    if (needle <= 0) return value;
  }
  return weighted[weighted.length - 1][0];
}

/**
 * Deterministically generates a barcode-like CSS gradient from match identity.
 * Produces varied but stable stripes for the same match/variant across renders.
 */
export function createBarcodePattern(
  matchKey: string,
  options: BarcodeOptions = {},
): string {
  const segments = options.segments ?? 48;
  const variant = options.variant ?? 'default';
  const seed = fnv1a(`${matchKey}::${variant}`);
  const prng = mulberry32(seed);

  const stops: string[] = [];
  let cursor = 0;

  for (let i = 0; i < segments; i += 1) {
    const width = chooseWeighted(prng, [
      [1, 34],
      [2, 36],
      [3, 20],
      [4, 10],
    ]);
    const gap = chooseWeighted(prng, [
      [1, 42],
      [2, 38],
      [3, 20],
    ]);
    const alpha = (0.62 + prng() * 0.32).toFixed(3);

    stops.push(
      `rgba(37, 50, 69, ${alpha}) ${cursor}px`,
      `rgba(37, 50, 69, ${alpha}) ${cursor + width}px`,
      `transparent ${cursor + width}px`,
      `transparent ${cursor + width + gap}px`,
    );

    // Add occasional guard bar to break rhythm.
    if (i % 11 === 0) {
      const guard = 4;
      const guardAlpha = (0.82 + prng() * 0.14).toFixed(3);
      stops.push(
        `rgba(37, 50, 69, ${guardAlpha}) ${cursor + width + gap}px`,
        `rgba(37, 50, 69, ${guardAlpha}) ${cursor + width + gap + guard}px`,
        `transparent ${cursor + width + gap + guard}px`,
      );
      cursor += guard;
    }

    cursor += width + gap;
  }

  return `linear-gradient(90deg, ${stops.join(', ')})`;
}
