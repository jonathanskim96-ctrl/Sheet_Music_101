import type { ChoiceValue } from '../../../domain/questions';
import { Button } from '../../../ui/Button';
import type { ResultState } from './LetterPad';
import styles from './questions.module.css';

export interface ChoiceButtonsProps {
  choices: readonly { value: ChoiceValue; label: string }[];
  onPick: (value: ChoiceValue) => void;
  states?: Partial<Record<ChoiceValue, ResultState>>;
}

/** Two (or four, in a 2 × 2 grid) big answer buttons with words on them. */
export function ChoiceButtons({ choices, onPick, states = {} }: ChoiceButtonsProps) {
  return (
    <div
      className={`${styles['choices'] ?? ''} ${choices.length > 2 ? (styles['choicesGrid'] ?? '') : ''}`}
      role="group"
      aria-label="Choose an answer"
    >
      {choices.map((c) => {
        const state = states[c.value];
        return (
          <Button
            key={c.value}
            variant="choice"
            fullWidth
            {...(state ? { state } : {})}
            onClick={() => {
              onPick(c.value);
            }}
          >
            {c.label}
          </Button>
        );
      })}
    </div>
  );
}
