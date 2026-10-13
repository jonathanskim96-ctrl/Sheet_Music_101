import { describe, expect, it } from 'vitest';
import { isIosDevice } from './platform';

const nav = (userAgent: string, platform = '', maxTouchPoints = 0) => ({
  userAgent,
  platform,
  maxTouchPoints,
});

describe('isIosDevice', () => {
  it.each([
    ['iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'],
    ['iPad', 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'],
    ['iPod', 'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X)'],
  ])('is true for an %s user agent', (_n, ua) => {
    expect(isIosDevice(nav(ua))).toBe(true);
  });
  it('is true for an iPad posing as a Mac (MacIntel with a touch screen)', () => {
    expect(isIosDevice(nav('Mozilla/5.0 (Macintosh)', 'MacIntel', 5))).toBe(true);
  });
  it.each([
    ['a real Mac', nav('Mozilla/5.0 (Macintosh)', 'MacIntel', 0)],
    ['Android', nav('Mozilla/5.0 (Linux; Android 14)', 'Linux armv8l', 5)],
    ['Windows', nav('Mozilla/5.0 (Windows NT 10.0)', 'Win32', 0)],
  ])('is false for %s', (_n, n) => {
    expect(isIosDevice(n)).toBe(false);
  });
});
