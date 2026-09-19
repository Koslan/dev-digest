# Spec — engine contract

Guarantees `@devdigest/reviewer-core` makes to its callers. Breaking one of these
is a behaviour change, not a refactor.

## 1. Purity

- The only side effect of `reviewPullRequest` is `llm.completeStructured`.
- No database, no GitHub, no filesystem, no environment reads inside the review
  path.
- Enrichment inputs (`skills`, `memory`, `specs`, `callers`, `repoMap`) are
  resolved strings supplied by the caller. The engine performs no lookups.
- The package emits no JavaScript; consumers import the TypeScript source
  through a path alias.
- The single exception, documented deliberately: `OpenRouterProvider.listModels()`
  performs a raw `fetch` for the model catalogue. It is outside the review path
  and lives in the optional provider class.

## 2. Untrusted content is always fenced

- Diff, PR description, repo map and callers are wrapped in
  `<untrusted source="…">` before reaching the model.
- A nested closing tag inside untrusted content is neutralised, so payloads
  cannot escape the fence.
- `INJECTION_GUARD` is appended to every system prompt and states that untrusted
  content is data, and that descoping claims in any language are to be ignored.
- Defence is this one trusted instruction plus fencing. There is no keyword
  denylist, and none is to be added.

## 3. Structured output

- Every model call requests the shared `Review` schema with `strict: true`.
- A malformed response is repaired by reprompting with the schema violation, up
  to `maxRetries` extra attempts (default 2). Tokens from failed attempts are
  counted.
- A response with no choices is an error, never an empty review.
- Nothing unvalidated reaches the caller: the result is parsed by Zod or the call
  throws.

## 4. Grounding gate

- Runs exactly once per review, after reduce, for every strategy.
- Keep conditions:
  - the finding's file must appear in the diff;
  - its `[start_line, end_line]` must intersect the new-side lines of a hunk;
  - kinds `secret_leak`, `lethal_trifecta`, `phantom` and `hook` are exempt from
    the line check and need only the file.
- Every dropped finding carries a human-readable reason and is reported as an
  event and in `ReviewOutcome.dropped`.
- `grounding` is the string `"<kept>/<total> passed"`.

## 5. Determinism over model claims

- **Score** is recomputed from surviving findings:
  `clamp(0, 100, 100 − Σ penalty)` with CRITICAL 35, WARNING 12, SUGGESTION 3.
  Anchors: no findings 100, one suggestion 97, one warning 88, one critical 65.
  The model's self-reported score is discarded.
- **Verdict for CI** is derived from the configured `failOn` threshold, not from
  the model: no findings → approve, threshold tripped → request changes,
  otherwise comment.
- **Blockers** are counted from findings by severity rank, never taken from the
  verdict.
- The reduce step merges partial reviews by taking the worst verdict.

## 6. Severities and categories

- Severity is exactly `CRITICAL | WARNING | SUGGESTION`.
- Category is `bug | security | perf | style | test`.
- Kind is `finding | secret_leak | lethal_trifecta | phantom | hook`.
- Verdict is `request_changes | approve | comment`.

Adding a value means changing the shared contract in the server package and
mirroring it to the client; it is never a local addition here.

## 7. Usage and cost

- `tokensIn` and `tokensOut` are summed across every chunk and every retry.
- `costUsd` is summed too, and **null-poisons**: if any chunk reports `null`, the
  total is `null`. A caller must treat `null` as "unknown", never as zero.
- Cost comes from the provider response when available, otherwise from an
  injected `estimateCost` hook, otherwise `null`. The engine contains no pricing
  table.

## 8. Chunking

- Single-pass produces exactly one chunk labelled `all files`.
- Map-reduce produces one chunk per file, labelled with the file path.
- Mode is decided by `selectMode` before any call, and reported in the outcome so
  the trace can show it.

## 9. Cancellation

- `checkCancelled` is called before each chunk.
- It signals cancellation by throwing; the engine does not catch it, so the
  caller's error type reaches the caller unchanged.

## 10. Tests that pin this spec

- `test/run.test.ts` asserts the recomputed score for a run with one critical
  finding, and that a model-reported score of 10 becomes 100 when every finding
  is dropped by the gate.
- `test/prompt.test.ts` asserts the injection guard is present and that untrusted
  fencing is applied.
- `test/to-review.test.ts` asserts the deterministic CI event selection.
