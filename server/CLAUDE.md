# server — `@devdigest/api`

Fastify 5 API over Postgres (Drizzle ORM, pgvector). Owns persistence, GitHub
access, run orchestration and `repo-intel`. The review engine itself lives in
[`reviewer-core/`](../reviewer-core/CLAUDE.md) and is consumed as raw TypeScript
through a path alias, not as a built package.

Read the [root guide](../CLAUDE.md) first for repo-wide rules.

## Read when

| Task | Read |
|---|---|
| Understanding bootstrap, DI, module layering, adapters | [docs/architecture.md](docs/architecture.md) |
| Anything touching a review run, findings or the trace | [specs/review-flow.md](specs/review-flow.md) |
| Non-obvious findings from earlier sessions | [insights/INSIGHTS.md](insights/INSIGHTS.md) |
| API surface, route map, injection stance | [README.md](README.md) |
| Which suite runs where, unit vs integration | [../TESTING.md](../TESTING.md) |

## Stack

TypeScript 5.7 ESM (`"type": "module"`), Node ≥ 22, pnpm. Fastify 5 with
`@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`, `fastify-sse-v2` and
`fastify-type-provider-zod`. Drizzle ORM 0.38 over the `postgres` driver. Zod 3
contracts. Octokit for GitHub. `@ast-grep/napi`, `@vscode/ripgrep`,
`dependency-cruiser` and `js-tiktoken` for `repo-intel`. pino for logs.

## Commands

```sh
pnpm install
pnpm dev          # tsx watch src/server.ts → :3001
pnpm build        # tsc -p tsconfig.json
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest run (unit + integration)
pnpm db:generate  # drizzle-kit generate — the ONLY way to add a migration
pnpm db:migrate   # apply migrations (never run on boot)
pnpm db:seed      # idempotent demo data
```

Lane split is by filename, not by script:

```sh
pnpm exec vitest run --exclude '**/*.it.test.ts'   # hermetic units, no Docker
pnpm exec vitest run .it.test                      # DB-backed, needs Docker
```

`reviewer-core` must have its dependencies installed (`cd ../reviewer-core && npm ci`)
or the API crashes at import time — the server loads its raw source.

## Layout

- `src/server.ts` — entrypoint: `loadConfig()` → `buildApp()` → `listen`, plus
  graceful shutdown.
- `src/app.ts` — app factory. Plugins, Zod type provider, error handler, DI
  container decoration, static module registration, boot-time stale-run reaping.
  Health routes live here, not in a module.
- `src/platform/` — cross-cutting services: `config.ts`, `container.ts` (DI
  composition root), `sse.ts` (`RunBus`), `run-logger.ts`, `price-book.ts`,
  `jobs.ts`, `errors.ts`.
- `src/modules/<domain>/` — eight domains: `settings`, `repos`, `pulls`,
  `polling`, `workspace`, `agents`, `reviews`, `repo-intel`. Registered
  statically in `src/modules/index.ts`; `@fastify/autoload` is deliberately unused.
- `src/adapters/` — implementations of the interfaces in
  `src/vendor/shared/adapters.ts`: LLM, GitHub, git, code index, ast-grep,
  depgraph, tokenizer, embedder, secrets, auth, and `mocks.ts` for tests.
- `src/db/` — `client.ts`, `schema/<domain>.ts` + `schema.ts` barrel, `rows.ts`,
  `migrations/`, `migrate.ts`, `seed.ts`.
- `src/vendor/shared/` — the Zod contracts, imported everywhere as
  `@devdigest/shared`.
- `test/` — all suites live here; nothing colocated in `src/`.

## Conventions

- **Layering inside a module:** `routes.ts` (transport only) → `service.ts`
  (business logic) → `repository.ts` (the only place SQL is written) →
  `helpers.ts` (pure transforms) → `constants.ts` (literals). Thin modules may
  skip layers; no layer may be jumped over in the other direction.
- `routes.ts` default-exports an async plugin named `<domain>Routes`. Directories
  are kebab-case, the registry key is camelCase.
- `*.repo.ts` is used only inside `src/modules/reviews/repository/`, where the
  queries are split into free functions taking `db` first and composed by the
  `ReviewRepository` facade.
- Every route resolves tenancy through `getContext(container, req)` from
  `src/modules/_shared/context.ts`. Never query without `workspace_id`.
- Relative imports carry an explicit `.js` extension (ESM), except inside
  `src/db/schema/*`.
- Wire format is `snake_case`, row types are `camelCase`; convert in
  `helpers.ts` DTO mappers or repository result mappers, nowhere else.
- Zod contracts use one PascalCase identifier for both schema and inferred type,
  and are reused directly as Fastify route schemas.
- `src/vendor/shared/` is extended with new files; existing contract files are
  not edited, and the copy in `client/src/vendor/shared` must stay identical.
- Tests: `*.it.test.ts` = real Postgres via testcontainers; every other
  `*.test.ts` must stay hermetic — build the app with `buildApp({ config,
  overrides })` and drive it with `app.inject()`.

## Do not touch

- `src/db/migrations/**` — applied history, including `meta/_journal.json` and the
  snapshots. Schema changes go into `src/db/schema/*.ts` followed by
  `pnpm db:generate`; the generated file is committed as-is. Never edit or
  renumber an existing migration, and never `ALTER TABLE` the dev database by
  hand. Drizzle stores the hash of each applied file, so an edited migration is
  skipped silently and the database drifts from the schema.
- `pnpm-lock.yaml` — regenerate through pnpm; never hand-edit versions or hashes.
- `src/vendor/shared/**` — mirrored into the client; changing one copy only is a
  contract break.
- Secrets never go into the database. `settings` holds non-secret preferences;
  API keys are read and written through `SecretsProvider`
  (`~/.devdigest/secrets.json`, mode `0600`, with `process.env` as fallback).

## Gotchas

- `POST /pulls/:id/review` returns `reviews: []` by design — runs execute
  fire-and-forget. Clients subscribe to `GET /runs/:id/events` and refetch when
  the stream signals `done`.
- `reviews.run_id` and `reviews.agent_id` carry no foreign key, so deleting a run
  deletes its review explicitly in `run.repo.ts`.
- Boot reaping in `app.ts` flips every `running` row to `failed`; it assumes one
  API instance per database.
- `agent_runs.cost_usd` was dropped by migration `0009_complex_runaways.sql` and
  re-added by `0010_superb_solo.sql`. It is null when the provider reported no
  cost and on failed or cancelled runs — null means unknown, never free.
