import { LETTERS, type Letter } from '../../../domain/notes';
import styles from './questions.module.css';

export type ResultState = 'correct' | 'wrong';

export interface LetterPadProps {
  onPick: (letter: Letter) => void;
  /** After an answer: the right letter is green and a wrong pick is orange. */
  states?: Partial<Record<Letter, ResultState>>;
}

/** The seven letter buttons A–G (4 on the first row, 3 centred below). */
export function LetterPad({ onPick, states = {} }: LetterPadProps) {
  return (
    <div className={styles['pad']} role="group" aria-label="Answer with a letter">
      {LETTERS.map((letter) => {
        const state = states[letter];
        return (
          <button
            key={letter}
            type="button"
            className={`${styles['padKey'] ?? ''} ${state ? (styles[state] ?? '') : ''}`}
            onClick={() => {
              onPick(letter);
            }}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}
