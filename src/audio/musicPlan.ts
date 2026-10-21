// What playMusic plays: the notes of a rhythm or tune, placed on the beat grid (SPEC 8.7).
import { beatsOf, rhythmTimeline, type RhythmToken } from '../domain/music';

/** One thing to sound: when it starts (in beats), which keys, and how many beats it lasts. */
export interface PlayEvent {
  at: number;
  midi: number[];
  beats: number;
}

/** Tempo of every rhythm and tune in the course. */
export const BPM = 80;
/** Rhythm patterns have no pitch; they play on C5. */
export const RHYTHM_MIDI = 72;

/** One rhythm box as playable events; rests are gaps. */
export function rhythmEvents(tokens: readonly RhythmToken[], offset = 0): PlayEvent[] {
  return rhythmTimeline(tokens).map((e) => ({
    at: offset + e.at,
    midi: [RHYTHM_MIDI],
    beats: e.beats,
  }));
}

/** Several rhythm boxes one after the other as playable events. */
export function boxesEvents(boxes: readonly (readonly RhythmToken[])[]): PlayEvent[] {
  const out: PlayEvent[] = [];
  let offset = 0;
  for (const box of boxes) {
    out.push(...rhythmEvents(box, offset));
    offset += box.reduce((sum, t) => sum + beatsOf(t), 0);
  }
  return out;
}
