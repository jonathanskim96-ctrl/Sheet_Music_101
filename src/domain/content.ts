// Learner-facing text, transcribed exactly from docs/build/CURRICULUM.md §3–§5.
import { parseCardId, type CardId } from './cards';
import {
  letterOf,
  pitchName,
  staffPosition,
  type Clef,
  type Letter,
  type Note,
  type Sign,
} from './notes';
import { beatsOf, type RhythmToken, type Time } from './music';
import { boxBeats, finishBoxAnswer, stepSkipValue, type Answer, type Question } from './questions';

// ---------------------------------------------------------------- concept cards

export const CONCEPT_CARD_IDS = [
  'c-alphabet',
  'c-black-keys',
  'c-find-c',
  'c-white-keys',
  'c-staff',
  'c-line-space',
  'c-higher',
  'c-treble-clef',
  'c-bass-clef',
  'c-grand-staff',
  'c-landmarks',
  'c-steps',
  'c-treble-lines',
  'c-treble-spaces',
  'c-bass-landmarks',
  'c-bass-lines',
  'c-bass-spaces',
  'c-grand-together',
  'c-ledger',
  'c-two-homes',
  'c-going-higher',
  'c-going-lower',
  'c-read-steps',
  'c-skips',
  // Course part 2 (CURRICULUM §11); the melody and stack cards arrive with M12–M13.
  'c-sharp',
  'c-sharp-staff',
  'c-flat',
  'c-two-names',
  'c-bass-signs',
  'c-natural',
  'c-signs-grand',
  // Rhythm (M11), in the order of the CURRICULUM §11 table
  'c-beat',
  'c-one-beat',
  'c-two-beat',
  'c-listen',
  'c-box',
  'c-top-number',
  'c-three-beat',
  'c-rest',
  'c-long-rests',
  'c-half-beats',
] as const;
export type ConceptCardId = (typeof CONCEPT_CARD_IDS)[number];

/** A note drawn on an illustration staff. */
export interface IllustrationNote {
  clef: Clef;
  note: Note;
  /** A printed sign before the head (course part 2). */
  sign?: Sign;
}

/**
 * What a concept card shows. Pure data: the UI (M3/M4) decides how to draw it.
 * `play` lists notes the optional "Play" button sounds, in order, 200 ms apart.
 */
export type Illustration =
  | { kind: 'letters'; letters: readonly Letter[]; trailing: Letter }
  | {
      kind: 'keyboard';
      from: Note;
      to: Note;
      emphasis: 'black-key-groups' | 'every-c' | 'letters' | 'middle-c';
    }
  | {
      kind: 'staff';
      mode: 'treble' | 'bass' | 'grand' | 'none';
      notes: readonly IllustrationNote[];
      /** Line numbers 1–5 drawn at the left (c-staff). */
      lineNumbers?: boolean;
      /** Labels on clefless staff positions (c-line-space). */
      marks?: readonly { position: number; label: string }[];
    }
  | {
      kind: 'staff-and-keyboard';
      staff: { mode: 'grand'; notes: readonly IllustrationNote[] };
      keyboard: { from: Note; to: Note; highlight: Note };
    }
  | {
      // Sharp/flat/natural pictures: a staff and/or a keyboard whose black keys can be lit.
      kind: 'sign-picture';
      staff?: { mode: 'treble' | 'bass' | 'grand'; notes: readonly IllustrationNote[] };
      keyboard?: {
        from: Note;
        to: Note;
        /** White keys to light. */
        white: readonly Note[];
        /** Black keys to light, each named by the white key just before it. */
        black: readonly Note[];
        /** An arrow from a white key to the black key (or back) it points at. */
        arrow?: { from: Note; to: 'right' | 'left' };
        /** Both names written on every black key. */
        blackLabels?: boolean;
      };
    }
  | { kind: 'rhythm'; pictures: readonly RhythmPicture[] };

/** One rhythm picture on a concept card: boxes of tokens on the one-line rhythm staff. */
export interface RhythmPicture {
  time: Time;
  boxes: readonly (readonly RhythmToken[])[];
  /** Draw the time numbers at the start (default: no). */
  showTime?: boolean;
  /** Highlight the top number (c-top-number). */
  highlightTop?: boolean;
}

