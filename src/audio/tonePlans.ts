// What the synth plays: the partials of a note and the three short tunes (SPEC 7.7).
import { midiNumber, type Note } from '../domain/notes';

/** Partial multiples and their relative loudness for a piano-ish note (SPEC 7.7). */
export const PARTIALS: readonly { multiple: number; amp: number }[] = [
  { multiple: 1, amp: 1.0 },
  { multiple: 2, amp: 0.5 },
  { multiple: 3, amp: 0.25 },
  { multiple: 4, amp: 0.12 },
];
export interface PartialPlan {
  frequency: number;
  peak: number;
  start: number;
  /** When the partial has decayed to silence. */
  end: number;
}

/** Equal-temperament frequency of a MIDI number (A4 = 69 = 440 Hz); black keys have no Note name. */
export function midiFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** When and how loud each of the four partials of a note is. */
export function notePlan(note: Note, start: number, dur: number): PartialPlan[] {
  return midiPlan(midiNumber(note), start, dur);
}

/** The same piano-ish sound for any key, black ones included (SPEC 8.7 "playNote by midi"). */
export function midiPlan(midi: number, start: number, dur: number): PartialPlan[] {
  const f = midiFrequency(midi);
  return PARTIALS.map((p) => ({
    frequency: f * p.multiple,
    peak: 0.25 * p.amp,
    start,
    end: start + dur / Math.sqrt(p.multiple),
  }));
}

export interface ToneStep {
  note: Note;
  at: number;
  dur: number;
}
export interface TonePlan {
  wave: OscillatorType;
  peak: number;
  steps: readonly ToneStep[];
}

export const CORRECT_PLAN: TonePlan = {
  wave: 'triangle',
  peak: 0.15,
  steps: [
    { note: 'C6', at: 0, dur: 0.18 },
    { note: 'E6', at: 0.09, dur: 0.18 },
  ],
};
export const WRONG_PLAN: TonePlan = {
  wave: 'sine',
  peak: 0.18,
  steps: [
    { note: 'E3', at: 0, dur: 0.25 },
    { note: 'C3', at: 0.12, dur: 0.25 },
  ],
};
export const FANFARE_PLAN: TonePlan = {
  wave: 'triangle',
  peak: 0.15,
  steps: [
    { note: 'C5', at: 0, dur: 0.2 },
    { note: 'E5', at: 0.12, dur: 0.2 },
    { note: 'G5', at: 0.24, dur: 0.2 },
    { note: 'C6', at: 0.36, dur: 0.6 },
  ],
};
