import { useReducer, useState } from 'react';
import { navigate } from '../app/router';
import { parseCardId } from '../domain/cards';
import { LEAVE_LESSON } from '../domain/content';
import type { LessonDef } from '../domain/curriculum';
import { dayKeyOf } from '../domain/days';
import { buildLesson } from '../domain/lessonBuilder';
import { planSettings } from '../domain/planners';
import { cardOf, checkAnswer, type Answer } from '../domain/questions';
import { hashString } from '../domain/rng';
import { currentQuestion, reduce, resultOf, startSession } from '../domain/session';
import { synth } from '../audio/synth';
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

/** Plays one lesson: concept cards, Meet cards, questions, then the result screen. */
export function LessonScreen({ def }: { def: LessonDef }) {
  const progress = useLoadedProgress();
  const now = useNow();
  const commit = useCommit();
  // The plan and the progress it was built from are fixed for the whole lesson.
  const [before] = useState(progress);
  const [session, dispatch] = useReducer(reduce, undefined, () => {
    const seed = (now().getTime() ^ hashString(def.id)) >>> 0;
    const plan = buildLesson(def, before, dayKeyOf(now()), seed);
    return startSession(plan, performance.now());
  });
  const [leaving, setLeaving] = useState(false);

  const current = currentQuestion(session);
  const total = session.queue.length;
  const done = session.phase === 'feedback' ? session.index + 1 : session.index;
  const soundOn = progress.settings.soundOn;

  const answer = (a: Answer) => {
    if (session.phase !== 'question' || !current) return;
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
        aria-pressed={soundOn}
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
