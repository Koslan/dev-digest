# Insight examples — vague versus useful

Every "useful" entry below is a real finding from this repository, in the exact
format the skill writes. Use them as the quality bar.

## Contents

- Pattern
- Mistake
- Decision
- Context
- Error and fix
- What not to write

## Pattern

Vague: "The server uses dependency injection."

Useful:
```md
- **2026-09-20 · Pattern** — Every service takes its dependencies from the container instead of importing adapters directly; adding an LLM provider means registering it in the container, not touching call sites. Evidence: `server/src/platform/container.ts:163`.
```

## Mistake

Vague: "Careful with the schema."

Useful:
```md
- **2026-09-20 · Mistake** — Editing an already-applied file in `server/src/db/migrations/` does not change an existing database: drizzle tracks applied files, so the edit is silently skipped and the schema drifts. Generate a new migration with `pnpm db:generate` instead. Evidence: `server/src/db/migrate.ts:31`.
```

## Decision

Vague: "We show the last run cost."

Useful:
```md
- **2026-09-20 · Decision** — The PR list Cost column sums every successful run of the PR rather than showing the latest run, because a PR is reviewed repeatedly and the question the column answers is "what did this PR cost us". Empty means no successful run yet, not zero. Evidence: `client/src/app/repos/[repoId]/pulls/_components/PRRow/PRRow.tsx:1`.
```

## Context

Vague: "Install the dependencies."

Useful:
```md
- **2026-09-20 · Context** — `reviewer-core` has its own lockfile and is imported as raw TypeScript through a tsconfig path alias, so the API crashes with `Cannot find package 'openai'` until `npm ci` has been run inside `reviewer-core/`. The root README's manual steps omit this; only `scripts/dev.sh` does it. Evidence: `scripts/dev.sh:80`.
```

## Error and fix

Vague: "Migrations did not run."

Useful:
```md
- **2026-09-20 · Error → Fix** — On Windows `pnpm db:migrate` and `pnpm db:seed` exit silently without touching the database: the CLI guard `import.meta.url === \`file://${process.argv[1]}\`` never matches a Windows path, so the script body is skipped. Symptom is `relation "agents" does not exist` from the API. Fix: call `runMigrations()` / `seed()` directly from a small tsx entry file. Evidence: `server/src/db/migrate.ts:37`.
```

## What not to write

These fail the significance test and must be skipped:

- "Added a cost column to the PR list." — describes the session, not a finding.
- "The client is built with Next.js." — obvious from `client/package.json`.
- "Tests should pass before committing." — generic advice, not repo knowledge.
- "Refactored `PRRow` for readability." — no reader action follows from it.
- "Fixed a bug in the trace drawer." — no mechanism, no evidence, not greppable.
