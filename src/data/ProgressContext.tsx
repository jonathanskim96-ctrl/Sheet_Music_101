import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useToast } from '../app/toasts';
import { synth } from '../audio/synth';
import type { Progress } from '../domain/progress';
import { ProgressStore, type Planner, type StoreState } from './store';

const StoreContext = createContext<ProgressStore | null>(null);

function useStore(): ProgressStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('Progress hooks need a ProgressProvider');
  return store;
}

/** Creates the one store, loads it, and keeps the sound setting in step with the progress. */
export function ProgressProvider({
  children,
  store: given,
}: {
  children: ReactNode;
  store?: ProgressStore;
}) {
  const [store] = useState(() => given ?? new ProgressStore());
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const toast = useToast();

  useEffect(() => {
    store.load(new Date()).catch((e: unknown) => {
      toast(`Something went wrong: ${e instanceof Error ? e.message : 'unknown error'}`, 'error');
    });
  }, [store, toast]);

  const soundOn =
    state.status === 'ready' || state.status === 'unavailable'
      ? state.progress.settings.soundOn
      : true;
  useEffect(() => {
    synth.setMuted(!soundOn);
  }, [soundOn]);

  const repaired = state.status === 'ready' && state.repaired.length > 0;
  const toldRepaired = useRef(false);
  useEffect(() => {
    if (repaired && !toldRepaired.current) {
      toldRepaired.current = true;
      toast('Some saved data was damaged and has been repaired.');
    }
  }, [repaired, toast]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

/** The store's state: loading, ready, broken or unavailable. */
export function useProgress(): StoreState {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getState);
}

/** The progress document; only for screens shown after loading (throws otherwise). */
export function useLoadedProgress(): Progress {
  const state = useProgress();
  if (state.status !== 'ready' && state.status !== 'unavailable') {
    throw new Error('Progress is not loaded');
  }
  return state.progress;
}

export type CommitResult = { ok: true } | { ok: false; message: string };

/**
 * `commit(planner)`: saves a change. Never rejects; a failure is shown in a toast and returned.
 * A caller that shows the failure itself passes `{ toast: false }` so it appears only once.
 */
export function useCommit(): (
  planner: Planner,
  options?: { toast?: boolean },
) => Promise<CommitResult> {
  const store = useStore();
  const toast = useToast();
  return useCallback(
    async (planner, options) => {
      try {
        await store.commit(planner);
        return { ok: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : 'unknown error';
        if (options?.toast !== false) toast(`Something went wrong: ${message}`, 'error');
        return { ok: false, message };
      }
    },
    [store, toast],
  );
}

/** Tries again to save changes that failed to write. */
export function useRetrySave(): () => void {
  const store = useStore();
  const toast = useToast();
  return useCallback(() => {
    store.retrySave().catch((e: unknown) => {
      toast(`Something went wrong: ${e instanceof Error ? e.message : 'unknown error'}`, 'error');
    });
  }, [store, toast]);
}

/** The clock, as a function so tests and the e2e clock control it: `useNow()()`. */
export function useNow(): () => Date {
  return now;
}
const now = (): Date => new Date();
