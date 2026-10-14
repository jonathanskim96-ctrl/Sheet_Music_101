# Curriculum and learner-facing text

Transcribe this into `src/domain/curriculum.ts` and `src/domain/content.ts` **exactly**.
Card ids omit the clef prefix in the tables for brevity: in a treble unit `G4` means
`treble-G4`; in a bass unit `F3` means `bass-F3`. Units 8 and 9 mix clefs and use full ids.

Pace: 43 main-path lessons, about 3 minutes each. At one lesson a day the main path takes
about 6–8 weeks; levels 2–3 and reviews add as much again.

---

## 1. Question mixes (by lesson type)

| Mix name | Weights |
|---|---|
| L1 (level 1, units 2–10) | name-note 100 |
| L2 (level 2) | name-note 40, find-key-letter 60 |
| L3 (level 3) | name-note 20, find-key-exact 40, find-on-staff 40 |
| U1-alphabet | alphabet-next 100 |
| U1-keys | keyboard-letter 100 |
| U1-staff | line-or-space 60, higher-lower 40 |
| U1-clefs | clef-identify 60, higher-lower 40 |
| U11 | step-skip 100 |

Level-2 lessons `u{n}-lv2-a`, `u{n}-lv2-b` and level-3 lessons `u{n}-lv3-a`, `u{n}-lv3-b`
exist for units 2–10. Their pool = the union of that unit's level-1 pools; no newCards; no
concept cards; 10 questions; render as the unit. Titles: "Level 2 · Keys A", "Level 2 · Keys B",
"Level 3 · Master A", "Level 3 · Master B".

---

## 2. Units and lessons

### Unit 1: "Meet the music" (colour `--unit-1`, render single, 8 questions per lesson)
Subtitle: "Letters, keys and the staff"

| id | title | concept cards | mix |
|---|---|---|---|
| u1-l1 | The musical alphabet | c-alphabet | U1-alphabet |
| u1-l2 | The piano keys | c-black-keys, c-find-c, c-white-keys | U1-keys |
| u1-l3 | Lines and spaces | c-staff, c-line-space, c-higher | U1-staff |
| u1-l4 | Two clefs | c-treble-clef, c-bass-clef, c-grand-staff | U1-clefs |

### Unit 2: "Treble landmarks" (`--unit-2`, treble, single)
Subtitle: "Three notes to find your way"

| id | title | concept | newCards | pool |
|---|---|---|---|---|
| u2-l1 | Middle C and Treble G | c-landmarks | C4, G4 | C4, G4 |
| u2-l2 | Treble C | – | C5 | C4, G4, C5 |
| u2-l3 | Landmark review | – | – | C4, G4, C5 |

### Unit 3: "Treble neighbours" (`--unit-3`, treble, single)
Subtitle: "One step from a landmark"

| id | title | concept | newCards | pool |
|---|---|---|---|---|
| u3-l1 | D, next to Middle C | c-steps | D4 | C4, D4, G4, C5 |
| u3-l2 | Around Treble G | – | F4, A4 | C4, D4, F4, G4, A4, C5 |
| u3-l3 | Around Treble C | – | B4, D5 | C4, D4, F4, G4, A4, B4, C5, D5 |
| u3-l4 | Neighbours review | – | – | C4, D4, F4, G4, A4, B4, C5, D5 |

### Unit 4: "The whole treble staff" (`--unit-4`, treble, single)
Subtitle: "Every line and space"

| id | title | concept | newCards | pool |
|---|---|---|---|---|
| u4-l1 | Bottom line E | – | E4 | C4, D4, E4, F4, G4, A4, B4, C5, D5 |
| u4-l2 | Top of the staff | – | E5, F5 | C4–F5 (all 11: C4 D4 E4 F4 G4 A4 B4 C5 D5 E5 F5) |
| u4-l3 | Treble lines | c-treble-lines | – | E4, G4, B4, D5, F5 |
| u4-l4 | Treble spaces | c-treble-spaces | – | F4, A4, C5, E5 |
| u4-l5 | Treble staff review | – | – | all 11 (C4–F5) |

**Checkpoint A** `cp-a`, after unit 4: "Treble checkpoint". completesUnits [1, 2, 3, 4].
Pool: treble C4 D4 E4 F4 G4 A4 B4 C5 D5 E5 F5.

### Unit 5: "Bass landmarks" (`--unit-5`, bass, single)
Subtitle: "Landmarks for your left hand"

| id | title | concept | newCards | pool |
|---|---|---|---|---|
| u5-l1 | Middle C and Bass F | c-bass-landmarks | C4, F3 | C4, F3 |
| u5-l2 | Bass C | – | C3 | C3, F3, C4 |
| u5-l3 | Landmark review | – | – | C3, F3, C4 |

### Unit 6: "Bass neighbours" (`--unit-6`, bass, single)
Subtitle: "One step from a landmark"

| id | title | concept | newCards | pool |
|---|---|---|---|---|
| u6-l1 | Around Bass F | – | E3, G3 | C3, E3, F3, G3, C4 |
| u6-l2 | Around Bass C | – | B2, D3 | B2, C3, D3, E3, F3, G3, C4 |
| u6-l3 | Just below Middle C | – | A3, B3 | B2, C3, D3, E3, F3, G3, A3, B3, C4 |
| u6-l4 | Neighbours review | – | – | B2, C3, D3, E3, F3, G3, A3, B3, C4 |

### Unit 7: "The whole bass staff" (`--unit-7`, bass, single)
Subtitle: "Every line and space"

| id | title | concept | newCards | pool |
|---|---|---|---|---|
| u7-l1 | Bottom of the staff | – | G2, A2 | G2–C4 (all 11: G2 A2 B2 C3 D3 E3 F3 G3 A3 B3 C4) |
| u7-l2 | Bass lines | c-bass-lines | – | G2, B2, D3, F3, A3 |
| u7-l3 | Bass spaces | c-bass-spaces | – | A2, C3, E3, G3 |
| u7-l4 | Bass staff review | – | – | all 11 (G2–C4) |

**Checkpoint B** `cp-b`, after unit 7: "Bass checkpoint". completesUnits [5, 6, 7].
Pool: bass G2 A2 B2 C3 D3 E3 F3 G3 A3 B3 C4.

### Unit 8: "The grand staff" (`--unit-8`, render **grand**)
Subtitle: "Both hands together"

| id | title | concept | newCards | pool |
|---|---|---|---|---|
| u8-l1 | Landmarks together | c-grand-together | – | bass-C3, bass-F3, bass-C4, treble-C4, treble-G4, treble-C5 |
| u8-l2 | All the notes | – | – | treble C4–F5 (11) + bass G2–C4 (11) |
| u8-l3 | Grand staff review | – | – | same 22 |

### Unit 9: "Ledger lines near Middle C" (`--unit-9`, render **grand**)
Subtitle: "Notes between the staves"

