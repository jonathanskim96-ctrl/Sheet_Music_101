import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { GLYPHS } from './glyphs';

describe('toolchain', () => {
  it('runs property tests', () => {
    fc.assert(fc.property(fc.integer(), (n) => n + 0 === n));
  });
  it('has the glyphs the renderer needs', () => {
    expect(Object.keys(GLYPHS).sort()).toEqual(['brace', 'fClef', 'gClef', 'noteheadWhole']);
  });
});
