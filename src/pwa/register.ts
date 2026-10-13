import { registerSW } from 'virtual:pwa-register';

/** Registers the service worker and checks for updates hourly and when the app regains focus. */
export function registerServiceWorker(): void {
  registerSW({
    immediate: true,
    // With registerType 'autoUpdate' the plugin calls window.location.reload() when a new
    // version activates unless this is set. SPEC §7.8: never reload automatically (it could
    // interrupt a lesson); the UpdateBanner (M5) offers the reload instead.
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
