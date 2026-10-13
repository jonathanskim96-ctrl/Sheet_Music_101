// "Install the app" support (SPEC 7.8): the Android/desktop install prompt, iPhone steps,
// and whether the app already runs from the home screen.
import { useSyncExternalStore } from 'react';
import { isIosDevice } from './platform';

/** Chrome's `beforeinstallprompt` event (not in the TypeScript DOM types). */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

function isInstallPromptEvent(e: Event): e is InstallPromptEvent {
  return 'prompt' in e && typeof e.prompt === 'function';
}

export interface InstallInfo {
  /** Running from the home screen (or as an installed desktop app). */
  standalone: boolean;
  /** iPhone/iPad: no install button exists, the learner follows the Share steps. */
  ios: boolean;
  /** The browser offered an install prompt that the Install button can show. */
  canPrompt: boolean;
}

let deferred: InstallPromptEvent | null = null;
let snapshot: InstallInfo = { standalone: false, ios: false, canPrompt: false };
const listeners = new Set<() => void>();
let started = false;

function standaloneNow(): boolean {
  const navStandalone: unknown = Reflect.get(navigator, 'standalone');
  return window.matchMedia('(display-mode: standalone)').matches || navStandalone === true;
}

function refresh(): void {
  snapshot = { standalone: standaloneNow(), ios: isIosDevice(), canPrompt: deferred !== null };
  for (const fn of [...listeners]) fn();
}

/** Call once at start-up, before the browser fires `beforeinstallprompt`. */
export function startInstallCapture(): void {
  if (started) return;
  started = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    if (!isInstallPromptEvent(e)) return;
    // Keep the event so our own Install button can show the prompt later.
    e.preventDefault();
    deferred = e;
    refresh();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    refresh();
  });
  window.matchMedia('(display-mode: standalone)').addEventListener('change', refresh);
  refresh();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** What install help this browser can offer; re-renders when it changes. */
export function useInstallInfo(): InstallInfo {
  return useSyncExternalStore(subscribe, () => snapshot);
}

/** The Install button: shows the browser's install dialog. The event can only be used once. */
export async function promptInstall(): Promise<void> {
  const e = deferred;
  if (!e) return;
  deferred = null;
  refresh();
  await e.prompt();
}

/** The Path's InstallCard shows only when it has something to offer (owner decision 2026-10-13). */
export function canOfferInstall(info: InstallInfo): boolean {
  return !info.standalone && (info.canPrompt || info.ios);
}
