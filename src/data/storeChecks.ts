// Checks shared by the progress store: what a stored document means, and whether a change is valid.
import type { Progress } from '../domain/progress';
import { upgradeToCurrent } from '../domain/upgrades';
import { checkProgress } from '../domain/validate';

export type Planner = (p: Progress) => Progress;

/** A planner produced something invalid (a bug in the app, never the learner's fault). */
export class PlannerError extends Error {
  override name = 'PlannerError';
}

export const MSG_NEWER = 'This progress was saved by a newer version of the app.';
/** Shown when something tries to replace progress that only a newer app version can read. */
export const MSG_NEWER_NO_RESET =
  'This progress was saved by a newer version of the app. Reload the app to update it.';
const MSG_UNREADABLE = "The saved data can't be read.";
export const MSG_READABLE_AGAIN = 'The saved progress can be read again. Reload the app to see it.';

export type Interpreted =
  { ok: true; progress: Progress; issues: string[] } | { ok: false; reason: string };

/** Upgrade, then repair-validate, a stored document. Never throws. */
export function interpret(doc: unknown): Interpreted {
  const upgraded = upgradeToCurrent(doc);
  if (!upgraded.ok)
    return { ok: false, reason: upgraded.reason === 'newer' ? MSG_NEWER : MSG_UNREADABLE };
  const checked = checkProgress(upgraded.value, 'repair');
  return checked.progress
    ? { ok: true, progress: checked.progress, issues: checked.issues }
    : { ok: false, reason: MSG_UNREADABLE };
}

/** Runs a planner and insists the result is a valid document (SPEC 5.2). */
export function applyChecked(planner: Planner, base: Progress): Progress {
  let next: Progress;
  try {
    next = planner(base);
  } catch (e) {
    throw new PlannerError(`A change to the progress failed: ${messageOf(e)}`);
  }
  const checked = checkProgress(next, 'strict');
  if (!checked.progress) {
    throw new PlannerError(
      `A change would have made the progress invalid: ${checked.issues.join('; ')}`,
    );
  }
  return checked.progress;
}

export function applyAll(base: Progress, planners: readonly Planner[]): Progress {
  return planners.reduce((p, planner) => applyChecked(planner, p), base);
}

export function messageOf(e: unknown): string {
  return e instanceof Error && e.message !== '' ? e.message : 'Unknown error';
}
