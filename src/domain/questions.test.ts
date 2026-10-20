import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { ALL_CARDS, NATURAL_CARDS, SIGN_CARDS, cardMidi, parseCardId, type CardId } from './cards';
import {
  LETTERS,
  diatonicIndex,
  letterOf,
  noteAtPosition,
  noteFromDiatonic,
  pitchName,
  type Clef,
  type Note,
  type Sign,
} from './notes';
import { mulberry32 } from './rng';
import {
  cardOf,
  checkAnswer,
  correctAnswerOf,
  nearestCorrectPosition,
  pitchOptions,
  stepSkipValue,
  type Answer,
  type ChoiceValue,
  type Question,
} from './questions';

const WHITE_KEYS: Note[] = Array.from({ length: 35 }, (_, i) => noteFromDiatonic(14 + i) as Note);
const CHOICES: ChoiceValue[] = [
  'line',
  'space',
  'first',
  'second',
  'treble',
  'bass',
  'step-up',
  'step-down',
  'skip-up',
  'skip-down',
];

const card = fc.constantFrom(...NATURAL_CARDS);
const render = fc.constantFrom<'single' | 'grand'>('single', 'grand');
const letter = fc.constantFrom(...LETTERS);
const clef = fc.constantFrom<Clef>('treble', 'bass');

/** A step-skip question built from a first note p in 0..8 and a legal move. */
const stepSkipQ: fc.Arbitrary<Question> = fc
  .record({
    clef,
    p: fc.integer({ min: 0, max: 8 }),
    delta: fc.constantFrom(-2, -1, 1, 2),
    buttons: fc.constantFrom<2 | 4>(2, 4),
  })
  .map(({ clef: c, p, delta, buttons }) => {
    const base = c === 'treble' ? 30 : 18;
    return {
      kind: 'step-skip' as const,
      clef: c,
      first: noteFromDiatonic(base + p) as Note,
      second: noteFromDiatonic(base + p + delta) as Note,
      buttons,
    };
  });

const anyQuestion: fc.Arbitrary<Question> = fc.oneof(
  fc.record({ kind: fc.constant('name-note' as const), card, render }),
  fc.record({ kind: fc.constant('find-key-letter' as const), card, render }),
  fc.record({ kind: fc.constant('find-key-exact' as const), card, render }),
  fc.record({ kind: fc.constant('find-on-staff' as const), card }),
  stepSkipQ,
  fc.record({
    kind: fc.constant('alphabet-next' as const),
    letter,
    direction: fc.constantFrom<'after' | 'before'>('after', 'before'),
  }),
  fc.record({ kind: fc.constant('keyboard-letter' as const), letter }),
  fc.record({
    kind: fc.constant('line-or-space' as const),
    position: fc.integer({ min: 0, max: 8 }),
  }),
  fc
    .tuple(fc.integer({ min: 30, max: 38 }), fc.integer({ min: 30, max: 38 }))
    .filter(([a, b]) => a !== b)
    .map(([a, b]) => ({
      kind: 'higher-lower' as const,
      first: noteFromDiatonic(a) as Note,
      second: noteFromDiatonic(b) as Note,
    })),
  fc.record({ kind: fc.constant('clef-identify' as const), clef }),
  fc
    .record({
      card: fc.constantFrom(...ALL_CARDS),
      render,
      showNatural: fc.boolean(),
      seed: fc.integer({ min: 0, max: 2 ** 31 }),
    })
    .map(({ card: c, render: r, showNatural, seed }) => ({
      kind: 'name-accidental' as const,
      card: c,
      render: r,
      showNatural,
      options: pitchOptions(c, mulberry32(seed)),
    })),
  fc.record({
    kind: fc.constant('find-key-pitch' as const),
    card: fc.constantFrom(...ALL_CARDS),
    render,
  }),
);

const SIGNS: Sign[] = ['natural', 'sharp', 'flat'];

