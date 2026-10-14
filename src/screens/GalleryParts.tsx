import type { ReactNode } from 'react';
import { ALL_CARDS, parseCardId } from '../domain/cards';
import { letterOf, type Note } from '../domain/notes';
import { Staff, type NoteState, type StaffNote } from '../notation/Staff';
import type { ButtonVariant } from '../ui/Button';
import type { MascotMood } from '../ui/Mascot';
import styles from './GalleryScreen.module.css';

export const MOODS: MascotMood[] = ['idle', 'happy', 'encouraging', 'celebrating'];
export const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger', 'choice'];
export const NOTE_STATES: NoteState[] = [
  'normal',
  'correct',
  'wrong',
  'ghost',
  'mastery-new',
  'mastery-learning',
  'mastery-almost',
  'mastery-known',
];

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={styles['section']} data-section={id} aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function CardGrid({ clef }: { clef: 'treble' | 'bass' }) {
  return (
    <div className={styles['grid']}>
      {ALL_CARDS.map((id) => {
        const card = parseCardId(id);
        if (card?.clef !== clef) return null;
        return (
          <div key={id} className={styles['cell']} data-testid="gallery-card" data-card={id}>
            <Staff mode={clef} notes={[{ clef, note: card.note }]} />
            <span className={styles['letter']}>{letterOf(card.note)}</span>
          </div>
        );
      })}
    </div>
  );
}

export const one = (clef: 'treble' | 'bass', note: Note, state?: NoteState): StaffNote =>
  state ? { clef, note, state } : { clef, note };
