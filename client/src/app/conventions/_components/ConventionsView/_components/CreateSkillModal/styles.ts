import type { CSSProperties } from "react";

/** Co-located styles for the create-skill modal. */
export const s = {
  body: { padding: "18px 24px", display: "flex", flexDirection: "column" } satisfies CSSProperties,
  intro: {
    fontSize: 13,
    lineHeight: 1.55,
    color: "var(--text-secondary)",
    margin: "0 0 16px",
  } satisfies CSSProperties,
  footer: { display: "flex", justifyContent: "flex-end", gap: 10 } satisfies CSSProperties,
} as const;
