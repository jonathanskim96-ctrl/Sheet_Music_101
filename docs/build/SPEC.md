# Sheet Music 101: technical and product specification

This is the single source of truth for **what** to build. `docs/build/M*.md` say
**in what order**; `docs/build/STANDARDS.md` says **how**; `docs/build/CURRICULUM.md`
holds the lesson data and all learner-facing text.

If something you need is not written here, **stop and ask** (see `CLAUDE.md`). Do not
invent product behaviour.

---

## 1. Fixed decisions

| Topic | Decision |
|---|---|
| Users | 1–2 people, each on their own phone. No accounts, no sync, no sharing. |
| Storage | IndexedDB on the device, via `idb`. Backup = export/import a JSON file. |
| Hosting | GitHub Pages at `https://jonathanskim96-ctrl.github.io/Sheet_Music_101/` (base path `/Sheet_Music_101/`). |
| Style | Bright, colourful, playful; mascot "Quaver" (a cartoon eighth note). |
| Streak | **None.** Show total days practised and total XP (they only go up). |
| Hearts | **None.** Mistakes are explained, repeated later in the lesson, never block. |
| Answering | A–G letter buttons first; piano keyboard questions unlock after Unit 4. |
| Sound | On by default, mute toggle in lesson header and in settings. |
| Notation | Units 1–11: whole notes only (no stems), natural notes only. Units 12–25 (§8): sharps, flats and naturals; 1-, 2-, 3- and 4-beat notes, half-beat pairs and rests; boxes of 2, 3 or 4 beats; home signs G, F, D, B♭. Range C2–C6 throughout (owner, 2026-10-14). |
| Leaving a lesson | Nothing from an unfinished lesson is saved (lessons are ~3 minutes). |
| Note names shown to the learner | Letters only ("G"), plus nicknames for landmarks ("Treble G"); sign notes as symbols ("F♯", "B♭"). Octave numbers (G4) are internal only and never shown. Plain words, no music jargon (owner, 2026-10-14; CURRICULUM Part 2). |
| Routing | Hash routes (`#/…`) so GitHub Pages never needs server rewrites. |
| Clock and randomness | Domain code never calls `Date`, `Date.now()` or `Math.random()`; `now` and a seed are passed in. |

---

## 2. Tech stack (versions verified to install, build and test together on 2026-10-12)

Pin **exact** versions (no `^` or `~`). Every version is at least two weeks old on purpose.

**dependencies**

| Package | Version |
|---|---|
| react | 19.3.0 |
| react-dom | 19.3.0 |
| idb | 8.0.3 |
| @fontsource/nunito | 5.3.0 |
| lucide-react | 1.48.0 |

**devDependencies**

| Package | Version |
|---|---|
| vite | 8.3.1 |
| @vitejs/plugin-react | 6.1.1 |
| typescript | 6.0.3 (NOT 7.x: typescript-eslint supports `<6.1`) |
| vite-plugin-pwa | 1.3.0 |
| workbox-window | 7.4.1 |
| vitest | 4.1.11 |
| fake-indexeddb | 6.2.5 |
| @playwright/test | 1.56.1 (matches the Chromium pre-installed in cloud sessions) |
| eslint | 10.11.0 |
| @eslint/js | 10.0.1 |
| typescript-eslint | 8.71.0 |
| eslint-plugin-react-hooks | 7.1.1 |
| globals | 17.12.0 |
| prettier | 3.9.9 |
| fast-check | 4.10.2 |
| @types/react | 19.3.0 |
| @types/react-dom | 19.3.0 |
| @types/node | 22.20.4 |

Node **22.22.0** (`.nvmrc`). **npm caveat:** npm 10 (bundled with Node 22) crashes with
`Cannot read properties of null (reading 'edgesOut')` when *resolving* this set. Therefore:
- To add/upgrade/remove a package: `npx -y npm@11.6.2 install -E <pkg>@<version>` (or
  `uninstall`). This updates `package-lock.json`.
- Clean install (local and CI): plain `npm ci` (works with npm 10 from the lockfile).
- Do not use `--legacy-peer-deps` or `--force`.

Not used (decided): jsdom/happy-dom (no component unit tests; UI is tested in a real
browser by Playwright), any router library, any state library, VexFlow, any confetti or
animation library, any CSS framework.

---

## 3. Source layout

```
index.html
public/
  favicon.svg
  icons/  icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon-180.png
src/
  main.tsx                 bootstrap: frame-bust, fonts, global CSS, SW register, render <App/>
  vite-env.d.ts
  app/
    App.tsx                ErrorBoundary > ProgressProvider > shell (UpdateBanner, Toasts, current screen)
    router.ts              Route type, parseHash(), routeToHash(), useRoute(), navigate()
    ErrorBoundary.tsx
    toasts.tsx             tiny toast context (message + kind), auto-dismiss 4 s
  domain/                  PURE. No React, DOM, IndexedDB, Date/Math.random.
    notes.ts  cards.ts  days.ts  rng.ts  srs.ts  progress.ts  validate.ts  upgrades.ts
    curriculum.ts  content.ts  unlocks.ts  questions.ts  lessonBuilder.ts  session.ts
    planners.ts  backup.ts  keyboardWindow.ts  landmarks.ts
    ids.lock.json          every lesson id and card id ever shipped (see §6.4)
    *.test.ts
  data/
    db.ts                  IndexedDB open + raw read/write (only file importing `idb`)
    store.ts               ProgressStore: load, commit(planner), subscribe, error state
    ProgressContext.tsx    React provider + hooks
    persist.ts             navigator.storage.persist()/persisted()
    files.ts               export (share/download) and import (read file with size cap)
    *.test.ts              (use fake-indexeddb)
  audio/
    synth.ts               Web Audio engine (no audio files)
  notation/
    glyphs.ts              PROVIDED, generated (do not edit)
    geometry.ts            pure layout maths (tested)
    Staff.tsx  Keyboard.tsx
  ui/
    Button.tsx  ProgressBar.tsx  Mascot.tsx  Confetti.tsx  Sheet.tsx  DailyGoalRing.tsx
    LessonBubble.tsx  UnitHeader.tsx  InstallCard.tsx  BackupReminderCard.tsx  icons.ts
  screens/
    WelcomeScreen.tsx  PathScreen.tsx  LessonScreen.tsx  ProgressScreen.tsx
    SettingsScreen.tsx  GalleryScreen.tsx (dev + e2e builds only)
    lesson/ ConceptCard.tsx MeetCard.tsx QuestionView.tsx FeedbackBar.tsx LessonComplete.tsx
            questions/ NameNote.tsx FindKey.tsx FindOnStaff.tsx StepSkip.tsx Unit1Questions.tsx
  pwa/
    register.ts  UpdateBanner.tsx  install.ts
  styles/
    tokens.css  base.css   (+ one `*.module.css` next to each component that needs styles)
e2e/                       Playwright specs
scripts/                   check-safety.mjs, check-dist.mjs, make-icons.mjs
tests/fixtures/            saved-progress fixtures per schema version (never edited)
tools/glyphs/extract.py    PROVIDED
LICENSES/Bravura-OFL.txt   PROVIDED
```

Import rules (enforced by ESLint, see M1): `domain` imports nothing outside `domain`;
`data` may import `domain`; `ui`/`screens` may import anything except `data/db.ts`
(they go through `ProgressContext`).

---

## 4. Domain model

### 4.1 Notes (`domain/notes.ts`)

```ts
export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type Clef = 'treble' | 'bass';
export type Note = `${Letter}${2 | 3 | 4 | 5 | 6}`;           // 'C2' … 'B6'; only C2–C6 used
export const LETTERS: readonly Letter[] = ['C','D','E','F','G','A','B'];
export function parseNote(s: string): Note | null;              // strict: /^[A-G][2-6]$/
export function letterOf(n: Note): Letter;
export function octaveOf(n: Note): number;
export function diatonicIndex(n: Note): number;                 // octave*7 + LETTERS.indexOf(letter); C4 = 28
export function noteFromDiatonic(i: number): Note | null;       // inverse; null outside C2..B6
export function staffPosition(clef: Clef, n: Note): number;     // treble: d - 30 (E4 = 0); bass: d - 18 (G2 = 0)
export function noteAtPosition(clef: Clef, p: number): Note | null;
export function midiNumber(n: Note): number;                    // C4 = 60; semitones C0 D2 E4 F5 G7 A9 B11
export function frequency(n: Note): number;                     // 440 * 2 ** ((midi - 69) / 12)
```

**Staff position `p`:** 0 = bottom line, each +1 = half a staff space up. Even `p` = line
(0,2,4,6,8 = lines 1–5), odd = space (1,3,5,7 = spaces 1–4). `p ≤ -1` below, `p ≥ 9` above.

### 4.2 Cards (`domain/cards.ts`)

A card = one note in one clef, the unit of memory. `CardId = \`${Clef}-${Note}\``, e.g.
`treble-G4`, `bass-C4`. Treble C4 and bass C4 are **different cards**.

All 34 natural cards (`NATURAL_CARDS`, in this order; `ALL_CARDS` appends the 12 sign cards of §8.1, built in M8):
- treble: A3 B3 C4 D4 E4 F4 G4 A4 B4 C5 D5 E5 F5 G5 A5 B5 C6
- bass:   C2 D2 E2 F2 G2 A2 B2 C3 D3 E3 F3 G3 A3 B3 C4 D4 E4

