import { afterEach, describe, expect, it, vi } from 'vitest';
import { frequency } from '../domain/notes';
import {
  CORRECT_PLAN,
  FANFARE_PLAN,
  WRONG_PLAN,
  createSynth,
  installAudioUnlock,
  notePlan,
  setAudioErrorHandler,
  synth,
  type AudioContextLike,
} from './synth';

type Call = [name: string, value: number, time: number];

/** A fake AudioContext that records what was scheduled; never makes sound. */
function fakeContext(state = 'running') {
  const oscillators: { type: OscillatorType; freq: number; start: number; stop: number }[] = [];
  const gains: { calls: Call[] }[] = [];
  const created = { resumed: 0, silences: 0 };
  const ctx: AudioContextLike = {
    currentTime: 10,
    state,
    destination: {},
    resume: () => {
      created.resumed++;
      return Promise.resolve();
    },
    createGain: () => {
      const rec = { calls: [] as Call[] };
      gains.push(rec);
      return {
        gain: {
          value: 1,
          setValueAtTime: (v: number, t: number) => rec.calls.push(['set', v, t]),
          linearRampToValueAtTime: (v: number, t: number) => rec.calls.push(['lin', v, t]),
          exponentialRampToValueAtTime: (v: number, t: number) => rec.calls.push(['exp', v, t]),
        },
        connect: () => undefined,
      };
    },
    createOscillator: () => {
      const osc = {
        type: 'sine' as OscillatorType,
        freq: 0,
        start: 0,
        stop: 0,
      };
      oscillators.push(osc);
      return {
        get type() {
          return osc.type;
        },
        set type(v: OscillatorType) {
          osc.type = v;
        },
        frequency: {
          get value() {
            return osc.freq;
          },
          set value(v: number) {
            osc.freq = v;
          },
          setValueAtTime: () => undefined,
          linearRampToValueAtTime: () => undefined,
          exponentialRampToValueAtTime: () => undefined,
        },
        connect: () => undefined,
        start: (t: number) => {
          osc.start = t;
        },
        stop: (t: number) => {
          osc.stop = t;
        },
      };
    },
    createDynamicsCompressor: () => ({ connect: () => undefined }),
    createBuffer: () => ({}),
    createBufferSource: () => ({
      buffer: null,
      connect: () => undefined,
      start: () => {
        created.silences++;
      },
    }),
  };
  return { ctx, oscillators, gains, created };
}

describe('notePlan', () => {
  it('has four partials at x1..x4 with amplitudes 1, 0.5, 0.25, 0.12 (times 0.25)', () => {
    const plan = notePlan('C4', 2, 1.2);
    expect(plan.map((p) => p.frequency)).toEqual([1, 2, 3, 4].map((m) => frequency('C4') * m));
    expect(plan.map((p) => p.peak)).toEqual([0.25, 0.125, 0.0625, 0.03]);
  });

  it('decays each partial by dur / sqrt(partial number)', () => {
    const plan = notePlan('A4', 5, 1.2);
    expect(plan[0]?.end).toBeCloseTo(5 + 1.2);
    expect(plan[1]?.end).toBeCloseTo(5 + 1.2 / Math.sqrt(2));
    expect(plan[3]?.end).toBeCloseTo(5 + 0.6);
    expect(plan.every((p) => p.start === 5)).toBe(true);
  });

  it('uses A4 = 440 Hz', () => {
    expect(notePlan('A4', 0, 1)[0]?.frequency).toBeCloseTo(440);
  });
});

describe('tone plans match SPEC 7.7', () => {
  it('correct: triangle C6 then E6 90 ms later, 180 ms each, peak 0.15', () => {
    expect(CORRECT_PLAN).toEqual({
      wave: 'triangle',
      peak: 0.15,
      steps: [
        { note: 'C6', at: 0, dur: 0.18 },
        { note: 'E6', at: 0.09, dur: 0.18 },
      ],
    });
  });
  it('wrong: sine E3 then C3 120 ms later, 250 ms each, peak 0.18', () => {
    expect(WRONG_PLAN.wave).toBe('sine');
    expect(WRONG_PLAN.peak).toBe(0.18);
    expect(WRONG_PLAN.steps).toEqual([
      { note: 'E3', at: 0, dur: 0.25 },
      { note: 'C3', at: 0.12, dur: 0.25 },
    ]);
  });
  it('fanfare: triangle C5 E5 G5 C6 at 0/120/240/360 ms, the last 600 ms', () => {
    expect(FANFARE_PLAN.wave).toBe('triangle');
    expect(FANFARE_PLAN.steps.map((s) => [s.note, s.at])).toEqual([
      ['C5', 0],
      ['E5', 0.12],
      ['G5', 0.24],
      ['C6', 0.36],
    ]);
    expect(FANFARE_PLAN.steps[3]?.dur).toBe(0.6);
  });
});

