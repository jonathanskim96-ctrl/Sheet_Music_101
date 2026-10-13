import { useEffect, useReducer, useState } from 'react';
import { navigate } from '../app/router';
import { parseCardId } from '../domain/cards';
import { LEAVE_LESSON, SILENT_HINT } from '../domain/content';
import type { CheckpointDef, LessonDef } from '../domain/curriculum';
import { dayKeyOf, type DayKey } from '../domain/days';
import {
  buildCheckpoint,
  buildLesson,
  buildReview,
  type LessonPlan,
} from '../domain/lessonBuilder';
import { planSettings } from '../domain/planners';
import type { Progress } from '../domain/progress';
import { cardOf, checkAnswer, type Answer } from '../domain/questions';
import { hashString } from '../domain/rng';
import { currentQuestion, reduce, resultOf, startSession } from '../domain/session';
import { synth } from '../audio/synth';
import { isIosDevice } from '../pwa/platform';
import { useCommit, useLoadedProgress, useNow } from '../data/ProgressContext';
import { Button } from '../ui/Button';
import { Flame, Volume2, VolumeX, X } from '../ui/icons';
import { ProgressBar } from '../ui/ProgressBar';
import { Sheet } from '../ui/Sheet';
import { ConceptCard } from './lesson/ConceptCard';
import { FeedbackBar } from './lesson/FeedbackBar';
import { LessonComplete } from './lesson/LessonComplete';
import { MeetCard } from './lesson/MeetCard';
import { QuestionView } from './lesson/QuestionView';
import styles from './lesson/lesson.module.css';

// The Silent-mode hint shows at most once per app run (SPEC 7.7).
let silentHintSpent = false;

/** What to play: one lesson, a review of the cards the learner has met, or a checkpoint. */
export type LessonSource =
  | { kind: 'lesson'; def: LessonDef }
  | { kind: 'review' }
  | { kind: 'checkpoint'; checkpoint: CheckpointDef };

function planFor(source: LessonSource, p: Progress, today: DayKey, seed: number): LessonPlan {
  switch (source.kind) {
    case 'lesson':
      return buildLesson(source.def, p, today, seed);
    case 'review':
      return buildReview(p, today, seed);
    case 'checkpoint':
      return buildCheckpoint(source.checkpoint, seed);
    default: {
      const never: never = source;
      return never;
    }
  }
}

const idOf = (source: LessonSource): string =>
  source.kind === 'lesson'
    ? source.def.id
    : source.kind === 'review'
      ? 'review'
      : source.checkpoint.id;

/** Plays one session: concept cards, Meet cards, questions, then the result screen. */
export function LessonScreen({ source }: { source: LessonSource }) {
  const progress = useLoadedProgress();
  const now = useNow();
  const commit = useCommit();
  // The plan and the progress it was built from are fixed for the whole lesson.
  const [before] = useState(progress);
  const [session, dispatch] = useReducer(reduce, undefined, () => {
    const seed = (now().getTime() ^ hashString(idOf(source))) >>> 0;
    const plan = planFor(source, before, dayKeyOf(now()), seed);
    return startSession(plan, performance.now());
  });
  const [leaving, setLeaving] = useState(false);
  const soundOn = progress.settings.soundOn;
  // Only on iPhone/iPad, on the first screen, while sound is on; gone after the first "Got it" or
  // answer. It counts as used only once it has actually been shown.
  const [hintOpen, setHintOpen] = useState(() => !silentHintSpent && isIosDevice());
  const showHint = hintOpen && soundOn && session.phase !== 'complete';
  useEffect(() => {
    if (showHint) silentHintSpent = true;
  }, [showHint]);

  const current = currentQuestion(session);
  const total = session.queue.length;
  const done = session.phase === 'feedback' ? session.index + 1 : session.index;

  const answer = (a: Answer) => {
    if (session.phase !== 'question' || !current) return;
    setHintOpen(false);
    const correct = checkAnswer(current.q, a);
    if (correct) synth.playCorrect();
    else synth.playWrong();
    const card = cardOf(current.q);
    const parts = card === null ? null : parseCardId(card);
    if (parts) synth.playNote(parts.note, 0.25);
    dispatch({ type: 'answer', answer: a, at: performance.now() });
  };

  const header = (
    <header className={styles['header']}>
      <button
        type="button"
        className={styles['iconButton']}
        aria-label="Close lesson"
        onClick={() => {
          setLeaving(true);
        }}
      >
        <X size={26} aria-hidden="true" />
      </button>
      <div className={styles['barWrap']}>
        <ProgressBar
          value={session.phase === 'complete' ? total : done}
          max={total}
          label="Lesson progress"
        />
      </div>
      {session.combo >= 3 && (
        <span className={styles['combo']} data-testid="combo">
          <Flame size={18} aria-hidden="true" /> {session.combo}
        </span>
      )}
      <button
        type="button"
        className={styles['iconButton']}
        aria-label={soundOn ? 'Mute sound' : 'Turn sound on'}
        onClick={() => {
          void commit((p) => planSettings(p, { soundOn: !p.settings.soundOn }));
        }}
      >
        {soundOn ? (
          <Volume2 size={24} aria-hidden="true" />
        ) : (
          <VolumeX size={24} aria-hidden="true" />
        )}
      </button>
    </header>
  );

  let body;
  const conceptId = session.plan.conceptCards[session.conceptIndex];
  const meetCard = session.plan.meetCards[session.meetIndex];
  if (session.phase === 'concept' && conceptId !== undefined) {
    body = (
      <ConceptCard
        key={conceptId}
        id={conceptId}
        onGotIt={() => {
          setHintOpen(false);
          dispatch({ type: 'next-card', at: performance.now() });
        }}
      />
    );
  } else if (session.phase === 'meet' && meetCard !== undefined) {
    body = (
      <MeetCard
        key={meetCard}
        card={meetCard}
        onGotIt={() => {
          setHintOpen(false);
          dispatch({ type: 'next-card', at: performance.now() });
        }}
      />
    );
  } else if (session.phase === 'complete') {
    body = <LessonComplete result={resultOf(session)} before={before} />;
  } else if (current) {
    body = (
      <>
        <QuestionView
          key={`${String(session.index)}-${String(current.originalIndex)}`}
          question={current.q}
          answered={session.phase === 'feedback' ? session.lastAnswer : null}
          onAnswer={answer}
        />
        {session.phase === 'feedback' && session.lastAnswer && (
          <FeedbackBar
            question={current.q}
            result={session.lastAnswer}
            progress={before}
            combo={session.combo}
            onContinue={() => {
              dispatch({ type: 'continue', at: performance.now() });
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className={styles['page']}>
      {session.phase !== 'complete' && header}
      {showHint && (
        <p className={styles['silentHint']} data-testid="silent-hint">
          {SILENT_HINT}
        </p>
      )}
      <main className={styles['main']}>{body}</main>
      <Sheet
        open={leaving}
        title={LEAVE_LESSON.title}
        onClose={() => {
          setLeaving(false);
        }}
      >
        <p>{LEAVE_LESSON.body}</p>
        <div className={styles['sheetButtons']}>
          <Button
            fullWidth
            onClick={() => {
              setLeaving(false);
            }}
          >
            {LEAVE_LESSON.keepGoing}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => {
              navigate({ name: 'home' });
            }}
          >
            {LEAVE_LESSON.leave}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
