import type { CSSProperties } from "react";
import { POPOVER_MAX_HEIGHT, POPOVER_WIDTH } from "./constants";

/** Co-located styles for the PR list FINDINGS cell and its hover popover. */
export const s = {
  cell: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 8,
  } satisfies CSSProperties,
  icons: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    cursor: "default",
  } satisfies CSSProperties,
  iconGroup: (color: string): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    color,
    fontSize: 11,
    fontWeight: 600,
  }),
  none: { color: "var(--text-muted)", fontSize: 12 } satisfies CSSProperties,

  /** The popover itself — read-only preview, no actions. */
  popover: {
    // Fixed + portalled into <body>: the list card clips its own content.
    position: "fixed",
    zIndex: 60,
    width: POPOVER_WIDTH,
    maxHeight: POPOVER_MAX_HEIGHT,
    overflowY: "auto",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border-strong)",
    background: "var(--bg-elevated)",
    boxShadow: "var(--shadow-modal)",
    cursor: "default",
  } satisfies CSSProperties,
  popoverTitle: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    marginBottom: 10,
  } satisfies CSSProperties,
  item: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: "var(--border)",
  } satisfies CSSProperties,
  itemFirst: { borderTopWidth: 0, paddingTop: 0 } satisfies CSSProperties,
  itemHead: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  } satisfies CSSProperties,
  sevDot: (color: string): CSSProperties => ({
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: color,
    flexShrink: 0,
  }),
  itemTitle: {
    fontSize: 12.5,
    fontWeight: 600,
    color: "var(--text-primary)",
  } satisfies CSSProperties,
  itemMeta: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 11,
    color: "var(--text-muted)",
  } satisfies CSSProperties,
  itemBody: {
    fontSize: 12,
    lineHeight: 1.45,
    color: "var(--text-secondary)",
  } satisfies CSSProperties,
  more: {
    marginTop: 8,
    fontSize: 11,
    color: "var(--text-muted)",
  } satisfies CSSProperties,
} as const;