`parseCardId(s): {clef, note} | null` must accept only ids in `ALL_CARDS`.

### 4.3 Days (`domain/days.ts`)

```ts
export type DayKey = string;                         // 'YYYY-MM-DD', the learner's LOCAL date
export function dayKeyOf(now: Date): DayKey;          // uses getFullYear/getMonth/getDate (local)
export function isDayKey(s: unknown): s is DayKey;    // regex AND a real calendar date (no 2026-02-30)
export function daysBetween(a: DayKey, b: DayKey): number; // b - a in whole days, computed via Date.UTC (DST-proof)
```

### 4.4 Random (`domain/rng.ts`)

`mulberry32(seed: number): () => number` (returns [0,1)); `shuffle(arr, rand)` (Fisher–Yates,
returns a new array); `pickWeighted(items, weights, rand)`. Seed for real lessons =
`(Date.now() ^ hash(lessonId)) >>> 0`, computed in the UI layer and passed in.

### 4.5 Spaced repetition (`domain/srs.ts`)

```ts
export type Box = 1 | 2 | 3 | 4 | 5;
export interface CardState {
  box: Box;
  lastSeenDay: DayKey;
  lastPromotedDay: DayKey | null;
  seen: number;        // first-attempt answers counted
  correct: number;     // first-attempt correct answers
  avgMs: number;       // integer, exponential moving average of answer time
}
export const INTERVAL_DAYS: Record<Box, number> = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 21 };
export const SLOW_MS = 6000;
```

`updateCard(prev: CardState | undefined, correct: boolean, ms: number, today: DayKey): CardState`
1. If `prev` is undefined start from `{box:1, lastSeenDay: today, lastPromotedDay: null, seen:0, correct:0, avgMs: clampMs(ms)}`.
2. `seen += 1`; if correct `correct += 1`.
3. `avgMs = prev ? round(0.7 * prev.avgMs + 0.3 * clampMs(ms)) : clampMs(ms)`; `clampMs` = clamp to 0..60000, integer.
4. If correct AND `ms <= SLOW_MS` AND `lastPromotedDay !== today`: `box = min(5, box+1)`, `lastPromotedDay = today`.
5. If wrong: `box = max(1, box-2)`.
6. `lastSeenDay = today`. Return a new object.

`isDue(c, today) = daysBetween(c.lastSeenDay, today) >= INTERVAL_DAYS[c.box]`.

`masteryOf(c | undefined): 'new' | 'learning' | 'almost' | 'known'` = undefined→new, box 1–2→learning,
3→almost, 4–5→known.

### 4.6 Progress document (`domain/progress.ts`)

```ts
export const CURRENT_SCHEMA_VERSION = 2; // 1 → 2 in M8 (§8.2)
export interface LessonRecord {
  timesCompleted: number;     // 0 means "completed by passing a checkpoint" (skipped)
  bestAccuracy: number;       // integer 0..100
  firstCompletedDay: DayKey;
  lastCompletedDay: DayKey;
}
export interface Progress {
  schemaVersion: 2;
  createdDay: DayKey;
  settings: { soundOn: boolean; dailyGoal: 1 | 2 | 3 };
  xp: number;
  lessons: Record<LessonId, LessonRecord>;   // level-1, level-2/3 and checkpoint ids; never 'review'
  cards: Record<CardId, CardState>;
  daysPracticed: DayKey[];                   // ascending, unique
  today: { day: DayKey; lessonsDone: number };
  flags: {
    welcomeSeen: boolean;
    keyboardUnlockSeen: boolean;
    installCardDismissedDay: DayKey | null;
    lastExportDay: DayKey | null;
  };
  totals: { questionsAnswered: number; correctFirstTry: number; reviewsDone: number; lessonsDone: number };
}
export function emptyProgress(today: DayKey): Progress;
// defaults: soundOn true, dailyGoal 1, xp 0, all flags false/null, totals 0, today {day: today, lessonsDone: 0}
```

`lessonsDoneToday(p, today) = p.today.day === today ? p.today.lessonsDone : 0`.

### 4.7 Validation (`domain/validate.ts`)

One function, two modes:

```ts
export type CheckMode = 'strict' | 'repair';
export interface CheckResult { progress: Progress | null; issues: string[] }
export function checkProgress(raw: unknown, mode: CheckMode): CheckResult;
```

- Input is untrusted. Build a **fresh** object; never spread or `Object.assign` the input;
  never read keys that are not listed below; only iterate with `Object.keys` + an id regex.
- `strict`: any problem → `progress: null` with every issue listed (max 20 messages).
- `repair`: drop invalid map entries; for numeric fields: a finite number is floored to an
  integer and clamped into range, anything else (string, NaN, null…) becomes the default
  (0, or 1 for `box`/`dailyGoal`); other invalid scalars become their default from
  `emptyProgress`; record each fix as an issue. Top level not a plain object, or
  `schemaVersion` not `2` → `progress: null` (message `schemaVersion: must be 2`; older documents go through `upgradeToCurrent` first).

Rules (both modes):

| Field | Rule |
|---|---|
| schemaVersion | exactly `2` |
| createdDay, *Day fields | `isDayKey`; nullable ones may be `null` |
| settings.soundOn | boolean |
| settings.dailyGoal | 1, 2 or 3 |
| xp, totals.* , seen, correct, timesCompleted, today.lessonsDone | safe integer, 0 ≤ n ≤ 1 000 000 000 |
| bestAccuracy | integer 0..100 |
| avgMs | integer 0..60 000 |
| box | integer 1..5 |
| card.correct | ≤ card.seen (repair: set to seen) |
| lessons keys | match `/^[a-z0-9-]{1,32}$/`; at most 1000 entries. Unknown-but-well-formed ids are KEPT (forward compatibility) |
| cards keys | must be in `ALL_CARDS` (the 46, §8.1) (repair: drop others); at most 1000 entries |
| daysPracticed | array of DayKey, ≤ 50 000 entries; repair: drop invalid, sort, dedupe |
| strings | ids ≤ 32 chars; DayKey exactly 10 chars |

The id regex excludes `_`, so `__proto__`/`constructor` can never become keys. Build maps with
`Object.create(null)` during parsing, then copy into normal objects.

### 4.8 Schema upgrades (`domain/upgrades.ts`)

```ts
export function upgradeToCurrent(raw: unknown): { ok: true; value: unknown } | { ok: false; reason: 'newer' | 'unknown' };
```
Step 1 → 2 exists since M8 (§8.2; no field changes). Rule for the future: a change to `Progress` = bump `CURRENT_SCHEMA_VERSION`,
add a step `vN → vN+1` (append only, never edit an old step), add fixture
`tests/fixtures/progress-vN+1.json`, keep all old fixtures loading. `reason: 'newer'` when
`schemaVersion > CURRENT_SCHEMA_VERSION`.

### 4.9 Curriculum types (`domain/curriculum.ts`; data in `CURRICULUM.md`)

```ts
export type LessonId = string; // 'u2-l1', 'u2-lv2-a', 'cp-a' …
export type QuestionKind = 'name-note' | 'find-key-letter' | 'find-key-exact' | 'find-on-staff'
  | 'step-skip' | 'alphabet-next' | 'keyboard-letter' | 'line-or-space' | 'higher-lower' | 'clef-identify';
export interface LessonDef {
  id: LessonId;
  unit: number;                  // 1..11
  level: 1 | 2 | 3;
  title: string;
  conceptCards: ConceptCardId[]; // shown before questions, in order
  newCards: CardId[];            // get a Meet card, and 3 questions each
  pool: CardId[];                // every card this lesson may ask about (includes newCards)
  mix: Partial<Record<QuestionKind, number>>; // weights; must sum to 100
  questionCount: number;         // 8 for unit 1, 10 otherwise, 15 checkpoints
  render: 'single' | 'grand';
  stepSkipConfig?: { clefs: Clef[]; intervals: ('step' | 'skip')[]; buttons: 2 | 4 };
}
export interface UnitDef { n: number; title: string; subtitle: string; color: string /* token name */; lessons: LessonDef[] }
export interface CheckpointDef { id: 'cp-a' | 'cp-b' | 'cp-c'; title: string; afterUnit: number; completesUnits: number[]; pool: CardId[] }
```

Helpers: `UNITS`, `CHECKPOINTS`, `pathLessons()` (all level-1 lessons in path order),
`findLesson(id)`, `levelLessons(unit, level)`, `allLessonIds()`.

A **curriculum self-check test** must assert: ids unique; every `newCards` ⊆ `pool`; every
pool card in `ALL_CARDS`; a card appears in `newCards` at most once across the whole
level-1 path; every pool card was introduced in the same or an earlier lesson
(path order); mixes sum to 100; level-2/3 lessons exist exactly for units 2–10.

### 4.10 Unlock rules (`domain/unlocks.ts`)

- `isCompleted(p, id) = id in p.lessons`.
- Level-1 lesson available ⇔ it is the first path lesson, or the previous path lesson is completed.
  Completed lessons are always replayable.
- `keyboardUnlocked(p)` ⇔ `u4-l5` completed (or `cp-a` passed, which completes it).
- Level 2 of unit U (2–10) available ⇔ `keyboardUnlocked` AND all level-1 lessons of U completed.
  Level 3 available ⇔ both level-2 lessons of U completed. Units 1 and 11 have no levels 2–3.
