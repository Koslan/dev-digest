# Spec — browser flows

What the suite covers today and the rules a new flow must satisfy. The JSON
files in this directory are the executable form; this file is the contract around
them.

## Preconditions

1. A running stack: web app, API and a **freshly seeded** database.
2. The seeded demo repository must be the only repository. Flows 01, 02, 04 and
   05 enter through the root redirect, which lands on the *first* repo; with
   other imported repos they assert against the wrong one.
3. The `agent-browser` binary is installed globally.

Requirement 2 is why `scripts/e2e.sh` exists: it builds a throwaway stack with an
empty database. Never satisfy it by wiping the development volume.

## Coverage

| Flow | Asserts |
|---|---|
| `01-app-boot` | The root URL redirects to a repo's PR list and the list renders. Proves client, API and database are all alive; deliberately makes no claim about specific seeded rows. |
| `02-repo-pulls-detail` | Clicking a PR title from the list navigates to `/pulls/482` and the detail page renders the title. Covers nested routing and the per-PR fetch. |
| `03-agents` | The agents page lists the seeded reviewer agents. |
| `04-pr-findings` | On PR detail, the **Agent runs** tab shows the seeded run: verdict, the findings count and a known finding title. Covers the accordion, verdict banner, findings panel and finding card. |
| `05-pr-diff` | The **Files changed** tab renders the seeded diff for a known file. |
| `06-onboarding` | The add-repository screen renders its heading and the URL field. It never submits, so nothing is cloned or imported. |
| `07-settings` | Both settings sections render: API keys and feature models. |

## Rules for a new flow

- File name `NN-kebab-name.flow.json`; the prefix places it in the order.
- Include a `description` that says what the flow exercises and states any
  assumption about seeded data.
- Every step gets a `label`, phrased as what the user sees happening.
- Use deterministic locators only: `--url`, `--text`, `find role|text|label`.
  Never use the AI `chat` command.
- Put `wait --load networkidle` after any navigation that triggers requests.
- Assert on user-visible text, the same strings the component tests assert on, so
  a renamed label fails loudly in one obvious place.
- Never trigger a review run or any other model call. Flows exercise the UI over
  seeded data, nothing more.
- Keep flows read-only. Nothing may mutate the database, because flows share one
  browser session and one stack, and later flows would inherit the change.

## Coupling to keep in mind

- These flows assert on seed data from `server/src/db/seed.ts`. Changing the
  seed means updating the affected flows in the same commit.
- They also assert on visible UI labels. The PR detail tab whose key is
  `findings` is labelled **"Agent runs"**; flow 04 clicks the label. Renaming a
  label is a cross-package change.
- A failing step aborts its flow but not the suite; the summary reports
  `N/M flows passed` and the process exits non-zero.
