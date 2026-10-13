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
