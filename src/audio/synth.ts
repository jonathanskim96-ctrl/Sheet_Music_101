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
  createBuffer(channels: number, length: number, sampleRate: number): unknown;
  createBufferSource(): BufferSourceLike;
  createGain(): GainLike;
  createOscillator(): OscillatorLike;
  createDynamicsCompressor(): NodeLike;
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
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
  subscribe: (listener: () => void) => () => void;
  /** Called from a tap: starts the engine inside the gesture and restarts a stuck one. */
  unlock: () => void;
  /** Allows one more stuck-engine rebuild; called when the page is hidden. */
  allowRebuild: () => void;
  /** True when the engine exists and reports `running`. */
  isRunning: () => boolean;
}

/** Sounds start a little ahead of `currentTime` so a waking engine doesn't clip the attack. */
const LEAD = 0.02;
/** How long after a tap's resume() the engine may stay not-running before it is rebuilt. */
const STUCK_MS = 300;

/**
 * The sound engine. The AudioContext is created on the first tap (`unlock`) or, failing
 * that, on the first play call. Errors never break a lesson: they go to `onError`, once.
 */
export function createSynth(
  factory: AudioContextFactory,
  onError?: (error: unknown) => void,
): Synth {
  let ctx: AudioContextLike | null = null;
  let master: GainLike | null = null;
  let muted = false;
  let reported = false;
  // A slow engine (Bluetooth, just after an interruption) must not be closed again and again, so
  // the stuck-engine rebuild happens once each time the page is shown.
  let rebuildUsed = false;
  const listeners = new Set<() => void>();

  const report = (e: unknown) => {
    if (reported) return;
    reported = true;
    onError?.(e);
  };

  const build = (): AudioContextLike => {
    const c = factory();
    const m = c.createGain();
    m.gain.value = 0.6;
    const compressor = c.createDynamicsCompressor();
    m.connect(compressor as never);
    compressor.connect(c.destination as never);
    ctx = c;
    master = m;
    return c;
  };

  // iOS Safari uses a non-standard 'interrupted' state after a call or app switch. Chrome rejects
  // a pending resume() when we close a stuck engine; that engine is already replaced, so it isn't
  // a sound failure and must not show the toast.
  const wake = (c: AudioContextLike) => {
    if (c.state === 'running') return;
    c.resume().catch((e: unknown) => {
      if (ctx === c) report(e);
    });
  };

  // iOS only lets a sound start inside a tap; a one-sample silent buffer counts as "playing".
  const primeWithSilence = (c: AudioContextLike) => {
    const source = c.createBufferSource();
    source.buffer = c.createBuffer(1, 1, 22050);
    source.connect(c.destination as never);
    source.start(0);
  };

  const ready = (): { ctx: AudioContextLike; out: GainLike } => {
    // A closed engine can never run again; build a new one.
    if (ctx?.state === 'closed') ctx = null;
    const c = ctx ?? build();
    wake(c);
    if (!master) throw new Error('Audio engine has no output');
    return { ctx: c, out: master };
  };

  // After a tap, an engine that still isn't running is stuck: replace it, once until the page has
  // been hidden. Only the engine the tap started is checked; later taps still call `unlock()`.
  const rebuildIfStuck = (checked: AudioContextLike) => {
    try {
      if (rebuildUsed || muted || ctx !== checked || checked.state === 'running') return;
      rebuildUsed = true;
      const closing = checked.state === 'closed' ? null : checked.close();
      closing?.catch(report);
      const c = build();
      wake(c);
      primeWithSilence(c);
    } catch (e) {
      report(e);
    }
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

  const unlock = () => {
    // Muted means every call is a no-op (SPEC 7.7): no engine, no toast.
    if (muted) return;
    try {
      const { ctx: c } = ready();
      primeWithSilence(c);
      setTimeout(() => {
        rebuildIfStuck(c);
      }, STUCK_MS);
    } catch (e) {
      report(e);
    }
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
    unlock,
    allowRebuild: () => {
      rebuildUsed = false;
    },
    isRunning: () => ctx?.state === 'running',
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

/** The few parts of `document` that `installUnlock` needs (a fake in tests). */
export interface UnlockTarget {
  readonly visibilityState: string;
  addEventListener(type: string, listener: () => void, capture?: boolean): void;
  removeEventListener(type: string, listener: () => void, capture?: boolean): void;
}
const UNLOCK_EVENTS = ['pointerup', 'touchend', 'click', 'keydown'] as const;

/**
 * Starts the sound engine on the first tap anywhere (capture phase, so it runs inside the
 * gesture before any button handler). Keeps listening until the engine is `running`, and
 * listens again after the page has been hidden (iOS may interrupt the engine then).
 * Returns a function that removes everything.
 */
export function installUnlock(s: Synth, doc: UnlockTarget): () => void {
  let attached = false;
  const onTap = () => {
    if (s.isRunning()) detach();
    else s.unlock();
  };
  const attach = () => {
    if (attached) return;
    attached = true;
    for (const t of UNLOCK_EVENTS) doc.addEventListener(t, onTap, true);
  };
  const detach = () => {
    if (!attached) return;
    attached = false;
    for (const t of UNLOCK_EVENTS) doc.removeEventListener(t, onTap, true);
  };
  const onVisibility = () => {
    if (doc.visibilityState !== 'hidden') return;
    s.allowRebuild();
    attach();
  };
  attach();
  doc.addEventListener('visibilitychange', onVisibility);
  return () => {
    detach();
    doc.removeEventListener('visibilitychange', onVisibility);
  };
}
