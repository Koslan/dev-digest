/**
 * PR list FINDINGS summary — what the list page's findings column and its
 * hover popover are built from.
 *
 * Contract pinned here (see ../../client/specs/pages.md):
 *  - the summary describes the LATEST review of the PR, not all of them;
 *  - `total` counts every finding of that review, `items` is capped;
 *  - previews are ordered worst-severity first, so a capped list still leads
 *    with what matters;
 *  - a PR that has never been reviewed reports null.
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
const noSecrets: SecretsProvider = { get: async () => undefined };

d('PR list findings summary (Testcontainers pg)', () => {
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

  async function setupPr(number: number) {
    const name = `findings-repo-${number}-${Date.now()}`;
    const [repo] = await pg.handle.db
      .insert(t.repos)
      .values({ workspaceId, owner: 'acme', name, fullName: `acme/${name}` })
      .returning();
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
    return { repo: repo!, pr: pr! };
  }

  async function addReview(prId: string, createdAt: Date, severities: string[]) {
    const [review] = await pg.handle.db
      .insert(t.reviews)
      .values({
        workspaceId,
        prId,
        kind: 'review',
        verdict: 'request_changes',
        summary: 'summary',
        score: 61,
        model: 'deepseek/deepseek-v4-flash',
        createdAt,
      })
      .returning();
    if (severities.length > 0) {
      await pg.handle.db.insert(t.findings).values(
        severities.map((severity, i) => ({
          reviewId: review!.id,
          file: `src/file-${i}.ts`,
          startLine: i + 1,
          endLine: i + 1,
          severity,
          category: 'bug',
          title: `${severity} finding ${i}`,
          rationale: 'x'.repeat(400),
          confidence: 0.9,
        })),
      );
    }
    return review!;
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

  it('summarises the latest review only, worst severity first, with a truncated rationale', async () => {
    const { repo, pr } = await setupPr(301);
    await addReview(pr.id, new Date('2026-09-01T10:00:00Z'), ['CRITICAL', 'CRITICAL']);
    await addReview(pr.id, new Date('2026-09-02T10:00:00Z'), [
      'SUGGESTION',
      'CRITICAL',
      'WARNING',
    ]);

    const [row] = await listPulls(repo.id);
    expect(row!.findings!.total).toBe(3); // the newer review, not the older one
    expect(row!.findings!.items.map((f) => f.severity)).toEqual([
      'CRITICAL',
      'WARNING',
      'SUGGESTION',
    ]);
    // The popover is a teaser: the full rationale stays on the PR page.
    expect(row!.findings!.items[0]!.rationale.length).toBeLessThanOrEqual(160);
    expect(row!.findings!.items[0]!.rationale.endsWith('…')).toBe(true);
  });

  it('caps the previews while still reporting the true total', async () => {
    const { repo, pr } = await setupPr(302);
    await addReview(pr.id, new Date('2026-09-02T10:00:00Z'), Array(12).fill('WARNING'));

    const [row] = await listPulls(repo.id);
    expect(row!.findings!.total).toBe(12);
    expect(row!.findings!.items).toHaveLength(8);
  });

  it('reports null for a PR that was never reviewed', async () => {
    const { repo } = await setupPr(303);
    const [row] = await listPulls(repo.id);
    expect(row!.findings ?? null).toBeNull();
  });

  it('reports an empty summary for a review that found nothing', async () => {
    const { repo, pr } = await setupPr(304);
    await addReview(pr.id, new Date('2026-09-02T10:00:00Z'), []);

    const [row] = await listPulls(repo.id);
    expect(row!.findings!.total).toBe(0);
    expect(row!.findings!.items).toEqual([]);
  });
});
