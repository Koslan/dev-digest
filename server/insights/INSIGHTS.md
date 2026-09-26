# INSIGHTS — server

Appended by the engineering-insights skill. Append only; never rewrite history.

## Patterns

- **2026-09-20 · Pattern** — Dependencies are resolved through the container, never imported at the call site; adding an LLM provider or swapping an adapter means registering it once in the composition root. Evidence: `server/src/platform/container.ts:163`.
- **2026-09-20 · Pattern** — Cost estimation is injected into the OpenRouter provider as a synchronous hook because the provider cannot await inside its response mapping; `PriceBook.estimate` is deliberately sync for that reason. Evidence: `server/src/platform/price-book.ts:16`.

## Mistakes

- **2026-09-20 · Mistake** — Editing an already-applied file under `server/src/db/migrations/` does not change an existing database: drizzle records which files ran, so the edit is skipped and the schema silently drifts. Generate a new migration with `pnpm db:generate` instead. Evidence: `server/src/db/migrate.ts:31`.
- **2026-09-20 · Mistake** — The Anthropic adapter's repair loop echoed the assistant turn (which carries a forced `tool_use` block) and then a plain text reprompt; the API rejects that with `tool_use ids were found without tool_result blocks` before the retry reaches the model, so every schema-failed call died on attempt two. The reprompt must be a `tool_result` block carrying the schema error. Evidence: `server/src/adapters/llm/anthropic.ts:138`.

- **2026-09-20 · Mistake** — A rescan that dedupes new proposals against EVERY stored rule wipes the page: the pending rows it compares against are the same rows the scan is about to delete, so each re-proposed rule is dropped and the old row removed. Dedupe only against rules a human ruled on or edited. Evidence: `server/src/modules/conventions/repository.ts:111`.

## Decisions

## Context

- **2026-09-20 · Context** — `reviewer-core` has its own lockfile and is imported by the API as raw TypeScript through a tsconfig path alias, so the API dies at import time with `Cannot find package 'openai'` until `npm ci` has been run inside `reviewer-core/`. The root README's manual steps omit this; only the dev script does it. Evidence: `scripts/dev.sh:80`.
- **2026-09-20 · Context** — `agent_runs` has no cost column: migration 0009 dropped `cost_usd`, while `ci_runs` and `eval_runs` kept theirs. The engine still returns `costUsd` in memory, so any cost feature is a persistence problem, not a computation one. Evidence: `server/src/db/migrations/0009_complex_runaways.sql:1`.
- **2026-09-20 · Context** — Supersedes the 2026-09-20 entry on `agent_runs` having no cost column: migration `0010_superb_solo.sql` added `cost_usd` back, and local runs now persist it. The rule that survives is the shape, not the absence — null means the provider reported no cost, never that the run was free. Evidence: `server/src/db/migrations/0010_superb_solo.sql:1`, `server/src/modules/reviews/run-executor.ts:216`.
- **2026-09-20 · Context** — `server/src/vendor/shared` and `client/src/vendor/shared` are NOT identical copies: the client one trims server-only pieces (no `openrouter` provider, no CI agent manifest). Copying a whole contract file from server to client reintroduces types the Next build cannot resolve — port only the changed fields. Evidence: `client/src/vendor/shared/adapters.ts:77`.
- **2026-09-20 · Context** — `estimateCost` prices models by exact string, so a run on a model missing from the table persists `cost_usd = null` while everything else succeeds. Model ids are used verbatim, so a dated id (`claude-haiku-4-5-20251001`) needs its own row next to the undated one. Evidence: `server/src/adapters/llm/pricing.ts:38`.
- **2026-09-20 · Context** — An Anthropic key created at organization level is rejected by `/v1/messages` with `This API key is not scoped to a workspace`; the key has to be created inside a workspace. A Claude subscription does not fund the API either — an unfunded key fails with `credit balance is too low`. Both surface as a failed run with the provider message preserved in the trace. Evidence: `server/src/platform/container.ts:179`.

- **2026-09-20 · Context** — `drizzle-kit generate` asks "created or renamed?" whenever one diff both adds and drops a column, and the prompt needs a real TTY — piping newlines and `winpty` both fail on Windows, and no file is written. Split the change into two generates (add-only, then drop-only). Evidence: `server/src/db/migrations/0011_slow_boomerang.sql`, `server/src/db/migrations/0012_dark_star_brand.sql`.
- **2026-09-20 · Context** — `runMigrations()` takes the database URL as an ARGUMENT; calling it with none makes postgres-js fall back to the OS user and fail with `FATAL 28P01 password authentication failed`, which reads like a wrong password in `.env`. Pass `process.env.DATABASE_URL`. Evidence: `server/src/db/migrate.ts:19`.

- **2026-09-20 · Context** — The conventions scan reads the sample through `container.git.readFile`, so it only works on a repo that was actually cloned (`repos.clone_path` non-null). A seeded demo repo has no clone and every sample read comes back empty, which surfaces as `CONVENTIONS_NO_SAMPLE` (422), not as a model failure. Evidence: `server/src/modules/conventions/service.ts:222`.

## Errors and fixes

- **2026-09-20 · Error → Fix** — On Windows `pnpm db:migrate` and `pnpm db:seed` exit silently without touching the database, and the API then fails with `relation "agents" does not exist`. Cause: the CLI guard `import.meta.url === \`file://${process.argv[1]}\`` never matches a Windows path, so the script body never runs. Fix: call `runMigrations()` and `seed()` directly from a small tsx entry file. Evidence: `server/src/db/migrate.ts:37`, `server/src/db/seed.ts:227`.
- **2026-09-20 · Error → Fix** — `pnpm test` on Windows fails 6 tests in `test/indexer-pipeline.test.ts` with `ENOENT … \src\util.ts` on a clean checkout: the fixture writer splits the path at `'/'` to create parent directories, which never matches a Windows path. Not caused by your change — verify with `git stash` before chasing it. Evidence: `server/test/indexer-pipeline.test.ts:142`.
- **2026-09-20 · Error → Fix** — A review of a freshly imported PR runs to completion but reports `No diff content provided` and zero findings: `GET /repos/:id/pulls` imports PR metadata only, and `pr_files.patch` stays empty until `GET /pulls/:id` is called (which is what opening the PR page does). The git fallback does not save it either, because the clone has only the default branch. Fetch the PR detail once before the first review. Evidence: `server/src/modules/reviews/diff-loader.ts:33`.
- **2026-09-26 · Error → Fix** — A review on `claude-sonnet-5` (any Claude 5 model) fails with `400 invalid_request_error: `temperature` is deprecated for this model`. The Anthropic adapter now sends `temperature` only to models below major version 5, the same way the OpenAI adapter drops it for GPT-5. Evidence: `server/src/adapters/llm/anthropic.ts:23`.