| id | title | concept | newCards | pool |
|---|---|---|---|---|
| u9-l1 | Below the treble staff | c-ledger | treble-B3, treble-A3 | treble A3, B3, C4, D4, E4 |
| u9-l2 | Above the bass staff | – | bass-D4, bass-E4 | bass A3, B3, C4, D4, E4 |
| u9-l3 | Same note, two homes | c-two-homes | – | treble A3 B3 C4 D4 E4 + bass A3 B3 C4 D4 E4 |
| u9-l4 | Middle review | – | – | same 10 |

### Unit 10: "High and low" (`--unit-10`, render single)
Subtitle: "Ledger lines on the outside"

| id | title | concept | newCards | pool |
|---|---|---|---|---|
| u10-l1 | Above the treble staff | c-going-higher | treble-G5, treble-A5 | treble C5, D5, E5, F5, G5, A5 |
| u10-l2 | Up to High C | – | treble-B5, treble-C6 | treble F5, G5, A5, B5, C6 |
| u10-l3 | Below the bass staff | c-going-lower | bass-F2, bass-E2 | bass E2, F2, G2, A2, B2 |
| u10-l4 | Down to Low C | – | bass-D2, bass-C2 | bass C2, D2, E2, F2, G2 |
| u10-l5 | High and low review | – | – | treble F5 G5 A5 B5 C6 + bass C2 D2 E2 F2 G2 |

**Checkpoint C** `cp-c`, after unit 10: "Grand checkpoint". completesUnits [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]. Pool: all 34 cards.

### Unit 11: "Steps and skips" (`--unit-11`, render single, mix U11)
Subtitle: "Read by distance"

| id | title | concept | stepSkipConfig |
|---|---|---|---|
| u11-l1 | Steps | c-read-steps | clefs [treble], intervals [step], buttons 2 |
| u11-l2 | Skips | c-skips | clefs [treble], intervals [step, skip], buttons 4 |
| u11-l3 | Bass steps and skips | – | clefs [bass], intervals [step, skip], buttons 4 |
| u11-l4 | Both clefs | – | clefs [treble, bass], intervals [step, skip], buttons 4 |

---

## 3. Concept cards (`ConceptCardId` → title, body, illustration)

| id | title | body | illustration |
|---|---|---|---|
| c-alphabet | Music uses 7 letters | Notes are named with just seven letters: A B C D E F G. After G, it starts again at A. | the letters A–G in a row, then "A" again in a lighter colour |
| c-black-keys | Black keys come in groups | Look at the black keys: they come in groups of 2 and groups of 3. They're your map of the piano. | keyboard C3–B4, black-key groups highlighted alternately |
| c-find-c | Finding C | C is the white key just to the left of each group of 2 black keys. | keyboard with every C highlighted |
| c-white-keys | The white keys | From C, the white keys go C D E F G A B, and then C again. | keyboard C4–B4 with letters on every white key |
| c-staff | The staff | Music is written on 5 lines called the staff. We count the lines from the bottom: 1 to 5. | clefless staff with line numbers 1–5 at the left |
| c-line-space | Lines and spaces | A note sits ON a line (the line goes through its middle) or IN a space (between two lines). | clefless staff with one note on line 2 and one in space 3, labelled "line" and "space" |
| c-higher | Higher on the staff, higher sound | The higher a note sits on the staff, the higher it sounds. | treble staff, notes C4 to C5 rising; "Play" plays them in order (200ms apart) |
| c-treble-clef | The treble clef | This is the treble clef. It's for higher notes, usually played by your right hand. | treble staff, no notes |
| c-bass-clef | The bass clef | This is the bass clef. It's for lower notes, usually played by your left hand. | bass staff, no notes |
| c-grand-staff | The grand staff | Piano music uses both: treble on top, bass below. Together they're called the grand staff. | grand staff, no notes |
| c-landmarks | Landmark notes | Instead of memorising every note at once, we'll learn a few landmarks first. Then you can find any note by stepping from the nearest landmark. | treble staff with C4, G4, C5 |
| c-steps | Steps | From a line to the very next space (or a space to the very next line) is one step. Each step up is the next letter: C, D, E… | treble staff C4, D4, E4 |
| c-treble-lines | Treble lines: E G B D F | The five treble lines from the bottom are E, G, B, D, F. Remember: Every Good Boy Does Fine. | treble staff with E4 G4 B4 D5 F5 |
| c-treble-spaces | Treble spaces: F A C E | The four treble spaces from the bottom spell FACE. | treble staff with F4 A4 C5 E5 |
| c-bass-landmarks | Bass landmarks | The bass staff has its own landmarks: Bass F, Bass C, and our old friend Middle C, just above the staff. | bass staff with C3, F3, C4 |
| c-bass-lines | Bass lines: G B D F A | The five bass lines from the bottom are G, B, D, F, A. Remember: Good Boys Do Fine Always. | bass staff with G2 B2 D3 F3 A3 |
| c-bass-spaces | Bass spaces: A C E G | The four bass spaces from the bottom are A, C, E, G. Remember: All Cows Eat Grass. | bass staff with A2 C3 E3 G3 |
| c-grand-together | Both clefs together | On the grand staff, look at the clef first: it tells you which landmarks to use. Middle C is the bridge between them. | grand staff with treble C4 G4 C5 and bass C3 F3 C4 |
| c-ledger | Ledger lines | Short extra lines called ledger lines stretch the staff. Middle C sits on the first ledger line below the treble staff. | grand staff with treble C4 and treble A3 |
| c-two-homes | Same note, two homes | Notes near Middle C can be written in either clef. It's the same key on the piano, just written in a different place. | grand staff with treble C4 and bass C4; keyboard below with Middle C highlighted |
| c-going-higher | Going higher | Above the treble staff, ledger lines keep going up. High C sits on the second ledger line. | treble staff with G5 A5 B5 C6 |
| c-going-lower | Going lower | Below the bass staff, ledger lines keep going down. Low C sits on the second ledger line. | bass staff with F2 E2 D2 C2 |
| c-read-steps | Read by steps | Good readers don't name every note. They see how far the next note moves. A step goes line to space or space to line. | treble staff with E4 then F4 |
| c-skips | Skips | A skip goes line to line or space to space. You skip one letter: C to E. | treble staff with E4 then G4 |

---

## 4. Meet cards, nicknames, tips, hints

**Nicknames** (shown instead of the letter): treble-C4 & bass-C4 "Middle C", treble-G4
"Treble G", treble-C5 "Treble C", treble-C6 "High C", bass-F3 "Bass F", bass-C3 "Bass C",
bass-C2 "Low C". Every other card shows its letter, e.g. "E".

**Meet card:** chip "New note!" · title = nickname or letter · line 1 =
"{Treble|Bass} clef" · line 2 = position sentence · optional tip.

