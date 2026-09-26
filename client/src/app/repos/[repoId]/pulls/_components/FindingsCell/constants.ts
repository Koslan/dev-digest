import type { IconName } from "@devdigest/ui";
import type { Severity } from "@/lib/types";

/** Severities in display order: worst first. */
export const SEVERITY_ORDER_LIST: Severity[] = ["CRITICAL", "WARNING", "SUGGESTION"];

/** Severity → colour token, the same palette the finding cards use. */
export const SEVERITY_TONE: Record<Severity, string> = {
  CRITICAL: "var(--crit)",
  WARNING: "var(--warn)",
  SUGGESTION: "var(--sugg)",
};

/** Severity → icon, so the column is readable without relying on colour alone. */
export const SEVERITY_ICON: Record<Severity, IconName> = {
  CRITICAL: "AlertOctagon",
  WARNING: "AlertTriangle",
  SUGGESTION: "Lightbulb",
};

/** Gap in px between the severity icons and the popover. */
export const POPOVER_GAP = 8;

/** Popover box size used for viewport clamping (mirrors styles.ts). */
export const POPOVER_WIDTH = 380;
export const POPOVER_MAX_HEIGHT = 360;
