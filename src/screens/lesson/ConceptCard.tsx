import { CONCEPT_CARDS, type ConceptCardId } from '../../domain/content';
import { BPM, boxesEvents } from '../../audio/musicPlan';
import { synth } from '../../audio/synth';
import { Button } from '../../ui/Button';
import { Play } from '../../ui/icons';
import { ConceptIllustration } from './ConceptIllustration';
import styles from './lesson.module.css';

/** A teaching card shown before the questions: picture, short text, optional Play, "Got it". */
export function ConceptCard({ id, onGotIt }: { id: ConceptCardId; onGotIt: () => void }) {
  const card = CONCEPT_CARDS[id];
  const play = card.play;
  const ill = card.illustration;
  const rhythm = card.playRhythm === true && ill.kind === 'rhythm' ? ill.pictures : null;
  return (
    <>
      <div className={styles['content']} data-testid="concept-card" data-card={id}>
        <h2 className={styles['cardTitle']}>{card.title}</h2>
        <ConceptIllustration id={id} />
        <p className={styles['cardBody']}>{card.body}</p>
        {rhythm && (
          <Button
            variant="secondary"
            onClick={() => {
              // all the pictures one after the other, counted in with the first one's beats
              synth.playMusic(boxesEvents(rhythm.flatMap((pic) => pic.boxes)), {
                bpm: BPM,
                countIn: rhythm[0]?.time ?? 4,
              });
            }}
          >
            <Play size={20} aria-hidden="true" /> Play
          </Button>
        )}
        {play && (
          <Button
            variant="secondary"
            onClick={() => {
              play.forEach((note, i) => {
                synth.playNote(note, i * 0.2);
              });
            }}
          >
            <Play size={20} aria-hidden="true" /> Play
          </Button>
        )}
      </div>
      <div className={styles['bottom']}>
        <Button fullWidth onClick={onGotIt}>
          Got it
        </Button>
      </div>
    </>
  );
}
