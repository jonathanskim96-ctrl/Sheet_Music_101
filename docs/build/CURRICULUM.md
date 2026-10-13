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
progress on this phone." · "Save a backup first" (secondary; saves the current progress, stays on
the sheet) / "Replace my progress" (danger) / "Cancel".

**Start over:** Sheet 1 title "Save a backup first?" body "Then you can get your progress back
later." buttons "Save backup" / "Continue without backup" / "Cancel". Sheet 2 title "Erase all
progress?" body "This can't be undone." buttons "Erase everything" (danger) / "Cancel".
