import type { Answer, Question } from '../../../domain/questions';

/** What every question-kind view receives from QuestionView. */
export interface KindProps<K extends Question['kind']> {
  q: Extract<Question, { kind: K }>;
  /** The learner's answer once feedback is showing, else null. */
  answered: { answer: Answer; correct: boolean } | null;
  /** Sends an answer; does nothing while feedback is showing. */
  send: (answer: Answer) => void;
}
