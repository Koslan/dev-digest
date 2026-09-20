import type { SkillType } from "@devdigest/shared";

/** Skill type → colour token. Types are rubrics, not severities: no red. */
export const TYPE_TONE: Record<SkillType, string> = {
  rubric: "var(--accent)",
  convention: "var(--info)",
  security: "var(--warn)",
  custom: "var(--text-muted)",
};
