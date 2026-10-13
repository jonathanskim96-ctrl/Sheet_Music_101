import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

let updateReady = false;
const listeners = new Set<() => void>();

/**
 * A new service worker took over. Only an update if a worker was already in control: the very
 * first install also fires `controllerchange` (clientsClaim), and that is not a new version.
 */
function onControllerChange(hadController: boolean): void {
  if (!hadController || updateReady) return;
  updateReady = true;
  for (const fn of [...listeners]) fn();
}

function watchControllerChanges(): void {
  const sw = 'serviceWorker' in navigator ? navigator.serviceWorker : undefined;
  if (!sw) return;
  let hadController = sw.controller !== null;
  sw.addEventListener('controllerchange', () => {
    onControllerChange(hadController);
    hadController = true;
  });
  if (import.meta.env.MODE === 'e2e') {
    // e2e builds only (compiled out of production; check-dist bans the name).
    Reflect.set(window, '__e2eFireControllerChange', () => {
      onControllerChange(true);
    });
  }
}

/** True once a new version has taken over; the UpdateBanner then offers a reload. */
export function useUpdateReady(): boolean {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => updateReady,
  );
}

/** Registers the service worker and checks for updates hourly and when the app regains focus. */
export function registerServiceWorker(): void {
  watchControllerChanges();
  registerSW({
    immediate: true,
    // With registerType 'autoUpdate' the plugin calls window.location.reload() when a new
    // version activates unless this is set. SPEC §7.8: never reload automatically (it could
    // interrupt a lesson); the UpdateBanner offers the reload instead.
    onNeedReload() {
      // Intentionally empty.
    },
    onRegisterError(error: unknown) {
      console.error('Service worker registration failed', error);
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        // Fails whenever the phone is offline; the next check retries, so only log it.
        registration.update().catch((error: unknown) => {
          console.warn('Service worker update check failed', error);
        });
      };
      setInterval(check, 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
  });
}
