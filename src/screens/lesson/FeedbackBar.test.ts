import { describe, expect, it } from 'vitest';
import { shownCard } from './FeedbackBar';

describe('shownCard', () => {
  it('keeps the sign of a sign card', () => {
    const q = { kind: 'find-on-staff', card: 'treble-F#4' } as const;
    expect(shownCard(q, { kind: 'position', position: 7 })).toBe('treble-F#4');
    expect(
      shownCard(
        { kind: 'name-note', card: 'bass-Bb2', render: 'single' },
        { kind: 'letter', letter: 'B' },
      ),
    ).toBe('bass-Bb2');
  });

  it('still moves a natural find-on-staff card to the nearest right note', () => {
    const q = { kind: 'find-on-staff', card: 'treble-G4' } as const;
    expect(shownCard(q, { kind: 'position', position: 8 })).toBe('treble-G5');
  });
});
