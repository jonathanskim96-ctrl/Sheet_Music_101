import { useState } from 'react';
import { parseCardId } from '../../domain/cards';
import {
  CHOICE_TEXT,
  COMBO_MILESTONES,
  CORRECT_PHRASES,
  WRONG_PHRASES,
  cardName,
  fillWrongPhrase,
} from '../../domain/content';
import { describePosition, hintFor } from '../../domain/landmarks';
import type { Progress } from '../../domain/progress';
import { cardOf, correctAnswerOf, type Answer, type Question } from '../../domain/questions';
import { Button } from '../../ui/Button';
import { Check } from '../../ui/icons';
import { Mascot } from '../../ui/Mascot';
import styles from './lesson.module.css';

export interface FeedbackBarProps {
  question: Question;
  result: { answer: Answer; correct: boolean };
  progress: Progress;
  combo: number;
  onContinue: () => void;
}

const pick = <T,>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)] ?? (items[0] as T);

/** The right answer as words, for "It's {X}." */
function answerText(q: Question): string {
  const a = correctAnswerOf(q);
  const card = cardOf(q);
  if (card !== null) return cardName(card);
  if (a.kind === 'letter') return a.letter;
  if (a.kind === 'choice') return CHOICE_TEXT[a.value];
  if (a.kind === 'key') return a.note === 'black' ? 'a black key' : a.note.charAt(0);
  return '';
}

/** Slides up after an answer: a cheer, or the right answer with where the note sits. */
export function FeedbackBar({ question, result, progress, combo, onContinue }: FeedbackBarProps) {
  // Chosen once per question so the wording doesn't change on re-render.
  const [phrase] = useState(() => (result.correct ? pick(CORRECT_PHRASES) : pick(WRONG_PHRASES)));
  const card = cardOf(question);
  const parts = card === null ? null : parseCardId(card);
  const milestone = COMBO_MILESTONES.find((m) => m.at === combo);

  return (
    <div
      className={`${styles['feedback'] ?? ''} ${result.correct ? (styles['feedbackCorrect'] ?? '') : (styles['feedbackWrong'] ?? '')}`}
      data-testid="feedback"
      data-correct={result.correct}
      aria-live="polite"
    >
      <div className={styles['feedbackRow']}>
        {result.correct ? (
          <Check size={32} strokeWidth={4} aria-hidden="true" />
        ) : (
          <Mascot mood="encouraging" size={48} />
        )}
        <div>
          {result.correct ? (
            <>
              <p className={styles['feedbackTitle']}>{phrase}</p>
              {milestone && <p className={styles['feedbackLine']}>{milestone.text}</p>}
            </>
          ) : (
            <>
              <p className={styles['feedbackTitle']}>
                {fillWrongPhrase(phrase, answerText(question))}
              </p>
              {parts && (
                <p className={styles['feedbackLine']}>{describePosition(parts.clef, parts.note)}</p>
              )}
              {card !== null && <HintLine card={card} progress={progress} />}
            </>
          )}
        </div>
      </div>
      <Button fullWidth onClick={onContinue}>
        Continue
      </Button>
    </div>
  );
}

function HintLine({
  card,
  progress,
}: {
  card: NonNullable<ReturnType<typeof cardOf>>;
  progress: Progress;
}) {
  const hint = hintFor(card, progress);
  return hint === null ? null : <p className={styles['feedbackLine']}>{hint}</p>;
}
