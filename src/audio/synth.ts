import { useSyncExternalStore } from 'react';
import { frequency, type Note } from '../domain/notes';

// Just the parts of the Web Audio API we use, so tests can pass a fake context.
interface ParamLike {
  setValueAtTime(value: number, time: number): unknown;
  linearRampToValueAtTime(value: number, time: number): unknown;
  exponentialRampToValueAtTime(value: number, time: number): unknown;
  value: number;
}
interface NodeLike {
  connect(destination: never): unknown;
}
interface GainLike extends NodeLike {
  gain: ParamLike;
}
interface OscillatorLike extends NodeLike {
  type: OscillatorType;
  frequency: ParamLike;
  start(time: number): void;
  stop(time: number): void;
}
interface BufferSourceLike extends NodeLike {
  buffer: unknown;
  start(time?: number): void;
}
export interface AudioContextLike {
  readonly currentTime: number;
  readonly state: string;
  readonly destination: unknown;
  resume(): Promise<void>;
  close(): Promise<void>;
  createGain(): GainLike;
  createOscillator(): OscillatorLike;
  createDynamicsCompressor(): NodeLike;
  createBuffer(channels: number, length: number, sampleRate: number): unknown;
  createBufferSource(): BufferSourceLike;
}
export type AudioContextFactory = () => AudioContextLike;

/** Partial multiples and their relative loudness for a piano-ish note (SPEC 7.7). */
export const PARTIALS: readonly { multiple: number; amp: number }[] = [
  { multiple: 1, amp: 1.0 },
  { multiple: 2, amp: 0.5 },
  { multiple: 3, amp: 0.25 },
  { multiple: 4, amp: 0.12 },
];
const ATTACK = 0.008;
const SILENCE = 0.0001;
/** How long a tapped-on engine gets to report `running` before it is rebuilt. */
const WAKE_MS = 300;
/** Sounds start this many seconds ahead so the first part isn't cut off while the engine wakes. */
export const LEAD = 0.02;

export interface PartialPlan {
  frequency: number;
  peak: number;
  start: number;
  /** When the partial has decayed to silence. */
  end: number;
}

