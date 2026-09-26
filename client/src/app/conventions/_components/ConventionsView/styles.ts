import type { CSSProperties } from "react";

/** Co-located styles for the Conventions page. */
export const s = {
  page: { padding: 28, maxWidth: 1100 } satisfies CSSProperties,
  header: { display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 } satisfies CSSProperties,
  headerText: { flex: 1, minWidth: 0 } satisfies CSSProperties,
  h1: { fontSize: 20, fontWeight: 700 } satisfies CSSProperties,
  subtitle: {
    fontSize: 13,
    color: "var(--text-muted)",
    marginTop: 4,
    lineHeight: 1.5,
  } satisfies CSSProperties,
  actions: { display: "flex", alignItems: "center", gap: 8 } satisfies CSSProperties,
  summary: {
    fontSize: 12,
    color: "var(--text-muted)",
    marginBottom: 14,
  } satisfies CSSProperties,
  countRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 12,
    color: "var(--text-secondary)",
    marginBottom: 10,
  } satisfies CSSProperties,
  list: { display: "flex", flexDirection: "column", gap: 10 } satisfies CSSProperties,
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "var(--text-muted)",
    margin: "22px 0 8px",
  } satisfies CSSProperties,
  rejectedBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 22,
    fontSize: 12,
    color: "var(--text-muted)",
  } satisfies CSSProperties,
} as const;
