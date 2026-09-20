import type { CSSProperties } from "react";

/** Co-located styles for FindingsPanel (extracted from inline styles). */
export const s = {
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    flexWrap: "wrap",
  } satisfies CSSProperties,
  divider: {
    width: 1,
    height: 18,
    background: "var(--border)",
    margin: "0 2px",
  } satisfies CSSProperties,
  toggleGroup: {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
    color: "var(--text-secondary)",
  } satisfies CSSProperties,
  list: { display: "flex", flexDirection: "column", gap: 12 } satisfies CSSProperties,

  /** Row of severity counters, directly under the verdict banner. */
  countsRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 10,
  } satisfies CSSProperties,
  countPill: (color: string): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 9px",
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color,
    color,
    background: "transparent",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  }),
  countSeparator: { color: "var(--text-muted)", fontSize: 11 } satisfies CSSProperties,

  /** Severity filter buttons, under the counters. */
  filterRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 14,
  } satisfies CSSProperties,
  filterBtn: (active: boolean, color: string, enabled: boolean): CSSProperties => ({
    padding: "4px 10px",
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: active ? color : "var(--border)",
    background: active ? "var(--bg-hover)" : "transparent",
    color: active ? color : enabled ? "var(--text-secondary)" : "var(--text-muted)",
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    cursor: enabled ? "pointer" : "default",
    opacity: enabled ? 1 : 0.55,
  }),
} as const;
