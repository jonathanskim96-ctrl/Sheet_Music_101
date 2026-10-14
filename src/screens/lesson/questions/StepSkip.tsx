import { BUTTON_LABELS } from '../../../domain/content';
import type { ChoiceValue } from '../../../domain/questions';
import { Staff, type NoteState } from '../../../notation/Staff';
import { ChoiceButtons } from './ChoiceButtons';
import type { ResultState } from './LetterPad';
import type { KindProps } from './types';

const TWO: readonly { value: ChoiceValue; label: string }[] = [
  { value: 'step-up', label: BUTTON_LABELS.stepUp },
  { value: 'step-down', label: BUTTON_LABELS.stepDown },
];
const FOUR: readonly { value: ChoiceValue; label: string }[] = [
  ...TWO,
  { value: 'skip-up', label: BUTTON_LABELS.skipUp },
  { value: 'skip-down', label: BUTTON_LABELS.skipDown },
];

/** Two notes on one staff; the learner says how the second one moves. */
export function StepSkip({
  q,
  answered,
  send,
  states,
  noteState,
}: KindProps<'step-skip'> & {
  states: Partial<Record<ChoiceValue, ResultState>>;
  noteState: NoteState;
}) {
  return (
    <>
      <Staff
        mode={q.clef}
        notes={[
          { clef: q.clef, note: q.first, state: noteState },
          { clef: q.clef, note: q.second, state: noteState },
        ]}
        shake={answered?.correct === false}
        ariaLabel="Music staff with two notes"
      />
      <ChoiceButtons
        choices={q.buttons === 2 ? TWO : FOUR}
        onPick={(value) => {
          send({ kind: 'choice', value });
        }}
        states={states}
      />
    </>
  );
}
