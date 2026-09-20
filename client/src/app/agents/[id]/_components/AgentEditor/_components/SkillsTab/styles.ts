import type { CSSProperties } from "react";

/** Co-located styles for the agent's Skills tab. */
export const s = {
  wrap: { maxWidth: 860 } satisfies CSSProperties,
  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 6 } satisfies CSSProperties,
  h2: { fontSize: 18, fontWeight: 700 } satisfies CSSProperties,
  count: { fontSize: 13, color: "var(--text-secondary)" } satisfies CSSProperties,
  search: {
    marginLeft: "auto",
    position: "relative",
    display: "flex",
    alignItems: "center",
  } satisfies CSSProperties,
  searchIcon: {
    position: "absolute",
    left: 9,
    color: "var(--text-muted)",
    pointerEvents: "none",
  } satisfies CSSProperties,
  searchInput: {
    width: 220,
    padding: "6px 10px 6px 26px",
    fontSize: 13,
    color: "var(--text-primary)",
    background: "var(--bg-base)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: 6,
    outline: "none",
  } satisfies CSSProperties,
  hint: { fontSize: 12, color: "var(--text-muted)", marginBottom: 16 } satisfies CSSProperties,
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "var(--text-muted)",
    margin: "18px 0 8px",
  } satisfies CSSProperties,
  list: { display: "flex", flexDirection: "column", gap: 8 } satisfies CSSProperties,
  /** A row lifts while dragged and shows an accent edge when it is the drop target. */
  row: (attached: boolean, dragging: boolean, over: boolean) =>
    ({
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 12px",
      background: "var(--bg-surface)",
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: over ? "var(--accent)" : "var(--border)",
      borderRadius: 8,
      opacity: dragging ? 0.45 : attached ? 1 : 0.75,
    }) satisfies CSSProperties,
  handle: (draggable: boolean) =>
    ({
      display: "inline-flex",
      alignItems: "center",
      color: draggable ? "var(--text-secondary)" : "var(--border)",
      cursor: draggable ? "grab" : "default",
    }) satisfies CSSProperties,
  position: {
    width: 22,
    fontSize: 12,
    textAlign: "right",
    color: "var(--text-muted)",
  } satisfies CSSProperties,
  main: { flex: 1, minWidth: 0 } satisfies CSSProperties,
  nameRow: { display: "flex", alignItems: "center", gap: 8 } satisfies CSSProperties,
  name: { fontSize: 13, fontWeight: 600, color: "var(--text-primary)" } satisfies CSSProperties,
  description: {
    fontSize: 12,
    color: "var(--text-muted)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } satisfies CSSProperties,
  toggleCell: { display: "flex", alignItems: "center", gap: 8 } satisfies CSSProperties,
  toggleLabel: { fontSize: 12, color: "var(--text-muted)", width: 56 } satisfies CSSProperties,
} as const;