/** When and how loud each of the four partials of a note is. */
export function notePlan(note: Note, start: number, dur: number): PartialPlan[] {
  const f = frequency(note);
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

export interface Synth {
  playNote: (note: Note, delay?: number, dur?: number) => void;
  playCorrect: () => void;
  playWrong: () => void;
  playFanfare: () => void;
  /** Starts the engine inside a tap (iOS only allows that); see `installAudioUnlock`. */
  unlock: () => void;
  /** True when the engine exists and reports `running`. */
  isRunning: () => boolean;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
  subscribe: (listener: () => void) => () => void;
}

/**
 * The sound engine. The AudioContext is created on the first play call (always inside a
 * tap handler, as iOS requires). Errors never break a lesson: they go to `onError`, once.
 */
export function createSynth(
  factory: AudioContextFactory,
  onError?: (error: unknown) => void,
): Synth {
  let engine: { ctx: AudioContextLike; out: GainLike } | null = null;
  let muted = false;
  let reported = false;
  const listeners = new Set<() => void>();

  const report = (e: unknown) => {
    if (reported) return;
    reported = true;
    onError?.(e);
  };

  const build = () => {
    const c = factory();
    const out = c.createGain();
    out.gain.value = 0.6;
    const compressor = c.createDynamicsCompressor();
    out.connect(compressor as never);
    compressor.connect(c.destination as never);
    engine = { ctx: c, out };
    return engine;
  };

  const ready = (): { ctx: AudioContextLike; out: GainLike } => {
    // A closed engine can never play again, so replace it.
    const e = engine && engine.ctx.state !== 'closed' ? engine : build();
    // iOS Safari uses a non-standard 'interrupted' state after a call or app switch.
    if (e.ctx.state !== 'running') e.ctx.resume().catch(report);
    return e;
  };

  // iOS Safari only starts audio after a sound has been played inside a tap; a silent
  // one-sample buffer does that without anything audible.
  const playSilence = (c: AudioContextLike) => {
    const source = c.createBufferSource();
    source.buffer = c.createBuffer(1, 1, 22050);
    source.connect(c.destination as never);
    source.start(0);
  };

  const voice = (
    c: AudioContextLike,
    out: GainLike,
    wave: OscillatorType,
    freq: number,
    peak: number,
    start: number,
    end: number,
  ) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + ATTACK);
    gain.gain.exponentialRampToValueAtTime(SILENCE, end);
    osc.connect(gain as never);
    gain.connect(out as never);
    osc.start(start);
    osc.stop(end + 0.05);
  };

  const guarded = (fn: () => void) => {
    if (muted) return;
    try {
      fn();
    } catch (e) {
      report(e);
    }
  };

  const playTones = (plan: TonePlan) => {
    guarded(() => {
      const { ctx: c, out } = ready();
      const t0 = c.currentTime + LEAD;
      for (const s of plan.steps)
        voice(c, out, plan.wave, frequency(s.note), plan.peak, t0 + s.at, t0 + s.at + s.dur);
    });
  };

  return {
    unlock() {
      try {
        const { ctx: c } = ready();
        playSilence(c);
        // Safari sometimes stays stuck (or says `running` but is silent) until the engine is
        // rebuilt, so give it a moment and then rebuild it, once for this tap.
        setTimeout(() => {
          if (engine?.ctx !== c || c.state === 'running') return;
          try {
            c.close().catch(report);
            engine = null;
            playSilence(ready().ctx);
          } catch (e) {
            report(e);
          }
        }, WAKE_MS);
      } catch (e) {
        report(e);
      }
    },
    isRunning: () => engine?.ctx.state === 'running',
    playNote(note, delay = 0, dur = 1.2) {
      guarded(() => {
        const { ctx: c, out } = ready();
        for (const p of notePlan(note, c.currentTime + LEAD + delay, dur))
          voice(c, out, 'sine', p.frequency, p.peak, p.start, p.end);
      });
    },
    playCorrect: () => {
      playTones(CORRECT_PLAN);
    },
    playWrong: () => {
      playTones(WRONG_PLAN);
    },
    playFanfare: () => {
      playTones(FANFARE_PLAN);
    },
    setMuted(value) {
      if (muted === value) return;
      muted = value;
      for (const l of listeners) l();
    },
    isMuted: () => muted,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

let errorHandler: ((error: unknown) => void) | undefined;
// The engine reports only its first error; keep it until a handler exists so it isn't lost.
let pendingError: { error: unknown } | null = null;

/** Registers what to do when sound fails (the app shows its one-time toast here). */
export function setAudioErrorHandler(handler: ((error: unknown) => void) | undefined): void {
  errorHandler = handler;
  if (handler && pendingError) {
    const { error } = pendingError;
    pendingError = null;
    handler(error);
  }
}

const UNLOCK_EVENTS = ['pointerup', 'touchend', 'click', 'keydown'] as const;

/**
 * Starts the sound engine on the first tap anywhere, so it is already running when a lesson
 * plays a note. Listens until the engine reports `running`, and again after the page was hidden
 * (a call or app switch can stop it). Returns a function that removes the listeners.
 */
export function installAudioUnlock(
  engine: Pick<Synth, 'unlock' | 'isRunning'>,
  target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'> & {
    readonly visibilityState?: string;
  },
): () => void {
  let listening = false;
  const onTap = () => {
    engine.unlock();
    // resume() settles after this tap, so look again a moment later.
    setTimeout(() => {
      if (engine.isRunning()) stopListening();
    }, 0);
  };
  const startListening = () => {
    if (listening) return;
    listening = true;
    for (const name of UNLOCK_EVENTS) target.addEventListener(name, onTap, { capture: true });
  };
  const stopListening = () => {
    if (!listening) return;
    listening = false;
    for (const name of UNLOCK_EVENTS) target.removeEventListener(name, onTap, { capture: true });
  };
  const onVisibility = () => {
    if (target.visibilityState === 'hidden') startListening();
  };
  startListening();
  target.addEventListener('visibilitychange', onVisibility);
  return () => {
    stopListening();
    target.removeEventListener('visibilitychange', onVisibility);
  };
}

/** The app-wide engine, backed by the browser's AudioContext. */
export const synth: Synth = createSynth(
  () => new AudioContext(),
  (e) => {
    if (errorHandler) errorHandler(e);
    else pendingError = { error: e };
  },
);

/** Sound controls for components; `muted` re-renders when it changes. */
export function useSound(): Synth & { muted: boolean } {
  const muted = useSyncExternalStore(synth.subscribe, synth.isMuted);
  return { ...synth, muted };
}
