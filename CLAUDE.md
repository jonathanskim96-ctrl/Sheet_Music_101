# CLAUDE.md: standing rules for every AI session

**Read `docs/HANDOFF.md` first**, then `docs/PLAN.md`. `docs/APP_BUILD_PLAYBOOK.md`
is the owner's general playbook; follow its process and safety rules, adapted as
described in `docs/PLAN.md` section 5 (this app has no server or database).

## Model split
- **Planning, product decisions, architecture, reviews:** Opus 5.5.
- **Execution (writing code, tests, docs for an agreed milestone):** Sonnet 5.5.
- If a Sonnet session hits a design question that isn't answered in `docs/PLAN.md`
  or `docs/HANDOFF.md`, stop and ask the owner (or note it for a planning session)
  instead of deciding alone.

## Working with the owner
- The owner is non-technical. Give exact clicks and exact links, one step at a time.
- When the owner must paste something, paste the content itself in the chat.
- **Ask before deciding product behaviour.** Offer 2–3 options with a
  recommendation; record the answer in `docs/HANDOFF.md`.
- Say plainly what is verified and what is not. If tests fail, show it.
- Confirm outward-facing or hard-to-reverse actions first (pushing to main,
  deleting anything).

## Data and structure safety
- The learner's progress outranks any feature. **Never wipe, reset or overwrite
  saved progress** to make something work, unless the owner asked for that exact
  action in this conversation.
- **Local storage schema changes are additive.** Bump the schema version and add an
  upgrade step; never edit or remove an existing upgrade step. Old saved data must
  load into the new version without loss (test it).
- Anything read from storage or an import file is untrusted: validate and normalise it.
- Reset/import that would replace progress needs an in-app confirmation and offers
  an export first. Never `confirm/alert/prompt`.
- Errors are always shown in the UI, never swallowed.
- **Git:** never force-push, rewrite published history, or delete a branch/tag
  without an explicit request. Never push to main with failing checks.
- **Tests are not obstacles.** If one fails, fix the change, not the test, unless
  the owner explicitly approves the changed behaviour. Never skip or disable a test.

## Security
- No secrets exist in this app; keep it that way. Never commit `.env*` (except
  `.env.example`) or exported progress files.
- No `dangerouslySetInnerHTML`/`innerHTML`/`eval`/`new Function`. Text only through
  React text nodes. Never build URLs from user input.
- CSP meta injected at build.
- Dependencies: only well-known packages; run `npm audit` after adding one.
- CI: least-privilege `permissions:`; untrusted values via `env:`, never `${{ }}`
  inside `run:`.

## Before every push
Run the full check chain (exact command will be listed in `docs/HANDOFF.md` once
the project is scaffolded) and report honestly what passed. Update
`docs/HANDOFF.md` and `NOTES.md` with what changed.
