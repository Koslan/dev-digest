# e2e — `@devdigest/e2e`

Deterministic browser end-to-end flows for the web app, driven by Vercel's
`agent-browser` CLI. No Playwright, no LLM, no API key.

Read the [root guide](../CLAUDE.md) first for repo-wide rules.

## Read when

| Task | Read |
|---|---|
| How the runner and the flow format work | [docs/harness.md](docs/harness.md) |
| What the flows cover and the rules a new flow must follow | [specs/flows.md](specs/flows.md) |
| Non-obvious findings from earlier sessions | [insights/INSIGHTS.md](insights/INSIGHTS.md) |
| Suite ownership across the repo | [../TESTING.md](../TESTING.md) |

## Stack

TypeScript ESM, `tsx`, no test framework and no runtime dependencies. The browser
driver is the globally installed `agent-browser` binary.

**This package uses npm, not pnpm** — it has `package-lock.json`.

## Commands

```sh
npm i -g agent-browser && agent-browser install   # once; downloads Chrome for Testing

./scripts/e2e.sh        # recommended: isolated stack on :5433 / :3101 / :3100
cd e2e && npm test      # runs flows against an already-running stack
cd e2e && npm run typecheck
```

`./scripts/e2e.sh` boots its own ephemeral Postgres, migrates, seeds, starts the
API and the web app on alternate ports, runs the flows and tears everything
down. It never touches the development database.

## Layout

- `run.ts` — the runner: discovers flows, executes steps, writes failure
  screenshots, closes the shared browser session.
- `lib/assert.ts` — the flow types, `{BASE}` substitution, the stdout check and
  the summary printer.
- `specs/NN-name.flow.json` — the flows themselves, executed in filename order.
- `agent-browser.json` — driver configuration, picked up because the runner sets
  its working directory here.
- `test-results/` — failure screenshots, git-ignored.

## Conventions

- One flow per file, named `NN-kebab-name.flow.json`. The numeric prefix decides
  the order; there is no registry to update.
- A step is `{cmd: string[], label?, assert?}`. `{BASE}` in any argument is
  replaced with the base URL.
- **The waits are the assertions.** `wait --text` and `wait --url` exit non-zero
  on timeout, which fails the step and the flow. `assert.stdoutIncludes` is an
  extra, not the primary check.
- Locators must be deterministic: `--url`, `--text`, `find role|text|label`. The
  AI `chat` command is never used — that is what keeps runs stable and key-free.
- Add `wait --load networkidle` after a navigation that triggers fetches.
- Give every step a human-readable `label`, and state any preconditions in the
  flow's `description`.
- Flows target seeded read-only fixtures — the demo repo, PR #482, the seeded
  agents — so a run never triggers a model call.

## Do not touch

- `package-lock.json` — regenerate through npm.
- Seeded fixture expectations: the flows assert on the seed data in
  `server/src/db/seed.ts`. Changing the seed means updating the flows in the same
  commit.
- **Never run `docker compose down -v` to reset a database.** The `-v` flag
  deletes the `devdigest_pgdata` volume with every imported repo and review in
  it. Use the hermetic runner, which has its own throwaway database.

## Gotchas

- Flows 02, 04 and 05 follow the root redirect to the *first* repo, so they
  assume the seeded demo repo is the only one. Against a development database
  with other imported repos they land on the wrong repo and fail. That is why
  the hermetic runner exists.
- Steps share one browser session: each command is a separate CLI invocation, but
  the driver keeps the page open between them. Flows are not isolated from each
  other; the session is closed once at the end.
- A failing step aborts the rest of that flow; later flows still run.
- Flow JSON is not schema-validated at build time — `npm run typecheck` only
  covers `run.ts` and `lib/`.
