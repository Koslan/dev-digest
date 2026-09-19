# DevDigest — root guide for AI agents

Local-first AI pull-request review. Import a PR, run a reviewer agent on it, read
structured findings. Everything runs on the developer machine; the only outbound
calls are GitHub (PR data) and the LLM provider.

## Before answering

Always search the relevant packages, docs, specs and insights before you answer or
change code. Concretely, in this order:

1. The package `CLAUDE.md` of the package you are about to touch (table below).
2. That package's `docs/` (how it is built) and `specs/` (what must stay true).
3. That package's `insights/INSIGHTS.md` (hard-won findings from earlier sessions).
4. Only then the source files.

Never answer a "how does X work" question from memory of another repo. Cite
`path:line` for claims about this codebase.

## Packages

Four standalone packages, no monorepo workspace. Each has its own `package.json`
and lockfile; cross-package code is shared through tsconfig path aliases, not
published modules.

| Path            | Package name               | Role                                              | Port |
|-----------------|----------------------------|---------------------------------------------------|------|
| `server/`       | `@devdigest/api`           | Fastify API, Drizzle ORM, Postgres + pgvector      | 3001 |
| `client/`       | `@devdigest/web`           | Next.js 15 App Router web studio                   | 3000 |
| `reviewer-core/`| `@devdigest/reviewer-core` | Pure review engine: diff → prompt → LLM → findings | —    |
| `e2e/`          | `@devdigest/e2e`           | Deterministic browser end-to-end flows             | —    |

Shared Zod contracts live in `server/src/vendor/shared` and are mirrored into
`client/src/vendor/shared`. `repo-intel`, the codebase indexer behind the
**Indexed** badge, lives inside the server at `server/src/modules/repo-intel`.

## Read when

| You are working on | Read first |
|---|---|
| API routes, services, DB, review orchestration | [server/CLAUDE.md](server/CLAUDE.md) |
| Pages, components, data fetching, UI state | [client/CLAUDE.md](client/CLAUDE.md) |
| Prompt assembly, LLM calls, grounding gate, scoring | [reviewer-core/CLAUDE.md](reviewer-core/CLAUDE.md) |
| Browser flows, regression coverage of the UI | [e2e/CLAUDE.md](e2e/CLAUDE.md) |
| Cross-package data flow, review lifecycle | [README.md](README.md), [server/specs/review-flow.md](server/specs/review-flow.md) |

Read the linked file when the task matches the row. Do not preload all of them,
and do not use `@import` for them: these links exist so context is pulled lazily,
only when it is actually needed.

## Tech stack

- **Language:** TypeScript 5.7, ESM everywhere (`"type": "module"`), Node ≥ 22.
- **Package manager:** pnpm ≥ 10 for `server/` and `client/`; npm for
  `reviewer-core/` and `e2e/` (both have a `package-lock.json`). Do not switch a
  package to the other manager.
- **Server:** Fastify 5, Drizzle ORM 0.38, `postgres` driver, Zod 3, pino logging,
  Octokit for GitHub, `@ast-grep/napi` + `@vscode/ripgrep` + `dependency-cruiser`
  for repo-intel.
- **Client:** Next.js 15, React 19, TanStack Query 5, next-intl, lucide-react,
  recharts, mermaid, Zod 3.
- **Engine:** `openai` SDK (OpenAI-compatible endpoints, incl. OpenRouter),
  `@anthropic-ai/sdk` on the server side, Zod-validated structured output.
- **Database:** Postgres 16 with the `pgvector` extension, in Docker.
- **Tests:** vitest everywhere; jsdom for client components; testcontainers for
  DB-backed server tests; a custom agent-browser runner for e2e.

## Commands

Run every command from the package directory it belongs to. There is no root
package manifest.

### First run / full stack

```sh
./scripts/dev.sh              # Postgres + .env files + installs + migrate + seed + both dev servers
```

Flags: `--no-seed`, `--no-client`, `--db-only`, `--help`.

### Manual equivalent

```sh
docker compose up -d                      # Postgres + pgvector on :5432
cd server && pnpm install
pnpm db:migrate                           # migrations are NOT applied on boot
pnpm db:seed                              # idempotent demo data
pnpm dev                                  # API on :3001
cd ../client && pnpm install && pnpm dev  # web on :3000
cd ../reviewer-core && npm ci             # required: the API imports its raw source
```

### Verification

