import { describe, expect, it } from 'vitest';
import { emptyProgress } from '../../domain/progress';
import { deepFreeze } from '../../domain/testkit';
import { chartName, chartNotes, overallAccuracy } from './mastery';

describe('chartNotes', () => {
  it('places 17 treble and 17 bass cards in shared columns, in pitch order', () => {
    const notes = chartNotes(emptyProgress('2026-10-01'));
    expect(notes).toHaveLength(34);
    const treble = notes.filter((n) => n.card.startsWith('treble-'));
    const bass = notes.filter((n) => n.card.startsWith('bass-'));
    expect(treble.map((n) => n.column)).toEqual([...Array(17).keys()]);
    expect(bass.map((n) => n.column)).toEqual([...Array(17).keys()]);
    expect(treble[0]?.card).toBe('treble-A3');
    expect(treble[16]?.card).toBe('treble-C6');
    expect(bass[0]?.card).toBe('bass-C2');
    expect(notes.every((n) => n.mastery === 'new')).toBe(true);
  });

  it('labels a note with its name, mastery and first-try score', () => {
    const p = emptyProgress('2026-10-01');
    p.cards['treble-G4'] = {
      box: 4,
      lastSeenDay: '2026-10-01',
      lastPromotedDay: null,
      seen: 13,
      correct: 12,
      avgMs: 2000,
    };
    p.cards['bass-A2'] = { ...p.cards['treble-G4'], box: 1, seen: 2, correct: 1 };
    const notes = chartNotes(deepFreeze(p));
    expect(notes.find((n) => n.card === 'treble-G4')?.label).toBe(
      'Treble G · Known · 12/13 correct',
    );
    expect(notes.find((n) => n.card === 'bass-A2')?.label).toBe('Bass A · Learning · 1/2 correct');
    expect(notes.find((n) => n.card === 'treble-E4')?.label).toBe('Treble E · New');
  });
});

describe('chartName', () => {
  it('uses nicknames, else clef and letter (never octave numbers)', () => {
    expect(chartName('treble-C4')).toBe('Middle C');
    expect(chartName('bass-F3')).toBe('Bass F');
    expect(chartName('treble-E5')).toBe('Treble E');
    expect(chartName('bass-D2')).toBe('Bass D');
  });
});

describe('overallAccuracy', () => {
  it('is null before any answer, else a whole percentage', () => {
    const p = emptyProgress('2026-10-01');
    expect(overallAccuracy(p)).toBeNull();
    p.totals.questionsAnswered = 3;
    p.totals.correctFirstTry = 2;
    expect(overallAccuracy(p)).toBe(67);
  });
});
