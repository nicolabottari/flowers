// Deterministic randomness: the same seed string always produces the same
// sequence, on every platform. xmur3 turns the seed into four 32-bit values
// that initialize an sfc32 generator.

export type Rng = () => number;

const xmur3 = (input: string) => {
  let h = 1779033703 ^ input.length;

  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }

  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
};

const sfc32 = (s1: number, s2: number, s3: number, s4: number): Rng => {
  let a = s1 >>> 0;
  let b = s2 >>> 0;
  let c = s3 >>> 0;
  let d = s4 >>> 0;

  return () => {
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
};

export const createRng = (seed: string): Rng => {
  const next = xmur3(seed);
  const rng = sfc32(next(), next(), next(), next());

  // Discard the first values, which correlate with similar seeds
  for (let i = 0; i < 12; i++) rng();

  return rng;
};

export const between = (rng: Rng, min: number, max: number): number =>
  min + (max - min) * rng();

export const intBetween = (rng: Rng, min: number, max: number): number =>
  Math.floor(between(rng, min, max + 1));

export const pick = <T>(rng: Rng, items: readonly T[]): T =>
  items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
