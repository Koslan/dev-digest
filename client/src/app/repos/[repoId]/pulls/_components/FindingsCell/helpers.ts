import type { PrFindingPreview, Severity } from "@/lib/types";
import { POPOVER_MAX_HEIGHT, POPOVER_WIDTH, SEVERITY_ORDER_LIST } from "./constants";

/**
 * Group the previewed findings by severity — a plain count over data already in
 * the list response. No request, no model call.
 */
export function countBySeverity(items: PrFindingPreview[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { CRITICAL: 0, WARNING: 0, SUGGESTION: 0 };
  for (const f of items) {
    if (SEVERITY_ORDER_LIST.includes(f.severity as Severity)) {
      counts[f.severity as Severity] += 1;
    }
  }
  return counts;
}

/**
 * Place the popover under the icons, flipping above when the viewport has no
 * room below and clamping so it never hangs off the right edge. Coordinates are
 * viewport-relative because the popover is rendered into <body> with
 * `position: fixed` — the list card clips anything nested inside the row.
 */
export function popoverPosition(
  anchor: { top: number; bottom: number; left: number },
  gap: number,
  viewport: { width: number; height: number } = {
    width: typeof window === "undefined" ? POPOVER_WIDTH : window.innerWidth,
    height: typeof window === "undefined" ? POPOVER_MAX_HEIGHT : window.innerHeight,
  },
): { top: number; left: number } {
  const below = anchor.bottom + gap;
  const fitsBelow = below + POPOVER_MAX_HEIGHT <= viewport.height;
  const top = fitsBelow ? below : Math.max(gap, anchor.top - gap - POPOVER_MAX_HEIGHT);
  const left = Math.max(gap, Math.min(anchor.left, viewport.width - POPOVER_WIDTH - gap));
  return { top, left };
}
