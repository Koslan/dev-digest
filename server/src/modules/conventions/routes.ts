import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { ConventionPatch, CreateConventionSkillBody } from '@devdigest/shared';
import { getContext } from '../_shared/context.js';
import { IdParams } from '../_shared/schemas.js';
import { NotFoundError } from '../../platform/errors.js';
import { ConventionsService } from './service.js';

/**
 * conventions module — extracting the rules a repo already follows.
 *   GET    /repos/:id/conventions          → stored candidates (survive a reload)
 *   POST   /repos/:id/conventions/extract  → Run Scan / ReScan
 *   PATCH  /conventions/:id                → Accept / Reject / inline Edit
 *   GET    /repos/:id/conventions/draft    → the skill body the modal opens with
 *   POST   /repos/:id/conventions/skill    → accepted candidates → one skill
 *
 * The candidates are persisted, not held in memory: a rejection has to survive
 * a page reload, which is the whole point of the Reject button.
 */
export default async function conventionsRoutes(appBase: FastifyInstance) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  const { container } = app;
  const service = new ConventionsService(container);

  app.get('/repos/:id/conventions', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(container, req);
    return service.list(workspaceId, req.params.id);
  });

  app.post('/repos/:id/conventions/extract', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(container, req);
    return service.scan(workspaceId, req.params.id);
  });

  app.patch(
    '/conventions/:id',
    { schema: { params: IdParams, body: ConventionPatch } },
    async (req) => {
      const { workspaceId } = await getContext(container, req);
      const record = await service.patch(workspaceId, req.params.id, req.body);
      if (!record) throw new NotFoundError('Convention candidate not found');
      return record;
    },
  );

  app.get('/repos/:id/conventions/draft', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(container, req);
    return { body: await service.draftSkillBody(workspaceId, req.params.id) };
  });

  app.post(
    '/repos/:id/conventions/skill',
    { schema: { params: IdParams, body: CreateConventionSkillBody } },
    async (req, reply) => {
      const { workspaceId } = await getContext(container, req);
      const skill = await service.createSkill(workspaceId, req.params.id, req.body);
      reply.status(201);
      return skill;
    },
  );
}
