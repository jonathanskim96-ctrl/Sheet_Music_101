import type { Locator } from '@playwright/test';
import { cardId } from '../src/domain/cards';
import { cardName } from '../src/domain/content';
import { levelLessons, pathLessons, UNITS } from '../src/domain/curriculum';
import { describePosition } from '../src/domain/landmarks';
import { noteAtPosition } from '../src/domain/notes';
import type { CardState } from '../src/domain/srs';
import { test, expect } from './fixtures';
import {
  answerOf,
  answerQuestion,
  everythingDone,
  finish,
  go,
  playLesson,
  progressAfter,
  reachQuestion,
  seedProgress,
  startFresh,
} from './helpers';

const DAY = '2026-10-13';

test.describe('whole curriculum', () => {
  test.skip(({ isMobile }) => !isMobile, 'the long loop runs on the phone project only');

  test('every level-1 lesson, level-2/3 lesson and checkpoint can be played to the end', async ({
    page,
  }) => {
    test.setTimeout(600_000);
    test.slow();
    await startFresh(page);

    let played = 0;
    // level 1, in path order: each one unlocks the next (opening it by address checks the lock)
    for (const lesson of pathLessons()) {
      await go(page, `#/lesson/${lesson.id}`);
      await expect(
        page
          .getByTestId('feedback')
          .or(page.getByTestId('question'))
          .or(page.getByTestId('concept-card'))
          .or(page.getByTestId('meet-card'))
          .first(),
      ).toBeVisible();
      await playLesson(page);
      await finish(page);
      await expect(page.getByTestId(`bubble-${lesson.id}`)).toHaveAttribute(
        'data-state',
        'completed',
      );
      played += 1;
    }
    expect(played).toBe(pathLessons().length);

    // levels 2 and 3, unit by unit (level 3 opens once both level-2 lessons are done)
    for (const unit of UNITS) {
      for (const level of [2, 3] as const) {
        for (const lesson of levelLessons(unit.n, level)) {
          await go(page, `#/lesson/${lesson.id}`);
          await playLesson(page);
          await finish(page);
          played += 1;
        }
      }
    }
    expect(played).toBe(pathLessons().length + 36);

    for (const id of ['cp-a', 'cp-b', 'cp-c', 'cp-d']) {
      await go(page, `#/checkpoint/${id}`);
      await playLesson(page);
      await expect(page.getByRole('heading', { name: 'Checkpoint passed!' })).toBeVisible();
      await finish(page);
      played += 1;
    }
    expect(played).toBe(pathLessons().length + 36 + 4);
  });
});

