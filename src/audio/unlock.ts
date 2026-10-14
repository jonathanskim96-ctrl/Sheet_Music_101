import type { Synth } from './synth';

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
