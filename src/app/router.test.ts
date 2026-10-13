import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { parseHash, routeToHash, type Route } from './router';

const routes: Route[] = [
  { name: 'home' },
  { name: 'lesson', lessonId: 'u2-l1' },
  { name: 'lesson', lessonId: 'u3-lv2-a' },
  { name: 'checkpoint', checkpointId: 'cp-a' },
  { name: 'review' },
  { name: 'progress' },
  { name: 'settings' },
  { name: 'gallery' },
];

describe('router', () => {
  it('round-trips every route', () => {
    for (const r of routes) expect(parseHash(routeToHash(r))).toEqual(r);
  });

  it('writes the documented hashes', () => {
    expect(routeToHash({ name: 'home' })).toBe('#/');
    expect(routeToHash({ name: 'lesson', lessonId: 'u2-l1' })).toBe('#/lesson/u2-l1');
    expect(routeToHash({ name: 'checkpoint', checkpointId: 'cp-b' })).toBe('#/checkpoint/cp-b');
  });

  it('treats empty and slash-only hashes as home', () => {
    for (const h of ['', '#', '#/', '/', '//']) expect(parseHash(h)).toEqual({ name: 'home' });
  });

  it('sends unknown or malformed routes home', () => {
    for (const h of [
      '#/nope',
      '#/lesson',
      '#/lesson/',
      '#/lesson/a/b',
      '#/lesson/u 1',
      '#/lesson/<script>',
      '#/review/extra',
      '#/progress/1',
      '#/checkpoint',
      `#/lesson/${'a'.repeat(41)}`,
    ])
      expect(parseHash(h), h).toEqual({ name: 'home' });
  });

  it('never throws and always round-trips whatever it returns', () => {
    fc.assert(
      fc.property(fc.string(), (h) => {
        const r = parseHash(h);
        expect(parseHash(routeToHash(r))).toEqual(r);
      }),
    );
  });
});
