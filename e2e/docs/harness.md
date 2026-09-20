# e2e — how the harness works

The suite is a thin convention on top of a CLI. `agent-browser` is a native
(Rust + CDP) browser-automation tool, not a test framework, so this package adds
exactly three things: a flow file format, a runner, and a hermetic stack script.

## Runner

`run.ts` in five steps:

1. **Discover** — read `specs/`, keep `*.flow.json`, sort by filename. The
   `NN-` prefix is therefore the execution order; there is no registry.
2. **Substitute** — replace `{BASE}` in every argument with the base URL
   (`E2E_BASE_URL`, default `http://localhost:3000`, trailing slashes stripped).
3. **Execute** — run each step with `execFile` on the `agent-browser` binary,
   with the package directory as the working directory and a per-step timeout
   (`E2E_STEP_TIMEOUT`, default 60 s). No shell is involved: arguments are passed
   as an argv array.
4. **Check** — a non-zero exit fails the step. If the step declares
   `assert.stdoutIncludes`, the command's stdout is checked too.
5. **Report** — on failure, write `test-results/<specId>-fail.png` on a
   best-effort basis, abort the remaining steps of that flow, continue with the
   next flow. At the end, always close the browser session, print the summary and
   exit non-zero if any flow failed.

Environment knobs: `E2E_BASE_URL`, `AGENT_BROWSER_BIN`, `E2E_STEP_TIMEOUT`.

## Flow format

```jsonc
{
  "name": "App boots and lands on a repo's PR list",
  "description": "Why this flow exists and what it assumes.",
  "steps": [
    { "cmd": ["open", "{BASE}/"],         "label": "load the app root" },
    { "cmd": ["wait", "--url", "/pulls"], "label": "root redirects to the PR list" },
    { "cmd": ["wait", "--text", "#482"],  "label": "seeded PR row is visible" }
  ]
}
```

Types live in `lib/assert.ts`: `Flow`, `Step`, `StepResult`, `FlowResult`.

Commands used across the suite:

| Command | Purpose |
|---|---|
| `open <url>` | navigate |
| `wait --url <substring>` | assert the location |
| `wait --text <substring>` | assert rendered text |
| `wait --load networkidle` | settle after fetches |
| `find text "<text>" click` | click by visible text |
| `find role button click --name "<accessible name>"` | click by role and name |

`screenshot` and `close` are issued by the runner, not by flows.

## Why it stays deterministic

- The AI `chat` command is never used; only URL, text and role locators.
- No LLM and no API key are involved, so the API boots with no secrets
  configured.
- Fixtures are the seeded, read-only demo data, so nothing triggers a model call.
- The waits themselves are the assertions, so there is no separate expectation
  layer to drift from the UI.

## Session model

Each step is its own CLI invocation, but the driver keeps the page alive between
invocations. Consequences worth remembering:

- A flow can `open` in one step and assert in a later step.
- Flows are **not** isolated from each other; state left behind by one flow is
  visible to the next.
- The session is closed exactly once, in the runner's `finally` block.

## Hermetic stack

`scripts/e2e.sh` exists because running against a development database is
unreliable — see the precondition in [../specs/flows.md](../specs/flows.md).

What it does:

- Picks ports that dodge the dev stack: Postgres 5433, API 3101, web 3100.
- Exports `DATABASE_URL` on `127.0.0.1` rather than `localhost`, to avoid an IPv6
  `::1` mismatch, plus `API_PORT`, `WEB_PORT`, `NEXT_PUBLIC_API_BASE` and
  `E2E_BASE_URL` — before spawning anything, because dotenv does not override
  already-set variables.
- Starts an ephemeral Postgres with `--rm` and no named volume, so it is empty
  every run and the seeded demo repo is the only repo.
- Installs dependencies only when `node_modules` is missing, including `npm ci`
  in `reviewer-core`, without which the API cannot start.
- Refuses to migrate or seed unless `DATABASE_URL` points at its own port. This
  guard is what stops the script from ever seeding the development database.
- Starts the API with `tsx src/server.ts` — not `pnpm start`, which needs a
  build, and not `tsx watch`, which could restart mid-suite — then polls
  `/health`. Starts the web app with `next dev` and polls the root.
- Cleans up through a trap on `EXIT`, `INT` and `TERM`, killing the process tree
  because the real listener is a grandchild of the spawned command, and removing
  the container.

## CI

`.github/workflows/e2e-web.yml` runs the same flows against a built client and a
real Postgres, path-filtered to `client/**`, `server/**` and `e2e/**`. It
performs the same `npm ci` in `reviewer-core`, installs `agent-browser` with
system dependencies, and uploads `e2e/test-results/**` as an artifact when the
suite fails. The hermetic script is a local convenience and is not used in CI.
