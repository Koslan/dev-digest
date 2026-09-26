# Importable skills

Skill files meant to be loaded into the studio through **Skills → Add →
Import**. They are the human-readable originals; the DB row created by the
import is what a run actually reads, exactly like `docs/agent-prompts/`.

Each file is a `SKILL.md`: YAML frontmatter (`name`, `description`, `type`)
followed by the body that is pasted into the agent's system prompt. The
frontmatter keys are the only ones the importer interprets
(`server/src/modules/skills/helpers.ts:parseFrontmatter`).

| Folder | Agent it belongs to | What it makes the model look for |
|---|---|---|
| [`api-contract-reviewer/`](./api-contract-reviewer) | API Contract Reviewer | breaking changes, response schemas, semver, deprecation |
| [`test-quality-reviewer/`](./test-quality-reviewer) | Test Quality Reviewer | uncovered branches and boundaries, mocks that replace the unit under test, flaky timing/order/randomness |

The seed (`server/src/db/seed.ts`, `seedSkillsLab`) loads every file here as an
imported skill and creates both agents with a deliberately neutral prompt, so a
fresh `./scripts/dev.sh` can reproduce the control experiment: run the agent,
switch its skills on in the Skills tab, run it again. Nothing is linked by the
seed — the first run is the one without the skill.

Every skill here follows the same shape, because a skill that only describes a
topic changes nothing about a review:

1. **A directive rule.** "Flag X", not "X is important".
2. **What to report** — the severity and what the finding must cite.
3. **A bad/good pair.** The model is a pattern matcher; one concrete pair of
   diffs beats a paragraph of principle.

## Importing them

1. Skills → **Add** → **Import**, pick the `.md` file (or a `.zip` containing a
   `SKILL.md`).
2. Check the preview — the import is deliberately two-step, because a foreign
   skill ends up inside a system prompt.
3. Save, then attach it on the agent's **Skills** tab and drag it into the
   order you want. That order is the order the bodies reach the model.
