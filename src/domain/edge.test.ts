import { describe, expect, it } from 'vitest';
import { ALL_CARDS } from './cards';
import { CHECKPOINTS, allLessonIds, findLesson, pathLessons, type LessonDef } from './curriculum';
import { buildCheckpoint, buildLesson, buildReview } from './lessonBuilder';
import { planCompleteSession } from './planners';
import { emptyProgress, type Progress } from './progress';
import { correctAnswerOf, checkAnswer } from './questions';
import { reduce, resultOf, startSession, currentQuestion, type SessionState } from './session';
import {
  currentLesson,
  isAvailable,
  keyboardUnlocked,
  reviewAvailable,
  unitLevel,
} from './unlocks';
import { checkProgress } from './validate';

const TODAY = '2026-10-12';
const NOW = new Date(2026, 9, 12, 10, 0);

/** The learner has finished everything: every lesson, level and checkpoint, every card at box 5. */
function finished(): Progress {
  const p = emptyProgress('2026-08-01');
  for (const id of allLessonIds()) {
    p.lessons[id] = {
      timesCompleted: 2,
      bestAccuracy: 100,
      firstCompletedDay: '2026-09-01',
      lastCompletedDay: '2026-10-01',
    };
  }
  for (const c of ALL_CARDS) {
    p.cards[c] = {
      box: 5,
      lastSeenDay: '2026-10-01',
      lastPromotedDay: '2026-10-01',
      seen: 30,
      correct: 28,
      avgMs: 1500,
    };
  }
  p.xp = 5000;
  p.daysPracticed = ['2026-09-01', '2026-10-01'];
  return p;
}

function playPerfectly(start: SessionState): SessionState {
  let s = start;
  let t = 0;
  for (let guard = 0; s.phase !== 'complete' && guard < 500; guard++) {
    t += 1000;
    if (s.phase === 'concept' || s.phase === 'meet') s = reduce(s, { type: 'next-card', at: t });
    else if (s.phase === 'question') {
      const cur = currentQuestion(s);
      if (!cur) throw new Error('no question');
      s = reduce(s, { type: 'answer', answer: correctAnswerOf(cur.q), at: t });
    } else s = reduce(s, { type: 'continue', at: t });
  }
  return s;
}

describe('edge: empty progress', () => {
  const p = emptyProgress('2026-10-01');
  it('only the first lesson (and the checkpoints) can be started; no review yet', () => {
    expect(currentLesson(p)?.id).toBe('u1-l1');
    expect(reviewAvailable(p)).toBe(false);
    expect(keyboardUnlocked(p)).toBe(false);
    expect(() => buildReview(p, TODAY, 1)).toThrow();
  });
  it('every lesson and checkpoint can be built from nothing', () => {
    for (const id of allLessonIds()) {
      const def = findLesson(id);
      if (def) expect(buildLesson(def, p, TODAY, 5).questions).toHaveLength(def.questionCount);
    }
    for (const cp of CHECKPOINTS) expect(buildCheckpoint(cp, 5).questions).toHaveLength(15);
  });
  it('a first lesson played perfectly gives a valid document with the lesson and cards recorded', () => {
    const plan = buildLesson(findLesson('u2-l1') as LessonDef, p, TODAY, 3);
    expect(plan.meetCards).toEqual(['treble-C4', 'treble-G4']);
    const done = playPerfectly(startSession(plan, 0));
    const next = planCompleteSession(p, resultOf(done), NOW);
    expect(checkProgress(JSON.parse(JSON.stringify(next)), 'strict').issues).toEqual([]);
    expect(next.lessons['u2-l1']?.timesCompleted).toBe(1);
    expect(next.xp).toBe(15);
    expect(Object.keys(next.cards).sort()).toEqual(['treble-C4', 'treble-G4']);
    expect(next.daysPracticed).toEqual([TODAY]);
  });
});

describe('edge: completely finished progress', () => {
  const p = finished();
  it('is a valid document', () => {
    expect(checkProgress(JSON.parse(JSON.stringify(p)), 'strict').issues).toEqual([]);
  });
  it('has nothing "current", everything available, review and keyboard on, all units at top level', () => {
    expect(currentLesson(p)).toBeNull();
    for (const id of allLessonIds()) expect(isAvailable(p, id)).toBe(true);
    expect(reviewAvailable(p)).toBe(true);
    expect(keyboardUnlocked(p)).toBe(true);
    for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 10]) expect(unitLevel(p, n)).toBe(3);
    expect(unitLevel(p, 1)).toBe(1);
    expect(unitLevel(p, 11)).toBe(1);
  });
  it('every lesson, the review and every checkpoint build, are answerable and replay cleanly', () => {
    for (const l of pathLessons()) {
      const plan = buildLesson(l, p, TODAY, 11);
      expect(plan.meetCards).toEqual([]); // replays skip Meet cards
      for (const q of plan.questions) expect(checkAnswer(q, correctAnswerOf(q))).toBe(true);
    }
    const review = buildReview(p, TODAY, 11);
    expect(review.questions).toHaveLength(10);
    const done = playPerfectly(startSession(review, 0));
    const after = planCompleteSession(p, resultOf(done), NOW);
    expect(checkProgress(JSON.parse(JSON.stringify(after)), 'strict').issues).toEqual([]);
    expect(after.totals.reviewsDone).toBe(1);
    expect(after.xp).toBe(5015);
    expect(Object.keys(after.lessons).sort()).toEqual(Object.keys(p.lessons).sort());
  });
  it('re-passing a checkpoint changes only its own record', () => {
    const plan = buildCheckpoint(CHECKPOINTS[2] as (typeof CHECKPOINTS)[number], 4);
    const after = planCompleteSession(p, resultOf(playPerfectly(startSession(plan, 0))), NOW);
    expect(after.lessons['cp-c']?.timesCompleted).toBe(3);
    expect(after.lessons['u1-l1']).toEqual(p.lessons['u1-l1']);
    expect(after.xp).toBe(5000 + 35);
  });
});
