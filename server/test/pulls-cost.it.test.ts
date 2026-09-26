/**
 * PR list COST column — the list aggregates run cost per PR.
 *
 * Contract pinned here (see ../specs/review-flow.md §8):
 *  - the value is the SUM over successful runs (status='done');
 *  - failed and cancelled runs never count, however expensive they were;
 *  - runs that reported no cost contribute nothing;
 *  - a PR with no successful run is null — the UI renders empty, never $0.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import * as t from '../src/db/schema.js';
import type { PrMeta, SecretsProvider } from '@devdigest/shared';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;

const config = () => loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv);

/** No secrets → no GitHub client → the route serves persisted PRs only. */
const noSecrets: SecretsProvider = { get: async () => undefined };

d('PR list cost aggregation (Testcontainers pg)', () => {
  let pg: PgFixture;
  let workspaceId: string;

  beforeAll(async () => {
    pg = await startPg();
    await seed(pg.handle.db);
    const [ws] = await pg.handle.db.select().from(t.workspaces);
    workspaceId = ws!.id;
  });
  afterAll(async () => {
    await pg?.stop();
  });

  async function setup(prNumbers: number[]) {
    const name = `cost-repo-${Date.now()}`;
    const [repo] = await pg.handle.db
      .insert(t.repos)
      .values({ workspaceId, owner: 'acme', name, fullName: `acme/${name}` })
      .returning();
    const prs = [];
    for (const number of prNumbers) {
      const [pr] = await pg.handle.db
        .insert(t.pullRequests)
        .values({
          workspaceId,
          repoId: repo!.id,
          number,
          title: `PR ${number}`,
          author: 'marisa.koch',
          branch: `feat/${number}`,
          base: 'main',
          headSha: `sha-${number}`,
          additions: 1,
          deletions: 0,
          filesCount: 1,
          status: 'needs_review',
        })
        .returning();
      prs.push(pr!);
    }
    return { repo: repo!, prs };
  }

  function run(prId: string, status: string, costUsd: number | null) {
    return pg.handle.db.insert(t.agentRuns).values({
      workspaceId,
      agentId: null,
      prId,
      provider: 'openrouter',
      model: 'deepseek/deepseek-v4-flash',
      status,
      costUsd,
    });
  }

  async function listPulls(repoId: string): Promise<PrMeta[]> {
    const app = await buildApp({
      config: config(),
      db: pg.handle.db,
      overrides: { secrets: noSecrets },
    });
    const res = await app.inject({ method: 'GET', url: `/repos/${repoId}/pulls` });
    expect(res.statusCode).toBe(200);
    await app.close();
    return res.json();
  }

  it('sums successful runs, ignores failed/cancelled and unpriced ones', async () => {
    const { repo, prs } = await setup([101, 102, 103]);
    const [summed, onlyFailed, untouched] = prs;

    await run(summed!.id, 'done', 0.01);
    await run(summed!.id, 'done', 0.0234);
    await run(summed!.id, 'done', null); // provider reported nothing → contributes 0
    await run(summed!.id, 'failed', 5); // never counted, however expensive
    await run(summed!.id, 'cancelled', 7);

    await run(onlyFailed!.id, 'failed', 3);
    await run(onlyFailed!.id, 'cancelled', 2);

    const rows = await listPulls(repo.id);
    const byNumber = new Map(rows.map((r) => [r.number, r]));

    expect(byNumber.get(101)!.cost_usd).toBeCloseTo(0.0334, 6);
    // Only unsuccessful runs → nothing to report. Null, not zero.
    expect(byNumber.get(102)!.cost_usd).toBeNull();
    // No runs at all → same.
    expect(byNumber.get(untouched!.number)!.cost_usd).toBeNull();
  });

  it('reports null while every successful run has an unknown cost', async () => {
    const { repo, prs } = await setup([201]);
    await run(prs[0]!.id, 'done', null);

    const rows = await listPulls(repo.id);
    expect(rows[0]!.cost_usd).toBeNull();
  });
});
