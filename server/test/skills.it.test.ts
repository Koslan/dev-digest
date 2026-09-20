/**
 * Skills CRUD + versioning against a real Postgres.
 *
 * The contract this pins: the database is the source of truth (a skill created
 * through the API is a row, a row deleted in the database is gone from the
 * API), and no edit can lose a body that was ever live.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import * as t from '../src/db/schema.js';
import type { SecretsProvider } from '@devdigest/shared';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;

const config = () => loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv);
const noSecrets: SecretsProvider = { get: async () => undefined };

d('skills module (Testcontainers pg)', () => {
  let pg: PgFixture;

  beforeAll(async () => {
    pg = await startPg();
    await seed(pg.handle.db);
  });
  afterAll(async () => {
    await pg?.stop();
  });

  const app = () =>
    buildApp({ config: config(), db: pg.handle.db, overrides: { secrets: noSecrets } });

  it('creates a skill through the API and writes it to the database', async () => {
    const api = await app();
    const created = await api.inject({
      method: 'POST',
      url: '/skills',
      payload: {
        name: 'test-quality-branches',
        description: 'ALWAYS invoke when reviewing tests.',
        type: 'rubric',
        body: '# Branch coverage\n\nEvery new branch needs a test.',
      },
    });
    expect(created.statusCode).toBe(201);
    const skill = created.json();
    expect(skill.version).toBe(1);
    expect(skill.source).toBe('manual');

    // Straight to the table: the API is not the source of truth, the row is.
    const [row] = await pg.handle.db.select().from(t.skills).where(eq(t.skills.id, skill.id));
    expect(row!.name).toBe('test-quality-branches');
    expect(row!.body).toContain('Every new branch needs a test.');

    await api.close();
  });

  it('stops listing a skill that was deleted straight from the database', async () => {
    const api = await app();
    const skill = (
      await api.inject({
        method: 'POST',
        url: '/skills',
        payload: { name: 'doomed', description: 'x', type: 'custom', body: 'body' },
      })
    ).json();

    expect((await api.inject({ url: '/skills' })).json().map((s: { id: string }) => s.id)).toContain(
      skill.id,
    );

    await pg.handle.db.delete(t.skills).where(eq(t.skills.id, skill.id));

    const after = (await api.inject({ url: '/skills' })).json();
    expect(after.map((s: { id: string }) => s.id)).not.toContain(skill.id);
    expect((await api.inject({ url: `/skills/${skill.id}` })).statusCode).toBe(404);

    await api.close();
  });

  it('versions the body on edit and restores a past version without losing history', async () => {
    const api = await app();
    const skill = (
      await api.inject({
        method: 'POST',
        url: '/skills',
        payload: { name: 'versioned', description: 'x', type: 'custom', body: 'v1 body' },
      })
    ).json();

    const edited = (
      await api.inject({ method: 'PUT', url: `/skills/${skill.id}`, payload: { body: 'v2 body' } })
    ).json();
    expect(edited.version).toBe(2);

    const versions = (await api.inject({ url: `/skills/${skill.id}/versions` })).json();
    expect(versions.map((v: { version: number }) => v.version)).toEqual([2, 1]);
    expect(versions.find((v: { version: number }) => v.version === 1).body).toBe('v1 body');
    expect(versions.find((v: { current: boolean }) => v.current).version).toBe(2);

    // Restoring is a forward edit: the body comes back, the history grows.
    const restored = (
      await api.inject({
        method: 'POST',
        url: `/skills/${skill.id}/restore`,
        payload: { version: 1 },
      })
    ).json();
    expect(restored.body).toBe('v1 body');
    expect(restored.version).toBe(3);

    const after = (await api.inject({ url: `/skills/${skill.id}/versions` })).json();
    expect(after.map((v: { version: number }) => v.version)).toEqual([3, 2, 1]);

    // Editing metadata only must NOT create a version.
    const renamed = (
      await api.inject({
        method: 'PUT',
        url: `/skills/${skill.id}`,
        payload: { name: 'renamed' },
      })
    ).json();
    expect(renamed.version).toBe(3);

    await api.close();
  });

  it('counts how many agents link a skill', async () => {
    const api = await app();
    const skill = (
      await api.inject({
        method: 'POST',
        url: '/skills',
        payload: { name: 'linked', description: 'x', type: 'custom', body: 'body' },
      })
    ).json();
    const agent = (
      await api.inject({
        method: 'POST',
        url: '/agents',
        payload: {
          name: 'Skill User',
          provider: 'openai',
          model: 'gpt-4.1',
          system_prompt: 'review',
        },
      })
    ).json();

    await api.inject({
      method: 'POST',
      url: `/agents/${agent.id}/skills`,
      payload: { skill_ids: [skill.id] },
    });

    const listed = (await api.inject({ url: '/skills' })).json();
    expect(listed.find((s: { id: string }) => s.id === skill.id).agent_count).toBe(1);

    await api.close();
  });

  it('saves an imported skill with source=imported', async () => {
    const api = await app();
    const file = Buffer.from(
      '---\nname: imported-rules\ndescription: Imported.\ntype: convention\n---\n\n# Rules\n',
      'utf8',
    ).toString('base64');

    const preview = (
      await api.inject({
        method: 'POST',
        url: '/skills/import/preview',
        payload: { filename: 'SKILL.md', content_base64: file },
      })
    ).json();
    expect(preview.name).toBe('imported-rules');

    const saved = (
      await api.inject({
        method: 'POST',
        url: '/skills?source=imported',
        payload: {
          name: preview.name,
          description: preview.description,
          type: preview.type,
          body: preview.body,
        },
      })
    ).json();
    expect(saved.source).toBe('imported');

    await api.close();
  });
});
