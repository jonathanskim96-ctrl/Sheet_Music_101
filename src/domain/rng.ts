/** Small deterministic PRNG: the same seed always gives the same sequence in [0,1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle; returns a new array and leaves the input alone. */
export function shuffle<T>(arr: readonly T[], rand: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const a = out[i] as T;
    out[i] = out[j] as T;
    out[j] = a;
  }
  return out;
}

/** Picks one item with probability proportional to its weight; zero weights are never picked. */
export function pickWeighted<T>(
  items: readonly T[],
  weights: readonly number[],
  rand: () => number,
): T {
  let total = 0;
  let lastPositive = -1;
  for (let i = 0; i < items.length; i++) {
    const w = Math.max(0, weights[i] ?? 0);
    total += w;
    if (w > 0) lastPositive = i;
  }
  if (!(total > 0) || lastPositive < 0) throw new Error('pickWeighted: no positive weight');
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    const w = Math.max(0, weights[i] ?? 0);
    if (w <= 0) continue;
    if (r < w) return items[i] as T;
    r -= w;
  }
  return items[lastPositive] as T; // float rounding fell off the end
}

/** Stable 32-bit string hash (FNV-1a), used by the UI to build lesson seeds. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
