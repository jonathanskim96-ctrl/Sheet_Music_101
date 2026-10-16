import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { ALL_CARDS } from './cards';
import { MB, MF, MK, MN, MS, MELODIES } from './library';
import {
  beatsOf,
  eventBeats,
  parseMusic,
  parseRhythm,
  soundingCard,
  soundingPitch,
  type Melody,
  type RhythmToken,
} from './music';
import { pitchName } from './notes';

const MARK = { sharp: '#', flat: 'b', natural: '' } as const;

/** What every note of a melody's first staff sounds like, in the same 'F#4q' text style (no length). */
function soundsOf(m: Melody): string {
  const staff = m.staffs[0];
  return staff.boxes
    .map((box, b) =>
      box
        .map((ev, i) => {
          if (ev.kind !== 'note') return '-';
          const p = soundingPitch(m, 0, b, i);
          return `${p.note.charAt(0)}${MARK[p.sign]}${p.note.slice(1)}`;
        })
        .join(' '),
    )
    .join(' | ');
}

function byId(list: readonly Melody[], id: string): Melody {
  const hit = list.find((x) => x.id === id);
  if (!hit) throw new Error(`no melody ${id}`);
  return hit;
}

describe('beatsOf', () => {
  it('gives the length of every note and rest', () => {
    const want: Record<RhythmToken, number> = {
      q: 1,
      h: 2,
      'h.': 3,
      w: 4,
      ee: 1,
      Q: 1,
      H: 2,
      W: 4,
    };
    for (const [t, n] of Object.entries(want)) expect(beatsOf(t as RhythmToken)).toBe(n);
  });
});

describe('parseRhythm', () => {
  it('parses every token', () => {
    expect(parseRhythm('q q h. ee Q H W w h')).toEqual([
      'q',
      'q',
      'h.',
      'ee',
      'Q',
      'H',
      'W',
      'w',
      'h',
    ]);
  });
  it('rejects junk, empty text, double spaces and prototype names', () => {
    for (const bad of [
      '',
      ' ',
      'x',
      'q  q',
      'q ',
      ' q',
      'Q q z',
      'h.. q',
      '__proto__',
      'constructor',
      'toString',
    ])
      expect(parseRhythm(bad), bad).toBeNull();
  });
  it('never throws on arbitrary text', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const r = parseRhythm(s);
        expect(r === null || r.length > 0).toBe(true);
      }),
    );
  });
});

describe('parseMusic', () => {
  it('parses notes, signs, rests and boxes', () => {
    const boxes = parseMusic('treble', 'C4q F#4h | Bb4w');
    expect(boxes).toEqual([
      [
        { kind: 'note', dur: 'q', notes: [{ note: 'C4', printed: null }] },
        { kind: 'note', dur: 'h', notes: [{ note: 'F4', printed: 'sharp' }] },
      ],
      [{ kind: 'note', dur: 'w', notes: [{ note: 'B4', printed: 'flat' }] }],
    ]);
    expect(parseMusic('bass', 'Fn3h. Q')).toEqual([
      [
        { kind: 'note', dur: 'h.', notes: [{ note: 'F3', printed: 'natural' }] },
        { kind: 'rest', dur: 'Q' },
      ],
    ]);
  });
  it('rejects every malformed token', () => {
    const bad = [
      '',
      'C4',
      'C4ee',
      'H4q',
      'C1q',
      'C7q',
      'C4x',
      'c4q',
      'C#b4q',
      'C4q | ',
      ' | C4q',
      'C4q  C4q',
      'C4q |  | C4q',
      'C4q|C4q',
      'q',
      'C4 q',
      '__proto__',
    ];
    for (const s of bad) expect(parseMusic('treble', s), s).toBeNull();
  });
  it('rejects notes too far from the staff to draw', () => {
    expect(parseMusic('treble', 'C2w')).toBeNull();
    expect(parseMusic('bass', 'C6w')).toBeNull();
    expect(parseMusic('treble', 'A3w')).not.toBeNull();
  });
  it('never throws on arbitrary text', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(() => parseMusic('treble', s)).not.toThrow();
        expect(() => parseMusic('bass', s)).not.toThrow();
      }),
    );
  });
});

