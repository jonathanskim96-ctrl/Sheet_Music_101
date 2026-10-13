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
