---
name: API breaking change
description: Flag any edit that can break a live client of an existing endpoint — removed or renamed fields, narrowed types, new required inputs.
type: rubric
---

# API breaking change

You are reviewing a diff that may change a **published HTTP contract**. Judge
every change from the position of a client that is already deployed and that
you cannot redeploy.

## Rule

Flag a change as a breaking change when an existing, already-shipped request or
response shape stops accepting or producing what it did before:

- a response field is **removed** or **renamed**;
- a field's type is **narrowed** (`string | null` → `string`, `number` → enum),
  or an enum **loses** a member;
- a request gains a **required** parameter, body field or header;
- an existing parameter becomes stricter (optional → required, wider → narrower
  validation, a new `min`/`max`/`regex` on a field that had none);
- a route's **path, method or status code** changes for an existing operation;
- an error response changes shape or moves between status codes.

Additive and optional changes are **not** breaking: a new optional field, a new
endpoint, a new enum member accepted on input only, a widened type.

## What to report

Severity **critical** when a deployed client would start failing (removed
field, new required input, changed status code); **warning** when it would only
degrade (a field that silently starts arriving empty).

Cite the exact `file:line` of the changed declaration, name the affected
endpoint, and state in one line **what an existing client does when it hits
this**. Suggest the compatible alternative: keep the old field and deprecate
it, make the new input optional with a default, or version the route.

## Bad — flagged

```ts
// routes/users.ts
const UserResponse = z.object({
  id: z.string(),
- email: z.string(),
+ contact_email: z.string(),   // renamed: every client reading `email` breaks
  name: z.string(),
+ tenant_id: z.string(),       // required on input too — old clients send nothing
});
```

> **critical** — `routes/users.ts:12` renames `email` to `contact_email` on
> `GET /users/:id`. Clients reading `user.email` get `undefined` from the next
> deploy. Keep `email` populated alongside the new field for one release and
> mark it deprecated.

## Good — not flagged

```ts
const UserResponse = z.object({
  id: z.string(),
  email: z.string(),
+ /** @deprecated use `email`; kept until 2026-12 */
+ contact_email: z.string().optional(),   // additive, optional
});
```

> Additive and optional: an existing client sees exactly what it saw before.
