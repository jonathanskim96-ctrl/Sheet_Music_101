import { describe, expect, it } from 'vitest';
import { RHYTHM_PATTERNS } from './library';
import {
  eventsOf,
  materialQuestions,
  patternsOf,
  rhythmQuestion,
  soundOf,
  withoutListening,
} from './materialLesson';
import { beatsOf } from './music';
import { mulberry32 } from './rng';

describe('patternsOf / eventsOf', () => {
  it('RR-Q is the RR patterns that contain a 1-beat rest', () => {
    const ids = patternsOf(['RR-Q']).map((p) => p.text);
    expect(ids).toEqual(['q Q q Q', 'Q q q q', 'q Q h', 'h Q', 'Q q q', 'q Q q', 'q Q', 'Q q']);
    for (const p of patternsOf(['RR-Q'])) expect(p.tokens).toContain('Q');
  });
  it('lists the patterns of each set once, in library order', () => {
    expect(patternsOf(['RA']).map((p) => p.text)).toEqual([
      'w',
      'h h',
      'q q h',
      'h q q',
      'q h q',
      'q q q q',
    ]);
    expect(patternsOf(['RA', 'RA'])).toHaveLength(6);
    expect(patternsOf(['RD'])).toHaveLength(8);
    expect(patternsOf(['RA', 'RD', 'RR', 'RE'])).toHaveLength(RHYTHM_PATTERNS.length);
    expect(patternsOf(undefined)).toEqual([]);
  });
  it('events are the union of the listed sets, each set including the sets before it', () => {
    expect(eventsOf(['RA'])).toEqual(['q', 'h', 'w']);
    expect(eventsOf(['RA', 'RD'])).toEqual(['q', 'h', 'w', 'h.']);
    expect(eventsOf(['RR'])).toEqual(['q', 'h', 'w', 'h.', 'Q', 'H', 'W']);
    expect(eventsOf(['RA', 'RE'])).toEqual(['q', 'h', 'w', 'h.', 'Q', 'H', 'W', 'ee']);
    expect(eventsOf(undefined)).toEqual([]);
  });
});

describe('sound of a pattern', () => {
  it('no two patterns of the same time sound alike, unless they are the same pattern (hear options stay distinct)', () => {
    for (const time of [2, 3, 4] as const) {
      const here = RHYTHM_PATTERNS.filter((p) => p.time === time);
      const sounds = here.map((p) => soundOf(p.tokens));
      // the only silent pattern is the whole rest; everything else is told apart by ear
      expect(new Set(sounds).size, `time ${String(time)}`).toBe(here.length);
    }
  });
});

describe('withoutListening', () => {
  it('drops hear-rhythm and keeps the other weights', () => {
    expect(withoutListening({ 'hear-rhythm': 60, 'beats-of': 40 })).toEqual({ 'beats-of': 40 });
    expect(withoutListening({ 'beats-of': 100 })).toEqual({ 'beats-of': 100 });
  });
});

describe('rhythm question generators', () => {
  const rand = () => mulberry32(5);
  it('finish-box leaves out only the last token and offers three different lengths', () => {
    for (let seed = 0; seed < 200; seed++) {
      const q = rhythmQuestion(
        'finish-box',
        { rhythmPatterns: ['RA', 'RD', 'RR', 'RE'], rhythmEvents: ['RA', 'RD', 'RR', 'RE'] },
        mulberry32(seed),
      );
      if (q.kind !== 'finish-box') throw new Error('wrong kind');
      const pattern = RHYTHM_PATTERNS.find(
        (p) => p.time === q.time && p.tokens.slice(0, -1).join(' ') === q.box.join(' '),
      );
      expect(pattern, JSON.stringify(q)).toBeDefined();
      expect(new Set(q.options.map(beatsOf)).size).toBe(3);
    }
  });
  it('throws a clear error when the material is empty', () => {
    expect(() => rhythmQuestion('count-box', {}, rand())).toThrow(/empty/);
    expect(() => materialQuestions({ 'hear-rhythm': 100 }, 3, {}, rand())).toThrow();
    expect(() => materialQuestions({ 'name-note': 100 }, 3, {}, rand())).toThrow(/no kinds/);
  });
  it('hear-rhythm needs three patterns of one time; with only two per time it throws', () => {
    // RD has only 2 patterns for time 2 and 2 for time 4, but 4 for time 3
    const q = rhythmQuestion('hear-rhythm', { rhythmPatterns: ['RD'] }, rand());
    if (q.kind !== 'hear-rhythm') throw new Error('wrong kind');
    expect(q.time).toBe(3);
    expect(() => rhythmQuestion('hear-rhythm', { rhythmPatterns: [] }, rand())).toThrow();
  });
  it('which-longer only compares notes (never rests) of different lengths', () => {
    for (let seed = 0; seed < 100; seed++) {
      const q = rhythmQuestion('which-longer', { rhythmEvents: ['RE'] }, mulberry32(seed));
      if (q.kind !== 'which-longer') throw new Error('wrong kind');
      expect(['Q', 'H', 'W']).not.toContain(q.first);
      expect(['Q', 'H', 'W']).not.toContain(q.second);
      expect(beatsOf(q.first)).not.toBe(beatsOf(q.second));
    }
  });
  it('a tiny pool still gives the full count (it repeats only when it must)', () => {
    const qs = materialQuestions({ 'beats-of': 100 }, 10, { rhythmEvents: ['RA'] }, mulberry32(3));
    expect(qs).toHaveLength(10);
    for (let i = 1; i < qs.length; i++) expect(qs[i]).not.toEqual(qs[i - 1]);
  });
});
