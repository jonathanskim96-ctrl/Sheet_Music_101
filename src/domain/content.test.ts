import { describe, expect, it } from 'vitest';
import curriculumMd from '../../docs/build/CURRICULUM.md?raw';
import { ALL_CARDS } from './cards';
import * as content from './content';
import {
  CHOICE_TEXT,
  CONCEPT_CARDS,
  CONCEPT_CARD_IDS,
  NICKNAMES,
  TIPS,
  alphabetNextPrompt,
  cardName,
  fillWrongPhrase,
  findOnStaffPrompt,
  importSavedOn,
  importSummaryLine,
  keyboardLetterPrompt,
  promptFor,
  saveFailedText,
  anyKeyWorks,
  stepSkipExplanation,
} from './content';
import type { Note } from './notes';
import type { Question } from './questions';

/** Every string value anywhere in the content module's data exports. */
function allStrings(v: unknown, out: Set<string> = new Set()): Set<string> {
  if (typeof v === 'string') out.add(v);
  else if (Array.isArray(v)) for (const x of v) allStrings(x, out);
  else if (typeof v === 'object' && v !== null)
    for (const x of Object.values(v)) allStrings(x, out);
  return out;
}

const section = (n: number): string => {
  const start = curriculumMd.indexOf(`\n## ${String(n)}.`);
  const next = curriculumMd.indexOf('\n## ', start + 5);
  return curriculumMd.slice(start, next === -1 ? undefined : next);
};

describe('concept cards match CURRICULUM.md section 3 exactly', () => {
  const rows = section(3)
    .split('\n')
    .filter((l) => /^\| c-/.test(l))
    .map((l) => l.split('|').map((c) => c.trim()))
    .map((cells) => ({ id: cells[1] ?? '', title: cells[2] ?? '', body: cells[3] ?? '' }));

  it('parses all 24 rows', () => {
    expect(rows).toHaveLength(24);
    expect(rows.map((r) => r.id)).toEqual(CONCEPT_CARD_IDS.slice(0, 24));
  });
  it.each(rows)('$id', ({ id, title, body }) => {
    const card = (CONCEPT_CARDS as Record<string, { title: string; body: string } | undefined>)[id];
    expect(card?.title).toBe(title);
    expect(card?.body).toBe(body);
  });
  it('only c-higher has a Play list, and it is the 8 rising notes', () => {
    const withPlay = CONCEPT_CARD_IDS.filter((id) => CONCEPT_CARDS[id].play !== undefined);
    expect(withPlay).toEqual(['c-higher']);
    expect(CONCEPT_CARDS['c-higher'].play).toEqual([
      'C4',
      'D4',
      'E4',
      'F4',
      'G4',
      'A4',
      'B4',
      'C5',
    ]);
  });
});

describe('part-2 concept cards match CURRICULUM.md section 11 exactly (the ones built so far)', () => {
  const rows = section(11)
    .split('\n')
    .filter((l) => /^\| c-/.test(l))
    .map((l) => l.split('|').map((c) => c.trim()))
    .map((cells) => ({ id: cells[1] ?? '', title: cells[2] ?? '', body: cells[3] ?? '' }));
  const built = rows.filter((r) => (CONCEPT_CARD_IDS as readonly string[]).includes(r.id));

  it('M10 built the seven sign cards, in the order of the table', () => {
    expect(built.map((r) => r.id)).toEqual([
      'c-sharp',
      'c-sharp-staff',
      'c-flat',
      'c-two-names',
      'c-bass-signs',
      'c-natural',
      'c-signs-grand',
    ]);
    expect(CONCEPT_CARD_IDS.slice(24)).toEqual(built.map((r) => r.id));
  });
  it.each(built)('$id', ({ id, title, body }) => {
    const card = (CONCEPT_CARDS as Record<string, { title: string; body: string } | undefined>)[id];
    expect(card?.title).toBe(title);
    expect(card?.body).toBe(body);
  });
});