/** Every answer of the type the question expects, covering the whole answer space. */
function sameTypeAnswers(q: Question): Answer[] {
  switch (q.kind) {
    case 'name-note':
    case 'alphabet-next':
      return LETTERS.map((l) => ({ kind: 'letter', letter: l }));
    case 'find-key-letter':
    case 'find-key-exact':
    case 'keyboard-letter':
      return [
        ...WHITE_KEYS.map((note): Answer => ({ kind: 'key', note })),
        { kind: 'key', note: 'black' },
      ];
    case 'find-on-staff':
      return Array.from({ length: 31 }, (_, i): Answer => ({ kind: 'position', position: i - 12 }));
    case 'name-accidental':
      return LETTERS.flatMap((l) =>
        SIGNS.map((sg): Answer => ({ kind: 'pitch-name', letter: l, sign: sg })),
      );
    case 'find-key-pitch':
      return Array.from({ length: 80 }, (_, i): Answer => ({ kind: 'pitch-key', midi: 20 + i }));
    default:
      return CHOICES.map((value) => ({ kind: 'choice', value }));
  }
}

/** Independent statement of what is right, written differently from the implementation. */
function expectedRight(q: Question, a: Answer): boolean {
  switch (q.kind) {
    case 'name-note': {
      const c = parseCardId(q.card);
      return a.kind === 'letter' && c !== null && a.letter === c.note.charAt(0);
    }
    case 'alphabet-next': {
      const order = 'CDEFGAB';
      const at = order.indexOf(q.letter);
      const want = order.charAt(q.direction === 'after' ? (at + 1) % 7 : (at + 6) % 7);
      return a.kind === 'letter' && a.letter === want;
    }
    case 'find-key-letter': {
      const c = parseCardId(q.card);
      return (
        a.kind === 'key' &&
        a.note !== 'black' &&
        c !== null &&
        a.note.charAt(0) === c.note.charAt(0)
      );
    }
    case 'find-key-exact': {
      const c = parseCardId(q.card);
      return a.kind === 'key' && c !== null && a.note === c.note;
    }
    case 'keyboard-letter':
      return a.kind === 'key' && a.note !== 'black' && a.note.charAt(0) === q.letter;
    case 'find-on-staff': {
      const c = parseCardId(q.card);
      if (a.kind !== 'position' || c === null) return false;
      const n = noteAtPosition(c.clef, a.position);
      return n !== null && n.charAt(0) === c.note.charAt(0);
    }
    case 'step-skip': {
      const d = diatonicIndex(q.second) - diatonicIndex(q.first);
      const want = `${Math.abs(d) === 1 ? 'step' : 'skip'}-${d > 0 ? 'up' : 'down'}`;
      return a.kind === 'choice' && a.value === want;
    }
    case 'line-or-space':
      return a.kind === 'choice' && a.value === (q.position % 2 === 0 ? 'line' : 'space');
    case 'higher-lower':
      return (
        a.kind === 'choice' &&
        a.value === (diatonicIndex(q.first) > diatonicIndex(q.second) ? 'first' : 'second')
      );
    case 'clef-identify':
      return a.kind === 'choice' && a.value === q.clef;
    case 'name-accidental': {
      const c = parseCardId(q.card);
      return (
        a.kind === 'pitch-name' && c !== null && a.letter === c.note.charAt(0) && a.sign === c.sign
      );
    }
    case 'find-key-pitch': {
      // the white key's number plus one for a sharp, minus one for a flat
      const c = parseCardId(q.card);
      if (c === null || a.kind !== 'pitch-key') return false;
      const white =
        [0, 2, 4, 5, 7, 9, 11][LETTERS.indexOf(c.note.charAt(0) as (typeof LETTERS)[number])] ?? 0;
      const octave = Number(c.note.charAt(1));
      return (
        a.midi === (octave + 1) * 12 + white + (c.sign === 'sharp' ? 1 : c.sign === 'flat' ? -1 : 0)
      );
    }
  }
}

