import type { ConventionCategory } from "@devdigest/shared";

/** Category → colour token. Categories are kinds, not severities: no red. */
export const CATEGORY_TONE: Record<ConventionCategory, string> = {
  naming: "var(--accent)",
  structure: "var(--info)",
  imports: "var(--info)",
  typing: "var(--accent)",
  "error-handling": "var(--warn)",
  testing: "var(--ok)",
  styling: "var(--text-secondary)",
  other: "var(--text-muted)",
};

/** The categories an inline edit can move a candidate to. */
export const CATEGORY_VALUES: readonly ConventionCategory[] = [
  "naming",
  "structure",
  "imports",
  "typing",
  "error-handling",
  "testing",
  "styling",
  "other",
];

/** The skill a scan always produces, so a second Create updates one skill. */
export const CONVENTIONS_SKILL_NAME = "repo-conventions";
