# Spec — review run lifecycle

Contract for what happens between `POST /pulls/:id/review` and a persisted
review. These statements must stay true; a change that breaks one of them is a
behaviour change and needs this file updated in the same commit.

## 1. Starting a run

- `POST /pulls/:id/review` accepts `{agentId?, all?}` and is rate limited to
  10 requests per minute (`src/modules/reviews/routes.ts:29`).
- Target resolution (`src/modules/reviews/service.ts:46`):
  - `all: true` → every enabled agent of the workspace;
  - `agentId` → that agent, 404 when it does not exist;
  - neither → 400 `invalid_run_request`.
- One `agent_runs` row per target is inserted **before** the response is sent
  (`service.ts:114`), with `status = 'running'` and `source = 'local'`. This is
  what lets the client subscribe to the event stream immediately.
- Execution is fire-and-forget: the service returns and the executor runs
  detached (`service.ts:133`).
- **The response always carries `reviews: []`** (`service.ts:137`). A client that
  wants results waits for the stream to signal `done` and refetches
  `GET /pulls/:id/reviews`.

## 2. Run statuses

`running` → `done` | `failed` | `cancelled`. No other transition exists.

- `done` is written only by `completeAgentRun` after a successful engine call
  (`src/modules/reviews/repository/run.repo.ts:141`).
- `cancelled` is reachable only from `running`
  (`run.repo.ts:93`); cancelling signals the bus, updates the row and completes
  the stream, so orphaned runs can be cleared.
- `failed` is written on any engine or pre-work error, and on boot for every row
  left `running` by a dead process (`run.repo.ts:104`, called from `src/app.ts:81`).
- A failed or cancelled run still persists a trace built from the log buffer, so
  the reason survives a page reload (`src/modules/reviews/run-executor.ts:408`).

## 3. Diff loading

- Preferred source is a real `git diff base...head` through the git adapter.
- Fallback is a unified diff reconstructed from the persisted `pr_files.patch`
  rows (`src/modules/reviews/diff-loader.ts:33`).
- If both fail, **every** queued run of the request is failed together and each
  stream is completed (`run-executor.ts:75`). No run is left hanging.

## 4. Prompt enrichment

Per agent, best-effort and individually skippable — enrichment failures never
fail a run:

- `agents.repo_intel !== false` gates the whole block (`run-executor.ts:168`).
- Callers digest, capped at 10 rows (`run-executor.ts:327`).
- Repo map digest, skipped when the map is degraded (`run-executor.ts:364`).
- Rank note, appended only when the touched file sits in the top 5% most
  depended-on files (`run-executor.ts:384`).

The task line carries the trusted anti-descoping instruction
(`src/modules/reviews/helpers.ts:82`). Untrusted content — the diff, the PR body
— is fenced by the engine, never sanitised by keyword filtering.

## 5. Engine call

`reviewPullRequest()` from `@devdigest/reviewer-core` is called with the system
prompt, model, diff, the resolved `LLMProvider`, the strategy
(`single-pass` by default, `src/modules/reviews/constants.ts:12`), the optional
enrichment slots, a `sessionId` of `owner/name#number:agent`, an `onEvent` sink
and a `checkCancelled` callback that throws `RunCancelledError` when the bus has
been cancelled (`run-executor.ts:190`).

Empty enrichment slots are **omitted, not passed empty**, so the assembled
prompt has no dangling sections.

## 6. Grounding gate

- The gate runs inside the engine, after reduce and before the result is
  returned (`reviewer-core/src/review/run.ts:197`).
- A finding survives only if its file appears in the diff and its
  `[start_line, end_line]` intersects the new-side lines of a hunk
  (`reviewer-core/src/grounding.ts:52`). Whole-file kinds — `secret_leak`,
  `lethal_trifecta`, `phantom`, `hook` — only need the file to be present.
- Dropped findings are reported as `info` events, so the reason is visible in
  the live log and in the persisted trace.
- **The score is recomputed from the survivors**, never taken from the model
  (`run.ts:208`).
- `grounding` is persisted as the string `"kept/total passed"`.

## 7. Persistence on success

In this order (`run-executor.ts:217`):

1. `reviews` row with verdict, summary, score, model and `run_id`.
2. `findings` rows — survivors only.
3. `markReviewed(pull.id, pull.headSha)` so the list can tell reviewed from
   stale from needs-review.
4. `blockers` computed deterministically from the surviving findings and the
   agent's `ci_fail_on`, never taken from the model verdict
   (`run-executor.ts:240`).
5. `completeAgentRun` with `status: 'done'`, `duration_ms`, `tokens_in`,
   `tokens_out`, `findings_count`, `grounding`, `score`, `blockers`.
6. One `run_traces` document upserted by `run_id` (`run.repo.ts:176`).
7. `runBus.complete(runId)`.

### Trace document

`RunTrace` (`src/vendor/shared/contracts/trace.ts:70`) holds `config`,
`stats {duration_ms, tokens_in, tokens_out, findings, grounding}`,
`prompt_assembly`, `tool_calls`, `raw_output`, `memory_pulled`, `specs_read` and
`log`. The log is the **full** buffer of the run, including the shared pre-work
that happened before the agent fan-out.

## 8. Token and cost accounting

- Token counts are summed per chunk inside the engine
  (`reviewer-core/src/review/run.ts:182`) and land in two places: the
  `agent_runs` columns and `run_traces.trace.stats`.
- The engine also computes `costUsd` in memory (`run.ts:184`) and the LLM
  adapters return a cost per call, but **local runs do not persist cost**:
  migration `0009_complex_runaways.sql` dropped `agent_runs.cost_usd`.
- Any feature that needs a persisted cost must add a new migration through
  `pnpm db:generate`. Re-adding the column by editing an old migration is
  forbidden — see [../CLAUDE.md](../CLAUDE.md).

## 9. Streaming contract

- `GET /runs/:id/events` is SSE, exempt from the rate limit
  (`src/modules/reviews/routes.ts:50`).
- Subscribers receive the buffered history first, then live events, then `done`.
- Late subscribers to an already-finished run receive the buffer and an
  immediate `done`; they never hang.

## 10. Finding actions

- `POST /findings/:id/accept` and `/dismiss` are generated from the
  `FINDING_ACTIONS` list (`src/modules/reviews/routes.ts:18`).
- Both check workspace ownership before writing
  (`src/modules/reviews/findings.ts:17`).
- They set `accepted_at` / `dismissed_at` timestamps; state is derived from those
  timestamps, never from a separate status column.

## 11. Deletion

- Deleting a run deletes the review it produced, explicitly, because
  `reviews.run_id` carries no foreign key (`run.repo.ts:70`).
- Deleting a run cascades to its trace through the `run_traces.run_id` foreign
  key.

## Regression tests that pin this spec

- `test/reviews.it.test.ts:19` feeds one valid and one hallucinated finding
  through the mock LLM and asserts the gate drops exactly one, and that the
  persisted `grounding` string and score reflect the survivors.
- `test/routes-smoke.test.ts` proves the app boots and answers without a
  database connection being used.
