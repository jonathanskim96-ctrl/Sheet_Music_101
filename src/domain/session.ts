import type { CardId } from './cards';
import type { LessonPlan } from './lessonBuilder';
import { cardOf, checkAnswer, type Answer, type Question } from './questions';

export type Phase = 'concept' | 'meet' | 'question' | 'feedback' | 'complete';

export interface QueuedQuestion {
  q: Question;
  originalIndex: number;
  isRetry: boolean;
}

export interface FirstAttempt {
  originalIndex: number;
  card: CardId | null;
  correct: boolean;
  ms: number;
}

export interface SessionState {
  plan: LessonPlan;
  phase: Phase;
  conceptIndex: number;
  meetIndex: number;
  queue: QueuedQuestion[];
  index: number;
  lastAnswer: { answer: Answer; correct: boolean } | null;
  firstAttempts: FirstAttempt[];
  combo: number;
  bestCombo: number;
  shownAt: number;
  startedAt: number;
  endedAt: number | null;
}

export type Action =
  | { type: 'next-card'; at: number } // concept/meet "Got it"
  | { type: 'answer'; answer: Answer; at: number }
  | { type: 'continue'; at: number }; // after feedback

export interface SessionResult {
  context: LessonPlan['context'];
  firstAttempts: FirstAttempt[];
  total: number;
  correctFirstTry: number;
  accuracy: number; // integer 0..100
  perfect: boolean;
  bestCombo: number;
  durationMs: number;
  passed?: boolean; // checkpoints only
}

/** Correct first-try answers needed to pass a checkpoint. */
export const CHECKPOINT_PASS_MARK = 13;

/** How many questions later a missed question comes back. */
const RETRY_GAP = 3;

/** First phase of a session: concept cards, else Meet cards, else straight to questions. */
export function startSession(plan: LessonPlan, at: number): SessionState {
  const phase: Phase =
    plan.conceptCards.length > 0 ? 'concept' : plan.meetCards.length > 0 ? 'meet' : 'question';
  return {
    plan,
    phase,
    conceptIndex: 0,
    meetIndex: 0,
    queue: plan.questions.map((q, originalIndex) => ({ q, originalIndex, isRetry: false })),
    index: 0,
    lastAnswer: null,
    firstAttempts: [],
    combo: 0,
    bestCombo: 0,
    shownAt: at,
    startedAt: at,
    endedAt: null,
  };
}

function toQuestions(s: SessionState, at: number): SessionState {
  return { ...s, phase: 'question', shownAt: at };
}

/** The session state machine. Actions that do not fit the current phase are ignored. */
export function reduce(s: SessionState, a: Action): SessionState {
  switch (a.type) {
    case 'next-card': {
      if (s.phase === 'concept') {
        const conceptIndex = s.conceptIndex + 1;
        if (conceptIndex < s.plan.conceptCards.length) return { ...s, conceptIndex };
        const next: SessionState = { ...s, conceptIndex };
        return s.plan.meetCards.length > 0 ? { ...next, phase: 'meet' } : toQuestions(next, a.at);
      }
      if (s.phase === 'meet') {
        const meetIndex = s.meetIndex + 1;
        if (meetIndex < s.plan.meetCards.length) return { ...s, meetIndex };
        return toQuestions({ ...s, meetIndex }, a.at);
      }
      return s;
    }
    case 'answer': {
      if (s.phase !== 'question') return s;
      const current = s.queue[s.index];
      if (!current) return s;
      const correct = checkAnswer(current.q, a.answer);
      const ms = Math.max(0, a.at - s.shownAt);
      const firstAttempts = current.isRetry
        ? s.firstAttempts
        : [
            ...s.firstAttempts,
            { originalIndex: current.originalIndex, card: cardOf(current.q), correct, ms },
          ];
      let queue = s.queue;
      if (!correct && !current.isRetry && s.plan.retries) {
        const at = Math.min(s.index + RETRY_GAP, s.queue.length);
        queue = [
          ...s.queue.slice(0, at),
          { q: current.q, originalIndex: current.originalIndex, isRetry: true },
          ...s.queue.slice(at),
        ];
      }
      const combo = correct ? s.combo + 1 : 0;
      return {
        ...s,
        phase: 'feedback',
        queue,
        firstAttempts,
        lastAnswer: { answer: a.answer, correct },
        combo,
        bestCombo: Math.max(s.bestCombo, combo),
      };
    }
    case 'continue': {
      if (s.phase !== 'feedback') return s;
      const index = s.index + 1;
      if (index >= s.queue.length) {
        return { ...s, phase: 'complete', index, lastAnswer: null, endedAt: a.at };
      }
      return { ...s, phase: 'question', index, lastAnswer: null, shownAt: a.at };
    }
    default:
      return assertNever(a);
  }
}

function assertNever(x: never): never {
  throw new Error(`Unexpected action: ${JSON.stringify(x)}`);
}

/** The summary of a finished session (throws if it is not finished). */
export function resultOf(s: SessionState): SessionResult {
  if (s.phase !== 'complete' || s.endedAt === null) throw new Error('The session is not complete');
  const total = s.firstAttempts.length;
  const correctFirstTry = s.firstAttempts.filter((f) => f.correct).length;
  const base: SessionResult = {
    context: s.plan.context,
    firstAttempts: s.firstAttempts,
    total,
    correctFirstTry,
    accuracy: total === 0 ? 0 : Math.round((100 * correctFirstTry) / total),
    perfect: total > 0 && correctFirstTry === total,
    bestCombo: s.bestCombo,
    durationMs: Math.max(0, s.endedAt - s.startedAt),
  };
  return s.plan.context.kind === 'checkpoint'
    ? { ...base, passed: correctFirstTry >= CHECKPOINT_PASS_MARK }
    : base;
}

/** Everything the screens need to know about where the learner is, without re-deriving it. */
export function currentQuestion(s: SessionState): QueuedQuestion | null {
  return s.phase === 'question' || s.phase === 'feedback' ? (s.queue[s.index] ?? null) : null;
}
