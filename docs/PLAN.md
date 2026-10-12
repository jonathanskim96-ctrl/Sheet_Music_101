# Sheet Music 101: product and build plan

Status: **planning (draft)**. Items marked **[DECIDE]** are waiting on the owner.
Everything else is a proposal the owner can change.

---

## 1. What we're building

A small installable web app (PWA) that teaches one or two people to read piano
sheet music: **treble clef and bass clef**. It's styled after Duolingo: short
lessons, a path of units, progress markers, a daily goal and a streak.

Guiding principle: **sustainable over intense.** Lessons are short and easy,
new material comes slowly, and review does most of the work. Missing a day
should never feel like a punishment.

### In scope (v1)
- Note names on the treble staff, bass staff and grand staff (C2 to C6 by the end).
- Ledger lines (including Middle C between the staves).
- Answering by tapping a note name, and later by tapping an on-screen piano key.
- Units, lessons, review sessions, XP, per-skill levels, daily goal, streak.
- Works offline, installs to the phone home screen.

### Out of scope for now
- Accounts, sharing, leaderboards, friends.
- Sharps/flats, key signatures, rhythm, chords, sight-reading full pieces.
- MIDI keyboard input, microphone pitch detection.
  (All good candidates for later versions; see section 7.)

---

## 2. Learning design

### Lesson shape
- One lesson takes **about 3 minutes**: 10 questions.
- A lesson introduces **at most 1–2 new notes**. The rest are review.
- New notes are shown first in a "meet the note" card (staff + name + piano key
  + its sound), then practised.
- Wrong answer: show the correct note on the staff and keyboard, play it, and
  repeat that question later in the same lesson. No penalty beyond that.
- Finishing a lesson always succeeds; accuracy affects XP, not pass/fail.

### Question types (introduced gradually)
1. **Name the note:** a note on the staff, pick its letter (A–G buttons).
2. **Find the key:** a note on the staff, tap it on a piano keyboard (1–2 octaves).
3. **Find the note:** a letter name (e.g. "Bass G"), tap the right position on a staff.
4. **Step or skip:** two notes, say if the second goes up/down by a step or a skip
   (builds reading by intervals instead of counting lines).

### Memory: spaced repetition
- Every note-in-a-clef (e.g. "treble E4") is a separate **card** with a mastery level 0–5
  (a Leitner box system).
- Correct answers move a card up a box; mistakes move it down.
- Higher boxes come back less often (e.g. same day, 1 day, 3 days, 7 days, 14 days, 30 days).
- A **Practice / Review** button builds a lesson from cards that are due, weakest first.
- Response time is recorded so "correct but slow" notes still get extra practice.

### Teaching approach: landmark notes
We use the landmark method (widely used by piano teachers): learn a few anchor
notes first, then read nearby notes by stepping from them. That's easier and
more durable than memorising every line and space at once. Mnemonics
("Every Good Boy Does Fine", etc.) are shown as optional tips, not the main method.

---

## 3. Curriculum draft

Each unit is a group of lessons on the path. Pace guide at 1 lesson a day:
the whole of v1 takes roughly 3–4 months.

| Unit | Topic | New notes |
|---|---|---|
| 1 | **Staff basics:** lines and spaces, what a clef is, high vs low, the piano keyboard and the letters A–G | (no reading yet) |
| 2 | **Treble landmarks:** Middle C (C4), Treble G (G4), Treble C (C5) | C4, G4, C5 |
| 3 | **Treble neighbours:** one step from each landmark | D4, F4, A4, B4, D5 |
| 4 | **Treble staff complete:** lines E G B D F, spaces F A C E | E4, E5, F5 |
| 5 | **Bass landmarks:** Middle C (C4), Bass F (F3), Bass C (C3) | C4, F3, C3 |
| 6 | **Bass neighbours** | B2, D3, E3, G3, A3, B3 |
| 7 | **Bass staff complete:** lines G B D F A, spaces A C E G | G2, A2 |
| 8 | **Grand staff:** both clefs mixed, how they connect at Middle C | (mix) |
| 9 | **Ledger lines near Middle C:** notes between the staves written in either clef | A3–E4 in both clefs |
| 10 | **Outer ledger lines:** above treble, below bass; Low C (C2) and High C (C6) | G5–C6, C2–F2 |
| 11 | **Steps and skips:** reading by distance between notes | (intervals) |
| ★ | **Checkpoint tests** at the end of units 4, 7, 10 (optional, can skip ahead) | |

Each unit's skill has **levels 1–3** (like Duolingo's crowns): level 1 = name the
note, level 2 = adds keyboard questions, level 3 = adds speed/finding on the staff.
Players can move forward after level 1; higher levels are optional extra depth.

---

## 4. Motivation and progress (gentle version)