export interface ConceptCardContent {
  title: string;
  body: string;
  illustration: Illustration;
  play?: readonly Note[];
  /** "Play" sounds the card's rhythm pictures one after the other (count-in = the first picture's time). */
  playRhythm?: true;
}

const t = (...notes: Note[]): IllustrationNote[] => notes.map((note) => ({ clef: 'treble', note }));
const b = (...notes: Note[]): IllustrationNote[] => notes.map((note) => ({ clef: 'bass', note }));
const ts = (note: Note, sign: Sign): IllustrationNote => ({ clef: 'treble', note, sign });
const bs = (note: Note, sign: Sign): IllustrationNote => ({ clef: 'bass', note, sign });

export const CONCEPT_CARDS: Record<ConceptCardId, ConceptCardContent> = {
  'c-alphabet': {
    title: 'Music uses 7 letters',
    body: 'Notes are named with just seven letters: A B C D E F G. After G, it starts again at A.',
    illustration: {
      kind: 'letters',
      letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      trailing: 'A',
    },
  },
  'c-black-keys': {
    title: 'Black keys come in groups',
    body: "Look at the black keys: they come in groups of 2 and groups of 3. They're your map of the piano.",
    illustration: { kind: 'keyboard', from: 'C3', to: 'B4', emphasis: 'black-key-groups' },
  },
  'c-find-c': {
    title: 'Finding C',
    body: 'C is the white key just to the left of each group of 2 black keys.',
    illustration: { kind: 'keyboard', from: 'C3', to: 'B4', emphasis: 'every-c' },
  },
  'c-white-keys': {
    title: 'The white keys',
    body: 'From C, the white keys go C D E F G A B, and then C again.',
    illustration: { kind: 'keyboard', from: 'C4', to: 'B4', emphasis: 'letters' },
  },
  'c-staff': {
    title: 'The staff',
    body: 'Music is written on 5 lines called the staff. We count the lines from the bottom: 1 to 5.',
    illustration: { kind: 'staff', mode: 'none', notes: [], lineNumbers: true },
  },
  'c-line-space': {
    title: 'Lines and spaces',
    body: 'A note sits ON a line (the line goes through its middle) or IN a space (between two lines).',
    illustration: {
      kind: 'staff',
      mode: 'none',
      notes: [],
      marks: [
        { position: 2, label: 'line' },
        { position: 5, label: 'space' },
      ],
    },
  },
  'c-higher': {
    title: 'Higher on the staff, higher sound',
    body: 'The higher a note sits on the staff, the higher it sounds.',
    illustration: {
      kind: 'staff',
      mode: 'treble',
      notes: t('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'),
    },
    play: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
  },
  'c-treble-clef': {
    title: 'The treble clef',
    body: "This is the treble clef. It's for higher notes, usually played by your right hand.",
    illustration: { kind: 'staff', mode: 'treble', notes: [] },
  },
  'c-bass-clef': {
    title: 'The bass clef',
    body: "This is the bass clef. It's for lower notes, usually played by your left hand.",
    illustration: { kind: 'staff', mode: 'bass', notes: [] },
  },
  'c-grand-staff': {
    title: 'The grand staff',
    body: "Piano music uses both: treble on top, bass below. Together they're called the grand staff.",
    illustration: { kind: 'staff', mode: 'grand', notes: [] },
  },
  'c-landmarks': {
    title: 'Landmark notes',
    body: "Instead of memorising every note at once, we'll learn a few landmarks first. Then you can find any note by stepping from the nearest landmark.",
    illustration: { kind: 'staff', mode: 'treble', notes: t('C4', 'G4', 'C5') },
  },
  'c-steps': {
    title: 'Steps',
    body: 'From a line to the very next space (or a space to the very next line) is one step. Each step up is the next letter: C, D, E…',
    illustration: { kind: 'staff', mode: 'treble', notes: t('C4', 'D4', 'E4') },
  },
  'c-treble-lines': {
    title: 'Treble lines: E G B D F',
    body: 'The five treble lines from the bottom are E, G, B, D, F. Remember: Every Good Boy Does Fine.',
    illustration: { kind: 'staff', mode: 'treble', notes: t('E4', 'G4', 'B4', 'D5', 'F5') },
  },
  'c-treble-spaces': {
    title: 'Treble spaces: F A C E',
    body: 'The four treble spaces from the bottom spell FACE.',
    illustration: { kind: 'staff', mode: 'treble', notes: t('F4', 'A4', 'C5', 'E5') },
  },
  'c-bass-landmarks': {
    title: 'Bass landmarks',
    body: 'The bass staff has its own landmarks: Bass F, Bass C, and our old friend Middle C, just above the staff.',
    illustration: { kind: 'staff', mode: 'bass', notes: b('C3', 'F3', 'C4') },
  },
  'c-bass-lines': {
    title: 'Bass lines: G B D F A',
    body: 'The five bass lines from the bottom are G, B, D, F, A. Remember: Good Boys Do Fine Always.',
    illustration: { kind: 'staff', mode: 'bass', notes: b('G2', 'B2', 'D3', 'F3', 'A3') },
  },
  'c-bass-spaces': {
    title: 'Bass spaces: A C E G',
    body: 'The four bass spaces from the bottom are A, C, E, G. Remember: All Cows Eat Grass.',
    illustration: { kind: 'staff', mode: 'bass', notes: b('A2', 'C3', 'E3', 'G3') },
  },
  'c-grand-together': {
    title: 'Both clefs together',
    body: 'On the grand staff, look at the clef first: it tells you which landmarks to use. Middle C is the bridge between them.',
    illustration: {
      kind: 'staff',
      mode: 'grand',
      notes: [...t('C4', 'G4', 'C5'), ...b('C3', 'F3', 'C4')],
    },
  },
  'c-ledger': {
    title: 'Ledger lines',
    body: 'Short extra lines called ledger lines stretch the staff. Middle C sits on the first ledger line below the treble staff.',
    illustration: { kind: 'staff', mode: 'grand', notes: t('C4', 'A3') },
  },
  'c-two-homes': {
    title: 'Same note, two homes',
    body: "Notes near Middle C can be written in either clef. It's the same key on the piano, just written in a different place.",
    illustration: {
      kind: 'staff-and-keyboard',
      staff: { mode: 'grand', notes: [...t('C4'), ...b('C4')] },
      keyboard: { from: 'C3', to: 'B4', highlight: 'C4' },
    },
  },
  'c-going-higher': {
    title: 'Going higher',
    body: 'Above the treble staff, ledger lines keep going up. High C sits on the second ledger line.',
    illustration: { kind: 'staff', mode: 'treble', notes: t('G5', 'A5', 'B5', 'C6') },
  },
  'c-going-lower': {
    title: 'Going lower',
    body: 'Below the bass staff, ledger lines keep going down. Low C sits on the second ledger line.',
    illustration: { kind: 'staff', mode: 'bass', notes: b('F2', 'E2', 'D2', 'C2') },
  },
  'c-read-steps': {
    title: 'Read by steps',
    body: "Good readers don't name every note. They see how far the next note moves. A step goes line to space or space to line.",
    illustration: { kind: 'staff', mode: 'treble', notes: t('E4', 'F4') },
  },
  'c-skips': {
    title: 'Skips',
    body: 'A skip goes line to line or space to space. You skip one letter: C to E.',
    illustration: { kind: 'staff', mode: 'treble', notes: t('E4', 'G4') },
  },
  'c-sharp': {
    title: 'The sharp sign: ♯',
    body: "♯ means: play the very next key to the right. Usually that's a black key.",
    illustration: {
      kind: 'sign-picture',
      keyboard: {
        from: 'C4',
        to: 'B4',
        white: ['F4'],
        black: ['F4'],
        arrow: { from: 'F4', to: 'right' },
      },
    },
  },
  'c-sharp-staff': {
    title: 'Where the ♯ goes',
    body: 'The ♯ is written just before the note, on the same line or space. F♯ sits where F sits.',
    illustration: {
      kind: 'sign-picture',
      staff: { mode: 'treble', notes: [...t('F4'), ts('F4', 'sharp')] },
    },
  },
  'c-flat': {
    title: 'The flat sign: ♭',
    body: '♭ means: play the very next key to the left. B♭ is the black key just left of B.',
    illustration: {
      kind: 'sign-picture',
      staff: { mode: 'treble', notes: [ts('B4', 'flat')] },
      keyboard: {
        from: 'C4',
        to: 'B4',
        white: ['B4'],
        black: ['A4'],
        arrow: { from: 'B4', to: 'left' },
      },
    },
  },
  'c-two-names': {
    title: 'One key, two names',
    body: 'Every black key has two names. The key between G and A is G♯ and also A♭. Same key, same sound.',
    illustration: {
      kind: 'sign-picture',
      keyboard: { from: 'C4', to: 'B4', white: [], black: ['G4'], blackLabels: true },
    },
  },
  'c-bass-signs': {
    title: 'Signs in the bass',
    body: '♯ and ♭ work the same way in the bass clef: right for ♯, left for ♭.',
    illustration: {
      kind: 'sign-picture',
      staff: { mode: 'bass', notes: [bs('F3', 'sharp'), bs('B2', 'flat')] },
    },
  },
  'c-natural': {
    title: 'The natural sign: ♮',
    body: '♮ cancels a ♯ or ♭. It means: play the plain white key.',
    illustration: {
      kind: 'sign-picture',
      staff: { mode: 'treble', notes: [ts('F4', 'sharp'), ts('F4', 'natural')] },
      keyboard: { from: 'C4', to: 'B4', white: ['F4'], black: [] },
    },
  },
  'c-signs-grand': {
    title: 'Signs on both staffs',
    body: 'On the grand staff, signs work the same on top and bottom. Look at the clef first, then the sign.',
    illustration: {
      kind: 'sign-picture',
      staff: { mode: 'grand', notes: [ts('F4', 'sharp'), bs('B2', 'flat')] },
    },
  },
  'c-beat': {
    title: 'The beat',
    body: 'Music has a steady beat, like a ticking clock. We count it: 1, 2, 3, 4.',
    illustration: { kind: 'rhythm', pictures: [{ time: 4, boxes: [['q', 'q', 'q', 'q']] }] },
    playRhythm: true,
  },
  'c-one-beat': {
    title: '1-beat notes',
    body: 'A filled note with a stick lasts 1 beat.',
    illustration: { kind: 'rhythm', pictures: [{ time: 4, boxes: [['q']] }] },
  },
  'c-two-beat': {
    title: '2-beat notes',
    body: 'An open note with a stick lasts 2 beats. The open note with no stick, the one you know, lasts 4 beats.',
    illustration: {
      kind: 'rhythm',
      pictures: [
        { time: 4, boxes: [['h', 'h']] },
        { time: 4, boxes: [['w']] },
      ],
    },
    playRhythm: true,
  },
  'c-listen': {
    title: 'Listen first',
    body: 'Tap Play to hear a rhythm. Soft clicks count the beat first, then the notes play.',
    illustration: { kind: 'rhythm', pictures: [{ time: 4, boxes: [['q', 'q', 'h']] }] },
    playRhythm: true,
  },
  'c-box': {
    title: 'Boxes',
    body: 'Upright lines cut music into boxes. Every box holds the same number of beats.',
    illustration: {
      kind: 'rhythm',
      pictures: [
        {
          time: 4,
          boxes: [['q', 'q', 'h'], ['w']],
        },
      ],
    },
  },
  'c-top-number': {
    title: 'The top number',
    body: 'The two numbers at the start: the top one tells you how many beats fit in each box.',
    illustration: {
      kind: 'rhythm',
      pictures: [{ time: 4, boxes: [['h', 'h']], showTime: true, highlightTop: true }],
    },
  },
  'c-three-beat': {
    title: '3-beat notes',
    body: 'A dot after a 2-beat note adds 1 more beat: it lasts 3 beats.',
    illustration: {
      kind: 'rhythm',
      pictures: [{ time: 3, boxes: [['h.']], showTime: true }],
    },
    playRhythm: true,
  },
  'c-rest': {
    title: 'Rests',
    body: 'A rest means: stay quiet. It still counts beats. This one is a 1-beat rest.',
    illustration: { kind: 'rhythm', pictures: [{ time: 4, boxes: [['q', 'Q', 'q', 'Q']] }] },
    playRhythm: true,
  },
  'c-long-rests': {
    title: 'Longer rests',
    body: 'A 2-beat rest sits on the line like a hat. A 4-beat rest hangs under it like a hole: a whole box of quiet.',
    illustration: {
      kind: 'rhythm',
      pictures: [
        { time: 4, boxes: [['H', 'h']] },
        { time: 4, boxes: [['W']] },
      ],
    },
  },
  'c-half-beats': {
    title: 'Half-beat pairs',
    body: 'Two notes joined at the top share one beat. Count them "1 and".',
    illustration: { kind: 'rhythm', pictures: [{ time: 4, boxes: [['ee', 'q', 'q', 'q']] }] },
    playRhythm: true,
  },
};

