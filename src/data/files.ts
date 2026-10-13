// Backup files: export (share sheet or download) and import (size-capped read). SPEC 5.4.
import { BACKUP_MESSAGES, backupFileName, parseBackup, serializeBackup } from '../domain/backup';
import type { ParseBackupResult } from '../domain/backup';
import { dayKeyOf } from '../domain/days';
import type { Progress } from '../domain/progress';

/** Files bigger than this are rejected before they are read. */
export const MAX_IMPORT_BYTES = 1_000_000;

/** `shared` / `downloaded`: the file left the app. `cancelled`: the learner closed the share sheet. */
export type SaveOutcome = 'shared' | 'downloaded' | 'cancelled';

/** The parts of the browser this file uses; tests pass fakes. */
export interface FileEnv {
  nav: Pick<Navigator, 'share'> & { canShare?: Navigator['canShare'] };
  doc: Document;
  url: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>;
}

const realEnv = (): FileEnv => ({ nav: navigator, doc: document, url: URL });

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

/**
 * Offers a JSON file through the share sheet where the browser can share files (phones), else
 * downloads it. Must be called straight from a tap: nothing is awaited before `share()`.
 */
export async function saveJsonFile(
  text: string,
  fileName: string,
  title: string,
  env: FileEnv = realEnv(),
): Promise<SaveOutcome> {
  const file = new File([text], fileName, { type: 'application/json' });
  if (env.nav.canShare?.({ files: [file] }) === true) {
    try {
      await env.nav.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      // Closing the share sheet is a choice, not an error (SPEC 5.4).
      if (isAbort(e)) return 'cancelled';
      throw e;
    }
  }
  const href = env.url.createObjectURL(file);
  const a = env.doc.createElement('a');
  a.href = href;
  a.download = fileName;
  a.hidden = true;
  env.doc.body.append(a);
  a.click();
  a.remove();
  // Some browsers start the download after the click returns; give them a moment.
  setTimeout(() => {
    env.url.revokeObjectURL(href);
  }, 1000);
  return 'downloaded';
}

/** Saves a backup of `p` (SPEC 4.15 format and file name). */
export function exportBackup(p: Progress, now: Date, env?: FileEnv): Promise<SaveOutcome> {
  return saveJsonFile(serializeBackup(p, now), backupFileName(now), 'Sheet Music 101 backup', env);
}

/** Saves whatever is stored, exactly as it is, for the broken-data screen. */
export function exportRawData(raw: unknown, now: Date, env?: FileEnv): Promise<SaveOutcome> {
  const text = JSON.stringify(raw === undefined ? null : raw, null, 2);
  return saveJsonFile(
    text,
    `sheet-music-101-saved-data-${dayKeyOf(now)}.json`,
    'Sheet Music 101 saved data',
    env,
  );
}

/** Reads a chosen file as a backup. Too-big files are rejected before reading (SPEC 5.4). */
export async function readBackupFile(
  file: Pick<File, 'size' | 'text'>,
): Promise<ParseBackupResult> {
  if (file.size > MAX_IMPORT_BYTES) return { ok: false, message: BACKUP_MESSAGES.tooBig };
  let text: string;
  try {
    text = await file.text();
  } catch {
    // An unreadable file is reported with the fixed message; its content is never shown.
    return { ok: false, message: BACKUP_MESSAGES.damaged };
  }
  return parseBackup(text);
}
