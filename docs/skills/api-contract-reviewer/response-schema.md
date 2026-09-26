---
name: Response schema discipline
description: Flag endpoints whose response is not declared by a schema, or whose declared schema and returned object have drifted apart.
type: rubric
---

# Response schema discipline

An endpoint's response is part of its contract only if something in the code
states what that response is. A handler that returns a hand-built object is a
contract nobody can read, diff or generate a client from.

## Rule

Flag a response as undeclared or drifted when:

- a route returns an object with **no response schema** attached (no
  `schema.response`, no declared return type tied to a contract);
- the handler returns **fields the schema does not declare** — they are silently
  stripped by the serializer, or leak if serialization is off;
- the schema declares a field the handler **never sets**, so clients see
  `undefined` for something documented as present;
- an internal record is returned **as-is** (`return row`), exposing column
  names, internal ids, or columns added later by a migration nobody reviewed
  with this endpoint in mind;
- `null` and "absent" are used interchangeably for the same field across
  branches of one handler.

## What to report

Severity **warning** for a missing or drifted schema, **critical** when the
drift leaks data that was never meant to be public (password hashes, tokens,
another tenant's ids, internal notes).

Cite the handler's `file:line` and name the exact field that is undeclared,
unset, or leaked. Say which of the two sides you would change — usually the
handler, because the schema is the contract.

## Bad — flagged

```ts
app.get('/users/:id', async (req) => {
  const row = await repo.getById(req.params.id);
  return row;                  // whole DB row: password_hash, internal_notes…
});
```

> **critical** — `routes/users.ts:31` returns the raw row from `repo.getById`.
> `password_hash` and `internal_notes` are columns on `users` and reach the
> client. Declare a response schema and map the row through it.

## Good — not flagged

```ts
const UserResponse = z.object({ id: z.string(), email: z.string(), name: z.string() });

app.get('/users/:id', { schema: { response: { 200: UserResponse } } }, async (req) => {
  const row = await repo.getById(req.params.id);
  return { id: row.id, email: row.email, name: row.name };   // declared, mapped
});
```

> The schema is the contract, the mapping is explicit, and a new column cannot
> quietly join the response.
