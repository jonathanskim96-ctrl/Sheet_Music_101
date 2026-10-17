# Notes (history, append-only)

## 2026-10-12: project started
- Created planning docs: `CLAUDE.md`, `docs/PLAN.md`, `docs/HANDOFF.md`, this file,
  and a copy of the owner's `docs/APP_BUILD_PLAYBOOK.md`.
- Proposed: on-device storage (no backend), own SVG staff renderer, Web Audio
  sound, Leitner-box spaced repetition, landmark-note teaching method,
  11-unit curriculum (about 3–4 months at one lesson a day).
- Waiting on owner answers to the open decisions in `docs/PLAN.md` section 8.
- Owner decided: on-device storage, no streak, no hearts, letters first then keyboard.

## 2026-10-12: planning completed
- Owner decided: separate phones (no profiles), sound on with mute, bright/colourful/entertaining.
- Wrote the full build spec in `docs/build/` (README, SPEC, CURRICULUM, STANDARDS, M1–M7).
- Verified in a throwaway project: the exact dependency set installs (npm 11), and
  typecheck, lint, unit tests, production build with strict CSP, service worker activation and
  Playwright e2e on phone + desktop all pass; `npm audit` reports 0 vulnerabilities.
  The verified M1 files are in `docs/build/m1-files/`.
- Mutation-checked the M1 guardrails in that project: `Date.now`/`Math.random`/`idb` in
  domain → lint fails; `innerHTML`/`window.alert` → lint and check-safety fail; edited fixture →
  check-safety fails; missing CSP → check-dist fails. All failed as expected.
- Prototyped the staff renderer: clef origins, note positions, ledger lines and grand-staff
  spacing confirmed visually; numbers recorded in SPEC §7.3.
- Extracted the Bravura clef/brace/notehead outlines into `src/notation/glyphs.ts`
  (tool: `tools/glyphs/extract.py`; licence: `LICENSES/Bravura-OFL.txt`).

### Gotchas found during planning
- npm 10.9 (bundled with Node 22) crashes with "Cannot read properties of null (reading
  'edgesOut')" resolving vitest's optional peer set when versions are pinned below latest.
  npm 11.6.2 resolves it; npm 10 `npm ci` works fine from the resulting lockfile.
- jsdom triggers the same npm bug; not needed (UI tests run in real Chromium).
- TypeScript 7 is not supported by typescript-eslint 8.71 (`<6.1`): use TypeScript 6.0.3.
- eslint-plugin-react does not support ESLint 10: bans are done with core rules instead.
- Vitest config must use `defineConfig` from `vitest/config`, and the Node tsconfig needs the
  `DOM` lib for Playwright `page.evaluate` callbacks.

## 2026-10-12: M1 executed (scaffold, guardrails, CI, deploy)
- Copied `docs/build/m1-files/` into the repo root; `npm ci` (npm 10.9.4, works from the
  npm 11 lockfile; 0 vulnerabilities); `npm run verify` passed first time: check-safety OK,
  typecheck/lint/format clean, 2 unit tests, build + check-dist OK, 4 e2e tests (phone + desktop).
- Mutation checks of the guardrails (all "failed as expected", then the test files were deleted):
  1. `src/domain/x.ts` using `Date.now()` and `Math.random()` → lint fails (2 errors).
  2. `src/domain/y.ts` importing `idb` → lint fails (`no-restricted-imports`).
  3. `src/ui/x.ts` setting `innerHTML` and calling `window.alert` → lint fails (2 errors) and
     check-safety fails (2 problems).
  4. Build, then remove the CSP meta from `dist/index.html` → check-dist fails ("CSP meta missing").
- Not yet verified (needs the owner / GitHub): CI run on the PR, branch protection, the Pages
  deploy and the live page.

## 2026-10-13: M1 merged and deployed
- PR #1 merged to `main`; CI run on `main`: `verify` and `deploy` both succeeded (checked via
  the GitHub tools). Owner confirmed the live page loads.
- Still open: protect `main` (SETUP §3), home-screen install check on phones, Opus review of M1.

## 2026-10-13: Opus review of M1 (code review + security review)
- Every copied file matches `docs/build/m1-files/` byte for byte; `npm run verify` green on `main`.
- Security review: no findings (CI permissions, pinned actions, CSP, frame-busting all as specified).
- Fixed (the root files now differ from the `m1-files/` reference copy on purpose):
  1. `src/pwa/register.ts`: with `registerType: 'autoUpdate'` the plugin calls
     `window.location.reload()` when a new version activates unless `onNeedReload` is set.
     That broke SPEC §7.8 "never reload automatically" and would have interrupted lessons from
     M4 on. Now a no-op; the M5 UpdateBanner offers the reload. Also: registration errors are
     logged (were silently dropped) and offline `update()` failures no longer become unhandled
     rejections. SPEC §7.8 and §7.10 updated to match.
  2. `check-safety`: the alert/confirm/prompt ban matched any `.prompt(` method, so M5's
     `beforeinstallprompt` `event.prompt()` would have failed. Now bans only the globals.
  3. `check-safety`: fixtures existing without `fixtures.lock.json` now fails (deleting the
     lock used to switch the whole check off).
  4. `check-dist`: added the "no `http://` URLs" check from STANDARDS §6 (XML namespace
     names on www.w3.org are allowed), and script-src must be exactly `'self'` (a substring
     test let `'unsafe-inline'` through).
  5. ESLint domain import ban: `**/data`, `**/data/**` etc. instead of `../data/*`, so
     nested domain files and index imports are caught too.
  6. CI: `push` only on `main` (pull requests run via `pull_request`), so each PR commit
     no longer runs the full job twice.
- Mutation checks of the changed guardrails, all "failed as expected": `src/domain/deep/x.ts`
  importing `../../data/db` and `../ui` → lint fails (2 errors); `src/ui/x.ts` calling
  `alert()` and `window.confirm()` → check-safety fails, while `e.prompt()` passes;
  `tests/fixtures/v1-a.json` without a lock → check-safety fails; `'unsafe-inline'` added to
  script-src in `dist/index.html` → check-dist fails; `http://evil.example/x` appended to a
  dist JS file → check-dist fails. Probe files deleted afterwards.

## 2026-10-13: M2 executed (domain core)
- Built SPEC §4 in `src/domain/` in the order of `M2.md` (18 steps, one commit per step or two): notes, cards, days,
  rng, srs, progress, curriculum + content, ids lock, landmarks (+ `describePosition`), keyboard window, validate,
  upgrades + first fixture, unlocks, questions, lesson builder, session, planners, backup. Plus `testkit.ts` (test-only
  helpers: deep freeze, random valid progress) and `edge.test.ts` (empty and fully finished progress).
- `npm run verify` green: 20 test files, 735 tests (property tests: notes, days, srs, lessonBuilder over every lesson ×
  200 seeds × random progress, session, planners, validate fuzz, backup).
- Mutation checks (break a guardrail or rule on purpose, confirm tests fail, restore with `git checkout`), all "failed
  as expected": id removed from `ids.lock.json`; lesson id renamed; fixture edited (`check-safety`); promotion-once-per-day
  removed; retry gap 3→2; checkpoint pass mark 13→12; checkpoint XP bonus changed; `correct ≤ seen` check removed;
  floats accepted by validate; unknown card ids kept by validate; backup size cap raised; repeat-free ordering removed;
  keyboard unlock moved to u4-l4; level 2 no longer needs the keyboard; find-key-letter accepting any key; `SLOW_MS` 6000→7000
  (this one was NOT caught at first because the test used the constant itself, so a literal 6000/6001 test was added).