- `unitLevel(p, U)` = 0 (level 1 not done), 1, 2 or 3 (highest fully completed level).
- Checkpoints: always available (they are the "jump ahead" route).
- Review available ⇔ at least 3 cards in `p.cards`.
- `currentLesson(p)` = first available-but-not-completed path lesson, or null when all done.

### 4.11 Questions (`domain/questions.ts`)

```ts
export type Question =
  | { kind: 'name-note'; card: CardId; render: 'single' | 'grand' }
  | { kind: 'find-key-letter'; card: CardId; render: 'single' | 'grand' } // any key with the right letter
  | { kind: 'find-key-exact'; card: CardId; render: 'single' | 'grand' }  // the exact key
  | { kind: 'find-on-staff'; card: CardId }                              // tap a position with that letter (any octave)
  | { kind: 'step-skip'; clef: Clef; first: Note; second: Note; buttons: 2 | 4 }
  | { kind: 'alphabet-next'; letter: Letter; direction: 'after' | 'before' }
  | { kind: 'keyboard-letter'; letter: Letter }
  | { kind: 'line-or-space'; position: number }  // 0..8, drawn on a staff with no clef
  | { kind: 'higher-lower'; first: Note; second: Note } // treble staff; different notes
  | { kind: 'clef-identify'; clef: Clef };
export type Answer =
  | { kind: 'letter'; letter: Letter }
  | { kind: 'key'; note: Note | 'black' }
  | { kind: 'position'; position: number }
  | { kind: 'choice'; value: 'line' | 'space' | 'first' | 'second' | 'treble' | 'bass'
                           | 'step-up' | 'step-down' | 'skip-up' | 'skip-down' };
export function checkAnswer(q: Question, a: Answer): boolean;
export function correctAnswerOf(q: Question): Answer; // used for feedback and the e2e hook
export function cardOf(q: Question): CardId | null;  // only note questions have cards
```

Answer rules: name-note → letter equals the card's letter. find-key-letter → key's letter
equals card letter (black key = wrong). find-key-exact → key note equals card note.
find-on-staff → `noteAtPosition(cardClef, position)` letter equals card letter.
step-skip → step = diatonic distance 1, skip = 2; up/down by sign. alphabet-next → next/previous
letter cyclically (G→A, A→G). keyboard-letter → any white key of that letter.
line-or-space → even = line. higher-lower → higher diatonic index. clef-identify → clef.

### 4.12 Lesson builder (`domain/lessonBuilder.ts`)

```ts
export interface LessonPlan {
  context: { kind: 'lesson'; lessonId: LessonId } | { kind: 'review' } | { kind: 'checkpoint'; id: CheckpointDef['id'] };
  conceptCards: ConceptCardId[];
  meetCards: CardId[];
  questions: Question[];
  retries: boolean;   // false for checkpoints
}
export function buildLesson(def: LessonDef, p: Progress, today: DayKey, seed: number): LessonPlan;
export function buildReview(p: Progress, today: DayKey, seed: number): LessonPlan;
export function buildCheckpoint(cp: CheckpointDef, seed: number): LessonPlan;
```

**buildLesson for note lessons** (units 2–10, all levels):
1. `meetCards` = `def.newCards` that are not yet in `p.cards` (replays skip the Meet card).
2. Card slots (length `questionCount`): each `newCards` card 3 times. Fill the rest by
   weighted sampling from `pool`: weight 4 if the card is new to the learner, due, or box ≤ 2;
   else 1. No card more than `ceil(questionCount / pool.length) + 2` times.
3. Kind per slot: sample from `def.mix` (weights). Constraint: a card's **first** slot
   in a level-1 lesson is always `name-note`.
4. Order: shuffle, then repair: walk the list, and if slot i has the same card as i−1, swap it
   with the first later slot j whose card differs from both neighbours of i. If none exists,
   leave it (only possible with tiny pools).
5. `render` comes from `def.render` (`find-on-staff` always uses a single staff).

**Unit 1** (`alphabet-next`, `keyboard-letter`, `line-or-space`, `higher-lower`,
`clef-identify`): generate `questionCount` random questions of the mix kinds; no two
identical questions in a row; `higher-lower` notes from E4..F5, at least 2 steps apart.

**Unit 11** (`step-skip`): first note random in the clef with `p` in 0..8, second =
first ± 1 (step) or ± 2 (skip) per `stepSkipConfig`, and second must have `p` in -1..9.

**buildReview:** pool = cards in `p.cards`. Order due cards by box ascending, then
`lastSeenDay` ascending; take up to 10 (a card may appear twice if fewer than 5 cards are due);
fill to 10 with lowest-box non-due cards. Kinds: `name-note` 100%, or 70% name-note +
30% find-key-letter if `keyboardUnlocked`. Render single staff. Retries on.

**buildCheckpoint:** 15 `name-note` questions over `cp.pool`, each card at least once while
possible, no immediate repeats. Retries off. Pass = ≥ 13 first-try correct.

### 4.13 Lesson session state machine (`domain/session.ts`)

Pure reducer; the screen holds it in `useReducer`. Times come in from the UI (`performance.now()`).

```ts
type Phase = 'concept' | 'meet' | 'question' | 'feedback' | 'complete';
interface QueuedQuestion { q: Question; originalIndex: number; isRetry: boolean }
interface SessionState {
  plan: LessonPlan; phase: Phase; conceptIndex: number; meetIndex: number;
  queue: QueuedQuestion[]; index: number;
  lastAnswer: { answer: Answer; correct: boolean } | null;
  firstAttempts: { originalIndex: number; card: CardId | null; correct: boolean; ms: number }[];
  combo: number; bestCombo: number; shownAt: number; startedAt: number; endedAt: number | null;
}
type Action =
  | { type: 'next-card'; at: number }        // concept/meet "Got it"
  | { type: 'answer'; answer: Answer; at: number }
  | { type: 'continue'; at: number };         // after feedback
export function startSession(plan: LessonPlan, at: number): SessionState;
export function reduce(s: SessionState, a: Action): SessionState;
export function resultOf(s: SessionState): SessionResult; // only when phase === 'complete'
```

- Start phase: `concept` if concept cards, else `meet` if meet cards, else `question`.
- `answer` is only valid in `question` (ignore otherwise: double taps must be harmless).
  `ms = at - shownAt`. Record a first attempt only when `!isRetry`. If wrong, not a retry,
  and `plan.retries`: insert a retry copy at `min(index + 3, queue.length)`. Correct →
  `combo += 1`, wrong → `combo = 0`; track `bestCombo`. Phase → `feedback`.
- `continue`: `index += 1`; if past the end → `complete` (set `endedAt`), else `question` with `shownAt = at`.
- `SessionResult = { context, firstAttempts, total, correctFirstTry, accuracy /* 0..100 int */,
  perfect, bestCombo, durationMs, passed? /* checkpoints */ }`.

### 4.14 Planners (`domain/planners.ts`)

All `(p: Progress, …) => Progress`, never mutate the input (tests deep-freeze inputs).

- `planCompleteSession(p, result, now)`:
  - `today = dayKeyOf(now)`; apply `updateCard` for each first attempt that has a card, in order.
  - XP: `+10`, `+5` if perfect, `+20` if a checkpoint was passed.
  - lesson context: upsert `lessons[id]` (`timesCompleted+1`, `bestAccuracy = max`, set
    first/last day). Review: `totals.reviewsDone += 1`. Checkpoint passed: record `lessons[cp]`
    and, for every level-1 lesson in units `cp.completesUnits` not yet completed, add
    `{timesCompleted: 0, bestAccuracy: 0, firstCompletedDay: today, lastCompletedDay: today}`.
    Checkpoint failed: no lesson records.
  - `daysPracticed` add today; `today` roll-over then `lessonsDone += 1`; totals
    (`questionsAnswered += total`, `correctFirstTry`, `lessonsDone += 1`).
- `planSettings(p, patch)`, `planFlag(p, flag, value)`, `planMarkExported(p, today)`.
- `planReplaceAll(_p, incoming)` (import) and `planReset(_p, today)` return the new document.

### 4.15 Backup format (`domain/backup.ts`)

```json
{ "app": "sheet-music-101", "kind": "backup", "schemaVersion": 2,
  "exportedAt": "2026-10-12T20:15:00.000Z", "progress": { … } }
```
- `serializeBackup(p, now): string` (pretty JSON, 2 spaces). File name
  `sheet-music-101-backup-YYYY-MM-DD.json`.
