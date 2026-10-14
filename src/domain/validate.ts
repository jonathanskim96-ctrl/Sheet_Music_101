import { isCardId, type CardId } from './cards';
import type { LessonId } from './curriculum';
import { isDayKey, type DayKey } from './days';
import { emptyProgress, type LessonRecord, type Progress } from './progress';
import type { Box, CardState } from './srs';

export type CheckMode = 'strict' | 'repair';
export interface CheckResult {
  progress: Progress | null;
  issues: string[];
}

const MAX_ISSUES = 20;
const MAX_INT = 1_000_000_000;
const MAX_ENTRIES = 1000;
const MAX_DAYS = 50_000;
const ID_RE = /^[a-z0-9-]{1,32}$/;
const PLACEHOLDER_DAY: DayKey = '2000-01-01';

interface Ctx {
  /** Number of problems found, including ones past the message cap. */
  problems: number;
  issues: string[];
}

/** Records a problem; messages are fixed text built from field names, never from the input. */
function problem(ctx: Ctx, message: string): void {
  ctx.problems += 1;
  if (ctx.issues.length < MAX_ISSUES) ctx.issues.push(message);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const proto: unknown = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/** Reads an own property only (never something inherited). */
function get(o: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(o, key) ? o[key] : undefined;
}

function num(ctx: Ctx, v: unknown, path: string, min: number, max: number, def: number): number {
  if (typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max) return v + 0;
  problem(ctx, `${path}: must be a whole number from ${String(min)} to ${String(max)}`);
  if (typeof v === 'number' && Number.isFinite(v)) {
    return Math.min(max, Math.max(min, Math.floor(v))) + 0;
  }
  return def;
}

function bool(ctx: Ctx, v: unknown, path: string, def: boolean): boolean {
  if (typeof v === 'boolean') return v;
  problem(ctx, `${path}: must be true or false`);
  return def;
}

function day(ctx: Ctx, v: unknown, path: string, fallback: DayKey): DayKey {
  if (isDayKey(v)) return v;
  problem(ctx, `${path}: must be a date`);
  return fallback;
}

function nullableDay(ctx: Ctx, v: unknown, path: string): DayKey | null {
  if (v === null) return null;
  if (isDayKey(v)) return v;
  problem(ctx, `${path}: must be a date or empty`);
  return null;
}

function section(ctx: Ctx, v: unknown, path: string): Record<string, unknown> {
  if (isPlainObject(v)) return v;
  problem(ctx, `${path}: missing or not an object`);
  return {};
}

const toBox = (n: number): Box => (n <= 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : n === 4 ? 4 : 5);
const toGoal = (n: number): 1 | 2 | 3 => (n <= 1 ? 1 : n === 2 ? 2 : 3);

/** Earliest valid date found anywhere reasonable in the document; used only to repair createdDay. */
function earliestDay(raw: Record<string, unknown>): DayKey | null {
  const found: DayKey[] = [];
  const add = (v: unknown): void => {
    if (isDayKey(v)) found.push(v);
  };
  const days = get(raw, 'daysPracticed');
  if (Array.isArray(days)) for (const d of days.slice(0, MAX_ENTRIES) as unknown[]) add(d);
  const today = get(raw, 'today');
  if (isPlainObject(today)) add(get(today, 'day'));
  const lessons = get(raw, 'lessons');
  if (isPlainObject(lessons)) {
    for (const k of Object.keys(lessons).slice(0, MAX_ENTRIES)) {
      const rec = lessons[k];
      if (isPlainObject(rec)) {
        add(get(rec, 'firstCompletedDay'));
        add(get(rec, 'lastCompletedDay'));
      }
    }
  }
  const cards = get(raw, 'cards');
  if (isPlainObject(cards)) {
    for (const k of Object.keys(cards).slice(0, MAX_ENTRIES)) {
      const c = cards[k];
      if (isPlainObject(c)) add(get(c, 'lastSeenDay'));
    }
  }
  return found.length === 0 ? null : found.reduce((a, b) => (a <= b ? a : b));
}

function parseLessons(ctx: Ctx, v: unknown, fallback: DayKey): Record<LessonId, LessonRecord> {
  const out: Record<string, LessonRecord> = Object.create(null) as Record<string, LessonRecord>;
  const map = section(ctx, v, 'lessons');
  const keys = Object.keys(map);
  if (keys.length > MAX_ENTRIES) problem(ctx, `lessons: more than ${String(MAX_ENTRIES)} entries`);
  let kept = 0;
  for (const key of keys) {
    if (!ID_RE.test(key)) {
      problem(ctx, 'lessons: entry with an invalid id dropped');
      continue;
    }
    const rec = map[key];
    if (!isPlainObject(rec)) {
      problem(ctx, 'lessons: entry that is not an object dropped');
      continue;
    }
    if (kept >= MAX_ENTRIES) continue;
    kept += 1;
    out[key] = {
      timesCompleted: num(ctx, get(rec, 'timesCompleted'), 'lessons.timesCompleted', 0, MAX_INT, 0),
      bestAccuracy: num(ctx, get(rec, 'bestAccuracy'), 'lessons.bestAccuracy', 0, 100, 0),
      firstCompletedDay: day(
        ctx,
        get(rec, 'firstCompletedDay'),
        'lessons.firstCompletedDay',
        fallback,
      ),
      lastCompletedDay: day(
        ctx,
        get(rec, 'lastCompletedDay'),
        'lessons.lastCompletedDay',
        fallback,
      ),
    };
  }
  return Object.fromEntries(Object.entries(out));
}

function parseCards(ctx: Ctx, v: unknown, fallback: DayKey): Partial<Record<CardId, CardState>> {
  const out: Record<string, CardState> = Object.create(null) as Record<string, CardState>;
  const map = section(ctx, v, 'cards');
  const keys = Object.keys(map);
  if (keys.length > MAX_ENTRIES) problem(ctx, `cards: more than ${String(MAX_ENTRIES)} entries`);
  for (const key of keys) {
    if (!isCardId(key)) {
      problem(ctx, 'cards: entry that is not a real card dropped');
      continue;
    }
    const c = map[key];
    if (!isPlainObject(c)) {
      problem(ctx, 'cards: entry that is not an object dropped');
      continue;
    }
    const seen = num(ctx, get(c, 'seen'), 'cards.seen', 0, MAX_INT, 0);
    let correct = num(ctx, get(c, 'correct'), 'cards.correct', 0, MAX_INT, 0);
    if (correct > seen) {
      problem(ctx, 'cards.correct: cannot be more than seen');
      correct = seen;
    }
    out[key] = {
      box: toBox(num(ctx, get(c, 'box'), 'cards.box', 1, 5, 1)),
      lastSeenDay: day(ctx, get(c, 'lastSeenDay'), 'cards.lastSeenDay', fallback),
      lastPromotedDay: nullableDay(ctx, get(c, 'lastPromotedDay'), 'cards.lastPromotedDay'),
      seen,
      correct,
      avgMs: num(ctx, get(c, 'avgMs'), 'cards.avgMs', 0, 60_000, 0),
    };
  }
  return Object.fromEntries(Object.entries(out));
}

function parseDays(ctx: Ctx, v: unknown): DayKey[] {
  if (!Array.isArray(v)) {
    problem(ctx, 'daysPracticed: must be a list');
    return [];
  }
  const list: unknown[] = v;
  if (list.length > MAX_DAYS) {
    problem(ctx, `daysPracticed: more than ${String(MAX_DAYS)} entries`);
  }
  const valid = new Set<DayKey>();
  let sawBad = false;
  let ordered = true;
  let prev: DayKey | null = null;
  for (const d of list) {
    if (!isDayKey(d)) {
      sawBad = true;
      continue;
    }
    if (prev !== null && d <= prev) ordered = false;
    prev = d;
    valid.add(d);
  }
  if (sawBad) problem(ctx, 'daysPracticed: invalid dates dropped');
  if (!ordered) problem(ctx, 'daysPracticed: must be in order with no repeats');
  const sorted = [...valid].sort();
  return sorted.length > MAX_DAYS ? sorted.slice(sorted.length - MAX_DAYS) : sorted;
}

/**
 * Checks (strict) or repairs (repair) an untrusted progress document. Always builds a fresh
 * object and only reads the keys the schema lists, so hostile input cannot pollute anything.
 */
export function checkProgress(raw: unknown, mode: CheckMode): CheckResult {
  const ctx: Ctx = { problems: 0, issues: [] };
  if (!isPlainObject(raw)) {
    return { progress: null, issues: ['The saved data is not a progress document.'] };
  }
  if (get(raw, 'schemaVersion') !== 2) {
    return { progress: null, issues: ['schemaVersion: must be 2'] };
  }

  let createdDay: DayKey;
  const rawCreated = get(raw, 'createdDay');
  if (isDayKey(rawCreated)) {
    createdDay = rawCreated;
  } else {
    problem(ctx, 'createdDay: must be a date');
    if (mode === 'repair') {
      const derived = earliestDay(raw);
      if (derived === null) return { progress: null, issues: ctx.issues };
      createdDay = derived;
    } else {
      // Strict always fails now, but keeps checking so every issue is listed (SPEC 4.7).
      createdDay = PLACEHOLDER_DAY;
    }
  }

  const defaults = emptyProgress(createdDay);

  const settings = section(ctx, get(raw, 'settings'), 'settings');
  const todayRaw = section(ctx, get(raw, 'today'), 'today');
  const flags = section(ctx, get(raw, 'flags'), 'flags');
  const totals = section(ctx, get(raw, 'totals'), 'totals');

  const progress: Progress = {
    schemaVersion: 2,
    createdDay,
    settings: {
      soundOn: bool(ctx, get(settings, 'soundOn'), 'settings.soundOn', defaults.settings.soundOn),
      dailyGoal: toGoal(num(ctx, get(settings, 'dailyGoal'), 'settings.dailyGoal', 1, 3, 1)),
    },
    xp: num(ctx, get(raw, 'xp'), 'xp', 0, MAX_INT, 0),
    lessons: parseLessons(ctx, get(raw, 'lessons'), createdDay),
    cards: parseCards(ctx, get(raw, 'cards'), createdDay),
    daysPracticed: parseDays(ctx, get(raw, 'daysPracticed')),
    today: {
      day: day(ctx, get(todayRaw, 'day'), 'today.day', createdDay),
      lessonsDone: num(ctx, get(todayRaw, 'lessonsDone'), 'today.lessonsDone', 0, MAX_INT, 0),
    },
    flags: {
      welcomeSeen: bool(ctx, get(flags, 'welcomeSeen'), 'flags.welcomeSeen', false),
      keyboardUnlockSeen: bool(
        ctx,
        get(flags, 'keyboardUnlockSeen'),
        'flags.keyboardUnlockSeen',
        false,
      ),
      installCardDismissedDay: nullableDay(
        ctx,
        get(flags, 'installCardDismissedDay'),
        'flags.installCardDismissedDay',
      ),
      lastExportDay: nullableDay(ctx, get(flags, 'lastExportDay'), 'flags.lastExportDay'),
    },
    totals: {
      questionsAnswered: num(
        ctx,
        get(totals, 'questionsAnswered'),
        'totals.questionsAnswered',
        0,
        MAX_INT,
        0,
      ),
      correctFirstTry: num(
        ctx,
        get(totals, 'correctFirstTry'),
        'totals.correctFirstTry',
        0,
        MAX_INT,
        0,
      ),
      reviewsDone: num(ctx, get(totals, 'reviewsDone'), 'totals.reviewsDone', 0, MAX_INT, 0),
      lessonsDone: num(ctx, get(totals, 'lessonsDone'), 'totals.lessonsDone', 0, MAX_INT, 0),
    },
  };

  if (mode === 'strict' && ctx.problems > 0) return { progress: null, issues: ctx.issues };
  return { progress, issues: ctx.issues };
}
