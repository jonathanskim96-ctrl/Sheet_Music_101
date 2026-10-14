import { parseCardId } from '../../../domain/cards';
import { keyboardWindow } from '../../../domain/keyboardWindow';
import type { Note } from '../../../domain/notes';
import { Keyboard, type KeyState } from '../../../notation/Keyboard';
import { Staff } from '../../../notation/Staff';
import type { KindProps } from './types';

/** "Tap this note on the piano": the note on a staff, a two-octave keyboard to answer on. */
export function FindKey({ q, answered, send }: KindProps<'find-key-letter' | 'find-key-exact'>) {
  const parts = parseCardId(q.card);
  if (!parts) throw new Error(`Unknown card: ${q.card}`);
  const window = keyboardWindow(parts.note);

  const states: Partial<Record<Note, KeyState>> = {};
  if (answered) {
    // The key that matches the note on the staff; a wrong pick is orange next to it.
    states[parts.note] = 'highlight';
    const a = answered.answer;
    if (a.kind === 'key' && a.note !== 'black')
      states[a.note] = answered.correct ? 'highlight' : 'wrong';
  }

  return (
    <>
      <Staff
        mode={q.render === 'grand' ? 'grand' : parts.clef}
        notes={[
          {
            clef: parts.clef,
            note: parts.note,
            state: answered ? (answered.correct ? 'correct' : 'wrong') : 'normal',
          },
        ]}
        shake={answered?.correct === false}
      />
      <Keyboard
        from={window.from}
        to={window.to}
        states={states}
        disabled={answered !== null}
        onPress={(key) => {
          send({ kind: 'key', note: key });
        }}
      />
    </>
  );
}