**Position sentence** `describePosition(clef, note)` from `p = staffPosition`:
- p even 0..8 → "It sits on line {p/2+1} (counting from the bottom)."
- p odd 1..7 → "It sits in space {(p+1)/2} (counting from the bottom)."
- p = −1 → "It sits just below the staff."
- p = 9 → "It sits just above the staff."
- p ≤ −2 even → "It sits on ledger line {−p/2} below the staff."
- p ≤ −3 odd → "It sits just below ledger line {(−p−1)/2} under the staff."
- p ≥ 10 even → "It sits on ledger line {(p−8)/2} above the staff."
- p ≥ 11 odd → "It sits just above ledger line {(p−9)/2} over the staff."

Write a unit test listing the expected sentence for all 34 cards.

**Tips** (Meet card only):
- treble-C4: "Middle C sits on its own little ledger line below the treble staff. It's the C near the middle of the piano."
- treble-G4: "The treble clef curls around this line. That's why it's also called the G clef."
- treble-C5: "Treble C is in the 3rd space, exactly one octave above Middle C."
- bass-C4: "In the bass clef, Middle C sits on a little ledger line above the staff. Same key on the piano!"
- bass-F3: "The two dots of the bass clef hug this line. That's why it's also called the F clef."
- bass-C3: "Bass C is in the 2nd space, exactly one octave below Middle C."
- treble-C6: "High C has two ledger lines above the treble staff."
- bass-C2: "Low C has two ledger lines below the bass staff."

**Landmark hint** (wrong-answer feedback, `hintFor`), with d = diatonic distance from the landmark:
- d = 1: "It's one step {above|below} {Landmark}."
- d ≥ 2: "It's {d} steps {above|below} {Landmark}."

---

## 5. UI text

**Prompts:**
- name-note: "Which note is this?"
- find-key-letter: "Tap this note on the piano."
- find-key-exact: "Tap this exact key on the piano."
- find-on-staff: "Put a {Letter} on the staff." (helper under it: "Tap the staff, then use ▲ ▼ to adjust.")
- step-skip (2 buttons): "Does the second note step up or step down?"; (4 buttons): "How does the second note move?"
- alphabet-next: "Which letter comes {after|before} {Letter}?"
- keyboard-letter: "Tap a {Letter} key."
- line-or-space: "Is this note on a line or in a space?"
- higher-lower: "Which note is higher?" (buttons "First note" / "Second note")
- clef-identify: "Which clef is this?" (buttons "Treble clef" / "Bass clef")
- step-skip buttons: "Step up", "Step down", "Skip up", "Skip down".

**Correct phrases** (random): "Nice!", "You got it!", "Great reading!", "Spot on!", "Excellent!",
"Keep it up!", "Perfect!", "Sharp eyes!", "Nailed it!", "That's the one!"

**Wrong phrases** (random, `{X}` = right answer as text; for notes: the letter, or nickname):
"Almost! It's {X}.", "Not quite. This one is {X}.", "Good try! It's {X}.", "Close! The answer is {X}."
For choice answers X is the button label in lower case ("a line", "the second note", "step up").

**Combo chip:** at 3, 5, 10 in a row, flash "3 in a row!", "5 in a row!", "10 in a row!".

**Lesson complete:**
- Title: perfect → "Perfect lesson!" else "Lesson complete!"; review → "Practice complete!";
  checkpoint passed → "Checkpoint passed!"; failed → "Good effort!".
- Mascot line (random, normal): "You're getting the hang of this!", "Your eyes are getting faster!",
  "Bravo!", "That was music to my ears!", "Brilliant reading!"
- Perfect line: "Not a single slip!"
- Checkpoint failed line: "Not this time. Keep going with the lessons and you'll get there!"
- Checkpoint passed line: "You've unlocked everything up to here!"
- Daily goal banner: "Daily goal reached! See you tomorrow."
- Stat labels: "XP earned", "Accuracy", "Time", "Best combo".

**Welcome:** Mascot bubble "Hi, I'm Quaver!" · body "I'll help you read piano music, one note
at a time. A few minutes a day is all it takes." · button "Let's start".

**Keyboard unlocked sheet:** title "New: piano keyboard!" · body "You can now find notes on the
piano. Try Level 2 on any unit you've finished." · button "Cool!".

**Leave lesson sheet:** title "Leave this lesson?" · body "Your answers in this lesson won't be
saved." · "Keep going" / "Leave".

**Install card:** title "Install Sheet Music 101" · body "Add it to your home screen so it opens
like an app and your progress stays safe." · Android/desktop button "Install" · iOS body adds
"Tap the Share button, then 'Add to Home Screen'." · dismiss "Not now".

**Backup reminder card:** title "Save a backup" · body "Keep a copy of your progress in case
you change phones." · buttons "Save backup" / "Later".

**Toasts:** locked lesson "Finish the lesson before this one first." · save failed banner
"Couldn't save your progress: {reason}" + "Try again" · storage unavailable banner "This
browser won't let the app save progress. It will reset when you close it." · repaired
"Some saved data was damaged and has been repaired." · export done "Backup saved." · import done
"Progress restored." · import errors use the fixed messages from SPEC §4.15 and:
"That file is too big to be a backup.", "That file isn't a Sheet Music 101 backup.",
"That backup file is damaged and can't be used."

**Import preview sheet:** title "Restore this backup?" · lines "Saved on {date}",
"{xp} XP · {lessons} lessons · {days} days practised" · warning "This replaces your current
progress on this phone." · "Save a backup first" (secondary; saves the current progress, the sheet stays open) · "Replace my progress" (danger) / "Cancel".

**Start over:** Sheet 1 title "Save a backup first?" body "Then you can get your progress back
later." buttons "Save backup" / "Continue without backup" / "Cancel". Sheet 2 title "Erase all
progress?" body "This can't be undone." buttons "Erase everything" (danger) / "Cancel".

---
---

## Part 2: units 12–25 (planned 2026-10-14; built in M8–M14)

Owner decisions behind this part are in `docs/HANDOFF.md` ("Course part 2"). Technical rules
(new question kinds, music text format, sounding-pitch rule, builder) are in `SPEC.md` §8. As in
part 1: transcribe **exactly**; ids are permanent once shipped.

**Plain words.** Learners see everyday words, never music jargon: "1-beat note" (not quarter
note), "box" (not bar/measure), "rest" (explained as "stay quiet"), "home sign" (not key
signature), "letters apart" (not interval/2nd/3rd), "note stack" (not chord/triad). The symbols
♯ ♭ ♮ are shown as symbols ("F♯", "B♭") and explained in plain words. Octave numbers stay hidden.

Pace: 66 more level-1 lessons (about 3 minutes each) and 3 more checkpoints. Units 12–25 have
**no levels 2–3**: review is built into the mixes (every unit re-asks earlier kinds) and the
Practise button (which now includes sharp and flat notes).

## 6. Outline

