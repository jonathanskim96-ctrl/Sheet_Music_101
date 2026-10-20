import { pathLessons } from '../src/domain/curriculum';
import type { CardState } from '../src/domain/srs';
import { test, expect } from './fixtures';
import {
  answerOf,
  answerQuestion,
  finish,
  fixtureProgress,
  go,
  playLesson,
  progressAfter,
  reachQuestion,
  seedProgress,
  seedRecord,
  whatIsShown,
} from './helpers';

const DAY = '2026-10-13';
const PART2 = pathLessons().filter((l) => l.unit >= 12);
const card = (): CardState => ({
  box: 2,
  lastSeenDay: '2026-10-10',
  lastPromotedDay: null,
  seen: 6,
  correct: 5,
  avgMs: 2500,
});

test.describe('units 12-15 and checkpoint D', () => {
  test('every new lesson and cp-d opens in order and plays to the end', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'the long loop runs on the phone project only');
    test.setTimeout(300_000);
    test.slow();
    await page.clock.setFixedTime(new Date(`${DAY}T10:00:00`));
    await seedProgress(page, progressAfter(43)); // units 1-11 done: u12-l1 is the current lesson
    await expect(page.getByTestId('bubble-u12-l1')).toHaveAttribute('data-state', 'current');

    for (const lesson of PART2) {
      await go(page, `#/lesson/${lesson.id}`);
      await playLesson(page);
      await finish(page);
      await expect(page.getByTestId(`bubble-${lesson.id}`)).toHaveAttribute(
        'data-state',
        'completed',
      );
    }
    expect(PART2).toHaveLength(18);

    await go(page, '#/checkpoint/cp-d');
    await playLesson(page);
    await expect(page.getByRole('heading', { name: 'Checkpoint passed!' })).toBeVisible();
    await finish(page);
  });

  test('a wrong black key is wrong and shows the right key; a right black key says what else it is called', async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date(`${DAY}T10:00:00`));
    await seedProgress(page, progressAfter(43 + 7)); // u13-l4 ("One key, two names") is current
    await go(page, '#/lesson/u13-l4');
    // Concept and Meet cards come first; every question here is about a black key.

    let q = await reachQuestion(page, 'find-key-pitch');
    const right = await answerOf(q);
    if (right.kind !== 'pitch-key') throw new Error('expected a pitch-key answer');
    const wrongBlack = q.locator(`[data-black]:not([data-black="${String(right.midi)}"])`).first();
    await wrongBlack.click();
    const feedback = page.getByTestId('feedback');
    await expect(feedback).toHaveAttribute('data-correct', 'false');
    await expect(wrongBlack).toHaveAttribute('data-key-state', 'wrong');
    await expect(q.locator(`[data-black="${String(right.midi)}"]`)).toHaveAttribute(
      'data-key-state',
      'highlight',
    );
    await expect(feedback).not.toContainText('also called');
    await page.getByRole('button', { name: 'Continue' }).click();

    // the missed question comes back; answer the next find-key-pitch correctly
    q = await reachQuestion(page, 'find-key-pitch');
    const right2 = await answerOf(q);
    if (right2.kind !== 'pitch-key') throw new Error('expected a pitch-key answer');
    await q.locator(`[data-black="${String(right2.midi)}"]`).click();
    await expect(feedback).toHaveAttribute('data-correct', 'true');
    await expect(feedback).toContainText(/That key is also called [A-G][♯♭]\./);
    await expect(feedback).toContainText(/[♯♭]: one key to the (right|left) of [A-G]\./);
  });

  test('a name-accidental question offers valid names and explains a wrong pick', async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date(`${DAY}T10:00:00`));
    await seedProgress(page, progressAfter(43));
    await go(page, '#/lesson/u12-l1');
    const q = await reachQuestion(page, 'name-accidental');
    const right = await answerOf(q);
    if (right.kind !== 'pitch-name') throw new Error('expected a pitch-name answer');
    const buttons = q.getByRole('group', { name: 'Choose an answer' }).getByRole('button');
    const names = await buttons.allTextContents();
    expect(names.length).toBeGreaterThanOrEqual(2);
    expect(names.length).toBeLessThanOrEqual(4);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(n).toMatch(/^[A-G][♯♭]?$/);
    await answerQuestion(page, false);
    const feedback = page.getByTestId('feedback');
    await expect(feedback).toHaveAttribute('data-correct', 'false');
    await expect(feedback).toContainText(/(It's|answer is|one is) [A-G][♯♭]?\./);
  });

  test('review includes sign cards, plays through and saves', async ({ page }) => {
    await page.clock.setFixedTime(new Date(`${DAY}T10:00:00`));
    await seedProgress(
      page,
      progressAfter(43, (p) => {
        p.cards['treble-C4'] = card();
        p.cards['treble-G4'] = card();
        p.cards['treble-F#4'] = card();
        p.cards['treble-Bb4'] = card();
        p.cards['bass-C#3'] = card();
      }),
    );
    await go(page, '#/review');
    const kinds: string[] = [];
    for (let guard = 0; guard < 80; guard++) {
      const shown = await whatIsShown(page);
      if (shown === 'complete') break;
      if (shown === 'card') await page.getByRole('button', { name: 'Got it' }).click();
      else if (shown === 'feedback') await page.getByRole('button', { name: 'Continue' }).click();
      else {
        kinds.push((await page.getByTestId('question').getAttribute('data-kind')) ?? '');
        await answerQuestion(page, true);
        await expect(page.getByTestId('feedback')).toBeVisible();
      }
    }
    expect(kinds.some((k) => k === 'name-accidental' || k === 'find-key-pitch')).toBe(true);
    for (const k of kinds)
      expect(['name-note', 'find-key-letter', 'name-accidental', 'find-key-pitch']).toContain(k);
    await finish(page);
  });

  test('passing cp-d from fresh progress marks units 12-15 done and nothing else', async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date(`${DAY}T10:00:00`));
    await seedProgress(page, progressAfter(0));
    await go(page, '#/checkpoint/cp-d');
    await playLesson(page);
    await expect(page.getByRole('heading', { name: 'Checkpoint passed!' })).toBeVisible();
    await finish(page);
    for (const l of PART2)
      await expect(page.getByTestId(`bubble-${l.id}`)).toHaveAttribute('data-state', 'completed');
    await expect(page.getByTestId('bubble-u1-l1')).toHaveAttribute('data-state', 'current');
    await expect(page.getByTestId('bubble-u11-l4')).not.toHaveAttribute('data-state', 'completed');
  });

  test('loading the version-1 fixture with unit 11 done shows u12-l1 as the current lesson', async ({
    page,
  }) => {
    const v1 = fixtureProgress();
    for (const l of pathLessons().slice(0, 43)) {
      v1.lessons[l.id] ??= {
        timesCompleted: 1,
        bestAccuracy: 100,
        firstCompletedDay: '2026-10-01',
        lastCompletedDay: '2026-10-01',
      };
    }
    await seedRecord(page, { rev: 9, savedAt: '2026-10-12T10:00:00.000Z', doc: v1 });
    await expect(page.getByTestId('xp-value')).toHaveText('135');
    await expect(page.getByTestId('bubble-u12-l1')).toHaveAttribute('data-state', 'current');
    await expect(page.getByTestId('bubble-u11-l4')).toHaveAttribute('data-state', 'completed');
    // the cp-d trophy sits after unit 15
    await expect(page.getByTestId('checkpoint-cp-d')).toBeVisible();
  });
});