describe('createSynth', () => {
  it('creates no AudioContext until the first play call', () => {
    const factory = vi.fn(() => fakeContext().ctx);
    const s = createSynth(factory);
    expect(factory).not.toHaveBeenCalled();
    s.playNote('C4');
    expect(factory).toHaveBeenCalledTimes(1);
    s.playCorrect();
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('schedules four oscillators for a note, offset by the delay', () => {
    const f = fakeContext();
    const s = createSynth(() => f.ctx);
    s.playNote('G4', 0.25, 1.2);
    expect(f.oscillators).toHaveLength(4);
    expect(f.oscillators.map((o) => o.type)).toEqual(['sine', 'sine', 'sine', 'sine']);
    expect(f.oscillators[0]?.start).toBeCloseTo(10.25);
    expect(f.oscillators[0]?.freq).toBeCloseTo(frequency('G4'));
    expect(f.oscillators[0]?.stop).toBeCloseTo(10.25 + 1.2 + 0.05);
  });

  it('shapes each voice: 0, then the peak after 8 ms, then a decay to 0.0001', () => {
    const f = fakeContext();
    createSynth(() => f.ctx).playCorrect();
    // gains[0] is the master gain; voices follow in the order they were scheduled
    expect(f.gains[1]?.calls).toEqual([
      ['set', 0, 10],
      ['lin', 0.15, 10.008],
      ['exp', 0.0001, 10.18],
    ]);
  });

  it('plays the effects with the right waves and start times', () => {
    const f = fakeContext();
    const s = createSynth(() => f.ctx);
    s.playCorrect();
    s.playWrong();
    s.playFanfare();
    expect(f.oscillators.map((o) => o.type)).toEqual([
      'triangle',
      'triangle',
      'sine',
      'sine',
      'triangle',
      'triangle',
      'triangle',
      'triangle',
    ]);
    expect(f.oscillators[1]?.start).toBeCloseTo(10.09);
    expect(f.oscillators[3]?.start).toBeCloseTo(10.12);
    expect(f.oscillators[7]?.start).toBeCloseTo(10.36);
    expect(f.oscillators[7]?.stop).toBeCloseTo(10.36 + 0.6 + 0.05);
  });

  it('is silent when muted, and sound returns when unmuted', () => {
    const factory = vi.fn(() => fakeContext().ctx);
    const s = createSynth(factory);
    s.setMuted(true);
    s.playNote('C4');
    s.playCorrect();
    s.playWrong();
    s.playFanfare();
    expect(factory).not.toHaveBeenCalled();
    expect(s.isMuted()).toBe(true);
    s.setMuted(false);
    s.playCorrect();
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('tells subscribers when the mute flag changes (not when it is set to the same value)', () => {
    const s = createSynth(() => fakeContext().ctx);
    const listener = vi.fn();
    const off = s.subscribe(listener);
    s.setMuted(true);
    s.setMuted(true);
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    s.setMuted(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('resumes a suspended context', () => {
    const f = fakeContext('suspended');
    createSynth(() => f.ctx).playCorrect();
    expect(f.created.resumed).toBe(1);
  });

  it("resumes iOS Safari's 'interrupted' context too, but not a running one", () => {
    const f = fakeContext('interrupted');
    createSynth(() => f.ctx).playCorrect();
    expect(f.created.resumed).toBe(1);
    const running = fakeContext('running');
    createSynth(() => running.ctx).playCorrect();
    expect(running.created.resumed).toBe(0);
  });

  it('swallows audio errors, reports the first one only, and keeps working', () => {
    const onError = vi.fn();
    const s = createSynth(() => {
      throw new Error('no audio');
    }, onError);
    expect(() => {
      s.playNote('C4');
      s.playCorrect();
      s.playWrong();
    }).not.toThrow();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('reports a failing resume() too', async () => {
    const onError = vi.fn();
    const f = fakeContext('suspended');
    f.ctx.resume = () => Promise.reject(new Error('blocked'));
    createSynth(() => f.ctx, onError).playCorrect();
    await Promise.resolve();
    await Promise.resolve();
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe('unlock (first tap)', () => {
  it('creates the engine, resumes it and plays one silent buffer, with no oscillator', () => {
    const f = fakeContext('suspended');
    const factory = vi.fn(() => f.ctx);
    const s = createSynth(factory);
    s.unlock();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(f.created.resumed).toBe(1);
    expect(f.created.silences).toBe(1);
    expect(f.oscillators).toHaveLength(0);
  });

  it('works even while muted (the learner may unmute later)', () => {
    const f = fakeContext('suspended');
    const s = createSynth(() => f.ctx);
    s.setMuted(true);
    s.unlock();
    expect(f.created.resumed).toBe(1);
  });

  it('reuses the engine a later play call needs', () => {
    const factory = vi.fn(() => fakeContext().ctx);
    const s = createSynth(factory);
    s.unlock();
    s.playNote('C4');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('reports a failing engine once and does not throw', () => {
    const onError = vi.fn();
    const s = createSynth(() => {
      throw new Error('no audio');
    }, onError);
    expect(() => {
      s.unlock();
      s.unlock();
    }).not.toThrow();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('isRunning is false before the engine exists and follows its state after', () => {
    const f = fakeContext('suspended');
    const s = createSynth(() => f.ctx);
    expect(s.isRunning()).toBe(false);
    s.unlock();
    expect(s.isRunning()).toBe(false);
    const running = fakeContext('running');
    const s2 = createSynth(() => running.ctx);
    s2.unlock();
    expect(s2.isRunning()).toBe(true);
  });
});

describe('installAudioUnlock', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /** A page stand-in: real event dispatch, with a visibility state we can change. */
  function fakePage() {
    const target = new EventTarget() as EventTarget & { visibilityState: string };
    target.visibilityState = 'visible';
    return target;
  }
  function engine(runningAfter: number) {
    let calls = 0;
    return {
      calls: () => calls,
      unlock: () => {
        calls++;
      },
      isRunning: () => calls >= runningAfter,
    };
  }

  it.each(['pointerup', 'touchend', 'click', 'keydown'])('unlocks on %s', (name) => {
    vi.useFakeTimers();
    const page = fakePage();
    const e = engine(99);
    installAudioUnlock(e, page);
    page.dispatchEvent(new Event(name));
    expect(e.calls()).toBe(1);
  });

  it('does nothing before the first tap', () => {
    const e = engine(1);
    installAudioUnlock(e, fakePage());
    expect(e.calls()).toBe(0);
  });

  it('keeps listening until the engine is running, then stops', () => {
    vi.useFakeTimers();
    const page = fakePage();
    const e = engine(2);
    installAudioUnlock(e, page);
    page.dispatchEvent(new Event('click'));
    vi.runAllTimers();
    page.dispatchEvent(new Event('click'));
    vi.runAllTimers();
    expect(e.calls()).toBe(2);
    page.dispatchEvent(new Event('click'));
    expect(e.calls()).toBe(2);
  });

  it('listens again after the page was hidden', () => {
    vi.useFakeTimers();
    const page = fakePage();
    const e = engine(1);
    installAudioUnlock(e, page);
    page.dispatchEvent(new Event('click'));
    vi.runAllTimers();
    page.dispatchEvent(new Event('click'));
    expect(e.calls()).toBe(1);
    page.visibilityState = 'hidden';
    page.dispatchEvent(new Event('visibilitychange'));
    page.dispatchEvent(new Event('click'));
    expect(e.calls()).toBe(2);
  });

  it('does not listen again when the page becomes visible', () => {
    vi.useFakeTimers();
    const page = fakePage();
    const e = engine(1);
    installAudioUnlock(e, page);
    page.dispatchEvent(new Event('click'));
    vi.runAllTimers();
    page.dispatchEvent(new Event('visibilitychange'));
    page.dispatchEvent(new Event('click'));
    expect(e.calls()).toBe(1);
  });

  it('listens in the capture phase and can be removed', () => {
    const target = {
      added: [] as unknown[][],
      removed: [] as unknown[][],
      addEventListener(...a: unknown[]) {
        this.added.push(a);
      },
      removeEventListener(...a: unknown[]) {
        this.removed.push(a);
      },
    };
    const off = installAudioUnlock(engine(1), target);
    const tapListeners = target.added.filter((a) => a[0] !== 'visibilitychange');
    expect(tapListeners.map((a) => a[0])).toEqual(['pointerup', 'touchend', 'click', 'keydown']);
    expect(tapListeners.every((a) => (a[2] as { capture: boolean }).capture)).toBe(true);
    off();
    expect(target.removed.map((a) => a[0]).sort()).toEqual(
      ['click', 'keydown', 'pointerup', 'touchend', 'visibilitychange'].sort(),
    );
  });
});

describe('app-wide synth', () => {
  it('keeps the first audio error until a handler is registered, then delivers it once', () => {
    // Node has no AudioContext, so the first play call fails before any handler exists.
    synth.playNote('C4');
    const handler = vi.fn();
    setAudioErrorHandler(handler);
    expect(handler).toHaveBeenCalledTimes(1);
    setAudioErrorHandler(handler);
    synth.playCorrect();
    expect(handler).toHaveBeenCalledTimes(1);
    setAudioErrorHandler(undefined);
  });
});
