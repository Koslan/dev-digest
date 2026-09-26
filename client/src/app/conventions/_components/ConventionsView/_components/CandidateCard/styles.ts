import type { CSSProperties } from "react";

/** Co-located styles for one convention candidate card. */
export const s = {
  card: (status: string): CSSProperties => ({
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: status === "accepted" ? "var(--ok)" : "var(--border)",
    background: "var(--bg-surface)",
    opacity: status === "rejected" ? 0.6 : 1,
  }),
  head: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 } satisfies CSSProperties,
  rule: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text-primary)",
    lineHeight: 1.45,
  } satisfies CSSProperties,
  confidence: (tone: string): CSSProperties => ({
    marginLeft: "auto",
    fontSize: 12,
    fontWeight: 600,
    color: tone,
    whiteSpace: "nowrap",
  }),
  meter: { width: 64, height: 4, borderRadius: 99, background: "var(--border)" } satisfies CSSProperties,
  meterFill: (percent: number, tone: string): CSSProperties => ({
    width: `${percent}%`,
    height: "100%",
    borderRadius: 99,
    background: tone,
  }),
  evidence: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "var(--text-secondary)",
    marginTop: 8,
  } satisfies CSSProperties,
  snippet: {
    marginTop: 6,
    padding: "8px 10px",
    borderRadius: 6,
    background: "var(--bg-base)",
    fontSize: 12,
    lineHeight: 1.5,
    color: "var(--text-secondary)",
    whiteSpace: "pre-wrap",
    overflowX: "auto",
  } satisfies CSSProperties,
  footer: { display: "flex", alignItems: "center", gap: 8, marginTop: 12 } satisfies CSSProperties,
  editRow: { display: "flex", flexDirection: "column", gap: 10 } satisfies CSSProperties,
  editLabel: { fontSize: 11, fontWeight: 600, color: "var(--text-muted)" } satisfies CSSProperties,
} as const;
