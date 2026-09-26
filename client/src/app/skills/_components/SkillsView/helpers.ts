import type { SkillSummary } from "@devdigest/shared";

/** Filter by name, description or type — one box, the obvious three fields. */
export function filterSkills(skills: SkillSummary[], search: string): SkillSummary[] {
  const needle = search.trim().toLowerCase();
  if (!needle) return skills;
  return skills.filter((skill) =>
    [skill.name, skill.description, skill.type].some((field) =>
      field.toLowerCase().includes(needle),
    ),
  );
}
