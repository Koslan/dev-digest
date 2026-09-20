---
name: Test coverage depth
description: Flag a test that only proves the happy path — name the uncovered branch and the boundary value the suite never tries.
type: rubric
---

# Test coverage depth

A test that only runs the path where everything works proves that nothing
throws on a good day. Review the **test file against the code it covers**, and
report what the suite would not catch.

## Rule

For every function or handler the diff tests, enumerate its behaviours from the
code — each `if`, each `catch`, each early return, each state the input can be
in — and flag the ones no test exercises:

- an **error path**: a thrown error, a rejected promise, a non-2xx response, a
  failing dependency;
- a **branch** with no test: the `else`, the guard clause, the retry, the
  cancellation;
- a **boundary**: empty string, empty array, zero, negative, one item, the
  limit and the limit plus one, the maximum length, `null` vs `undefined`;
- an assertion that cannot fail — asserting only "no exception", `toBeDefined()`
  on something built literally above, or snapshotting the input;
- shared mutable state or ordering between tests: a test that passes only
  because an earlier one ran first.

Do not ask for "more coverage". Every finding names **one** uncovered
behaviour and the input that reaches it.

## What to report

Severity **warning** for an uncovered branch or boundary; **critical** when the
uncovered path is the one that loses or corrupts data, or that decides access.

Cite the `file:line` of the code branch that is not covered — not just the test
file — and give the concrete input that would reach it, so the missing test can
be written from the finding alone.

## Bad — flagged

```ts
// discount.ts
export function applyDiscount(total: number, percent: number) {
  if (percent < 0 || percent > 100) throw new RangeError('percent out of range');
  if (total === 0) return 0;
  return total - (total * percent) / 100;
}

// discount.test.ts
it('applies a discount', () => {
  expect(applyDiscount(200, 10)).toBe(180);   // the only test
});
```

> **warning** — `discount.ts:3` throws on an out-of-range percent and no test
> reaches it: `applyDiscount(200, 120)` is untested. **warning** —
> `discount.ts:4` returns early for `total === 0`; `applyDiscount(0, 10)` is
> untested. Boundaries `percent = 0` and `percent = 100` are untried.

## Good — not flagged

```ts
it.each([
  [200, 10, 180],
  [200, 0, 200],      // boundary
  [200, 100, 0],      // boundary
  [0, 10, 0],         // early return
])('applyDiscount(%i, %i) = %i', (total, percent, expected) => {
  expect(applyDiscount(total, percent)).toBe(expected);
});

it('rejects a percent outside 0…100', () => {
  expect(() => applyDiscount(200, 120)).toThrow(RangeError);
});
```

> Every branch of the function is reached, and the boundaries are named.