| Unit | Title | New ideas | Reviews (from) | Question kinds | Lessons |
|---|---|---|---|---|---|
| 12 | Sharps | ♯ = next key to the right; F♯ C♯ G♯ (treble) | treble naturals (2–4), keyboard (L2) | name-accidental, find-key-pitch | 4 |
| 13 | Flats | ♭ = next key to the left; B♭ E♭ A♭; one key, two names | unit 12 sharps | name-accidental, find-key-pitch | 5 |
| 14 | Bass sharps and flats | the same six signs in the bass clef | bass naturals (5–7), units 12–13 | name-accidental, find-key-pitch | 5 |
| 15 | The natural sign | ♮ = back to the plain key; both clefs together | grand staff (8), units 12–14 | name-accidental, find-key-pitch | 4 |
| **cp-d** | Sharps and flats checkpoint | | units 12–15 | name-accidental | 15 q |
| 16 | How long is a note? | the beat; 1-, 2- and 4-beat notes; listening | whole note (all of part 1) | beats-of, which-longer, hear-rhythm | 5 |
| 17 | Beats in a box | boxes, the top number (4, 3, 2), the 3-beat note | unit 16 | count-box, finish-box, beats-of, hear-rhythm | 5 |
| 18 | Rests | 1-, 2- and 4-beat rests | units 16–17 | beats-of, count-box, finish-box, hear-rhythm | 4 |
| 19 | Half beats | the half-beat pair | units 16–18 | all rhythm kinds | 4 |
| **cp-e** | Rhythm checkpoint | | units 16–19 | beats-of, count-box, finish-box | 15 q |
| 20 | Music in boxes | notes with lengths on the staff; a sign lasts until the end of the box | units 2–7, 12–15, 16–19 | name-in-music, beats-of, count-box, finish-box, hear-rhythm | 5 |
| 21 | Home signs | a home sign changes a letter everywhere; ♮ beats it for one box | units 12–15, 20 | name-in-music, count-box | 5 |
| 22 | Letters apart | counting letters: 2 to 5 apart; notes played together | unit 11 (steps, skips), 2–10 | interval-read | 5 |
| **cp-f** | Reading checkpoint | | units 20–22 | name-in-music, interval-read, count-box | 15 q |
| 23 | Short melodies | reading and hearing a whole tune | units 11, 16–22 | hear-melody, melody-move, name-in-music | 5 |
| 24 | Both hands | the grand staff in time: notes lined up play together | units 8–9, 20, 23 | together-or-not, name-in-music, hear-melody | 4 |
| 25 | Note stacks | three notes at once, named by the bottom note | units 22, 24, and the whole course (finale) | stack-or-not, stack-name, interval-read, name-in-music, name-accidental, hear-melody, count-box | 6 |

Checkpoints d–f work exactly like a–c (15 questions, no retries, pass with 13; always open, so
they let a learner jump ahead; passing completes the units in `completesUnits`).

## 7. New cards (12 sharp and flat notes)

All sit inside the staff (no ledger lines). Card ids use `#` and `b`: `treble-F#4`, `bass-Bb2`.
Display names use the symbols: "F♯", "B♭" (no nicknames).

| Clef | Cards (low to high) | Where they sit |
|---|---|---|
| treble | F#4, G#4, Ab4, Bb4, C#5, Eb5 | space 1, line 2, space 2, line 3, space 3, space 4 |
| bass | Ab2, Bb2, C#3, Eb3, F#3, G#3 | space 1, line 2, space 2, space 3, line 4, space 4 |

**Meet card for a sign card:** chip "New note!" · title "F♯" · line 1 "Treble clef" · line 2 =
the position sentence of the plain note (`describePosition(clef, F4)`) · tip:
- sharp cards: "The ♯ in front means: play the very next key to the right."
- flat cards: "The ♭ in front means: play the very next key to the left."
The keyboard highlights the black key. "Play" plays the black key.

## 8. Question mixes (part 2)

| Mix name | Weights |
|---|---|
| P1 | name-accidental 60, find-key-pitch 40 |
| P-keys | find-key-pitch 70, name-accidental 30 |
| P-both | name-accidental 50, find-key-pitch 50 |
| P-name | name-accidental 100 |
| R1 | beats-of 100 |
| R2 | beats-of 60, which-longer 40 |
| R3 | hear-rhythm 60, beats-of 40 |
| R4 | which-longer 50, hear-rhythm 50 |
| R5 | beats-of 40, which-longer 30, hear-rhythm 30 |
| B1 | finish-box 60, beats-of 40 |
| B2 | finish-box 70, beats-of 30 |
| B3 | count-box 50, finish-box 50 |
| B4 | count-box 30, finish-box 40, hear-rhythm 30 |
| Q1 | beats-of 50, finish-box 50 |
| Q2 | beats-of 50, count-box 50 |
| Q3 | hear-rhythm 60, finish-box 40 |
| Q4 | beats-of 25, count-box 25, finish-box 25, hear-rhythm 25 |
| H1 | beats-of 50, which-longer 50 |
| H2 | hear-rhythm 70, beats-of 30 |
| M1 | name-in-music 70, beats-of 30 |
| M2 | name-in-music 100 |
| M3 | name-in-music 80, count-box 20 |
| M4 | name-in-music 60, hear-rhythm 20, finish-box 20 |
| K1 | name-in-music 80, count-box 20 |
| I1 | interval-read 100 |
| T1 | hear-melody 50, name-in-music 50 |
| T2 | melody-move 60, hear-melody 40 |
| T3 | hear-melody 70, name-in-music 30 |
| T4 | name-in-music 60, hear-melody 40 |
| T5 | hear-melody 30, melody-move 30, name-in-music 40 |
| G1 | together-or-not 60, name-in-music 40 |
| G2 | name-in-music 60, hear-melody 40 |
| G3 | together-or-not 20, name-in-music 50, hear-melody 30 |
| C1 | stack-or-not 70, interval-read 30 |
| C2 | stack-name 70, stack-or-not 30 |
| C3 | stack-name 100 |
| C4 | name-in-music 40, stack-name 60 |
| C5 | name-in-music 30, stack-name 20, hear-melody 20, count-box 15, name-accidental 15 |

The `hear-*` kinds need sound: see SPEC §8.6 for what happens when sound is off.

## 9. Material libraries

Written in the music text format of SPEC §8.3. **Durations:** `q` 1-beat note, `h` 2-beat
note, `h.` 3-beat note, `w` 4-beat note, `ee` half-beat pair (1 beat), `Q` 1-beat rest,
`H` 2-beat rest, `W` 4-beat rest. `|` separates boxes. Pitches are **written** (what is
printed): `F#4` has a ♯ printed, `Fn4` has a ♮ printed, `F4` has no sign (its sounding pitch
comes from the rules in SPEC §8.3).

### 9.1 Rhythm patterns (one box each, drawn on a one-line rhythm staff)

| Set | Time | Patterns |
|---|---|---|
| RA | 4 | `w` · `h h` · `q q h` · `h q q` · `q h q` · `q q q q` |
| RD | 4 | `h. q` · `q h.` |
| RD | 3 | `h.` · `h q` · `q h` · `q q q` |
| RD | 2 | `h` · `q q` |
| RR | 4 | `q Q q Q` · `h H` · `q q H` · `H h` · `W` · `Q q q q` · `q Q h` |
| RR | 3 | `h Q` · `Q q q` · `q Q q` |
| RR | 2 | `q Q` · `Q q` |
| RE | 4 | `ee q q q` · `q ee q q` · `ee ee h` · `h ee q` · `ee ee ee ee` · `q q ee q` |
| RE | 3 | `ee q q` · `q ee q` · `h ee` |
| RE | 2 | `ee q` · `ee ee` |

