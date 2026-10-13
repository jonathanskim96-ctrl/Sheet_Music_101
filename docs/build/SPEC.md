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
| Notation | Whole notes only (no stems), natural notes only (no sharps/flats), range C2–C6. |
| Leaving a lesson | Nothing from an unfinished lesson is saved (lessons are ~3 minutes). |
| Note names shown to the learner | Letters only ("G"), plus nicknames for landmarks ("Treble G"). Octave numbers (G4) are internal only and never shown. |
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

All 34 cards (`ALL_CARDS`, in this order):
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
export const CURRENT_SCHEMA_VERSION = 1;
export interface LessonRecord {
  timesCompleted: number;     // 0 means "completed by passing a checkpoint" (skipped)
  bestAccuracy: number;       // integer 0..100
  firstCompletedDay: DayKey;
  lastCompletedDay: DayKey;
}
export interface Progress {
  schemaVersion: 1;
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
  `schemaVersion` not `1` → `progress: null`.

Rules (both modes):

| Field | Rule |
|---|---|
| schemaVersion | exactly `1` |
| createdDay, *Day fields | `isDayKey`; nullable ones may be `null` |
| settings.soundOn | boolean |
| settings.dailyGoal | 1, 2 or 3 |
| xp, totals.* , seen, correct, timesCompleted, today.lessonsDone | safe integer, 0 ≤ n ≤ 1 000 000 000 |
| bestAccuracy | integer 0..100 |
| avgMs | integer 0..60 000 |
| box | integer 1..5 |
| card.correct | ≤ card.seen (repair: set to seen) |
| lessons keys | match `/^[a-z0-9-]{1,32}$/`; at most 1000 entries. Unknown-but-well-formed ids are KEPT (forward compatibility) |
| cards keys | must be in `ALL_CARDS` (repair: drop others); at most 1000 entries |
| daysPracticed | array of DayKey, ≤ 50 000 entries; repair: drop invalid, sort, dedupe |
| strings | ids ≤ 32 chars; DayKey exactly 10 chars |

The id regex excludes `_`, so `__proto__`/`constructor` can never become keys. Build maps with
`Object.create(null)` during parsing, then copy into normal objects.

### 4.8 Schema upgrades (`domain/upgrades.ts`)

```ts
export function upgradeToCurrent(raw: unknown): { ok: true; value: unknown } | { ok: false; reason: 'newer' | 'unknown' };
```
v1 has no steps yet. Rule for the future: a change to `Progress` = bump `CURRENT_SCHEMA_VERSION`,
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
{ "app": "sheet-music-101", "kind": "backup", "schemaVersion": 1,
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
  (`unavailable`), save error, InstallCard (not standalone and not dismissed in last 7 days),
  BackupReminderCard (≥ 5 lessons done and no export in 30 days; dismiss = mark today).
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
  head at its position (treble cards on the treble staff, bass cards on the bass staff, spread
  horizontally in pitch order): new = `--locked`, learning = `--wrong-ink`, almost = `--xp`,
  known = `--correct-ink`. Legend underneath with text labels (colour is not the only signal:
  legend uses icon + text, and tapping a note shows a tooltip "Treble G · Known · 12/13 correct").
- Stat tiles: total XP, days practised, lessons completed, first-try accuracy overall.
- Unit list with level stars.

**Settings:** Sound (toggle) · Daily goal (1/2/3 segmented) · Install the app (instructions
per platform) · Backup: "Save a backup" (export), "Last backup: never / today / n days ago",
"Restore from backup" (import → preview Sheet with summary → "Replace my progress"
(danger) / "Cancel") · Storage status · "Start over" (danger; Sheet 1: "Save a backup first?"
[Save backup] [Continue without backup]; Sheet 2: "Erase all progress? This can't be undone."
[Erase everything] (danger) [Cancel]) · About: version and build id, Bravura credit
("Music symbols: Bravura by Steinberg, SIL Open Font License").

**Broken-data screen** (store `broken`): Mascot (encouraging), "We couldn't read your saved
progress.", buttons "Download the saved data" (raw record as JSON file), "Try again" (reload),
"Start fresh" (same two-step Sheet flow as Start over).

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
- One lazily created `AudioContext` on the first play call (always inside a tap handler);
  `resume()` if suspended. Master `GainNode` 0.6 → `DynamicsCompressorNode` → destination.
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
