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