describe('checkAnswer ∘ correctAnswerOf (property over every question kind)', () => {
  it('the correct answer is always accepted', () => {
    fc.assert(
      fc.property(anyQuestion, (q) => checkAnswer(q, correctAnswerOf(q))),
      { numRuns: 500 },
    );
  });
  it('agrees with an independent definition on the whole same-type answer space', () => {
    fc.assert(
      fc.property(anyQuestion, (q) => {
        for (const a of sameTypeAnswers(q)) {
          if (checkAnswer(q, a) !== expectedRight(q, a)) return false;
        }
        return true;
      }),
      { numRuns: 300 },
    );
  });
  it('every other same-type answer is rejected for single-answer kinds', () => {
    fc.assert(
      fc.property(anyQuestion, (q) => {
        if (
          q.kind === 'find-key-letter' ||
          q.kind === 'keyboard-letter' ||
          q.kind === 'find-on-staff'
        )
          return true; // several answers are right by design; covered by the test above
        const right = correctAnswerOf(q);
        for (const a of sameTypeAnswers(q)) {
          const same = JSON.stringify(a) === JSON.stringify(right);
          if (checkAnswer(q, a) !== same) return false;
        }
        return true;
      }),
      { numRuns: 300 },
    );
  });
  it('answers of the wrong type are always rejected', () => {
    const wrongTypes: Answer[] = [
      { kind: 'letter', letter: 'C' },
      { kind: 'key', note: 'C4' },
      { kind: 'key', note: 'black' },
      { kind: 'position', position: 0 },
      { kind: 'choice', value: 'line' },
      { kind: 'pitch-name', letter: 'C', sign: 'natural' },
      { kind: 'pitch-key', midi: 60 },
    ];
    fc.assert(
      fc.property(anyQuestion, (q) => {
        const expectedKind = correctAnswerOf(q).kind;
        return wrongTypes.filter((a) => a.kind !== expectedKind).every((a) => !checkAnswer(q, a));
      }),
    );
  });
  it('correct answers are in the answer space (letters A–G, white keys, valid positions)', () => {
    fc.assert(
      fc.property(anyQuestion, (q) => {
        const a = correctAnswerOf(q);
        if (a.kind === 'letter') return LETTERS.includes(a.letter);
        if (a.kind === 'key') return a.note !== 'black' && WHITE_KEYS.includes(a.note);
        if (a.kind === 'position') return Number.isInteger(a.position);
        if (a.kind === 'pitch-name') return LETTERS.includes(a.letter) && SIGNS.includes(a.sign);
        if (a.kind === 'pitch-key') return Number.isInteger(a.midi) && a.midi >= 24 && a.midi <= 96;
        return CHOICES.includes(a.value);
      }),
    );
  });
});

