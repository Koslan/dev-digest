---
name: Excessive mocking
description: Flag a test that mocks the unit it claims to test, or mocks so much that it only proves the mocks were called.
type: rubric
---

# Excessive mocking

A mock stands in for a **boundary** — the network, the clock, the filesystem, a
third-party SDK. Once it stands in for the code under test, the test stops
testing anything. Review each test by asking what would still be real if the
mocks were deleted.

## Rule

Flag a test as over-mocked when:

- the module under test is itself mocked, partially mocked, or spied on so that
  its own logic never runs (`vi.mock('./service')` in `service.test.ts`);
- every collaborator is mocked, including pure helpers and value objects that
  have no I/O and would run fine for real;
- the only assertions are `toHaveBeenCalled` / `toHaveBeenCalledWith` on those
  mocks — the test proves the wiring, never the result;
- a mock returns exactly the value the assertion then checks, so the test would
  pass with the implementation deleted;
- the same mock setup is copy-pasted across tests instead of using a fake at the
  boundary (an in-memory repository, a fixed clock).

Do not flag mocks of genuine boundaries: HTTP clients, LLM providers, the
database in a unit test, `Date.now`, random ids.

## What to report

Severity **warning**. Cite the `file:line` of the mock that replaces real logic,
name what it hides, and say what should be real instead — usually "keep the
helper real and mock only the repository".

## Bad — flagged

```ts
// pricing.test.ts
vi.mock('./pricing', () => ({ estimateCost: vi.fn(() => 0.42) }));
import { estimateCost } from './pricing';

it('estimates cost', () => {
  expect(estimateCost('gpt-4.1', 1000, 500)).toBe(0.42); // tests the mock
});
```

> **warning** — `pricing.test.ts:2` mocks `estimateCost`, the function under
> test, and the assertion reads back the mock's own return value. The test
> passes with `pricing.ts` deleted. Remove the mock and assert on a known price.

## Good — not flagged

```ts
import { estimateCost } from './pricing';

it('prices a known model from the table', () => {
  expect(estimateCost('gpt-4.1', 1_000_000, 0)).toBeCloseTo(2.0);
});

it('returns null for a model it has no price for', () => {
  expect(estimateCost('unknown-model', 1000, 500)).toBeNull();
});
```

> The unit is real; only its inputs are chosen.