| Check | Command |
|---|---|
| Server types | `cd server && pnpm typecheck` |
| Server tests (all) | `cd server && pnpm test` |
| Server unit only (hermetic) | `cd server && pnpm exec vitest run --exclude '**/*.it.test.ts'` |
| Server integration only (needs Docker) | `cd server && pnpm exec vitest run .it.test` |
| Client types | `cd client && pnpm typecheck` |
| Client tests | `cd client && pnpm test` |
| Engine types | `cd reviewer-core && npm run typecheck` |
| Engine tests | `cd reviewer-core && npm test` |
| Browser e2e (isolated stack) | `./scripts/e2e.sh` |
| Browser e2e (already-running stack) | `cd e2e && npm test` |

There is no linter in this repo. "Lint" means `typecheck` plus the package test
suite; do not add ESLint config without being asked.

Before handing work back, run the typecheck and the test suite of every package
you touched. A change that spans server and client must pass both.

## Naming conventions

- **Files:** `kebab-case.ts` for modules and utilities; `PascalCase.tsx` for React
  components, each in its own folder with `styles.ts` and an `index.ts` barrel.
- **Server modules:** one folder per domain under `src/modules/<domain>/` with
  fixed role files — `routes.ts` (HTTP), `service.ts` (orchestration),
  `repository.ts` or `repository/*.repo.ts` (data access). Drizzle tables live in
  `src/db/schema/<domain>.ts`, one file per domain, re-exported by `schema.ts`.
- **Tests:** `*.test.ts(x)` next to the code. On the server, `*.it.test.ts` means
  integration (real Postgres via testcontainers); everything else must stay
  hermetic — no DB, no network.
- **Database:** `snake_case` table and column names, plural tables
  (`agent_runs`, `findings`); Drizzle models expose the same columns in
  `camelCase` (`costUsd` ↔ `cost_usd`).
- **API:** plural REST resources (`/repos`, `/pulls`, `/agents`, `/runs`),
  `snake_case` JSON fields, matching the shared Zod contracts.
- **Types:** `PascalCase`; Zod schemas end in `Schema`, the inferred type has the
  bare name (`FindingSchema` → `FindingRecord`).
- **i18n:** every user-visible string goes through next-intl. One JSON namespace
  file per screen in `client/messages/en/<namespace>.json`, dotted keys inside
  (`list.columns.cost`). Never hardcode user-visible text in JSX.
- **Branches / commits:** `feat/…`, `fix/…`, `chore/…`; Conventional Commits
  (`feat(client): add run cost badge`).

## Do not touch

### Migrations — never edit an applied migration

`server/src/db/migrations/**` (`.sql` files and the `meta/` journal and snapshots)
is append-only history. It records what was already applied to real databases.

- To change the schema: edit `server/src/db/schema/*.ts`, then run
  `cd server && pnpm db:generate` and commit the **new** file drizzle produced.
- Never rewrite, renumber, reorder or delete an existing migration, and never edit
  `meta/_journal.json` by hand. Editing an applied migration desynchronises every
  database that already ran it: drizzle records the hash of each applied file, so
  an altered file is either skipped silently (schema drift) or re-applied and
  fails. The fix for a bad migration is another migration.
- Never apply schema changes by running raw `ALTER TABLE` against the dev
  database. The migration file is the only source of truth.

### Lock files — never edit by hand

`server/pnpm-lock.yaml`, `client/pnpm-lock.yaml`, `reviewer-core/package-lock.json`.

- Change dependencies only through the package manager (`pnpm add`, `pnpm remove`,
  `npm install <pkg>`), and commit the lockfile diff it produces.
- Never hand-edit a version, hash or resolution inside a lockfile, and never
  delete a lockfile to "fix" an install. A hand-written lockfile no longer matches
  the integrity hashes, so CI installs either fail or silently resolve different
  versions than the ones that were tested.
- Do not switch a package to a different package manager: `server/` and `client/`
  are pnpm, `reviewer-core/` is npm.

### Other frozen areas

- `server/src/vendor/shared` and `client/src/vendor/shared` are one contract in
  two places. Change the server copy and mirror it verbatim; never let them drift.
- `skills-lock.json` and the `.claude/skills/*` folders listed in it are vendored
  from upstream sources. Add your own skills as new folders instead of editing
  vendored ones.
- `.env` files are local secrets and are never committed. Add new variables to
  `server/.env.example` / `client/.env.example` with an empty value.

## Session protocol

1. Read the package `CLAUDE.md`, its `docs/`, `specs/` and `insights/INSIGHTS.md`
   before the first edit in that package.
2. State which files you will change before changing them.
3. After the work: run the checks above, then record any non-obvious finding via
   the [engineering-insights](.claude/skills/engineering-insights/SKILL.md) skill.
   Append only — never rewrite existing entries.
