# Engineering standards, debugging protocol and security checks

Applies to every execution session. `CLAUDE.md` rules come first; this file explains how.

---

## 1. The check chain

One command runs everything a push needs (defined in M1):

```
npm run verify
```
= `check:safety → typecheck → lint → format:check → test → build → check:dist → build:e2e → e2e`

Plus, whenever `package.json` changed: `npm audit --omit=dev --audit-level=moderate` must
report 0, and `npm audit` (all deps) is reported to the owner even if only dev deps are flagged.

**Rule:** never push, and never say "done", unless `npm run verify` passed **in this
session, after your last edit**. Paste the tail of the output in your report.

---

## 2. Coding standards

### TypeScript
- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`.
- No `any` (lint: `strictTypeChecked`). No `as` casts on untrusted data; narrow with type
  guards instead. No non-null `!` except the documented `window.top!` in frame-busting.
- Prefer `type` unions + exhaustive `switch` with a `never` check for `Question`, `Answer`,
  `Phase`, `StoreState`.
- Named exports only (no default exports), except where a tool requires one (config files).
- Files ≤ ~300 lines; split by responsibility when they grow.

### Purity and layering
- `src/domain/**`: pure functions. No React, DOM, `idb`, `Date` construction without an
  argument, `Date.now`, `Math.random`, `console`. Lint enforces this (M1).
- Inputs are never mutated. Tests deep-freeze inputs to planners/reducers.
- `src/data/store.ts` is the only writer. Screens call `commit(planner)` via the context.

### React
- Function components + hooks only. `react-hooks` lint rules must pass (no disabled rules).
- No `dangerouslySetInnerHTML`, no refs used to set `innerHTML`, no `eval`/`new Function`.
- Text only through JSX text nodes. No URLs built from data.
- Keys in lists are stable ids, never array indexes for reorderable lists.
- Every interactive element is a real `<button>` (or has `role="button"`, `tabIndex=0` and
  Enter/Space handling for SVG keys/staff bands) with an accessible name.
- Tap targets ≥ 44×44 CSS px (except staff tap bands, which are compensated by ▲/▼ buttons).

### CSS
- Colours only via tokens in `styles/tokens.css`. CSS modules for component styles.
- No inline `<style>` tags. React `style={{…}}` only for dynamic values (confetti position,
  progress bar width, path zig-zag offsets).

### Comments and naming
- Comments explain *why*, not *what*. Every domain function has a one-line doc comment.
- Names from the spec (`Progress`, `CardState`, `planCompleteSession`…) are used exactly.

### Git
- Small commits with clear messages ("Add staff geometry and tests"). One milestone per branch/PR.
- Never commit: `dist/`, `dist-e2e/`, `test-results/`, `playwright-report/`, `.env*`
  (except `.env.example`), backup JSON files, screenshots outside `docs/`.
- Never force-push, rebase published commits, or delete branches/tags.

---

## 3. Testing standards

### Unit tests (vitest), next to the code as `*.test.ts`
- Every exported domain function has tests: normal cases, edges, and invalid inputs.
- **Property tests (fast-check)** are required for: `notes` round-trips (`noteFromDiatonic ∘
  diatonicIndex`, `noteAtPosition ∘ staffPosition`), `days` (`daysBetween` across DST and
  year ends, any two valid dates), `srs` (box always 1..5, `correct ≤ seen`), `lessonBuilder`
  (for every lesson × 200 seeds × random progress: question count exact, every card in pool,
  new cards appear ≥ 3 times, first slot of each new card is name-note at level 1, no
  consecutive duplicates when pool ≥ 2, every question answerable by `correctAnswerOf`),
  `session` (random answer sequences: always reaches `complete`, retries only once per
  question, `firstAttempts.length === questionCount`, accuracy in 0..100),
  `planners` (output always passes `checkProgress(strict)`; xp never decreases), and
  `checkProgress` (**fuzz**: arbitrary JSON values, including `__proto__` keys, huge numbers,
  floats like 3.7 where integers are required, negative numbers, wrong types, deep nesting,
  10 000-entry arrays; strict never throws, never returns invalid progress; repair output always
  passes strict).
- Data layer tests run against `fake-indexeddb` (`import 'fake-indexeddb/auto'`), with a fresh
  database name per test.
- No snapshot tests. No tests that depend on the real clock or `Math.random`.

### E2E tests (Playwright), in `e2e/`
- Run against the **production-like e2e build** (`dist-e2e`, CSP included) via `vite preview`.
- Projects: `phone` (390×844, `isMobile`, `hasTouch`, DPR 2) and `desktop` (1280×800).
- Every test also asserts **no console errors** and **no CSP violations** (shared fixture).
- Use `data-answer` (e2e builds only) to answer correctly/incorrectly; `page.clock` to control dates.
- `retries: 0`. A flaky test is a bug to fix, not to retry.
- Never run `npx playwright install` in a cloud session (Chromium is pre-installed). CI installs it.

### Mutation checks (M7, and whenever a guardrail is added)
For each guardrail: break it on purpose, run the relevant tests, confirm they **fail**, then
restore with `git checkout -- <file>` and confirm they pass again. Record the results in
`NOTES.md`. If nothing fails, a test is missing: add it. List in M7.

---

## 4. Debugging protocol

When anything fails (test, build, lint, e2e, CI, or behaviour the owner reports):

1. **Read the whole error.** Copy the exact message into your notes. Identify the first
   failure, not the last.
2. **Reproduce** it with the narrowest command (`npx vitest run src/domain/srs.test.ts`,
   `npx playwright test e2e/lesson.spec.ts --project=phone`).
3. **Write or find a failing test** that captures the bug *before* changing code (for UI
   bugs, an e2e test or a domain test of the underlying logic).
4. **Find the root cause.** Form one hypothesis, check it (add a temporary log, inspect a
   value, read the relevant spec section). "Flaky", "timing" or "environment" is not a root
   cause until proven.
5. **Fix the code, not the test.** A test may only change if the spec says the expected
   behaviour is different. If you believe the spec is wrong: stop and ask.
6. **Confirm:** the narrow command passes, then the full `npm run verify`.
7. **Remove temporary logs.** Lint bans `console.log`.
8. **Record** non-obvious bugs and their cause in `NOTES.md` ("Gotchas").

**Stop rule:** if two fix attempts for the same failure have not worked, stop. Write what you
tried and what you saw in `docs/HANDOFF.md` under "Blocked", commit (without pushing broken
code to main), and ask the owner to start a planning (Opus) session.

Useful tools:
- `npx playwright test --project=phone --trace=on` then inspect `test-results/**/trace.zip`
  with `npx playwright show-trace` (or read the error-context file it writes).
- Screenshots: `await page.screenshot({ path: 'test-results/debug.png' })`, then view the PNG.
- Stop a stuck server with `fuser -k 4173/tcp` (never `pkill -f`, which can kill your own shell).

## 5. "Debug again": the second pass before a milestone is done

After `verify` is green, do all of these. Fixing anything restarts the pass.

1. **Clean-room run:** `rm -rf node_modules dist dist-e2e && npm ci && npm run verify`.
2. **Self-review the diff** (`git diff main...HEAD`), file by file, against the milestone
   checklist and SPEC. Look for: unhandled promise rejections, swallowed errors, missing
   `await`, state updates after unmount, off-by-one in ranges, any mutation of inputs,
   anything reading `Date`/`Math.random` in domain, missing tests for a branch.
3. **Visual QA:** run `npx playwright test e2e/screens.spec.ts` (from M3 on). It saves
   screenshots of every screen in phone light and dark mode to `test-results/screens/`.
   **Open every image** and check against the visual checklist (§7). Fix anything off.
4. **Edge pass:** for each new feature, try: empty progress, completely finished progress,
   offline (`context.setOffline(true)`), reload in the middle, double-tap, very narrow screen
   (320px), dark mode, reduced motion.
5. Update `docs/HANDOFF.md` and `NOTES.md`.

---

## 6. Security checklist (every PR; re-check the diff before pushing)

- [ ] `npm run check:safety` passes: no banned APIs (`innerHTML`, `outerHTML`,
      `insertAdjacentHTML`, `dangerouslySetInnerHTML`, `eval`, `new Function`,
      `document.write`, `alert/confirm/prompt`, `localStorage`/`sessionStorage`), no
      secret-shaped values (Supabase secret keys, JWTs, Google OAuth secrets, private keys, AWS
      keys, GitHub tokens), fixtures unchanged.
- [ ] `npm run check:dist` passes: CSP meta present, no `data-answer` in production, no source maps,
      no `http://` URLs, manifest and service worker present.
