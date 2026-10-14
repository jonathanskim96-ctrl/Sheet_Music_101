# Saved progress: schema version 2 (data-model impact of units 12–25)

_Planned 2026-10-14 (Opus). Built in M8. Rules: `CLAUDE.md` "Data and structure safety",
SPEC §4.6–§4.8, §6, §8.2._

## 1. What units 12–25 need from saved progress

| Need | Stored where | Change? |
|---|---|---|
| Lesson and checkpoint records for `u12-l1` … `u25-l6`, `cp-d` … `cp-f` | `lessons` (any well-formed id is already kept) | **None** |
| Spaced repetition for the 12 sharp/flat notes | `cards` | **Yes**: new card ids |
| Spaced repetition for natural notes read inside tunes (`name-in-music`) | `cards` (existing natural ids) | None |
| Rhythm, listening, distance and stack questions | not stored per item (like units 1 and 11); counted in `totals` | None |
| XP, days, daily goal, flags, settings | as today | None |

So the **only** change is that `Progress.cards` may hold 12 more keys:
`treble-F#4 treble-G#4 treble-Ab4 treble-Bb4 treble-C#5 treble-Eb5`
`bass-Ab2 bass-Bb2 bass-C#3 bass-Eb3 bass-F#3 bass-G#3`.

No new fields, no renamed fields, nothing removed.

## 2. Why the version still has to go up (1 → 2)

Today `checkProgress` keeps only card keys that are in `ALL_CARDS` (34). Picture a phone where
the app was updated to part 2 and the learner met F♯, but an **older copy** of the app still
runs: a tab left open before the update, or a backup restored on a second phone that hasn't
updated yet. That older copy would load the document in `repair` mode, **drop the sign cards
as unknown**, and save the result: silent loss of progress.

With `schemaVersion: 2` the older copy's `upgradeToCurrent` answers `newer`, which already
leads to the "saved by a newer version of the app" screen (`storeChecks.ts`) and **never
writes**. Restoring a v2 backup in an older app shows "This backup is from a newer version of
the app. Update the app first, then try again." Reloading picks up the new version (the
service worker serves it), and everything loads again.

`CardId` changes type (a union of 46 ids) and `Progress.schemaVersion` changes from `1` to `2`.
These are exactly the "changes to `Progress`" that CLAUDE.md says need a bump.

## 3. The change, exactly

1. `src/domain/cards.ts`: `SIGN_CARDS` (12, order as above), `ALL_CARDS = [...NATURAL_CARDS, ...SIGN_CARDS]`,
   `NATURAL_CARDS` = today's 34 in today's order. `parseCardId` returns `{ clef, note, sign }`.
   `isCardId` accepts the 46.
2. `src/domain/progress.ts`: `CURRENT_SCHEMA_VERSION = 2`; `schemaVersion: 2` in the type and
   in `emptyProgress`.
3. `src/domain/upgrades.ts`: **append** (the map is empty today, so nothing old is edited):
   ```ts
   export const UPGRADE_STEPS: Readonly<Record<number, UpgradeStep>> = {
     // v1 → v2 (2026-10, course part 2): no field changes; the bump stops older app versions
     // from loading (and dropping) the new sharp/flat cards. Never edit this step.
     1: (raw) => ({ ...raw, schemaVersion: 2 }),
   };
   ```
   The spread copies own keys only into a fresh object literal (a `__proto__` key from
   `JSON.parse` becomes a plain own property, never the prototype). Validation still runs
   afterwards and reads only the listed keys.
4. `src/domain/validate.ts`: `schemaVersion` must be exactly `2` (message
   "schemaVersion: must be 2"); output `schemaVersion: 2`. Card keys: in the new `ALL_CARDS`.
   Nothing else.
5. `src/domain/backup.ts`: envelope `schemaVersion: CURRENT_SCHEMA_VERSION` (2). Envelopes 1 and
   2 are accepted (the progress inside goes through `upgradeToCurrent`). `> 2` → `newer`.
6. `src/domain/ids.lock.json`: add the 12 card ids (lesson ids are added by the milestone that
   adds the lessons).
7. `tests/fixtures/progress-v2.json`: new, never edited afterwards; hash recorded in
   `tests/fixtures/fixtures.lock.json`. **`progress-v1.json` is not touched.**
8. SPEC §4.6–§4.8 tables: mark the new values (done in planning; M8 checks they match the code).

`db.ts` keeps IndexedDB database version 1 (the database layout does not change; only the
document inside it).

## 4. Fixture `progress-v2.json` (M8 writes it once)

Same shape as `progress-v1.json`, `schemaVersion: 2`, and in addition: 3 sign cards
(`treble-F#4` box 3, `treble-Bb4` box 1, `bass-C#3` box 2), lesson records `u12-l1`, `u12-l2`,
`cp-d` (`timesCompleted: 0` style records for u13–u15 level-1 lessons, as a passed checkpoint
writes them), and one unknown-but-well-formed future lesson id `u26-l1` (must be kept).

## 5. Tests that prove old saves still load (all in M8)

In `src/domain/upgrades.test.ts`, `validate.test.ts`, `backup.test.ts`, `src/data/store.test.ts`:

1. **v1 fixture upgrades and validates:** `progress-v1.json` → `upgradeToCurrent` → `ok`,
   `schemaVersion === 2` → `checkProgress(strict)` passes with **no issues** → `xp`, every
   `lessons` record, every `cards` state, `daysPracticed`, `today`, `flags`, `settings`, `totals`
   are deep-equal to the fixture's values (only `schemaVersion` differs).
2. **v2 fixture** strict-validates and keeps its sign cards and the `u26-l1` record.
3. **The step does not mutate its input** (deep-frozen input) and returns a new object.
4. **Hostile v1 input:** a v1 document with `__proto__`, `constructor` keys and junk card ids
   upgrades without polluting `Object.prototype`; repair drops the junk; strict reports it.
5. **Newer stays refused:** `schemaVersion: 3` → `newer`; an older app simulated with
   `upgradeWith(v2doc, 1, {})` → `newer` (proves the reason for the bump).
6. **Unknown card keys are still dropped**: e.g. `treble-F#5`, `treble-Gb4`, `bass-F#4`
   (not among the 12) → repair drops, strict rejects.
7. **Backups:** a v1 backup envelope (with the v1 fixture inside) restores; a v2 export
   round-trips (`serializeBackup` → `parseBackup` → deep-equal); envelope 3 → newer message.
8. **Store (fake-indexeddb):** a database holding the v1 fixture record loads as `ready`
   with no `repaired` issues; the **first commit after loading writes `schemaVersion: 2`** and
   keeps every card and lesson; a database holding a v3 document loads as `broken` with the
   "newer version" reason and the stored record is byte-for-byte unchanged afterwards.
9. **E2E** (`e2e/persistence.spec.ts`): seed IndexedDB with the v1 fixture, open the app, finish
   one lesson, read the stored record: `schemaVersion` 2, earlier XP + the new XP, all old cards
   present.
10. **Property test:** for random valid v1 documents (fast-check), upgrade + strict passes and
    every field except `schemaVersion` is preserved.
11. `check-safety` still passes (both fixture hashes recorded; v1 unchanged).

## 6. Mutation checks (STANDARDS §3) to record in NOTES.md

- Remove step 1 → test 1 and the e2e test fail.
- Make step 1 drop `cards` → test 1 fails.
- Leave `CURRENT_SCHEMA_VERSION` at 1 → test 5 (older-app simulation) and the fixture test fail.
- Edit `progress-v1.json` → `check-safety` fails.