// ---------------------------------------------------------------- nicknames and tips

/** Landmark nicknames shown instead of the letter (CURRICULUM §4). */
export const NICKNAMES: Partial<Record<CardId, string>> = {
  'treble-C4': 'Middle C',
  'bass-C4': 'Middle C',
  'treble-G4': 'Treble G',
  'treble-C5': 'Treble C',
  'treble-C6': 'High C',
  'bass-F3': 'Bass F',
  'bass-C3': 'Bass C',
  'bass-C2': 'Low C',
};

/** The Meet-card tip of a sharp or flat card (CURRICULUM §7). */
export const SHARP_TIP = 'The ♯ in front means: play the very next key to the right.';
export const FLAT_TIP = 'The ♭ in front means: play the very next key to the left.';

/** Extra sentence on the Meet card for landmark notes. */
export const TIPS: Partial<Record<CardId, string>> = {
  'treble-C4':
    "Middle C sits on its own little ledger line below the treble staff. It's the C near the middle of the piano.",
  'treble-G4': "The treble clef curls around this line. That's why it's also called the G clef.",
  'treble-C5': 'Treble C is in the 3rd space, exactly one octave above Middle C.',
  'bass-C4':
    'In the bass clef, Middle C sits on a little ledger line above the staff. Same key on the piano!',
  'bass-F3': "The two dots of the bass clef hug this line. That's why it's also called the F clef.",
  'bass-C3': 'Bass C is in the 2nd space, exactly one octave below Middle C.',
  'treble-C6': 'High C has two ledger lines above the treble staff.',
  'bass-C2': 'Low C has two ledger lines below the bass staff.',
};

