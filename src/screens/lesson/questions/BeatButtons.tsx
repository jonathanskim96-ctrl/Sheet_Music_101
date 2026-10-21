import { BEATS_LABELS } from '../../../domain/content';
import type { ChoiceValue } from '../../../domain/questions';
import { ChoiceButtons } from './ChoiceButtons';
import type { ResultState } from './LetterPad';
import type { KindProps } from './types';

const CHOICES: readonly { value: ChoiceValue; label: string }[] = [
  { value: 'beats-1', label: BEATS_LABELS[0] },
  { value: 'beats-2', label: BEATS_LABELS[1] },
  { value: 'beats-3', label: BEATS_LABELS[2] },
  { value: 'beats-4', label: BEATS_LABELS[3] },
];

/** "1 beat" … "4 beats" in a 2 × 2 grid (beats-of and count-box). */
export function BeatButtons({
  send,
  states,
}: Pick<KindProps<'beats-of'>, 'send'> & { states: Partial<Record<ChoiceValue, ResultState>> }) {
  return (
    <ChoiceButtons
      choices={CHOICES}
      onPick={(value) => {
        send({ kind: 'choice', value });
      }}
      states={states}
    />
  );
}
