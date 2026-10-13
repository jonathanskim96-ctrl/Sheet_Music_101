import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { hashString, mulberry32, pickWeighted, shuffle } from './rng';

describe('mulberry32', () => {
  it('gives the same sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });
  it('gives different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()]);
  });
  it('stays in [0, 1)', () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        const r = mulberry32(seed);
        for (let i = 0; i < 50; i++) {
          const v = r();
          if (!(v >= 0 && v < 1)) return false;
        }
        return true;
      }),
    );
  });
});

describe('shuffle', () => {
  it('returns a permutation and does not touch the input', () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { maxLength: 40 }), fc.integer(), (arr, seed) => {
        const copy = [...arr];
        const out = shuffle(arr, mulberry32(seed));
        expect(arr).toEqual(copy);
        expect([...out].sort((x, y) => x - y)).toEqual([...arr].sort((x, y) => x - y));
        return true;
      }),
    );
  });
  it('is deterministic for a seed', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffle(arr, mulberry32(7))).toEqual(shuffle(arr, mulberry32(7)));
  });
  it('actually reorders for some seeds', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const outs = new Set(
      Array.from({ length: 20 }, (_, s) => shuffle(arr, mulberry32(s)).join(',')),
    );
    expect(outs.size).toBeGreaterThan(1);
  });
});

describe('pickWeighted', () => {
  it('never returns a zero-weight item', () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        const rand = mulberry32(seed);
        for (let i = 0; i < 200; i++) {
          const v = pickWeighted(['a', 'b', 'c', 'd'], [0, 3, 0, 1], rand);
          if (v === 'a' || v === 'c') return false;
        }
        return true;
      }),
    );
  });
  it('still never picks a zero-weight item when rand returns the extremes', () => {
    expect(pickWeighted(['a', 'b', 'c'], [0, 1, 0], () => 0)).toBe('b');
    expect(pickWeighted(['a', 'b', 'c'], [0, 1, 0], () => 0.999999999)).toBe('b');
    expect(pickWeighted(['a', 'b', 'c'], [1, 0, 0], () => 0.999999999)).toBe('a');
  });
  it('follows the weights roughly', () => {
    const rand = mulberry32(5);
    let heavy = 0;
    for (let i = 0; i < 2000; i++) if (pickWeighted(['x', 'y'], [4, 1], rand) === 'x') heavy++;
    expect(heavy).toBeGreaterThan(1450);
    expect(heavy).toBeLessThan(1750);
  });
  it('throws when there is no positive weight', () => {
    expect(() => pickWeighted(['a'], [0], () => 0.5)).toThrow();
    expect(() => pickWeighted([], [], () => 0.5)).toThrow();
  });
});

describe('hashString', () => {
  it('is stable and 32-bit', () => {
    expect(hashString('u2-l1')).toBe(hashString('u2-l1'));
    expect(hashString('u2-l1')).not.toBe(hashString('u2-l2'));
    expect(hashString('anything')).toBeGreaterThanOrEqual(0);
    expect(hashString('anything')).toBeLessThan(2 ** 32);
  });
});
