# INSIGHTS — client

Appended by the engineering-insights skill. Append only; never rewrite history.

## Patterns
- **2026-09-20 · Pattern** — The PR-list table has no per-column component: `COLUMN_KEYS`, the `GRID` track list and the cells in `PRRow` are three parallel lists that must be edited together, plus the `list.columns.*` message. Miss one and the header and the rows silently misalign. Evidence: `client/src/app/repos/[repoId]/pulls/constants.ts:31`.
- **2026-09-20 · Pattern** — A popover portalled to `<body>` with `position: fixed` does not travel with the row it belongs to, so it must close on `scroll` (capture phase, to catch inner scrollers) and on `resize`. Evidence: `client/src/app/repos/[repoId]/pulls/_components/FindingsCell/FindingsCell.tsx:29`.

## Mistakes
- **2026-09-20 · Mistake** — A popover rendered inside a PR row is clipped: the list card sets `overflow: hidden` for its rounded corners, so only the top few pixels showed. Portal it into `<body>` with `position: fixed` and position it from the anchor's bounding rect. Evidence: `client/src/app/repos/[repoId]/pulls/styles.ts:95`.

## Decisions
- **2026-09-20 · Decision** — Cost is formatted in one shared helper used by the list, the timeline and the trace drawer, and `null` always renders as an em dash rather than `$0.00`: the provider not reporting a cost is unknown, not free. Evidence: `client/src/lib/cost.ts:24`.

## Context
- **2026-09-20 · Context** — Component tests import the real `messages/en/*.json`, so a new UI string fails the test until its key exists; and a `Partial<RunSummary>` fixture stops type-checking the moment a required field is added to the contract. Both are load-bearing, not incidental. Evidence: `client/src/app/repos/[repoId]/pulls/[number]/_components/RunHistory/RunHistory.test.tsx:16`.
- **2026-09-20 · Context** — Adding a key to `messages/en/*.json` does not reach a running `next dev`: the merged message object is cached, so the UI keeps throwing `MISSING_MESSAGE` until the dev server is restarted, even though the component tests already pass. Evidence: `client/src/i18n/request.ts:16`.

## Errors and fixes
