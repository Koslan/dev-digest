import type { ConventionRecord } from "@devdigest/shared";

/** The three piles the page renders. Rejected is kept, just out of the way. */
export interface CandidateGroups {
  open: ConventionRecord[];
  accepted: ConventionRecord[];
  rejected: ConventionRecord[];
}

/**
 * Split candidates by status. Accepted rows stay in the main list (they are
 * what the skill is built from); rejected ones move to their own pile so a
 * rejection is visibly out of the way without being lost.
 */
export function groupCandidates(records: ConventionRecord[]): CandidateGroups {
  return {
    open: records.filter((r) => r.status === "pending"),
    accepted: records.filter((r) => r.status === "accepted"),
    rejected: records.filter((r) => r.status === "rejected"),
  };
}

/** Confidence as a whole-number percentage, clamped to 0…100. */
export function confidencePercent(confidence: number): number {
  return Math.round(Math.min(Math.max(confidence, 0), 1) * 100);
}

/** `path:line`, or just the path when the model gave no line. */
export function evidenceLabel(record: ConventionRecord): string {
  return record.evidence_line ? `${record.evidence_path}:${record.evidence_line}` : record.evidence_path;
}
