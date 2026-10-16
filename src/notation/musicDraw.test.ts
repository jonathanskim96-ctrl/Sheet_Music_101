import { describe, expect, it } from 'vitest';
import { staffPosition } from '../domain/notes';
import { MT, ST, RHYTHM_PATTERNS } from '../domain/library';
import { beatsOf } from '../domain/music';
import {
  drawBeats,
  markerIndex,
  melodyScore,
  rhythmScore,
  type DrawEvent,
  type DrawNote,
} from './musicDraw';

const pos = (n: DrawNote) => (n.note === null ? 0 : staffPosition('treble', n.note));

function only(ev: DrawEvent | undefined): DrawNote[] {
  if (ev?.kind !== 'note') throw new Error('expected a note event');
  return ev.notes;
}

describe('markerIndex', () => {
  it('puts one marker on a marked stack, over its highest note', () => {
    const stack = ST[0];
    if (!stack) throw new Error('no stack');
    const notes = only(melodyScore(stack, { staff: 0, box: 0, index: 0 }).staffs[0]?.boxes[0]?.[0]);
    expect(notes.filter((n) => n.marked === true)).toHaveLength(3);
    expect(markerIndex(notes, pos)).toBe(2); // G4 above C4 and E4
  });
  it('marks the single note of a melody event, and nothing when nothing is marked', () => {
    const t1 = MT[0];
    if (!t1) throw new Error('no t1');
    const marked = melodyScore(t1, { staff: 0, box: 0, index: 2 }).staffs[0]?.boxes[0];
    expect(markerIndex(only(marked?.[2]), pos)).toBe(0);
    expect(markerIndex(only(marked?.[1]), pos)).toBe(-1);
  });
});

describe('drawBeats', () => {
  it('matches beatsOf for every rhythm token and counts an empty slot by its beats', () => {
    for (const p of RHYTHM_PATTERNS) {
      const events = rhythmScore(p.tokens, p.time).staffs[0]?.boxes[0] ?? [];
      expect(events.map(drawBeats)).toEqual(p.tokens.map(beatsOf));
    }
    expect(drawBeats({ kind: 'empty', beats: 2 })).toBe(2);
  });
});
