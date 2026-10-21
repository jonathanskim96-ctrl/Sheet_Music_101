import { EVENT_NAMES } from '../../../domain/content';
import { correctAnswerOf } from '../../../domain/questions';
import { Music } from '../../../notation/Music';
import { rhythmScore, unfinishedBoxScore } from '../../../notation/musicDraw';
import { PictureChoices } from './PictureChoices';
import type { KindProps } from './types';

/** A box with a gap at the end; the learner picks the note or rest that fills it. */
export function FinishBox({ q, answered, send }: KindProps<'finish-box'>) {
  const right = correctAnswerOf(q);
  const stateAt = (i: number): 'correct' | 'wrong' | undefined => {
    if (!answered || right.kind !== 'option') return undefined;
    if (i === right.index) return 'correct';
    return answered.answer.kind === 'option' && answered.answer.index === i ? 'wrong' : undefined;
  };
  return (
    <>
      <Music mode="rhythm" score={unfinishedBoxScore(q.box, q.time)} ariaLabel="A box with a gap" />
      <PictureChoices
        row
        options={q.options.map((t, i) => {
          const state = stateAt(i);
          return {
            name: EVENT_NAMES[t],
            picture: <Music mode="rhythm" score={rhythmScore([t], 4)} showTime={false} />,
            ...(state ? { state } : {}),
          };
        })}
        onPick={(index) => {
          send({ kind: 'option', index });
        }}
      />
    </>
  );
}
