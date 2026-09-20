import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import * as t from '../../db/schema.js';

/**
 * Skills data access — the ONLY place skill SQL is written.
 *
 * Two tables move together: `skills` holds the live record, `skill_versions`
 * holds every body that was ever live. An edit snapshots the outgoing body
 * before overwriting it, so history is append-only and a restore is just
 * another edit.
 */

export type SkillRow = typeof t.skills.$inferSelect;

export class SkillsRepository {
  constructor(private db: Db) {}

  async list(workspaceId: string): Promise<{ row: SkillRow; agentCount: number }[]> {
    const rows = await this.db
      .select()
      .from(t.skills)
      .where(eq(t.skills.workspaceId, workspaceId))
      .orderBy(asc(t.skills.name));
    const counts = await this.agentCounts(rows.map((r) => r.id));
    return rows.map((row) => ({ row, agentCount: counts.get(row.id) ?? 0 }));
  }

  async get(workspaceId: string, id: string): Promise<SkillRow | undefined> {
    const [row] = await this.db
      .select()
      .from(t.skills)
      .where(and(eq(t.skills.workspaceId, workspaceId), eq(t.skills.id, id)));
    return row;
  }

  /** How many agents link each of these skills. Empty input → empty map. */
  async agentCounts(skillIds: string[]): Promise<Map<string, number>> {
    if (skillIds.length === 0) return new Map();
    const rows = await this.db
      .select({ skillId: t.agentSkills.skillId, count: sql<number>`count(*)::int` })
      .from(t.agentSkills)
      .where(inArray(t.agentSkills.skillId, skillIds))
      .groupBy(t.agentSkills.skillId);
    return new Map(rows.map((r) => [r.skillId, r.count]));
  }

  async create(values: typeof t.skills.$inferInsert): Promise<SkillRow> {
    const [row] = await this.db.insert(t.skills).values(values).returning();
    return row!;
  }

  async update(id: string, values: Partial<typeof t.skills.$inferInsert>): Promise<SkillRow> {
    const [row] = await this.db
      .update(t.skills)
      .set(values)
      .where(eq(t.skills.id, id))
      .returning();
    return row!;
  }

  /** Deleting a skill cascades to its versions and to every agent link. */
  async delete(workspaceId: string, id: string): Promise<boolean> {
    const rows = await this.db
      .delete(t.skills)
      .where(and(eq(t.skills.workspaceId, workspaceId), eq(t.skills.id, id)))
      .returning({ id: t.skills.id });
    return rows.length > 0;
  }

  /** Append a body to the history. Idempotent per (skill, version). */
  async snapshot(skillId: string, version: number, body: string): Promise<void> {
    await this.db
      .insert(t.skillVersions)
      .values({ skillId, version, body })
      .onConflictDoNothing({ target: [t.skillVersions.skillId, t.skillVersions.version] });
  }

  async versions(skillId: string): Promise<(typeof t.skillVersions.$inferSelect)[]> {
    return this.db
      .select()
      .from(t.skillVersions)
      .where(eq(t.skillVersions.skillId, skillId))
      .orderBy(desc(t.skillVersions.version));
  }

  async version(
    skillId: string,
    version: number,
  ): Promise<typeof t.skillVersions.$inferSelect | undefined> {
    const [row] = await this.db
      .select()
      .from(t.skillVersions)
      .where(and(eq(t.skillVersions.skillId, skillId), eq(t.skillVersions.version, version)));
    return row;
  }
}
