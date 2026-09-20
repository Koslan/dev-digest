/**
 * Conventions extraction — scan, judge, and collect into a skill.
 *
 * The contract this pins: which files are shown to the model is decided by
 * code (config files by name + ranked source files), a proposal whose evidence
 * was never sampled is discarded, a rejected candidate survives a rescan, and
 * the accepted ones become one skill named `repo-conventions`.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import { MockGitClient, MockLLMProvider } from '../src/adapters/mocks.js';
import type { RepoIntel } from '../src/modules/repo-intel/types.js';
import * as t from '../src/db/schema.js';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;

const config = () => loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv);

const SAMPLED = 'server/src/modules/agents/routes.ts';

/** Only the one method the conventions scan calls. */
const repoIntel = (paths: string[]) =>
  ({ getConventionSamples: async () => paths }) as unknown as RepoIntel;

const git = () =>
  new MockGitClient({
    files: {
      'package.json': '{ "name": "dev-digest" }',
      'tsconfig.json': '{ "compilerOptions": { "strict": true } }',
      [SAMPLED]: "app.get('/agents', async (req) => service.list(req));",
    },
  });

/** One good proposal, one whose evidence file was never sampled. */
const PROPOSALS = {
  convention_candidates: {
    candidates: [
      {
        category: 'structure',
        rule: 'Route handlers delegate to a service and never query the database',
        evidence_path: SAMPLED,
        evidence_line: 1,
        evidence_snippet: "app.get('/agents', …)",
        confidence: 0.9,
      },
      {
        category: 'naming',
        rule: 'Components are named in PascalCase',
        evidence_path: 'client/src/does-not-exist.tsx',
        evidence_line: 3,
        evidence_snippet: 'export function Thing() {}',
        confidence: 0.95,
      },
    ],
  },
};

