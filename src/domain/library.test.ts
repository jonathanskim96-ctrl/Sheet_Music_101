import { describe, expect, it } from 'vitest';
import {
  EVENT_SETS,
  MB,
  MELODIES,
  MF,
  MH,
  MK,
  MN,
  MS,
  MT,
  MT_SKIP,
  MT_STEP,
  RHYTHM_PATTERNS,
  SB,
  SCFG,
  SH,
  ST,
  STACKS,
  rhythmPatterns,
} from './library';
import { beatsOf, eventBeats, soundingCard, type Melody } from './music';
import { staffPosition } from './notes';
import { ALL_CARDS } from './cards';

const ALL: readonly Melody[] = [...MELODIES, ...STACKS];

describe('rhythm patterns (CURRICULUM 9.1)', () => {
  it('has every pattern of the table, all parsed', () => {
    expect(RHYTHM_PATTERNS.length).toBe(6 + 8 + 12 + 11);
    for (const p of RHYTHM_PATTERNS) expect(p.tokens.length, p.id).toBeGreaterThan(0);
  });
  it('fills every box exactly (rests count)', () => {
    for (const p of RHYTHM_PATTERNS)
      expect(
        p.tokens.reduce((n, t) => n + beatsOf(t), 0),
        `${p.id}: ${p.text}`,
      ).toBe(p.time);
  });
  it('has unique ids and unique text per set and time', () => {
    expect(new Set(RHYTHM_PATTERNS.map((p) => p.id)).size).toBe(RHYTHM_PATTERNS.length);
    expect(new Set(RHYTHM_PATTERNS.map((p) => `${p.set}${String(p.time)}${p.text}`)).size).toBe(
      RHYTHM_PATTERNS.length,
    );
  });
  it('matches the table counts per set and time', () => {
    const count = (s: 'RA' | 'RD' | 'RR' | 'RE', t: 2 | 3 | 4) => rhythmPatterns(s, t).length;
    expect([count('RA', 4), count('RA', 3), count('RA', 2)]).toEqual([6, 0, 0]);
    expect([count('RD', 4), count('RD', 3), count('RD', 2)]).toEqual([2, 4, 2]);
    expect([count('RR', 4), count('RR', 3), count('RR', 2)]).toEqual([7, 3, 2]);
    expect([count('RE', 4), count('RE', 3), count('RE', 2)]).toEqual([6, 3, 2]);
    expect(rhythmPatterns('RR').length).toBe(12);
  });
  it('only uses the half-beat pair in set RE and rests in set RR', () => {
    for (const p of RHYTHM_PATTERNS) {
      if (p.set !== 'RE') expect(p.tokens, p.id).not.toContain('ee');
      if (p.set !== 'RR') for (const t of p.tokens) expect(['Q', 'H', 'W'], p.id).not.toContain(t);
      if (p.set === 'RA') expect(p.tokens, p.id).not.toContain('h.');
    }
  });
});

describe('single events', () => {
  it('each set adds to the one before', () => {
    expect([...EVENT_SETS.RA]).toEqual(['q', 'h', 'w']);
    expect(EVENT_SETS.RD).toEqual([...EVENT_SETS.RA, 'h.']);
    expect(EVENT_SETS.RR).toEqual([...EVENT_SETS.RD, 'Q', 'H', 'W']);
    expect(EVENT_SETS.RE).toEqual([...EVENT_SETS.RR, 'ee']);
  });
});

