import type { Dur, HomeSign, Melody, RestDur, RhythmToken, Time } from '../domain/music';
import type { Clef, Note, Sign } from '../domain/notes';

// What the Music component draws: a plain description of boxes, events and notes. The adapters
// here turn the domain's Melody and rhythm tokens into it, so the component stays dumb.

export type DrawState = 'normal' | 'correct' | 'wrong' | 'ghost';

export interface DrawNote {
  /** null = a rhythm-staff note, which sits on the one line and has no pitch. */
  note: Note | null;
  printed: Sign | null;
  state?: DrawState;
  /** Draws the marker triangle and colours the head with the focus colour. */
  marked?: boolean;
}

export type DrawEvent =
  | { kind: 'note'; dur: Dur; notes: DrawNote[] }
  | { kind: 'rest'; dur: RestDur; state?: DrawState }
  | { kind: 'empty'; beats: number };

export interface DrawStaff {
  clef: Clef;
  boxes: DrawEvent[][];
}

export interface MusicScore {
  staffs: DrawStaff[];
  time: Time;
  home: HomeSign;
}

export interface Marking {
  staff: 0 | 1;
  box: number;
  index: number;
}

/** A melody as drawable events; `marked` points at one event whose notes get the marker. */
export function melodyScore(m: Melody, marked?: Marking, state?: DrawState): MusicScore {
  return {
    time: m.time,
    home: m.home,
    staffs: m.staffs.map((st, s) => ({
      clef: st.clef,
      boxes: st.boxes.map((box, b) =>
        box.map((ev, i): DrawEvent => {
          if (ev.kind === 'rest') return { kind: 'rest', dur: ev.dur };
          const isMarked = marked?.staff === s && marked.box === b && marked.index === i;
          return {
            kind: 'note',
            dur: ev.dur,
            notes: ev.notes.map((n) => ({
              note: n.note,
              printed: n.printed,
              ...(isMarked ? { marked: true } : {}),
              ...(state !== undefined ? { state } : {}),
            })),
          };
        }),
      ),
    })),
  };
}

/** One rhythm pattern (one box) for the one-line rhythm staff. */
export function rhythmScore(tokens: readonly RhythmToken[], time: Time): MusicScore {
  const events = tokens.map((t): DrawEvent => {
    if (t === 'Q' || t === 'H' || t === 'W') return { kind: 'rest', dur: t };
    return { kind: 'note', dur: t, notes: [{ note: null, printed: null }] };
  });
  return { time, home: 'none', staffs: [{ clef: 'treble', boxes: [events] }] };
}

/** The beats an event takes up (an empty slot takes the beats it stands for). */
export function drawBeats(e: DrawEvent): number {
  if (e.kind === 'empty') return e.beats;
  if (e.dur === 'q' || e.dur === 'ee' || e.dur === 'Q') return 1;
  if (e.dur === 'h' || e.dur === 'H') return 2;
  if (e.dur === 'h.') return 3;
  return 4;
}
