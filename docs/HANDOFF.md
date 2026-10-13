# Handoff: current state

_Read this first in every new session. Keep it short and current._

## Where we are
- **Phase:** M1 (scaffold, guardrails, CI, deploy) **merged and live**; M1 review fixes merged (PR #3). **M2 (domain core: pure logic + tests) merged** (PR #4, 2026-10-13, after the Opus review and its fixes). No screen changed in M2, so the live app looks the same. **M3 (look, sound, notation, Gallery) merged** (PR #6, 2026-10-13; owner approved the look). The Opus review fixes and the taller keyboard came after that merge and go in through their own PR (branch `claude/tender-bohr-dsybzk`). **M4 (saving + first playable lessons, units 1–4) merged** (PR #9, 2026-10-13; it also carries the stacked-Sheets fix, so PR #8 is redundant and can be closed). The Opus review of M4 came after the merge: small fixes are in a follow-up PR (branch `claude/review-m4-pull-request-1kg4g2`), and the larger items are listed in that PR for a Sonnet fix session. **Schema version 1 is now frozen**: once M4 is merged real progress exists on the owner's phone, so any change to `Progress` needs a schema bump and an upgrade step (SPEC 4.8).
- Repo: `jonathanskim96-ctrl/Sheet_Music_101`. App name: **Sheet Music 101**.
- Live URL (live; deployed from `main` by CI): https://jonathanskim96-ctrl.github.io/Sheet_Music_101/
- How the build works: `docs/build/README.md` (milestones, session prompts, owner steps).

## Decisions made
| Date | Decision |
|---|---|
| 2026-10-12 | PWA for one or two people; no sharing, no social features. |
| 2026-10-12 | Teaches treble and bass clef for piano. |
| 2026-10-12 | Duolingo-style: units, lessons, levels, progress markers. |
| 2026-10-12 | Easy difficulty; sustainable learning over condensed learning. |
| 2026-10-12 | Opus 5.5 for planning and reviews, Sonnet 5.5 for execution. |
| 2026-10-12 | Follow `docs/APP_BUILD_PLAYBOOK.md` for process and safety rules. |
| 2026-10-12 | Progress stored on each device (IndexedDB), no backend/accounts; export/import backup file. |
| 2026-10-12 | **No streak.** Show total days practised and XP instead. |
| 2026-10-12 | **No hearts/lives.** Mistakes are explained and repeated, never block. |
| 2026-10-12 | Answer with A–G letter buttons first; on-screen piano keyboard unlocks after Unit 4. |
| 2026-10-12 | Two learners use separate phones (no profiles). |
| 2026-10-12 | Sound on by default, with mute. |
| 2026-10-12 | Bright, colourful, entertaining style; mascot "Quaver". |
| 2026-10-12 | Planner decisions (owner may veto): whole notes only, naturals only, range C2–C6; landmark teaching method; Leitner spaced repetition; leaving a lesson saves nothing; checkpoints let you jump ahead; no octave numbers shown to learners. |
| 2026-10-12 | Hosting: GitHub Pages; the repository will be made public (code only, no data). |
| 2026-10-13 | M1 review: the service worker never reloads the page by itself (SPEC §7.8 enforced in code); offline update-check failures are only logged. |
| 2026-10-13 | Keyboard keys taller than real proportions (white 1 × 5.8, black 0.6 × 3.6) so a two-octave keyboard is ≈ 150px tall on a phone and easier to tap (SPEC 7.4 updated; M3 review option b). |
| 2026-10-13 | M2 gaps: concept cards show again on lesson replays; reviews and checkpoints count towards the daily goal (and earn +10 XP even when a checkpoint is failed). |
| 2026-10-12 | Tech: versions in `docs/build/SPEC.md` §2 were verified to install, build and test together (with npm 11 for installs; npm 10 has a resolver bug). |

### Gaps the spec left open in M2, with the Opus review verdict (2026-10-13)
"Confirmed" = the code stays as it is. "Owner" = a product choice the owner should make; the code
keeps the recommended option until the owner says otherwise.
| Topic | What the code does | Review verdict |
|---|---|---|
| `Progress.cards` type | `Partial<Record<CardId, CardState>>`: only cards the learner has met are stored. | **Confirmed.** Technical; the SPEC's `Record` would force all 34 keys. |
| Lesson builder cap | On top of SPEC 4.12's per-card cap, no card fills more than half the slots, and if the spec's swap-repair leaves a repeat, the order is rebuilt. Kinds are chosen after ordering. | **Confirmed.** SPEC 4.12 contradicts itself here: its cap (7 of 10 for a two-card pool such as u2-l1) makes "no two in a row" impossible, which STANDARDS §3 requires. Half the slots is the smallest change that keeps both. |
| Review with few cards | Fewer than 5 due: each due card twice, then non-due lowest box first; if still under 10, cards repeat in a cycle, shuffled with no equal neighbours. Fewer than 3 cards: `buildReview` throws (the Review button is hidden then). | **Confirmed.** Literal reading of SPEC 4.12; the cycle only covers a gap the spec didn't mention. |
| Concept cards on replay | Always shown again. | **Owner decided (2026-10-13): keep showing them on replays.** |
| XP and daily goal | +10 for every finished session (including a failed checkpoint and a review), +5 perfect, +20 checkpoint passed. Reviews and checkpoints also count towards the daily goal and `totals.lessonsDone`. | **Confirmed** as the literal SPEC 4.14 rule (the +10 and the daily-goal count are unconditional there). **Owner decided (2026-10-13): reviews and checkpoints count towards the daily goal.** |
| Wrong-answer wording | Choice answers read "a line", "a space", "the first note", "the second note", "the treble clef", "the bass clef", "step up", … | **Confirmed.** Follows the CURRICULUM §5 pattern ("a line", "the second note", "step up"). |
| Concept card pictures | `content.ts` describes each picture as plain data; M3 draws them. | **Confirmed.** |
| `validate` | Lesson ids may be `constructor` (the SPEC was wrong that the pattern excludes it); harmless because every lookup uses `Object.hasOwn`, and tested. Repair with an unreadable `createdDay` and no other date in the document → `null` ("broken data" screen) rather than an invented date. | **Confirmed.** Review fix: strict mode now keeps checking after a bad `createdDay`, so every issue is listed (SPEC 4.7). |
| Backup | A malformed `exportedAt` is ignored (no date in the preview) instead of rejecting the backup; the summary's lesson count excludes checkpoint records. Not JSON / wrong app → "isn't a Sheet Music 101 backup"; right app, bad contents → "damaged". | **Confirmed.** Review fix: impossible dates such as 30 February are now treated as malformed (they used to roll forward to 2 March), and the three error texts come from `content.ts` only. |
| Landmark hint | (Found in review.) The code returned no hint for any landmark card, even one not learned yet. | **Changed** to the SPEC 4.16 wording: no hint only when the card is itself the nearest learned landmark. Example: a wrong answer on Treble C in u2-l2 now says "It's 3 steps above Treble G." |
| Fixture | `progress-v1.json` is synthetic: 12 cards, 9 days, 135 XP as M2 asked (12 cards can't be reached exactly on the real path, and the XP is lower than its lesson records imply). | **Confirmed.** Validation doesn't check consistency between fields, and the fixture's job is to prove old saves keep loading. |
| Day roll-over | (Found in review.) If the device clock goes backwards past midnight, the next finished lesson starts the daily count again for the earlier date. | **Confirmed, no change.** Rare, harmless (only the daily goal ring), and SPEC 4.14 says "roll over" without a direction. |

## Owner preferences
- Whenever a review, fix or execution session is next, give the owner the full prompt as a ready-to-copy block with the milestone number filled in (from `docs/build/README.md`).

## Waiting on the owner
- [x] Make the repository public (done).
- [x] Set `main` as the default branch (done).
- [x] GitHub Pages source = GitHub Actions (done); M1 PR merged; CI `verify` and `deploy` both green on `main`.
- [x] Owner opened the live URL and saw the page.
- [ ] Protect `main` (`docs/SETUP.md` section 3).
- [ ] Add the app to the home screen on each phone (SETUP sections 6–7) and confirm the icon.

## Next step
1. Owner: merge the M4 review follow-up PR (branch `claude/review-m4-pull-request-1kg4g2`) once CI is green; close PR #8 (already in `main`). Open the live app on the phone, play a few lessons, close it and reopen it (progress should be kept).
2. Sonnet fix session for the numbered items in that PR (or fold them into M5, which builds the broken-data screen anyway).
3. M5 with the execution prompt in `docs/build/README.md`.

### M4 choices the spec left open (owner may veto)
- Path shows only units 1–4 (the playable ones) and a line "More units are coming soon." under them. A temporary `MAX_UNIT_M4 = 4` gate lives in `domain/unlocks.ts` as `isPlayable` / `currentPlayableLesson` (the domain's own `isAvailable` is unchanged, so the M2 tests still describe the whole course). M6 removes it (TODO comment in the code).
- Progress and Settings are "Coming soon" screens; `#/review` and `#/checkpoint/*` go home until M6.
- A thin warning banner for "browser won't save" and "save failed, Try again" is shown at the top of every screen already (needed by the M4 e2e test); M5 may restyle it as the Path cards.
- If saved data can't be read, a minimal screen says so with "Try again" (it never touches the data); M5 builds the full broken-data screen.
- The A–G letter pad reads A B C D E F G (not C–B). The "alphabet" question shows the letter in a big card.
- The correct-answer feedback bar shows a check mark (SPEC 7.2); SPEC 7.1 also mentions a mascot bounce on correct, which is not shown. Quaver appears on wrong answers and on completion.
- The lesson header (X, bar, combo, sound) is hidden on the completion screen.
- Concept cards: black keys alternate green (groups of 2) and orange (groups of 3); staff pictures gained optional line numbers and note labels.
- First visit to any route other than the Gallery shows the Welcome screen until "Let's start".
- An invalid write planner (a bug) raises an error toast and saves nothing; a failed disk write keeps the change in memory and retries together with the next change.

### M3 choices the spec left open (owner may veto)
- Staffs with 3+ notes (not in the spec; only used by the Gallery and later the Progress chart) space notes 3.5 staff spaces apart and widen the viewBox to fit.
- Fanfare note lengths 200 ms (last 600 ms) and peak 0.15 were not specified; the correct/wrong sounds follow SPEC 7.7 exactly.
- The danger button is a light-orange fill with orange edge and dark-orange text (white on the bright orange token fails contrast).
- The Gallery also has small extra sections (tappable staff, no-clef staff, highlighted lines, progress bar, goal ring, Sheet demo) so every M3 building block can be checked.
- Gallery code is lazy-loaded and absent from production builds (checked: `dist/` has no Gallery chunk).

## How to run checks
`npm ci`, then `npm run verify` (check-safety, typecheck, lint, format, unit tests, build,
check-dist, e2e). Adding a package: `npx -y npm@11.6.2 install -E <pkg>@<version>` (SPEC §2).
Never run `npx playwright install` in a cloud session.

## Blocked
(nothing)
