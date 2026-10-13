// The backup actions screens use: export, import, and the broken-data rescue.
import { useCallback } from 'react';
import { useToast } from '../app/toasts';
import type { ParseBackupResult } from '../domain/backup';
import { TOASTS } from '../domain/content';
import { dayKeyOf } from '../domain/days';
import { planMarkExported, planReplaceAll } from '../domain/planners';
import type { Progress } from '../domain/progress';
import { exportBackup, exportRawData, readBackupFile } from './files';
import { useCommit, useNow, useProgress, useStore } from './ProgressContext';

function messageOf(e: unknown): string {
  return e instanceof Error && e.message !== '' ? e.message : 'unknown error';
}

/**
 * "Save a backup": share or download the progress, then remember the day. Resolves true when
 * the file left the app. Must be called straight from a tap (the share sheet needs it).
 */
export function useExportBackup(): () => Promise<boolean> {
  const state = useProgress();
  const commit = useCommit();
  const now = useNow();
  const toast = useToast();
  const progress =
    state.status === 'ready' || state.status === 'unavailable' ? state.progress : null;
  return useCallback(async () => {
    if (!progress) return false;
    const at = now();
    try {
      const outcome = await exportBackup(progress, at);
      if (outcome === 'cancelled') return false;
    } catch (e) {
      toast(`Something went wrong: ${messageOf(e)}`, 'error');
      return false;
    }
    toast(TOASTS.exportDone);
    // A failure to record the day is shown by commit itself; the file is saved either way.
    await commit((p) => planMarkExported(p, dayKeyOf(at)));
    return true;
  }, [progress, now, toast, commit]);
}

/** Reads a chosen backup file (never throws; errors are fixed messages). */
export function readImportFile(file: File): Promise<ParseBackupResult> {
  return readBackupFile(file);
}

/** "Replace my progress": the whole document is replaced by the (validated) backup. */
export function useReplaceProgress(): (incoming: Progress) => Promise<boolean> {
  const commit = useCommit();
  const toast = useToast();
  return useCallback(
    async (incoming) => {
      const r = await commit((p) => planReplaceAll(p, incoming));
      if (r.ok) toast(TOASTS.importDone);
      return r.ok;
    },
    [commit, toast],
  );
}

/** Broken-data screen: read what is stored, exactly, without writing anything. */
export function useReadRawSaved(): () => Promise<unknown> {
  const store = useStore();
  return useCallback(() => store.readRawRecord(), [store]);
}

/** Broken-data screen: save the raw stored value as a file (straight from a tap). */
export function useExportRaw(): (raw: unknown) => Promise<boolean> {
  const now = useNow();
  const toast = useToast();
  return useCallback(
    async (raw) => {
      try {
        return (await exportRawData(raw, now())) !== 'cancelled';
      } catch (e) {
        toast(`Something went wrong: ${messageOf(e)}`, 'error');
        return false;
      }
    },
    [now, toast],
  );
}

/** Broken-data screen, after both confirmations: replace the unreadable record. */
export function useStartFresh(): () => Promise<{ ok: true } | { ok: false; message: string }> {
  const store = useStore();
  const now = useNow();
  return useCallback(async () => {
    try {
      await store.startFresh(now());
      return { ok: true };
    } catch (e) {
      return { ok: false, message: messageOf(e) };
    }
  }, [store, now]);
}