test.describe('find the key', () => {
  test('find-key-letter accepts another octave and rejects a black key', async ({ page }) => {
    await page.clock.setFixedTime(new Date(`${DAY}T10:00:00`));
    await seedProgress(page, everythingDone());
    await go(page, '#/lesson/u2-lv2-a');

    // another octave of the same letter is right
    let q = await reachQuestion(page, 'find-key-letter');
    const right = await answerOf(q);
    if (right.kind !== 'key' || right.note === 'black') throw new Error('expected a key answer');
    const letter = right.note.charAt(0);
    const octave = Number(right.note.charAt(1));
    let tapped: Locator | null = null;
    for (const o of [octave + 1, octave - 1]) {
      const key = q.locator(`[data-note="${letter}${String(o)}"]`);
      if ((await key.count()) > 0) {
        tapped = key;
        break;
      }
    }
    if (!tapped) throw new Error('no other octave on the keyboard');
    await tapped.click();
    const feedback = page.getByTestId('feedback');
    await expect(feedback).toHaveAttribute('data-correct', 'true');
    await expect(feedback).toContainText(`Any ${letter} key works.`);
    await expect(tapped).toHaveAttribute('data-key-state', 'highlight');
    await page.getByRole('button', { name: 'Continue' }).click();

    // a black key is wrong; the matching key lights up
    q = await reachQuestion(page, 'find-key-letter');
    const right2 = await answerOf(q);
    if (right2.kind !== 'key' || right2.note === 'black') throw new Error('expected a key answer');
    await q
      .getByRole('button', { name: /\u266F \/ / })
      .first()
      .click();
    await expect(feedback).toHaveAttribute('data-correct', 'false');
    await expect(feedback).toContainText(`Any ${right2.note.charAt(0)} key works.`);
    await expect(q.locator(`[data-note="${right2.note}"]`)).toHaveAttribute(
      'data-key-state',
      'highlight',
    );
  });

  test('find-key-exact rejects the same letter in another octave', async ({ page }) => {
    await page.clock.setFixedTime(new Date(`${DAY}T10:00:00`));
    await seedProgress(page, everythingDone());
    await go(page, '#/lesson/u2-lv3-a');
    const q = await reachQuestion(page, 'find-key-exact');
    const right = await answerOf(q);
    if (right.kind !== 'key' || right.note === 'black') throw new Error('expected a key answer');
    const letter = right.note.charAt(0);
    const octave = Number(right.note.charAt(1));
    let wrong: Locator | null = null;
    for (const o of [octave + 1, octave - 1]) {
      const key = q.locator(`[data-note="${letter}${String(o)}"]`);
      if ((await key.count()) > 0) {
        wrong = key;
        break;
      }
    }
    if (!wrong) throw new Error('no other octave on the keyboard');
    await wrong.click();
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-correct', 'false');
    await expect(wrong).toHaveAttribute('data-key-state', 'wrong');
    // a pointer tap must not paint focus over the key's result colour (owner approved this check)
    await expect(wrong).toHaveCSS('outline-style', 'none');
    await expect(q.locator(`[data-note="${right.note}"]`)).toHaveAttribute(
      'data-key-state',
      'highlight',
    );
  });

  test('a grand-staff lesson asks on a grand staff with the keyboard under it', async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date(`${DAY}T10:00:00`));
    await seedProgress(page, everythingDone());
    await go(page, '#/lesson/u8-lv2-a');
    const q = await reachQuestion(page, 'find-key-letter');
    await expect(q.getByTestId('staff')).toBeVisible();
    await expect(q.getByTestId('keyboard')).toBeVisible();
    await answerQuestion(page, true);
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-correct', 'true');
  });
});

test.describe('find on the staff', () => {
  test('tap, nudge and Check: right when nudged onto the letter', async ({ page }) => {
    await page.clock.setFixedTime(new Date(`${DAY}T10:00:00`));
    await seedProgress(page, everythingDone());
    await go(page, '#/lesson/u2-lv3-a');
    const q = await reachQuestion(page, 'find-on-staff');
    const right = await answerOf(q);
    if (right.kind !== 'position') throw new Error('expected a position answer');

    await expect(q.getByRole('button', { name: 'Check' })).toBeDisabled();
    await expect(q.getByRole('button', { name: 'Move the note up' })).toBeDisabled();
    // one step off, then nudge back
    const off = right.position + (right.position < 12 ? 1 : -1);
    await q.locator(`[data-position="${String(off)}"]`).click();
    await expect(q.locator('[data-note-state="ghost"]')).toHaveAttribute(
      'data-note-position',
      String(off),
    );
    await expect(q.getByRole('button', { name: 'Check' })).toBeEnabled();
    await q
      .getByRole('button', {
        name: off > right.position ? 'Move the note down' : 'Move the note up',
      })
      .click();
    await expect(q.locator('[data-note-state="ghost"]')).toHaveAttribute(
      'data-note-position',
      String(right.position),
    );
    await q.getByRole('button', { name: 'Check' }).click();
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-correct', 'true');
    await expect(q.locator('[data-note-state="correct"]')).toHaveCount(1);
    await expect(q.getByRole('button', { name: 'Check' })).toBeDisabled();
  });

  test('a wrong note shows beside the nearest right one, even in another octave', async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date(`${DAY}T10:00:00`));
    await seedProgress(page, everythingDone());
    await go(page, '#/lesson/u2-lv3-a');
    const q = await reachQuestion(page, 'find-on-staff');
    const right = await answerOf(q);
    if (right.kind !== 'position') throw new Error('expected a position answer');
    // The same letter an octave away (7 positions) always fits in the tappable range -4..12.
    // Tap just beyond it, so it (not the card's own position) is the nearest right note.
    const other = right.position + 7 <= 12 ? right.position + 7 : right.position - 7;
    const away = other > right.position ? 1 : -1;
    const off = other + away >= -4 && other + away <= 12 ? other + away : other - away;
    await q.locator(`[data-position="${String(off)}"]`).click();
    await q.getByRole('button', { name: 'Check' }).click();
    const feedback = page.getByTestId('feedback');
    await expect(feedback).toHaveAttribute('data-correct', 'false');
    await expect(q.locator('[data-note-state="wrong"]')).toHaveAttribute(
      'data-note-position',
      String(off),
    );
    await expect(q.locator('[data-note-state="correct"]')).toHaveAttribute(
      'data-note-position',
      String(other),
    );
    // the words describe the green note that is drawn, not the card's own octave
    const clef = 'treble'; // unit 2 is a treble unit
    const note = noteAtPosition(clef, other);
    if (!note) throw new Error('no note');
    await expect(feedback).toContainText(
      new RegExp(`(It's|is) ${cardName(cardId(clef, note))}\\.`),
    );
    await expect(feedback).toContainText(describePosition(clef, note));
  });

  test('the nudge buttons stop at the ends of the tappable range', async ({ page }) => {
    await page.clock.setFixedTime(new Date(`${DAY}T10:00:00`));
    await seedProgress(page, everythingDone());
    await go(page, '#/lesson/u2-lv3-a');
    const q = await reachQuestion(page, 'find-on-staff');
    await q.locator('[data-position="-4"]').click();
    await expect(q.getByRole('button', { name: 'Move the note down' })).toBeDisabled();
    await expect(q.getByRole('button', { name: 'Move the note up' })).toBeEnabled();
    await q.locator('[data-position="12"]').click();
    await expect(q.getByRole('button', { name: 'Move the note up' })).toBeDisabled();
    await expect(q.getByRole('button', { name: 'Move the note down' })).toBeEnabled();
  });
});

