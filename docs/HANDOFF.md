# Handoff: current state

_Read this first in every new session. Keep it short and current._

## Where we are
- **Phase:** planning complete (M0). Next: **M1** (`docs/build/M1.md`), run by a Sonnet 5.5 session.
- Repo: `jonathanskim96-ctrl/Sheet_Music_101`. App name: **Sheet Music 101**.
- Live URL (after M1 is merged): https://jonathanskim96-ctrl.github.io/Sheet_Music_101/
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
| 2026-10-12 | Tech: versions in `docs/build/SPEC.md` §2 were verified to install, build and test together (with npm 11 for installs; npm 10 has a resolver bug). |

## Waiting on the owner
- [ ] Make the repository public (decided 2026-10-12: free GitHub Pages hosting). Steps: GitHub →
      repo Settings → General → Danger Zone → Change visibility → Make public.
- [ ] Set `main` as the default branch (`main` was created 2026-10-12): Settings → General →
      Default branch → switch icon → choose `main` → Update.

## Next step
1. Owner does the two items above (M1 can start before, but deploy needs the repo public).
2. Sonnet 5.5 session runs M1 using the execution prompt in `docs/build/README.md`.

## How to run checks
Not set up yet. From M1 on: `npm ci`, then `npm run verify`.
Adding a package: `npx -y npm@11.6.2 install -E <pkg>@<version>` (see SPEC §2).

## Blocked
(nothing)
