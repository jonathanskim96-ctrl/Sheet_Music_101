import type { ChoiceValue } from '../../../domain/questions';
import { BUTTON_LABELS } from '../../../domain/content';
import { Music } from '../../../notation/Music';
import { rhythmScore } from '../../../notation/musicDraw';
import { ChoiceButtons } from './ChoiceButtons';
import type { ResultState } from './LetterPad';
import type { KindProps } from './types';
import styles from './questions.module.css';

/** Two notes, one above the other; the learner says which one lasts longer. */
export function WhichLonger({
  q,
  send,
  states,
}: KindProps<'which-longer'> & { states: Partial<Record<ChoiceValue, ResultState>> }) {
  return (
    <>
      <div className={styles['pair']}>
        <p className={styles['caption']}>1</p>
        <Music
          mode="rhythm"
          score={rhythmScore([q.first], 4)}
          showTime={false}
          ariaLabel="First note"
        />
        <p className={styles['caption']}>2</p>
        <Music
          mode="rhythm"
          score={rhythmScore([q.second], 4)}
          showTime={false}
          ariaLabel="Second note"
        />
      </div>
      <ChoiceButtons
        choices={[
          { value: 'first', label: BUTTON_LABELS.firstNote },
          { value: 'second', label: BUTTON_LABELS.secondNote },
        ]}
        onPick={(value) => {
          send({ kind: 'choice', value });
        }}
        states={states}
      />
    </>
  );
}