describe('eventBeats', () => {
  it('counts rests and notes', () => {
    expect(eventBeats({ kind: 'rest', dur: 'H' })).toBe(2);
    expect(eventBeats({ kind: 'note', dur: 'h.', notes: [{ note: 'C4', printed: null }] })).toBe(3);
  });
});

describe('soundingPitch: what every note of MS, MF, MK and MN sounds like', () => {
  // The expected text is written out note by note, independently of the rule's code.
  const MS_SOUNDS: Record<string, string> = {
    s1: 'F4 F#4 G4 F#4 | E4',
    s2: 'B4 Bb4 A4 Bb4 | C5',
    s3: 'C5 C#5 D5 C#5 | D5',
    s4: 'G4 G#4 A4 G#4 | A4',
    s5: 'E5 Eb5 D5 Eb5 | D5',
    s6: 'A4 Ab4 G4 Ab4 | G4',
  };
  const MF_SOUNDS: Record<string, string> = {
    f1: 'G4 F#4 G4 | F4 E4 F4',
    f2: 'A4 Bb4 A4 | B4 C5 B4',
    f3: 'D5 C#5 D5 | C5 D5 C5',
    f4: 'G4 Ab4 G4 | A4 G4 A4',
  };
  const MK_SOUNDS: Record<string, string> = {
    kg1: 'G4 A4 B4 C5 | D5 C5 B4',
    kg2: 'G4 F#4 E4 F#4 | G4',
    kg3: 'D4 E4 F#4 G4 | A4 F#4 G4',
    kg4: 'B4 A4 G4 F#4 | G4',
    kf1: 'F4 G4 A4 Bb4 | C5',
    kf2: 'C5 Bb4 A4 G4 | F4',
    kf3: 'A4 Bb4 C5 Bb4 | A4 F4',
    kf4: 'F4 A4 Bb4 A4 | G4 F4',
    kd1: 'D4 E4 F#4 G4 | A4 B4 C#5 D5',
    kd2: 'A4 G4 F#4 E4 | D4',
    kd3: 'D5 C#5 B4 A4 | D5',
    kb1: 'Bb4 C5 D5 Eb5 | D5 C5 Bb4',
    kb2: 'F4 G4 A4 Bb4 | C5 D5 Eb5',
    kb3: 'D5 Eb5 D5 C5 | Bb4',
    kgb1: 'G2 A2 B2 C3 | D3 E3 F#3 G3',
    kfb1: 'F3 E3 D3 C3 | Bb2 A2 Bb2 C3',
  };
  const MN_SOUNDS: Record<string, string> = {
    n1: 'G4 F#4 E4 F4 | G4',
    n2: 'F4 G4 F4 E4 | F#4',
    n3: 'B4 C5 B4 A4 | Bb4',
    n4: 'C5 D5 C5 B4 | C#5',
  };
  const cases: [readonly Melody[], Record<string, string>][] = [
    [MS, MS_SOUNDS],
    [MF, MF_SOUNDS],
    [MK, MK_SOUNDS],
    [MN, MN_SOUNDS],
  ];
  for (const [list, table] of cases) {
    it(`covers every melody of the set (${Object.keys(table).join(' ')})`, () => {
      expect(list.map((x) => x.id)).toEqual(Object.keys(table));
      for (const mel of list) expect(soundsOf(mel), mel.id).toBe(table[mel.id]);
    });
  }

  it('applies the rules in order on small hand-made cases', () => {
    const mk = (home: Melody['home'], text: string): Melody => {
      const boxes = parseMusic('treble', text);
      if (!boxes) throw new Error('bad test music');
      return { id: 'x', time: 4, home, staffs: [{ clef: 'treble', boxes }] };
    };
    // 1. its own printed sign beats everything
    expect(soundsOf(mk('G', 'F#4q Fb4q Fn4q F4q'))).toBe('F#4 Fb4 F4 F4');
    // 2. same letter AND octave only: F5 is untouched by an F#4 earlier in the box
    expect(soundsOf(mk('none', 'F#4q F5q F4q F4q'))).toBe('F#4 F5 F#4 F#4');
    // a later sign does not reach back
    expect(soundsOf(mk('none', 'F4q F#4q'))).toBe('F4 F#4');
    // a new box starts fresh
    expect(soundsOf(mk('none', 'F#4q F4q | F4q'))).toBe('F#4 F#4 | F4');
    // 3. the home sign applies in every octave
    expect(soundsOf(mk('D', 'F4q F5q C4q C5q E4q'))).toBe('F#4 F#5 C#4 C#5 E4');
    expect(soundsOf(mk('Bb', 'B3q B4q E4q E5q'))).toBe('Bb3 Bb4 Eb4 Eb5');
    // a natural beats the home sign for the rest of the box, in that octave only
    expect(soundsOf(mk('G', 'Fn4q F4q F5q | F4q'))).toBe('F4 F4 F#5 | F#4');
    // a rest in between changes nothing
    expect(soundsOf(mk('none', 'F#4q Q F4q Q'))).toBe('F#4 - F#4 -');
  });

  it('reads one note of a stack with noteIndex, and throws for a rest or a missing note', () => {
    const stack: Melody = {
      id: 'x',
      time: 4,
      home: 'G',
      staffs: [
        {
          clef: 'treble',
          boxes: [
            [
              {
                kind: 'note',
                dur: 'w',
                notes: [
                  { note: 'D4', printed: null },
                  { note: 'F4', printed: null },
                  { note: 'A4', printed: null },
                ],
              },
              { kind: 'rest', dur: 'H' },
            ],
          ],
        },
      ],
    };
    expect(soundingPitch(stack, 0, 0, 0, 1)).toEqual({ note: 'F4', sign: 'sharp' });
    expect(soundingCard(stack, 0, 0, 0, 1)).toBe('treble-F#4');
    expect(soundingCard(stack, 0, 0, 0, 2)).toBe('treble-A4');
    expect(() => soundingPitch(stack, 0, 0, 1)).toThrow(RangeError);
    expect(() => soundingPitch(stack, 0, 0, 0, 3)).toThrow(RangeError);
    expect(() => soundingPitch(stack, 0, 5, 0)).toThrow(RangeError);
    expect(() => soundingPitch(stack, 1, 0, 0)).toThrow(RangeError);
  });
});

