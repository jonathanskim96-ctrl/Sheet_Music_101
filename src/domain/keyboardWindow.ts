import { letterOf, octaveOf, type Note } from './notes';

/** Unit 1 shows C3–B4 (CURRICULUM concept cards); question windows come from keyboardWindow. */
export const UNIT1_KEYBOARD: { from: Note; to: Note } = { from: 'C3', to: 'B4' };

/**
 * Two octaves, C(o)–B(o+1), that contain `n`: o is one octave lower for C, D and E so the
 * note is not stuck at the very edge, clamped to 2..5 (SPEC 4.17).
 */
export function keyboardWindow(n: Note): { from: Note; to: Note } {
  const letter = letterOf(n);
  const lowerFirst = letter === 'C' || letter === 'D' || letter === 'E';
  const o = Math.min(5, Math.max(2, octaveOf(n) - (lowerFirst ? 1 : 0)));
  return { from: `C${String(o)}` as Note, to: `B${String(o + 1)}` as Note };
}
