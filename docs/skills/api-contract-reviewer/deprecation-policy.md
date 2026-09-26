---
name: Deprecation policy
description: Flag removals that skip the deprecation path, and deprecations that never say what to use instead or when the removal happens.
type: rubric
---

# Deprecation policy

Anything public is removed in two steps: first it is announced as going away,
then it goes away. Flag both halves of that rule.

## Rule

Flag a removal when a public endpoint, field, parameter, exported function or
config key is **deleted in the same change that first mentions it is going
away** — no prior release marked it deprecated.

Flag a deprecation as incomplete when it does not carry all three of:

1. a **marker** the consumer can see — `@deprecated` in the docstring, a
   `Deprecation`/`Sunset` response header, or a documented notice;
2. the **replacement**: what to call or read instead, by name;
3. the **removal date or version**, concrete — "in a future release" is not a
   date.

Also flag: a deprecated path that has no server-side signal at all (no log, no
metric), because nobody will know whether it is safe to remove on the promised
date.

## What to report

Severity **critical** for a removal with no prior deprecation on something
public; **warning** for a deprecation missing its replacement, its date, or its
usage signal.

Cite the `file:line` of the removal or the marker. Name the consumers you can
see in the repo that still use it — a grep result is evidence, an assumption is
not.

## Bad — flagged

```diff
  // routes/reports.ts
- app.get('/reports/daily', handler);          // removed outright
+ app.get('/reports/summary', handler);
```

> **critical** — `routes/reports.ts:14` deletes `GET /reports/daily` with no
> deprecation window; `scripts/cron/daily-mail.ts:22` still calls it. Keep the
> old route delegating to the new one, add `Deprecation` +
> `Sunset: 2026-12-01` headers, and remove it after the sunset date.

## Good — not flagged

```ts
/** @deprecated Use `GET /reports/summary`. Removed on 2026-12-01. */
app.get('/reports/daily', async (req, reply) => {
  reply.header('Deprecation', 'true').header('Sunset', 'Wed, 01 Dec 2026 00:00:00 GMT');
  req.log.warn({ route: 'reports.daily' }, 'deprecated route called');  // usage signal
  return summaryHandler(req, reply);
});
```

> Marked, redirected to a named replacement, dated, and measurable.