**Single events** for `beats-of` and `which-longer`, by set: RA {q, h, w}; RD adds {h.};
RR adds {Q, H, W}; RE adds {ee}.

### 9.2 Melodies

Each line: id · clef · time · home sign · music.

**Treble, no signs (MT)**
- `t1` · treble · 4 · none · `C4q D4q E4q F4q | G4h G4h`
- `t2` · treble · 4 · none · `E4q D4q C4q D4q | E4q E4q E4h`
- `t3` · treble · 4 · none · `G4q F4q E4q D4q | C4w`
- `t4` · treble · 4 · none · `C4q E4q G4h | G4q E4q C4h`
- `t5` · treble · 4 · none · `E4q F4q G4q E4q | D4h C4h`
- `t6` · treble · 4 · none · `G4q A4q B4q C5q | C5w`
- `t7` · treble · 4 · none · `C5q B4q A4q G4q | F4q E4q D4h`
- `t8` · treble · 4 · none · `E4h G4h | F4q E4q D4h`
- `t9` · treble · 3 · none · `C4h E4q | G4h.`
- `t10` · treble · 3 · none · `G4q F4q E4q | D4h.`
- `t11` · treble · 4 · none · `C4q E4q D4q F4q | E4q G4q C5h`
- `t12` · treble · 4 · none · `G4q E4q F4q D4q | E4q C4q C4h`

Step tunes (MT-step): t1 t2 t3 t5 t7 t10. Skip tunes (MT-skip): t4 t6 t8 t9 t11 t12.

**Treble, a sign lasts the box (MS)**
- `s1` · treble · 4 · none · `F4q F#4q G4q F4q | E4w`
- `s2` · treble · 4 · none · `B4q Bb4q A4q B4q | C5w`
- `s3` · treble · 4 · none · `C5q C#5q D5q C5q | D5w`
- `s4` · treble · 4 · none · `G4q G#4q A4q G4q | A4w`
- `s5` · treble · 4 · none · `E5q Eb5q D5q E5q | D5w`
- `s6` · treble · 4 · none · `A4q Ab4q G4q A4q | G4w`

**Treble, a new box starts fresh (MF)**
- `f1` · treble · 4 · none · `G4q F#4q G4h | F4q E4q F4h`
- `f2` · treble · 4 · none · `A4q Bb4q A4h | B4q C5q B4h`
- `f3` · treble · 4 · none · `D5q C#5q D5h | C5q D5q C5h`
- `f4` · treble · 4 · none · `G4q Ab4q G4h | A4q G4q A4h`

**Bass (MB)**
- `b1` · bass · 4 · none · `C3q D3q E3q F3q | G3h G3h`
- `b2` · bass · 4 · none · `G3q F3q E3q D3q | C3w`
- `b3` · bass · 4 · none · `C3q E3q G3h | E3q D3q C3h`
- `b4` · bass · 4 · none · `F3q F#3q G3q F3q | E3w`
- `b5` · bass · 4 · none · `B2q Bb2q A2q B2q | C3w`
- `b6` · bass · 4 · none · `G2q A2q B2q C3q | D3w`
- `b7` · bass · 3 · none · `C3h E3q | G3h.`
- `b8` · bass · 4 · none · `E3q Eb3q D3q E3q | C3w`

**Home signs (MK)** (home sign ids: `G` = F♯; `F` = B♭; `D` = F♯ C♯; `Bb` = B♭ E♭)
- `kg1` · treble · 4 · G · `G4q A4q B4q C5q | D5q C5q B4h`
- `kg2` · treble · 4 · G · `G4q F4q E4q F4q | G4w`
- `kg3` · treble · 4 · G · `D4q E4q F4q G4q | A4q F4q G4h`
- `kg4` · treble · 4 · G · `B4q A4q G4q F4q | G4w`
- `kf1` · treble · 4 · F · `F4q G4q A4q B4q | C5w`
- `kf2` · treble · 4 · F · `C5q B4q A4q G4q | F4w`
- `kf3` · treble · 4 · F · `A4q B4q C5q B4q | A4h F4h`
- `kf4` · treble · 4 · F · `F4q A4q B4q A4q | G4h F4h`
- `kd1` · treble · 4 · D · `D4q E4q F4q G4q | A4q B4q C5q D5q`
- `kd2` · treble · 4 · D · `A4q G4q F4q E4q | D4w`
- `kd3` · treble · 4 · D · `D5q C5q B4q A4q | D5w`
- `kb1` · treble · 4 · Bb · `B4q C5q D5q E5q | D5q C5q B4h`
- `kb2` · treble · 4 · Bb · `F4q G4q A4q B4q | C5q D5q E5h`
- `kb3` · treble · 4 · Bb · `D5q E5q D5q C5q | B4w`
- `kgb1` · bass · 4 · G · `G2q A2q B2q C3q | D3q E3q F3q G3q`
- `kfb1` · bass · 4 · F · `F3q E3q D3q C3q | B2q A2q B2q C3q`

**Natural beats the home sign (MN)**
- `n1` · treble · 4 · G · `G4q F4q E4q Fn4q | G4w`
- `n2` · treble · 4 · G · `Fn4q G4q F4q E4q | F4w`
- `n3` · treble · 4 · F · `Bn4q C5q B4q A4q | B4w`
- `n4` · treble · 4 · D · `Cn5q D5q C5q B4q | C5w`

**Both hands (MH)** (grand staff; `rh` = treble staff, `lh` = bass staff)
- `h1` · grand · 4 · none · rh `C4q D4q E4q F4q | G4w` · lh `C3w | G2w`
- `h2` · grand · 4 · none · rh `E4h G4h | C5w` · lh `C3w | C3w`
- `h3` · grand · 4 · none · rh `G4q F4q E4q D4q | C4w` · lh `G2h B2h | C3w`
- `h4` · grand · 4 · none · rh `C5q B4q A4q G4q | C5w` · lh `F3w | C3w`
- `h5` · grand · 4 · none · rh `E4q E4q F4q G4q | G4q F4q E4h` · lh `C3h G2h | C3h G2h`
- `h6` · grand · 3 · none · rh `C4h E4q | G4h.` · lh `C3h. | C3h.`

### 9.3 Note stacks

Every stack is three whole notes drawn on top of each other, one letter-skip apart.
- Treble stacks (ST): bottom notes C4, D4, E4, F4, G4, A4 (so C-E-G, D-F-A, E-G-B, F-A-C, G-B-D, A-C-E).
- Bass stacks (SB): bottom notes F2, G2, A2, C3, D3 (F-A-C, G-B-D, A-C-E, C-E-G, D-F-A).
- C/F/G set (SCFG): treble bottoms C4, F4, G4.
- Hands-together stacks (SH): a bass whole note (C3, F2 or G2) under the treble stack with the
  same letter (C4, F4, G4), drawn on the grand staff.

