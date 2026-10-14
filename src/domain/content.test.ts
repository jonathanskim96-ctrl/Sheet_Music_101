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
    expect(rows.map((r) => r.id)).toEqual([...CONCEPT_CARD_IDS]);
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