- **Path view:** units shown as a winding path of lesson bubbles; done / current / locked.
- **XP:** ~10 XP per lesson, small bonus for a perfect lesson.
- **Daily goal:** default 1 lesson (options: 1, 2 or 3).
- **Streak:** counts days with the daily goal met. **[DECIDE]** how forgiving
  (see section 8).
- **Note mastery chart:** a grand staff where each note is coloured by how well
  it's known; this is the clearest "progress marker" for this subject.
- **No hearts / lives.** Mistakes never block learning. **[DECIDE]**
- Small celebration screen at lesson end (XP, accuracy, notes improved).

---

## 5. Technical plan

Based on `docs/APP_BUILD_PLAYBOOK.md`, simplified because there's **no shared data
and no server**.

- **Stack:** React + Vite + TypeScript + `vite-plugin-pwa`; vitest; Playwright e2e.
- **Hosting:** GitHub Pages via GitHub Actions, free. Deploy gated on checks.
- **Data:** stored **on the device** in IndexedDB. No account, no backend, no
  Supabase. **[DECIDE]** (see section 8).
  - Versioned local schema with additive upgrade steps (the local equivalent of the
    playbook's "migrations are additive").
  - **Export / import progress** to a JSON file as a backup, and to move to a new phone.
  - Import is validated and previewed before applying; never silently overwrites.
  - Reset progress needs an in-app confirmation step and offers an export first.
- **Sheet music drawing:** our own small SVG component (staff, clefs, notes, ledger
  lines). We only draw single notes, so a library like VexFlow is more than we need;
  own SVG keeps the app small, offline-friendly and fully under our control.
  The clef symbols come from an open-licensed music font or SVG paths (Bravura,
  SIL Open Font License).
- **Sound:** piano-like tones generated with the Web Audio API (no audio files to
  download). Mute toggle; sound starts only after a tap (browser rule).
- **Architecture** (playbook section 4):
  - `src/domain/`: pure logic, no I/O: notes and pitch maths, staff positions,
    curriculum definition, lesson builder, spaced-repetition scheduler, XP/streak rules,
    progress validator, import/export. Thoroughly unit tested and fuzzed.
  - `src/data/`: IndexedDB storage, schema upgrades, defensive normalising of anything
    read from storage or an import file.
  - `src/ui/`, `src/screens/`: thin React screens.
- **PWA:** auto-updating service worker, "new version, reload" banner, install button,
  iOS "Add to Home Screen" steps, icons, build id in the footer.
- **Security** (playbook section 3, the parts that apply): no `innerHTML`/`eval`; CSP;
  no secrets exist at all; imported files treated as untrusted; least-privilege CI.

### Testing
- Unit + fuzz: pitch/staff maths (every note maps to the right line/space in each clef),
  lesson builder (never more than the allowed number of new notes, always valid
  answers), scheduler, streak across time zones/daylight saving, import validator.
- Browser e2e: complete a lesson, progress survives reload, offline use, export →
  reset → import round trip, install/update flow.
- Accessibility basics: buttons large enough on phone, colour is never the only signal,
  works in light and dark mode.

---

## 6. Milestones

| # | Milestone | Owner can try it? |
|---|---|---|
| M0 | Planning docs, decisions recorded (this) | No |
| M1 | Scaffold: Vite/React/TS/PWA, lint, tests, deploy workflow, empty app live on GitHub Pages | Yes: open the URL |
| M2 | Domain core: notes, staff maths, SVG staff renderer, sound | Yes: a demo page of notes |
| M3 | First playable lesson: Unit 2 with "name the note" | **Yes: first real use** |
| M4 | Saving progress, path screen, XP, daily goal, streak, export/import | Yes |
| M5 | Spaced-repetition review, mastery chart | Yes |
| M6 | Full curriculum units 1–11, keyboard questions, levels 1–3, checkpoints | Yes |
| M7 | Polish, two review passes (code + security), install on phones | Go live |

---

## 7. Ideas for later
- MIDI keyboard input (USB/Bluetooth piano) via Web MIDI.
- Microphone: play the note on a real piano and the app hears it.
- Sharps/flats, key signatures, rhythm reading, simple melodies, chords.
- Two profiles on one device.

---

## 8. Open decisions **[DECIDE]**

1. **Where progress is stored.** On each device only (recommended, no setup, no
   account) vs synced through a cloud database (Supabase, needs sign-in setup).
2. **Two learners:** if two people use it, on separate phones (works automatically
   with on-device storage) or sharing one device (needs profiles)?
3. **Streak style:** gentle (rest days / streak freezes earned automatically,
   recommended) vs classic (miss a day, streak resets) vs no streak.
4. **Hearts / lives:** none (recommended) vs Duolingo-style hearts.
5. **Answer method at the start:** letter buttons first, keyboard unlocked later
   (recommended) vs keyboard from day one.
6. **Sound:** on by default (recommended) vs off by default.
7. **Look and feel:** bright and playful (Duolingo-like) vs calm and minimal.
