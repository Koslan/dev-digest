# reviewer-core — `@devdigest/reviewer-core`

The review engine: diff → prompt → LLM → grounded findings. Pure logic. No
database, no GitHub, no filesystem. The only side effect is a call on the
injected `LLMProvider`, which is what makes the whole package mock-testable.

Read the [root guide](../CLAUDE.md) first for repo-wide rules.

## Read when

| Task | Read |
|---|---|
| Prompt assembly, LLM call, parsing, chunking | [docs/pipeline.md](docs/pipeline.md) |
| What the engine guarantees about findings, score and cost | [specs/engine-contract.md](specs/engine-contract.md) |
| Non-obvious findings from earlier sessions | [insights/INSIGHTS.md](insights/INSIGHTS.md) |
| How the server drives a run | [../server/specs/review-flow.md](../server/specs/review-flow.md) |

## Stack

TypeScript 5.7 ESM, Node ≥ 22. Only two runtime dependencies: `openai` (used as
an OpenAI-compatible client, including OpenRouter) and `zod`. Tests with vitest.

**This package uses npm, not pnpm** — it has `package-lock.json`.

## Commands

```sh
npm ci
npm run typecheck   # tsc --noEmit — this is also the build
npm test            # vitest run
```

The package never emits JavaScript: `build` is a type-check, `noEmit` is on and
`.gitignore` blocks stray `.js` / `.d.ts` next to the sources so compiled output
can never shadow a module.

Because the server imports the raw source through a tsconfig path alias,
`npm ci` here is a hard prerequisite for running the API. Skipping it produces
`ERR_MODULE_NOT_FOUND: Cannot find package 'openai'` at API start.

## Layout

- `src/index.ts` — the public barrel. Everything a consumer may import is listed
  here, grouped by area.
- `src/prompt.ts` — `assemblePrompt`, `wrapUntrusted`, `INJECTION_GUARD`.
- `src/grounding.ts` — the citation gate: `groundFindings`, `groundingSummary`,
  `buildLineIndex`.
- `src/review/run.ts` — `reviewPullRequest`, mode selection, the chunk loop.
- `src/review/reduce.ts` — `reduceReviews`, `scoreFromFindings`, severity
  penalties.
- `src/llm/openrouter.ts` — the one concrete provider shipped here, reused by the
  server and by CI.
- `src/llm/structured.ts` — `toJsonSchema`, `extractJson`, `parseWithRepair`.
- `src/output/to-review.ts` — the deterministic CI payload and blocker counting.
- `test/<module>.test.ts` — hermetic tests at package root.

## Conventions

- **Purity is the point.** Nothing in this package may read a file, touch a
  database or call GitHub. Skills, memory and specs arrive as already-resolved
  strings, never as slugs to look up.
- Intra-package imports carry explicit `.js` extensions; `noUncheckedIndexedAccess`
  is on, so indexed access needs a guard or an assertion.
- camelCase functions, SCREAMING_SNAKE module constants
  (`INJECTION_GUARD`, `FULL_FILE_KINDS`, `SEVERITY_PENALTY`, `DEFAULT_*`).
- Engine-internal identifiers are camelCase, while contract and wire fields stay
  snake_case (`start_line`, `repo_map`, `tokens_in`).
- Every file opens with a block comment stating its contract and the reason for
  it. Keep that habit: this package encodes deliberate determinism choices and
  the reason is the valuable part.
- Contracts come from `@devdigest/shared`, which resolves to the server's
  `src/vendor/shared`. Do not redefine a contract locally.
- Tests are hermetic and key-free: use the shared `MockLLMProvider` or an inline
  recorder implementing `LLMProvider`. `describe` names the unit and its
  contract, `it` states the invariant.

## Do not touch

- `package-lock.json` — regenerate through npm.
- `@devdigest/shared` contracts — they live in the server package; edit them
  there and mirror to the client.
- The determinism rules: score recomputation, the grounding gate and the CI event
  selection must never be delegated to the model. If a change makes the model's
  self-reported value authoritative, it is wrong.

## Gotchas

- `costUsd` is computed and returned by the engine, but the server does not
  persist it for local runs — `agent_runs.cost_usd` was dropped by migration
  0009. Cost null-poisons: if any chunk returns `null`, the total is `null`.
- The engine holds no price table. `estimateCost` is injected into the OpenRouter
  provider by the server's `PriceBook`.
- `listModels()` does a raw `fetch` to `/models` because the SDK strips pricing.
  That is the one network call outside the injected provider abstraction, and it
  is in the optional provider class, not in `reviewPullRequest`.
- Map-reduce mode is chosen only when the diff is both large and multi-file; a
  single-file diff is always reviewed in one pass.