- Gotchas:
  - `check-safety` scans test files too: a hostile-payload test string containing `alert(` tripped it; payload text now avoids it.
  - Assigning `obj['__proto__'] = x` in a test changes the prototype instead of creating a key; tests use `Object.defineProperty`
    (or `JSON.parse`) to make a real own `__proto__` key.
  - `fc.date()` can produce invalid dates by default in fast-check 4 (`noInvalidDate: true`); day arbitraries use integers instead.
  - SPEC §4.7 says the lesson id pattern excludes `constructor`; it does not. All lookups use `Object.hasOwn`
    (`isCompleted`, planners, validate) and there is a test with a lesson called `constructor`.
- Not verified: nothing about the UI (none exists yet); CI on the pull request; the Opus review.

## 2026-10-13: M2 Opus review
- `/code-review high` plus a step-by-step check against M2.md, SPEC §4, CURRICULUM and STANDARDS. All 18 steps done;
  every listed test exists. Curriculum data was dumped from code and compared with CURRICULUM.md: identical.
- Fixed in review: strict `checkProgress` stopped at a bad `createdDay` instead of listing every issue; `hintFor` gave
  no hint for a landmark the learner hasn't met yet (SPEC 4.16 only excludes the card being the nearest learned
  landmark); backup `exportedAt` accepted impossible dates (Feb 30 rolled to Mar 2); backup error texts duplicated
  `content.ts`; `content.ts` re-parsed card ids by hand and referred to a non-existent `answerText`.
- Mutation check: each of the three new tests fails against the pre-fix code and passes after.
- Left as is (reviewed, not worth the code): small repeated helpers (`isRecord`/`own` in backup, `MAX_INT` in planners);
  per-attempt object copies in `planCompleteSession` (at most ~60 small copies per lesson); clock-going-backwards day
  roll-over (see HANDOFF).

## 2026-10-13: M3 executed (look, sound, notation, Gallery)
- Added tokens/base CSS (+ contrast test), router, notation geometry/Staff/Keyboard, UI kit (Button, ProgressBar, Sheet,
  Mascot, Confetti, DailyGoalRing, icons), synth with injectable fake AudioContext, GalleryScreen, e2e gallery + screenshot specs.
- Visual QA: opened light/dark screenshots of every Gallery section; every note sits on the right line/space (also asserted in
  e2e from the rendered notehead y against an independent table); ledger lines correct for A3, C6, C2, E4; no overflow at 390/320px.
- Gotchas:
  - Vitest blanks CSS files even with `?raw`; `test.css.include: [/tokens\.css/]` in `vite.config.ts` fixes it.
  - `-2 % 2` is `-0` and `toBe(0)` fails on it (Object.is).
  - `react-hooks` v7 forbids writing `ref.current` during render; update refs in an effect.
  - `typescript-eslint` `unbound-method`: declare object-of-functions interfaces with property signatures, not method signatures.
- Not verified: sound on a real phone (tests use a fake AudioContext); owner approval of the look.

## 2026-10-13: M3 Opus review fixes
- Synth: the first audio error is kept until `setAudioErrorHandler` is called (it used to be used up silently, so the
  "Sound isn't available" toast could never show); the context is resumed in any state other than `running` (iOS Safari
  uses `interrupted` after a call). Tests added.
- Confetti: the 2.5 s timer no longer restarts when the parent passes a new `onDone` each render.
- `staveFor` throws for a note of the other clef on a treble/bass staff instead of drawing it on the wrong line (test added).
- Geometry test: the "all 34 cards" check was circular (it re-used the formula); it is now a hand-counted y table for every card.
- Unknown hashes (and `#/gallery` in production) now redirect to `#/` (SPEC 7.2), e2e-tested.
- Keyboard: the "C" label and Middle C dot on green/orange keys use `--ink` (white was ~3.4:1). Mascot colours use tokens
  (only the cheek pink has no token). Button press no longer adds a 2px margin that jolted the buttons below.
- Gallery: the tappable staff's ghost note now sits at the tapped position (e2e-checked).


## 2026-10-13: M4 executed (saving + first playable lessons)
- First commit: stacked Sheets fixed (M3 review item 1): a shared stack of open sheets, so only the top one answers Escape,
  lower ones are inert, and the page behind stays inert until the last closes. Gallery demo + e2e test.
- Data layer: `data/db.ts` (only `idb` importer), `data/store.ts` (serialised commits, stale-tab merge, strict validation of
  every planner result, save-failure keeps the change and retries with the next one, broken data never overwritten,
  in-memory fallback), `ProgressContext`, toasts. 16 store tests on fake-indexeddb, including the schema-1 fixture.
- Screens: Welcome, Path (units 1–4), Lesson (concept cards, Meet cards, name-note + the five unit-1 kinds, feedback bar,
  completion saved on appear), "Coming soon" placeholders. `data-answer` hook in e2e builds only.
- Mutation checks, all "failed as expected" then restored: planner result not validated; commits not serialised; stale-tab
  merge removed; broken data overwritten at load; saveError dropped.
- Gotchas:
  - Playwright refuses to click an `aria-disabled` button; the locked-bubble test uses `{ force: true }`.
  - The store's "storage unavailable" log is `console.warn`: the e2e fixture fails on `console.error`, and the problem is
    shown in the UI anyway.
  - react-hooks v7 rejects `setState` in an effect and reassigning a variable during render (use a ref / a precomputed map).
  - `LETTERS` is C–B; the answer pad needs its own A–G order.
- Not verified: sound on a real phone; install-to-home-screen and reopen on a real phone; CI on the pull request; Opus review.

## 2026-10-13: M4 Opus review (after merge)
- `/code-review high` and `/security-review` on PR #9. Security: no findings (hash ids are allow-listed and only rebuilt into
  `#/…` fragments; every stored document goes through upgrade + repair; planner results are strict-checked; `data-answer`
  and the Gallery are absent from production).
- Fixed here: `startFresh` refuses to replace a record that has become readable again (another tab or a newer version saved
  it), with a test; after a failed write the in-memory progress is built on what the transaction read (another tab's newer
  save) instead of this tab's older copy, with a test; the e2e `seedRecord` helper waits for the Loading screen to go
  (it is a `<main>` too, so the helper could open the database before the app created its store); the lesson sound toggle
  no longer has `aria-pressed` (its label already says what a tap does; "Mute sound, pressed" read as muted); concept
  picture labels stay with their marked notes; unused `replaceRoute` removed.
- Mutation-checked both new store tests (each fails with its fix removed).


## 2026-10-13: M4 review fix session (PR #10 items 1–2, Silent-mode hint)
- Store: once the database has opened, a failing read (or failing first write) is `broken` with the error text as the
  reason and the handle is closed; `unavailable` is now only "IndexedDB can't be opened". Two new store tests; both fail
  with the fix removed (checked). The stored record is unchanged. With no handle kept, `startFresh` cannot run after a
  read failure (deliberate: that data was never shown to be unreadable, only unreadable right now).
- Lesson complete: `useCommit(planner, { toast: false })` so a failed result save shows only the inline alert.
  Not tested end to end: planners cap their numbers, so the UI cannot produce an invalid result, and there is no DOM
  unit-test setup. The change is two lines; `tsc`/lint cover it.
- Silent-mode hint (SPEC 7.7, lessons only): `pwa/platform.ts` `isIosDevice` (reusable by M5 `install.ts`), text in
  `content.ts` `SILENT_HINT`, a module flag keeps it to once per app run. e2e: iPhone UA shows then hides it; default UA
  never shows it. Settings part comes with M5.

