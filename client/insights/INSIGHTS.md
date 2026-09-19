# INSIGHTS — client

Appended by the engineering-insights skill. Append only; never rewrite history.

## Patterns
- **2026-09-20 · Pattern** — The PR-list table has no per-column component: `COLUMN_KEYS`, the `GRID` track list and the cells in `PRRow` are three parallel lists that must be edited together, plus the `list.columns.*` message. Miss one and the header and the rows silently misalign. Evidence: `client/src/app/repos/[repoId]/pulls/constants.ts:31`.

## Mistakes

## Decisions
- **2026-09-20 · Decision** — Cost is formatted in one shared helper used by the list, the timeline and the trace drawer, and `null` always renders as an em dash rather than `$0.00`: the provider not reporting a cost is unknown, not free. Evidence: `client/src/lib/cost.ts:24`.

## Context
- **2026-09-20 · Context** — Component tests import the real `messages/en/*.json`, so a new UI string fails the test until its key exists; and a `Partial<RunSummary>` fixture stops type-checking the moment a required field is added to the contract. Both are load-bearing, not incidental. Evidence: `client/src/app/repos/[repoId]/pulls/[number]/_components/RunHistory/RunHistory.test.tsx:16`.

## Errors and fixes
