import type { Agent } from "@devdigest/shared";

/** Case-insensitive filter over an agent's name + description. Generic so the
    list keeps whatever the API added to the record (e.g. `skill_count`). */
export function filterAgents<T extends Agent>(agents: T[], search: string): T[] {
  const q = search.trim().toLowerCase();
  if (!q) return agents;
  return agents.filter((a) => `${a.name} ${a.description}`.toLowerCase().includes(q));
}