// ---------------------------------------------------------------- UI text (CURRICULUM §5)

export const PROMPTS = {
  nameNote: 'Which note is this?',
  findKeyLetter: 'Tap this note on the piano.',
  findKeyExact: 'Tap this exact key on the piano.',
  findOnStaffHelper: 'Tap the staff, then use ▲ ▼ to adjust.',
  stepSkip2: 'Does the second note step up or step down?',
  stepSkip4: 'How does the second note move?',
  lineOrSpace: 'Is this note on a line or in a space?',
  higherLower: 'Which note is higher?',
  clefIdentify: 'Which clef is this?',
  // Course part 2 (CURRICULUM §12)
  nameAccidental: 'Which note is this?',
  findKeyPitch: 'Tap this exact key on the piano.',
  beatsOfNote: 'How many beats does this note last?',
  beatsOfRest: 'How many beats does this rest last?',
  beatsOfPair: 'How many beats does this pair last?',
  whichLonger: 'Which lasts longer?',
  countBox: 'How many beats are in this box?',
  finishBox: 'Which one finishes the box?',
  hearRhythm: 'Which rhythm did you hear?',
} as const;

export const BUTTON_LABELS = {
  firstNote: 'First note',
  secondNote: 'Second note',
  trebleClef: 'Treble clef',
  bassClef: 'Bass clef',
  stepUp: 'Step up',
  stepDown: 'Step down',
  skipUp: 'Skip up',
  skipDown: 'Skip down',
} as const;

