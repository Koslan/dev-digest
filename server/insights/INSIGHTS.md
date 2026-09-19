# INSIGHTS — server

Appended by the engineering-insights skill. Append only; never rewrite history.

## Patterns

- **2026-09-20 · Pattern** — Dependencies are resolved through the container, never imported at the call site; adding an LLM provider or swapping an adapter means registering it once in the composition root. Evidence: `server/src/platform/container.ts:163`.
- **2026-09-20 · Pattern** — Cost estimation is injected into the OpenRouter provider as a synchronous hook because the provider cannot await inside its response mapping; `PriceBook.estimate` is deliberately sync for that reason. Evidence: `server/src/platform/price-book.ts:16`.

## Mistakes

- **2026-09-20 · Mistake** — Editing an already-applied file under `server/src/db/migrations/` does not change an existing database: drizzle records which files ran, so the edit is skipped and the schema silently drifts. Generate a new migration with `pnpm db:generate` instead. Evidence: `server/src/db/migrate.ts:31`.

## Decisions

## Context

- **2026-09-20 · Context** — `reviewer-core` has its own lockfile and is imported by the API as raw TypeScript through a tsconfig path alias, so the API dies at import time with `Cannot find package 'openai'` until `npm ci` has been run inside `reviewer-core/`. The root README's manual steps omit this; only the dev script does it. Evidence: `scripts/dev.sh:80`.
- **2026-09-20 · Context** — `agent_runs` has no cost column: migration 0009 dropped `cost_usd`, while `ci_runs` and `eval_runs` kept theirs. The engine still returns `costUsd` in memory, so any cost feature is a persistence problem, not a computation one. Evidence: `server/src/db/migrations/0009_complex_runaways.sql:1`.

## Errors and fixes

- **2026-09-20 · Error → Fix** — On Windows `pnpm db:migrate` and `pnpm db:seed` exit silently without touching the database, and the API then fails with `relation "agents" does not exist`. Cause: the CLI guard `import.meta.url === \`file://${process.argv[1]}\`` never matches a Windows path, so the script body never runs. Fix: call `runMigrations()` and `seed()` directly from a small tsx entry file. Evidence: `server/src/db/migrate.ts:37`, `server/src/db/seed.ts:227`.
