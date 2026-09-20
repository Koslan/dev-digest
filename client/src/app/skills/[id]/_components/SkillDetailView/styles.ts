import type { CSSProperties } from "react";

/** Co-located styles for the skill detail page. */
export const s = {
  page: { display: "flex", flexDirection: "column", minHeight: 0 } satisfies CSSProperties,
  header: {
    display: "flex",
    alignItems: "flex-start",
    gap: 16,
    padding: "22px 32px 14px",
  } satisfies CSSProperties,
  headerText: { flex: 1, minWidth: 0 } satisfies CSSProperties,
  h1: { fontSize: 22, fontWeight: 650, color: "var(--text-primary)", margin: 0 } satisfies CSSProperties,
  subtitle: { fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" } satisfies CSSProperties,
  headerMeta: { display: "flex", alignItems: "center", gap: 12 } satisfies CSSProperties,
  version: { fontSize: 12, color: "var(--text-secondary)" } satisfies CSSProperties,
  agents: { fontSize: 12, color: "var(--text-muted)" } satisfies CSSProperties,

  panel: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    margin: "16px 32px 44px",
    padding: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    background: "var(--bg-elevated)",
  } satisfies CSSProperties,
  actions: { display: "flex", justifyContent: "flex-end", gap: 8 } satisfies CSSProperties,
  empty: { fontSize: 13, color: "var(--text-muted)", margin: 0 } satisfies CSSProperties,
} as const;
