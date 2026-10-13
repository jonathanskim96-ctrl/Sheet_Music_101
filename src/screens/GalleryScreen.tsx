import { useState, type ReactNode } from 'react';
import { ALL_CARDS, parseCardId } from '../domain/cards';
import { letterOf, noteAtPosition, type Note } from '../domain/notes';
import { synth } from '../audio/synth';
import { Keyboard } from '../notation/Keyboard';
import { Staff, type NoteState, type StaffNote } from '../notation/Staff';
import { Button, type ButtonVariant } from '../ui/Button';
import { Confetti } from '../ui/Confetti';
import { DailyGoalRing } from '../ui/DailyGoalRing';
import { Check } from '../ui/icons';
import { Mascot, type MascotMood } from '../ui/Mascot';
import { ProgressBar } from '../ui/ProgressBar';
import { Sheet } from '../ui/Sheet';
import styles from './GalleryScreen.module.css';

const MOODS: MascotMood[] = ['idle', 'happy', 'encouraging', 'celebrating'];
const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger', 'choice'];
const NOTE_STATES: NoteState[] = [
  'normal',
  'correct',
  'wrong',
  'ghost',
  'mastery-new',
  'mastery-learning',
  'mastery-almost',
  'mastery-known',
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className={styles['section']} data-section={id} aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function CardGrid({ clef }: { clef: 'treble' | 'bass' }) {
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

const one = (clef: 'treble' | 'bass', note: Note, state?: NoteState): StaffNote =>
  state ? { clef, note, state } : { clef, note };

/** Dev/e2e-only page that shows every visual building block for visual QA. */
export function GalleryScreen() {
  const [lastKey, setLastKey] = useState('none');
  const [lastPosition, setLastPosition] = useState<number | null>(null);
  const ghost = lastPosition === null ? null : noteAtPosition('treble', lastPosition);
  const [confettiRun, setConfettiRun] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [stackA, setStackA] = useState(false);
  const [sheet2, setSheet2] = useState(false);

  return (
    <main className={styles['page']}>
      <h1>Gallery</h1>

      <Section id="treble-cards" title="Treble cards">
        <CardGrid clef="treble" />
      </Section>

      <Section id="bass-cards" title="Bass cards">
        <CardGrid clef="bass" />
      </Section>

      <Section id="grand-staff" title="Grand staff">
        <div className={styles['stack']}>
          <Staff
            mode="grand"
            ariaLabel="Grand staff example"
            notes={[one('treble', 'G4'), one('treble', 'C5'), one('bass', 'F3'), one('bass', 'C3')]}
          />
          <Staff
            mode="grand"
            ariaLabel="Grand staff with Middle C"
            notes={[one('treble', 'C4'), one('bass', 'C4')]}
          />
        </div>
      </Section>

      <Section id="ledger-lines" title="Ledger lines">
        <div className={styles['grid']}>
          {(
            [
              ['treble', 'A3'],
              ['treble', 'C6'],
              ['bass', 'C2'],
              ['bass', 'E4'],
            ] as const
          ).map(([clef, note]) => (
            <div key={`${clef}-${note}`} className={styles['cell']}>
              <Staff mode={clef} notes={[one(clef, note)]} />
              <span className={styles['letter']}>{letterOf(note)}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="note-states" title="Note states">
        <div className={styles['grid']}>
          {NOTE_STATES.map((state) => (
            <div key={state} className={styles['cell']}>
              <Staff mode="treble" notes={[one('treble', 'G4', state)]} />
              <span className={styles['muted']}>{state}</span>
            </div>
          ))}
        </div>
        <h3>No clef (unit 1)</h3>
        <Staff mode="none" notes={[]} ariaLabel="Five empty staff lines" />
        <h3>Highlighted lines</h3>
        <Staff
          mode="treble"
          notes={[]}
          highlightLines={[2]}
          ariaLabel="Treble staff, second line highlighted"
        />
        <h3>Tappable staff</h3>
        <Staff
          mode="treble"
          notes={ghost === null ? [] : [{ clef: 'treble', note: ghost, state: 'ghost' }]}
          onTapPosition={setLastPosition}
          ariaLabel="Tappable staff"
        />
        <p className={styles['muted']} data-testid="last-position">
          Last position: {lastPosition === null ? 'none' : String(lastPosition)}
        </p>
      </Section>

      <Section id="keyboard" title="Keyboard">
        <div className={styles['stack']}>
          <Keyboard
            from="C3"
            to="B4"
            ariaLabel="Keyboard C3 to B4"
            onPress={(k) => {
              setLastKey(k);
            }}
          />
          <p className={styles['muted']} data-testid="last-key">
            Last key: {lastKey}
          </p>
          <Keyboard
            from="C3"
            to="B4"
            states={{ G3: 'highlight' }}
            ariaLabel="One key highlighted"
          />
          <Keyboard
            from="C3"
            to="B4"
            states={{ G3: 'highlight', E3: 'wrong' }}
            ariaLabel="Wrong and right keys"
          />
          <Keyboard
            from="C3"
            to="B4"
            states={{ C3: 'dimmed', D3: 'dimmed', E3: 'dimmed' }}
            ariaLabel="Dimmed keys"
          />
          <Keyboard from="C2" to="B3" ariaLabel="Keyboard C2 to B3" />
          <Keyboard from="C5" to="B6" ariaLabel="Keyboard C5 to B6" />
        </div>
      </Section>

      <Section id="mascot" title="Mascot">
        <div className={styles['row']}>
          {MOODS.map((mood) => (
            <div key={mood} className={styles['cell']}>
              <Mascot mood={mood} size={96} />
              <span className={styles['muted']}>{mood}</span>
            </div>
          ))}
        </div>
        <h3>Sizes and speech bubble</h3>
        <div className={styles['row']}>
          <Mascot size={48} />
          <Mascot size={160} mood="happy" say="You're doing great!" />
        </div>
      </Section>

      <Section id="buttons" title="Buttons">
        <div className={styles['stack']}>
          {VARIANTS.map((variant) => (
            <div key={variant} className={styles['row']}>
              <Button variant={variant}>{variant}</Button>
              <Button variant={variant} disabled>
                {variant} (disabled)
              </Button>
            </div>
          ))}
          <ProgressBar value={3} max={10} label="Lesson progress" />
          <div className={styles['row']}>
            <DailyGoalRing done={0} goal={2} />
            <DailyGoalRing done={1} goal={2} />
            <DailyGoalRing done={2} goal={2} />
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setSheet(true);
            }}
          >
            Open a sheet
          </Button>
        </div>
        <Sheet
          open={sheet}
          title="Leave this lesson?"
          onClose={() => {
            setSheet(false);
          }}
        >
          <p>Your answers in this lesson won't be saved.</p>
          <div className={styles['stack']}>
            <Button
              fullWidth
              onClick={() => {
                setSheet(false);
              }}
            >
              Keep going
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onClick={() => {
                setSheet(false);
              }}
            >
              Leave
            </Button>
          </div>
        </Sheet>
        <Button
          variant="secondary"
          onClick={() => {
            setStackA(true);
          }}
        >
          Open stacked sheets
        </Button>
        <Sheet
          open={stackA}
          title="First of two"
          onClose={() => {
            setStackA(false);
          }}
        >
          <Button
            fullWidth
            onClick={() => {
              setSheet2(true);
            }}
          >
            Open a second sheet
          </Button>
        </Sheet>
        <Sheet
          open={sheet2}
          title="Second sheet"
          onClose={() => {
            setSheet2(false);
          }}
        >
          <p>This one sits on top of the first.</p>
          <Button
            fullWidth
            onClick={() => {
              setSheet2(false);
            }}
          >
            Close second
          </Button>
        </Sheet>
      </Section>

      <Section id="feedback-bars" title="Feedback bars">
        <div className={styles['stack']}>
          <div className={`${styles['bar'] ?? ''} ${styles['barCorrect'] ?? ''}`}>
            <Check aria-hidden="true" />
            <div>
              <p className={styles['barTitle']}>Nice!</p>
            </div>
          </div>
          <div className={`${styles['bar'] ?? ''} ${styles['barWrong'] ?? ''}`}>
            <Mascot mood="encouraging" size={48} />
            <div>
              <p className={styles['barTitle']}>Almost! This one is G.</p>
              <p>It sits on the 2nd line.</p>
            </div>
          </div>
        </div>
      </Section>

      <Section id="sound" title="Sound">
        <div className={styles['row']}>
          <Button
            variant="secondary"
            onClick={() => {
              synth.playNote('C4');
            }}
          >
            Play C4
          </Button>
          <Button variant="secondary" onClick={synth.playCorrect}>
            Correct
          </Button>
          <Button variant="secondary" onClick={synth.playWrong}>
            Wrong
          </Button>
          <Button variant="secondary" onClick={synth.playFanfare}>
            Fanfare
          </Button>
        </div>
      </Section>

      <Section id="confetti" title="Confetti">
        <Button
          onClick={() => {
            setConfettiRun((n) => n + 1);
          }}
        >
          Fire confetti
        </Button>
        {confettiRun > 0 && <Confetti key={confettiRun} />}
      </Section>
    </main>
  );
}
