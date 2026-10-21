import { boxBeats, type ChoiceValue } from '../../../domain/questions';
import type { Time } from '../../../domain/music';
import { Music } from '../../../notation/Music';
import { rhythmScore } from '../../../notation/musicDraw';
import { BeatButtons } from './BeatButtons';
import type { ResultState } from './LetterPad';
import type { KindProps } from './types';

/** A whole box with no time numbers; the learner adds up its beats. */
export function CountBox({
  q,
  send,
  states,
}: KindProps<'count-box'> & { states: Partial<Record<ChoiceValue, ResultState>> }) {
  // The box is drawn exactly as wide as its beats, since the question shows no time numbers.
  const time = Math.min(4, Math.max(2, boxBeats(q.box))) as Time;
  return (
    <>
      <Music mode="rhythm" score={rhythmScore(q.box, time)} showTime={false} />
      <BeatButtons send={send} states={states} />
    </>
  );
}
