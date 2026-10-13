# Handoff: current state

_Read this first in every new session. Keep it short and current._

## Where we are
- **Phase:** M1 (scaffold, guardrails, CI, deploy) **merged and live**; M1 review fixes merged (PR #3). **M2 (domain core: pure logic + tests) is built and in a pull request, waiting for the Opus review.** No screen changed in M2, so the live app looks the same. Next: Opus review of M2, then **M3** (`docs/build/M3.md`).
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
| 2026-10-12 | Tech: versions in `docs/build/SPEC.md` §2 were verified to install, build and test together (with npm 11 for installs; npm 10 has a resolver bug). |

### Gaps the spec left open, filled with the smallest literal reading in M2 (for the Opus review to confirm or change)
| Topic | What the code does |
|---|---|
| `Progress.cards` type | `Partial<Record<CardId, CardState>>` (the spec wrote `Record<…>`, which would force all 70 possible keys). Only cards the learner has met are stored. |
| Lesson builder cap | On top of SPEC 4.12's per-card cap, no card fills more than half the slots, so a no-neighbours-equal order always exists (the STANDARDS property needs it). Kinds are assigned after the order is fixed so "first slot of a new card is name-note" holds in the order the learner sees. |
| Review with few cards | Fewer than 5 due: each due card twice, then non-due lowest box first; if still under 10, the same cards repeat in a cycle. Order is shuffled with no equal neighbours. Fewer than 3 learned cards: `buildReview` throws (the Review button is hidden then). |
| Concept cards on replay | Always shown again (SPEC only says Meet cards are skipped on replays). |
| XP | +10 for every finished session (including a failed checkpoint and a review), +5 perfect, +20 checkpoint passed. Reviews and checkpoints also count towards `today.lessonsDone` and `totals.lessonsDone`. |
| Wrong-answer wording | Choice answers read "a line", "a space", "the first note", "the second note", "the treble clef", "the bass clef", "step up", … (CURRICULUM gives three of these as examples). |
| Concept card pictures | `content.ts` describes each picture as plain data (staff + notes, keyboard, letters); M3 decides how to draw them. |
| `validate` | The lesson-id pattern does allow the word `constructor` (SPEC said it can't); this is harmless because every lookup uses own-property checks (`Object.hasOwn`). In repair mode, if `createdDay` is unreadable and the document holds no other valid date anywhere, the result is `null` (the app would show the "broken data" screen) instead of inventing a date. |
| Backup | A malformed `exportedAt` is ignored (summary shows no date) instead of rejecting the whole backup; "lessons" in the summary excludes checkpoint records. Not JSON / wrong app → "isn't a Sheet Music 101 backup"; right app but bad contents → "damaged". |
| Fixture | `progress-v1.json` is synthetic: it has the 12 cards, 9 days, 135 XP the plan asked for (so it is not a perfectly realistic path through the course). |

## Waiting on the owner
- [x] Make the repository public (done).
- [x] Set `main` as the default branch (done).
- [x] GitHub Pages source = GitHub Actions (done); M1 PR merged; CI `verify` and `deploy` both green on `main`.
- [x] Owner opened the live URL and saw the page.
- [ ] Protect `main` (`docs/SETUP.md` section 3).
- [ ] Add the app to the home screen on each phone (SETUP sections 6–7) and confirm the icon.

## Next step
1. Opus review of the M2 pull request (review prompt in `docs/build/README.md`); confirm or change the table above.
2. Merge it (`docs/SETUP.md` §4), then M3 with the execution prompt.

## How to run checks
`npm ci`, then `npm run verify` (check-safety, typecheck, lint, format, unit tests, build,
check-dist, e2e). Adding a package: `npx -y npm@11.6.2 install -E <pkg>@<version>` (SPEC §2).
Never run `npx playwright install` in a cloud session.

## Blocked
(nothing)
