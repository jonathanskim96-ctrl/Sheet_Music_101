import { describe, expect, it, vi } from 'vitest';
import { frequency } from '../domain/notes';
import {
  CORRECT_PLAN,
  FANFARE_PLAN,
  WRONG_PLAN,
  createSynth,
  installUnlock,
  notePlan,
  setAudioErrorHandler,
  synth,
  type AudioContextLike,
  type UnlockTarget,
} from './synth';

type Call = [name: string, value: number, time: number];

/** A fake AudioContext that records what was scheduled; never makes sound. */
function fakeContext(state = 'running') {
  const oscillators: { type: OscillatorType; freq: number; start: number; stop: number }[] = [];
  const gains: { calls: Call[] }[] = [];
  const created = { resumed: 0, closed: 0, silent: 0 };
  const ctx: AudioContextLike = {
    currentTime: 10,
    state,
    destination: {},
    resume: () => {
      created.resumed++;
      return Promise.resolve();
    },
    close: () => {
      created.closed++;
      return Promise.resolve();
    },
    createBuffer: () => ({}),
    createBufferSource: () => ({
      buffer: null,
      connect: () => undefined,
      start: () => {
        created.silent++;
      },
    }),
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
  it('creates the engine, resumes it and plays a silent buffer, without making a sound', () => {
    const f = fakeContext('suspended');
    const factory = vi.fn(() => f.ctx);
    const s = createSynth(factory);
    s.unlock();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(f.created.resumed).toBe(1);
    expect(f.created.silent).toBe(1);
    expect(f.oscillators).toHaveLength(0);
    s.playNote('C4');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('reports a failing engine once and never throws', () => {
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

  it('isRunning follows the engine state', () => {
    const f = fakeContext('suspended');
    const s = createSynth(() => f.ctx);
    expect(s.isRunning()).toBe(false);
    s.unlock();
    expect(s.isRunning()).toBe(false);
    (f.ctx as { state: string }).state = 'running';
    expect(s.isRunning()).toBe(true);
  });
});

/** A document stand-in: a real EventTarget plus a visibilityState we can change. */
function fakeDocument() {
  const target = new EventTarget();
  const doc = {
    visibilityState: 'visible',
    addEventListener: (type: string, fn: () => void, capture?: boolean) => {
      target.addEventListener(type, fn, { capture: capture === true });
    },
    removeEventListener: (type: string, fn: () => void, capture?: boolean) => {
      target.removeEventListener(type, fn, { capture: capture === true });
    },
  } satisfies UnlockTarget;
  return { doc, fire: (type: string) => target.dispatchEvent(new Event(type)) };
}

describe('installUnlock', () => {
  it.each(['pointerup', 'touchend', 'click', 'keydown'])(
    'starts the engine on the first %s',
    (type) => {
      const f = fakeContext('suspended');
      const factory = vi.fn(() => f.ctx);
      const d = fakeDocument();
      installUnlock(createSynth(factory), d.doc);
      expect(factory).not.toHaveBeenCalled();
      d.fire(type);
      expect(factory).toHaveBeenCalledTimes(1);
      expect(f.created.resumed).toBe(1);
    },
  );

  it('keeps listening until the engine runs, then stops', () => {
    const f = fakeContext('suspended');
    const s = createSynth(() => f.ctx);
    const d = fakeDocument();
    installUnlock(s, d.doc);
    d.fire('click');
    d.fire('click'); // still suspended: tries again
    expect(f.created.resumed).toBe(2);
    (f.ctx as { state: string }).state = 'running';
    d.fire('click'); // sees it running and detaches
    d.fire('click');
    expect(f.created.resumed).toBe(2);
    expect(f.created.silent).toBe(2);
  });

  it('listens again after the page has been hidden', () => {
    const f = fakeContext('running');
    const s = createSynth(() => f.ctx);
    const d = fakeDocument();
    installUnlock(s, d.doc);
    d.fire('click'); // nothing built yet, so this builds it
    (f.ctx as { state: string }).state = 'running';
    d.fire('click'); // running: detaches
    const before = f.created.silent;
    d.fire('click');
    expect(f.created.silent).toBe(before);
    d.doc.visibilityState = 'hidden';
    d.fire('visibilitychange');
    (f.ctx as { state: string }).state = 'interrupted';
    d.fire('click');
    expect(f.created.resumed).toBeGreaterThan(0);
    expect(f.created.silent).toBe(before + 1);
  });

  it('the returned function removes every listener', () => {
    const f = fakeContext('suspended');
    const factory = vi.fn(() => f.ctx);
    const d = fakeDocument();
    const off = installUnlock(createSynth(factory), d.doc);
    off();
    d.fire('click');
    d.doc.visibilityState = 'hidden';
    d.fire('visibilitychange');
    d.fire('click');
    expect(factory).not.toHaveBeenCalled();
  });
});

describe('restarting a stuck engine', () => {
  /** A context factory that hands out fresh fakes and remembers them. */
  function factoryOf(states: string[]) {
    const made: ReturnType<typeof fakeContext>[] = [];
    const factory = vi.fn(() => {
      const f = fakeContext(states[made.length] ?? 'running');
      made.push(f);
      return f.ctx;
    });
    return { factory, made };
  }

  it('closes and rebuilds an engine still not running 300 ms after the tap', () => {
    vi.useFakeTimers();
    try {
      const { factory, made } = factoryOf(['suspended', 'running']);
      const s = createSynth(factory);
      s.unlock();
      vi.advanceTimersByTime(299);
      expect(factory).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1);
      expect(factory).toHaveBeenCalledTimes(2);
      expect(made[0]?.created.closed).toBe(1);
      expect(made[1]?.created.resumed).toBe(0); // it was created running
      expect(made[1]?.created.silent).toBe(1);
      s.playNote('C4');
      expect(made[1]?.oscillators).toHaveLength(4);
      expect(made[0]?.oscillators).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('leaves an engine alone that is running after 300 ms', () => {
    vi.useFakeTimers();
    try {
      const f = fakeContext('suspended');
      const factory = vi.fn(() => f.ctx);
      const s = createSynth(factory);
      s.unlock();
      (f.ctx as { state: string }).state = 'running';
      vi.advanceTimersByTime(1000);
      expect(factory).toHaveBeenCalledTimes(1);
      expect(f.created.closed).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rebuilds at most once per tap, but again for the next tap', () => {
    vi.useFakeTimers();
    try {
      const { factory } = factoryOf(['suspended', 'suspended', 'suspended']);
      const s = createSynth(factory);
      s.unlock();
      vi.advanceTimersByTime(300);
      expect(factory).toHaveBeenCalledTimes(2);
      vi.advanceTimersByTime(5000);
      expect(factory).toHaveBeenCalledTimes(2);
      s.unlock();
      vi.advanceTimersByTime(300);
      expect(factory).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('two quick taps rebuild only once per tap, not twice for the same engine', () => {
    vi.useFakeTimers();
    try {
      const { factory } = factoryOf(['suspended', 'suspended', 'running']);
      const s = createSynth(factory);
      s.unlock();
      s.unlock();
      vi.advanceTimersByTime(300);
      // the first timer replaced the engine; the second sees a different engine and leaves it
      expect(factory).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('replaces a closed engine on the next sound', () => {
    const { factory, made } = factoryOf(['closed', 'running']);
    const s = createSynth(factory);
    s.playNote('C4');
    expect(factory).toHaveBeenCalledTimes(1);
    expect(made[0]?.oscillators).toHaveLength(4); // the first call had to use the engine it just built
    s.playNote('C4');
    expect(factory).toHaveBeenCalledTimes(2);
    expect(made[1]?.oscillators).toHaveLength(4);
  });

  it('reports a failing close() once, and keeps working', async () => {
    vi.useFakeTimers();
    try {
      const onError = vi.fn();
      const bad = fakeContext('suspended');
      bad.ctx.close = () => Promise.reject(new Error('cannot close'));
      const good = fakeContext('running');
      const list = [bad, good];
      let n = 0;
      const s = createSynth(() => (list[n++] ?? good).ctx, onError);
      s.unlock();
      vi.advanceTimersByTime(300);
      await vi.advanceTimersByTimeAsync(0);
      expect(onError).toHaveBeenCalledTimes(1);
      s.playNote('C4');
      expect(good.oscillators).toHaveLength(4);
    } finally {
      vi.useRealTimers();
    }
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
