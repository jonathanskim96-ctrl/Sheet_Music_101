# Build guide: how the execution sessions work

Planning is finished (Opus 5.5). Building happens in **seven milestones**, each done by a
**Sonnet 5.5** session that follows its milestone file exactly, then checked by an **Opus 5.5**
review session, then merged by the owner.

## Documents

| File | Purpose |
|---|---|
| `CLAUDE.md` | Standing rules (always loaded) |
| `docs/HANDOFF.md` | Current state; read first |
| `docs/build/SPEC.md` | What to build: data model, algorithms, UI, security |
| `docs/build/CURRICULUM.md` | Lesson data and every learner-facing text |
| `docs/build/STANDARDS.md` | How to build: checks, coding, testing, debugging, security, reviews |
| `docs/build/M1.md` … `M7.md` | Step-by-step tasks per milestone |
| `docs/build/m1-files/` | Verified config files copied in by M1 |

## Milestones

| # | Milestone | What the owner gets |
|---|---|---|
| M1 | Scaffold, guardrails, CI, deploy | Empty app live at the URL, installable |
| M2 | Domain core (pure logic + tests) | Nothing visible (foundation) |
| M3 | Look, sound, notation, gallery | Screenshots to approve the look |
| M4 | Saving + first playable lessons (units 1–4) | **First real use on the phone** |
| M5 | Progress, settings, backups, safety nets | Backups, progress chart, settings |
| M6 | Full curriculum | Everything playable |
| M7 | Hardening, reviews, go-live | Finished app |

## The cycle for each milestone (owner's steps)

1. Start a new Claude Code session on this repository, choose **Sonnet 5.5** as the model,
   and paste the **execution prompt** below with the milestone number.
2. When it says the PR is ready, start a new session with **Opus 5.5** and paste the
   **review prompt**.
3. If the review lists changes, start a Sonnet session with the **fix prompt**.
4. When CI is green and the review is resolved, merge the PR (`docs/SETUP.md` §4).

### Execution prompt (Sonnet 5.5)
> Read `CLAUDE.md`, `docs/HANDOFF.md`, `docs/build/README.md` and `docs/build/STANDARDS.md`.
> Then execute `docs/build/M<N>.md` step by step, exactly as written, using
> `docs/build/SPEC.md` and `docs/build/CURRICULUM.md` as the reference. Do not make product
> or design decisions that the documents don't cover: stop and ask me. Follow the debugging
> protocol and the "debug again" pass. Run `npm run verify` before every push. When done, open
> a pull request to `main` with the definition-of-done checklist, and tell me in plain words
> what I can now try and anything that isn't verified.

### Review prompt (Opus 5.5)
> Read `CLAUDE.md`, `docs/HANDOFF.md` and everything in `docs/build/`. Review the open pull
> request for milestone M<N> against `M<N>.md`, `SPEC.md`, `CURRICULUM.md` and `STANDARDS.md`.
> Run `/code-review high` on it, and `/security-review` too if this is M1, M4, M5 or M7. Check
> that every step was done as written and every test listed exists and is meaningful. Fix small
> issues yourself (with `npm run verify` green before pushing); write anything larger as a
> numbered list in the PR for a Sonnet fix session. Tell me plainly whether it's ready to merge.

### Fix prompt (Sonnet 5.5)
> Read `CLAUDE.md`, `docs/HANDOFF.md` and `docs/build/STANDARDS.md`. Fix the numbered review
> items on the open pull request for milestone M<N>, one commit per item, following the
> debugging protocol. Run `npm run verify` before pushing, reply on the PR with what changed,
> and tell me when it's ready.

## When to come back to Opus for planning
- A Sonnet session stops and asks a question the docs don't answer.
- The same failure survives two fix attempts (STANDARDS §4 stop rule).
- The owner wants to change behaviour, add a feature, or change the curriculum.
- Any change to the `Progress` shape after M4 is merged (needs a schema upgrade plan).
