# Sheet Music 101: product and build plan

Status: **planning complete** (2026-10-12). This is the overview; the exact build
instructions are in `docs/build/` (start with `docs/build/README.md`).

---

## 1. What we're building

A small installable web app (PWA) that teaches one or two people to read piano
sheet music: **treble clef and bass clef**. It's styled after Duolingo: short
lessons, a path of units, progress markers, a daily goal and a count of days practised.

Guiding principle: **sustainable over intense.** Lessons are short and easy,
new material comes slowly, and review does most of the work. Missing a day
should never feel like a punishment.

### In scope (v1)
- Note names on the treble staff, bass staff and grand staff (C2 to C6 by the end).
- Ledger lines (including Middle C between the staves).
- Answering by tapping a note name, and later by tapping an on-screen piano key.
- Units, lessons, review sessions, XP, per-skill levels, daily goal, days practised.
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

Each unit is a group of lessons on the path. Exact lessons are in
`docs/build/CURRICULUM.md` (43 main-path lessons; about 6–8 weeks at one lesson a day, with
levels 2–3 and reviews adding as much again).

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

If this summary and `docs/build/CURRICULUM.md` ever differ, CURRICULUM.md is right.

Each unit's skill has **levels 1–3** (like Duolingo's crowns): level 1 = name the
note, level 2 = adds keyboard questions, level 3 = exact keys and placing notes on the staff.
Players can move forward after level 1; higher levels are optional extra depth.

---

## 4. Motivation and progress (gentle version)

- **Path view:** units shown as a winding path of lesson bubbles; done / current / locked.
- **XP:** ~10 XP per lesson, small bonus for a perfect lesson.
- **Daily goal:** default 1 lesson (options: 1, 2 or 3).
- **No streak** (owner decision). Instead show **total days practised** and total XP,
  which only ever go up. The daily goal is just today's ring; missing it has no effect.
- **Note mastery chart:** a grand staff where each note is coloured by how well
  it's known; this is the clearest "progress marker" for this subject.
- **No hearts / lives.** Mistakes never block learning. (Owner decision.)
- Small celebration screen at lesson end (XP, accuracy, notes improved).

---

## 5. Technical plan

Based on `docs/APP_BUILD_PLAYBOOK.md`, simplified because there's **no shared data
and no server**.

- **Stack:** React + Vite + TypeScript + `vite-plugin-pwa`; vitest; Playwright e2e.
- **Hosting:** GitHub Pages via GitHub Actions, free. Deploy gated on checks.
- **Data:** stored **on the device** in IndexedDB. No account, no backend, no
  Supabase. (Owner decision.)
  - Versioned local schema with additive upgrade steps (the local equivalent of the
    playbook's "migrations are additive").
  - **Export / import progress** to a JSON file as a backup, and to move to a new phone.
  - Import is validated and previewed before applying; never silently overwrites.
  - Reset progress needs an in-app confirmation step and offers an export first.
- **Sheet music drawing:** our own small SVG component (staff, clefs, notes, ledger
  lines). We only draw single notes, so a library like VexFlow is more than we need;
  own SVG keeps the app small, offline-friendly and fully under our control.
  The clef symbols are outlines extracted from the Bravura music font (SIL Open Font
  License), already in `src/notation/glyphs.ts`.
- **Sound:** piano-like tones generated with the Web Audio API (no audio files to
  download). Mute toggle; sound starts only after a tap (browser rule).
- **Architecture** (playbook section 4):
  - `src/domain/`: pure logic, no I/O: notes and pitch maths, staff positions,
    curriculum definition, lesson builder, spaced-repetition scheduler, XP and daily-goal rules,
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
  answers), scheduler, day counting across time zones/daylight saving, import validator.
- Browser e2e: complete a lesson, progress survives reload, offline use, export →
  reset → import round trip, install/update flow.
- Accessibility basics: buttons large enough on phone, colour is never the only signal,
  works in light and dark mode.

---

## 6. Milestones

See `docs/build/README.md` for the table, the session prompts and the owner's steps.
M1 scaffold + deploy · M2 domain logic · M3 look/sound/notation · M4 saving + first lessons ·
M5 progress/settings/backups · M6 full curriculum · M7 hardening and go-live.

## 7. Ideas for later
- MIDI keyboard input (USB/Bluetooth piano) via Web MIDI.
- Microphone: play the note on a real piano and the app hears it.
- Sharps/flats, key signatures, rhythm reading, simple melodies, chords.
- Two profiles on one device.

---

## 8. Decisions (all made 2026-10-12)

- Progress stored on each device; backup by export/import file.
- Two learners use separate phones (no profiles needed).
- No streak; total days practised and XP instead.
- No hearts.
- Letter buttons first; on-screen keyboard unlocks after Unit 4.
- Sound on by default, with a mute button.
- Bright, colourful, entertaining look with a mascot ("Quaver").
- Hosting: GitHub Pages (needs the repository to be public, or another choice recorded in HANDOFF).
