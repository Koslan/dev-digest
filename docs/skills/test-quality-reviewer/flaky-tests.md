---
name: Flaky tests
description: Flag a test whose result depends on time, order, randomness or the network rather than on the code — and any retry or sleep added to hide it.
type: rubric
---

# Flaky tests

A flaky test fails sometimes with no change to the code. It is worse than no
test: people learn to re-run it, and then they re-run the one that caught a real
bug. Flag the causes, not the symptom.

## Rule

Flag a test as flaky-by-construction when its outcome depends on something the
test does not control:

- **wall-clock time** — `new Date()`, `Date.now()`, timezones, "today", a
  deadline computed at runtime, without a fixed clock (`vi.useFakeTimers`,
  `vi.setSystemTime`);
- **sleeps as synchronisation** — `await sleep(500)` / `setTimeout` waiting for
  something to "probably" finish, instead of awaiting the promise or polling a
  condition with a timeout;
- **randomness** — `Math.random()`, generated ids or shuffled data with no seed,
  asserted on directly;
- **order** — a test that passes only after another test ran, shared mutable
  module state, a database row left behind by a previous test;
- **the outside world** — a real network call, a real LLM, the current machine's
  locale or file layout;
- **concealment** — `retry: 3`, `test.retry`, a wrapping `try/catch` that
  swallows the assertion, or a skipped test with no issue link.

## What to report

Severity **warning**; **critical** when the diff adds a retry or a sleep to make
an existing failure go away, because that hides a real defect.

Cite the `file:line` of the uncontrolled input and name the control that fixes
it: a fake timer, an awaited promise, a seeded generator, per-test setup.

## Bad — flagged

```ts
it('expires the session after an hour', async () => {
  const session = createSession();          // stamps Date.now()
  await new Promise((r) => setTimeout(r, 100));
  expect(isExpired(session, Date.now() + 3_600_000)).toBe(true);
}, { retry: 2 });
```

> **critical** — `session.test.ts:5` adds `retry: 2` around a test that reads the
> real clock twice (`session.ts:12` and the assertion) and sleeps 100 ms. The
> retry hides the timing race instead of removing it.

## Good — not flagged

```ts
it('expires the session after an hour', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  const session = createSession();
  vi.advanceTimersByTime(60 * 60 * 1000 + 1);
  expect(isExpired(session, Date.now())).toBe(true);
  vi.useRealTimers();
});
```

> Time is an input the test owns; the result is the same on every run.
