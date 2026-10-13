import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { dayKeyOf, daysBetween, isDayKey } from './days';

const validDay = fc
  .integer({ min: Date.UTC(1990, 0, 1) / 86_400_000, max: Date.UTC(2100, 11, 31) / 86_400_000 })
  .map((n) => new Date(n * 86_400_000).toISOString().slice(0, 10));

describe('isDayKey', () => {
  it.each(['2028-02-29', '2026-10-12', '2000-02-29', '1999-12-31', '0001-01-01'])(
    'accepts %s',
    (s) => {
      expect(isDayKey(s)).toBe(true);
    },
  );
  it.each([
    '2026-02-29',
    '2100-02-29',
    '2026-13-01',
    '2026-00-10',
    '2026-10-00',
    '2026-04-31',
    '2026-1-01',
    '2026-10-1',
    '26-10-01',
    '2026-10-12 ',
    '2026-10-12T00:00',
    '',
  ])('rejects %j', (s) => {
    expect(isDayKey(s)).toBe(false);
  });
  it('rejects non-strings', () => {
    for (const v of [null, undefined, 20261012, {}, [], new Date(0), true]) {
      expect(isDayKey(v)).toBe(false);
    }
  });
});

describe('dayKeyOf', () => {
  it('uses the local date, not UTC', () => {
    expect(dayKeyOf(new Date(2026, 9, 12, 23, 59))).toBe('2026-10-12');
    expect(dayKeyOf(new Date(2026, 9, 12, 0, 0))).toBe('2026-10-12');
    expect(dayKeyOf(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
  it('always produces a valid day key', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date(1990, 0, 2), max: new Date(2100, 0, 1), noInvalidDate: true }),
        (d) => isDayKey(dayKeyOf(d)),
      ),
    );
  });
});

describe('daysBetween', () => {
  it('counts whole days', () => {
    expect(daysBetween('2026-10-12', '2026-10-12')).toBe(0);
    expect(daysBetween('2026-10-12', '2026-10-13')).toBe(1);
    expect(daysBetween('2026-10-13', '2026-10-12')).toBe(-1);
    expect(daysBetween('2026-10-01', '2026-10-31')).toBe(30);
  });
  it('is right across US and EU DST changes', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2); // US spring forward 8 Mar 2026
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2); // US fall back 1 Nov 2026
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2); // EU spring forward 29 Mar 2026
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2); // EU fall back 25 Oct 2026
  });
  it('is right across New Year and leap years', () => {
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365);
    expect(daysBetween('2028-01-01', '2029-01-01')).toBe(366);
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
  });
  it('is antisymmetric for any two valid days', () => {
    fc.assert(fc.property(validDay, validDay, (a, b) => daysBetween(a, b) === -daysBetween(b, a)));
  });
  it('is additive: (a,b) + (b,c) = (a,c)', () => {
    fc.assert(
      fc.property(
        validDay,
        validDay,
        validDay,
        (a, b, c) => daysBetween(a, b) + daysBetween(b, c) === daysBetween(a, c),
      ),
    );
  });
});
