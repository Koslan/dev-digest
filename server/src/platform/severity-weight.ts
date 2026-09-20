/**
 * Score penalty per finding severity. Used by the PR score ring: a review's
 * score is 100 minus the sum of the weights of its findings.
 */
export function severityWeight(severity: string): number {
  if (severity === 'CRITICAL') return 35;
  if (severity === 'WARNING') return 12;
  if (severity === 'SUGGESTION') return 3;
  return 0;
}
