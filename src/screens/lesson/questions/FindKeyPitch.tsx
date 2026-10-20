import { parseCardId } from '../../../domain/cards';
import { keyboardWindow } from '../../../domain/keyboardWindow';
import { midiNumber, type Note } from '../../../domain/notes';
import { correctAnswerOf } from '../../../domain/questions';
import { Keyboard, whiteKeys, type KeyState } from '../../../notation/Keyboard';
import { Staff } from '../../../notation/Staff';
import type { KindProps } from './types';

/** The white key that sits just before a black key (the keyboard names black keys by it). */
function whiteBefore(keys: readonly Note[], midi: number): Note | undefined {
  return keys.find((n) => midiNumber(n) + 1 === midi);
}

/** "Tap this exact key": the note (with its sign) on a staff; black keys can be the answer. */
export function FindKeyPitch({ q, answered, send }: KindProps<'find-key-pitch'>) {
  const parts = parseCardId(q.card);
  if (!parts) throw new Error(`Unknown card: ${q.card}`);
  const right = correctAnswerOf(q);
  const window = keyboardWindow(parts.note);
  const keys = whiteKeys(window.from, window.to);

  const states: Partial<Record<Note, KeyState>> = {};
  const black: Partial<Record<Note, KeyState>> = {};
  if (answered && right.kind === 'pitch-key') {
    // The right key is green whether or not it was tapped; a wrong tap is orange beside it.
    const mark = (midi: number, state: KeyState) => {
      const white = keys.find((n) => midiNumber(n) === midi);
      if (white) states[white] = state;
      else {
        const before = whiteBefore(keys, midi);
        if (before) black[before] = state;
      }
    };
    mark(right.midi, 'highlight');
    const a = answered.answer;
    if (a.kind === 'pitch-key' && !answered.correct) mark(a.midi, 'wrong');
  }

  return (
    <>
      <Staff
        mode={q.render === 'grand' ? 'grand' : parts.clef}
        notes={[
          {
            clef: parts.clef,
            note: parts.note,
            ...(parts.sign !== 'natural' ? { sign: parts.sign } : {}),
            state: answered ? (answered.correct ? 'correct' : 'wrong') : 'normal',
          },
        ]}
        shake={answered?.correct === false}
      />
      <Keyboard
        from={window.from}
        to={window.to}
        states={states}
        blackStates={black}
        disabled={answered !== null}
        onPress={(key) => {
          send({ kind: 'pitch-key', midi: 'note' in key ? midiNumber(key.note) : key.black });
        }}
      />
    </>
  );
}
