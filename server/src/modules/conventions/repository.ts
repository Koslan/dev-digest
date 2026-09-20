import { and, asc, desc, eq, inArray, ne, or } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import * as t from '../../db/schema.js';
import type { ConventionRow } from '../../db/rows.js';
import type { ConventionProposal, ConventionStatus } from '@devdigest/shared';

export type { ConventionRow };

/**
 * Conventions data access. Every query is scoped to the workspace AND the repo:
 * a candidate belongs to one repository, and a rule extracted from one codebase
 * says nothing about another.
 */
export class ConventionsRepository {
  constructor(private db: Db) {}

  /** The repo row, or undefined when it is not in this workspace. */
  async getRepo(
    workspaceId: string,
    repoId: string,
  ): Promise<typeof t.repos.$inferSelect | undefined> {
    const [row] = await this.db
      .select()
      .from(t.repos)
      .where(and(eq(t.repos.workspaceId, workspaceId), eq(t.repos.id, repoId)));
    return row;
  }

  /** Candidates for one repo: pending first, then accepted, rejected last. */
  async list(workspaceId: string, repoId: string): Promise<ConventionRow[]> {
    return this.db
      .select()
      .from(t.conventions)
      .where(and(eq(t.conventions.workspaceId, workspaceId), eq(t.conventions.repoId, repoId)))
      .orderBy(desc(t.conventions.confidence), asc(t.conventions.createdAt));
  }

  async get(workspaceId: string, id: string): Promise<ConventionRow | undefined> {
    const [row] = await this.db
      .select()
      .from(t.conventions)
      .where(and(eq(t.conventions.workspaceId, workspaceId), eq(t.conventions.id, id)));
    return row;
  }

  async insertMany(
    workspaceId: string,
    repoId: string,
    proposals: ConventionProposal[],
  ): Promise<ConventionRow[]> {
    if (proposals.length === 0) return [];
    return this.db
      .insert(t.conventions)
      .values(
        proposals.map((p) => ({
          workspaceId,
          repoId,
          category: p.category,
          rule: p.rule,
          evidencePath: p.evidence_path,
          evidenceLine: p.evidence_line ?? null,
          evidenceSnippet: p.evidence_snippet,
          confidence: p.confidence,
        })),
      )
      .returning();
  }

  async update(
    workspaceId: string,
    id: string,
    patch: { rule?: string; category?: string; status?: ConventionStatus; edited?: boolean },
  ): Promise<ConventionRow | undefined> {
    const [row] = await this.db
      .update(t.conventions)
      .set({
        ...(patch.rule !== undefined ? { rule: patch.rule } : {}),
        ...(patch.category !== undefined ? { category: patch.category } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.edited !== undefined ? { edited: patch.edited } : {}),
      })
      .where(and(eq(t.conventions.workspaceId, workspaceId), eq(t.conventions.id, id)))
      .returning();
    return row;
  }

  /**
   * Clear the candidates a rescan is allowed to replace: the untouched
   * `pending` ones. Accepted, rejected and hand-edited rows survive, which is
   * what makes a rejection stick across a ReScan.
   */
  async deleteReplaceable(workspaceId: string, repoId: string): Promise<void> {
    await this.db
      .delete(t.conventions)
      .where(
        and(
          eq(t.conventions.workspaceId, workspaceId),
          eq(t.conventions.repoId, repoId),
          eq(t.conventions.status, 'pending'),
          eq(t.conventions.edited, false),
        ),
      );
  }

  /**
   * Rules a rescan must not propose again: the ones a human has ruled on or
   * edited. Untouched pending rules are deliberately NOT in this set — they are
   * about to be replaced by this scan, so deduping against them would delete
   * the old row and drop the new proposal, leaving the page empty.
   */
  async persistentRules(workspaceId: string, repoId: string): Promise<string[]> {
    const rows = await this.db
      .select({ rule: t.conventions.rule })
      .from(t.conventions)
      .where(
        and(
          eq(t.conventions.workspaceId, workspaceId),
          eq(t.conventions.repoId, repoId),
          or(ne(t.conventions.status, 'pending'), eq(t.conventions.edited, true)),
        ),
      );
    return rows.map((r) => r.rule);
  }

  /** The skill this workspace already generated from conventions, if any. */
  async findSkillByName(
    workspaceId: string,
    name: string,
  ): Promise<typeof t.skills.$inferSelect | undefined> {
    const [row] = await this.db
      .select()
      .from(t.skills)
      .where(and(eq(t.skills.workspaceId, workspaceId), eq(t.skills.name, name)));
    return row;
  }

  /** Accepted candidates, oldest first, for assembling the skill body. */
  async listAccepted(workspaceId: string, repoId: string): Promise<ConventionRow[]> {
    return this.db
      .select()
      .from(t.conventions)
      .where(
        and(
          eq(t.conventions.workspaceId, workspaceId),
          eq(t.conventions.repoId, repoId),
          eq(t.conventions.status, 'accepted'),
        ),
      )
      .orderBy(asc(t.conventions.category), asc(t.conventions.createdAt));
  }

  /** Agents in this workspace whose ids are in `ids` — used to validate a link. */
  async agentsIn(workspaceId: string, ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await this.db
      .select({ id: t.agents.id })
      .from(t.agents)
      .where(and(eq(t.agents.workspaceId, workspaceId), inArray(t.agents.id, ids)));
    return rows.map((r) => r.id);
  }
}
