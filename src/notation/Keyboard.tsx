import type { KeyboardEvent } from 'react';
import { diatonicIndex, letterOf, midiNumber, noteFromDiatonic, type Note } from '../domain/notes';
import styles from './Keyboard.module.css';

export type KeyState = 'normal' | 'highlight' | 'wrong' | 'dimmed';

/** What a key press reports: the white key's note, or a black key's MIDI number (SPEC 8.5). */
export type KeyPress = { note: Note } | { black: number };

/** Part-1 questions treat every black key alike: a white key's note, or 'black'. */
export function pressedNote(k: KeyPress): Note | 'black' {
  return 'note' in k ? k.note : 'black';
}

/** Spoken names of the five black keys, keyed by the white key just before them. */
const BLACK_NAMES: Record<string, { sharp: string; flat: string }> = {
  C: { sharp: 'C\u266F', flat: 'D\u266D' },
  D: { sharp: 'D\u266F', flat: 'E\u266D' },
  F: { sharp: 'F\u266F', flat: 'G\u266D' },
  G: { sharp: 'G\u266F', flat: 'A\u266D' },
  A: { sharp: 'A\u266F', flat: 'B\u266D' },
};

export interface KeyboardProps {
  /** First and last white key shown (both inclusive). */
  from: Note;
  to: Note;
  states?: Partial<Record<Note, KeyState>>;
  /** State of the black key just after a white key (keyed by that white key). */
  blackStates?: Partial<Record<Note, KeyState>>;
  /** Writes the letter on every white key, not only on the Cs (concept cards). */
  labelAll?: boolean;
  /** Writes both names on every black key ("F♯" over "G♭"; concept cards). */
  blackLabels?: boolean;
  /** Called with the white key's note, or the black key's MIDI number. */
  onPress?: (key: KeyPress) => void;
  /** Ignores presses (while feedback is showing). */
  disabled?: boolean;
  ariaLabel?: string;
}

// Taller than a real key (owner decision 2026-10-13) so a 14-key window is ~150 px on a phone.
const KEY_HEIGHT = 5.8;
const BLACK_WIDTH = 0.6;
const BLACK_HEIGHT = 3.6;

/** All white keys from `from` to `to` inclusive (empty if the range is backwards). */
export function whiteKeys(from: Note, to: Note): Note[] {
  const out: Note[] = [];
  for (let i = diatonicIndex(from); i <= diatonicIndex(to); i++) {
    const n = noteFromDiatonic(i);
    if (n) out.push(n);
  }
  return out;
}

/** A piano keyboard drawn in SVG; every key is a keyboard-focusable button. */
export function Keyboard({
  from,
  to,
  states = {},
  blackStates = {},
  labelAll = false,
  blackLabels = false,
  onPress,
  disabled = false,
  ariaLabel = 'Piano keyboard',
}: KeyboardProps) {
  const keys = whiteKeys(from, to);
  const width = Math.max(keys.length, 1);
  const press = (k: KeyPress) => {
    if (!disabled) onPress?.(k);
  };
  const onKey = (e: KeyboardEvent<SVGGElement>, k: KeyPress) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      press(k);
    }
  };
  const stateClass = (s: KeyState | undefined) => (s && s !== 'normal' ? styles[s] : undefined);

  return (
    <svg
      className={styles['svg']}
      viewBox={`0 0 ${String(width)} ${String(KEY_HEIGHT)}`}
      role="group"
      aria-label={ariaLabel}
      data-testid="keyboard"
    >
      {keys.map((note, i) => {
        const isC = letterOf(note) === 'C';
        return (
          <g
            key={note}
            className={`${styles['key'] ?? ''} ${stateClass(states[note]) ?? ''}`}
            role="button"
            tabIndex={0}
            aria-label={note === 'C4' ? `${letterOf(note)}, Middle C` : letterOf(note)}
            aria-disabled={disabled}
            data-note={note}
            data-key-state={states[note] ?? 'normal'}
            onClick={() => {
              press({ note });
            }}
            onKeyDown={(e) => {
              onKey(e, { note });
            }}
          >
            <rect
              className={styles['white']}
              x={i}
              y={0}
              width={1}
              height={KEY_HEIGHT}
              rx={0.08}
              strokeWidth={0.03}
            />
            {(isC || labelAll) && (
              <text className={styles['label']} x={i + 0.5} y={KEY_HEIGHT - 0.2} fontSize={0.42}>
                {letterOf(note)}
              </text>
            )}
            {note === 'C4' && (
              <circle className={styles['dot']} cx={i + 0.5} cy={KEY_HEIGHT - 0.9} r={0.1} />
            )}
          </g>
        );
      })}
      {keys.map((note, i) => {
        const names = BLACK_NAMES[letterOf(note)];
        if (i === keys.length - 1 || names === undefined) return null;
        const black = midiNumber(note) + 1;
        return (
          <g
            key={`black-${note}`}
            className={`${styles['key'] ?? ''} ${stateClass(blackStates[note]) ?? ''}`}
            role="button"
            tabIndex={0}
            aria-label={`${names.sharp} / ${names.flat}`}
            aria-disabled={disabled}
            data-black={black}
            data-key-state={blackStates[note] ?? 'normal'}
            onClick={() => {
              press({ black });
            }}
            onKeyDown={(e) => {
              onKey(e, { black });
            }}
          >
            <rect
              className={styles['black']}
              x={i + 1 - BLACK_WIDTH / 2}
              y={0}
              width={BLACK_WIDTH}
              height={BLACK_HEIGHT}
              rx={0.06}
              strokeWidth={0.03}
            />
            {blackLabels && (
              <>
                <text
                  className={styles['blackLabel']}
                  x={i + 1}
                  y={BLACK_HEIGHT - 0.85}
                  fontSize={0.24}
                >
                  {names.sharp}
                </text>
                <text
                  className={styles['blackLabel']}
                  x={i + 1}
                  y={BLACK_HEIGHT - 0.4}
                  fontSize={0.24}
                >
                  {names.flat}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
