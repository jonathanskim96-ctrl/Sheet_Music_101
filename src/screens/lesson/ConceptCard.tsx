import { CONCEPT_CARDS, type ConceptCardId } from '../../domain/content';
import { synth } from '../../audio/synth';
import { Button } from '../../ui/Button';
import { Play } from '../../ui/icons';
import { ConceptIllustration } from './ConceptIllustration';
import styles from './lesson.module.css';

/** A teaching card shown before the questions: picture, short text, optional Play, "Got it". */
export function ConceptCard({ id, onGotIt }: { id: ConceptCardId; onGotIt: () => void }) {
  const card = CONCEPT_CARDS[id];
  const play = card.play;
  return (
    <>
      <div className={styles['content']} data-testid="concept-card" data-card={id}>
        <h2 className={styles['cardTitle']}>{card.title}</h2>
        <ConceptIllustration id={id} />
        <p className={styles['cardBody']}>{card.body}</p>
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
