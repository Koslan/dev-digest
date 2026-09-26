/** Literals for the conventions module. */

/**
 * How many source files the scan shows the model. Twelve is what the lab asks
 * for: enough for a pattern to repeat, small enough to stay inside a cheap
 * model's context next to the config files.
 */
export const SAMPLE_FILE_COUNT = 12;

/**
 * Config files that state a convention outright instead of demonstrating it.
 * They are picked by name — no model is involved in choosing the sample — and
 * every one that is missing from the repo is simply skipped.
 */
export const CONFIG_FILE_CANDIDATES: readonly string[] = [
  'package.json',
  'tsconfig.json',
  'tsconfig.base.json',
  '.eslintrc',
  '.eslintrc.json',
  '.eslintrc.cjs',
  'eslint.config.js',
  'eslint.config.mjs',
  '.prettierrc',
  '.prettierrc.json',
  'prettier.config.js',
  '.editorconfig',
];

/** Per-file ceiling in characters — a sample is an excerpt, not an attachment. */
export const MAX_FILE_CHARS = 6_000;

/** Ceiling for the whole assembled sample, across config and source files. */
export const MAX_SAMPLE_CHARS = 60_000;

/** Never store more candidates than this from a single scan. */
export const MAX_CANDIDATES = 20;

/** Below this, a proposal is noise rather than a convention. */
export const MIN_CONFIDENCE = 0.4;

/** The name the assembled skill always carries, so a rescan updates one skill. */
export const CONVENTIONS_SKILL_NAME = 'repo-conventions';

/** Structured-output schema name sent to the provider. */
export const PROPOSAL_SCHEMA_NAME = 'convention_candidates';

export const SCAN_MAX_TOKENS = 4_000;
export const SCAN_TEMPERATURE = 0.1;

/**
 * The classifier's instructions. It reads files and reports the rules they
 * already follow — it does not recommend, rank or improve anything, and a rule
 * it cannot point at a line for is not a rule.
 */
export const SYSTEM_PROMPT = `You extract the coding conventions a repository ALREADY follows.

You are given some of its config files and its most-depended-on source files.
Report only patterns you can SEE repeated in the material you were given.

Rules for every candidate you return:
- "rule" is one directive sentence in the imperative, specific enough to review
  against: "Route handlers delegate to a service and never query the database",
  not "the code is well layered".
- "evidence_path" MUST be one of the file paths shown to you, copied exactly.
  "evidence_line" is the line in that file where the rule is visible.
- "evidence_snippet" is at most 5 lines copied from that file.
- "confidence" is 0..1: how consistently you saw the pattern held. Use a low
  value when you saw it once, a high one when the sample follows it throughout.
- Prefer 5 to 12 strong candidates over a long list of weak ones. Do not invent
  a convention to fill the list, and never report a rule the sample contradicts.`;