describe('melodies and stacks', () => {
  it('has the sizes of CURRICULUM 9.2 and 9.3', () => {
    expect(MT.length).toBe(12);
    expect(MT_STEP.map((x) => x.id)).toEqual(['t1', 't2', 't3', 't5', 't7', 't10']);
    expect(MT_SKIP.map((x) => x.id)).toEqual(['t4', 't6', 't8', 't9', 't11', 't12']);
    expect(MS.length).toBe(6);
    expect(MF.length).toBe(4);
    expect(MB.length).toBe(8);
    expect(MK.length).toBe(16);
    expect(MN.length).toBe(4);
    expect(MH.length).toBe(6);
    expect(ST.length).toBe(6);
    expect(SB.length).toBe(5);
    expect(SCFG.map((x) => x.id)).toEqual(['st-C4', 'st-F4', 'st-G4']);
    expect(SH.length).toBe(3);
  });
  it('has unique ids', () => {
    expect(new Set(ALL.map((x) => x.id)).size).toBe(ALL.length);
  });
  it('fills every box exactly (rests count), on every staff', () => {
    for (const mel of ALL)
      for (const st of mel.staffs)
        st.boxes.forEach((box, b) => {
          expect(
            box.reduce((n, e) => n + eventBeats(e), 0),
            `${mel.id} box ${String(b)}`,
          ).toBe(mel.time);
        });
  });
  it('sounds only notes that are cards', () => {
    const all = new Set<string>(ALL_CARDS);
    for (const mel of ALL)
      mel.staffs.forEach((st, s) => {
        st.boxes.forEach((box, b) => {
          box.forEach((ev, i) => {
            if (ev.kind !== 'note') return;
            ev.notes.forEach((_, n) => {
              const c = soundingCard(mel, s === 0 ? 0 : 1, b, i, n);
              expect(c, `${mel.id} ${String(b)}/${String(i)}/${String(n)}`).not.toBeNull();
              expect(all.has(c ?? '')).toBe(true);
            });
          });
        });
      });
  });
  it('keeps every written note on the staff or within two ledger lines (positions -2..10)', () => {
    for (const mel of ALL)
      for (const st of mel.staffs)
        for (const box of st.boxes)
          for (const ev of box)
            if (ev.kind === 'note')
              for (const w of ev.notes) {
                const p = staffPosition(st.clef, w.note);
                expect(p, `${mel.id} ${w.note}`).toBeGreaterThanOrEqual(-2);
                expect(p, `${mel.id} ${w.note}`).toBeLessThanOrEqual(10);
              }
  });
  it('gives grand-staff tunes the same number of boxes on both staves, treble first', () => {
    for (const mel of ALL)
      if (mel.staffs.length === 2) {
        expect(mel.staffs[0].clef).toBe('treble');
        expect(mel.staffs[1].clef).toBe('bass');
        expect(mel.staffs[0].boxes.length, mel.id).toBe(mel.staffs[1].boxes.length);
        mel.staffs[0].boxes.forEach((box, b) => {
          expect(
            box.reduce((n, e) => n + eventBeats(e), 0),
            `${mel.id} box ${String(b)}`,
          ).toBe(mel.staffs[1].boxes[b]?.reduce((n, e) => n + eventBeats(e), 0));
        });
      }
    expect(MH.every((x) => x.staffs.length === 2)).toBe(true);
    expect(SH.every((x) => x.staffs.length === 2)).toBe(true);
  });
  it('uses the home signs in the document and prints signs only in plain melodies', () => {
    expect(MK.filter((x) => x.home === 'G').map((x) => x.id)).toEqual([
      'kg1',
      'kg2',
      'kg3',
      'kg4',
      'kgb1',
    ]);
    expect(MK.filter((x) => x.home === 'D').length).toBe(3);
    expect(MN.map((x) => x.home)).toEqual(['G', 'G', 'F', 'D']);
    for (const mel of [...MT, ...MB, ...MH, ...STACKS]) expect(mel.home, mel.id).toBe('none');
  });
  it('draws stacks as three whole notes a letter-skip apart, lowest first', () => {
    const letters = (id: string) =>
      (ALL.find((x) => x.id === id)?.staffs[0].boxes[0]?.[0] ?? { kind: 'rest' }) as {
        kind: string;
        notes?: { note: string }[];
      };
    expect(letters('st-C4').notes?.map((n) => n.note)).toEqual(['C4', 'E4', 'G4']);
    expect(letters('st-A4').notes?.map((n) => n.note)).toEqual(['A4', 'C5', 'E5']);
    expect(letters('sb-F2').notes?.map((n) => n.note)).toEqual(['F2', 'A2', 'C3']);
    expect(letters('sb-D3').notes?.map((n) => n.note)).toEqual(['D3', 'F3', 'A3']);
  });
  it('puts a bass note of the same letter under each hands-together stack', () => {
    for (const s of SH) {
      const top = s.staffs[0].boxes[0]?.[0];
      const low = s.staffs[1]?.boxes[0]?.[0];
      expect(top?.kind === 'note' && low?.kind === 'note').toBe(true);
      if (top?.kind === 'note' && low?.kind === 'note') {
        expect(low.notes.length).toBe(1);
        expect(low.notes[0]?.note.charAt(0)).toBe(top.notes[0]?.note.charAt(0));
      }
    }
  });
});
