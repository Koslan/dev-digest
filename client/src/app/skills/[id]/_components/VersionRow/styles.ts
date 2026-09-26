import type { CSSProperties } from "react";
import type { DiffLine } from "./helpers";

/** Co-located styles for one version row. */
export const s = {
  row: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: "var(--border)",
  } satisfies CSSProperties,
  head: { display: "flex", alignItems: "center", gap: 10 } satisfies CSSProperties,
  version: { fontSize: 13, fontWeight: 600, color: "var(--text-primary)" } satisfies CSSProperties,
  date: { fontSize: 11.5, color: "var(--text-muted)" } satisfies CSSProperties,
  diff: {
    margin: 0,
    maxHeight: 320,
    overflowY: "auto",
    padding: 10,
    borderRadius: 8,
    background: "var(--bg-surface)",
    fontSize: 11.5,
    lineHeight: 1.5,
  } satisfies CSSProperties,
  diffLine: (kind: DiffLine["kind"]): CSSProperties => ({
    color:
      kind === "added"
        ? "var(--code-add-text)"
        : kind === "removed"
          ? "var(--code-del-text)"
          : "var(--text-muted)",
    background:
      kind === "added" ? "var(--code-add)" : kind === "removed" ? "var(--code-del)" : "transparent",
    whiteSpace: "pre-wrap",
  }),
} as const;
