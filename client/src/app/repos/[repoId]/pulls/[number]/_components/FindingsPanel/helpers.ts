import type { FindingRecord } from "@devdigest/shared";
import {
  FILTER_SEVERITIES,
  LOW_CONFIDENCE_THRESHOLD,
  SEVERITY_ORDER,
  type FilterSeverity,
} from "./constants";

/** Optionally drop low-confidence findings and sort by severity. */
export function visibleFindings(findings: FindingRecord[], hideLow: boolean): FindingRecord[] {
  let shown = findings;
  if (hideLow) shown = shown.filter((f) => f.confidence >= LOW_CONFIDENCE_THRESHOLD);
  return [...shown].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
  );
}

/**
 * Count findings per severity by grouping the list already on screen — a plain
 * reduce over data the page has, with no request and no model call. Count the
 * SAME list the cards are rendered from (after the confidence filter, before
 * the severity filter) so a counter can never disagree with what is below it.
 */
export function countBySeverity(findings: FindingRecord[]): Record<FilterSeverity, number> {
  const counts: Record<FilterSeverity, number> = { CRITICAL: 0, WARNING: 0, SUGGESTION: 0 };
  for (const f of findings) {
    if ((FILTER_SEVERITIES as readonly string[]).includes(f.severity)) {
      counts[f.severity as FilterSeverity] += 1;
    }
  }
  return counts;
}

/** Apply the severity filter; `null` means "no filter, show everything". */
export function filterBySeverity(
  findings: FindingRecord[],
  severity: FilterSeverity | null,
): FindingRecord[] {
  return severity === null ? findings : findings.filter((f) => f.severity === severity);
}
