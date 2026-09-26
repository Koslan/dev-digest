/*
 * USD cost formatting, shared by every surface that shows run cost: the PR list
 * column, the run timeline and the trace drawer's stats block.
 *
 * One rule everywhere: null/undefined means UNKNOWN, not free. Callers render
 * nothing (or an em dash) in that case — never "$0.00", which would claim a run
 * was free when the provider simply reported no usage cost.
 */

/** Below this, a non-zero cost is shown as "<$0.0001" instead of rounding to zero. */
const MIN_DISPLAYED = 0.0001;

/**
 * From a dollar up, two decimals read better than four ($1.24, not $1.2372).
 * Below a dollar the fourth decimal is the signal — a single review typically
 * costs a fraction of a cent, and rounding it to $0.02 hides the difference
 * between a cheap model and an expensive one.
 */
const TWO_DECIMALS_FROM = 1;

/**
 * Format a USD amount for display, or return null when there is nothing to
 * show.
 */
export function formatCostUsd(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (value === 0) return "$0";
  if (value < MIN_DISPLAYED) return `<$${MIN_DISPLAYED}`;
  if (value < TWO_DECIMALS_FROM) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}
