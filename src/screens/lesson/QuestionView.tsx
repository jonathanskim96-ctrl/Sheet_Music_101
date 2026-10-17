import { parseCardId } from '../../domain/cards';
import { BUTTON_LABELS, promptFor } from '../../domain/content';
import { UNIT1_KEYBOARD } from '../../domain/keyboardWindow';
import { letterOf, noteAtPosition, type Letter, type Note } from '../../domain/notes';
import {
  correctAnswerOf,
  type Answer,
  type ChoiceValue,
  type Question,
} from '../../domain/questions';
import { Keyboard, pressedNote, whiteKeys, type KeyState } from '../../notation/Keyboard';
import { Staff, type NoteState } from '../../notation/Staff';
import { ChoiceButtons } from './questions/ChoiceButtons';
import { FindKey } from './questions/FindKey';
import { FindOnStaff } from './questions/FindOnStaff';
import { StepSkip } from './questions/StepSkip';
import { LetterPad, type ResultState } from './questions/LetterPad';
import styles from './lesson.module.css';
import qStyles from './questions/questions.module.css';

// The e2e build marks each question with its right answer so tests can play a lesson.
// In production this branch is removed at build time (check-dist looks for the attribute).
const E2E = import.meta.env.MODE === 'e2e';

export interface QuestionViewProps {
  question: Question;
  /** The learner's answer once feedback is showing, else null (controls then react to taps). */
  answered: { answer: Answer; correct: boolean } | null;
  onAnswer: (answer: Answer) => void;
}

const choice = (value: ChoiceValue, label: string) => ({ value, label });

/** The picture and answer controls for one question. */
export function QuestionView({ question: q, answered, onAnswer }: QuestionViewProps) {
  const locked = answered !== null;
  // While feedback shows, taps do nothing (the reducer also ignores them).
  const send = (a: Answer) => {
    if (!locked) onAnswer(a);
  };
  const correct = correctAnswerOf(q);

  /** Colour for the note on the staff once answered. */
  const noteState: NoteState = answered ? (answered.correct ? 'correct' : 'wrong') : 'normal';
  const choiceStates = (): Partial<Record<ChoiceValue, ResultState>> => {
    if (!answered || correct.kind !== 'choice') return {};
    const states: Partial<Record<ChoiceValue, ResultState>> = { [correct.value]: 'correct' };
    if (!answered.correct && answered.answer.kind === 'choice') {
      states[answered.answer.value] = 'wrong';
    }
    return states;
  };
  const letterStates = (): Partial<Record<Letter, ResultState>> => {
    if (!answered || correct.kind !== 'letter') return {};
    const states: Partial<Record<Letter, ResultState>> = { [correct.letter]: 'correct' };
    if (!answered.correct && answered.answer.kind === 'letter') {
      states[answered.answer.letter] = 'wrong';
    }
    return states;
  };

  let body;
  switch (q.kind) {
    case 'name-note': {
      const parts = parseCardId(q.card);
      if (!parts) throw new Error(`Unknown card: ${q.card}`);
      body = (
        <>
          <Staff
            mode={q.render === 'grand' ? 'grand' : parts.clef}
            notes={[{ clef: parts.clef, note: parts.note, state: noteState }]}
            shake={answered?.correct === false}
          />
          <LetterPad
            onPick={(letter) => {
              send({ kind: 'letter', letter });
            }}
            states={letterStates()}
          />
        </>
      );
      break;
    }
    case 'alphabet-next':
      body = (
        <>
          <div className={qStyles['bigLetter']} aria-hidden="true">
            {q.letter}
          </div>
          <LetterPad
            onPick={(letter) => {
              send({ kind: 'letter', letter });
            }}
            states={letterStates()}
          />
        </>
      );
      break;
    case 'keyboard-letter': {
      const states: Partial<Record<Note, KeyState>> = {};
      if (answered) {
        if (!answered.correct) {
          for (const n of whiteKeys(UNIT1_KEYBOARD.from, UNIT1_KEYBOARD.to)) {
            if (letterOf(n) === q.letter) states[n] = 'highlight';
          }
          if (answered.answer.kind === 'key' && answered.answer.note !== 'black') {
            states[answered.answer.note] = 'wrong';
          }
        } else if (answered.answer.kind === 'key' && answered.answer.note !== 'black') {
          states[answered.answer.note] = 'highlight';
        }
      }
      body = (
        <Keyboard
          from={UNIT1_KEYBOARD.from}
          to={UNIT1_KEYBOARD.to}
          states={states}
          disabled={locked}
          onPress={(key) => {
            send({ kind: 'key', note: pressedNote(key) });
          }}
        />
      );
      break;
    }
    case 'line-or-space': {
      const note = noteAtPosition('treble', q.position);
      if (!note) throw new Error(`No note at position ${String(q.position)}`);
      body = (
        <>
          <Staff
            mode="none"
            notes={[{ clef: 'treble', note, state: noteState }]}
            shake={answered?.correct === false}
          />
          <ChoiceButtons
            choices={[choice('line', 'Line'), choice('space', 'Space')]}
            onPick={(value) => {
              send({ kind: 'choice', value });
            }}
            states={choiceStates()}
          />
        </>
      );
      break;
    }
    case 'higher-lower':
      body = (
        <>
          <Staff
            mode="treble"
            notes={[
              { clef: 'treble', note: q.first, state: noteState },
              { clef: 'treble', note: q.second, state: noteState },
            ]}
            shake={answered?.correct === false}
            ariaLabel="Music staff with two notes"
          />
          <ChoiceButtons
            choices={[
              choice('first', BUTTON_LABELS.firstNote),
              choice('second', BUTTON_LABELS.secondNote),
            ]}
            onPick={(value) => {
              send({ kind: 'choice', value });
            }}
            states={choiceStates()}
          />
        </>
      );
      break;
    case 'clef-identify':
      body = (
        <>
          <Staff mode={q.clef} notes={[]} ariaLabel="Music staff with a clef" />
          <ChoiceButtons
            choices={[
              choice('treble', BUTTON_LABELS.trebleClef),
              choice('bass', BUTTON_LABELS.bassClef),
            ]}
            onPick={(value) => {
              send({ kind: 'choice', value });
            }}
            states={choiceStates()}
          />
        </>
      );
      break;
    case 'find-key-letter':
    case 'find-key-exact':
      body = <FindKey q={q} answered={answered} send={send} />;
      break;
    case 'find-on-staff':
      body = <FindOnStaff q={q} answered={answered} send={send} />;
      break;
    case 'step-skip':
      body = (
        <StepSkip
          q={q}
          answered={answered}
          send={send}
          states={choiceStates()}
          noteState={noteState}
        />
      );
      break;
    default: {
      const never: never = q;
      return never;
    }
  }

  const e2eAttrs = E2E ? { 'data-answer': JSON.stringify(correct) } : {};
  return (
    <div className={styles['content']} data-testid="question" data-kind={q.kind} {...e2eAttrs}>
      <h2 className={styles['prompt']}>{promptFor(q)}</h2>
      {body}
    </div>
  );
}
