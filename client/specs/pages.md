# Spec — pages and screens

What each screen must render and where every value comes from. These statements
are the contract the e2e flows and component tests rely on; change one and update
this file in the same commit.

## Route map

| Route | Screen | Data |
|---|---|---|
| `/` | Redirects to the first repo's PR list, or an empty state linking to onboarding | `useRepos` |
| `/onboarding` | Add-repository form; on success navigates to that repo's PR list | `useAddRepo` |
| `/repos/[repoId]/pulls` | PR list | `usePulls`, `useRefreshRepo` |
| `/repos/[repoId]/pulls/[number]` | PR detail with three tabs and the trace drawer | `usePullDetail`, `usePrReviews`, `usePrRuns`, `usePrActiveRuns` |
| `/agents` | Agent list | `useAgents` |
| `/agents/[id]` | Agent list plus editor — Config and Skills tabs | `useAgent`, `useUpdateAgent`, `useSkills`, `useAgentSkills`, `useSetAgentSkills` |
| `/skills` | Skill library: card grid plus side preview | `useSkills`, `useUpdateSkill`, `useDeleteSkill` |
| `/skills/[id]` | One skill: Config, Preview, Versioning | `useSkill`, `useSkillVersions`, `useRestoreSkillVersion` |
| `/conventions` | Convention candidates for the active repo, and the skill built from the accepted ones | `useConventions`, `useExtractConventions`, `usePatchConvention`, `useCreateConventionSkill` |
| `/settings/[section]` | `api-keys` and `models` sections | `useSettings`, `useSecretsStatus`, `useTestConnection` |

URL is the source of truth for tab and drawer state: `?status` on the PR list,
`?tab` and `?trace` on PR detail, `?tab` in the agent editor. Search and sort on
the PR list are local state on purpose.

## PR list

- Header shows the open count and the needs-review count. `OPEN_STATUSES` is
  `needs_review`, `reviewed`, `stale`.
- Default status filter is `needs_review`.
- Columns are declared once in `constants.ts` as `COLUMN_KEYS` and must stay in
  lockstep with `GRID`, which lays out both the header row and every `PRRow`.
  A column added to one and not the other silently misaligns the table.
- Column contents:

| Column | Content |
|---|---|
| Pull request | PR icon tinted by status, title, `#number` in monospace |
| Author | avatar and login |
| Size | `S`/`M`/`L` badge plus changed lines; thresholds 100 and 400 |
| Score | circular score, or an em dash when `score` is null — **null means never reviewed, not zero** |
| Findings | one icon-plus-count per severity the **latest** run produced; hovering opens the read-only preview popover |
| Cost | total USD of every **successful** run of this PR, or an em dash — **null means unknown, never $0** |
| Status | dot badge from `STATUS_META` |
| Updated | compact relative time (`now`, `5m`, `3h`, `2d`), right aligned |

- The whole row is a link to `/repos/{repoId}/pulls/{number}`.
- `FilterBar` holds the search box, the status chips, the sort select and the
  refresh button; refresh maps to `POST /repos/:id/refresh`.
- **Cost formatting is shared** with the timeline and the trace drawer, in
  `src/lib/cost.ts`: four decimals below a dollar, two above, `<$0.0001` for a
  non-zero amount below that, and `null` — rendered as an em dash — whenever the
  amount is unknown.
### Findings popover

- Opens on hover over the severity icons, closes when the pointer leaves.
- Header reads **"N findings in this run"**, where N is the total of the latest
  review — including findings beyond the previews.
- Each preview shows: severity dot, title, category, `file:line`, confidence
  percentage and a truncated rationale.
- **Read-only. No buttons of any kind.** Accepting or dismissing a finding
  happens in the expanded run card on the PR page, never here.
- When the preview list is capped, a final line says how many more findings the
  PR page holds.
- The popover is rendered into `<body>` and positioned against the icons,
  because the list card clips its own content.

## PR detail

### Header

`#number` and title, author, `branch → base`, additions and deletions in the diff
colours, a status badge, a "View on GitHub" button when the URL can be built, the
run-review dropdown, and a warning banner for merged or closed PRs.

Three tabs, in order:

| Tab key | Label shown | Badge |
|---|---|---|
| `overview` | Overview | — |
| `findings` | **Agent runs** | number of findings |
| `diff` | Files changed | number of files |

The key and the label differ for the middle tab. E2E flows click the label.

### Overview tab

Renders the PR description only.

### Files changed tab

Renders the diff viewer. Inline commenting is available only while the PR status
is `open`.

### Agent runs tab

Sections in fixed order:

1. **Live review** — cancel-all and open-trace actions plus the streaming log,
   visible only while at least one run is active. Active runs come from the
   server, so they survive a reload.
2. **Lethal Trifecta banner** — shown when any finding has that kind.
3. **Timeline** — runs and commits merged, newest first. Each run tile shows an
   outcome badge derived deterministically: `running`, `failed`, `cancelled`,
   then `rejected` when blockers are present, `reviewed` when findings exist,
   otherwise `approved`. A run with blockers must never render as a plain
   success. Tiles also carry the circular score, agent name, provider and model,
   the run time with **that run's cost** beneath it, a trace button and a
   delete button.
4. **Review runs** — one collapsible `ReviewRunAccordion` per review, newest
   first, the first one open by default.

### Review run accordion

- Header: agent name, verdict badge, `"N findings"` with a blocker count when
  blockers exist, the score badge, the run timestamp, a delete action and a
  chevron.
- Body: the verdict banner, then the findings panel for that run.
- The accordion has a stable DOM id (`review-run-<run_id>`) so the timeline can
  open and scroll to it.

### Findings panel and cards

- Directly under the verdict banner and the PR score: a row of severity
  counters — `N CRITICAL · N WARNING · N SUGGESTION` — listing only the
  severities this run actually produced.
- **Counts are a group-by over the findings already on screen.** No request and
  no model call happens when the card opens or a filter is toggled, and the
  number on a counter always equals the number of cards of that severity
  rendered below it.
- Under the counters, three filter buttons: **Critical**, **Warning**,
  **Suggestion**. Clicking one keeps only that severity; clicking the same
  button again clears the filter and restores the run's full list. A button for
  a severity the run has none of is disabled.
- Findings are filtered to `confidence ≥ 0.65` unless "Hide low confidence" is
  toggled off, then sorted CRITICAL → WARNING → SUGGESTION → INFO.
- Keyboard: `j` / `k` move focus, `a` accepts, `d` dismisses; input fields are
  ignored.
- A card shows the severity badge, title, category, accepted/dismissed tag, a
  monospace `file:line` link to the blob on GitHub, and the confidence value.
  Expanded it renders the rationale as Markdown and the suggested fix.
- **Accept and Reject live here and only here.** Both are derived from the
  persisted `accepted_at` / `dismissed_at` timestamps, call
  `POST /findings/:id/{accept|dismiss}`, and dim the card once acted on.

## Run trace drawer

Opened by `?trace=<runId>`, 720 px wide, titled with the agent name and the PR
number plus running or completed state. Footer copies the raw output.

Two tabs: **trace** and **log**; the log tab is the default while the run is
still running, the trace tab afterwards. The log tab streams SSE while running
and falls back to the persisted log once the run has finished.

Trace tab sections, in order:

1. **Configuration** — model, provider, memory pulled, specs read.
2. **Stats** — the grounding string as a badge, plus stat tiles: **DURATION**
   (`8.2s`), **TOKENS** (`12k→1.5k`), **FINDINGS** (count) and **COST**
   (`$0.0042`, or an em dash when the provider reported none).
3. **Findings** — read-only preview cards: severity badge, title, monospace
   `file:start-end`, rationale, optional suggested fix. No accept or dismiss
   buttons here.
4. **Prompt assembly** — one collapsible block per leg, always `system` and
   `user`, conditionally `skills`, `memory`, `repo_map`, `specs`, `callers`,
   each with its own colour, a copy button and a fullscreen view with a line
   filter.
5. **Tool calls** — name, arguments, meta and duration per call.
6. **Raw output** — monospace dump.

## Empty and error states

- Unknown repo id → friendly not-found state on both repo-scoped pages.
- No repos at all → onboarding call to action on `/`.
- Loading lists render skeleton rows, not spinners.
- Query errors surface through the global toast; only network failures and 5xx
  are toasted for queries, every mutation error is.