d('conventions module (Testcontainers pg)', () => {
  let pg: PgFixture;
  let workspaceId: string;
  let repoSeq = 0;

  beforeAll(async () => {
    pg = await startPg();
    await seed(pg.handle.db);
    const [ws] = await pg.handle.db.select().from(t.workspaces);
    workspaceId = ws!.id;
  });
  afterAll(async () => {
    await pg?.stop();
  });

  const makeRepo = async () => {
    const name = `conv-${repoSeq++}`;
    const [repo] = await pg.handle.db
      .insert(t.repos)
      .values({ workspaceId, owner: 'acme', name, fullName: `acme/${name}` })
      .returning();
    return repo!;
  };

  const app = (llm = new MockLLMProvider('openai', { structuredBySchema: PROPOSALS })) =>
    buildApp({
      config: config(),
      db: pg.handle.db,
      overrides: {
        git: git(),
        repoIntel: repoIntel([SAMPLED]),
        llm: { openai: llm, anthropic: llm, openrouter: llm },
      },
    });

  it('samples config + ranked files itself and keeps only grounded candidates', async () => {
    const llm = new MockLLMProvider('openai', { structuredBySchema: PROPOSALS });
    const api = await app(llm);
    const repo = await makeRepo();

    const res = await api.inject({
      method: 'POST',
      url: `/repos/${repo.id}/conventions/extract`,
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    // The sample was chosen without the model: exactly one structured call.
    expect(llm.calls.filter((c) => c.method === 'completeStructured')).toHaveLength(1);
    expect(body.sampled_files).toEqual([SAMPLED]);
    expect(body.config_files).toContain('package.json');

    // The proposal pointing at a file nobody sampled is dropped, not stored.
    expect(body.candidates).toHaveLength(1);
    expect(body.candidates[0].rule).toContain('Route handlers delegate');
    expect(body.candidates[0].status).toBe('pending');

    const rows = await pg.handle.db
      .select()
      .from(t.conventions)
      .where(eq(t.conventions.repoId, repo.id));
    expect(rows).toHaveLength(1);

    await api.close();
  });

  it('keeps a rejected candidate rejected across a rescan', async () => {
    const api = await app();
    const repo = await makeRepo();

    const first = (
      await api.inject({
        method: 'POST',
        url: `/repos/${repo.id}/conventions/extract`,
        payload: {},
      })
    ).json();
    const candidateId = first.candidates[0].id;

    const rejected = await api.inject({
      method: 'PATCH',
      url: `/conventions/${candidateId}`,
      payload: { status: 'rejected' },
    });
    expect(rejected.json().status).toBe('rejected');

    const second = (
      await api.inject({
        method: 'POST',
        url: `/repos/${repo.id}/conventions/extract`,
        payload: {},
      })
    ).json();
    // Same row, still rejected — and the rule was not proposed a second time.
    expect(second.candidates).toHaveLength(1);
    expect(second.candidates[0].id).toBe(candidateId);
    expect(second.candidates[0].status).toBe('rejected');

    // It also survives a reload: the list route reads the same row.
    const listed = (await api.inject({ url: `/repos/${repo.id}/conventions` })).json();
    expect(listed).toHaveLength(1);
    expect(listed[0].status).toBe('rejected');

    await api.close();
  });

  it('re-proposes an untouched pending candidate instead of emptying the list', async () => {
    const api = await app();
    const repo = await makeRepo();

    const first = (
      await api.inject({
        method: 'POST',
        url: `/repos/${repo.id}/conventions/extract`,
        payload: {},
      })
    ).json();
    expect(first.candidates).toHaveLength(1);

    // Nothing was judged, so the rescan replaces the pending row with the same
    // proposal — deduping against a row that is about to be deleted would leave
    // the page empty, which is the failure this pins.
    const second = (
      await api.inject({
        method: 'POST',
        url: `/repos/${repo.id}/conventions/extract`,
        payload: {},
      })
    ).json();
    expect(second.candidates).toHaveLength(1);
    expect(second.candidates[0].id).not.toBe(first.candidates[0].id);

    await api.close();
  });

  it('collects accepted candidates into one repo-conventions skill linked to an agent', async () => {
    const api = await app();
    const repo = await makeRepo();
    const [agent] = await pg.handle.db.select().from(t.agents).limit(1);

    const scanned = (
      await api.inject({
        method: 'POST',
        url: `/repos/${repo.id}/conventions/extract`,
        payload: {},
      })
    ).json();
    const candidateId = scanned.candidates[0].id;

    // Nothing accepted yet → the skill cannot be created.
    const tooEarly = await api.inject({
      method: 'POST',
      url: `/repos/${repo.id}/conventions/skill`,
      payload: { name: 'repo-conventions', description: 'x', body: 'y' },
    });
    expect(tooEarly.statusCode).toBe(422);

    await api.inject({
      method: 'PATCH',
      url: `/conventions/${candidateId}`,
      payload: { status: 'accepted' },
    });

    // The draft body is assembled from the accepted rows, evidence included.
    const draft = (await api.inject({ url: `/repos/${repo.id}/conventions/draft` })).json();
    expect(draft.body).toContain('Route handlers delegate');
    expect(draft.body).toContain(SAMPLED);

    const created = await api.inject({
      method: 'POST',
      url: `/repos/${repo.id}/conventions/skill`,
      payload: {
        name: 'repo-conventions',
        description: 'Conventions extracted from the repo.',
        body: draft.body,
        agent_id: agent!.id,
      },
    });
    expect(created.statusCode).toBe(201);
    const skill = created.json();
    expect(skill.name).toBe('repo-conventions');
    // Provenance: this body came out of the repo, not off somebody's keyboard.
    expect(skill.source).toBe('extracted');
    expect(skill.type).toBe('convention');

    const links = (await api.inject({ url: `/agents/${agent!.id}/skills` })).json();
    expect(links.map((l: { skill_id: string }) => l.skill_id)).toContain(skill.id);

    // It shows up in the library the Skills page reads.
    const skills = (await api.inject({ url: '/skills' })).json();
    expect(skills.map((s: { id: string }) => s.id)).toContain(skill.id);

    await api.close();
  });
});
