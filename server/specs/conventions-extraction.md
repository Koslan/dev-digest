# Spec — convention extraction

Contract for what `POST /repos/:id/conventions/extract` does and does not do.
These statements must stay true; a change that breaks one of them is a
behaviour change and needs this file updated in the same commit.

## 1. Choosing what the model sees

- The sample is selected by **code, never by a model**
  (`src/modules/conventions/service.ts:scan`):
  - config files by name from `CONFIG_FILE_CANDIDATES` — a missing file is
    skipped, never an error;
  - up to `SAMPLE_FILE_COUNT` (12) source files from
    `repoIntel.getConventionSamples(repoId, n)`, which is rank order minus
    tests, configs and migrations.
- Each file is read through `container.git.readFile` and trimmed to
  `MAX_FILE_CHARS`; the assembled message is capped at `MAX_SAMPLE_CHARS`.
- With neither a config file nor a source file, the scan fails with
  `CONVENTIONS_NO_SAMPLE` (422) instead of calling the model.
- The paths that were used come back as `sampled_files` and `config_files`, so
  a scan can be explained after the fact.

## 2. The one model call

- Exactly **one** `completeStructured` call per scan, schema
  `ConventionProposalSet`, schema name `convention_candidates`.
- The model is resolved per workspace through
  `resolveFeatureModel(container, workspaceId, 'conventions')` — Settings →
  Models decides it, never a module constant.
- Every proposal carries `{category, rule, evidence_path, evidence_line,
  evidence_snippet, confidence}`. A response that does not fit the schema is
  retried by the provider adapter, never stored.

## 3. What is kept

A proposal is discarded when (`helpers.ts:keepProposal`):

- `confidence < MIN_CONFIDENCE` (0.4);
- `evidence_path` is not one of the files that were sampled — the model
  invented the evidence;
- its rule (normalised) already exists for this repo.

At most `MAX_CANDIDATES` (20) survive one scan.

## 4. Rescanning

- A rescan deletes only `status = 'pending' AND edited = false` rows
  (`repository.ts:deleteReplaceable`).
- **Accepted, rejected and hand-edited candidates survive**, and their rules are
  in the dedupe set, so a rejected rule is never proposed again. This is what
  makes Reject stick across a reload and a ReScan.

## 5. Accepted candidates → one skill

- `POST /repos/:id/conventions/skill` requires at least one accepted candidate,
  else `CONVENTIONS_NONE_ACCEPTED` (422).
- The skill is created with `type = 'convention'` and `source = 'extracted'`,
  and the name is reused: creating it a second time **updates** that skill
  through the normal versioning path (snapshot, then bump), rather than adding
  a copy.
- With `agent_id`, the skill is linked to that agent at the end of its skill
  order, and linking is idempotent.
- `GET /repos/:id/conventions/draft` returns the body the modal opens with:
  accepted rules grouped by category, each with its `path:line` evidence.

Covered by `test/conventions.it.test.ts`.
