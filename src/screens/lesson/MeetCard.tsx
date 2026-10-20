import { useEffect, useRef } from 'react';
import type { CardId } from '../../domain/cards';
import { parseCardId } from '../../domain/cards';
import { cardName, FLAT_TIP, SHARP_TIP, TIPS } from '../../domain/content';
import { describePosition } from '../../domain/landmarks';
import { midiNumber } from '../../domain/notes';
import { cardMidi } from '../../domain/cards';
import { keyboardWindow } from '../../domain/keyboardWindow';
import { synth } from '../../audio/synth';
import { Keyboard, whiteKeys } from '../../notation/Keyboard';
import { Staff } from '../../notation/Staff';
import { Button } from '../../ui/Button';
import { Play } from '../../ui/icons';
import styles from './lesson.module.css';

/** Introduces one new note: its staff, name, position, key on the piano and (for landmarks) a tip. */
export function MeetCard({ card, onGotIt }: { card: CardId; onGotIt: () => void }) {
  const parts = parseCardId(card);
  if (!parts) throw new Error(`Unknown card: ${card}`);
  const { clef, note, sign } = parts;
  const tip = sign === 'sharp' ? SHARP_TIP : sign === 'flat' ? FLAT_TIP : TIPS[card];
  const keys = keyboardWindow(note);
  // A sharp or flat card sounds a black key; the keyboard names that key by the white key before it.
  const midi = cardMidi(card);
  const blackBefore =
    sign === 'natural'
      ? undefined
      : whiteKeys(keys.from, keys.to).find((n) => midiNumber(n) + 1 === midi);

  // Plays the note once when the card appears (not again if the page re-renders).
  const played = useRef<CardId | null>(null);
  useEffect(() => {
    if (played.current === card) return;
    played.current = card;
    if (sign === 'natural') synth.playNote(note);
    else synth.playMidi(midi);
  }, [card, note, sign, midi]);

  return (
    <>
      <div className={styles['content']} data-testid="meet-card" data-card={card}>
        <span className={styles['chip']}>New note!</span>
        <h2 className={styles['cardTitle']}>{cardName(card)}</h2>
        <Staff
          mode={clef}
          notes={[{ clef, note, ...(sign !== 'natural' ? { sign } : {}) }]}
          ariaLabel={`Music staff with ${cardName(card)}`}
        />
        <p className={styles['cardBody']}>
          <strong>{clef === 'treble' ? 'Treble clef' : 'Bass clef'}</strong>
          <br />
          {describePosition(clef, note)}
        </p>
        <Keyboard
          from={keys.from}
          to={keys.to}
          states={blackBefore === undefined ? { [note]: 'highlight' } : {}}
          blackStates={blackBefore === undefined ? {} : { [blackBefore]: 'highlight' }}
          disabled
          ariaLabel={`Piano keyboard with ${cardName(card)} highlighted`}
        />
        {tip !== undefined && <p className={styles['tip']}>{tip}</p>}
        <Button
          variant="secondary"
          onClick={() => {
            if (sign === 'natural') synth.playNote(note);
            else synth.playMidi(midi);
          }}
        >
          <Play size={20} aria-hidden="true" /> Play
        </Button>
      </div>
      <div className={styles['bottom']}>
        <Button fullWidth onClick={onGotIt}>
          Got it
        </Button>
      </div>
    </>
  );
}
