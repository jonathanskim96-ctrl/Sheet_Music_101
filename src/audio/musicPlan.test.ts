import { describe, expect, it } from 'vitest';
import { parseRhythm, type RhythmToken } from '../domain/music';
import { BPM, RHYTHM_MIDI, boxesEvents, rhythmEvents } from './musicPlan';

const tokens = (s: string) => parseRhythm(s) as RhythmToken[];

describe('musicPlan', () => {
  it('plays at 80 beats a minute on C5', () => {
    expect(BPM).toBe(80);
    expect(RHYTHM_MIDI).toBe(72);
  });
  it('a rhythm becomes events on C5, rests left out', () => {
    expect(rhythmEvents(tokens('q Q h'))).toEqual([
      { at: 0, midi: [72], beats: 1 },
      { at: 2, midi: [72], beats: 2 },
    ]);
  });
  it('boxes follow each other on the beat grid', () => {
    expect(boxesEvents([tokens('q q h'), tokens('w')])).toEqual([
      { at: 0, midi: [72], beats: 1 },
      { at: 1, midi: [72], beats: 1 },
      { at: 2, midi: [72], beats: 2 },
      { at: 4, midi: [72], beats: 4 },
    ]);
  });
});
