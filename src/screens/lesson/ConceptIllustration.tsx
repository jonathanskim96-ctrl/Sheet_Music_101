import { CONCEPT_CARDS, type ConceptCardId, type Illustration } from '../../domain/content';
import { letterOf, noteAtPosition, type Note } from '../../domain/notes';
import { Keyboard, whiteKeys, type KeyState } from '../../notation/Keyboard';
import { Staff, type StaffNote } from '../../notation/Staff';
import styles from './lesson.module.css';

function keyStates(
  from: Note,
  to: Note,
  emphasis: Extract<Illustration, { kind: 'keyboard' }>['emphasis'],
) {
  const states: Partial<Record<Note, KeyState>> = {};
  const black: Partial<Record<Note, KeyState>> = {};
  for (const n of whiteKeys(from, to)) {
    const letter = letterOf(n);
    if (emphasis === 'every-c' && letter === 'C') states[n] = 'highlight';
    if (emphasis === 'middle-c' && n === 'C4') states[n] = 'highlight';
    if (emphasis === 'black-key-groups') {
      // groups of 2 (after C, D) one colour, groups of 3 (after F, G, A) the other
      if (letter === 'C' || letter === 'D') black[n] = 'highlight';
      if (letter === 'F' || letter === 'G' || letter === 'A') black[n] = 'wrong';
    }
  }
  return { states, black };
}

/** The picture on a concept card, drawn from the plain data in content.ts. */
export function ConceptIllustration({ id }: { id: ConceptCardId }) {
  const ill = CONCEPT_CARDS[id].illustration;
  switch (ill.kind) {
    case 'letters':
      return (
        <div className={styles['letters']} aria-label="The letters A to G, then A again" role="img">
          {ill.letters.map((l) => (
            <span key={l} className={styles['letterTile']}>
              {l}
            </span>
          ))}
          <span className={`${styles['letterTile'] ?? ''} ${styles['letterAgain'] ?? ''}`}>
            {ill.trailing}
          </span>
        </div>
      );
    case 'keyboard': {
      const { states, black } = keyStates(ill.from, ill.to, ill.emphasis);
      return (
        <Keyboard
          from={ill.from}
          to={ill.to}
          states={states}
          blackStates={black}
          labelAll={ill.emphasis === 'letters'}
          disabled
          ariaLabel="Piano keyboard"
        />
      );
    }
    case 'staff': {
      // The "marks" picture puts a note at each marked position, with its word beside it.
      // Labels follow the notes by index, so the marked notes come first and a mark without a
      // note drops its label too.
      const marked = (ill.marks ?? []).flatMap((m) => {
        const note = noteAtPosition('treble', m.position);
        return note ? [{ note: { clef: 'treble' as const, note }, label: m.label }] : [];
      });
      const notes: StaffNote[] = [...marked.map((m) => m.note), ...ill.notes];
      return (
        <Staff
          mode={ill.mode}
          notes={notes}
          lineNumbers={ill.lineNumbers === true}
          {...(ill.marks ? { noteLabels: marked.map((m) => m.label) } : {})}
          ariaLabel="Music staff"
        />
      );
    }
    case 'staff-and-keyboard':
      return (
        <div className={styles['stack']}>
          <Staff mode={ill.staff.mode} notes={ill.staff.notes} ariaLabel="Grand staff" />
          <Keyboard
            from={ill.keyboard.from}
            to={ill.keyboard.to}
            states={{ [ill.keyboard.highlight]: 'highlight' }}
            disabled
            ariaLabel="Piano keyboard"
          />
        </div>
      );
    default: {
      const never: never = ill;
      return never;
    }
  }
}
