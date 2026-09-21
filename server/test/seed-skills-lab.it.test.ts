/**
 * Seed — the Skills Lab control experiment reproduces from a fresh database.
 *
 * The contract this pins: both experiment agents exist after `seed()`, every
 * rubric in docs/skills becomes an imported skill with version 1 in history,
 * nothing is linked (the first run is the one WITHOUT the skill), and seeding
 * twice creates nothing new.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { and, eq, inArray } from 'drizzle-orm';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { seed } from '../src/db/seed.js';
import * as t from '../src/db/schema.js';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;

const DOCS = fileURLToPath(new URL('../../docs/skills/', import.meta.url));
const rubricCount = (dir: string) =>
  readdirSync(`${DOCS}${dir}`).filter((f) => f.endsWith('.md')).length;

d('seed — Skills Lab (Testcontainers pg)', () => {
  let pg: PgFixture;
  let workspaceId: string;

  beforeAll(async () => {
    pg = await startPg();
    ({ workspaceId } = await seed(pg.handle.db));
  });
  afterAll(async () => {
    await pg?.stop();
  });

  it('seeds both experiment agents with a neutral prompt and no skills linked', async () => {
    const agents = await pg.handle.db
      .select()
      .from(t.agents)
      .where(
        and(
          eq(t.agents.workspaceId, workspaceId),
          inArray(t.agents.name, ['Test Quality Reviewer', 'API Contract Reviewer']),
        ),
      );
    expect(agents.map((a) => a.name).sort()).toEqual(['API Contract Reviewer', 'Test Quality Reviewer']);
    // The prompt must not already ask for what the skill teaches.
    for (const a of agents) expect(a.systemPrompt).not.toMatch(/breaking|untested|coverage/i);

    const links = await pg.handle.db
      .select()
      .from(t.agentSkills)
      .where(inArray(t.agentSkills.agentId, agents.map((a) => a.id)));
    expect(links).toHaveLength(0);
  });

  it('turns every rubric file into an imported skill with version 1 in history', async () => {
    const expected = rubricCount('test-quality-reviewer') + rubricCount('api-contract-reviewer');
    const skills = await pg.handle.db
      .select()
      .from(t.skills)
      .where(and(eq(t.skills.workspaceId, workspaceId), eq(t.skills.source, 'imported')));
    expect(skills).toHaveLength(expected);
    expect(skills.map((s) => s.name)).toEqual(
      expect.arrayContaining(['API breaking change', 'Test coverage depth', 'Excessive mocking', 'Flaky tests']),
    );

    const versions = await pg.handle.db
      .select()
      .from(t.skillVersions)
      .where(inArray(t.skillVersions.skillId, skills.map((s) => s.id)));
    expect(versions).toHaveLength(expected);
  });

  it('is idempotent — a second seed adds no agents and no skills', async () => {
    const count = async () => ({
      agents: (await pg.handle.db.select().from(t.agents).where(eq(t.agents.workspaceId, workspaceId))).length,
      skills: (await pg.handle.db.select().from(t.skills).where(eq(t.skills.workspaceId, workspaceId))).length,
    });
    const before = await count();
    await seed(pg.handle.db);
    expect(await count()).toEqual(before);
  });
});
