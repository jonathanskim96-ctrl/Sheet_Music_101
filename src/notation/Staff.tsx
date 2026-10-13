import type { KeyboardEvent } from 'react';
import type { Clef, Note } from '../domain/notes';
import { staffPosition } from '../domain/notes';
import { GLYPHS } from './glyphs';
import {
  BRACE_SCALE,
  K,
  LEDGER_LENGTH,
  LEDGER_WIDTH,
  LINE_WIDTH,
  NOTE_WIDTH,
  S,
  TAP_POSITIONS,
  clefOriginY,
  layoutStaff,
  ledgerPositions,
  staveFor,
  yOf,
  type StaffMode,
} from './geometry';
import styles from './Staff.module.css';

export type NoteState =
  | 'normal'
  | 'correct'
  | 'wrong'
  | 'ghost'
  | 'mastery-new'
  | 'mastery-learning'
  | 'mastery-almost'
  | 'mastery-known';

export interface StaffNote {
  clef: Clef;
  note: Note;
  state?: NoteState;
}

export interface StaffProps {
  mode: StaffMode;
  notes: readonly StaffNote[];
  /** Makes the staff tappable (single staves only): called with a position from -4 to 12. */
  onTapPosition?: (position: number) => void;
  /** Staff lines 1–5 (bottom to top) drawn in the accent colour (concept cards). */
  highlightLines?: readonly number[];
  /** Writes 1–5 on the five lines (concept card "The staff"). */
  lineNumbers?: boolean;
  /** Words to the left of the note at the same index (concept card "Lines and spaces"). */
  noteLabels?: readonly string[];
  ariaLabel?: string;
  /** Plays the 300 ms shake after a wrong answer. */
  shake?: boolean;
}

const STATE_CLASS: Record<NoteState, string> = {
  normal: styles['ink'] ?? '',
  correct: styles['correct'] ?? '',
  wrong: styles['wrong'] ?? '',
  ghost: `${styles['ink'] ?? ''} ${styles['ghost'] ?? ''}`,
  'mastery-new': styles['masteryNew'] ?? '',
  'mastery-learning': styles['masteryLearning'] ?? '',
  'mastery-almost': styles['masteryAlmost'] ?? '',
  'mastery-known': styles['masteryKnown'] ?? '',
};

/** A music staff drawn from the Bravura glyphs; notes are whole notes only. */
export function Staff({
  mode,
  notes,
  onTapPosition,
  highlightLines,
  lineNumbers = false,
  noteLabels,
  ariaLabel = notes.length === 1 ? 'Music staff with one note' : 'Music staff',
  shake = false,
}: StaffProps) {
  const layout = layoutStaff(mode, notes.length);
  const { width, height, x0, clefX, staves } = layout;
  const interactive = onTapPosition !== undefined && mode !== 'grand';
  const firstStave = staves[0];
  const lastStave = staves[staves.length - 1];

  const onBandKey = (e: KeyboardEvent<SVGRectElement>, p: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onTapPosition?.(p);
    }
  };

  return (
    <div className={styles['paper']}>
      <svg
        className={`${styles['svg'] ?? ''} ${shake ? (styles['shake'] ?? '') : ''}`}
        viewBox={`0 0 ${String(width)} ${String(height)}`}
        role={interactive ? 'group' : 'img'}
        aria-label={ariaLabel}
        data-testid="staff"
      >
        {staves.map((stave) => (
          <g key={stave.clef ?? 'none'}>
            {[0, 2, 4, 6, 8].map((p, i) => (
              <line
                key={p}
                x1={x0}
                x2={width}
                y1={yOf(stave.bottomLineY, p)}
                y2={yOf(stave.bottomLineY, p)}
                strokeWidth={LINE_WIDTH}
                className={
                  highlightLines?.includes(i + 1) ? styles['lineHighlight'] : styles['line']
                }
              />
            ))}
            {stave.clef !== null && (
              <path
                className={styles['ink']}
                strokeWidth={0}
                d={GLYPHS[stave.clef === 'treble' ? 'gClef' : 'fClef'].d}
                transform={`translate(${String(clefX)} ${String(clefOriginY(stave))}) scale(${String(K)} ${String(-K)})`}
              />
            )}
          </g>
        ))}
        {lineNumbers &&
          firstStave &&
          [0, 2, 4, 6, 8].map((p, i) => (
            <g key={`n${String(p)}`}>
              <circle
                className={styles['numberDisc']}
                cx={10}
                cy={yOf(firstStave.bottomLineY, p)}
                r={5.5}
              />
              <text
                className={styles['numberText']}
                x={10}
                y={yOf(firstStave.bottomLineY, p) + 2.6}
                textAnchor="middle"
              >
                {i + 1}
              </text>
            </g>
          ))}
        {mode === 'grand' && firstStave && lastStave && (
          <>
            <line
              className={styles['line']}
              x1={x0}
              x2={x0}
              y1={yOf(firstStave.bottomLineY, 8)}
              y2={lastStave.bottomLineY}
              strokeWidth={0.16 * S}
            />
            <path
              className={styles['ink']}
              strokeWidth={0}
              d={GLYPHS.brace.d}
              transform={`translate(0 ${String(lastStave.bottomLineY)}) scale(${String(BRACE_SCALE)} ${String(-BRACE_SCALE)})`}
            />
          </>
        )}
        {notes.map((n, i) => {
          const stave = staveFor(layout, n.clef);
          const p = staffPosition(n.clef, n.note);
          const x = layout.noteXs[i] ?? 0;
          const y = yOf(stave.bottomLineY, p);
          const state = n.state ?? 'normal';
          return (
            <g key={`${n.clef}-${n.note}-${String(i)}`} className={STATE_CLASS[state]}>
              {ledgerPositions(p).map((q) => (
                <line
                  key={q}
                  className={styles['ledger']}
                  x1={x - LEDGER_LENGTH / 2}
                  x2={x + LEDGER_LENGTH / 2}
                  y1={yOf(stave.bottomLineY, q)}
                  y2={yOf(stave.bottomLineY, q)}
                  strokeWidth={LEDGER_WIDTH}
                />
              ))}
              {noteLabels?.[i] !== undefined && (
                <text
                  className={styles['text']}
                  x={x - NOTE_WIDTH / 2 - 4}
                  y={y + 3}
                  textAnchor="end"
                >
                  {noteLabels[i]}
                </text>
              )}
              <path
                strokeWidth={0}
                d={GLYPHS.noteheadWhole.d}
                transform={`translate(${String(x - NOTE_WIDTH / 2)} ${String(y)}) scale(${String(K)} ${String(-K)})`}
              />
            </g>
          );
        })}
        {interactive &&
          firstStave &&
          TAP_POSITIONS.map((p) => (
            <rect
              key={p}
              className={styles['band']}
              x={0}
              y={yOf(firstStave.bottomLineY, p) - S / 4}
              width={width}
              height={S / 2}
              role="button"
              tabIndex={0}
              aria-label={`Position ${String(p)}`}
              data-position={p}
              onClick={() => {
                onTapPosition(p);
              }}
              onKeyDown={(e) => {
                onBandKey(e, p);
              }}
            />
          ))}
      </svg>
    </div>
  );
}