describe('specific rules', () => {
  it('a black key is always wrong', () => {
    const black: Answer = { kind: 'key', note: 'black' };
    for (const id of NATURAL_CARDS) {
      expect(checkAnswer({ kind: 'find-key-letter', card: id, render: 'single' }, black)).toBe(
        false,
      );
      expect(checkAnswer({ kind: 'find-key-exact', card: id, render: 'single' }, black)).toBe(
        false,
      );
    }
    for (const l of LETTERS)
      expect(checkAnswer({ kind: 'keyboard-letter', letter: l }, black)).toBe(false);
  });
  it('find-key-letter accepts any octave, find-key-exact only the exact key', () => {
    const letterQ: Question = { kind: 'find-key-letter', card: 'treble-G4', render: 'single' };
    const exactQ: Question = { kind: 'find-key-exact', card: 'treble-G4', render: 'single' };
    expect(checkAnswer(letterQ, { kind: 'key', note: 'G3' })).toBe(true);
    expect(checkAnswer(letterQ, { kind: 'key', note: 'G5' })).toBe(true);
    expect(checkAnswer(letterQ, { kind: 'key', note: 'A4' })).toBe(false);
    expect(checkAnswer(exactQ, { kind: 'key', note: 'G4' })).toBe(true);
    expect(checkAnswer(exactQ, { kind: 'key', note: 'G3' })).toBe(false);
    expect(checkAnswer(exactQ, { kind: 'key', note: 'G5' })).toBe(false);
  });
  it('find-on-staff accepts other octaves of the same letter and nothing else', () => {
    const q: Question = { kind: 'find-on-staff', card: 'treble-G4' }; // position 2
    expect(checkAnswer(q, { kind: 'position', position: 2 })).toBe(true); // G4
    expect(checkAnswer(q, { kind: 'position', position: 9 })).toBe(true); // G5
    expect(checkAnswer(q, { kind: 'position', position: -5 })).toBe(true); // G3
    expect(checkAnswer(q, { kind: 'position', position: 3 })).toBe(false); // A4
    expect(checkAnswer(q, { kind: 'position', position: 1 })).toBe(false); // F4
    const bass: Question = { kind: 'find-on-staff', card: 'bass-F3' }; // position 6
    expect(checkAnswer(bass, { kind: 'position', position: 6 })).toBe(true);
    expect(checkAnswer(bass, { kind: 'position', position: -1 })).toBe(true); // F2
    expect(checkAnswer(bass, { kind: 'position', position: 5 })).toBe(false);
  });
  it('find-on-staff rejects non-integer and out-of-range positions', () => {
    const q: Question = { kind: 'find-on-staff', card: 'treble-G4' };
    expect(checkAnswer(q, { kind: 'position', position: 2.5 })).toBe(false);
    expect(checkAnswer(q, { kind: 'position', position: Number.NaN })).toBe(false);
    expect(checkAnswer(q, { kind: 'position', position: 9999 })).toBe(false);
    expect(checkAnswer(q, { kind: 'position', position: -9999 })).toBe(false);
  });
  it('alphabet-next wraps around', () => {
    expect(correctAnswerOf({ kind: 'alphabet-next', letter: 'G', direction: 'after' })).toEqual({
      kind: 'letter',
      letter: 'A',
    });
    expect(correctAnswerOf({ kind: 'alphabet-next', letter: 'A', direction: 'before' })).toEqual({
      kind: 'letter',
      letter: 'G',
    });
    expect(correctAnswerOf({ kind: 'alphabet-next', letter: 'C', direction: 'before' })).toEqual({
      kind: 'letter',
      letter: 'B',
    });
    expect(correctAnswerOf({ kind: 'alphabet-next', letter: 'B', direction: 'after' })).toEqual({
      kind: 'letter',
      letter: 'C',
    });
  });
  it('step-skip: step = 1 letter, skip = 2, direction by sign', () => {
    expect(stepSkipValue('E4', 'F4')).toBe('step-up');
    expect(stepSkipValue('F4', 'E4')).toBe('step-down');
    expect(stepSkipValue('E4', 'G4')).toBe('skip-up');
    expect(stepSkipValue('G4', 'E4')).toBe('skip-down');
    expect(stepSkipValue('B4', 'C5')).toBe('step-up'); // crosses the octave boundary
    expect(stepSkipValue('C5', 'A4')).toBe('skip-down');
  });
  it('line-or-space: even positions are lines', () => {
    for (let p = 0; p <= 8; p++) {
      expect(correctAnswerOf({ kind: 'line-or-space', position: p })).toEqual({
        kind: 'choice',
        value: p % 2 === 0 ? 'line' : 'space',
      });
    }
  });
  it('higher-lower picks the higher note regardless of order', () => {
    expect(correctAnswerOf({ kind: 'higher-lower', first: 'C4', second: 'E4' })).toEqual({
      kind: 'choice',
      value: 'second',
    });
    expect(correctAnswerOf({ kind: 'higher-lower', first: 'A4', second: 'E4' })).toEqual({
      kind: 'choice',
      value: 'first',
    });
  });
  it('name-note answers by letter only (the octave and clef do not matter)', () => {
    expect(
      checkAnswer(
        { kind: 'name-note', card: 'bass-C4', render: 'single' },
        { kind: 'letter', letter: 'C' },
      ),
    ).toBe(true);
    expect(
      checkAnswer(
        { kind: 'name-note', card: 'bass-C4', render: 'single' },
        { kind: 'letter', letter: 'D' },
      ),
    ).toBe(false);
  });
  it('keyboard-letter accepts any white key of the letter', () => {
    const q: Question = { kind: 'keyboard-letter', letter: 'F' };
    expect(checkAnswer(q, { kind: 'key', note: 'F3' })).toBe(true);
    expect(checkAnswer(q, { kind: 'key', note: 'F4' })).toBe(true);
    expect(checkAnswer(q, { kind: 'key', note: 'G4' })).toBe(false);
  });
});