/** The "1 beat" … "4 beats" answer buttons (CURRICULUM §12). */
export const BEATS_LABELS = ['1 beat', '2 beats', '3 beats', '4 beats'] as const;

/** "Put a {Letter} on the staff." */
export function findOnStaffPrompt(letter: Letter): string {
  return `Put a ${letter} on the staff.`;
}
/** "Which letter comes {after|before} {Letter}?" */
export function alphabetNextPrompt(direction: 'after' | 'before', letter: Letter): string {
  return `Which letter comes ${direction} ${letter}?`;
}
/** "Tap a {Letter} key." */
export function keyboardLetterPrompt(letter: Letter): string {
  return `Tap a ${letter} key.`;
}

/** The prompt line for a question. */
export function promptFor(q: Question): string {
  switch (q.kind) {
    case 'name-note':
      return PROMPTS.nameNote;
    case 'find-key-letter':
      return PROMPTS.findKeyLetter;
    case 'find-key-exact':
      return PROMPTS.findKeyExact;
    case 'find-on-staff':
      return findOnStaffPrompt(letterOfCard(q.card));
    case 'step-skip':
      return q.buttons === 2 ? PROMPTS.stepSkip2 : PROMPTS.stepSkip4;
    case 'alphabet-next':
      return alphabetNextPrompt(q.direction, q.letter);
    case 'keyboard-letter':
      return keyboardLetterPrompt(q.letter);
    case 'line-or-space':
      return PROMPTS.lineOrSpace;
    case 'higher-lower':
      return PROMPTS.higherLower;
    case 'clef-identify':
      return PROMPTS.clefIdentify;
    case 'name-accidental':
      return PROMPTS.nameAccidental;
    case 'find-key-pitch':
      return PROMPTS.findKeyPitch;
    case 'beats-of':
      return q.token === 'ee'
        ? PROMPTS.beatsOfPair
        : q.token === 'Q' || q.token === 'H' || q.token === 'W'
          ? PROMPTS.beatsOfRest
          : PROMPTS.beatsOfNote;
    case 'which-longer':
      return PROMPTS.whichLonger;
    case 'count-box':
      return PROMPTS.countBox;
    case 'finish-box':
      return PROMPTS.finishBox;
    case 'hear-rhythm':
      return PROMPTS.hearRhythm;
    default:
      return assertNever(q);
  }
}

