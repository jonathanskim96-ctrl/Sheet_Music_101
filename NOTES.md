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
