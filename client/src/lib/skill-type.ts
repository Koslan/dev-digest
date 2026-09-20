import type { SkillType } from "@devdigest/shared";

/**
 * Skill type → colour token. Types are rubrics, not severities: no red.
 * Shared by the Skills library and the agent's Skills tab so one skill wears
 * the same colour wherever it is listed.
 */
export const TYPE_TONE: Record<SkillType, string> = {
  rubric: "var(--accent)",
  convention: "var(--info)",
  security: "var(--warn)",
  custom: "var(--text-muted)",
};
