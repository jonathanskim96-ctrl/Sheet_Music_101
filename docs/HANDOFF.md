# Handoff: current state

_Read this first in every new session. Keep it short and current._

## Where we are
- **Phase:** M1 (scaffold, guardrails, CI, deploy) **merged and live**; M1 review fixes merged (PR #3). **M2 (domain core: pure logic + tests) is built and in a pull request; Opus review done (2026-10-13), small fixes pushed, ready to merge once CI is green.** No screen changed in M2, so the live app looks the same. Next: Opus review of M2, then **M3** (`docs/build/M3.md`).
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

### Gaps the spec left open in M2, with the Opus review verdict (2026-10-13)
"Confirmed" = the code stays as it is. "Owner" = a product choice the owner should make; the code
keeps the recommended option until the owner says otherwise.
| Topic | What the code does | Review verdict |
|---|---|---|
| `Progress.cards` type | `Partial<Record<CardId, CardState>>`: only cards the learner has met are stored. | **Confirmed.** Technical; the SPEC's `Record` would force all 34 keys. |
| Lesson builder cap | On top of SPEC 4.12's per-card cap, no card fills more than half the slots, and if the spec's swap-repair leaves a repeat, the order is rebuilt. Kinds are chosen after ordering. | **Confirmed.** SPEC 4.12 contradicts itself here: its cap (7 of 10 for a two-card pool such as u2-l1) makes "no two in a row" impossible, which STANDARDS §3 requires. Half the slots is the smallest change that keeps both. |
| Review with few cards | Fewer than 5 due: each due card twice, then non-due lowest box first; if still under 10, cards repeat in a cycle, shuffled with no equal neighbours. Fewer than 3 cards: `buildReview` throws (the Review button is hidden then). | **Confirmed.** Literal reading of SPEC 4.12; the cycle only covers a gap the spec didn't mention. |
| Concept cards on replay | Always shown again. | **Owner.** Recommended: keep showing them (they are 1–3 short cards and act as a refresher; SPEC only says Meet cards are skipped). Alternative: skip them on replays. |
| XP and daily goal | +10 for every finished session (including a failed checkpoint and a review), +5 perfect, +20 checkpoint passed. Reviews and checkpoints also count towards the daily goal and `totals.lessonsDone`. | **Confirmed** as the literal SPEC 4.14 rule (the +10 and the daily-goal count are unconditional there). Owner may veto: alternative is "reviews and checkpoints don't count towards the daily goal". |
| Wrong-answer wording | Choice answers read "a line", "a space", "the first note", "the second note", "the treble clef", "the bass clef", "step up", … | **Confirmed.** Follows the CURRICULUM §5 pattern ("a line", "the second note", "step up"). |
| Concept card pictures | `content.ts` describes each picture as plain data; M3 draws them. | **Confirmed.** |
| `validate` | Lesson ids may be `constructor` (the SPEC was wrong that the pattern excludes it); harmless because every lookup uses `Object.hasOwn`, and tested. Repair with an unreadable `createdDay` and no other date in the document → `null` ("broken data" screen) rather than an invented date. | **Confirmed.** Review fix: strict mode now keeps checking after a bad `createdDay`, so every issue is listed (SPEC 4.7). |
| Backup | A malformed `exportedAt` is ignored (no date in the preview) instead of rejecting the backup; the summary's lesson count excludes checkpoint records. Not JSON / wrong app → "isn't a Sheet Music 101 backup"; right app, bad contents → "damaged". | **Confirmed.** Review fix: impossible dates such as 30 February are now treated as malformed (they used to roll forward to 2 March), and the three error texts come from `content.ts` only. |
| Landmark hint | (Found in review.) The code returned no hint for any landmark card, even one not learned yet. | **Changed** to the SPEC 4.16 wording: no hint only when the card is itself the nearest learned landmark. Example: a wrong answer on Treble C in u2-l2 now says "It's 3 steps above Treble G." |
| Fixture | `progress-v1.json` is synthetic: 12 cards, 9 days, 135 XP as M2 asked (12 cards can't be reached exactly on the real path, and the XP is lower than its lesson records imply). | **Confirmed.** Validation doesn't check consistency between fields, and the fixture's job is to prove old saves keep loading. |
| Day roll-over | (Found in review.) If the device clock goes backwards past midnight, the next finished lesson starts the daily count again for the earlier date. | **Confirmed, no change.** Rare, harmless (only the daily goal ring), and SPEC 4.14 says "roll over" without a direction. |

## Waiting on the owner
- [x] Make the repository public (done).
- [x] Set `main` as the default branch (done).
- [x] GitHub Pages source = GitHub Actions (done); M1 PR merged; CI `verify` and `deploy` both green on `main`.
- [x] Owner opened the live URL and saw the page.
- [ ] Protect `main` (`docs/SETUP.md` section 3).
- [ ] Add the app to the home screen on each phone (SETUP sections 6–7) and confirm the icon.

## Next step
1. Owner: answer the two "Owner" rows in the table above (or accept the recommendations).
2. Merge the M2 pull request once CI is green (`docs/SETUP.md` §4), then M3 with the execution prompt.

## How to run checks
`npm ci`, then `npm run verify` (check-safety, typecheck, lint, format, unit tests, build,
check-dist, e2e). Adding a package: `npx -y npm@11.6.2 install -E <pkg>@<version>` (SPEC §2).
Never run `npx playwright install` in a cloud session.

## Blocked
(nothing)
