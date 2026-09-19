# client — `@devdigest/web`

Next.js 15 App Router studio on :3000. Reads and writes everything through the
API at `NEXT_PUBLIC_API_BASE` (`http://localhost:3001` by default); it has no
database access and no server actions.

Read the [root guide](../CLAUDE.md) first for repo-wide rules.

## Read when

| Task | Read |
|---|---|
| Component boundaries, providers, styling and data layer | [docs/ui-architecture.md](docs/ui-architecture.md) |
| What a page or tab must show, and where each value comes from | [specs/pages.md](specs/pages.md) |
| Non-obvious findings from earlier sessions | [insights/INSIGHTS.md](insights/INSIGHTS.md) |
| Route map and screen inventory | [README.md](README.md) |
| The API contract behind a hook | [../server/specs/review-flow.md](../server/specs/review-flow.md) |

## Stack

TypeScript 5.7, React 19, Next.js 15 (App Router), TanStack Query 5, next-intl,
lucide-react, recharts, mermaid, react-markdown, Zod 3 (types only). pnpm. Tests
with vitest + jsdom + Testing Library.

## Commands

```sh
pnpm install
pnpm dev        # next dev -p 3000
pnpm build
pnpm start
pnpm typecheck  # tsc --noEmit
pnpm test       # vitest run (jsdom)
```

## Layout

- `src/app/**` — routes. Seven pages: `/`, `/onboarding`, `/repos/[repoId]/pulls`,
  `/repos/[repoId]/pulls/[number]`, `/agents`, `/agents/[id]`,
  `/settings/[section]`. Route files are thin; the screen lives in `_components/`.
- `src/components/**` — cross-route components (app shell, diff viewer, …).
- `src/lib/**` — `api.ts` (fetch wrapper), `hooks/` (all TanStack Query hooks),
  `providers.tsx`, `repo-context.tsx`, `theme.tsx`, `toast.tsx`, `types.ts`.
- `src/vendor/ui/**` — design tokens (`styles.css`) and the shared primitives.
- `src/vendor/shared/**` — mirrored Zod contracts, imported as `@devdigest/shared`.
- `messages/en/<namespace>.json` — one file per feature namespace.
- `src/i18n/request.ts` — merges every message file; locale is pinned to `en`.

## Conventions

- **Component folder:** `<Name>/<Name>.tsx` plus `index.ts`, and where needed
  `styles.ts`, `constants.ts`, `helpers.ts`, `<Name>.test.tsx`, nested
  `_components/`.
- **Styling:** no CSS modules and no utility classes in app code. Each component
  has a co-located `styles.ts` exporting one frozen object `s`; static entries use
  `satisfies CSSProperties`, variants are functions like `s.row(hover)`. Use
  longhand border properties; never mix the `border` shorthand with `borderLeft`.
- **Colour is always a token**, never a literal. Tokens come from
  `src/vendor/ui/styles.css` (`--crit`, `--warn`, `--sugg`, `--accent`,
  `--text-muted`, …) and are selected through a per-component map such as
  `STATUS_META`, `SEV_COLOR` or `PROMPT_COLORS`. Every screen must work in both
  themes, switched by `data-theme` on `<html>`.
- **Server vs client:** only `app/layout.tsx` and the three one-line wrapper pages
  are server components. Everything interactive starts with `"use client"`.
- **Data:** never call `fetch` from a component. Add a hook in `src/lib/hooks/*`
  using the `api` wrapper, with a query key that starts with the resource name
  (`["pulls", repoId]`, `["run-trace", runId]`) and invalidate that key from the
  matching mutation.
- **Contracts are types only.** Import types from `@devdigest/shared`; importing a
  runtime value from it breaks the Next build, which is why `FEATURE_MODELS` is
  mirrored in `src/lib/feature-models.ts`.
- **i18n:** `useTranslations("<namespace>")`, keys dotted and area-scoped
  (`list.columns.*`, `trace.stat.*`). Constants store a `labelKey`, never a
  label, so maps stay translation-free.
- **Tests:** co-located `<Name>.test.tsx`; wrap in `NextIntlClientProvider` with
  the real message JSON so a test also checks the message keys exist; mock hook
  modules with `vi.mock` rather than the network; assert on user-visible text.

## Do not touch

- `pnpm-lock.yaml` — change dependencies through pnpm only.
- `src/vendor/shared/**` — mirror of `server/src/vendor/shared`. Change the server
  copy and copy it over; never edit one side alone.
- `src/vendor/ui/styles.css` token values — components consume tokens, they do not
  redefine them. A new colour means a new token, agreed on purpose.
- Generated Next output: `.next/`, `next-env.d.ts`.

## Gotchas

- The tab key `findings` is labelled **"Agent runs"** in the UI. Do not rename one
  without the other; the e2e flows click the visible label.
- `PrMeta`, the PR-list row contract, carries `score` but no finding counts. A
  column that needs per-severity counts requires a contract change on the server,
  not a client-side aggregation.
- `usePulls` polls every 60 s and refetches on window focus; run-related hooks
  poll every 4 s only while a run is active. Keep new polling hooks in that shape.
- The PR-list grid is defined twice — `GRID` in `constants.ts` feeds both the
  header row and `PRRow`. Adding a column means editing `COLUMN_KEYS`, `GRID`,
  `PRRow` and the message file together, or the header and rows drift apart.