## 2026-10-13: Opus review of PR #12 (M4 fix-up)
- Clean-room run (`rm -rf node_modules dist dist-e2e && npm ci && npm run verify`) on the PR head: green
  (858 unit, 72 e2e passed, 10 skipped). Screenshots reviewed, including the new hint in light/dark at 390 and 320 px.
- Store: owner decided a failed *first* save (nothing stored yet) is `unavailable`, not `broken`; a failed read stays
  `broken`. The broken-read test now also checks `retrySave` and `startFresh` leave the record alone. An empty error
  message becomes "Unknown error" (no lone "." on the broken screen).
- Lesson complete: if the learner taps Continue before a failing result save settles, the error now shows as a toast
  instead of nowhere. No component test (only a planner bug reaches this path; no DOM test setup); accepted in review.
- Silent hint: sound on/off is now checked at render, so turning sound on during the first screen shows the hint, and
  the hint only counts as "used" once it was actually shown. e2e added for once-per-run (and back after a reload),
  dismissal by an answer (u2-l3 starts with a question), and sound off. Mutation-checked: removing the "used" flag,
  checking sound only at mount, or not dismissing on answer each fail one test.
- `e2e/screens.spec.ts` now also screenshots the lesson with the hint (iPhone user agent).
- iPhone sound bug planned (HANDOFF): harden synth start-up; owner chose to keep obeying Silent.

## 2026-10-13: M5 executed (progress, settings, backups, safety nets)
- Owner answered four open questions first (HANDOFF decisions): backup "Later" for this app run only, InstallCard only
  when it can offer something, 17 shared chart columns, iPhone sound fix in its own session.
- Data: `persist.ts` (persist once per run after the first completed session; `persisted()` for Settings), `files.ts`
  (share sheet where files can be shared, else a Blob download; 1 MB cap before reading; raw-data export),
  `backupHooks.ts`. Store: `readRawRecord` (own connection, never writes), `startFresh` opens the database itself after
  a failed read, `lastGoodProgress` for the error screen.
- UI: Path cards in priority order (StatusBanner, InstallCard, BackupReminderCard), unit level stars, gated Practise
  button and keyboard sheet; Progress (mastery chart with tappable columns, legend, tiles, units); Settings; Start over
  (two Sheets, shared with the broken screen); UpdateBanner; ErrorBoundary; global error toasts; broken-data screen.
- e2e: `settings.spec.ts`, `backup.spec.ts`, `safety.spec.ts` (all M5 items incl. XSS import, 2 MB file, newer
  version, broken data download + unchanged record, Cancel at either Sheet, update banner via the e2e-only hook).
  `check-dist` bans `__e2e`.
- Gotchas:
  - `check-safety` matched the words "install prompt (" in a comment (looks like a `prompt(` call). Reworded.
  - `getByRole('button', { name: 'Back' })` also matches "Save a backup": use `exact: true`.
  - Clicking an SVG `rect` with `tabIndex` shows Chromium's default focus ring; hidden unless `:focus-visible`.
  - Path scroll: `scrollIntoView({ block: 'center' })` pushed the InstallCard off a fresh Path; now `'nearest'`.
  - The schema-1 fixture's last backup is 2026-10-05, so the backup reminder only shows from 2026-11-04.
- Not verified: sharing to Files on a real iPhone (`navigator.share` with files) and the real Android install prompt
  (both simulated or absent in Chromium tests); a real service-worker update (simulated with the e2e hook).