- `parseBackup(text): { ok: true; progress; summary } | { ok: false; message }`:
  text length ≤ 1 000 000 → `JSON.parse` in try/catch → `app`/`kind` must match → upgrade
  (`newer` → "This backup is from a newer version of the app. Update the app first, then try
  again.") → `checkProgress(strict)` → summary `{ xp, lessonsCompleted, daysPracticed,
  cardsLearned, exportedAt }`. Messages are fixed strings; **never** echo file content into the UI.

### 4.16 Landmark hints (`domain/landmarks.ts`)

Landmarks: treble C4 "Middle C", G4 "Treble G", C5 "Treble C", C6 "High C";
bass C2 "Low C", C3 "Bass C", F3 "Bass F", C4 "Middle C".
`hintFor(card, p)` → nearest landmark **already learned** (in `p.cards`) in the same clef by
diatonic distance (ties → lower one); text from `CURRICULUM.md` §4 ("2 steps above Treble G").
Returns null if none learned or if the card is itself that landmark.

### 4.17 Keyboard window (`domain/keyboardWindow.ts`)

`keyboardWindow(n: Note): { from: Note; to: Note }` = two octaves `C(o)`–`B(o+1)` where
`o = octave - 1` if letter is C, D or E, else `octave`; clamp `o` to 2..5. Unit 1 uses C3–B4.

---

## 5. Data layer

### 5.1 IndexedDB (`data/db.ts`)
- Database `sheet-music-101`, version 1, one object store `kv` (out-of-line keys).
- Record under key `progress`: `{ rev: number; savedAt: string /* ISO */; doc: unknown }`.
- Functions: `openDb()`, `readRecord()`, `transactCommit(expectedRev, apply)` (see below),
  `writeFresh(doc)` (first save only), `readRaw()` (for the "download raw data" rescue).

### 5.2 Store (`data/store.ts`): the one write path
```ts
type StoreState =
  | { status: 'loading' }
  | { status: 'ready'; progress: Progress; rev: number; saveError: string | null; repaired: string[] }
  | { status: 'broken'; reason: string }        // stored data unreadable: never overwrite automatically
  | { status: 'unavailable'; progress: Progress }; // IndexedDB unusable: in-memory only, warning shown
class ProgressStore {
  load(now: Date): Promise<void>;
  commit(planner: (p: Progress) => Progress): Promise<void>;
  subscribe(fn): () => void;  getState(): StoreState;
  startFresh(now: Date): Promise<void>; // only from the 'broken' screen after the user confirms
}
```
- `load`: read record → none: create `emptyProgress`, `writeFresh`. Present: `upgradeToCurrent`
  → `checkProgress(repair)` → null ⇒ `broken`; else `ready` (issues in `repaired`, shown once
  as a toast "Some saved data was damaged and has been repaired.").
  Failures (owner decisions 2026-10-13): the database can't be opened → `unavailable`; it opens but
  the record can't be read → `broken` with the error text as the reason (handle closed, nothing
  written); no record and the first `writeFresh` fails → `unavailable` (nothing existed to lose).
- `commit`: calls are **queued** (a promise chain; one at a time). In one `readwrite`
  transaction: read the record; if its `rev` differs from ours (another tab saved), take the
  stored doc (upgrade + repair) as the base; `next = planner(base)`; **`checkProgress(next,
  'strict')` must pass** (else throw: a bug, never write); write `{rev: rev+1, …}`. On
  success update memory and notify. On failure keep the in-memory state *with the change
  applied*, set `saveError`, and expose `retrySave()`.
- Nothing else in the app writes to IndexedDB.

### 5.3 Persistence and install nudges
- After the first completed session call `navigator.storage?.persist?.()` once (ignore errors).
- Settings → Storage shows "Protected" when `navigator.storage.persisted()` is true, else
  "Not protected yet. Installing the app helps."
- iOS Safari wipes site data after ~7 days unused **unless the app is on the Home Screen**,
  hence the InstallCard (§7.2) and backup reminders.

### 5.4 Files (`data/files.ts`)
- Export: build the backup string; if `navigator.canShare?.({ files: [file] })` use
  `navigator.share({ files: [file], title: 'Sheet Music 101 backup' })`; else download via a
  Blob URL and a temporary `<a download>` (revoke the URL after click). Then
  `planMarkExported`. A cancelled share is not an error.
- Import: `<input type="file" accept="application/json,.json">`; reject files > 1 MB
  *before* reading; read with `file.text()`; `parseBackup`; show preview.

---

## 6. Guardrails specific to this app

1. **Never wipe progress** without the two-step in-app confirmation; offer export first.
2. **Import never merges** silently: preview → confirm → replace whole document.
3. **Broken data is never overwritten automatically** (`broken` state screen).
4. **IDs are permanent.** `domain/ids.lock.json` lists every lesson id and card id. A
   test fails if any locked id is missing from the curriculum, or if a curriculum id is not in
   the lock (new ids are added to the lock deliberately, in the same commit).
5. **Fixtures are permanent.** `tests/fixtures/*.json` hashes are recorded in
   `tests/fixtures/fixtures.lock.json`; `check-safety` fails if a fixture changed or was removed.
   Each fixture must upgrade + strict-validate and keep its xp/lessons/cards.

---

## 7. UI specification

### 7.1 Visual system (`styles/tokens.css`)

Font: Nunito (import `@fontsource/nunito/latin-400.css`, `latin-700.css`, `latin-800.css`
only). Base 17px. Headings 800, buttons 800, body 400/700.

```css
:root {
  --bg: #FFFFFF; --bg-soft: #F3F4F6; --card: #FFFFFF; --text: #1F2937; --text-muted: #4B5563;
  --border: #E5E7EB; --paper: #FFFFFF; --ink: #111827;          /* staff area is always paper+ink */
  --primary: #15803D; --primary-edge: #166534; --on-primary: #FFFFFF;
  --correct-bg: #DCFCE7; --correct-text: #166534; --correct-ink: #16A34A;
  --wrong-bg: #FFEDD5; --wrong-text: #9A3412; --wrong-ink: #EA580C;
  --locked: #D1D5DB; --locked-text: #6B7280; --xp: #CA8A04; --focus: #2563EB;
  --unit-1: #2563EB; --unit-2: #15803D; --unit-3: #9333EA; --unit-4: #C2410C; --unit-5: #DB2777;
  --unit-6: #0F766E; --unit-7: #4F46E5; --unit-8: #B45309; --unit-9: #BE123C; --unit-10: #0369A1;
  --unit-11: #7E22CE; --radius: 16px; --gutter: 16px;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #111827; --bg-soft: #1F2937; --card: #1F2937; --text: #F9FAFB; --text-muted: #D1D5DB;
    --border: #374151; --correct-bg: #14532D; --correct-text: #DCFCE7; --wrong-bg: #7C2D12;
    --wrong-text: #FFEDD5; --locked: #374151; --locked-text: #9CA3AF;
  }
}
```
A unit test reads `tokens.css` (`?raw`) and asserts WCAG contrast ≥ 4.5 for: text/bg,
text-muted/bg, on-primary/primary, white/each unit colour, correct-text/correct-bg,
wrong-text/wrong-bg, in both light and dark values.

Components:
- **Button** variants `primary | secondary | ghost | danger | choice`. Min height 52px, radius
  16px, 800 weight 18px, a 4px bottom border in a darker shade ("3D"), `:active` moves down 2px
  and the border shrinks to 2px. Visible focus ring 3px `--focus`. Disabled = `--locked`.
- **Letter answer pad**: 7 buttons A–G, grid 4 + 3 (second row centred), height 64px, font 28px.
- Layout: single centred column, `max-width: 480px`, side padding `--gutter`,
  `env(safe-area-inset-*)` respected, `viewport-fit=cover`. No horizontal scroll at 320px wide.
- Motion: correct → note turns `--correct-ink` + mascot bounce (300ms); wrong → gentle
  horizontal shake (300ms, 6px). Everything disabled under `prefers-reduced-motion: reduce`.
- Icons from `lucide-react` (import individual icons only).

### 7.2 Screens and routes

| Route | Screen |
|---|---|
| `#/` | Welcome (if `!flags.welcomeSeen`), else Path |
| `#/lesson/<lessonId>` | Lesson (level 1, 2, 3) |
| `#/checkpoint/<cpId>` | Lesson in checkpoint mode |
| `#/review` | Lesson in review mode |
| `#/progress` | Progress |
| `#/settings` | Settings |
| `#/gallery` | Gallery (only when `import.meta.env.DEV` or mode `e2e`) |
| anything else / locked lesson | redirect to `#/` |

**Welcome:** big Mascot (happy), title "Sheet Music 101", text from CURRICULUM §5, primary
button "Let's start" → `planFlag(welcomeSeen)` → Path.

**Path (home):**
- Top bar (sticky): XP (star icon, `--xp`) · days practised (calendar icon) · DailyGoalRing
  (n/goal lessons today; ring fills; full = green with check) · Progress (chart icon) · Settings (gear).
- Cards above the path when relevant (max one at a time, in this priority): storage warning
  (`unavailable`), save error, InstallCard (not standalone, not dismissed in last 7 days, and only
  when it has something to offer: an install prompt or the iPhone steps; owner decision 2026-10-13),
  BackupReminderCard (≥ 5 lessons done (`totals.lessonsDone`) and no export in 30 days; "Later"
  hides it until the app is opened again, nothing is saved; owner decision 2026-10-13).
- "Practise" button (secondary, music icon) when review is available.
- For each unit: UnitHeader (unit colour background, white text: "Unit n", title, subtitle,
  level stars 0–3, and buttons "Level 2"/"Level 3" when available). Then its lesson bubbles
  in a zig-zag column (horizontal offsets cycle 0, 48, 72, 48, 0, −48, −72, −48 px). Bubble: 72px
  circle; completed = unit colour + check icon; current = unit colour + pulsing ring + a
  speech-bubble label "Start"; available-but-done = replayable; locked = `--locked` + lock icon,
  tapping shows toast "Finish the lesson before this one first." Bubble label under it = lesson title.