## 10. Units 12–25

Columns as in §2. `mix` and `material` refer to §8 and §9. Questions per lesson: 10.
Card ids omit the clef where the unit has one clef; in a treble unit `F#4` means `treble-F#4`.

### Unit 12: "Sharps" (`--unit-12`, treble, single)
Subtitle: "One key to the right"

| id | title | concept | newCards | pool | mix |
|---|---|---|---|---|---|
| u12-l1 | F♯ | c-sharp, c-sharp-staff | F#4 | F4, G4, F#4 | P1 |
| u12-l2 | C♯ | – | C#5 | C5, D5, C#5, F#4 | P1 |
| u12-l3 | G♯ | – | G#4 | G4, A4, G#4, F#4, C#5 | P1 |
| u12-l4 | Sharps review | – | – | F4, G4, C5, F#4, G#4, C#5 | P1 |

### Unit 13: "Flats" (`--unit-13`, treble, single)
Subtitle: "One key to the left"

| id | title | concept | newCards | pool | mix |
|---|---|---|---|---|---|
| u13-l1 | B♭ | c-flat | Bb4 | B4, A4, Bb4 | P1 |
| u13-l2 | E♭ | – | Eb5 | E5, D5, Eb5, Bb4 | P1 |
| u13-l3 | A♭ | – | Ab4 | A4, G4, Ab4, Bb4, Eb5 | P1 |
| u13-l4 | One key, two names | c-two-names | – | F#4, G#4, Ab4, Bb4, C#5, Eb5 | P-keys |
| u13-l5 | Sharps and flats review | – | – | F#4, G#4, Ab4, Bb4, C#5, Eb5, F4, B4, E5 | P1 |

### Unit 14: "Bass sharps and flats" (`--unit-14`, bass, single)
Subtitle: "The same signs, lower down"

| id | title | concept | newCards | pool | mix |
|---|---|---|---|---|---|
| u14-l1 | F♯ and C♯ | c-bass-signs | F#3, C#3 | F3, C3, F#3, C#3 | P1 |
| u14-l2 | G♯ | – | G#3 | G3, F#3, C#3, G#3 | P1 |
| u14-l3 | B♭ and E♭ | – | Bb2, Eb3 | B2, E3, Bb2, Eb3 | P1 |
| u14-l4 | A♭ | – | Ab2 | A2, Ab2, Bb2, Eb3, G#3 | P1 |
| u14-l5 | Bass review | – | – | Ab2, Bb2, C#3, Eb3, F#3, G#3, F3, B2 | P1 |

### Unit 15: "The natural sign" (`--unit-15`)
Subtitle: "Back to the plain key"

| id | title | concept | render | pool | mix | showNaturals |
|---|---|---|---|---|---|---|
| u15-l1 | The natural sign | c-natural | single | treble F4, B4, C5, F#4, Bb4, C#5 | P-name | yes |
| u15-l2 | Both clefs | c-signs-grand | grand | all 12 sign cards | P1 | no |
| u15-l3 | Plain or not? | – | single | treble F4, F#4, B4, Bb4 + bass F3, F#3, B2, Bb2 | P-both | yes |
| u15-l4 | Signs review | – | grand | all 12 sign cards + treble F4, B4, C5 + bass F3, B2, C3 | P1 | no |

**Checkpoint D** `cp-d`, after unit 15: "Sharps and flats checkpoint". completesUnits
[12, 13, 14, 15]. Pool: the 12 sign cards. Mix: name-accidental 100.

### Unit 16: "How long is a note?" (`--unit-16`, rhythm staff)
Subtitle: "Counting beats"

| id | title | concept | material | mix |
|---|---|---|---|---|
| u16-l1 | The beat | c-beat, c-one-beat | events RA | R1 |
| u16-l2 | 2-beat notes | c-two-beat | events RA | R2 |
| u16-l3 | Listen to the beat | c-listen | patterns RA (time 4); events RA | R3 |
| u16-l4 | Long and short | – | patterns RA; events RA | R4 |
| u16-l5 | Beats review | – | patterns RA; events RA | R5 |

### Unit 17: "Beats in a box" (`--unit-17`, rhythm staff)
Subtitle: "Boxes of 4, 3 and 2"

| id | title | concept | material | mix |
|---|---|---|---|---|
| u17-l1 | Boxes of 4 | c-box, c-top-number | patterns RA; events RA | B1 |
| u17-l2 | Finish the box | – | patterns RA; events RA | B2 |
| u17-l3 | 3-beat notes | c-three-beat | patterns RA, RD; events RA, RD | B1 |
| u17-l4 | Boxes of 3 and 2 | – | patterns RD; events RA, RD | B3 |
| u17-l5 | Boxes review | – | patterns RA, RD; events RA, RD | B4 |

### Unit 18: "Rests" (`--unit-18`, rhythm staff)
Subtitle: "Quiet beats count too"

| id | title | concept | material | mix |
|---|---|---|---|---|
| u18-l1 | 1-beat rests | c-rest | patterns RR (only those using Q); events RA, RR | Q1 |
| u18-l2 | Longer rests | c-long-rests | patterns RR; events RA, RD, RR | Q2 |
| u18-l3 | Hear the quiet | – | patterns RR; events RR | Q3 |
| u18-l4 | Rests review | – | patterns RA, RD, RR; events RA, RD, RR | Q4 |

### Unit 19: "Half beats" (`--unit-19`, rhythm staff)
Subtitle: "Two notes in one beat"

| id | title | concept | material | mix |
|---|---|---|---|---|
| u19-l1 | Half-beat pairs | c-half-beats | events RA, RE | H1 |
| u19-l2 | Counting with pairs | – | patterns RE; events RA, RE | B3 |
| u19-l3 | Listen for pairs | – | patterns RE; events RA, RE | H2 |
| u19-l4 | Rhythm review | – | patterns RA, RD, RR, RE; events all | Q4 |

**Checkpoint E** `cp-e`, after unit 19: "Rhythm checkpoint". completesUnits [16, 17, 18, 19].
Pool: no cards. Material: patterns RA, RD, RR, RE; events all. Mix: beats-of 30, count-box 35,
finish-box 35 (no listening questions in checkpoints).

### Unit 20: "Music in boxes" (`--unit-20`, single)
Subtitle: "Notes with lengths and signs"

| id | title | concept | material | mix |
|---|---|---|---|---|
| u20-l1 | Notes with lengths | c-real-music | melodies MT; events RA, RD | M1 |
| u20-l2 | A sign lasts the box | c-sign-lasts | melodies MS | M2 |
| u20-l3 | A new box starts fresh | c-fresh-box | melodies MF, MS | M2 |
| u20-l4 | Bass in boxes | – | melodies MB; patterns RA, RD | M3 |
| u20-l5 | Music review | – | melodies MT, MS, MF, MB; patterns RA, RD, RR, RE | M4 |