describe('cardOf', () => {
  it('returns the card for note questions and null for the others', () => {
    expect(cardOf({ kind: 'name-note', card: 'bass-D3', render: 'single' })).toBe('bass-D3');
    expect(cardOf({ kind: 'find-key-letter', card: 'bass-D3', render: 'grand' })).toBe('bass-D3');
    expect(cardOf({ kind: 'find-key-exact', card: 'bass-D3', render: 'grand' })).toBe('bass-D3');
    expect(cardOf({ kind: 'find-on-staff', card: 'bass-D3' })).toBe('bass-D3');
    expect(cardOf({ kind: 'alphabet-next', letter: 'A', direction: 'after' })).toBeNull();
    expect(cardOf({ kind: 'keyboard-letter', letter: 'A' })).toBeNull();
    expect(cardOf({ kind: 'line-or-space', position: 1 })).toBeNull();
    expect(cardOf({ kind: 'higher-lower', first: 'C4', second: 'D4' })).toBeNull();
    expect(cardOf({ kind: 'clef-identify', clef: 'treble' })).toBeNull();
    expect(
      cardOf({ kind: 'step-skip', clef: 'treble', first: 'E4', second: 'F4', buttons: 2 }),
    ).toBeNull();
  });
});

describe('bad input', () => {
  it('a question with an unknown card id throws a clear error rather than guessing', () => {
    const bad = { kind: 'name-note', card: 'treble-C2' as CardId, render: 'single' } as const;
    expect(() => correctAnswerOf(bad)).toThrow(/Unknown card/);
    expect(() => checkAnswer(bad, { kind: 'letter', letter: 'C' })).toThrow(/Unknown card/);
  });
  it('letterOf agrees with the card letters used above', () => {
    expect(letterOf('G4')).toBe('G');
  });
});

describe('nearestCorrectPosition', () => {
  const q = (card: CardId): Question => ({ kind: 'find-on-staff', card });

  it("is the card's own position when the learner is closest to it", () => {
    // treble G4 is position 2; a tap one above (3) is nearest to it
    expect(nearestCorrectPosition('treble-G4', 3)).toBe(2);
    expect(nearestCorrectPosition('treble-G4', 2)).toBe(2);
  });
  it('picks the same letter in another octave when that is nearer', () => {
    // G4 = 2, G5 = 9: a note placed at 8 is nearer to G5
    expect(nearestCorrectPosition('treble-G4', 8)).toBe(9);
    expect(nearestCorrectPosition('treble-G4', 12)).toBe(9);
  });
  it('picks the nearer of two octaves on either side of the middle', () => {
    // E4 = 0 and E5 = 7 are 7 apart, so 3 is nearer the lower and 4 the higher (no exact tie exists)
    expect(nearestCorrectPosition('treble-E4', 3)).toBe(0);
    expect(nearestCorrectPosition('treble-E4', 4)).toBe(7);
  });
  it('always returns a position that checkAnswer accepts, for every card and every tap', () => {
    for (const card of NATURAL_CARDS) {
      for (let tap = -4; tap <= 12; tap++) {
        const p = nearestCorrectPosition(card, tap);
        expect(p).toBeGreaterThanOrEqual(-4);
        expect(p).toBeLessThanOrEqual(12);
        expect(
          checkAnswer(q(card), { kind: 'position', position: p }),
          `${card} @${String(tap)}`,
        ).toBe(true);
      }
    }
  });
  it('is never further away than another right position', () => {
    for (const card of NATURAL_CARDS) {
      const parts = parseCardId(card);
      if (!parts) throw new Error(card);
      for (let tap = -4; tap <= 12; tap++) {
        const best = Math.abs(nearestCorrectPosition(card, tap) - tap);
        for (let p = -4; p <= 12; p++) {
          if (checkAnswer(q(card), { kind: 'position', position: p })) {
            expect(Math.abs(p - tap)).toBeGreaterThanOrEqual(best);
          }
        }
      }
    }
  });
});

