// Asks the browser to keep this app's data (SPEC 5.3). Both calls are best-effort.

/** Old browsers (and some private modes) lack these, whatever the DOM types say. */
export interface MaybeStorage {
  persist?: () => Promise<boolean>;
  persisted?: () => Promise<boolean>;
}

const browserStorage = (): MaybeStorage | undefined =>
  'storage' in navigator ? navigator.storage : undefined;

let requested = false;

/** After the first completed session: ask once per app run for persistent storage. */
export function requestPersistenceOnce(storage: MaybeStorage | undefined = browserStorage()): void {
  if (requested) return;
  requested = true;
  try {
    // The answer doesn't change anything in the app; Settings reads the state separately.
    storage?.persist?.().catch((e: unknown) => {
      console.warn('Persistent storage request failed', e);
    });
  } catch (e) {
    console.warn('Persistent storage request failed', e);
  }
}

/** Whether the browser has promised to keep this app's data ("Protected" in Settings). */
export async function isPersisted(
  storage: MaybeStorage | undefined = browserStorage(),
): Promise<boolean> {
  try {
    return (await storage?.persisted?.()) === true;
  } catch (e) {
    console.warn('Could not read the storage protection state', e);
    return false;
  }
}

/** Test-only: forget that persistence was requested. */
export function resetPersistRequestForTests(): void {
  requested = false;
}
