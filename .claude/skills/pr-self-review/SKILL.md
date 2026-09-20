---
name: pr-self-review
description: Reviews the uncommitted diff in a second pass before work is called done, routing by touched surface — client changes pull the frontend skills, server changes pull the backend skills, a mixed diff pulls both. Invoke when the user asks for a self-review, a pre-commit check or a second pass over a change, or before reporting a multi-file change as finished. This is a manual workflow: it is NOT wired to a git hook and must never install one.
---

# PR self-review

A dispatcher, not a reviewer. It looks at what the diff touches, loads the
skills that apply to those surfaces, and runs one focused pass per surface.

Autotrigger is deliberately off. The lab wires this by hand so the routing is
observable; a `git push` hook comes later in the course. **Do not create,
suggest or edit a hook from inside this skill.**

## Step 1 — see the change

```bash
git status --short
git diff --stat
```

Then read the actual diff for the files that matter:

```bash
git diff -- client/ server/ reviewer-core/ e2e/
```

Work from the diff, not from memory of what you intended to write.

## Step 2 — route by surface

Classify every changed path, then load the matching skills. A diff that spans
two surfaces loads **both sets** — never pick the "main" one.

| Touched | Load |
|---|---|
| `client/**` | `frontend-architecture`, `react-best-practices`, `next-best-practices`, `react-testing-library` |
| `server/**` | `onion-architecture`, `fastify-best-practices`, `drizzle-orm-patterns`, `postgresql-table-design` |
| `reviewer-core/**` | `onion-architecture` (layering and purity), `typescript-expert` |
| `e2e/**` | `frontend-architecture` (the flows assert on UI labels) |
| `**/*.ts(x)` anywhere | `typescript-expert` |
| contracts under `vendor/shared/**` | both `frontend-architecture` and `onion-architecture` — a contract change is always two-sided |

State the routing out loud before reviewing: which surfaces were touched, which
skills that pulls in. That line is the proof the dispatcher did its job.

## Step 3 — review, one surface at a time

For each surface, in this order:

1. **Correctness** — what breaks, with which input or state. Wrong branch,
   missing await, unhandled rejection, an invariant the change silently voids.
2. **Layering** — does the change respect the loaded architecture skill? A
   route touching the database, a component calling `fetch`, an adapter built
   inline, a component placed in the wrong folder.
3. **Contracts** — does a response still match its Zod schema? Did a schema
   change get a migration? Did the client copy get the same field?
4. **Tests** — is there a test that would fail if this regressed? New behaviour
   with no test is a finding.
5. **Docs that are now lies** — a spec or `docs/*.md` describing the old
   behaviour is part of the change, not a follow-up.

Every finding cites `file:line` from the diff and says what breaks. No style
opinions unless the project's own convention is broken.

## Step 4 — verify, do not assume

Run the checks of every package the diff touched:

```bash
cd server && pnpm typecheck && pnpm test
cd client && pnpm typecheck && pnpm test
cd reviewer-core && npm run typecheck && npm test
```

A finding you can confirm by running something is worth more than three you
cannot. If a check fails for a reason the diff did not cause, say so explicitly
rather than folding it into the findings.

## Step 5 — report

Give a short list: the routing line, then findings ordered by severity, then
what you ran and what it said. If the diff is clean, say that — an empty review
is a valid outcome and better than padding.

Finish by invoking `engineering-insights` so anything non-obvious learned in
this pass is written down.