- [ ] Untrusted input (IndexedDB contents, imported files) only goes through
      `upgradeToCurrent` + `checkProgress`. Imported text is never displayed.
- [ ] No new runtime network requests. No third-party scripts, fonts or CDNs.
- [ ] New dependency? Only well-known packages, exact version ≥ 2 weeks old, `npm audit` clean,
      added with `npx -y npm@11.6.2 install -E`. Mention it in the PR.
- [ ] CI workflow: top-level `permissions: contents: read`; only the deploy job gets
      `pages: write` + `id-token: write`; actions pinned to commit SHAs; no `${{ }}` inside `run:`
      (use `env:`); `persist-credentials: false` on checkout.
- [ ] Destructive actions (reset, import replace) still need the in-app Sheet confirmation.
- [ ] Errors are visible in the UI.

---

## 7. Visual checklist (used in "debug again" step 3 and M7)

- Nothing overflows or scrolls sideways at 390px and 320px wide; bottom buttons clear the
  home-indicator safe area.
- Staff: clefs sit correctly (G clef curls around line 2, F clef dots around line 4); notes on
  the right line/space; ledger lines only where needed and centred on the note.
- Text contrast is readable in light **and** dark mode; the staff is always on white paper.
- Buttons look tappable (3D edge), pressed state visible, focus ring visible with a keyboard.
- Colours are bright and the screen feels playful (mascot visible on welcome, feedback,
  completion), but the question area is calm and uncluttered.
- Feedback bar never covers the note being explained.
- Confetti and animations absent with reduced motion.

---

## 8. Review passes (Opus sessions; the owner starts them)

At the end of each milestone, after the PR is open and CI is green:
1. **Code review:** an Opus session runs `/code-review high` on the PR and checks it against
   `SPEC.md` and the milestone file. Findings are fixed by a Sonnet session (or the same Opus
   session if small).
2. **Security review** (M1, M5 and M7 at least): an Opus session runs `/security-review`
   and the black-box attack list in M7.
3. The owner merges only when CI is green and both reviews are resolved.

---

## 9. Definition of done (every milestone)

- [ ] Every task in the milestone file is done exactly as written (or the deviation was
      approved by the owner and recorded in HANDOFF).
- [ ] `npm run verify` green locally (pasted), CI green on the PR.
- [ ] "Debug again" pass done (§5), including viewing the screenshots.
- [ ] Security checklist (§6) ticked in the PR description.
- [ ] `docs/HANDOFF.md` (state, next step, how to run checks) and `NOTES.md` updated.
- [ ] PR opened to `main` with: summary, checklist, what the owner can now try, anything not verified.
