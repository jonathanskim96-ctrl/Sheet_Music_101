# Handoff: current state

_Read this first in every new session. Keep it short and current._

## Where we are
- **Phase:** M1 (scaffold, guardrails, CI, deploy) **merged and live**; M1 review fixes merged (PR #3). **M2 (domain core: pure logic + tests) merged** (PR #4, 2026-10-13, after the Opus review and its fixes). No screen changed in M2, so the live app looks the same. **M3 (look, sound, notation, Gallery) merged** (PR #6, 2026-10-13; owner approved the look). The Opus review fixes and the taller keyboard came after that merge and go in through their own PR (branch `claude/tender-bohr-dsybzk`). **M4 (saving + first playable lessons, units 1–4) merged** (PR #9, 2026-10-13; it also carries the stacked-Sheets fix, so PR #8 is redundant and can be closed). The Opus review of M4 came after the merge: small fixes are in a follow-up PR (branch `claude/review-m4-pull-request-1kg4g2`), and the larger items are listed in that PR for a Sonnet fix session. **M5 (progress, settings, backups, safety nets) merged** (PR #14, 2026-10-13, after the Opus review and its fixes). **iPhone sound hardening merged** (PR #15, 2026-10-13). **M6 (full curriculum) built, PR open, waiting for the Opus review.** Next milestone after it: M7. **Schema version 1 is now frozen**: once M4 is merged real progress exists on the owner's phone, so any change to `Progress` needs a schema bump and an upgrade step (SPEC 4.8).
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
| 2026-10-13 | M4 review item 1: if saved progress exists but can't be read, show the "We couldn't read your saved progress" screen (store `broken`, with the reason), not an empty in-memory app. `unavailable` stays only for "IndexedDB can't be opened at all". Built in the M4 fix session or M5. |
| 2026-10-13 | No sound on iPhone was Silent mode (confirmed by the owner). The app **obeys Silent** and shows the hint "No sound? Check that your iPhone isn't on Silent." (iPhone/iPad only; in lessons and Settings; SPEC 7.7). |
| 2026-10-13 | PR #12 review: on the very first run, if the browser opens storage but refuses the first save (nothing saved yet), the app plays in memory with the "won't save" warning (`unavailable`), not the "couldn't read" screen. A failed read of existing data stays `broken`. |
| 2026-10-13 | iPhone sound bug (Play makes no sound): keep obeying Silent; a Sonnet session hardens the sound start-up (start on the first tap, restart a stuck engine; SPEC 7.7), then the owner does the 1-minute phone check below. Not chosen: ignoring Silent (pauses the learner's music) or a Settings switch for it (needs a schema change). |
| 2026-10-13 | PR #15 review item 1 (owner approved): the stuck-engine rebuild happens at most once each time the page is shown (reset when the page is hidden), not once per tap; a slow engine (Bluetooth) is no longer closed again and again. |
| 2026-10-13 | M5: the backup reminder's "Later" hides the card until the app is opened again (nothing saved; Settings' "Last backup" stays truthful). |
| 2026-10-13 | M5: the Path's InstallCard shows only when it can offer something (an Install button or the iPhone Share steps). Settings says "The app is installed." when installed, else "Use your browser's menu to add this app to your home screen." when neither is possible. |
| 2026-10-13 | M5: the Progress mastery chart uses 17 shared columns (each staff spreads its 17 notes in pitch order). |
| 2026-10-13 | M5: the iPhone sound hardening stays a separate Sonnet session (not in the M5 PR). |
| 2026-10-13 | M5 review: the restore preview offers "Save a backup first" (saves the current progress, the sheet stays open) before "Replace my progress" (CLAUDE.md: anything that replaces progress offers an export first). |
| 2026-10-13 | M5 review: the Progress chart's tap targets (~19 px wide on a phone, one per column) are an accepted exception to the 44 px rule (STANDARDS §2); the tooltip names the tapped note, so a wrong tap is obvious. |
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
0. **M6** is built: every lesson, level 2/3 lesson, practice and the three checkpoints are playable. Next: the Opus review of the M6 PR (prompt in `docs/build/README.md`), then M7.
1. M5 is **merged** (PR #14); its review questions were decided (see the Decisions table: restore preview offers "Save a backup first"; chart tap targets accepted).
2. iPhone sound hardening **merged** (PR #15, 2026-10-13, after the Opus review and the 300 ms rebuild fix). Owner check on **Chrome (Windows)**: Play sound yes, ding yes, still works after locking. **Not yet checked on iPhone**: the owner will report back if anything is wrong there; until then, treat it as working.
3. Owner: close PR #8 if still open (already in `main`).

### M6 choices the spec left open (owner may veto)
- Checkpoint node: "Jump ahead" until every level-1 lesson of the unit before it is done (`checkpointReached`), then "Test yourself". It stays "Test yourself" after a pass. Trophy card with the checkpoint's title; no other states.
- Level buttons: both "Level 2" and "Level 3" show once available (so level 2 stays replayable after level 3 opens). White pill buttons inside the unit header.
- find-key-letter feedback always says "Any {Letter} key works." (also when the answer was right); step-skip feedback always names the move ("It's a skip up: line to line.") (also when right). Both are an extra line under the usual feedback.
- find-key feedback highlights the exact key matching the note on the staff (green) and the tapped one if wrong (orange). A tapped black key cannot be shown (the keyboard only reports "black").
- find-on-staff: the staff always has two note columns so the learner's note (left) and the nearest right position (right, green) do not jump; the position sentence in the feedback describes the nearest right note shown. ▲ ▼ are disabled until a note is placed. Aria names "Move the note up/down".
- Step-skip with 4 buttons is a 2 x 2 grid (Step up, Step down / Skip up, Skip down).
- On a 320 px wide phone the feedback bar covers the second row of the 2 x 2 buttons (already answered).
- Review and checkpoint routes redirect home when not available (review needs 3 cards).
- Fixed on the way: a tapped piano key kept the browser's focus paint (amber) over its green/orange result.
- Test coverage not possible in the cloud: real touch on the tap bands (about 10 px tall each; the nudge buttons are the fallback).

### M5 choices the spec left open (owner may veto)
- (Done in M6: the `MAX_UNIT_M4` gate is gone; Practise, the keyboard sheet, Level buttons and checkpoint nodes are live.)
- Small texts the spec doesn't give: section headings in Settings ("Sound", "Daily goal", "Install the app", "Backup", "Storage", "Start over", "About"), the About line "Sheet Music 101 version 0.1.0 (build …)", Progress headings ("Notes you know", "Units"), stat labels ("Total XP", "Days practised", "Lessons completed", "First-try accuracy"), mastery words ("New", "Learning", "Almost", "Known"), the chart hint "Tap a note to see how well you know it.", chart names for cards without a nickname ("Treble E", "Bass A"), "Last backup: 1 day ago", "A new version is ready." [Reload] (spec), and a back arrow ("Back") on Progress and Settings.
- "Lessons completed" (Progress) counts lesson records, not checkpoints (same as the backup preview); first-try accuracy shows "–" before any answer.
- Start over, first sheet: "Save backup" moves on to the second sheet only if a file was actually saved (a closed share sheet stays on the first).
- Broken-data screen: the raw record is read when the screen opens (so the download can open the share sheet straight from the tap); its "Start fresh" first sheet's "Save backup" downloads that raw data. File name `sheet-music-101-saved-data-YYYY-MM-DD.json`.
- Error screen (ErrorBoundary) shows "Backup saved." under its buttons after a successful save (toasts are not available there).
- The store's `startFresh` now opens the database itself after a failed read (the HANDOFF note for M5); it still refuses inside its transaction if the record has become readable.

### M4 choices the spec left open (owner may veto)
- (Removed in M6.) Path showed only units 1–4 (the playable ones) and a line "More units are coming soon." under them. A temporary `MAX_UNIT_M4 = 4` gate lives in `domain/unlocks.ts` as `isPlayable` / `currentPlayableLesson` (the domain's own `isAvailable` is unchanged, so the M2 tests still describe the whole course). M6 removes it (TODO comment in the code).
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

### iPhone Safari sound bug (owner report, 2026-10-13): plan, decided 2026-10-13
**Report:** on iPhone (Safari), the notes make no sound when tapping **Play** on a concept card.

**Diagnosis (Opus):** Silent mode is the most likely cause. Web Audio on iPhone obeys the Silent switch and plays at *media* volume, not ringer volume. It can't be the only explanation, though, and the cloud can't test a real iPhone. `audio/synth.ts` has two weak spots that match known Safari behaviour:
- The engine is created on the first sound call. That can be a Meet card's auto-play, which runs after the tap and not inside it. Safari then leaves the engine `suspended`.
- After a call, a lock or an app switch, Safari puts the engine in `interrupted`. Sometimes it reports `running` but stays silent until the engine is rebuilt. Today the code only calls `resume()` without waiting, and never rebuilds.

**Sonnet session (done 2026-10-13; one commit per item, unit tests with the fake context in `synth.test.ts`):**
1. **Start on the first tap.** On the first `pointerup`/`touchend`/`click`/`keydown` anywhere (capture phase), create the engine inside that tap, call `resume()`, and play a one-sample silent buffer. Keep listening until the engine is `running`, and listen again after the page has been hidden.
2. **Restart a stuck engine.** If the engine is `closed`, or still not `running` about 300 ms after a `resume()` that was triggered by a tap, close it and build a new one (master gain → compressor → destination). Never more than once per tap. Errors keep going to the one-time "Sound isn't available right now." toast.
3. **Schedule a little ahead.** Start sounds at `currentTime + 0.02` s so the start of a note isn't cut off while the engine wakes up.
4. Update SPEC 7.7 with items 1–3, and NOTES.

**Owner's 1-minute phone check (after that session is merged; in Safari or the home-screen app):**
1. Turn Silent off: flip the switch on the left side so no orange shows. On iPhone 15 Pro or later, open Control Center and tap the bell so it has no line through it.
2. Open the app, start **Lines and spaces** (Unit 1), and press the volume-up button a few times while the lesson is showing.
3. On the third card ("Higher on the staff, higher sound") tap **Play**. Then answer a question and listen for the "ding".
4. Tell the next session: Play sound yes/no; ding yes/no; and whether sound stops after locking the phone or switching apps and coming back.

**Result (2026-10-13):** done on Chrome (Windows), not iPhone: Play yes, ding yes, works after locking. iPhone not yet checked; the owner will report problems if any.

## How to run checks
`npm ci`, then `npm run verify` (check-safety, typecheck, lint, format, unit tests, build,
check-dist, e2e). Adding a package: `npx -y npm@11.6.2 install -E <pkg>@<version>` (SPEC §2).
Never run `npx playwright install` in a cloud session.

## Blocked
(nothing)
