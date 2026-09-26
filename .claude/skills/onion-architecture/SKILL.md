---
name: onion-architecture
description: Keeps server code in its layer — route to service to repository, with every external system reached through an adapter resolved from the DI container. ALWAYS invoke before adding or changing anything under server/src, and before answering where server logic, a query, or an integration belongs. Do not write a route handler, a service, a query or an adapter without this skill. Triggers on new endpoints, database access, GitHub or LLM or git calls, DI wiring and module layout in the DevDigest API.
---

# Onion architecture — server layers

Package `server/` is a Fastify API over Drizzle/Postgres. Dependencies point
**inwards**: transport knows about business logic, business logic knows about
data access, and nothing inner knows about the outer world. External systems
sit at the edge as adapters. How a review run actually flows is in
[../../../server/specs/review-flow.md](../../../server/specs/review-flow.md).

## The layers

```
routes.ts        transport only: schema, auth context, delegate, shape the response
  └ service.ts   business logic, orchestration, the rules of the domain
      └ repository.ts   the ONLY place SQL is written
          └ helpers.ts  pure transforms, no side effects
             constants.ts literals
```

Adapters (`server/src/adapters/*`) implement the interfaces declared in
`server/src/vendor/shared/adapters.ts`: LLM providers, GitHub, git, code index,
tokenizer, secrets, auth. They are built by the container
(`server/src/platform/container.ts`) and handed to services.

## Rules

1. **A route never touches an adapter or the database directly.** It resolves
   context, calls a service, returns. If a handler needs `container.github` or
   `container.db`, the logic belongs in a service.
2. **Only the repository writes SQL.** A service that builds a `where` clause is
   a service doing data access.
3. **Adapters are resolved from the container, never constructed inline.** A
   `new Octokit(...)` or `new Anthropic(...)` outside `adapters/` is a layering
   break — it also makes the code untestable, because the container is the test
   seam that swaps in mocks.
4. **Dependencies point inwards.** `helpers.ts` may not import a repository; a
   repository may not import a service; nothing under `src/modules` imports
   another module's repository — shared data access is lifted into the
   container.
5. **Every query is workspace-scoped.** Routes get `{workspaceId, userId}` from
   `getContext(container, req)`, and it is passed down. Never rely on an
   upstream filter for tenant isolation: scope the query you are writing.
6. **Contracts live in `src/vendor/shared/`** and double as Fastify route
   schemas. Extend them with new files rather than editing existing ones, and
   mirror only the changed fields into the client copy — the two have drifted
   on purpose.

## Adding an endpoint

1. Pick or create `src/modules/<domain>/`.
2. `routes.ts` — declare the Zod schema, call `getContext`, delegate.
3. `service.ts` — the decision-making. Failures become `AppError`,
   `NotFoundError` or `ConfigError`, never bare `throw new Error`.
4. `repository.ts` — queries. Split into `repository/<x>.repo.ts` free
   functions taking `db` first once the file grows past a few queries.
5. Register the module in `src/modules/index.ts` — registration is static on
   purpose; `@fastify/autoload` is deliberately unused.
6. Wire nothing globally: if a new external system appears, it gets an adapter
   and a lazy getter on the container.

## Thin modules

`polling` and `workspace` query `container.db` from the route, and `settings`
has no service. That is allowed for a module that has no decisions to make.
The moment a rule appears — a branch, a fallback, an ordering guarantee — the
service layer comes back. Skipping a layer is a size decision, never a shortcut
for a module that does have logic.

## Testing follows the layers

- `*.it.test.ts` — real Postgres via testcontainers, for repositories and for
  end-to-end route behaviour.
- Everything else stays hermetic: build the app with
  `buildApp({ config, overrides })` and drive it with `app.inject()`. The
  overrides object exists precisely because adapters are injected, not imported.
- A test that needs a network call is a sign an adapter was bypassed.

## Do not touch

- `server/src/db/migrations/**` — applied history. Schema change means editing
  `src/db/schema/*.ts` then `pnpm db:generate`; never edit or renumber an
  existing migration, never `ALTER TABLE` by hand.
- Secrets never reach the database: they go through `SecretsProvider`.
