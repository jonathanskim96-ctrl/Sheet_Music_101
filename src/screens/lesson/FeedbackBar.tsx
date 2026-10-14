import { useState } from 'react';
import { cardId, parseCardId, type CardId } from '../../domain/cards';
import {
  CHOICE_TEXT,
  COMBO_MILESTONES,
  CORRECT_PHRASES,
  WRONG_PHRASES,
  anyKeyWorks,
  stepSkipExplanation,
  cardName,
  fillWrongPhrase,
} from '../../domain/content';
import { describePosition, hintFor } from '../../domain/landmarks';
import { letterOf, noteAtPosition } from '../../domain/notes';
import type { Progress } from '../../domain/progress';
import {
  cardOf,
  correctAnswerOf,
  nearestCorrectPosition,
  type Answer,
  type Question,
} from '../../domain/questions';
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

/** The right answer as words, for "It's {X}." (`card` is the note the feedback shows.) */
function answerText(q: Question, card: CardId | null): string {
  const a = correctAnswerOf(q);
  if (card !== null) return cardName(card);
  if (a.kind === 'letter') return a.letter;
  if (a.kind === 'choice') return CHOICE_TEXT[a.value];
  if (a.kind === 'key') return a.note === 'black' ? 'a black key' : a.note.charAt(0);
  return '';
}

/**
 * The card the feedback is about. Find-on-staff accepts the letter in any octave and draws the
 * nearest right note beside the learner's, so its name, position and hint describe that note.
 */
function shownCard(q: Question, a: Answer): CardId | null {
  const card = cardOf(q);
  if (card === null || q.kind !== 'find-on-staff' || a.kind !== 'position') return card;
  const parts = parseCardId(card);
  const note = parts && noteAtPosition(parts.clef, nearestCorrectPosition(card, a.position));
  if (!parts || !note) return card;
  const nearest = cardId(parts.clef, note);
  return parseCardId(nearest) ? nearest : card;
}

/** Slides up after an answer: a cheer, or the right answer with where the note sits. */
export function FeedbackBar({ question, result, progress, combo, onContinue }: FeedbackBarProps) {
  // Chosen once per question so the wording doesn't change on re-render.
  const [phrase] = useState(() => (result.correct ? pick(CORRECT_PHRASES) : pick(WRONG_PHRASES)));
  const card = shownCard(question, result.answer);
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
                {fillWrongPhrase(phrase, answerText(question, card))}
              </p>
              {parts && (
                <p className={styles['feedbackLine']}>{describePosition(parts.clef, parts.note)}</p>
              )}
              {card !== null && <HintLine card={card} progress={progress} />}
            </>
          )}
          {question.kind === 'step-skip' && (
            <p className={styles['feedbackLine']}>{stepSkipExplanation(question)}</p>
          )}
          {question.kind === 'find-key-letter' && parts && (
            <p className={styles['feedbackLine']}>{anyKeyWorks(letterOf(parts.note))}</p>
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