### Unit 21: "Home signs" (`--unit-21`, single)
Subtitle: "Signs for the whole piece"

| id | title | concept | material | mix |
|---|---|---|---|---|
| u21-l1 | One sharp: F♯ | c-home-sign | melodies kg1–kg4 | M2 |
| u21-l2 | One flat: B♭ | c-home-flat | melodies kf1–kf4 | M2 |
| u21-l3 | Two sharps, two flats | c-home-two | melodies kd1–kd3, kb1–kb3 | M2 |
| u21-l4 | Natural beats the home sign | c-home-natural | melodies MN, kg1–kg4 | M2 |
| u21-l5 | Home signs review | – | melodies MK, MN; patterns RA, RD | K1 |

### Unit 22: "Letters apart" (`--unit-22`, single)
Subtitle: "How far apart are two notes?"

| id | title | concept | intervalConfig | mix |
|---|---|---|---|---|
| u22-l1 | Steps and skips, counted | c-count-letters | clefs [treble], sizes [2, 3], stacked no | I1 |
| u22-l2 | 4 and 5 letters apart | c-bigger-gaps | clefs [treble], sizes [2, 3, 4, 5], stacked no | I1 |
| u22-l3 | Bass distances | – | clefs [bass], sizes [2, 3, 4, 5], stacked no | I1 |
| u22-l4 | Played together | c-together | clefs [treble], sizes [3, 4, 5], stacked yes | I1 |
| u22-l5 | Distances review | – | clefs [treble, bass], sizes [2, 3, 4, 5], stacked mixed | I1 |

**Checkpoint F** `cp-f`, after unit 22: "Reading checkpoint". completesUnits [20, 21, 22].
Pool: no fixed cards (cards come from the marked notes). Material: melodies MT, MS, MF, MB, MK,
MN; patterns RA, RD, RR; intervalConfig clefs [treble, bass], sizes [2, 3, 4, 5], stacked mixed.
Mix: name-in-music 50, interval-read 30, count-box 20.

### Unit 23: "Short melodies" (`--unit-23`, single)
Subtitle: "Read a whole tune"

| id | title | concept | material | mix |
|---|---|---|---|---|
| u23-l1 | Tunes that step | c-whole-tune | melodies MT-step | T1 |
| u23-l2 | Tunes that skip | – | melodies MT-skip | T2 |
| u23-l3 | Which tune? | – | melodies MT | T3 |
| u23-l4 | Tunes with a home sign | – | melodies kg1–kg4, kf1–kf4 | T4 |
| u23-l5 | Melodies review | – | melodies MT, MB, kg1–kg4, kf1–kf4 | T5 |

### Unit 24: "Both hands" (`--unit-24`, grand)
Subtitle: "Left and right together"

| id | title | concept | material | mix |
|---|---|---|---|---|
| u24-l1 | Lined up | c-both-hands | melodies MH | G1 |
| u24-l2 | Left-hand notes | c-left-hand | melodies MH (marked notes in the left hand only) | M2 |
| u24-l3 | Hands together | – | melodies MH | G2 |
| u24-l4 | Both hands review | – | melodies MH | G3 |

### Unit 25: "Note stacks" (`--unit-25`)
Subtitle: "Three notes at once"

| id | title | concept | render | material | mix |
|---|---|---|---|---|---|
| u25-l1 | Snowmen | c-stack | single | stacks ST; intervalConfig clefs [treble], sizes [3, 5], stacked yes | C1 |
| u25-l2 | Name the stack | c-stack-name | single | stacks SCFG | C2 |
| u25-l3 | More stacks | – | single | stacks ST | C3 |
| u25-l4 | Bass stacks | – | single | stacks SB | C2 |
| u25-l5 | Stacks with both hands | c-stack-hands | grand | stacks SH; melodies MH | C4 |
| u25-l6 | Grand finale | c-finale | single | stacks ST, SB; melodies MT, MS, MB, MK, MH; patterns RA, RD, RR, RE; pool (name-accidental) the 12 sign cards | C5 |

## 11. Concept cards (part 2)

| id | title | body | illustration |
|---|---|---|---|
| c-sharp | The sharp sign: ♯ | ♯ means: play the very next key to the right. Usually that's a black key. | keyboard C4–B4 with F and F♯ highlighted, an arrow from F to F♯ |
| c-sharp-staff | Where the ♯ goes | The ♯ is written just before the note, on the same line or space. F♯ sits where F sits. | treble staff with F4 and F#4 |
| c-flat | The flat sign: ♭ | ♭ means: play the very next key to the left. B♭ is the black key just left of B. | keyboard with B and B♭ highlighted, an arrow from B to B♭; treble staff with Bb4 |
| c-two-names | One key, two names | Every black key has two names. The key between G and A is G♯ and also A♭. Same key, same sound. | keyboard with the G♯/A♭ key highlighted, labelled "G♯" above and "A♭" below |
| c-bass-signs | Signs in the bass | ♯ and ♭ work the same way in the bass clef: right for ♯, left for ♭. | bass staff with F#3 and Bb2 |
| c-natural | The natural sign: ♮ | ♮ cancels a ♯ or ♭. It means: play the plain white key. | treble staff with F#4 then Fn4 (two notes); keyboard with F highlighted |
| c-signs-grand | Signs on both staffs | On the grand staff, signs work the same on top and bottom. Look at the clef first, then the sign. | grand staff with treble F#4 and bass Bb2 |
| c-beat | The beat | Music has a steady beat, like a ticking clock. We count it: 1, 2, 3, 4. | rhythm staff `q q q q`; "Play" plays it (with count-in) |
| c-one-beat | 1-beat notes | A filled note with a stick lasts 1 beat. | rhythm staff `q` |
| c-two-beat | 2-beat notes | An open note with a stick lasts 2 beats. The open note with no stick, the one you know, lasts 4 beats. | rhythm staff `h h` and `w`; "Play" |
| c-listen | Listen first | Tap Play to hear a rhythm. Soft clicks count the beat first, then the notes play. | rhythm staff `q q h`; "Play" |
| c-box | Boxes | Upright lines cut music into boxes. Every box holds the same number of beats. | rhythm staff with two boxes `q q h | w` |
| c-top-number | The top number | The two numbers at the start: the top one tells you how many beats fit in each box. | rhythm staff, time 4, `h h`, top number highlighted |
| c-three-beat | 3-beat notes | A dot after a 2-beat note adds 1 more beat: it lasts 3 beats. | rhythm staff, time 3, `h.`; "Play" |
| c-rest | Rests | A rest means: stay quiet. It still counts beats. This one is a 1-beat rest. | rhythm staff `q Q q Q`; "Play" |
| c-long-rests | Longer rests | A 2-beat rest sits on the line like a hat. A 4-beat rest hangs under it like a hole: a whole box of quiet. | rhythm staff `H h` and `W` |
| c-half-beats | Half-beat pairs | Two notes joined at the top share one beat. Count them "1 and". | rhythm staff `ee q q q`; "Play" |
| c-real-music | Real music | Real music shows both things at once: where the note sits tells you the key, its shape tells you how long. | melody t1; "Play" |
| c-sign-lasts | A sign lasts the box | A ♯ or ♭ keeps working for the same note until the end of the box. | melody s1 with the 4th note marked |
| c-fresh-box | Each box starts fresh | After the upright line, the sign is gone. The note is plain again unless it has its own sign. | melody f1 with the 5th note marked |
| c-home-sign | Home signs | A ♯ right after the clef is a home sign. It changes that letter everywhere in the piece. Here every F is F♯. | treble staff with home sign G and melody kg2 |
| c-home-flat | A flat home sign | A ♭ after the clef works the same way: here every B is B♭. | melody kf1 |
| c-home-two | Two home signs | Two signs after the clef change two letters. Check the home signs before you read. | melodies kd1 and kb1 (two staffs) |
| c-home-natural | ♮ beats the home sign | A ♮ makes the note plain, but only until the end of the box. | melody n1 with the 4th note marked |
| c-count-letters | Count the letters | To see how far apart two notes are, count every letter from one to the other, both included. C to E is C-D-E: 3 letters apart. A step is 2 letters apart, a skip is 3. | treble staff C4 then E4 |
| c-bigger-gaps | Bigger gaps | 4 letters apart goes from a line to a space (or a space to a line) with a gap. 5 letters apart goes line to line or space to space, with two gaps. | treble staff C4 then F4, then C4 then G4 |
| c-together | Notes played together | Notes drawn one on top of the other are played at the same time. Count the letters the same way. | treble staff with C4 and G4 stacked; "Play" plays them together |
| c-whole-tune | Read the shape | Good readers follow the shape of a tune: up or down, by a step or a skip. Listen and follow along. | melody t1; "Play" |
| c-both-hands | Lined up means together | On the grand staff, notes lined up one above the other are played together: right hand on top, left hand below. | melody h1; "Play" |
| c-left-hand | Left-hand notes | The left hand often plays long, low notes. Read them with your bass landmarks. | melody h3 with the left-hand notes marked |
| c-stack | Note stacks | Three notes stacked line-line-line or space-space-space make a note stack. It looks like a snowman. | treble staff with stack C4 E4 G4; "Play" plays it |
| c-stack-name | Naming a stack | A stack is named after its bottom note: C-E-G is the C stack. | treble stacks C, F, G side by side |
| c-stack-hands | Stacks with both hands | The left hand often plays one low note while the right hand plays a stack with the same name. | grand staff: bass C3, treble stack C4 E4 G4 |
| c-finale | The grand finale | This lesson mixes everything you've learned. Take your time! | grand staff, no notes |