function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(x)}`);
}

/** Extra feedback line for "Tap this note on the piano": any key with the letter counts (M6 step 1). */
export function anyKeyWorks(letter: Letter): string {
  return `Any ${letter} key works.`;
}

/**
 * Names a step-skip move and why, e.g. "It's a skip up: line to line." A step goes line to space
 * (or back); a skip goes line to line or space to space (CURRICULUM concept cards).
 */
export function stepSkipExplanation(q: Extract<Question, { kind: 'step-skip' }>): string {
  const [size, direction] = stepSkipValue(q.first, q.second).split('-');
  const where = (n: Note): string =>
    Math.abs(staffPosition(q.clef, n) % 2) === 0 ? 'line' : 'space';
  return `It's a ${size ?? ''} ${direction ?? ''}: ${where(q.first)} to ${where(q.second)}.`;
}

/** Letter of a card id such as 'treble-G4' (only used for the prompt text). */
function letterOfCard(card: CardId): Letter {
  const parts = parseCardId(card);
  if (!parts) throw new Error(`Unknown card: ${card}`);
  return letterOf(parts.note);
}

// ---------------------------------------------------------------- part 2 feedback (CURRICULUM §12)

/** A card's name for sharp/flat questions: the letter and sign only, never a landmark nickname. */
export function pitchNameOfCard(card: CardId): string {
  const parts = parseCardId(card);
  if (!parts) throw new Error(`Unknown card: ${card}`);
  return pitchName({ note: parts.note, sign: parts.sign });
}

/**
 * The extra line under name-accidental / find-key-pitch feedback: where a sharp or flat sits
 * relative to its plain key, or what a natural sign means. Null for a plain card with no ♮ shown.
 */
export function signLine(card: CardId, showNatural: boolean): string | null {
  const parts = parseCardId(card);
  if (!parts) return null;
  const letter = letterOf(parts.note);
  if (parts.sign === 'sharp') return `♯: one key to the right of ${letter}.`;
  if (parts.sign === 'flat') return `♭: one key to the left of ${letter}.`;
  return showNatural ? `♮: the plain ${letter} key.` : null;
}

/** The other name of a black key ("A♭" for G♯), or null for a plain card. */
export function otherKeyName(card: CardId): string | null {
  const parts = parseCardId(card);
  if (!parts || parts.sign === 'natural') return null;
  const letters: readonly Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const i = letters.indexOf(letterOf(parts.note));
  const next = letters[(i + 1) % 7] ?? 'C';
  const prev = letters[(i + 6) % 7] ?? 'B';
  return parts.sign === 'sharp' ? `${next}♭` : `${prev}♯`;
}

/** "That key is also called A♭." (shown after a right black-key answer). */
export function alsoCalled(card: CardId): string | null {
  const other = otherKeyName(card);
  return other === null ? null : `That key is also called ${other}.`;
}

// ---------------------------------------------------------------- rhythm texts (CURRICULUM §12)

