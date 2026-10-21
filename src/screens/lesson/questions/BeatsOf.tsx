import type { ChoiceValue } from '../../../domain/questions';
import { Music } from '../../../notation/Music';
import { rhythmScore } from '../../../notation/musicDraw';
import { BeatButtons } from './BeatButtons';
import type { ResultState } from './LetterPad';
import type { KindProps } from './types';

/** One note, rest or pair on the rhythm line; the learner says how many beats it lasts. */
export function BeatsOf({
  q,
  send,
  states,
}: KindProps<'beats-of'> & { states: Partial<Record<ChoiceValue, ResultState>> }) {
  return (
    <>
      <Music mode="rhythm" score={rhythmScore([q.token], 4)} showTime={false} />
      <BeatButtons send={send} states={states} />
    </>
  );
}
