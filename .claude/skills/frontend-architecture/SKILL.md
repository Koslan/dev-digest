---
name: frontend-architecture
description: Places new client code in the right file of the Next.js App Router tree — pages, page-local components, shared components, styles, constants, helpers, tests, i18n keys. ALWAYS invoke before creating, moving or renaming any file under client/, and before answering where a component, hook, style or test belongs. Do not add a file to client/ without this skill. Triggers on new pages, routes, components, hooks, styles, message keys and component tests in the DevDigest web app.
---

# Frontend architecture — where client code lives

Package `client/` is a Next.js 15 App Router app. This skill decides **which
file a change belongs in**; what each screen must render lives in
[../../../client/specs/pages.md](../../../client/specs/pages.md).

## Decide the location first

| What you are adding | Where it goes |
|---|---|
| A new route | `client/src/app/<segment>/page.tsx` — thin: read params, render the screen component |
| A screen used by exactly one route | `client/src/app/<route>/_components/<Name>/` |
| A part used by exactly one screen component | nested `_components/` inside that component's folder |
| A component used by two or more routes | `client/src/components/<name>/` |
| A design-system primitive (button, badge, drawer) | `client/src/vendor/ui/` — vendored, extend only with a deliberate decision |
| Server calls | `client/src/lib/hooks/<area>.ts`, never `fetch` in a component |
| Cross-cutting state | `client/src/lib/*.tsx` provider (theme, toast, repo context) |
| Types from the API | `client/src/lib/types.ts`, re-exported from `@devdigest/shared` — **types only** |
| User-visible strings | `client/messages/en/<namespace>.json` |

## Component folder shape

One component per folder, named after it:

```
<Name>/
  <Name>.tsx        the component, "use client" on line 1 unless it is purely presentational
  index.ts          re-export: export { <Name> } from "./<Name>";
  styles.ts         optional — one frozen object `s`
  constants.ts      optional — literals, colour maps, label KEYS (never labels)
  helpers.ts        optional — pure functions, no JSX, no hooks
  <Name>.test.tsx   optional but expected for anything with logic
  _components/      optional — parts used only by this component
```

Import the folder, not the file: `import { FindingsCell } from "../FindingsCell"`.

## Naming

- Component folders and files: `PascalCase`. Everything else: `kebab-case.ts`.
- Hooks start with `use`, live in `client/src/lib/hooks/`, and are re-exported
  from `hooks/index.ts`.
- Query keys start with the resource name: `["pulls", repoId]`,
  `["run-trace", runId]`. A mutation invalidates exactly the keys it affects.
- i18n keys are dotted and area-scoped: `list.columns.cost`, `trace.stat.cost`.
  Constants store a `labelKey`, never a label, so maps stay translation-free.

## Styling

- No CSS modules, no utility classes in app code. Each component has a
  co-located `styles.ts` exporting a single object `s`; static entries use
  `satisfies CSSProperties`, variants are functions of state: `s.row(hover)`.
- Colour is **always** a token from `client/src/vendor/ui/styles.css`
  (`--crit`, `--warn`, `--sugg`, `--accent`, `--text-muted`, …), selected
  through a per-component map. Never a literal hex value.
- Use longhand border properties; never mix `border` with `borderLeft`.
- Every screen must work in both themes — they switch by `data-theme` on
  `<html>`, so nothing may assume a dark background.

## Server and client components

Only the root layout and one-line route wrappers render on the server.
Everything interactive starts with `"use client"`. A component that needs
browser APIs (`window`, `getBoundingClientRect`, `localStorage`) is a client
component, and the API access must be guarded for server-side rendering.

## Tests

- Co-located `<Name>.test.tsx`, vitest + jsdom + Testing Library.
- Wrap in `NextIntlClientProvider` with the **real** message JSON, so a missing
  translation key fails the test.
- Mock hook modules with `vi.mock` on the relative path; never hit the network.
- Assert on what a user sees — visible text and callbacks — not on internals.
- Real browser journeys belong in `e2e/`, not here.

## Checklist before you write the file

1. Is it used by one route or several? That decides `_components/` vs `components/`.
2. Does it need data? Then the call goes in a hook, not the component.
3. Does it render text? Then the string goes in a message file.
4. Does it have a branch, a filter or a format? Then it needs a test.
5. Does it add a colour? Use a token, or agree a new token on purpose.