- Checkpoint node after units 4, 7, 10: trophy icon, title, "Jump ahead" text if not yet
  reached, "Test yourself" otherwise.
- On load, scroll the current bubble into view.
- When `keyboardUnlocked` and `!flags.keyboardUnlockSeen`: show a Sheet with the unlock
  message (CURRICULUM §5) and a keyboard illustration; dismiss → set flag.

**Lesson:**
- Header: close (X) · ProgressBar (questions done / queue length, animates) · combo chip
  ("🔥 3" appears at combo ≥ 3) · sound toggle.
- Close → Sheet: "Leave this lesson?" / "Your answers in this lesson won't be saved." buttons
  "Keep going" (primary) and "Leave" (ghost). No `window.confirm`.
- **ConceptCard:** illustration (Staff/Keyboard component in a given state), title, body text,
  optional "Play" button, primary "Got it".
- **MeetCard:** "New note!" chip, big staff with the note, name (nickname or letter), position
  sentence, keyboard with the key highlighted, tip text if any, "Play" button (auto-plays once on
  show), primary "Got it".
- **Question area:** prompt text (CURRICULUM §5) · paper card with Staff/Keyboard · answer
  controls by kind:
  - name-note: Letter answer pad.
  - find-key-*: Keyboard (window from §4.17); tap answers immediately.
  - find-on-staff: Staff (single, card's clef) shows positions −4..12 as invisible tap bands;
    tap places a ghost note at the nearest position; ▲/▼ buttons nudge ±1; primary "Check"
    enabled once a note is placed.
  - step-skip: two notes on one staff; 2 or 4 choice buttons.
  - unit-1 kinds: choice buttons / letter pad / keyboard as appropriate.
- **FeedbackBar** (slides up from bottom, `aria-live="polite"`): correct = `--correct-bg`, check
  icon, random correct phrase; wrong = `--wrong-bg`, gentle phrase with the right answer,
  position sentence, landmark hint, and on the staff/keyboard the right answer is highlighted
  in `--correct-ink` and the tapped one in `--wrong-ink`. Primary "Continue" (full width).
  Answer controls are disabled while feedback shows.
- Sound: correct/wrong effect immediately, then the target note 250ms later (note questions).
- **LessonComplete:** confetti (if not reduced motion), Mascot celebrating, fanfare, title
  ("Lesson complete!" / "Perfect lesson!" / checkpoint pass/fail texts), stat tiles: XP earned,
  accuracy %, time (m:ss), best combo. If the daily goal was just reached, a banner
  "Daily goal reached!". Primary "Continue" → commit (`planCompleteSession`) → Path. The
  commit happens when this screen **appears**, not when Continue is pressed (the button just
  navigates); show a small spinner if the commit is still running and the error banner if it fails.

**Progress:**
- Mastery chart: a grand staff C2–C6 with every one of the 34 cards drawn as a coloured note
  head at its position (treble cards on the treble staff, bass cards on the bass staff, each staff
  spreading its 17 cards left to right in pitch order, the two staves sharing the 17 columns;
  owner decision 2026-10-13): new = `--locked`, learning = `--wrong-ink`, almost = `--xp`,
  known = `--correct-ink`. Legend underneath with text labels (colour is not the only signal:
  legend uses icon + text, and tapping a note shows a tooltip "Treble G · Known · 12/13 correct").
- Stat tiles: total XP, days practised, lessons completed, first-try accuracy overall.
- Unit list with level stars.

**Settings:** Sound (toggle) · Daily goal (1/2/3 segmented) · Install the app (instructions
per platform) (installed: "The app is installed."; iPhone: the Share steps; install prompt available:
"Install" button; otherwise "Use your browser's menu to add this app to your home screen."; owner
decision 2026-10-13) · Backup: "Save a backup" (export), "Last backup: never / today / n days ago",
"Restore from backup" (import → preview Sheet with summary → "Save a backup first" (exports the
current progress, the Sheet stays open; owner decision 2026-10-13) / "Replace my progress"
(danger) / "Cancel") · Storage status · "Start over" (danger; Sheet 1: "Save a backup first?"
[Save backup] [Continue without backup]; Sheet 2: "Erase all progress? This can't be undone."
[Erase everything] (danger) [Cancel]) · About: version and build id, Bravura credit
("Music symbols: Bravura by Steinberg, SIL Open Font License").

**Broken-data screen** (store `broken`): Mascot (encouraging), "We couldn't read your saved
progress.", buttons "Download the saved data" (raw record as JSON file), "Try again" (reload),
"Start fresh" (same two-step Sheet flow as Start over). **Exception (owner, 2026-10-14):** when the
reason is "saved by a newer version of the app" (`MSG_NEWER`), the screen offers only "Download the
saved data" and "Reload the app" (no "Try again", no "Start fresh"), and `startFresh` refuses such a
record (also inside its transaction): progress a newer version can read is never replaced.

**Gallery** (dev/e2e only): every card on its staff, grand staff samples, keyboard states,
all Mascot moods, buttons, FeedbackBars. Used for visual QA screenshots.

### 7.3 Notation rendering (`notation/geometry.ts`, `Staff.tsx`): verified by a prototype

Units: staff space `S = 10` SVG units. Glyph scale `k = S / 250 = 0.04`; draw glyphs as
`<path d=… transform="translate(x y) scale(k, -k)"/>` (brace: see below).

- `y(p) = bottomLineY - p * S / 2`.
- Staff lines: 5 lines at p = 0,2,4,6,8; stroke width `0.13 S`; colour `--ink`.
- Treble clef: `gClef` at `x = clefX`, `y = y(2)`. Bass clef: `fClef` at `x = clefX`, `y = y(6)`.
- Whole note: `noteheadWhole`, width `w = 422 k`; to centre at `x`, translate to `(x - w/2, y(p))`.
- Ledger lines: if `p ≤ -2`, at every even q from −2 down to p (inclusive when even);
  if `p ≥ 10`, at every even q from 10 up to p. Length `w + 0.8 S` centred on the note;
  stroke width `0.16 S`.
- **Single staff:** viewBox height 100, `bottomLineY = 70` (fits p = −6..14). Width
  `W = 140` (1 note) or `160` (2 notes). `clefX = 0.5 S`. Note area starts at
  `clefX + clefAdvance*k + 1.5 S`; one note at `x = 0.62 W`; two notes at `0.5 W` and `0.78 W`.
- **Grand staff:** treble `bottomLineY = 70`; bass `bottomLineY = 70 + 10 S` (gap between
  treble bottom line and bass top line = 6 S). viewBox height 220. Left system line from the
  treble top line to the bass bottom line at `x0 = 1.2 S`, width `0.16 S`; staves start at `x0`.
  Clefs at `x0 + 0.5 S`. Brace: `brace` glyph, **uniform** scale `ks = k * 3.5` (14 S / 4 S),
  translate `(0, bassBottomLineY)`, `scale(ks, -ks)`.
- Staff component props: `{ mode: 'treble' | 'bass' | 'grand' | 'none'; notes: {clef, note, state?: 'normal'|'correct'|'wrong'|'ghost'|'mastery-…'}[]; onTapPosition?; highlightLines? (concept cards) ; ariaLabel }`.
  Render with `width: 100%` and the viewBox (scales to the phone). The SVG `aria-label` must not
  reveal the answer ("Music staff with one note").
- Geometry tests: for all 34 cards, `staffPosition` + `y()` give the expected y; ledger line
  sets for A3/C4/C6 treble and C2/E4 bass; positions round-trip with `noteAtPosition`.

### 7.4 Keyboard (`notation/Keyboard.tsx`)
SVG. White key width 1 unit, height 5.8; black key width 0.6, height 3.6, centred on the
boundary after C, D, F, G, A. Range props `from`/`to` (white notes). Labels: "C" text at the
bottom of each C key; Middle C additionally has a small dot marker. States per key: normal /
highlight (`--correct-ink` fill) / wrong (`--wrong-ink` fill) / dimmed. `onPress(note | 'black')`.
Each key is a `<button>`-like element with `role="button"`, `aria-label` = letter (+ "Middle C"),
keyboard focusable. Height on phone ≈ 150px (a 14-key window at 390px wide; keys are taller than
real piano proportions for easier tapping, owner decision 2026-10-13).

### 7.5 Mascot (`ui/Mascot.tsx`)
"Quaver": an eighth note drawn in SVG. Filled oval head (`--primary`), stem and flag, two
white eyes with dark pupils, cheeks (pink circles), mouth by mood. Moods: `idle` (smile),
`happy` (open smile, bounce), `encouraging` (small smile, tilted 8°, sweat-free; never sad),
`celebrating` (big open smile, arms raised: two short lines, jump animation). Sizes 48/96/160px.
Optional speech bubble with text. No animation under reduced motion.

### 7.6 Confetti (`ui/Confetti.tsx`)
80 absolutely positioned `div`s (React elements, no innerHTML), random unit colours, random x,
rotation, delay 0–300ms, CSS keyframe fall 1.8s; component unmounts itself after 2.5s.
`pointer-events: none`. Not rendered under reduced motion.

### 7.7 Audio (`audio/synth.ts`)
- Master `GainNode` 0.6 → `DynamicsCompressorNode` → destination. `resume()` whenever the engine isn't `running`
  (`suspended`, or iOS's non-standard `interrupted`).
- **Start on the first tap.** `installUnlock(synth, document)` (called in `main.tsx`) listens, in the capture phase, for
  `pointerup`, `touchend`, `click` and `keydown`. On such an event, if the engine isn't `running`, `synth.unlock()` creates
  the `AudioContext` inside that tap, calls `resume()` and plays a one-sample silent buffer. The listeners stay until a tap
  finds the engine `running`; after the page has been hidden (`visibilitychange`) they are attached again. If no tap came
  first, the first play call still creates the engine as before. While muted, `unlock()` does nothing (no engine).
- **Restart a stuck engine.** An engine whose state is `closed` is replaced on the next sound. 300 ms after an `unlock()`,
  if that same engine still isn't `running` (and sound isn't muted), it is closed and a new one is built (same graph, `resume()`, silent buffer).
  This happens at most once each time the page is shown (the count resets when the page is
  hidden), so a slow engine is never closed again and again. Errors go to the one-time toast below, except a `resume()` rejection from an
  engine that has already been replaced (Chrome rejects it when the stuck engine is closed; sound still works).
- **Schedule a little ahead.** Every sound starts at `currentTime + 0.02` s (plus its own delay), so the first milliseconds
  aren't cut off while the engine wakes up.
- `playNote(note, delay = 0, dur = 1.2)`: four sine partials (×1 amp 1.0, ×2 0.5, ×3 0.25,
  ×4 0.12), each gain `0 → 0.25*amp` linear in 8ms, then exponential to 0.0001 by
  `dur / sqrt(partial)`; stop at end + 0.05s.
- `playCorrect()`: triangle C6 then E6 at +90ms, 180ms each, peak 0.15.
- `playWrong()`: sine E3 then C3 at +120ms, 250ms each, peak 0.18 (soft, not harsh).
- `playFanfare()`: triangle C5, E5, G5, C6 at 0/120/240/360ms; last one 600ms.
- `setMuted(bool)`; muted → every call is a no-op. Any audio exception is caught; show the
  toast "Sound isn't available right now." at most once per app run; never break a lesson.
- iPhones mute Web Audio in Silent mode; the app obeys that (owner decision 2026-10-13). Hint text, iPhone/iPad
  only (detected as in §7.8 `install.ts`: `/iPhone|iPad|iPod/` in the user agent, or `MacIntel` with touch points > 1):
  "No sound? Check that your iPhone isn't on Silent."
  - Settings: shown under the Sound toggle.
  - Lessons: a small muted line under the lesson header on the first screen of a lesson, while sound is on; at most once
    per app run; gone after the first "Got it" or answer.

### 7.8 PWA (`pwa/*`, vite config)
- Manifest: name "Sheet Music 101", short_name "Music 101", description "Learn to read piano
  music, a few minutes a day.", `start_url: "."`, `scope: "."`, `display: "standalone"`,
  `orientation: "portrait"`, `theme_color: "#15803D"`, `background_color: "#FFFFFF"`, icons
  192, 512, maskable 512 (`purpose: "maskable"`), plus `<link rel="apple-touch-icon">` 180.
  Shortcuts: "Practise" → `./#/review`, "Progress" → `./#/progress`.
- Workbox `generateSW`: `skipWaiting: true`, `clientsClaim: true`,
  `cleanupOutdatedCaches: true`, `globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}']`,
  `navigateFallback: 'index.html'`. `injectRegister: false`, `registerType: 'autoUpdate'`.
- `register.ts`: `registerSW({ immediate: true, onNeedReload() {}, onRegisterError(e) {
  console.error(…) }, onRegisteredSW(url, reg) { setInterval(check, 60 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState ===
  'visible') check(); }); } })`, where `check` calls `reg.update()` and logs a rejection with
  `console.warn` (it fails whenever the phone is offline). `onNeedReload` **must** stay set:
  without it, `autoUpdate` mode reloads the page by itself when a new version activates. Listen to
  `navigator.serviceWorker` `controllerchange`; if there **was** a controller before, show
  UpdateBanner "A new version is ready." [Reload]. Never reload automatically (could interrupt a lesson).
- `install.ts`: capture `beforeinstallprompt` (preventDefault, keep the event) → InstallCard
  shows "Install" button calling `prompt()`. iOS (iPhone/iPad, not standalone): InstallCard
  shows steps "Tap the Share button, then 'Add to Home Screen'." Standalone detection:
  `matchMedia('(display-mode: standalone)').matches || navigator.standalone === true`.
- Build id: Vite `define` `__BUILD_ID__` = `` `${short git sha or 'dev'}-${ISO date}` `` (read via
  `process.env.GITHUB_SHA` in CI, else `'dev'`). Shown in Settings → About.

### 7.9 Security headers and hardening
- CSP meta injected at build only (Vite plugin, `apply: 'build'`, `injectTo: 'head-prepend'`):
  `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self';
  connect-src 'self'; media-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none';
  base-uri 'self'; form-action 'none'` (verified to work with this stack, including React
  `style={}` props, which use CSSOM).
- Frame-busting at the top of `main.tsx`: `if (window.top !== window.self) { window.top!.location.href = window.self.location.href; }` inside try/catch.
- `<meta name="referrer" content="no-referrer">`.
- No network requests at runtime other than the app's own files.

### 7.10 Errors
- ErrorBoundary: Mascot (encouraging) + "Something went wrong." + the error message in a
  `<pre>` (text node) + "Reload" + "Save a backup" (uses the store's last good progress).
- `window` `error` and `unhandledrejection` → toast "Something went wrong: <message>".
- Never `catch` and ignore, except the explicitly listed cases (audio, persist, share cancel,
  service-worker update check while offline: logged with `console.warn`).

### 7.11 E2E test hooks (only in `--mode e2e` builds)
- Every question container gets `data-testid="question"` and `data-answer="<JSON of correctAnswerOf(q)>"`
  **only when** `import.meta.env.MODE === 'e2e'`. Production builds must not contain the
  string `data-answer` (checked by `check-dist`).
- `data-testid` attributes are allowed in production (harmless) for stable selectors.

---

## 8. Course part 2: units 12–25 (planned 2026-10-14; milestones M8–M14)

This section **extends and, where it says so, replaces** §1–§7. Learner-facing text and lesson
data are in `CURRICULUM.md` §6–§12. Owner decisions: `docs/HANDOFF.md` ("Course part 2").
Where §1 says "whole notes only, naturals only", that now holds for units 1–11 only.

### 8.1 Pitches and the 12 sign cards (`domain/notes.ts`, `domain/cards.ts`) — M8

```ts
export type Sign = 'sharp' | 'flat' | 'natural';
export type Pitch = { note: Note; sign: Sign };   // note = the written white-key position
export function pitchMidi(p: Pitch): number;      // midiNumber(note) + (sharp 1 | flat -1 | natural 0)
export function pitchName(p: Pitch): string;      // 'F♯', 'B♭', 'F' (letters only, no octave)
```
- `Note` stays naturals only. Card ids for the new cards: `${Clef}-${Letter}${'#'|'b'}${Octave}`.
  `CardId` becomes the union of the 34 natural ids and these 12:
  treble `F#4 G#4 Ab4 Bb4 C#5 Eb5`, bass `Ab2 Bb2 C#3 Eb3 F#3 G#3`.
- `ALL_CARDS` = the 34 (same order as today) followed by `SIGN_CARDS` (treble then bass, low
  to high, as listed). `NATURAL_CARDS` = the first 34 (unchanged; used by everything in part 1).
- `parseCardId(s)` returns `{ clef, note, sign }` (`sign: 'natural'` for the 34); still accepts
  only ids in `ALL_CARDS`. `cardPosition` uses `note` (a sign card sits where its letter sits).
- `cardMidi(id)` = `pitchMidi`. `cardName(id)`: nickname, else `pitchName`.
- A self-check test asserts that every question kind of part 1 (`name-note`, `find-key-*`,
  `find-on-staff`, `step-skip`) only ever receives natural cards, and that every part-1 lesson
  pool is ⊆ `NATURAL_CARDS`.

### 8.2 Progress schema version 2 — M8

Full plan, rationale and tests: `docs/build/SCHEMA-V2.md`. Summary:
- `CURRENT_SCHEMA_VERSION = 2`; `Progress.schemaVersion: 2`. **No new fields.** What changes is
  that `cards` may now hold the 12 sign cards.
- Why a bump although no field changed: an older copy of the app still cached on a phone (or a
  backup opened in an older app) would treat sign cards as unknown and silently drop them on its
  next save. With version 2 the older app sees "newer version" instead and never writes
  (`storeChecks.ts` → `broken` with "This progress was saved by a newer version of the app.").
- `UPGRADE_STEPS[1]`: returns a **new** object with every own key of the input and
  `schemaVersion: 2` (nothing else touched; validation runs afterwards as always).
- `checkProgress`: `schemaVersion` must be exactly `2` (§4.7 table row replaced); card keys must
  be in the new `ALL_CARDS` (46).
- Backups: envelope `schemaVersion: 2`. `parseBackup` accepts envelopes 1 and 2 (the progress
  inside is upgraded); > 2 → the "newer version" message.
- New fixture `tests/fixtures/progress-v2.json` (never edited after M8), recorded in
  `fixtures.lock.json`. `progress-v1.json` stays and must keep loading.

### 8.3 Music text and the sounding-pitch rule (`domain/music.ts`) — M9

```ts
export type Beats = 1 | 2 | 3 | 4;
export type Dur = 'q' | 'h' | 'h.' | 'w' | 'ee';          // notes; 'ee' = half-beat pair (1 beat)
export type RestDur = 'Q' | 'H' | 'W';
export type RhythmToken = Dur | RestDur;
export type Time = 2 | 3 | 4;                              // beats per box (bottom number always 4)
export type HomeSign = 'none' | 'G' | 'F' | 'D' | 'Bb';    // G: F♯; F: B♭; D: F♯ C♯; Bb: B♭ E♭
export interface WrittenNote { note: Note; printed: Sign | null }
export type MusicEvent =
  | { kind: 'note'; dur: Exclude<Dur, 'ee'>; notes: WrittenNote[] }   // >1 note = played together
  | { kind: 'rest'; dur: RestDur };
export interface Staffline { clef: Clef; boxes: MusicEvent[][] }
export interface Melody { id: string; time: Time; home: HomeSign; staffs: [Staffline] | [Staffline, Staffline] } // [treble, bass] when grand
export function beatsOf(t: RhythmToken): number;            // q1 h2 h.3 w4 ee1 Q1 H2 W4
export function parseRhythm(s: string): RhythmToken[] | null;
export function parseMusic(clef: Clef, s: string): MusicEvent[][] | null; // 'C4q D4q | G4w'
export function soundingPitch(m: Melody, staff: 0 | 1, box: number, index: number): Pitch;
export function soundingCard(m: Melody, staff: 0 | 1, box: number, index: number): CardId | null;
```
- Token grammar: note `^[A-G](#|b|n)?[2-6](q|h\.|h|w)$`, rest `^[QHW]$`, rhythm `ee` only in
  rhythm patterns (`parseRhythm`), boxes split on ` | `. Anything else → `null` (a data test
  fails). Data is parsed once at module load and the tests assert nothing is null.
- **Sounding-pitch rule** (one function, unit-tested with every MS/MF/MK/MN example):
  1. the note's own printed sign, if any (`n` = natural);
  2. else the last printed sign on the **same letter and octave** earlier in the **same box**
     of the same staff;
  3. else the home sign for that letter (any octave);
  4. else natural.
- **Data checks (tests):** every box's beats = `time` (rests count); every sounding pitch of
  every melody note is a card in `ALL_CARDS` (so no F♯5, E♭4 …); every melody's notes have staff
  positions −2..10; grand melodies have equal box counts on both staffs.
- `soundingCard` = the card with that clef and pitch (null only if not a card, which the data
  checks make impossible).

### 8.4 Drawing music (`notation/musicGeometry.ts` pure + `notation/Music.tsx`) — M9

New glyphs (add to `tools/glyphs/extract.py` `WANT`, regenerate `glyphs.ts`; verified to exist
in Bravura on 2026-10-14): `noteheadHalf` E0A3, `noteheadBlack` E0A4, `augmentationDot` E1E7,
`accidentalFlat` E260, `accidentalNatural` E261, `accidentalSharp` E262, `restWhole` E4E3,
`restHalf` E4E4, `restQuarter` E4E5, `timeSig2` E082, `timeSig3` E083, `timeSig4` E084. Same
scale `k` as §7.3. Update `glyphs.test.ts` (each glyph present, bounds sane).

Layout (all in staff spaces `S`, same `y(p)` as §7.3):
- **Modes:** `treble`, `bass`, `grand` (as §7.3) and **`rhythm`**: one horizontal line at
  `y = 50` in a viewBox of height 80 (no clef; 70 until the M9 review, which clipped the bottom time digit); every note sits on the line, stems up.
- **Header:** clef (as §7.3) → home sign → time numbers. Home-sign positions (p): treble F♯ 8,
  C♯ 5, B♭ 4, E♭ 7; bass F♯ 6, C♯ 3, B♭ 2, E♭ 5; each sign 1.0 S apart, in that order. Time:
  top digit centred on p = 6, bottom digit "4" on p = 2 (rhythm mode: top digit above the line,
  bottom below). A header element is omitted when not used (no time numbers on a lone
  single-note question).
- **Time grid:** `x(box, beat) = boxStart + 1.2 S + beat × 2.6 S`; box width
  `1.2 S + time × 2.6 S + 0.6 S`; a bar line (width 0.13 S, staff height) at each box end, a
  thicker double line at the last box end is **not** drawn (plain look). Grand: both staves share
  the grid, so notes played together line up exactly.
- **Notes:** heads by duration (`w` whole, `h`/`h.` half, `q`/`ee` black). Stems (width 0.12 S,
  length 3.5 S): p < 4 up on the head's right edge, p ≥ 4 down on the left edge; rhythm mode
  always up. `h.` adds a dot 0.5 S right of the head (moved up to the space above when the head
  is on a line). `ee`: two black heads at beats +0 and +0.5, stems up, joined by a beam of height
  0.5 S at the stem tops. Printed sign: glyph right-aligned 0.3 S left of the head. Notes in one
  event (stacks, stacked intervals) share x; they are whole notes in all part-2 data, so no stems.
- **Rests:** `Q` centred on p = 4 (rhythm: on the line); `H` sitting on p = 4 (rhythm: on top of
  the line); `W` hanging from p = 6 (rhythm: under the line).
- **Marked note:** the head drawn in `--focus`, plus a downward triangle (1.2 S wide) in `--ink`
  1.5 S above the top line (or above the head if higher). Colour is not the only signal.
- **Highlight states** for feedback: `correct` / `wrong` colour the head as in §7.3.
- **Empty slot** (finish-box): a dashed rounded rectangle 2 S × 4 S at the missing beat.
- Width = header + boxes; render with `width: 100%`. On a 320 px phone a two-box melody must
  keep a staff space ≥ 9 CSS px (checked in the visual QA screenshots; if not, the music view may
  break after the first box onto a second line, same header repeated without time numbers).
- `aria-label`s never reveal the answer ("Music with two boxes, one note marked").
- Geometry tests: header positions, every home-sign position, grid x for each time, stem
  direction rule, dot placement on line vs space, beam endpoints, grand alignment (same beat →
  same x on both staves).

### 8.5 Keyboard: black keys can answer — M9

`Keyboard` `onPress` now reports `{ note: Note } | { black: number /* midi */ }` (the old
`'black'` string is replaced). Part-1 questions keep their rule (a black key is always wrong
there): `QuestionView` maps `{black}` to the old `{ kind: 'key', note: 'black' }` answer.
Black keys get `aria-label`s "F♯ / G♭", "C♯ / D♭", "D♯ / E♭", "G♯ / A♭", "A♯ / B♭". Black key
states: normal / highlight / wrong (as white keys). A keyboard illustration may label black keys
(concept cards).

### 8.6 New question kinds (`domain/questions.ts`) — M10–M13

```ts
export type Question = /* the 10 part-1 kinds */
  | { kind: 'name-accidental'; card: CardId; render: 'single' | 'grand'; showNatural: boolean; options: PitchOption[] } // 4 options
  | { kind: 'find-key-pitch'; card: CardId; render: 'single' | 'grand' }
  | { kind: 'beats-of'; token: RhythmToken }
  | { kind: 'which-longer'; first: Dur; second: Dur }                 // beats differ
  | { kind: 'count-box'; box: RhythmToken[] }                          // no time numbers shown
  | { kind: 'finish-box'; time: Time; box: RhythmToken[]; options: RhythmToken[] } // 3 options; box = pattern minus its last token
  | { kind: 'hear-rhythm'; time: Time; options: RhythmToken[][]; answer: 0 | 1 | 2 }
  | { kind: 'name-in-music'; melody: string; staff: 0 | 1; box: number; index: number; card: CardId; options: PitchOption[] }
  | { kind: 'melody-move'; melody: string; box: number; index: number }   // staff 0
  | { kind: 'hear-melody'; options: string[]; answer: 0 | 1 | 2 }
  | { kind: 'interval-read'; clef: Clef; first: Note; second: Note; stacked: boolean; sizes: (2|3|4|5)[] }
  | { kind: 'together-or-not'; melody: string; treble: [number, number]; bass: [number, number] } // [box, index] on each staff
  | { kind: 'stack-or-not'; clef: Clef; notes: [Note, Note, Note] }
  | { kind: 'stack-name'; clef: Clef; bottom: Note; withBass?: Note };  // withBass → grand (SH)
export type PitchOption = { letter: Letter; sign: Sign };
export type Answer = /* part-1 answers */
  | { kind: 'pitch-name'; letter: Letter; sign: Sign }
  | { kind: 'pitch-key'; midi: number }
  | { kind: 'option'; index: 0 | 1 | 2 };
// ChoiceValue gains: 'beats-1'..'beats-4', 'size-2'..'size-5', 'together', 'apart', 'stack', 'not-stack'
```
Answer rules:
- name-accidental, name-in-music → letter and sign equal the card's (name-in-music: the
  sounding pitch). A natural card is answered with `sign: 'natural'`.
- find-key-pitch → `midi === cardMidi(card)` (exact key; another octave is wrong).
- beats-of → `beats-n` with n = `beatsOf(token)`. which-longer → the one with more beats.
- count-box → `beats-n` with n = sum of the box. finish-box → the option whose beats make the box
  sum to `time` (exactly one option does; the builder guarantees it). hear-* → `index === answer`.
- melody-move → `stepSkipValue(previous note, marked note)` (data: the marked note is never the
  first note of the tune and its move is a step or a skip, never a repeat or bigger).
- interval-read → `size-n`, n = |diatonic distance| + 1.
- together-or-not → `together` iff both events start on the same beat of the same box.
- stack-or-not → `stack` iff the two gaps are both 2 diatonic steps.
- stack-name → a `letter` answer equal to the bottom note's letter (Letter pad).
- `cardOf`: name-accidental, find-key-pitch, name-in-music → their card; all others null.

**name-accidental options** (also used by name-in-music when the sounding pitch has a sign, or
the melody has any printed sign or a home sign; otherwise name-in-music uses the Letter pad and a
`letter` answer is accepted for a natural card): candidates in this order — same letter natural,
same letter ♯, same letter ♭, letter above with the card's sign, letter below with the card's
sign — drop the right answer and any candidate that isn't one of the 7 naturals or the 12 sign
names (F♯ C♯ G♯ B♭ E♭ A♭), take the first 3, add the right answer, shuffle with the lesson seed.
Buttons show `pitchName` ("F♯"); 2 × 2 grid like step-skip.

**Sound off:** `hear-rhythm` and `hear-melody` need sound. In `buildLesson`, if
`p.settings.soundOn` is false their weights are removed from the mix (the rest is renormalised;
a lesson whose mix becomes empty never happens in the data: tested). If the learner mutes during a
lesson, a listening question shows the "Turn on sound" line and button (CURRICULUM §12) instead
of auto-playing; the options stay answerable. Checkpoints never contain listening questions.

### 8.7 Audio: rhythms, tunes, stacks (`audio/synth.ts`) — M11

- `playMusic(events: { at: number /* beats */; midi: number[]; beats: number }[], opts: { bpm: 80; countIn: number })`:
  `countIn` clicks (one per beat, first one accented), then the events; note length =
  `beats × 60/bpm × 0.9` s using the existing piano partials (`playNote` by midi). Rests are gaps.
- Click: sine 1 500 Hz, 30 ms, peak 0.10 (accented 0.15), linear attack 2 ms, exponential decay.
- Rhythm patterns play on C5. Melodies play their sounding pitches. Stacks/stacked intervals
  play all notes together. A new `playMusic` stops the previous one (no overlapping replays).
- Listening questions auto-play once when shown (count-in = `time` clicks), "Play again" replays
  (also during feedback). Same mute, error-toast and Silent-mode rules as §7.7.
- Note questions with sign cards play the sounding pitch 250 ms after the answer sound (§7.2).

### 8.8 Curriculum types and unlocks (`domain/curriculum.ts`, `unlocks.ts`) — M8 (types), M10–M13 (data)

```ts
export interface LessonMaterial {
  rhythmPatterns?: RhythmSetId[];          // 'RA' | 'RD' | 'RR' | 'RE' (+ 'RR-Q': RR patterns containing Q)
  rhythmEvents?: RhythmSetId[];
  melodies?: string[];                     // melody ids (sets expanded in curriculum.ts)
  markStaff?: 0 | 1;                       // u24-l2: marked notes only in the bass staff
  intervals?: { clefs: Clef[]; sizes: (2|3|4|5)[]; stacked: 'no' | 'yes' | 'mixed' };
  stacks?: StackSetId[];                   // 'ST' | 'SB' | 'SCFG' | 'SH'
  showNaturals?: boolean;                  // unit 15: natural cards are drawn with a printed ♮
}
// LessonDef gains: material?: LessonMaterial; render gains 'rhythm'; unit is 1..25.
// CheckpointDef: id 'cp-a' | … | 'cp-f'; gains mix?: Mix and material?: LessonMaterial.
```
- **Unlocks:** unchanged rules (§4.10). Units 12–25 have no levels 2–3 (`unitLevelCount` = 1).
  Path order continues: `u12-l1` opens after `u11-l4`. Checkpoints d–f are always available
  (jump ahead), like a–c. `keyboardUnlocked` unchanged.
- **Self-check test additions:** every melody/pattern/stack id used exists and parses; mixes
  sum to 100; every lesson using a card kind has a non-empty pool or melodies; every non-card
  kind in a mix has the material it needs; no level-2/3 lessons for units 11–25; `cp-d..f`
  `completesUnits` are exactly the units since the previous checkpoint.

### 8.9 Lesson builder for part 2 (`domain/lessonBuilder.ts`) — M10–M13

`buildLesson` dispatch: unit 1 and 11 as before; **card lessons** (units 2–10, 12–15) →
`buildNoteLesson` with one change: in units 12–15 a new card's first slot is `name-accidental`
(instead of `name-note`), and the kind mix is the lesson's (P1 etc.). **Material lessons**
(units 16–25): for each of the `questionCount` slots, pick a kind from the mix (after the
sound-off rule), then generate it:
- beats-of: a token from `rhythmEvents` sets.
- which-longer: two event durations (notes only) with different beats.
- count-box: a pattern from `rhythmPatterns` (any time).
- finish-box: a pattern with ≥ 2 tokens; remove the last token; options = it + 2 other tokens
  from `rhythmEvents` whose beats differ from it and from each other and that would not also
  finish the box; shuffled.
- hear-rhythm: 3 different patterns of the same time from `rhythmPatterns` (if fewer than 3
  exist for a time, use a time that has 3); `answer` random.
- name-in-music: a melody from `melodies`; a note event (on `markStaff` if set); `card` =
  `soundingCard`. Weighting as in card lessons (weight 4 if the card is new, due or box ≤ 2,
  else 1), chosen over all (melody, note) pairs.
- melody-move: a melody and a valid marked note (see §8.6).
- hear-melody: 3 different melodies of the same time from `melodies`; `answer` random.
- interval-read: as step-skip (§4.12) but distance `size − 1`; first note p 0..8 in a random
  clef from `clefs`, second p −2..10 and a natural card; `stacked` per config (`mixed` = coin flip;
  size 2 is never stacked).
- together-or-not: a grand melody; one event from each staff; 50 % chance the pair is chosen
  to start together (if the melody has such a pair), else apart.
- stack-or-not: 50 % a real stack from `stacks`; else the same bottom note with gaps (2, 3) or
  (3, 2) diatonic steps (never a gap of 1, so heads never touch), all three natural cards.
- stack-name: a stack from `stacks` (SH adds `withBass`).
- name-accidental in a material lesson (finale): a card from the lesson `pool`.
Then: no two identical questions in a row (repair as §4.12 step 4); first slots unaffected.
`buildCheckpoint`: as before when `mix` is absent; else 15 questions generated as above with
no immediate repeats, retries off, pass ≥ 13.
`buildReview`: pool = all met cards; for a sign card the kind is `name-accidental` (70 %) or
`find-key-pitch` (30 %, only if `keyboardUnlocked`); natural cards as before.
Property tests (STANDARDS §3) extend to every new lesson × 200 seeds: question count exact, each
question answerable by `correctAnswerOf`, finish-box has exactly one right option, hear options
distinct, no listening question when sound is off.

### 8.10 Feedback, hints and session — M10–M13

- Wrong-answer texts and extra lines: CURRICULUM §12. Sign cards get **no landmark hint**
  (`hintFor` returns null for them); the position sentence uses the written note.
- Feedback highlights: name-in-music colours the marked note; finish-box/hear-* outline the
  right option in `--correct-ink` and the tapped one in `--wrong-ink`; interval-read/stack kinds
  colour the notes as §7.2.
- `session.ts` is unchanged (questions without cards already record `card: null`).

### 8.11 UI additions — M10–M13

- Tokens (M10): `--unit-12` #1D4ED8, `--unit-13` #047857, `--unit-14` #A21CAF, `--unit-15`
  #B91C1C, `--unit-16` #0E7490, `--unit-17` #6D28D9, `--unit-18` #9D174D, `--unit-19` #4D7C0F,
  `--unit-20` #1E40AF, `--unit-21` #92400E, `--unit-22` #115E59, `--unit-23` #C026D3,
  `--unit-24` #3730A3, `--unit-25` #9F1239 (white-text contrast 4.7–9.9, computed 2026-10-14);
  the contrast test covers them. Confetti may use them.
- Path: units 12–25 with headers and bubbles exactly like part 1 (no level buttons); checkpoint
  nodes after 15, 19, 22; the Path-end card (CURRICULUM §12) when every level-1 lesson is done.
- Progress: a second, smaller grand-staff chart "Sharps and flats" with the 12 sign cards
  (6 columns, each staff in pitch order, sign drawn before the head), same colours, legend and
  tooltips. The unit list shows units 12–25 (one star each when done).
- Question views (one file each in `screens/lesson/questions/`): `NameAccidental`,
  `FindKeyPitch` (extends FindKey), `BeatsOf`, `WhichLonger`, `CountBox`, `FinishBox`,
  `HearChoice` (rhythm and melody), `NameInMusic`, `MelodyMove`, `IntervalRead`,
  `TogetherOrNot`, `StackOrNot`, `StackName`. Choice buttons ≥ 52 px high; picture options are
  full-width buttons with the music inside on paper.
- Gallery: every new kind, one example each, plus every melody and every rhythm pattern.
- E2E `data-answer` for the new answers works as §7.11 (`option`, `pitch-name`, `pitch-key`).