Concept card pictures that use melodies or rhythms are drawn with the music view (SPEC §8.4).
"Play" on a rhythm or melody picture plays it as in SPEC §8.7.

## 12. UI text (part 2)

**Prompts:**
- name-accidental: "Which note is this?"
- find-key-pitch: "Tap this exact key on the piano."
- beats-of: note → "How many beats does this note last?"; rest → "How many beats does this rest last?"; pair → "How many beats does this pair last?"
- which-longer: "Which lasts longer?" (buttons "First note" / "Second note")
- count-box: "How many beats are in this box?"
- finish-box: "Which one finishes the box?"
- hear-rhythm: "Which rhythm did you hear?"
- name-in-music: "Which note is marked?"
- melody-move: "How does the marked note move?" (buttons as step-skip, 4 buttons)
- hear-melody: "Which tune did you hear?"
- interval-read: one after another → "How many letters apart are these notes?"; stacked → "How many letters apart are these two notes?"
- together-or-not: "Are these notes played together?" (buttons "Together" / "One after the other")
- stack-or-not: "Is this a note stack?" (buttons "Yes, a stack" / "No")
- stack-name: "Which stack is this?" (helper: "Name its bottom note.")

**Button labels:** beats → "1 beat", "2 beats", "3 beats", "4 beats"; interval sizes → "2 letters",
"3 letters", "4 letters", "5 letters"; listening/finish options are pictures with the accessible
names "Top rhythm", "Middle rhythm", "Bottom rhythm" / "Top tune", "Middle tune", "Bottom tune";
finish-box options have the accessible name of the event ("1-beat note", "2-beat rest" …).
Under the listening options: "Play again" (secondary, speaker icon).

**Event names** (feedback and accessible names): q "1-beat note", h "2-beat note", h. "3-beat note",
w "4-beat note", ee "half-beat pair", Q "1-beat rest", H "2-beat rest", W "4-beat rest".

**Wrong-answer text** (`{X}` in the part-1 wrong phrases):
- sign notes: the name with its symbol ("F♯", "B♭"); a natural card shown with ♮: the letter ("F").
- beats-of, count-box: "1 beat", "3 beats".
- which-longer: "the first note" / "the second note" (as part 1).
- finish-box: "a 2-beat note" / "a 1-beat rest" (article "a").
- hear-rhythm, hear-melody: "the top one" / "the middle one" / "the bottom one".
- melody-move: "step up" … (as step-skip).
- interval-read: "3 letters apart".
- together-or-not: "together" / "one after the other".
- stack-or-not: "a stack" / "not a stack".
- stack-name: "the {Letter} stack".

**Extra feedback lines** (shown under the usual feedback, right or wrong):
- name-accidental / find-key-pitch on a sharp card: "♯: one key to the right of {Letter}."; flat card:
  "♭: one key to the left of {Letter}."; natural card shown with ♮: "♮: the plain {Letter} key."
- find-key-pitch on a black key that is right: "That key is also called {other name}." when the
  other name is one of "F♯/G♭", "C♯/D♭", "G♯/A♭", "A♯/B♭", "D♯/E♭" (e.g. "That key is also called A♭.").
- name-in-music, when a box sign decided the answer: "The ♯ earlier in this box still counts."
  / "The ♭ earlier in this box still counts." / "The ♮ earlier in this box still counts."; when the
  home sign decided it: "The home sign makes every {Letter} a {Letter}♯." (or ♭); when a new box
  reset a sign: "New box: the sign from the last box is gone."
- count-box / finish-box: the count, e.g. "1 + 1 + 2 = 4 beats."
- interval-read: the letters counted, e.g. "C-D-E: 3 letters apart."
- stack-name: the letters, e.g. "C-E-G: the C stack."
- hear-rhythm / hear-melody: "Tap Play again to hear it once more."

**Sound off** (on a listening question while sound is muted): line "Turn on sound to hear this."
with a button "Turn on sound" (sets sound on, like the header toggle).

**Path end** (all 25 units done, `currentLesson` null): a card under the last unit with the
mascot (celebrating): "You've finished the whole course! Keep your reading sharp with Practise."

**Progress screen:** second chart heading "Sharps and flats" (chart hint as part 1); card names
in tooltips "Treble F♯", "Bass B♭".