describe('soundingCard', () => {
  it('names the card each note sounds as, with the right clef', () => {
    expect(soundingCard(byId(MS, 's1'), 0, 0, 1)).toBe('treble-F#4');
    expect(soundingCard(byId(MS, 's1'), 0, 0, 3)).toBe('treble-F#4');
    expect(soundingCard(byId(MS, 's1'), 0, 1, 0)).toBe('treble-E4');
    expect(soundingCard(byId(MB, 'b5'), 0, 0, 1)).toBe('bass-Bb2');
    expect(soundingCard(byId(MB, 'b8'), 0, 0, 3)).toBe('bass-Eb3');
    expect(soundingCard(byId(MK, 'kd1'), 0, 1, 2)).toBe('treble-C#5');
    expect(soundingCard(byId(MN, 'n3'), 0, 1, 0)).toBe('treble-Bb4');
  });
  it('is a real card for every note of every tune', () => {
    const all = new Set<string>(ALL_CARDS);
    for (const mel of MELODIES)
      mel.staffs.forEach((st, s) => {
        st.boxes.forEach((box, b) => {
          box.forEach((ev, i) => {
            if (ev.kind !== 'note') return;
            const c = soundingCard(mel, s === 0 ? 0 : 1, b, i);
            expect(c, `${mel.id} ${String(s)}/${String(b)}/${String(i)}`).not.toBeNull();
            expect(all.has(c ?? '')).toBe(true);
          });
        });
      });
  });
  it('uses the same names the learner sees', () => {
    expect(pitchName(soundingPitch(byId(MS, 's2'), 0, 0, 1))).toBe('B♭');
  });
});
