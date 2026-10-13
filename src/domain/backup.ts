import { CHECKPOINTS } from './curriculum';
import { dayKeyOf } from './days';
import { CURRENT_SCHEMA_VERSION, type Progress } from './progress';
import { upgradeToCurrent } from './upgrades';
import { checkProgress } from './validate';

export const BACKUP_APP = 'sheet-music-101';
export const BACKUP_KIND = 'backup';
/** Backups are small (a few KB); anything bigger is not one. */
export const MAX_BACKUP_CHARS = 1_000_000;

/** Fixed messages: file content is never echoed into the UI. */
export const BACKUP_MESSAGES = {
  tooBig: 'That file is too big to be a backup.',
  notBackup: "That file isn't a Sheet Music 101 backup.",
  damaged: "That backup file is damaged and can't be used.",
  newer: 'This backup is from a newer version of the app. Update the app first, then try again.',
} as const;

export interface BackupSummary {
  xp: number;
  lessonsCompleted: number;
  daysPracticed: number;
  cardsLearned: number;
  /** ISO timestamp from the file if it is a well-formed date, else null. */
  exportedAt: string | null;
}

export type ParseBackupResult =
  { ok: true; progress: Progress; summary: BackupSummary } | { ok: false; message: string };

/** The backup file text: pretty JSON (2 spaces) wrapping the progress document. */
export function serializeBackup(p: Progress, now: Date): string {
  return JSON.stringify(
    {
      app: BACKUP_APP,
      kind: BACKUP_KIND,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: now.toISOString(),
      progress: p,
    },
    null,
    2,
  );
}

/** `sheet-music-101-backup-YYYY-MM-DD.json` for the learner's local date. */
export function backupFileName(now: Date): string {
  return `sheet-music-101-backup-${dayKeyOf(now)}.json`;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

function cleanExportedAt(v: unknown): string | null {
  if (typeof v !== 'string' || !ISO_RE.test(v)) return null;
  const t = new Date(v);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function own(o: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(o, key) ? o[key] : undefined;
}

/** Reads a backup file's text. Untrusted: validated strictly, never partially accepted. */
export function parseBackup(text: string): ParseBackupResult {
  if (text.length > MAX_BACKUP_CHARS) return { ok: false, message: BACKUP_MESSAGES.tooBig };

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, message: BACKUP_MESSAGES.notBackup };
  }
  if (!isRecord(raw) || own(raw, 'app') !== BACKUP_APP || own(raw, 'kind') !== BACKUP_KIND) {
    return { ok: false, message: BACKUP_MESSAGES.notBackup };
  }

  const envelopeVersion = own(raw, 'schemaVersion');
  if (typeof envelopeVersion === 'number' && envelopeVersion > CURRENT_SCHEMA_VERSION) {
    return { ok: false, message: BACKUP_MESSAGES.newer };
  }
  const upgraded = upgradeToCurrent(own(raw, 'progress'));
  if (!upgraded.ok) {
    return {
      ok: false,
      message: upgraded.reason === 'newer' ? BACKUP_MESSAGES.newer : BACKUP_MESSAGES.damaged,
    };
  }
  const checked = checkProgress(upgraded.value, 'strict');
  if (checked.progress === null) return { ok: false, message: BACKUP_MESSAGES.damaged };

  const progress = checked.progress;
  const checkpointIds: readonly string[] = CHECKPOINTS.map((c) => c.id);
  return {
    ok: true,
    progress,
    summary: {
      xp: progress.xp,
      lessonsCompleted: Object.keys(progress.lessons).filter((id) => !checkpointIds.includes(id))
        .length,
      daysPracticed: progress.daysPracticed.length,
      cardsLearned: Object.keys(progress.cards).length,
      exportedAt: cleanExportedAt(own(raw, 'exportedAt')),
    },
  };
}