/** What a note or rest is called, for feedback and accessible names. */
export const EVENT_NAMES: Record<RhythmToken, string> = {
  q: '1-beat note',
  h: '2-beat note',
  'h.': '3-beat note',
  w: '4-beat note',
  ee: 'half-beat pair',
  Q: '1-beat rest',
  H: '2-beat rest',
  W: '4-beat rest',
};

/** The pictures of a listening question, by position (accessible names, and "the top one" in feedback). */
export const RHYTHM_OPTION_NAMES = ['Top rhythm', 'Middle rhythm', 'Bottom rhythm'] as const;
export const OPTION_TEXT = ['the top one', 'the middle one', 'the bottom one'] as const;

/** The replay button under a listening question. */
export const PLAY_AGAIN = 'Play again';
/** Extra feedback line under a listening question, right or wrong. */
export const HEAR_AGAIN_LINE = 'Tap Play again to hear it once more.';
/** A listening question while sound is muted. */
export const SOUND_OFF = { line: 'Turn on sound to hear this.', button: 'Turn on sound' } as const;

/** "a 2-beat note" / "a 1-beat rest": a finish-box answer inside "It's {X}." */
export function withArticle(t: RhythmToken): string {
  return `a ${EVENT_NAMES[t]}`;
}

/** "1 + 1 + 2 = 4 beats." for a finished box (rests count). */
export function beatSumLine(box: readonly RhythmToken[]): string {
  return `${box.map((t) => String(beatsOf(t))).join(' + ')} = ${String(boxBeats(box))} beats.`;
}

/** The box a finish-box question ends up with when answered correctly. */
export function finishedBox(q: Extract<Question, { kind: 'finish-box' }>): RhythmToken[] {
  const right = q.options[finishBoxAnswer(q)];
  return right === undefined ? [...q.box] : [...q.box, right];
}

/** Heading of the second Progress chart (CURRICULUM §12). */
export const SIGN_CHART_TITLE = 'Sharps and flats';

export const CORRECT_PHRASES: readonly string[] = [
  'Nice!',
  'You got it!',
  'Great reading!',
  'Spot on!',
  'Excellent!',
  'Keep it up!',
  'Perfect!',
  'Sharp eyes!',
  'Nailed it!',
  "That's the one!",
];

/** `{X}` is the right answer as text: `cardName` for notes, `CHOICE_TEXT` for choices. */
export const WRONG_PHRASES: readonly string[] = [
  "Almost! It's {X}.",
  'Not quite. This one is {X}.',
  "Good try! It's {X}.",
  'Close! The answer is {X}.',
];

/** Fills `{X}` in a wrong-answer phrase. */
export function fillWrongPhrase(template: string, x: string): string {
  return template.replace('{X}', x);
}

/** The text for a choice answer inside "It's {X}." (CURRICULUM §5). */
export const CHOICE_TEXT = {
  line: 'a line',
  space: 'a space',
  first: 'the first note',
  second: 'the second note',
  treble: 'the treble clef',
  bass: 'the bass clef',
  'step-up': 'step up',
  'step-down': 'step down',
  'skip-up': 'skip up',
  'skip-down': 'skip down',
  'beats-1': '1 beat',
  'beats-2': '2 beats',
  'beats-3': '3 beats',
  'beats-4': '4 beats',
} as const satisfies Record<Extract<Answer, { kind: 'choice' }>['value'], string>;

/** A card's display name: its nickname if it has one, else its letter with any sign ('F', 'F♯'). */
export function cardName(card: CardId): string {
  const nickname = NICKNAMES[card];
  if (nickname !== undefined) return nickname;
  const parts = parseCardId(card);
  if (!parts) throw new Error(`Unknown card: ${card}`);
  return pitchName({ note: parts.note, sign: parts.sign });
}

export const COMBO_MILESTONES: readonly { at: number; text: string }[] = [
  { at: 3, text: '3 in a row!' },
  { at: 5, text: '5 in a row!' },
  { at: 10, text: '10 in a row!' },
];

