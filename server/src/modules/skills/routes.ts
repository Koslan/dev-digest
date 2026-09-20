import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { SkillImportBody, SkillInput, SkillRestoreBody, SkillUpdate } from '@devdigest/shared';
import { getContext } from '../_shared/context.js';
import { IdParams } from '../_shared/schemas.js';
import { NotFoundError } from '../../platform/errors.js';
import { SkillsRepository } from './repository.js';
import { SkillsService } from './service.js';

/**
 * skills module — the knowledge layer agents are composed from.
 *   GET    /skills              → list with version + agent_count (the cards)
 *   POST   /skills              → create (manual, or confirm an import)
 *   GET    /skills/:id          → one skill
 *   PUT    /skills/:id          → edit; a body change snapshots and bumps version
 *   DELETE /skills/:id          → delete (cascades to versions and agent links)
 *   GET    /skills/:id/versions → history, newest first
 *   POST   /skills/:id/restore  → make a past version live again
 *   POST   /skills/import/preview → parse an upload WITHOUT saving it
 *
 * Import is two calls on purpose: a foreign skill is untrusted text that ends
 * up in an agent's system prompt, so a human approves the parsed core first.
 */
export default async function skillsRoutes(appBase: FastifyInstance) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  const { container } = app;
  const service = new SkillsService(new SkillsRepository(container.db));

  app.get('/skills', async (req) => {
    const { workspaceId } = await getContext(container, req);
    return service.list(workspaceId);
  });

  app.post('/skills', { schema: { body: SkillInput } }, async (req, reply) => {
    const { workspaceId } = await getContext(container, req);
    // `imported` is carried on the query string so the body stays the plain
    // editor shape, whether the text was typed or came from a file.
    const imported = (req.query as { source?: string } | undefined)?.source === 'imported';
    const skill = await service.create(workspaceId, req.body, imported ? 'imported' : 'manual');
    reply.status(201);
    return skill;
  });

  app.get('/skills/:id', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(container, req);
    const skill = await service.get(workspaceId, req.params.id);
    if (!skill) throw new NotFoundError('Skill not found');
    return skill;
  });

  app.put('/skills/:id', { schema: { params: IdParams, body: SkillUpdate } }, async (req) => {
    const { workspaceId } = await getContext(container, req);
    const skill = await service.update(workspaceId, req.params.id, req.body);
    if (!skill) throw new NotFoundError('Skill not found');
    return skill;
  });

  app.delete('/skills/:id', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(container, req);
    const ok = await service.delete(workspaceId, req.params.id);
    if (!ok) throw new NotFoundError('Skill not found');
    return { ok: true };
  });

  app.get('/skills/:id/versions', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(container, req);
    const versions = await service.versions(workspaceId, req.params.id);
    if (!versions) throw new NotFoundError('Skill not found');
    return versions;
  });

  app.post(
    '/skills/:id/restore',
    { schema: { params: IdParams, body: SkillRestoreBody } },
    async (req) => {
      const { workspaceId } = await getContext(container, req);
      const skill = await service.restore(workspaceId, req.params.id, req.body.version);
      if (!skill) throw new NotFoundError('Skill not found');
      return skill;
    },
  );

  app.post('/skills/import/preview', { schema: { body: SkillImportBody } }, async (req) => {
    await getContext(container, req);
    return service.preview(req.body);
  });
}
