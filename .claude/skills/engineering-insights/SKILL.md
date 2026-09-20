---
name: engineering-insights
description: Captures non-obvious engineering findings into the INSIGHTS.md of the package that was touched (client, server, reviewer-core, e2e), and reads that file before work starts. ALWAYS invoke this skill at the start of any coding, debugging or investigation task in this repository, and again before reporting that task as done. Do not edit code, answer an architecture question, or close a session in this repository without this skill. Triggers on every task that touches client/, server/, reviewer-core/ or e2e/, on any debugging or "why does this behave like that" question, and whenever a surprising dependency, a failing command, a measured fact or a workaround shows up.
---

# Engineering Insights

Durable memory for this repository. Each package keeps its own
`insights/INSIGHTS.md`. What earlier sessions learned the hard way is read before
new work starts, and what this session learns is appended when it ends.

Two phases, both mandatory: **read at start**, **append at end**.

## Phase 1 — Read before work (every session)

Run this before the first edit or the first architectural claim:

1. Decide which packages the task touches. Map:
   - UI, pages, components, hooks → `client/insights/INSIGHTS.md`
   - API, DB, migrations, services, repo-intel → `server/insights/INSIGHTS.md`
   - prompt assembly, LLM calls, grounding, scoring → `reviewer-core/insights/INSIGHTS.md`
   - browser flows, seeded fixtures → `e2e/insights/INSIGHTS.md`
2. Read the `insights/INSIGHTS.md` of every package in that set. If the file does
   not exist yet, note that and continue; it is created at append time.
3. State in one short line which insight files were read and name the entries
   that are relevant to this task, or say "no relevant entries". This forces the
   content to be processed rather than skimmed, and proves the read happened.
4. Treat the entries as high-confidence guidance about this codebase unless the
   user says otherwise or the code visibly contradicts them. If an entry is
   contradicted, that contradiction is itself a finding for Phase 3.

## Phase 2 — Notice while working

Keep a running note whenever one of these happens. Do not interrupt the task to
write the file; collect and write once at the end.

| Rubric | Capture when |
|---|---|
| **Pattern** | A way of doing things in this repo that works and is not obvious from a single file — a convention, a wiring path, a place where the right abstraction already exists. |
| **Mistake** | Something that looked right and was wrong: a failed approach, an antipattern, a change that broke another package. |
| **Decision** | A choice made with a reason that will be re-litigated later if the reason is not written down. |
| **Context** | A non-obvious dependency, a tool or library quirk, an environment fact (OS, Docker, package manager) that cost time. |
| **Error → Fix** | A concrete error message with the concrete fix. Include the message text so a future session can grep for it. |

## Phase 3 — Append at the end (only when there is substance)

1. **Read the target file first.** Never append without reading the current
   content — an entry that is already there must not be duplicated, and a near
   duplicate is corrected by adding a dated note, not by editing the old entry.
2. Apply the significance test to each candidate. Write it only if all hold:
   - it would not be obvious to a competent engineer reading the code;
   - it is specific — a name, a path, a number, a command, an error string;
   - it is actionable next time, not a description of what was done this session.
3. If nothing survives the test, **write nothing** and say so. An empty append is
   the correct outcome of a routine session. Never pad the file to look busy.
4. Append the surviving entries to the right package file, under the right
   rubric heading, newest at the bottom of that section.

### Write contract — append only

- Only ever add lines. Never rewrite, reorder, reword, summarise, compact or
  delete an existing entry, and never regenerate the file from scratch.
- Superseded entries stay. Correct them with a new entry that names the date of
  the one it supersedes: `Supersedes 2026-09-20 entry on X: …`.
- One entry per finding. Do not merge two findings into one line.
- Edits go through an append to the end of the matching section, keeping the
  existing headings intact. If a section heading is missing, add the heading and
  the entry; leave every other section untouched.
- Never move an entry between packages. If a finding was filed in the wrong
  package, append it in the right one and add a one-line pointer in the old one.

### Entry format

```md
- **YYYY-MM-DD · Rubric** — finding, stated so it is actionable. Evidence: `path/to/file.ts:123`.
```

Rules:
- The date is the day the finding was made, in ISO form.
- Evidence is mandatory: `path:line` for code, or the exact command and its
  output for an environment fact. A file without a line number is acceptable
  only when the finding is about the file's existence.
- Paths are repo-relative with forward slashes.
- One or two sentences. If it needs more, it belongs in `docs/` or `specs/`.

### File skeleton

Create this when a package has no `insights/INSIGHTS.md` yet, then append under
the matching heading:

```md
# INSIGHTS — <package>

Appended by the engineering-insights skill. Append only; never rewrite history.

## Patterns
## Mistakes
## Decisions
## Context
## Errors and fixes
```

## Quality bar

See [examples.md](examples.md) for vague-versus-useful pairs taken from this
codebase. The short version:

- Bad: "Promises can be tricky." Good: "`Promise.all` in the ingest pipeline
  times out past 30 items — use `Promise.allSettled` in batches of 10."
- Bad: "Fixed the cost badge." Good: "`agent_runs.cost_usd` was dropped by
  migration 0009, so a cost feature needs a new migration, not a schema edit.
  Evidence: `server/src/db/migrations/0009_complex_runaways.sql:1`."

A reader who never saw this session must be able to act on the entry.

## Hygiene

- Keep each file readable. Past roughly 200 entries the signal drops; at that
  point propose splitting by domain, and let the user decide. Do not prune on
  your own — pruning is a rewrite, and this skill never rewrites.
- These files are committed. Treat them as part of the change under review.