export const LESSON_COMPLETE = {
  titlePerfect: 'Perfect lesson!',
  titleNormal: 'Lesson complete!',
  titleReview: 'Practice complete!',
  titleCheckpointPassed: 'Checkpoint passed!',
  titleCheckpointFailed: 'Good effort!',
  mascotLines: [
    "You're getting the hang of this!",
    'Your eyes are getting faster!',
    'Bravo!',
    'That was music to my ears!',
    'Brilliant reading!',
  ],
  perfectLine: 'Not a single slip!',
  checkpointFailedLine: "Not this time. Keep going with the lessons and you'll get there!",
  checkpointPassedLine: "You've unlocked everything up to here!",
  dailyGoalBanner: 'Daily goal reached! See you tomorrow.',
  statLabels: { xp: 'XP earned', accuracy: 'Accuracy', time: 'Time', combo: 'Best combo' },
} as const;

/** The checkpoint node on the Path: SPEC 7.2 ("Jump ahead" until the unit before it is done). */
export const CHECKPOINT_NODE = { jumpAhead: 'Jump ahead', testYourself: 'Test yourself' } as const;

export const WELCOME = {
  bubble: "Hi, I'm Quaver!",
  body: "I'll help you read piano music, one note at a time. A few minutes a day is all it takes.",
  button: "Let's start",
} as const;

export const KEYBOARD_UNLOCKED = {
  title: 'New: piano keyboard!',
  body: "You can now find notes on the piano. Try Level 2 on any unit you've finished.",
  button: 'Cool!',
} as const;

/** iPhones mute Web Audio in Silent mode; the app obeys that and says so (SPEC 7.7). */
export const SILENT_HINT = "No sound? Check that your iPhone isn't on Silent.";

export const LEAVE_LESSON = {
  title: 'Leave this lesson?',
  body: "Your answers in this lesson won't be saved.",
  keepGoing: 'Keep going',
  leave: 'Leave',
} as const;

export const INSTALL_CARD = {
  title: 'Install Sheet Music 101',
  body: 'Add it to your home screen so it opens like an app and your progress stays safe.',
  install: 'Install',
  iosExtra: "Tap the Share button, then 'Add to Home Screen'.",
  dismiss: 'Not now',
} as const;

export const BACKUP_REMINDER = {
  title: 'Save a backup',
  body: 'Keep a copy of your progress in case you change phones.',
  save: 'Save backup',
  later: 'Later',
} as const;

export const TOASTS = {
  lockedLesson: 'Finish the lesson before this one first.',
  storageUnavailable:
    "This browser won't let the app save progress. It will reset when you close it.",
  repaired: 'Some saved data was damaged and has been repaired.',
  exportDone: 'Backup saved.',
  importDone: 'Progress restored.',
  importTooBig: 'That file is too big to be a backup.',
  importNotBackup: "That file isn't a Sheet Music 101 backup.",
  importDamaged: "That backup file is damaged and can't be used.",
  tryAgain: 'Try again',
} as const;

/** "Couldn't save your progress: {reason}" */
export function saveFailedText(reason: string): string {
  return `Couldn't save your progress: ${reason}`;
}

export const IMPORT_PREVIEW = {
  title: 'Restore this backup?',
  warning: 'This replaces your current progress on this phone.',
  saveFirst: 'Save a backup first',
  replace: 'Replace my progress',
  cancel: 'Cancel',
} as const;

/** "Saved on {date}" */
export function importSavedOn(date: string): string {
  return `Saved on ${date}`;
}
/** "{xp} XP · {lessons} lessons · {days} days practised" */
export function importSummaryLine(xp: number, lessons: number, days: number): string {
  return `${String(xp)} XP · ${String(lessons)} lessons · ${String(days)} days practised`;
}

export const START_OVER = {
  step1: {
    title: 'Save a backup first?',
    body: 'Then you can get your progress back later.',
    save: 'Save backup',
    skip: 'Continue without backup',
    cancel: 'Cancel',
  },
  step2: {
    title: 'Erase all progress?',
    body: "This can't be undone.",
    erase: 'Erase everything',
    cancel: 'Cancel',
  },
} as const;

/** The message of anything thrown (an Error, a string, or something else). */
export function errorMessageOf(e: unknown): string {
  if (e instanceof Error && e.message !== '') return e.message;
  if (typeof e === 'string' && e !== '') return e;
  return 'Unknown error';
}

/** "Something went wrong: {message}" for toasts and alerts (SPEC 7.10). */
export function somethingWentWrong(e: unknown): string {
  return `Something went wrong: ${errorMessageOf(e)}`;
}
