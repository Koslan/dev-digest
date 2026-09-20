import type { SkillSummary } from "@devdigest/shared";

/** One row of the tab: the skill plus whether it is attached to this agent. */
export interface SkillRow {
  skill: SkillSummary;
  /** 1-based position in the prompt, or null when the skill is not attached. */
  position: number | null;
}

/**
 * The link rows as the server returns them, reduced to an ordered id list.
 * The order column IS the prompt order, so it is the only sort that matters.
 */
export function orderedSkillIds(links: { skill_id: string; order: number }[] | undefined): string[] {
  return [...(links ?? [])].sort((a, b) => a.order - b.order).map((l) => l.skill_id);
}

/** Filter by name — the tab lists every skill in the system, so the box is a finder, not a query. */
export function filterByName(skills: SkillSummary[], search: string): SkillSummary[] {
  const needle = search.trim().toLowerCase();
  if (!needle) return skills;
  return skills.filter((skill) => skill.name.toLowerCase().includes(needle));
}

/**
 * Attached skills in prompt order, then everything else alphabetically.
 * `linkedIds` may name a skill that has since been deleted; those are dropped.
 */
export function buildRows(skills: SkillSummary[], linkedIds: string[]): SkillRow[] {
  const byId = new Map(skills.map((skill) => [skill.id, skill]));
  const attached: SkillRow[] = [];
  linkedIds.forEach((id) => {
    const skill = byId.get(id);
    if (skill) attached.push({ skill, position: attached.length + 1 });
  });
  const linked = new Set(linkedIds);
  const rest = skills
    .filter((skill) => !linked.has(skill.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((skill) => ({ skill, position: null }));
  return [...attached, ...rest];
}

/**
 * Move `dragId` to where `targetId` sits. Returns the list unchanged when the
 * drop is a no-op or either id is not attached — reordering only ever applies
 * to the attached list, which is what makes drag&drop meaningful for the prompt.
 */
export function moveSkill(ids: string[], dragId: string, targetId: string): string[] {
  const from = ids.indexOf(dragId);
  const to = ids.indexOf(targetId);
  if (from === -1 || to === -1 || from === to) return ids;
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, dragId);
  return next;
}
