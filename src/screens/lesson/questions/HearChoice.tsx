import { useCallback, useEffect, useRef } from 'react';
import { BPM, boxesEvents } from '../../../audio/musicPlan';
import { synth, useSound } from '../../../audio/synth';
import { PLAY_AGAIN, RHYTHM_OPTION_NAMES, SOUND_OFF } from '../../../domain/content';
import { planSettings } from '../../../domain/planners';
import { correctAnswerOf } from '../../../domain/questions';
import { Music } from '../../../notation/Music';
import { rhythmScore } from '../../../notation/musicDraw';
import { useCommit } from '../../../data/ProgressContext';
import { Button } from '../../../ui/Button';
import { Volume2 } from '../../../ui/icons';
import { PictureChoices } from './PictureChoices';
import type { KindProps } from './types';
import styles from './questions.module.css';

/**
 * A rhythm is played (once, when the question appears); the learner picks which of three pictures
 * it was. "Play again" repeats it, also while the feedback shows. With sound off the question
 * stays answerable and offers a "Turn on sound" button instead of playing (SPEC 8.6).
 */
export function HearChoice({ q, answered, send }: KindProps<'hear-rhythm'>) {
  // The synth's own mute state, not the setting: the provider unmutes the synth in an effect that
  // runs after this view's effects, so keying on the setting would play while still muted.
  const soundOn = !useSound().muted;
  const commit = useCommit();
  const played = useRef(false);
  const right = correctAnswerOf(q);
  const heard = q.options[q.answer];

  const play = useCallback(() => {
    if (heard) synth.playMusic(boxesEvents([heard]), { bpm: BPM, countIn: q.time });
  }, [heard, q.time]);

  // Auto-play once per question: when it appears, or when the learner turns sound on after muting.
  useEffect(() => {
    if (!soundOn || played.current) return;
    played.current = true;
    play();
    // Leaving the question (or muting) silences the rhythm; turning sound on again plays it once more.
    return () => {
      played.current = false;
      synth.stopMusic();
    };
  }, [soundOn, play]);

  const stateAt = (i: number): 'correct' | 'wrong' | undefined => {
    if (!answered || right.kind !== 'option') return undefined;
    if (i === right.index) return 'correct';
    return answered.answer.kind === 'option' && answered.answer.index === i ? 'wrong' : undefined;
  };

  return (
    <>
      <PictureChoices
        options={q.options.map((tokens, i) => {
          const state = stateAt(i);
          return {
            name: RHYTHM_OPTION_NAMES[i] ?? `Rhythm ${String(i + 1)}`,
            picture: (
              <div className={styles['pictureInner']}>
                <Music mode="rhythm" score={rhythmScore(tokens, q.time)} showTime={false} />
              </div>
            ),
            ...(state ? { state } : {}),
          };
        })}
        onPick={(index) => {
          send({ kind: 'option', index });
        }}
      />
      {soundOn ? (
        <div className={styles['replay']}>
          <Button variant="secondary" onClick={play}>
            <Volume2 size={20} aria-hidden="true" /> {PLAY_AGAIN}
          </Button>
        </div>
      ) : (
        <div className={styles['soundOff']} data-testid="sound-off">
          <p className={styles['helper']}>{SOUND_OFF.line}</p>
          <Button
            variant="secondary"
            onClick={() => {
              void commit((p) => planSettings(p, { soundOn: true }));
            }}
          >
            <Volume2 size={20} aria-hidden="true" /> {SOUND_OFF.button}
          </Button>
        </div>
      )}
    </>
  );
}