test.describe('steps and skips', () => {
  test('unit 11 lesson 1 has 2 buttons and names the move; lesson 2 has 4', async ({ page }) => {
    await seedProgress(
      page,
      progressAfter(39, (p) => {
        p.flags.keyboardUnlockSeen = true;
      }),
    ); // units 1-10 done
    await page.getByTestId('bubble-u11-l1').click();
    await page.getByRole('button', { name: 'Got it' }).click(); // concept card
    let q = page.getByTestId('question');
    await expect(
      q.getByRole('group', { name: 'Choose an answer' }).getByRole('button'),
    ).toHaveCount(2);
    await expect(q.getByRole('heading')).toHaveText('Does the second note step up or step down?');
    await answerQuestion(page, false);
    const feedback = page.getByTestId('feedback');
    await expect(feedback).toHaveAttribute('data-correct', 'false');
    await expect(feedback).toContainText(/It's a step (up|down): (line to space|space to line)\./);
    await page.getByRole('button', { name: 'Continue' }).click();
    await playLesson(page);
    await finish(page);

    await page.getByTestId('bubble-u11-l2').click();
    await page.getByRole('button', { name: 'Got it' }).click();
    q = page.getByTestId('question');
    await expect(
      q.getByRole('group', { name: 'Choose an answer' }).getByRole('button'),
    ).toHaveCount(4);
    await expect(q.getByRole('heading')).toHaveText('How does the second note move?');
    await answerQuestion(page, true);
    await expect(feedback).toHaveAttribute('data-correct', 'true');
    await expect(feedback).toContainText(
      /It's a (step|skip) (up|down): (line|space) to (line|space)\./,
    );
  });
});

test.describe('levels and the keyboard', () => {
  test('the keyboard sheet appears once after u4-l5, and Level 2/3 buttons open the right lessons', async ({
    page,
  }) => {
    await seedProgress(page, progressAfter(15)); // everything before u4-l5
    const sheet = page.getByRole('dialog', { name: 'New: piano keyboard!' });
    await expect(sheet).toHaveCount(0);
    await expect(page.getByTestId('unit-2-level-2')).toHaveCount(0);

    await page.getByTestId('bubble-u4-l5').click();
    await playLesson(page);
    await finish(page);
    await expect(sheet).toBeVisible();
    await sheet.getByRole('button', { name: 'Cool!' }).click();
    await expect(sheet).toBeHidden();
    await page.reload();
    await expect(page.getByTestId('bubble-u5-l1')).toBeVisible();
    await expect(sheet).toHaveCount(0); // once only

    // Level 2 is open for finished units 2-4, not for unit 5 or unit 1
    for (const n of [2, 3, 4])
      await expect(page.getByTestId(`unit-${String(n)}-level-2`)).toBeVisible();
    await expect(page.getByTestId('unit-5-level-2')).toHaveCount(0);
    await expect(page.getByTestId('unit-1-level-2')).toHaveCount(0);
    await expect(page.getByTestId('unit-2-level-3')).toHaveCount(0);
    const stars = page
      .getByRole('region', { name: 'Unit 2', exact: true })
      .getByTestId('level-stars');
    await expect(stars).toHaveAttribute('data-level', '1');

    // Level 2: lesson a first, then b; the stars fill when both are done and Level 3 appears
    await page.getByTestId('unit-2-level-2').click();
    await expect(page).toHaveURL(/#\/lesson\/u2-lv2-a$/);
    await playLesson(page);
    await finish(page);
    await expect(stars).toHaveAttribute('data-level', '1');
    await page.getByTestId('unit-2-level-2').click();
    await expect(page).toHaveURL(/#\/lesson\/u2-lv2-b$/);
    await playLesson(page);
    await finish(page);
    await expect(stars).toHaveAttribute('data-level', '2');
    await expect(page.getByTestId('unit-2-level-3')).toBeVisible();
    await page.getByTestId('unit-2-level-3').click();
    await expect(page).toHaveURL(/#\/lesson\/u2-lv3-a$/);
  });
});

test.describe('checkpoints', () => {
  test('passing cp-a from a fresh start completes units 1-4 and unlocks the keyboard', async ({
    page,
  }) => {
    await startFresh(page);
    await expect(page.getByTestId('checkpoint-cp-a')).toContainText('Jump ahead');
    await page.getByTestId('checkpoint-cp-a').click();
    await expect(page).toHaveURL(/#\/checkpoint\/cp-a$/);
    await playLesson(page);
    await expect(page.getByRole('heading', { name: 'Checkpoint passed!' })).toBeVisible();
    await expect(page.getByText("You've unlocked everything up to here!")).toBeVisible();
    await expect(page.getByTestId('stat-xp')).toHaveText('+35'); // 10 + 5 perfect + 20 passed
    await page.getByRole('button', { name: 'Continue' }).click();

    for (const id of ['u1-l1', 'u2-l3', 'u3-l4', 'u4-l5']) {
      await expect(page.getByTestId(`bubble-${id}`)).toHaveAttribute('data-state', 'completed');
    }
    await expect(page.getByTestId('bubble-u5-l1')).toHaveAttribute('data-state', 'current');
    await expect(page.getByTestId('xp-value')).toHaveText('35');
    await expect(page.getByRole('dialog', { name: 'New: piano keyboard!' })).toBeVisible();
    await expect(page.getByTestId('checkpoint-cp-a')).toContainText('Test yourself');
    await expect(page.getByTestId('unit-3-level-2')).toBeVisible();
  });

  test('a checkpoint id under the lesson route goes home; unknown checkpoints do too', async ({
    page,
  }) => {
    await startFresh(page);
    for (const bad of ['#/lesson/cp-a', '#/checkpoint/cp-z']) {
      await go(page, bad);
      await expect.poll(() => page.evaluate(() => window.location.hash), bad).toBe('#/');
      await expect(page.getByTestId('bubble-u1-l1')).toBeVisible();
    }
  });

  test('after passing cp-b from a fresh start, open lessons are not drawn as locked', async ({
    page,
  }) => {
    await startFresh(page);
    await page.getByTestId('checkpoint-cp-b').click();
    await playLesson(page);
    await expect(page.getByRole('heading', { name: 'Checkpoint passed!' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    // u8-l1 is open but u1-l1 is still the current lesson: unit colour, no lock, no "Start"
    await expect(page.getByTestId('bubble-u1-l1')).toHaveAttribute('data-state', 'current');
    await expect(page.getByTestId('bubble-u8-l1')).toHaveAttribute('data-state', 'open');
    await expect(page.getByTestId('bubble-u8-l1')).toHaveAccessibleName(/available$/);
    await expect(page.getByText('Start', { exact: true })).toHaveCount(1);
    await page.getByTestId('bubble-u8-l1').click();
    await expect(page).toHaveURL(/#\/lesson\/u8-l1$/);
  });

  test('failing cp-b unlocks nothing and still earns 10 XP', async ({ page }) => {
    await startFresh(page);
    await page.getByTestId('checkpoint-cp-b').click();
    await expect(page).toHaveURL(/#\/checkpoint\/cp-b$/);
    // 3 wrong first tries = 12 of 15 right, one short of the pass mark; there are no retries
    const shown = await playLesson(page, 3);
    expect(shown).toBe(15);
    await expect(page.getByRole('heading', { name: 'Good effort!' })).toBeVisible();
    await expect(page.getByText('Not this time.', { exact: false })).toBeVisible();
    await expect(page.getByTestId('stat-xp')).toHaveText('+10');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByTestId('xp-value')).toHaveText('10');
    await expect(page.getByTestId('bubble-u1-l1')).toHaveAttribute('data-state', 'current');
    await expect(page.getByTestId('bubble-u5-l1')).toHaveAttribute('data-state', 'locked');
    await expect(page.getByRole('dialog', { name: 'New: piano keyboard!' })).toHaveCount(0);
  });

  test('13 of 15 is a pass: cp-c with 2 slips completes units 1-10', async ({ page }) => {
    await startFresh(page);
    await page.getByTestId('checkpoint-cp-c').click();
    await playLesson(page, 2);
    await expect(page.getByRole('heading', { name: 'Checkpoint passed!' })).toBeVisible();
    await expect(page.getByTestId('stat-xp')).toHaveText('+30'); // 10 + 20, not perfect
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByTestId('bubble-u10-l5')).toHaveAttribute('data-state', 'completed');
    await expect(page.getByTestId('bubble-u11-l1')).toHaveAttribute('data-state', 'current');
  });
});

test.describe('practice', () => {
  test('reviews the due cards first, twice each when few are due', async ({ page }) => {
    await page.clock.setFixedTime(new Date(`${DAY}T10:00:00`));
    const state = (box: CardState['box'], lastSeenDay: string): CardState => ({
      box,
      lastSeenDay,
      lastPromotedDay: null,
      seen: 4,
      correct: 3,
      avgMs: 3000,
    });
    await seedProgress(
      page,
      progressAfter(16, (p) => {
        p.flags.keyboardUnlockSeen = true;
        // three cards are due (old, box 1); four were seen today and are not
        for (const id of ['treble-C4', 'treble-E4', 'treble-G4'] as const) {
          p.cards[id] = state(1, '2026-10-01');
        }
        for (const id of ['treble-D4', 'treble-F4', 'treble-A4', 'treble-B4'] as const) {
          p.cards[id] = state(5, DAY);
        }
      }),
    );
    await page.getByRole('button', { name: 'Practise' }).click();
    await expect(page).toHaveURL(/#\/review$/);

    const letters: string[] = [];
    for (let i = 0; i < 10; i++) {
      await expect(page.getByTestId('question')).toBeVisible();
      const right = await answerOf(page.getByTestId('question'));
      letters.push(
        right.kind === 'letter' ? right.letter : right.kind === 'key' ? right.note.charAt(0) : '?',
      );
      await answerQuestion(page, true);
      await page.getByRole('button', { name: 'Continue' }).click();
    }
    // due: C, E and G twice each; then the four others once each
    expect(letters.sort().join('')).toBe('AB' + 'CC' + 'D' + 'EE' + 'F' + 'GG');
    await expect(page.getByRole('heading', { name: 'Practice complete!' })).toBeVisible();
    await finish(page);
  });
});