describe('sign cards (part-1 kinds stay natural only, SPEC 8.1)', () => {
  const sign: CardId = 'treble-F#4';
  const refused = /sign card/i;

  it('name-note, find-key and find-on-staff refuse a sign card instead of using the white key', () => {
    const kinds = ['name-note', 'find-key-letter', 'find-key-exact', 'find-on-staff'] as const;
    for (const kind of kinds) {
      const question = (
        kind === 'find-on-staff' ? { kind, card: sign } : { kind, card: sign, render: 'single' }
      ) as Question;
      expect(() => correctAnswerOf(question), kind).toThrow(refused);
      const answer: Answer =
        kind === 'name-note'
          ? { kind: 'letter', letter: 'F' }
          : kind === 'find-on-staff'
            ? { kind: 'position', position: 3 }
            : { kind: 'key', note: 'F4' };
      expect(() => checkAnswer(question, answer), kind).toThrow(refused);
    }
    expect(() => nearestCorrectPosition(sign, 3)).toThrow(refused);
  });
});

describe('name-accidental and find-key-pitch (SPEC 8.6)', () => {
  const ask = (card: CardId): Question => ({
    kind: 'name-accidental',
    card,
    render: 'single',
    showNatural: false,
    options: pitchOptions(card, mulberry32(1)),
  });
  const names = (card: CardId, seed = 1): string[] =>
    pitchOptions(card, mulberry32(seed)).map((o) =>
      pitchName({ note: `${o.letter}4`, sign: o.sign }),
    );

  it('answers need both the letter and the sign', () => {
    const q = ask('treble-F#4');
    expect(checkAnswer(q, { kind: 'pitch-name', letter: 'F', sign: 'sharp' })).toBe(true);
    expect(checkAnswer(q, { kind: 'pitch-name', letter: 'F', sign: 'natural' })).toBe(false);
    expect(checkAnswer(q, { kind: 'pitch-name', letter: 'G', sign: 'flat' })).toBe(false);
    expect(checkAnswer(q, { kind: 'pitch-name', letter: 'F', sign: 'flat' })).toBe(false);
    // the same black key under its other name is a different answer to this question
    expect(checkAnswer(ask('treble-Ab4'), { kind: 'pitch-name', letter: 'G', sign: 'sharp' })).toBe(
      false,
    );
  });
  it('a natural card is answered with sign natural, and a letter answer is not accepted', () => {
    const q = ask('treble-F4');
    expect(correctAnswerOf(q)).toEqual({ kind: 'pitch-name', letter: 'F', sign: 'natural' });
    expect(checkAnswer(q, { kind: 'pitch-name', letter: 'F', sign: 'natural' })).toBe(true);
    expect(checkAnswer(q, { kind: 'letter', letter: 'F' })).toBe(false);
  });
  it('find-key-pitch wants the exact key: another octave or the neighbouring key is wrong', () => {
    const q: Question = { kind: 'find-key-pitch', card: 'treble-F#4', render: 'single' };
    expect(correctAnswerOf(q)).toEqual({ kind: 'pitch-key', midi: 66 });
    expect(checkAnswer(q, { kind: 'pitch-key', midi: 66 })).toBe(true);
    expect(checkAnswer(q, { kind: 'pitch-key', midi: 54 })).toBe(false); // F♯ an octave lower
    expect(checkAnswer(q, { kind: 'pitch-key', midi: 65 })).toBe(false); // plain F
    expect(checkAnswer(q, { kind: 'key', note: 'F4' })).toBe(false);
    const flat: Question = { kind: 'find-key-pitch', card: 'bass-Bb2', render: 'single' };
    expect(correctAnswerOf(flat)).toEqual({ kind: 'pitch-key', midi: cardMidi('bass-Bb2') });
    expect(cardMidi('bass-Bb2')).toBe(46); // one below B2 (47)
  });
  it('cardOf names the card', () => {
    expect(cardOf(ask('bass-C#3'))).toBe('bass-C#3');
    expect(cardOf({ kind: 'find-key-pitch', card: 'bass-C#3', render: 'single' })).toBe('bass-C#3');
  });

  describe('pitchOptions: the options rule, including every candidate it drops', () => {
    it('F♯ drops F♭ and E♯ (not names the course uses): F, G♯ remain, plus the answer', () => {
      expect(names('treble-F#4').sort()).toEqual(['F', 'F♯', 'G♯']);
    });
    it('C♯ drops C♭, B♯ and D♯: only C and the answer remain', () => {
      expect(names('treble-C#5').sort()).toEqual(['C', 'C♯']);
    });
    it('G♯ drops G♭: G, A♯ is not a name either, F♯ remains', () => {
      expect(names('treble-G#4').sort()).toEqual(['F♯', 'G', 'G♯']);
    });
    it('A♭ keeps A, G♭ is dropped, B♭ is kept (letter above with the flat sign)', () => {
      expect(names('treble-Ab4').sort()).toEqual(['A', 'A♭', 'B♭']);
    });
    it('B♭ keeps B and A♭ (letter below), drops B♯ and C♭', () => {
      expect(names('treble-Bb4').sort()).toEqual(['A♭', 'B', 'B♭']);
    });
    it('E♭ drops E♯, F♭ and D♭: only E and the answer remain', () => {
      expect(names('treble-Eb5').sort()).toEqual(['E', 'E♭']);
    });
    it('a natural card: its own sign candidate is dropped, ♯ kept, ♭ dropped, neighbours plain', () => {
      expect(names('treble-F4').sort()).toEqual(['E', 'F', 'F♯', 'G']);
      expect(names('treble-B4').sort()).toEqual(['A', 'B', 'C', 'B♭'].sort()); // B♯ dropped, B♭ kept
    });
    it('the right answer is always present exactly once, options are distinct and valid', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_CARDS),
          fc.integer({ min: 0, max: 2 ** 31 }),
          (c, seed) => {
            const opts = pitchOptions(c, mulberry32(seed));
            const right = correctAnswerOf(ask(c));
            if (right.kind !== 'pitch-name') return false;
            const keys = opts.map((o) => `${o.letter}${o.sign}`);
            return (
              new Set(keys).size === keys.length &&
              keys.filter((k) => k === `${right.letter}${right.sign}`).length === 1 &&
              opts.length >= 2 &&
              opts.length <= 4
            );
          },
        ),
      );
    });
    it('is deterministic for a seed, shuffles differently for other seeds', () => {
      expect(pitchOptions('treble-F#4', mulberry32(5))).toEqual(
        pitchOptions('treble-F#4', mulberry32(5)),
      );
      const orders = new Set(
        Array.from({ length: 30 }, (_, i) =>
          JSON.stringify(pitchOptions('treble-F4', mulberry32(i))),
        ),
      );
      expect(orders.size).toBeGreaterThan(1);
    });
    it('all 12 sign cards get at least 2 and at most 4 buttons', () => {
      for (const c of SIGN_CARDS) {
        const n = pitchOptions(c, mulberry32(3)).length;
        expect(n, c).toBeGreaterThanOrEqual(2);
        expect(n, c).toBeLessThanOrEqual(4);
      }
    });
  });
});
