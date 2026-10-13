import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { pathLessons } from '../src/domain/curriculum';
import { emptyProgress, type Progress } from '../src/domain/progress';
import type { Answer } from '../src/domain/questions';
import { LETTERS } from '../src/domain/notes';
import { expect } from './fixtures';

const CHOICE_LABEL: Record<string, string> = {
  line: 'Line',
  space: 'Space',
  first: 'First note',
  second: 'Second note',
  treble: 'Treble clef',
  bass: 'Bass clef',
};

/** Opens the app on a fresh phone and taps "Let's start". */
export async function startFresh(page: Page): Promise<void> {
  await page.goto('./');
  await page.getByRole('button', { name: "Let's start" }).click();
  await expect(page.getByTestId('bubble-u1-l1')).toBeVisible();
}

/** A valid progress document with the first `n` path lessons done (and the welcome seen). */
export function progressAfter(n: number, patch: (p: Progress) => void = () => undefined): Progress {
  const p = emptyProgress('2026-10-01');
  p.flags.welcomeSeen = true;
  for (const l of pathLessons().slice(0, n)) {
    p.lessons[l.id] = {
      timesCompleted: 1,
      bestAccuracy: 100,
      firstCompletedDay: '2026-10-01',
      lastCompletedDay: '2026-10-01',
    };
  }
  patch(p);
  return p;
}

export function fixtureProgress(): Progress {
  return JSON.parse(readFileSync('tests/fixtures/progress-v1.json', 'utf8')) as Progress;
}

/** Writes a stored record straight into IndexedDB, then reloads so the app reads it. */
export async function seedRecord(page: Page, record: unknown): Promise<void> {
  await page.goto('./');
  await expect(page.locator('main').first()).toBeVisible();
  // The Loading screen is a <main> too: wait until the app has opened (and created) the database.
  await expect(page.getByText('Loading…')).toHaveCount(0);
  await page.evaluate(async (rec) => {
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('sheet-music-101', 1);
      open.onerror = () => {
        reject(new Error('open failed'));
      };
      open.onsuccess = () => {
        const tx = open.result.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(rec, 'progress');
        tx.oncomplete = () => {
          open.result.close();
          resolve();
        };
        tx.onerror = () => {
          reject(new Error('put failed'));
        };
      };
    });
  }, record);
  await page.reload();
}

export async function seedProgress(page: Page, doc: Progress): Promise<void> {
  await seedRecord(page, { rev: 50, savedAt: '2026-10-12T10:00:00.000Z', doc });
}

/** Reads the stored record back out of IndexedDB. */
export async function readStored(page: Page): Promise<unknown> {
  return page.evaluate(
    () =>
      new Promise<unknown>((resolve, reject) => {
        const open = indexedDB.open('sheet-music-101', 1);
        open.onerror = () => {
          reject(new Error('open failed'));
        };
        open.onsuccess = () => {
          const get = open.result.transaction('kv').objectStore('kv').get('progress');
          get.onsuccess = () => {
            open.result.close();
            resolve(get.result);
          };
        };
      }),
  );
}

/** What is on screen during a lesson. */
type Screen = 'complete' | 'feedback' | 'card' | 'question';

async function whatIsShown(page: Page): Promise<Screen> {
  await page
    .locator(
      '[data-testid=lesson-complete],[data-testid=feedback],[data-testid=concept-card],[data-testid=meet-card],[data-testid=question]',
    )
    .first()
    .waitFor();
  return page.evaluate((): Screen => {
    const has = (id: string) => document.querySelector(`[data-testid=${id}]`) !== null;
    if (has('lesson-complete')) return 'complete';
    if (has('feedback')) return 'feedback';
    if (has('concept-card') || has('meet-card')) return 'card';
    return 'question';
  });
}

/** Answers the question on screen: correctly, or with a deliberately wrong answer. */
export async function answerQuestion(page: Page, correct: boolean): Promise<Answer> {
  const q = page.getByTestId('question');
  const right = JSON.parse((await q.getAttribute('data-answer')) ?? 'null') as Answer;
  if (right.kind === 'letter') {
    const letter = correct
      ? right.letter
      : (LETTERS[(LETTERS.indexOf(right.letter) + 1) % 7] ?? 'A');
    await q
      .getByRole('group', { name: 'Answer with a letter' })
      .getByRole('button', { name: letter, exact: true })
      .click();
  } else if (right.kind === 'choice') {
    const pairs: Record<string, string> = {
      line: 'space',
      space: 'line',
      first: 'second',
      second: 'first',
      treble: 'bass',
      bass: 'treble',
    };
    const value = correct ? right.value : (pairs[right.value] ?? right.value);
    await q.getByRole('button', { name: CHOICE_LABEL[value] ?? value, exact: true }).click();
  } else if (right.kind === 'key') {
    const note = right.note === 'black' ? 'C4' : right.note;
    const letter = correct
      ? note.charAt(0)
      : (LETTERS[(LETTERS.indexOf(note.charAt(0) as (typeof LETTERS)[number]) + 1) % 7] ?? 'D');
    await q.locator(`[data-note="${letter}${note.charAt(1)}"]`).click();
  } else {
    throw new Error('position answers are not used in M4');
  }
  return right;
}

/**
 * Plays the lesson on screen to the end. `wrongFirst` makes that many questions wrong on their
 * first try (the retries are answered correctly). Returns how many question screens were shown.
 */
export async function playLesson(page: Page, wrongFirst = 0): Promise<number> {
  let wrongLeft = wrongFirst;
  let shown = 0;
  for (let guard = 0; guard < 200; guard++) {
    const screen = await whatIsShown(page);
    if (screen === 'complete') return shown;
    if (screen === 'card') await page.getByRole('button', { name: 'Got it' }).click();
    else if (screen === 'feedback') await page.getByRole('button', { name: 'Continue' }).click();
    else {
      shown += 1;
      const wrong = wrongLeft > 0;
      if (wrong) wrongLeft -= 1;
      await answerQuestion(page, !wrong);
      await expect(page.getByTestId('feedback')).toBeVisible();
    }
  }
  throw new Error('The lesson did not finish');
}

/** Simulates a new service worker taking over (e2e builds expose this hook; SPEC 7.8). */
export async function fireControllerChange(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __e2eFireControllerChange?: () => void };
    if (!w.__e2eFireControllerChange) throw new Error('e2e hook missing');
    w.__e2eFireControllerChange();
  });
}
