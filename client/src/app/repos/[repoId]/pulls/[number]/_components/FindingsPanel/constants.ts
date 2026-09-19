import type { FindingActionKind } from "@devdigest/shared";

/** Sort weight per severity (lower = shown first). */
export const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  WARNING: 1,
  SUGGESTION: 2,
  INFO: 3,
};

/** Confidence below this is hidden when "hide low confidence" is on. */
export const LOW_CONFIDENCE_THRESHOLD = 0.65;

/**
 * Severities the counters and the filter buttons cover, in display order.
 * INFO is deliberately absent: the review contract only produces these three.
 */
export const FILTER_SEVERITIES = ["CRITICAL", "WARNING", "SUGGESTION"] as const;
export type FilterSeverity = (typeof FILTER_SEVERITIES)[number];

/** Severity → colour token, same palette the severity badges use. */
export const SEVERITY_COLOR: Record<FilterSeverity, string> = {
  CRITICAL: "var(--crit)",
  WARNING: "var(--warn)",
  SUGGESTION: "var(--sugg)",
};

/** i18n label key (under `panel.severity`) per severity. */
export const SEVERITY_LABEL_KEY: Record<FilterSeverity, string> = {
  CRITICAL: "critical",
  WARNING: "warning",
  SUGGESTION: "suggestion",
};

/** Keyboard shortcut → finding action. */
export const KEY_TO_ACTION: Record<string, FindingActionKind> = {
  a: "accept",
  d: "dismiss",
};
