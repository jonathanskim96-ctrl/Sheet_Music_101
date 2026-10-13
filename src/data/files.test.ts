import { afterEach, describe, expect, it, vi } from 'vitest';
import { BACKUP_MESSAGES, parseBackup } from '../domain/backup';
import { emptyProgress } from '../domain/progress';
import {
  MAX_IMPORT_BYTES,
  exportBackup,
  exportRawData,
  readBackupFile,
  saveJsonFile,
  type FileEnv,
} from './files';

const NOW = new Date(2026, 9, 14, 10, 0);

function fakeEnv(opts: { canShare?: boolean; share?: () => Promise<void> } = {}) {
  const anchor = { href: '', download: '', hidden: false, click: vi.fn(), remove: vi.fn() };
  const shared: File[] = [];
  const env: FileEnv = {
    nav: {
      share: vi.fn((data?: ShareData) => {
        shared.push(...(data?.files ?? []));
        return opts.share ? opts.share() : Promise.resolve();
      }),
      ...(opts.canShare === undefined ? {} : { canShare: () => opts.canShare === true }),
    },
    doc: {
      createElement: () => anchor,
      body: { append: vi.fn() },
    } as unknown as Document,
    url: { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() },
  };
  return { env, anchor, shared };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('saveJsonFile', () => {
  it('downloads through a temporary link when files cannot be shared, then revokes the URL', async () => {
    vi.useFakeTimers();
    const { env, anchor } = fakeEnv();
    expect(await saveJsonFile('{}', 'a.json', 't', env)).toBe('downloaded');
    expect(anchor.download).toBe('a.json');
    expect(anchor.href).toBe('blob:x');
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(anchor.remove).toHaveBeenCalledOnce();
    expect(env.url.revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(env.url.revokeObjectURL).toHaveBeenCalledWith('blob:x');
  });

  it('uses the share sheet when the browser can share files', async () => {
    const { env, anchor, shared } = fakeEnv({ canShare: true });
    expect(await saveJsonFile('{"a":1}', 'a.json', 'Title', env)).toBe('shared');
    expect(shared[0]?.name).toBe('a.json');
    expect(await shared[0]?.text()).toBe('{"a":1}');
    expect(anchor.click).not.toHaveBeenCalled();
  });

  it('treats a closed share sheet as a choice, not an error', async () => {
    const { env } = fakeEnv({
      canShare: true,
      share: () => Promise.reject(new DOMException('cancelled', 'AbortError')),
    });
    expect(await saveJsonFile('{}', 'a.json', 't', env)).toBe('cancelled');
  });

  it('passes other share errors on (they are shown to the learner)', async () => {
    const { env } = fakeEnv({
      canShare: true,
      share: () => Promise.reject(new DOMException('no', 'NotAllowedError')),
    });
    await expect(saveJsonFile('{}', 'a.json', 't', env)).rejects.toThrow('no');
  });

  it('downloads when canShare says no', async () => {
    const { env, anchor } = fakeEnv({ canShare: false });
    expect(await saveJsonFile('{}', 'a.json', 't', env)).toBe('downloaded');
    expect(anchor.click).toHaveBeenCalledOnce();
  });
});

describe('exportBackup', () => {
  it('shares a backup that parses back to the same progress, with the dated file name', async () => {
    const p = { ...emptyProgress('2026-10-01'), xp: 42 };
    const { env, shared } = fakeEnv({ canShare: true });
    await exportBackup(p, NOW, env);
    const file = shared[0];
    expect(file?.name).toBe('sheet-music-101-backup-2026-10-14.json');
    const parsed = parseBackup(await (file as File).text());
    expect(parsed.ok && parsed.progress).toEqual(p);
  });
});

describe('exportRawData', () => {
  it('saves the stored value as JSON, null when nothing is stored', async () => {
    const { env, shared } = fakeEnv({ canShare: true });
    await exportRawData({ rev: 7, doc: 'garbage' }, NOW, env);
    await exportRawData(undefined, NOW, env);
    expect(shared[0]?.name).toBe('sheet-music-101-saved-data-2026-10-14.json');
    expect(JSON.parse(await (shared[0] as File).text())).toEqual({ rev: 7, doc: 'garbage' });
    expect(await shared[1]?.text()).toBe('null');
  });
});

describe('readBackupFile', () => {
  it('rejects a file over 1 MB without reading it', async () => {
    const text = vi.fn(() => Promise.resolve('{}'));
    const result = await readBackupFile({ size: MAX_IMPORT_BYTES + 1, text });
    expect(result).toEqual({ ok: false, message: BACKUP_MESSAGES.tooBig });
    expect(text).not.toHaveBeenCalled();
  });

  it('parses a real backup', async () => {
    const p = emptyProgress('2026-10-01');
    const { env, shared } = fakeEnv({ canShare: true });
    await exportBackup(p, NOW, env);
    const result = await readBackupFile(shared[0] as File);
    expect(result.ok && result.progress).toEqual(p);
  });

  it('reports an unreadable file with the fixed message', async () => {
    const result = await readBackupFile({
      size: 10,
      text: () => Promise.reject(new Error('<b>file content</b>')),
    });
    expect(result).toEqual({ ok: false, message: BACKUP_MESSAGES.damaged });
  });
});