## 2026-10-13: M5 Opus review (PR #14)
- `/code-review high` and `/security-review`: no security findings (import path, preview text, Blob URLs, e2e hook all safe).
- Fixed in review: the Settings sound switch flipped the value captured at render, so a double tap wrote the same value
  twice (new e2e test fails on the old code); "Save a backup" now ignores a second tap while the share sheet is open;
  the XSS e2e test records dialogs and asserts none opened (a throw inside `page.on('dialog')` doesn't fail the test);
  unused `.reload`/`.text` CSS removed from `App.module.css`.
- Gotcha: run `npm run build:e2e` before a narrow `npx playwright test`; it serves the last `dist-e2e` build.
- Left for the owner/Sonnet: listed in the PR comment (import offers no backup first; broken screen's "Save backup" with a
  failed raw read; mastery chart tap targets; global error toast noise; small cleanups).

## 2026-10-13: M5 review fix session (PR #14 items 1–5)
- Brought in the reviewer's commit `478a440` (fast-forward from `ccr-07fe752d-7w2hrj`).
- 1 (owner decision): restore preview has "Save a backup first"; SPEC 7.2 and CURRICULUM §5 updated; e2e test: the
  download holds the current progress, the preview stays open and nothing is replaced until "Replace my progress".
- 2: broken-data screen, raw read failed: Start fresh's "Save backup" is disabled and the sheet says why
  (`StartOverSheets` `saveUnavailable`). e2e test (every `IDBObjectStore.get` throws) fails without the fix (checked).
- 3 (owner decision): chart tap targets recorded as an accepted exception in HANDOFF.
- 4: window `error` events without an error object (ResizeObserver, "Script error.") are logged with `console.warn`, no
  toast; e2e test for both cases.
- 5: one `somethingWentWrong(e)` / `errorMessageOf(e)` in `content.ts` ("Unknown error" everywhere); `readImportFile`
  removed. `useStatusWarning()` not done (one shared condition, two lines; not worth a hook).


## 2026-10-13: iPhone sound hardening (Sonnet session)
- Three commits, one per HANDOFF item: (1) `installUnlock` + `synth.unlock()` start the engine inside the first tap with a
  silent buffer (wired in `main.tsx`); (2) a `closed` engine is replaced on the next sound and an engine still not
  `running` 300 ms after a tap is closed and rebuilt; (3) all sounds start 20 ms ahead. SPEC 7.7 updated.
- Unit tests use the fake context in `synth.test.ts` (it gained `close`, `createBuffer`, `createBufferSource`) and fake timers.
  Mutation checked: dropping the "same engine" check in the stuck-engine timer fails "two quick taps rebuild only once".
- Gotcha: Node's `EventTarget` doesn't remove a capture listener given a bare `true`; the test document passes `{ capture }`.
- Not verified: real iPhone sound (a fake context cannot say whether Safari lets the sound out). The owner's phone check is
  in HANDOFF. The "running but silent" Safari state can't be detected from the page; only a stuck non-running engine is rebuilt.

## 2026-10-13: Opus review of the iPhone sound hardening (PR #15)
- `/code-review high` done. Each HANDOFF item is in its own commit and matches SPEC 7.7.
- Mutation checks (break, run `synth.test.ts`, restore): no tap listener, only `click`, no re-attach after hidden, no
  silent buffer, 3000 ms instead of 300, no stuck rebuild, no same-engine check, no closed-engine replacement, stuck
  engine not closed, no 20 ms lead (each of the two sites separately), mute ignored: all fail a test. Two gaps fixed:
  "never detach" passed every test (new listener-count test), and removing `installUnlock` from `main.tsx` passed
  everything (new `e2e/sound-unlock.spec.ts`, counts AudioContexts; fails with the line removed).
- Gotcha (fixed): Chromium rejects a pending `resume()` ("Audio context is going away") when the context is closed, so
  the stuck-engine rebuild showed "Sound isn't available right now." just as sound recovered. `wake()` now ignores
  rejections from an engine that was already replaced. WebKit leaves such a promise pending instead (checked in its
  source), so iPhone was not affected.
- Fixed: `unlock()` and the stuck-engine rebuild ignored mute, so with Sound off a tap still built an engine (and could
  show the toast). SPEC 7.7 says muted means every call is a no-op; both now return early (test + mutation checked).
- Larger items for a Sonnet fix session are listed in the PR #15 review comment (300 ms rebuild can kill a slow engine).

## 2026-10-13: Stuck-engine rebuild limited to once per time shown (PR #15 review item 1, Sonnet session)
- Why: an engine that was only slow (AirPods/Bluetooth, just after an interruption) could take more than 300 ms, so every
  tap closed it and built a new one; the note was lost and sound might never play. Owner approved the behaviour change.
- What: `createSynth` has a private `rebuildUsed` flag. `rebuildIfStuck` returns early when it is set and sets it when it
  rebuilds. New `Synth.allowRebuild()` clears it; `installUnlock` calls it when the page becomes `hidden`. Later taps still
  call `unlock()` (resume + silent buffer) but never close the engine. Replacing a `closed` engine in `ready()` is unchanged.
- Tests: the old "rebuilds at most once per tap, but again for the next tap" now describes the new rule (once per time
  shown); three new tests (two stuck taps = one rebuild and the new engine is never closed; hidden via `installUnlock`
  re-allows; `allowRebuild()` re-allows exactly one).
- Mutation checks (break, run `synth.test.ts`, restore): (a) no `rebuildUsed` check: 3 tests fail; (b) `allowRebuild` does
  nothing: 2 fail; (c) no `allowRebuild()` call in `installUnlock`: 1 fails. All restored, 38 pass.
- Not verified: real iPhone/Bluetooth sound (owner's phone check in HANDOFF).

## 2026-10-13: M6 executed (full curriculum), Sonnet session
- Built, one commit per step: (1) FindKey view, (2) FindOnStaff view (new tested helper `nearestCorrectPosition`),
  (3) StepSkip view (new tested helper `stepSkipExplanation`), (4) Level 2/3 buttons (`nextLevelLesson`),
  (5) practice route (`LessonScreen` now takes a `source`: lesson, review or checkpoint), (6) checkpoint nodes and route
  (`checkpointReached`), (7) `MAX_UNIT_M4` and its helpers and test removed, (8) `e2e/curriculum.spec.ts`,
  (9) M6 screenshots in `e2e/screens.spec.ts`. `Progress` was not touched (schema stays 1); `synth.ts` untouched.
- Long loop test (all 43 + 36 lessons and 3 checkpoints, phone project) takes about 5.5 minutes.
- Gotchas:
  - Playwright caught that the checkpoint screen was not yet rendered by `App` (the route existed, the screen did not).
  - Seeding progress past `u4-l5` opens the one-time "New: piano keyboard!" sheet; its backdrop blocks clicks. E2E seeds that
    start on the Path set `flags.keyboardUnlockSeen = true`.
  - Visual QA found a real bug: after tapping a piano key, Chromium painted its focus colour (amber) over the result colour
    (green/orange) of the tapped key and its neighbour. Keys now call `blur()` on click. Tested via `document.activeElement`.
- Visual QA (STANDARDS 7): opened every `m6-*` screenshot for light and dark; also 320 px for Level buttons and the step-skip and
  find-on-staff feedback. On a 320 px wide screen the feedback bar covers the second row of the 2 x 2 answer buttons (the
  answer is already given; the page scrolls). Accepted, listed in HANDOFF.
- Not verified: a real phone (touch behaviour of the tap bands, 17 bands of about 10 px each, nudge buttons compensate),
  and sound on iPhone (unchanged from before).

## 2026-10-14: M6 Opus review, small fixes
- Find-on-staff wrong answer: the title ("It's Treble C.") and the landmark hint now name the green note that is drawn
  (the nearest same-letter note, maybe another octave), like the position sentence already did. Before, a tap near C5 for
  card treble-C4 said "It's Middle C." under a green note in space 3. The e2e test now taps next to the other octave.
- `#/lesson/cp-a` showed the Path under a wrong address (`isAvailable` says yes to checkpoint ids); it now redirects to `#/`.
  App uses `findCheckpoint` instead of its own lookups. The nudge bounds come from `TAP_POSITIONS`.
- Larger items are listed on the PR for a Sonnet fix session.

## 2026-10-14: M6 review fix session (items 2 and 3)
- StepSkip no longer rebuilds button states or invents a `'step-up'` fallback; QuestionView passes `choiceStates()` and `noteState`.
- LessonScreen: `planFor` returns `{ plan, id }` from one exhaustive switch (`never` check); `idOf` is gone. Same seeds as before.
- Item 1: `blur()` removed from Keyboard; CSS `.key:focus:not(:focus-visible) { outline: none }` instead. The old `activeElement` check tested the fix, not what the learner sees; it is now `toHaveCSS('outline-style','none')` (checked: fails without the CSS rule).
- Item 4: new `open` bubble state (available, not current): unit colour, no lock, no Start. e2e test passes cp-b from a fresh start (fails on the old code).
- Gotcha: a fresh cloud checkout has no `node_modules`; `tsc`/`eslint` silently print nothing useful until `npm ci` has run.

## 2026-10-14: M7 executed (hardening), Sonnet session
No feature was added and the app's behaviour did not change. New: `e2e/hardening.spec.ts` (attack, accessibility and speed checks)
and a JavaScript size budget in `scripts/check-dist.mjs`. Baseline before any change: `npm run verify` green on `main`
(925 unit tests; 183 e2e passed, 19 skipped, 11 minutes).

### Step 1: coverage table (SPEC and CURRICULUM section → tests)
| Section | Covered by |
|---|---|
| SPEC 1 Fixed decisions | decisions, not code; the behaviours are covered through the sections below |
| SPEC 2 Tech stack | `package-lock.json` + `npm ci`/`npm audit` in the PR checklist; CI `verify` |
| SPEC 3 Source layout, purity | ESLint rules (no `Date.now`/`Math.random`/`idb`/DOM in `src/domain`), `check-safety` |
| 4.1 Notes | `notes.test.ts` (table of all 34 cards, round-trip properties) |
| 4.2 Cards | `cards.test.ts` |
| 4.3 Days | `days.test.ts` (DST, year ends, properties) |
| 4.4 Random | `rng.test.ts` |
| 4.5 Spaced repetition | `srs.test.ts` (rules 1–6, property) |
| 4.6 Progress document | `progress.test.ts`, `validate.test.ts` |
| 4.7 Validation | `validate.test.ts` (strict/repair, fuzz, prototype keys, huge numbers, deep nesting) |
| 4.8 Schema upgrades | `upgrades.test.ts` (steps machinery, fixtures keep loading) |
| 4.9 Curriculum types and self-check | `curriculum.test.ts`, `curriculum.lock.test.ts` |
| 4.10 Unlock rules | `unlocks.test.ts`, `edge.test.ts`, `e2e/lesson.spec.ts`, `e2e/curriculum.spec.ts` |
| 4.11 Questions | `questions.test.ts` (property over every kind) |
| 4.12 Lesson builder | `lessonBuilder.test.ts` (every lesson × 200 seeds), `edge.test.ts` |
| 4.13 Session state machine | `session.test.ts` |
| 4.14 Planners | `planners.test.ts`, `edge.test.ts` |
| 4.15 Backup format | `backup.test.ts`, `e2e/backup.spec.ts`, `e2e/hardening.spec.ts` (hostile files) |
| 4.16 Landmark hints | `landmarks.test.ts` |
| 4.17 Keyboard window | `keyboardWindow.test.ts` |
| 5.1 IndexedDB | `store.test.ts` (fake-indexeddb), `e2e/persistence.spec.ts` |
| 5.2 Store, one write path | `store.test.ts` (queue, rev conflict, broken, unavailable), `e2e/safety.spec.ts`, `e2e/persistence.spec.ts` |
| 5.3 Persistence and nudges | `persist.test.ts`, `nudges.test.ts`, `e2e/settings.spec.ts` |
| 5.4 Files | `files.test.ts`, `e2e/backup.spec.ts` |
| 6 Guardrails 1–3 | `e2e/backup.spec.ts` (two-step Start over, preview before replace), `e2e/safety.spec.ts`, `e2e/persistence.spec.ts` |
| 6 Guardrail 4 (ids lock) | `curriculum.lock.test.ts` (mutation 10) |
| 6 Guardrail 5 (fixtures) | `check-safety`, `upgrades.test.ts`, `store.test.ts` |
| 7.1 Visual system | `tokens.test.ts` (contrast), `e2e/screens.spec.ts` screenshots (looked at by a person) |
| 7.2 Screens and routes | `e2e/lesson.spec.ts`, `e2e/curriculum.spec.ts`, `e2e/settings.spec.ts`, `e2e/persistence.spec.ts`, `e2e/backup.spec.ts`, `router.test.ts`, `e2e/hardening.spec.ts` (hostile routes, names, keyboard) |
| 7.3 Notation | `geometry.test.ts`, `glyphs.test.ts`, `e2e/gallery.spec.ts` (34 notes on the right line or space) |
| 7.4 Keyboard | `e2e/gallery.spec.ts` (tap, key presses, height), `e2e/curriculum.spec.ts` |
| 7.5 Mascot | **screenshots only** (`e2e/screens.spec.ts`, Gallery); no assertion on moods |
| 7.6 Confetti | `e2e/gallery.spec.ts`, `e2e/hardening.spec.ts` (none with reduced motion) |
| 7.7 Audio | `synth.test.ts`, `e2e/sound-unlock.spec.ts`, `e2e/silent-hint.spec.ts`, `platform.test.ts`; **real iPhone sound not testable here** |
| 7.8 PWA | `e2e/smoke.spec.ts`, `e2e/hardening.spec.ts` (full manifest, head tags, service worker scope), `e2e/safety.spec.ts` (update banner) |
| 7.9 Security hardening | `check-dist`, `e2e/hardening.spec.ts` (CSP refuses eval/inline script/handler, frame-busting, no outside requests) |
| 7.10 Errors | `e2e/safety.spec.ts` (toast, broken screen); **the render-crash screen (ErrorBoundary) has no test**: nothing in the app can make a render crash on demand and adding a test-only crash hook is not in SPEC 7.11 |
| 7.11 E2E hooks | `check-dist` (no `data-answer` in production); every lesson e2e test uses the hook |
| CURRICULUM 1 Question mixes | `curriculum.test.ts` ("level lessons follow section 1"), `lessonBuilder.test.ts` |
| CURRICULUM 2 Units and lessons | `curriculum.test.ts` (counts, lessons per unit), `e2e/curriculum.spec.ts` (all 82 lessons and 3 checkpoints played) |
| CURRICULUM 3 Concept cards | `content.test.ts` (parses the document and compares all 24 cards) |
| CURRICULUM 4 Meet cards, nicknames, tips, hints | `content.test.ts`, `landmarks.test.ts` |
| CURRICULUM 5 UI text | `content.test.ts` (every quoted string exists in `content.ts`) |

Gaps found: (a) CSP absence went unnoticed by e2e (mutation 11) → added; (b) only the manifest name was checked → full
manifest, head tags and service worker scope added; (c) hostile routes, hostile files, keyboard run, 200% zoom, reduced
motion, speed and size had no tests → added. Left open: ErrorBoundary render-crash screen, Mascot moods (visual only).

### Step 2: mutation checks (each broken on purpose, tests run, then `git checkout -- <file>` and green again)
| # | Break | Result |
|---|---|---|
| 1 | `validate.ts`: accept non-integer xp in strict mode | failed as expected: 20 tests in `validate.test.ts`, `backup.test.ts`, `store.test.ts` |
| 2 | `backup.ts`: remove the 1 MB size check | failed as expected: 1 test in `backup.test.ts` |
| 3 | `store.ts`: remove the rev-conflict re-apply | failed as expected: 2 tests in `store.test.ts` |
| 4 | `store.ts`: unreadable stored data becomes the empty document | failed as expected: 5 tests in `store.test.ts` |
| 5 | `store.ts`: skip strict validation before writing | failed as expected: 1 test in `store.test.ts` |
| 6 | `geometry.ts`: drop the last ledger line | failed as expected: 3 tests in `geometry.test.ts` |
| 7 | `srs.ts`: wrong answer → `box - 1` | failed as expected: 2 tests in `srs.test.ts` |
| 8 | `lessonBuilder.ts`: remove the consecutive-duplicate repair | failed as expected: 76 tests in `lessonBuilder.test.ts` |
| 9 | `session.ts`: allow a second retry of the same question | failed as expected: 2 tests in `session.test.ts` |
| 10 | `curriculum.ts`: delete lesson `u2-l2` | failed as expected: `curriculum.lock.test.ts`, `curriculum.test.ts`, `planners.test.ts` (9 tests) |
| 11 | `vite.config.ts`: remove the CSP plugin | **first run: `check-dist` failed but all e2e passed → a test was missing.** Added the CSP test in `e2e/hardening.spec.ts`; second run: `check-dist` and the e2e CSP test both fail as expected |
| 12 | `planners.ts`: checkpoint completes units 1–10 whatever `completesUnits` says | failed as expected: 2 tests in `planners.test.ts` |
| extra | `check-dist.mjs`: JavaScript budget set to 1 kB | failed as expected ("JavaScript is 118 kB gzipped; the budget is 300 kB"), restored to 300 kB |
After every restore the full unit suite was green again (925 tests).

### Step 3: accessibility (`e2e/hardening.spec.ts`, plus what was already there)
- Desktop, keyboard only: a whole lesson played with Tab, Enter and Space; the focused control shows an outline of at least 2 px;
  the Leave sheet keeps Tab inside, closes with Escape and focus goes back to the X button. (The existing Gallery test also
  covers stacked sheets and the inert page behind.)
- The feedback bar is `aria-live="polite"` and has text; every button on Path, Progress, Settings, concept/Meet card, question and
  feedback has an accessible name.
- Reduced motion: no confetti, no running animation on the completion screen.
- "200% text zoom": the app's text is in px, so the browser's text-size setting does not change it; page zoom does. Checked at
  640 px wide (200% of a 1280 window) and 320 px (narrowest phone): no sideways scroll, no clipped text, nothing off the right
  edge on Path, Progress, Settings, a concept card, a question and the feedback.

### Step 4: speed
- JavaScript total: 118 kB gzipped (limit 300 kB); `check-dist` now fails above 300 kB.
- Path shown (progress seeded, page reloaded) after about 0.09 s normally and 0.26–0.40 s with the processor throttled 4×
  (limit 2 s); the test fails above 2 s.

### Step 5: black-box attack (done by a Sonnet session as automated tests; the Opus session still has to review it)
Against the e2e build, all passing: malicious backups (`__proto__`/`constructor` keys, 10 000 levels of nesting, invalid UTF-8,
1e999, huge integers, text/fraction/null where a number belongs, wrong top-level types, empty file, 1 000 001 characters, 1 500
lessons, made-up card ids) are refused with one of three fixed messages and the saved progress is unchanged; hostile hash routes
(`<script>`, `../../`, `%00`, `constructor`, `__proto__`, 5 000-character and 3 000-segment hashes) end on the Path with no script,
dialog or error; `Object.prototype` stays clean; the CSP refuses a string handed to `setTimeout`, an inline event handler and an
injected inline script (3 violations); a lesson, Progress and Settings make no request outside the app's origin; the service
worker scope is `/Sheet_Music_101/`.
- **Finding: frame-busting works only for a page on the same origin.** A page on another origin can still show the app in an
  iframe: Chrome refuses the script's "go to the top window" move unless the person tapped inside the frame, and a `<meta>` CSP
  cannot carry `frame-ancestors`; GitHub Pages sends no `X-Frame-Options`. Risk: clickjacking of a no-account, on-device app whose
  destructive actions all need a two-step in-app confirmation. Not fixed (no spec for it); listed as a limitation for the owner and
  for the Opus security review.
- The DevTools console is exempt from a page's CSP by browser design (typing `eval(...)` there still runs); the CSP test uses code
  that runs from the page itself instead.

### Steps still open
- Step 6 (Opus `/code-review high` over the whole codebase) and the Opus read of step 5: not done in this session.
- Step 8 (owner phone test) and step 9 (fixes from it): owner.

## 2026-10-14: M7 Opus review (whole codebase: code review, security review, black-box attack)
Branch `claude/wizardly-curie-x3hi6f`, built on the M7 PR head (`17d93de`). Baseline on that head: `npm run verify` green
(925 unit; 266 e2e passed, 20 skipped, 14 min).

### Process check (M7 steps 1–4, 7, 10)
- The 12 mutation checks were run again by script (break, run the named tests, `git checkout -- <file>`, run again). Every
  one **failed as expected** and was green after the restore. Counts differ a little from the Sonnet table because the
  breaks were written fresh (e.g. #1 here allows any finite number in `num`, so 3 tests fail, not 20). #10 also fails
  `curriculum.lock.test.ts` (checked on its own). #11 (CSP plugin removed): `check-dist` fails ("CSP meta missing") and
  both e2e CSP tests fail.
- Coverage table spot-checked against the test files (4.3 DST and year-end tests, 4.5 rules 1–6, 4.7, 4.13, 4.15, 5.2, 6
  guardrail 4, 7.3 hand-counted y table, 7.8 update banner, 7.10 toasts, CURRICULUM 3 all 24 rows): every row names tests that
  exist and test what the row says. The 7.10 and 7.5 gaps are stated honestly.
- Speed and size: 118 kB of JavaScript gzipped (budget 300 kB); the 4× slower processor test passes (Path under 2 s; the
  whole test, seeding included, took 1.3 s).
- Hardening tests are meaningful: protections broken on purpose and caught by e2e: CSP plugin removed (2 tests),
  frame-busting removed (1), the validator's lesson-id pattern loosened (3), the store's rev-conflict merge removed (3),
  the backup `app` check removed (1), a failed write no longer kept in memory (1).

### Code review fixes made here
- `store.ts`: if a save failed before its transaction ran and the change was itself invalid (a planner bug), that change
  stayed in `pending` and every later save failed with it. It is now dropped (new unit test; fails without the fix).
- `e2e/hardening.spec.ts` (from `/code-review high`): hostile-route tests now wait for the hash to settle on `#/` (they could
  pass against the old Path); the hostile *stored* data test really stores a `__proto__` key (Playwright drops `__proto__`
  from `evaluate` arguments, so it had stored a clean document); the zoom and accessible-name checks wait for the concept
  card (they could inspect Settings); the CSP test removes only the three expected refusals from the console errors (it
  cleared all of them); the network test listens on the browser context (sees service-worker requests) and compares
  origins exactly; the keyboard test reuses `CHOICE_LABEL` (it missed the step/skip labels).
- `check-dist`: the whole CSP must equal SPEC 7.9 (before, only `script-src` was checked: `connect-src *` or a dropped
  `object-src` passed); any `https://` URL in the build fails except two library error-message links (react.dev/errors,
  Workbox's bit.ly link), which are text and never fetched; the budget message uses the constant.
- `check-safety` and `.gitignore`: the broken screen's raw export (`sheet-music-101-saved-data-*.json`) can't be committed
  either (only backup files were caught).
- `LICENSES/Nunito-OFL.txt` added (the Nunito font files ship in the app; only Bravura's licence was there).

### Security review
- `/security-review` over the whole codebase: no findings. Manual audit (STANDARDS §6, every box): no banned APIs in `src/`
  (check-safety mutation-tested for all nine), no URL built from input (the only `href`s are a Blob URL and the page's own
  location), no secrets, no `.env`, no committed backups. CI: top-level `contents: read`, only deploy has
  `pages: write`/`id-token: write`, every action pinned to a full SHA, no `${{ }}` in `run:`, `persist-credentials: false`,
  no `pull_request_target`.
- Dependencies: `npm audit` 0 and `npm audit --omit=dev --audit-level=moderate` 0. Runtime deps (react/react-dom 19.3.0 by
  Meta, idb 8.0.3 by Jake Archibald, @fontsource/nunito 5.3.0, lucide-react 1.48.0) are all over two weeks old with no
  install scripts. The lockfile is unchanged since M1: every package from registry.npmjs.org with an integrity hash; the only
  install scripts are `fsevents` (dev, macOS only).
- Service worker: precaches only the app's own files (e2e-checked), no runtime caching of other sites, scope
  `/Sheet_Music_101/`, never reloads by itself, `controllerchange` only shows the banner when a worker was already in control.
  A poisoned cache would need script execution on the origin first (blocked by the CSP).

### Black-box attack (M7 step 5, second pass): new `e2e/attack.spec.ts` (all passing, phone and desktop)
- Backup files (33 cases): `__proto__`/`constructor.prototype` in the envelope, settings, lessons map, cards map and inside a
  card; 10 000 levels inside a card; invalid UTF-8 inside a valid file (in `exportedAt`: ignored; as a lesson id: refused);
  UTF-8 BOM and UTF-16 with BOM (both decoded by the browser and accepted after strict checking); −1, −0 (accepted as 0),
  1e9+1, 1e308, 2.5, 1.0 (accepted), dailyGoal 4; markup and control characters and 100 000 characters in `exportedAt` (date
  ignored, nothing shown); markup as a day, app name; 33-character id; duplicate keys; wrong inner types; 3 000 lessons and 5 000
  card ids; newer schema in the envelope or the document; `"1"` as schema. Each: the right fixed message (or a clean preview),
  stored record unchanged, no injected element, nothing from the file on screen, `Object.prototype` clean. Plus the 1 000 000 /
  1 000 001 byte boundary, a hostile file name, and a valid backup with `__proto__` keys restored for real (no prototype key stored).
- Hostile stored data (written inside the page so `__proto__` survives): repaired in memory without pollution and **not
  rewritten on load**; 60 000-entry arrays and wrong types repaired; newer schema / string / list → broken screen, record
  unchanged after Cancel; a rev that goes backwards is built on (the other copy's XP kept).
- Routes (18 more): double-encoded, `%00`, CRLF, full-width digit, RTL mark, `javascript:`, `data:`, `#/lesson/cp-a`,
  `#/checkpoint/u2-l1`, `constructor`/`__proto__` checkpoints, dot segments, 120 000-character hash: all settle on `#/`.
- CSP: the policy equals SPEC 7.9 line by line and is the first element of `<head>`; refused: `fetch` and XHR to another
  origin, a remote script, a remote image, an inline `<style>`, a `<base>` to another site (plus the existing setTimeout string,
  inline handler and inline script). `eval`/`new Function` can't be tested from Playwright: code it evaluates is exempt from the
  page's CSP, like the console.
- Network: a full session (Welcome, a lesson, review, checkpoint cp-a, Progress, Settings, save a backup, restore it, Start
  over) makes no request outside the app's origin (context-level listener, exact origin compare).
- Service worker: offline cold start (reload with no network) shows the Path and Progress.
- Races: two tabs finishing lessons at once both keep their result; a restore in one tab while a lesson is open in another
  (the lesson lands on top of the restored progress); a refused write (QuotaExceededError) keeps the lesson in memory, shows
  the error, and Try again saves it as rev 51; five taps on one answer and two on Continue never skip a question; the clock at
  23:59 on 31 December, then 1 January, then set back to June: three practice days recorded, XP correct.
- Framing: not re-proven here (the preview server answers on one host name only, so a second origin could not be served).
  The Sonnet finding stands: another site can frame the app. Options are in the PR comment for the owner.

### Not done or not testable here
- Real phones (iPhone sound, touch, home-screen install, Android), the ErrorBoundary crash screen, and mascot moods (as before).

## 2026-10-14: PR #20 review items 1–3 (Sonnet session, branch `claude/youthful-clarke-vn24qu`)
- **Item 1 (lost database connection).** Cause: `ProgressStore` kept one IndexedDB connection for the whole run; after a failed write it kept the same (possibly dead) one, so "Try again" failed the same way. Fix: `write()` opens a connection when it has none (`connect()`); any failed write that is not a `PlannerError` calls `dropHandle()` (close and forget); `openDb(name, onTerminated)` passes idb's `terminated()` callback so a dropped connection is forgotten at once. `load` still runs once. Tests (`store.test.ts`, "a lost database connection"): Try again after a dead connection saves; one reopen per attempt and the new connection is reused; a failing reopen keeps the change and the warning, then recovers; `load` after recovery does not reload. All three behaviour tests fail on the old code.
- **Item 2 (double tap).** Cause: two taps in one frame both read the same render's `phase`, so only the reducer ignored the second answer. Fix: `answeredIndex` ref in `LessonScreen`. New `e2e/double-tap.spec.ts` counts oscillators: five clicks must create the same number as one (old code: 10 versus 2; it fails without the fix).
- **Item 3 (files over ~300 lines), split with no logic change:** `synth.ts` → `tonePlans.ts`, `unlock.ts`; `store.ts` → `storeTypes.ts`, `storeChecks.ts` (`PlannerError`, `Planner`, `StoreDeps`, `StoreState` are still exported from `store.ts`); `lessonBuilder.ts` → `cardOrder.ts`; `SettingsScreen.tsx` → `ImportPreviewSheet.tsx`; `GalleryScreen.tsx` → `GalleryParts.tsx`. Only test import paths changed.
- Item 4 (ErrorBoundary has no automated test) stays as it is. Framing: owner chose (a), no change.
- Verified: `npm run verify` green after the last code edit (930 unit tests; 404 e2e passed, 20 skipped). Not verified: a real iPhone dropping its connection (fake handles that reject like `InvalidStateError` stand in for it). The "debug again" pass was the diff self-review and the screen screenshots run inside `verify`; no second clean-room install (`npm ci` was run at the start of this session on a fresh checkout).

## 2026-10-14: Course part 2 planned (units 12–25), Opus planning session
- Owner answered six questions (decisions in `docs/HANDOFF.md`, "Course part 2"): pitch first,
  then rhythm, then combined; range stays C2–C6; rhythm/tune questions are answered with buttons
  and the app plays rhythms and tunes (no tapping); three new jump-ahead checkpoints after units
  15, 19 and 22; plain words only (symbols ♯ ♭ ♮ shown and explained), no octave numbers;
  microphone/MIDI later; "go with the recommendations" for the rest.
- Wrote: `CURRICULUM.md` Part 2 (§6–§12: outline, 12 sign cards, mixes, rhythm/tune/stack
  libraries, units 12–25, concept cards, UI text), `SPEC.md` §8 (pitches, schema v2, music text
  and sounding-pitch rule, music drawing, black-key answers, 14 new question kinds, audio,
  curriculum types, builder, feedback, UI), `SCHEMA-V2.md` (data-model impact and tests),
  milestones `M8`–`M14`, README milestone table, `PROMPTS-PART2.md` (filled-in prompts).
- Gotcha: `content.test.ts` reads CURRICULUM §5 up to the next `## ` heading, so Part 2 must start
  with a `## ` heading (a `# ` heading made the test read Part 2 text as §5 and fail).
- Checked in this session: the 12 extra Bravura glyphs exist and extract with `fonttools==4.60.1`
  from a cloud session (bounds printed); the 14 new unit colours have white-text contrast 4.7–9.9;
  every melody box in CURRICULUM §9.2 and every rhythm pattern in §9.1 sums to its time, every
  sounding pitch (with box signs and home signs) is a card, and every note sits at staff position
  −2..10 (checked with a throwaway script: 0 problems; M9 adds the permanent data test).
- Not checked: nothing was built or run against the app; layout widths of two-box melodies on a
  320 px phone are an estimate (M9 visual QA decides, with a fallback written into SPEC §8.4).
- Key finding: `validate.ts` drops unknown card ids, so adding sharp/flat cards **requires**
  schema v2 even though no field changes (an older cached app would otherwise delete them).

## 2026-10-14: M8 executed (schema version 2 and the 12 sharp/flat cards), Sonnet session
- Built: `Sign`/`Pitch`/`pitchMidi`/`pitchName` (`notes.ts`); `NATURAL_CARDS` (34), `SIGN_CARDS` (12), `ALL_CARDS` (46), `parseCardId` → `{ clef, note, sign }`, `isSignCard`/`isNaturalCard`, `cardMidi` (`cards.ts`); `cardName` falls back to `pitchName` ("F♯"); schema v2 as `SCHEMA-V2.md` §3 (`CURRENT_SCHEMA_VERSION` 2, `UPGRADE_STEPS[1]`, validator, backup envelopes 1 and 2 accepted, ids lock +12); fixture `progress-v2.json` (hash in `fixtures.lock.json`; `progress-v1.json` untouched); curriculum types only (`LessonMaterial`, `render: 'rhythm'`, `unit` 1..25, `cp-d`…`cp-f`, no data). No screen changed.
- Callers: every part-1 use of `ALL_CARDS` now says `NATURAL_CARDS` (curriculum `cp-c` pool, Gallery, Progress chart, tests). Two part-1 rules had to learn about sign cards so part-1 behaviour stays identical: `buildReview` and `reviewAvailable` count/choose natural cards only (before, `buildReview` rebuilt ids with `cardId(clef, note)`, which would have silently turned `treble-F#4` into `treble-F4`). Part 2 (M10, SPEC 8.9) decides how reviews include sign cards.
- Tests changed because the spec says so: new documents are version 2 (`progress.test`, `backup.test` envelope, `validate.test` "fatal versions" now 0, 1, 3…), "v1 has no steps yet" became "the only step is v1 → v2", "newer" examples moved from 2 to 3, the v1 fixture's realistic-document test now goes through `upgradeToCurrent` (the store does the same), the store's v1 fixture test expects the same document with `schemaVersion: 2`. No fixture, no existing upgrade step edited (there was none). SCHEMA-V2 §5 tests 1–10 are named `test N:` in `upgrades.test.ts`, `validate.test.ts`, `backup.test.ts`, `store.test.ts`, `e2e/persistence.spec.ts`; test 11 is `check-safety`.
- Mutation checks (SCHEMA-V2 §6), all fail as expected, then restored: (1) step 1 removed → 10 unit tests fail (upgrades 7, store 2, backup 1); (2) step 1 drops `cards` → 8 fail; (3) `CURRENT_SCHEMA_VERSION` left at 1 → 45 fail, including the older-app simulation; (1b) same mutation with the e2e build → `test 9` in `e2e/persistence.spec.ts` fails (passes again once restored); (4) `progress-v1.json` edited → `check-safety` fails ("locked fixture was changed").
- Gotcha: a mutation restored with `git checkout -- <file>` also throws away uncommitted real edits to that file. Commit before running mutation checks (happened once here; the edit was re-applied at once).
- Verified at the end: clean-room `npm ci` then `npm run verify` green (953 unit tests; 406 e2e passed, 20 skipped, 0 failed). Two lint errors in my new tests were found by verify and fixed first. e2e tests that treated version 2 as "newer" now use 3; the two backup tests that compared with the v1 fixture now expect it as version 2 (the app holds it as v2 once loaded). Not verified: a real phone (nothing visible changed); the Opus review and `/security-review` are still to do.

## 2026-10-14: M8 Opus review (code review high, security review, schema checks)
- Checked: `progress-v1.json` byte-identical (hash unchanged), `ids.lock.json` only additions (+12, 0 removed), the only lines removed from `upgrades.ts` are the empty `{}` map and its comment (no step existed before); v2 fixture matches SCHEMA-V2 §4 and contains every v1 card and lesson unchanged; every test changed from version 1 to 2 (or 2 to 3 for "newer") was changed because SPEC §4.7/§8.2 say so; the list is in the PR review comment.
- Small fixes by the reviewer: `isSignCard` is exact (it was true for junk strings), `cardMidi` throws on an unknown id (it answered MIDI 0), a test used a hand-written regex instead of `isNaturalCard`, HANDOFF said schema v1 is current. New tests: junk ids; `buildReview`/`reviewAvailable` with the v2 fixture's sign cards; `store.olderApp.test.ts` (an app version from before M8, simulated by an upgrade table that stops at 1, refuses v2 data and writes nothing); store test 8d (an open tab cannot overwrite a newer save).
- Larger items are a numbered list in the PR for a Sonnet fix session.
- Owner decision applied (same review): newer-version data → broken screen with "Reload the app" only; `startFresh` throws `MSG_NEWER_NO_RESET` for it (pre-check and inside the transaction); unit tests in `store.test.ts` (`startFresh`), e2e in `attack.spec.ts`. SPEC 7.2 updated. Review item 1 is done; items 2–4 remain.

## 2026-10-14: M8 review items 2 and 4 (Sonnet fix session)
- Item 2: four places dropped a sign card's sign. Fixed with a failing test first for each: `shownCard` (exported for the test; returns a sign card unchanged), `chartName` (uses `pitchName`), `hintFor` (null), `cardParts` (throws "Question not supported for sign card … until M10 (SPEC 8.6)", so name-note, find-key and find-on-staff cannot silently use the white key).
- Item 4: `SIGN_CARDS`, `SignCardId` and the lookup come from one `SIGN_TABLE` in `cards.ts`; no position-based parsing, no `as Note`. `ids.lock.json` untouched.
- Item 3 left for M10/M11: added as step 9 in both milestone files.
- Gotcha: `shownCard` computed the nearest position before checking the sign, so the `cardParts` throw would have hit it first; the sign check must come before.

## 2026-10-16: M9 executed (drawing music, black keys), Sonnet session
- Built: 12 new Bravura glyphs (`tools/glyphs/extract.py` → `glyphs.ts`); `domain/music.ts` (types, `beatsOf`, `parseRhythm`, `parseMusic`, `soundingPitch`, `soundingCard`, `eventBeats`, `HOME_SIGN_LETTERS`); `domain/library.ts` (CURRICULUM §9 transcribed: 41 rhythm patterns, event sets, 56 tunes, 14 stacks); `notation/musicGeometry.ts` (pure), `musicDraw.ts` (what the component draws + adapters) and `Music.tsx`; Keyboard black keys report `{ black: midi }`; Gallery "Part 2" section; e2e `gallery-part2.spec.ts` and part-2 screenshots in `screens.spec.ts` (390 and 320 px, light and dark, 15 blocks each).
- Choices the documents did not cover (owner may veto; all visible in the Gallery): header gap = 1.0 S after the last header item; clef → home sign gap 0.8 S, home signs 1.0 S apart, time digits 2 S wide with 0.5 S before; `x(box, beat)` is the head's **centre**; rest glyphs are centred on that x; marker triangle is 1.2 S wide, 1.0 S tall, apex 1.5 S above the top line or 1 S above a higher head (rhythm staff: 0.3 S above the stem); the empty slot is centred on the middle line (rhythm: on the line); the last bar line is a plain line; `parseMusic` also rejects notes outside staff positions −6..14 (cannot be drawn); `soundingPitch` has an optional fifth argument `noteIndex` for stacks (the spec's signature has none); stack ids `st-C4`, `sb-F2`, `sh-C4`; the SPEC 8.4 "break onto a second row" fallback is built (`planRows`, rows share one width so staff spaces match; the Gallery proves ≥ 9 px at 320 px).
- Black keys: aria names "F♯ / G♭" etc. replace "Black key" (SPEC 8.5). Two existing e2e locators (`gallery.spec.ts`, `curriculum.spec.ts`) looked for the old name; only the locator changed, not what is asserted. The part-1 rule (a black key is wrong) is unchanged: `pressedNote()` maps `{black}` back to `'black'`.
- Gotchas: (1) in the first Gallery draft, stacks and single events sat in a 2-column grid and dropped to 6.6 px staff spaces; the 9 px e2e check caught it, they are now one column. (2) `react-hooks/immutability` forbids reassigning a counter inside render, so row starts are computed with a reduce.
- Look items for the owner (screenshots): sign-to-previous-note gap is only about 0.1 S (the SPEC grid numbers); the half-beat pair's two heads nearly touch (13 units apart, heads 11.8 wide); rhythm patterns with few boxes are scaled very large because the music view is `width: 100%` (a later milestone may cap it).

## 2026-10-16: M9 Opus review (PR #27)
- Checked: every M9 step; every melody of CURRICULUM §9.2 compared with `library.ts` by script (56/56 identical), rhythm patterns and stacks by eye; the sounding-pitch table in `music.test.ts` re-derived by hand for all of MS, MF, MK, MN; screenshots of t1, s1, kd1, h1, h6 and every RE pattern checked note by note against SPEC 8.4 (positions, stems, dots, ledger lines, home-sign positions, grand alignment all correct).
- Fixed in the review: the rhythm picture was 70 high, which cut off the bottom time digit (now 80; SPEC 8.4 updated, test that both digits fit); a marked whole note on the rhythm line had its marker inside the head; a marked stack drew one marker per note (now one, over the top note: `markerIndex`, tested); `drawBeats` re-used `beatsOf` instead of a second table; aria label says "two boxes" (SPEC wording) instead of "2 boxes".
- Left for the owner and a Sonnet fix session (PR #27 comment): the SPEC grid (2.6 S per beat) puts a printed sign almost on the previous note's stem and makes half-beat heads touch; black-key labels are about 6 px on a two-octave keyboard; one-box rhythm pictures are very large.

### M9 review items 1 and 2 (Sonnet fix session, 2026-10-16)
- Item 1 (owner chose (a)): `BEAT_WIDTH` 2.6 S → 3.0 S; SPEC 8.4 and the geometry tests follow (one hard-coded half-beat distance, 13 → 15, changed because the spec value changed). New tests: a sign keeps ≥ 0.4 S clear of the 1-beat head before it; half-beat heads and the head after a pair keep ≥ 0.25 S.
- Item 2: `widthFraction` caps a one-box picture at the size of a two-box 4-beat picture, centred.
- Gotcha: the first version of the cap measured the width on the element it was capping, so every resize shrank it again (the keyboard buttons were never "stable" in e2e). The measured holder and the capped box are now separate elements.
- Screenshots in `docs/build/m9-screenshots/` re-taken (390 px, light).

