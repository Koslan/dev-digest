---
name: Semver discipline
description: Flag a change whose version bump, route version or changelog entry does not match the compatibility of the change itself.
type: rubric
---

# Semver discipline

The version number is a promise about compatibility. Flag the cases where the
diff and the promise disagree.

## Rule

Compare **what the diff does** with **how it is versioned**:

- a breaking change (see the breaking-change skill) shipped as a **patch or
  minor** bump, or with no bump at all;
- a breaking change added to an existing versioned route (`/v1/...`) instead of
  a new one (`/v2/...`), while `/v1` keeps advertising the old contract;
- a new feature shipped as a **patch** bump;
- a bump in `package.json` (or the API version constant) with **no changelog
  entry**, or a changelog entry that describes something the diff does not do;
- a `0.x` package treated as stable by callers — say so explicitly rather than
  assuming the 0.x escape hatch covers it.

Do not flag internal packages that are not published and have no external
consumer — say that is why, instead of staying silent.

## What to report

Severity **warning** normally; **critical** when a breaking change ships under
a patch bump on a published package, because consumers with `^`/`~` ranges pick
it up automatically.

Cite the version line's `file:line` and the `file:line` of the change that
contradicts it. State the bump you would make instead, in one line.

## Bad — flagged

```diff
  // package.json
- "version": "2.4.1",
+ "version": "2.4.2",

  // src/client.ts
- export function fetchUser(id: string, opts?: Options) {
+ export function fetchUser(id: string, opts: Options) {   // opts now required
```

> **critical** — `package.json:3` ships a patch bump while `src/client.ts:18`
> makes `opts` required. Every consumer on `^2.4.0` upgrades automatically and
> fails to compile. This is `3.0.0`, or keep `opts` optional with a default.

## Good — not flagged

```diff
  // package.json
- "version": "2.4.1",
+ "version": "3.0.0",

  // CHANGELOG.md
+ ## 3.0.0
+ **Breaking:** `fetchUser(id, opts)` — `opts` is now required.
```

> The bump, the changelog and the code say the same thing.
