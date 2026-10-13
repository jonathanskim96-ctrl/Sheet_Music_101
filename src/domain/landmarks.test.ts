import { describe, expect, it } from 'vitest';
import { ALL_CARDS, cardId, parseCardId, type CardId } from './cards';
import { LANDMARKS, describePosition, hintFor } from './landmarks';
import type { Clef, Note } from './notes';
import { emptyProgress, type Progress } from './progress';

const learned = (...ids: CardId[]): Progress => {
  const p = emptyProgress('2026-10-12');
  for (const id of ids) {
    p.cards[id] = {
      box: 1,
      lastSeenDay: '2026-10-12',
      lastPromotedDay: null,
      seen: 1,
      correct: 1,
      avgMs: 1000,
    };
  }
  return p;
};

const SENTENCES: [Clef, Note, string][] = [
  ['treble', 'A3', 'It sits on ledger line 2 below the staff.'],
  ['treble', 'B3', 'It sits just below ledger line 1 under the staff.'],
  ['treble', 'C4', 'It sits on ledger line 1 below the staff.'],
  ['treble', 'D4', 'It sits just below the staff.'],
  ['treble', 'E4', 'It sits on line 1 (counting from the bottom).'],
  ['treble', 'F4', 'It sits in space 1 (counting from the bottom).'],
  ['treble', 'G4', 'It sits on line 2 (counting from the bottom).'],
  ['treble', 'A4', 'It sits in space 2 (counting from the bottom).'],
  ['treble', 'B4', 'It sits on line 3 (counting from the bottom).'],
  ['treble', 'C5', 'It sits in space 3 (counting from the bottom).'],
  ['treble', 'D5', 'It sits on line 4 (counting from the bottom).'],
  ['treble', 'E5', 'It sits in space 4 (counting from the bottom).'],
  ['treble', 'F5', 'It sits on line 5 (counting from the bottom).'],
  ['treble', 'G5', 'It sits just above the staff.'],
  ['treble', 'A5', 'It sits on ledger line 1 above the staff.'],
  ['treble', 'B5', 'It sits just above ledger line 1 over the staff.'],
  ['treble', 'C6', 'It sits on ledger line 2 above the staff.'],
  ['bass', 'C2', 'It sits on ledger line 2 below the staff.'],
  ['bass', 'D2', 'It sits just below ledger line 1 under the staff.'],
  ['bass', 'E2', 'It sits on ledger line 1 below the staff.'],
  ['bass', 'F2', 'It sits just below the staff.'],
  ['bass', 'G2', 'It sits on line 1 (counting from the bottom).'],
  ['bass', 'A2', 'It sits in space 1 (counting from the bottom).'],
  ['bass', 'B2', 'It sits on line 2 (counting from the bottom).'],
  ['bass', 'C3', 'It sits in space 2 (counting from the bottom).'],
  ['bass', 'D3', 'It sits on line 3 (counting from the bottom).'],
  ['bass', 'E3', 'It sits in space 3 (counting from the bottom).'],
  ['bass', 'F3', 'It sits on line 4 (counting from the bottom).'],
  ['bass', 'G3', 'It sits in space 4 (counting from the bottom).'],
  ['bass', 'A3', 'It sits on line 5 (counting from the bottom).'],
  ['bass', 'B3', 'It sits just above the staff.'],
  ['bass', 'C4', 'It sits on ledger line 1 above the staff.'],
  ['bass', 'D4', 'It sits just above ledger line 1 over the staff.'],
  ['bass', 'E4', 'It sits on ledger line 2 above the staff.'],
];

describe('describePosition (all 34 cards)', () => {
  it('has a row for every card', () => {
    expect(SENTENCES.map(([c, n]) => cardId(c, n))).toEqual([...ALL_CARDS]);
  });
  it.each(SENTENCES)('%s %s', (clef, note, sentence) => {
    expect(describePosition(clef, note)).toBe(sentence);
  });
});

describe('LANDMARKS', () => {
  it('are real cards, four per clef, low to high', () => {
    for (const clef of ['treble', 'bass'] as const) {
      expect(LANDMARKS[clef]).toHaveLength(4);
      for (const id of LANDMARKS[clef]) expect(parseCardId(id)?.clef).toBe(clef);
    }
  });
});

describe('hintFor', () => {
  const all = [...LANDMARKS.treble, ...LANDMARKS.bass];
  it('is null when no landmark is learned', () => {
    expect(hintFor('treble-D4', emptyProgress('2026-10-12'))).toBeNull();
    expect(hintFor('treble-D4', learned('bass-C3'))).toBeNull(); // wrong clef only
  });
  it('is null for a landmark card itself, even if others are learned', () => {
    expect(hintFor('treble-C4', learned(...all))).toBeNull();
    expect(hintFor('bass-F3', learned(...all))).toBeNull();
    expect(hintFor('bass-C4', learned())).toBeNull();
  });
  it('uses singular for one step and plural for more', () => {
    expect(hintFor('treble-A4', learned(...all))).toBe("It's one step above Treble G.");
    expect(hintFor('treble-B4', learned(...all))).toBe("It's one step below Treble C.");
    expect(hintFor('treble-F4', learned(...all))).toBe("It's one step below Treble G.");
    expect(hintFor('bass-E4', learned(...all))).toBe("It's 2 steps above Middle C.");
  });
  it('ties go to the lower landmark', () => {
    // treble E4 is 2 steps from both Middle C and Treble G
    expect(hintFor('treble-E4', learned(...all))).toBe("It's 2 steps above Middle C.");
    // bass D3... Bass C (21) is 1 away, so no tie; bass A2 (19): C2 is 5, C3 is 2
    expect(hintFor('bass-A2', learned(...all))).toBe("It's 2 steps below Bass C.");
  });
  it('only considers landmarks that are learned', () => {
    expect(hintFor('treble-G5', learned('treble-C5'))).toBe("It's 4 steps above Treble C.");
    expect(hintFor('treble-G5', learned('treble-C5', 'treble-C6'))).toBe(
      "It's 3 steps below High C.",
    );
    expect(hintFor('treble-D4', learned('treble-G4'))).toBe("It's 3 steps below Treble G.");
    expect(hintFor('bass-F2', learned('bass-C2'))).toBe("It's 3 steps above Low C.");
  });
  it('names Middle C for the bass clef too', () => {
    expect(hintFor('bass-B3', learned('bass-C4'))).toBe("It's one step below Middle C.");
  });
  it('every non-landmark card gets a hint once all landmarks are learned', () => {
    const p = learned(...all);
    for (const id of ALL_CARDS) {
      const h = hintFor(id, p);
      if (all.includes(id)) expect(h).toBeNull();
      else expect(h, id).toMatch(/^It's (one step|\d+ steps) (above|below) .+\.$/);
    }
  });
  it('does not mutate progress', () => {
    const p = learned(...all);
    const copy = JSON.stringify(p);
    hintFor('treble-D4', p);
    expect(JSON.stringify(p)).toBe(copy);
  });
});
