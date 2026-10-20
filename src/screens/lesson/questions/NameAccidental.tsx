import { parseCardId } from '../../../domain/cards';
import { pitchName } from '../../../domain/notes';
import type { PitchOption } from '../../../domain/questions';
import { correctAnswerOf } from '../../../domain/questions';
import { Staff } from '../../../notation/Staff';
import { Button } from '../../../ui/Button';
import type { ResultState } from './LetterPad';
import type { KindProps } from './types';
import styles from './questions.module.css';

const nameOf = (o: PitchOption): string => pitchName({ note: `${o.letter}4`, sign: o.sign });

/** A note on the staff (with its ♯, ♭ or ♮); the learner picks its name from 2–4 buttons. */
export function NameAccidental({ q, answered, send }: KindProps<'name-accidental'>) {
  const parts = parseCardId(q.card);
  if (!parts) throw new Error(`Unknown card: ${q.card}`);
  const right = correctAnswerOf(q);
  const printed = parts.sign !== 'natural' ? parts.sign : q.showNatural ? 'natural' : undefined;

  const stateOf = (o: PitchOption): ResultState | undefined => {
    if (!answered || right.kind !== 'pitch-name') return undefined;
    if (o.letter === right.letter && o.sign === right.sign) return 'correct';
    const a = answered.answer;
    if (a.kind === 'pitch-name' && a.letter === o.letter && a.sign === o.sign) return 'wrong';
    return undefined;
  };

  return (
    <>
      <Staff
        mode={q.render === 'grand' ? 'grand' : parts.clef}
        notes={[
          {
            clef: parts.clef,
            note: parts.note,
            ...(printed !== undefined ? { sign: printed } : {}),
            state: answered ? (answered.correct ? 'correct' : 'wrong') : 'normal',
          },
        ]}
        shake={answered?.correct === false}
      />
      <div
        className={`${styles['choices'] ?? ''} ${q.options.length > 2 ? (styles['choicesGrid'] ?? '') : ''}`}
        role="group"
        aria-label="Choose an answer"
      >
        {q.options.map((o) => {
          const state = stateOf(o);
          return (
            <Button
              key={`${o.letter}-${o.sign}`}
              variant="choice"
              fullWidth
              {...(state ? { state } : {})}
              onClick={() => {
                send({ kind: 'pitch-name', letter: o.letter, sign: o.sign });
              }}
            >
              {nameOf(o)}
            </Button>
          );
        })}
      </div>
    </>
  );
}