describe('every quoted text in CURRICULUM.md section 12 exists in content.ts (as the milestones arrive)', () => {
  const have = allStrings(content);
  const quoted = [...new Set([...section(12).matchAll(/"([^"]+)"/g)].map((m) => m[1] ?? ''))];
  // Texts that belong to a later milestone (M11–M13), and examples/templates that are produced by
  // helper functions and checked by name below. Each time a milestone builds its texts, it moves
  // them out of this list so the check covers them (M10 STANDARDS note).
  const NOT_YET = new Set([
    'How many beats does this note last?',
    'How many beats does this rest last?',
    'How many beats does this pair last?',
    'Which lasts longer?',
    'First note',
    'Second note',
    'How many beats are in this box?',
    'Which one finishes the box?',
    'Which rhythm did you hear?',
    'Which note is marked?',
    'How does the marked note move?',
    'Which tune did you hear?',
    'How many letters apart are these notes?',
    'How many letters apart are these two notes?',
    'Are these notes played together?',
    'Together',
    'One after the other',
    'Is this a note stack?',
    'Yes, a stack',
    'No',
    'Which stack is this?',
    'Name its bottom note.',
    '1 beat',
    '2 beats',
    '3 beats',
    '4 beats',
    '2 letters',
    '3 letters',
    '4 letters',
    '5 letters',
    'Top rhythm',
    'Middle rhythm',
    'Bottom rhythm',
    'Top tune',
    'Middle tune',
    'Bottom tune',
    '1-beat note',
    '2-beat rest',
    'Play again',
    '2-beat note',
    '3-beat note',
    '4-beat note',
    'half-beat pair',
    '1-beat rest',
    '4-beat rest',
    'the first note',
    'a 2-beat note',
    'a 1-beat rest',
    'a',
    'the top one',
    'the middle one',
    'the bottom one',
    'step up',
    '3 letters apart',
    'together',
    'one after the other',
    'a stack',
    'not a stack',
    'the {Letter} stack',
    'The ♯ earlier in this box still counts.',
    'The ♭ earlier in this box still counts.',
    'The ♮ earlier in this box still counts.',
    'The home sign makes every {Letter} a {Letter}♯.',
    'New box: the sign from the last box is gone.',
    '1 + 1 + 2 = 4 beats.',
    'C-D-E: 3 letters apart.',
    'C-E-G: the C stack.',
    'Tap Play again to hear it once more.',
    'Turn on sound to hear this.',
    'Turn on sound',
    "You've finished the whole course! Keep your reading sharp with Practise.",
    // examples and templates of M10, covered by the named tests below
    'F♯',
    'B♭',
    'F',
    'Treble F♯',
    'Bass B♭',
    '♯: one key to the right of {Letter}.',
    '♭: one key to the left of {Letter}.',
    '♮: the plain {Letter} key.',
    'That key is also called {other name}.',
    'F♯/G♭',
    'C♯/D♭',
    'G♯/A♭',
    'A♯/B♭',
    'D♯/E♭',
    'That key is also called A♭.',
  ]);
  it('the list of pending texts only names strings that really are in section 12', () => {
    for (const s of NOT_YET) expect(quoted, s).toContain(s);
  });
  it.each(quoted.filter((s) => !NOT_YET.has(s)))('%s', (s) => {
    expect(have.has(s)).toBe(true);
  });
  it('sign lines and chart names are produced exactly as written', () => {
    expect(content.signLine('treble-F#4', false)).toBe('♯: one key to the right of F.');
    expect(content.signLine('bass-Bb2', false)).toBe('♭: one key to the left of B.');
    expect(content.signLine('treble-F4', true)).toBe('♮: the plain F key.');
    expect(content.signLine('treble-F4', false)).toBeNull();
    expect(content.pitchNameOfCard('treble-F#4')).toBe('F♯');
    expect(content.pitchNameOfCard('bass-Bb2')).toBe('B♭');
    expect(content.pitchNameOfCard('treble-C4')).toBe('C'); // never the nickname "Middle C"
  });
  it('"also called" names the other name of each black key', () => {
    expect(content.alsoCalled('treble-Ab4')).toBe('That key is also called G♯.');
    expect(content.alsoCalled('treble-G#4')).toBe('That key is also called A♭.');
    expect(content.alsoCalled('treble-F#4')).toBe('That key is also called G♭.');
    expect(content.alsoCalled('treble-C#5')).toBe('That key is also called D♭.');
    expect(content.alsoCalled('treble-Bb4')).toBe('That key is also called A♯.');
    expect(content.alsoCalled('treble-Eb5')).toBe('That key is also called D♯.');
    expect(content.alsoCalled('treble-C4')).toBeNull();
  });
  it('the Meet-card tips for sharps and flats match CURRICULUM section 7', () => {
    const md = section(7);
    expect(md).toContain(content.SHARP_TIP);
    expect(md).toContain(content.FLAT_TIP);
  });
});

describe('every quoted text in CURRICULUM.md section 5 exists in content.ts', () => {
  const have = allStrings(content);
  const quoted = [...section(5).matchAll(/"([^"]+)"/g)]
    .map((m) => (m[1] ?? '').replace(/\s+/g, ' '))
    // drop connective fragments between two quoted strings and template strings (tested below)
    .filter((s) => !s.startsWith(' ') && !s.endsWith(' ') && !s.includes('{'));
  it('finds a useful number of strings', () => {
    expect(quoted.length).toBeGreaterThan(50);
  });
  it.each([...new Set(quoted)])('%s', (s) => {
    // Button labels of choice answers appear capitalised in BUTTON_LABELS; the lower-case
    // forms used inside "It's {X}." live in CHOICE_TEXT.
    expect(have.has(s)).toBe(true);
  });
  it('template strings are produced by the helper functions', () => {
    expect(findOnStaffPrompt('G')).toBe('Put a G on the staff.');
    expect(alphabetNextPrompt('after', 'G')).toBe('Which letter comes after G?');
    expect(alphabetNextPrompt('before', 'A')).toBe('Which letter comes before A?');
    expect(keyboardLetterPrompt('F')).toBe('Tap a F key.');
    expect(saveFailedText('disk full')).toBe("Couldn't save your progress: disk full");
    expect(importSavedOn('12 Oct 2026')).toBe('Saved on 12 Oct 2026');
    expect(importSummaryLine(135, 9, 9)).toBe('135 XP · 9 lessons · 9 days practised');
    expect(content.WRONG_PHRASES).toEqual([
      "Almost! It's {X}.",
      'Not quite. This one is {X}.',
      "Good try! It's {X}.",
      'Close! The answer is {X}.',
    ]);
    expect(fillWrongPhrase("Almost! It's {X}.", 'Treble G')).toBe("Almost! It's Treble G.");
  });
  it('has the 10 correct phrases and 4 wrong phrases', () => {
    expect(content.CORRECT_PHRASES).toHaveLength(10);
    expect(content.WRONG_PHRASES).toHaveLength(4);
    for (const p of content.WRONG_PHRASES) expect(p).toContain('{X}');
  });
  it('choice text uses the forms from CURRICULUM section 5', () => {
    expect(CHOICE_TEXT.line).toBe('a line');
    expect(CHOICE_TEXT.second).toBe('the second note');
    expect(CHOICE_TEXT['step-up']).toBe('step up');
    expect(Object.keys(CHOICE_TEXT)).toHaveLength(10);
  });
  it('combo milestones are 3, 5, 10', () => {
    expect(content.COMBO_MILESTONES).toEqual([
      { at: 3, text: '3 in a row!' },
      { at: 5, text: '5 in a row!' },
      { at: 10, text: '10 in a row!' },
    ]);
  });
});

describe('nicknames and tips', () => {
  it('nicknames are exactly the eight landmarks', () => {
    expect(NICKNAMES).toEqual({
      'treble-C4': 'Middle C',
      'bass-C4': 'Middle C',
      'treble-G4': 'Treble G',
      'treble-C5': 'Treble C',
      'treble-C6': 'High C',
      'bass-F3': 'Bass F',
      'bass-C3': 'Bass C',
      'bass-C2': 'Low C',
    });
  });
  it('every nickname and tip belongs to a real card, and tips match nicknames', () => {
    for (const k of Object.keys(NICKNAMES)) expect(ALL_CARDS).toContain(k);
    for (const k of Object.keys(TIPS)) expect(ALL_CARDS).toContain(k);
    expect(Object.keys(TIPS).sort()).toEqual(Object.keys(NICKNAMES).sort());
  });
  it('tips match CURRICULUM.md section 4 word for word', () => {
    const md = section(4);
    for (const tip of Object.values(TIPS)) expect(md).toContain(tip);
  });
  it('cardName gives the nickname or the letter', () => {
    expect(cardName('treble-G4')).toBe('Treble G');
    expect(cardName('bass-C4')).toBe('Middle C');
    expect(cardName('treble-E4')).toBe('E');
    expect(cardName('bass-D2')).toBe('D');
    expect(cardName('treble-B5')).toBe('B');
    expect(cardName('treble-F#4')).toBe('F\u266F');
    expect(cardName('bass-Eb3')).toBe('E\u266D');
  });
});

describe('promptFor', () => {
  const cases: [Question, string][] = [
    [{ kind: 'name-note', card: 'treble-C4', render: 'single' }, 'Which note is this?'],
    [
      { kind: 'find-key-letter', card: 'treble-C4', render: 'single' },
      'Tap this note on the piano.',
    ],
    [
      { kind: 'find-key-exact', card: 'treble-C4', render: 'single' },
      'Tap this exact key on the piano.',
    ],
    [{ kind: 'find-on-staff', card: 'bass-F3' }, 'Put a F on the staff.'],
    [
      { kind: 'step-skip', clef: 'treble', first: 'E4', second: 'F4', buttons: 2 },
      'Does the second note step up or step down?',
    ],
    [
      { kind: 'step-skip', clef: 'treble', first: 'E4', second: 'G4', buttons: 4 },
      'How does the second note move?',
    ],
    [{ kind: 'alphabet-next', letter: 'G', direction: 'after' }, 'Which letter comes after G?'],
    [{ kind: 'keyboard-letter', letter: 'D' }, 'Tap a D key.'],
    [{ kind: 'line-or-space', position: 3 }, 'Is this note on a line or in a space?'],
    [{ kind: 'higher-lower', first: 'C4', second: 'E4' }, 'Which note is higher?'],
    [{ kind: 'clef-identify', clef: 'bass' }, 'Which clef is this?'],
    [
      {
        kind: 'name-accidental',
        card: 'treble-F#4',
        render: 'single',
        showNatural: false,
        options: [],
      },
      'Which note is this?',
    ],
    [
      { kind: 'find-key-pitch', card: 'treble-F#4', render: 'single' },
      'Tap this exact key on the piano.',
    ],
  ];
  it.each(cases)('%j', (q, text) => {
    expect(promptFor(q)).toBe(text);
  });
});

describe('error texts', () => {
  it('uses the message of an Error or a string, else "Unknown error"', () => {
    expect(content.errorMessageOf(new Error('boom'))).toBe('boom');
    expect(content.errorMessageOf('bad')).toBe('bad');
    expect(content.errorMessageOf(new Error(''))).toBe('Unknown error');
    expect(content.errorMessageOf({ message: 'x' })).toBe('Unknown error');
    expect(content.somethingWentWrong(new Error('boom'))).toBe('Something went wrong: boom');
  });
});

describe('M6 feedback lines', () => {
  const move = (clef: 'treble' | 'bass', first: string, second: string): string =>
    stepSkipExplanation({
      kind: 'step-skip',
      clef,
      first: first as Note,
      second: second as Note,
      buttons: 4,
    });

  it('names a step as line to space or space to line', () => {
    expect(move('treble', 'E4', 'F4')).toBe("It's a step up: line to space.");
    expect(move('treble', 'F4', 'E4')).toBe("It's a step down: space to line.");
  });
  it('names a skip as line to line or space to space', () => {
    expect(move('treble', 'E4', 'G4')).toBe("It's a skip up: line to line.");
    expect(move('treble', 'A4', 'F4')).toBe("It's a skip down: space to space.");
  });
  it('treats notes on ledger lines and just outside the staff correctly', () => {
    // treble C4 is on a ledger line (position -2), B3 in the space below it (-3)
    expect(move('treble', 'C4', 'D4')).toBe("It's a step up: line to space.");
    expect(move('treble', 'D4', 'B3')).toBe("It's a skip down: space to space.");
    // bass: C4 sits on the ledger line above the staff (position 10)
    expect(move('bass', 'A3', 'C4')).toBe("It's a skip up: line to line.");
  });
  it('says any key of the letter works', () => {
    expect(anyKeyWorks('D')).toBe('Any D key works.');
  });
});
