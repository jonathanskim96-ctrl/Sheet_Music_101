import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isPersisted,
  requestPersistenceOnce,
  resetPersistRequestForTests,
  type MaybeStorage,
} from './persist';

afterEach(() => {
  resetPersistRequestForTests();
  vi.restoreAllMocks();
});

const storage = (over: MaybeStorage): MaybeStorage => over;

describe('requestPersistenceOnce', () => {
  it('asks only once per app run', () => {
    const persist = vi.fn(() => Promise.resolve(true));
    requestPersistenceOnce(storage({ persist }));
    requestPersistenceOnce(storage({ persist }));
    expect(persist).toHaveBeenCalledOnce();
  });

  it('ignores browsers without the API and failures (logged only)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(() => {
      requestPersistenceOnce(undefined);
    }).not.toThrow();
    resetPersistRequestForTests();
    requestPersistenceOnce(storage({ persist: () => Promise.reject(new Error('no')) }));
    await Promise.resolve();
    await Promise.resolve();
    expect(warn).toHaveBeenCalled();
  });
});

describe('isPersisted', () => {
  it('is true only when the browser says so', async () => {
    expect(await isPersisted(storage({ persisted: () => Promise.resolve(true) }))).toBe(true);
    expect(await isPersisted(storage({ persisted: () => Promise.resolve(false) }))).toBe(false);
    expect(await isPersisted(undefined)).toBe(false);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(await isPersisted(storage({ persisted: () => Promise.reject(new Error('x')) }))).toBe(
      false,
    );
  });
});
