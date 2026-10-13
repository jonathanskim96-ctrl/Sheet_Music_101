import { useState } from 'react';
import { parseCardId } from '../../../domain/cards';
import { PROMPTS } from '../../../domain/content';
import { noteAtPosition } from '../../../domain/notes';
import { nearestCorrectPosition } from '../../../domain/questions';
import { Staff, type NoteState, type StaffNote } from '../../../notation/Staff';
import { Button } from '../../../ui/Button';
import type { KindProps } from './types';
import styles from './questions.module.css';

const LOWEST = -4;
const HIGHEST = 12;

/** "Put a G on the staff": tap a spot, nudge it with ▲ ▼, then Check. */
export function FindOnStaff({ q, answered, send }: KindProps<'find-on-staff'>) {
  const parts = parseCardId(q.card);
  if (!parts) throw new Error(`Unknown card: ${q.card}`);
  const { clef } = parts;
  const [placed, setPlaced] = useState<number | null>(null);
  const locked = answered !== null;
  const given = answered?.answer.kind === 'position' ? answered.answer.position : placed;

  const noteAt = (position: number, state: NoteState, column: number): StaffNote[] => {
    const note = noteAtPosition(clef, position);
    return note === null ? [] : [{ clef, note, state, column }];
  };
  let notes: StaffNote[] = [];
  if (given !== null) {
    if (!answered) notes = noteAt(given, 'ghost', 0);
    else if (answered.correct) notes = noteAt(given, 'correct', 0);
    else {
      // The learner's note beside the nearest right one, so the gap is easy to see.
      notes = [
        ...noteAt(given, 'wrong', 0),
        ...noteAt(nearestCorrectPosition(q.card, given), 'correct', 1),
      ];
    }
  }

  const move = (by: number) => {
    if (placed !== null) setPlaced(Math.min(HIGHEST, Math.max(LOWEST, placed + by)));
  };

  return (
    <>
      <p className={styles['helper']}>{PROMPTS.findOnStaffHelper}</p>
      <Staff
        mode={clef}
        notes={notes}
        columns={2}
        {...(locked ? {} : { onTapPosition: setPlaced })}
        shake={answered?.correct === false}
      />
      <div className={styles['nudges']}>
        <Button
          variant="secondary"
          fullWidth
          disabled={locked || placed === null || placed >= HIGHEST}
          ariaLabel="Move the note up"
          onClick={() => {
            move(1);
          }}
        >
          ▲
        </Button>
        <Button
          variant="secondary"
          fullWidth
          disabled={locked || placed === null || placed <= LOWEST}
          ariaLabel="Move the note down"
          onClick={() => {
            move(-1);
          }}
        >
          ▼
        </Button>
      </div>
      <Button
        fullWidth
        disabled={locked || placed === null}
        onClick={() => {
          if (placed !== null) send({ kind: 'position', position: placed });
        }}
      >
        Check
      </Button>
    </>
  );
}
