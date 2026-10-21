import { useSyncExternalStore } from 'react';
import { frequency, type Note } from '../domain/notes';
import type { PlayEvent } from './musicPlan';
import {
  CORRECT_PLAN,
  FANFARE_PLAN,
  WRONG_PLAN,
  midiPlan,
  notePlan,
  type TonePlan,
} from './tonePlans';

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

const ATTACK = 0.008;
const SILENCE = 0.0001;

/** The count-in click (SPEC 8.7): a short sine tick, louder on the first beat. */
const CLICK = { freq: 1500, dur: 0.03, peak: 0.1, accentPeak: 0.15, attack: 0.002 } as const;
/** A note lasts this much of its beats, so repeated notes are separate. */
const NOTE_FRACTION = 0.9;
/** A stopped replay fades out over this long, so it doesn't click. */
const FADE_OUT = 0.03;

export interface MusicOptions {
  bpm: number;
  /** Clicks before the first event, one per beat, the first accented. */
  countIn: number;
}

export interface Synth {
  playNote: (note: Note, delay?: number, dur?: number) => void;
  /** Like playNote for any key by MIDI number (the black keys of the sharp/flat cards). */
  playMidi: (midi: number, delay?: number, dur?: number) => void;
  /** Count-in clicks, then the events on the beat grid; a new call stops the previous one. */
  playMusic: (events: readonly PlayEvent[], opts: MusicOptions) => void;
  /** Fades out whatever playMusic is playing (a question view that goes away calls this). */
  stopMusic: () => void;
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
  // The notes of the music that is playing now, so a new call (or a replay) can stop them.
  let playing: { ctx: AudioContextLike; group: GainLike; oscillators: OscillatorLike[] } | null =
    null;

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
    attack = ATTACK,
  ): OscillatorLike => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(SILENCE, end);
    osc.connect(gain as never);
    gain.connect(out as never);
    osc.start(start);
    osc.stop(end + 0.05);
    return osc;
  };

  // Fades the running music out and stops its notes. A note that has already ended may refuse
  // another stop(); that is harmless and never a sound failure.
  const stopMusic = () => {
    const prev = playing;
    playing = null;
    if (!prev) return;
    try {
      const now = prev.ctx.currentTime;
      prev.group.gain.setValueAtTime(1, now);
      prev.group.gain.linearRampToValueAtTime(0, now + FADE_OUT);
      for (const o of prev.oscillators) {
        try {
          o.stop(now + FADE_OUT + 0.02);
        } catch {
          /* already ended */
        }
      }
    } catch {
      /* the old engine was closed */
    }
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
    playMidi(midi, delay = 0, dur = 1.2) {
      guarded(() => {
        const { ctx: c, out } = ready();
        for (const p of midiPlan(midi, c.currentTime + LEAD + delay, dur))
          voice(c, out, 'sine', p.frequency, p.peak, p.start, p.end);
      });
    },
    playMusic(events, opts) {
      guarded(() => {
        stopMusic();
        const { ctx: c, out } = ready();
        const group = c.createGain();
        group.gain.value = 1;
        group.connect(out as never);
        const oscillators: OscillatorLike[] = [];
        // Kept from the start, so notes scheduled before a failure part-way through can still be stopped.
        playing = { ctx: c, group, oscillators };
        const beat = 60 / opts.bpm;
        const t0 = c.currentTime + LEAD;
        for (let i = 0; i < opts.countIn; i++) {
          const start = t0 + i * beat;
          const peak = i === 0 ? CLICK.accentPeak : CLICK.peak;
          oscillators.push(
            voice(c, group, 'sine', CLICK.freq, peak, start, start + CLICK.dur, CLICK.attack),
          );
        }
        for (const e of events) {
          const start = t0 + (opts.countIn + e.at) * beat;
          const dur = e.beats * beat * NOTE_FRACTION;
          for (const midi of e.midi)
            for (const p of midiPlan(midi, start, dur))
              oscillators.push(voice(c, group, 'sine', p.frequency, p.peak, p.start, p.end));
        }
      });
    },
    stopMusic,
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
      if (value) stopMusic(); // muting during a rhythm silences it too
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
