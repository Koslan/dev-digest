import {
  ConventionProposalSet,
  type ConventionPatch,
  type ConventionProposal,
  type ConventionRecord,
  type ConventionScanResult,
  type CreateConventionSkillBody,
  type Skill,
} from '@devdigest/shared';
import type { Container } from '../../platform/container.js';
import { AppError, NotFoundError } from '../../platform/errors.js';
import { resolveFeatureModel } from '../settings/feature-models.js';
import { ConventionsRepository } from './repository.js';
import {
  assembleSkillBody,
  buildScanMessage,
  excerpt,
  keepProposal,
  normaliseRule,
  toConventionDto,
  type SampleFile,
} from './helpers.js';
import {
  CONFIG_FILE_CANDIDATES,
  CONVENTIONS_SKILL_NAME,
  MAX_CANDIDATES,
  MAX_SAMPLE_CHARS,
  PROPOSAL_SCHEMA_NAME,
  SAMPLE_FILE_COUNT,
  SCAN_MAX_TOKENS,
  SCAN_TEMPERATURE,
  SYSTEM_PROMPT,
} from './constants.js';

/**
 * Conventions — turning what a repository already does into a rule an agent can
 * apply.
 *
 * The split that matters: **which files the model sees is decided by code**
 * (config files by name, source files by rank), and only the classification of
 * those files into rules is a model call. That keeps a scan explainable and
 * cheap, and it is why `sampled_files` comes back with the result.
 */
export class ConventionsService {
  private repo: ConventionsRepository;

  constructor(private container: Container) {
    this.repo = new ConventionsRepository(container.db);
  }

  async list(workspaceId: string, repoId: string): Promise<ConventionRecord[]> {
    await this.requireRepo(workspaceId, repoId);
    const rows = await this.repo.list(workspaceId, repoId);
    return rows.map(toConventionDto);
  }

  /**
   * Scan the repository for conventions. Rescanning is the same call: untouched
   * pending candidates are replaced, while accepted, rejected and hand-edited
   * ones stay exactly as they are — a rejected rule never comes back.
   */
  async scan(workspaceId: string, repoId: string): Promise<ConventionScanResult> {
    const repo = await this.requireRepo(workspaceId, repoId);
    const ref = { owner: repo.owner, name: repo.name };

    // ---- Sample selection: pure code, no model ---------------------------
    const configs = await this.readSome(ref, [...CONFIG_FILE_CANDIDATES]);
    const rankedPaths = await this.container.repoIntel.getConventionSamples(
      repoId,
      SAMPLE_FILE_COUNT,
    );
    const sources = await this.readSome(ref, rankedPaths);

    if (configs.length === 0 && sources.length === 0) {
      throw new AppError(
        'CONVENTIONS_NO_SAMPLE',
        'Nothing to scan: the repository has not been cloned or indexed yet. Open it once so it is indexed, then run the scan.',
        422,
      );
    }

    const message = buildScanMessage(configs, sources).slice(0, MAX_SAMPLE_CHARS);

    // ---- Classification: the one model call ------------------------------
    const choice = await resolveFeatureModel(this.container, workspaceId, 'conventions');
    const llm = await this.container.llm(choice.provider);
    const result = await llm.completeStructured({
      model: choice.model,
      schema: ConventionProposalSet,
      schemaName: PROPOSAL_SCHEMA_NAME,
      temperature: SCAN_TEMPERATURE,
      maxTokens: SCAN_MAX_TOKENS,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
    });

    // ---- Keep what is usable --------------------------------------------
    const sampled = new Set([...configs, ...sources].map((f) => f.path));
    const seen = new Set(
      (await this.repo.existingRules(workspaceId, repoId)).map((rule) => normaliseRule(rule)),
    );
    const kept: ConventionProposal[] = [];
    for (const proposal of result.data.candidates) {
      if (kept.length >= MAX_CANDIDATES) break;
      if (!keepProposal(proposal, sampled, seen)) continue;
      seen.add(normaliseRule(proposal.rule));
      kept.push(proposal);
    }

    await this.repo.deleteReplaceable(workspaceId, repoId);
    await this.repo.insertMany(workspaceId, repoId, kept);

    const rows = await this.repo.list(workspaceId, repoId);
    return {
      candidates: rows.map(toConventionDto),
      sampled_files: sources.map((f) => f.path),
      config_files: configs.map((f) => f.path),
      model: result.model,
    };
  }

  /**
   * Accept, reject or edit one candidate. An edit marks the row `edited`, which
   * is what protects it from the next rescan.
   */
  async patch(
    workspaceId: string,
    id: string,
    patch: ConventionPatch,
  ): Promise<ConventionRecord | undefined> {
    const current = await this.repo.get(workspaceId, id);
    if (!current) return undefined;
    const editedByHand = patch.rule !== undefined || patch.category !== undefined;
    const row = await this.repo.update(workspaceId, id, {
      ...(patch.rule !== undefined ? { rule: patch.rule } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(editedByHand ? { edited: true } : {}),
    });
    return row ? toConventionDto(row) : undefined;
  }

  /**
   * Collect the accepted candidates into one skill. The name is fixed
   * (`repo-conventions`) so a second Create updates that skill through the
   * normal versioning path instead of littering the library with copies.
   */
  async createSkill(
    workspaceId: string,
    repoId: string,
    body: CreateConventionSkillBody,
  ): Promise<Skill> {
    await this.requireRepo(workspaceId, repoId);
    const accepted = await this.repo.listAccepted(workspaceId, repoId);
    if (accepted.length === 0) {
      throw new AppError(
        'CONVENTIONS_NONE_ACCEPTED',
        'Accept at least one candidate before creating the skill',
        422,
      );
    }

    const skills = this.container.skillsRepo;
    const existing = await this.repo.findSkillByName(workspaceId, body.name);
    let row;
    if (existing) {
      // Same versioning rule as the skills module: the outgoing body is
      // snapshotted before it is replaced, so no edit loses a live body.
      const bodyChanged = existing.body !== body.body;
      if (bodyChanged) await skills.snapshot(existing.id, existing.version, existing.body);
      row = await skills.update(existing.id, {
        description: body.description,
        ...(bodyChanged ? { body: body.body, version: existing.version + 1 } : {}),
      });
      if (bodyChanged) await skills.snapshot(row.id, row.version, row.body);
    } else {
      row = await skills.create({
        workspaceId,
        name: body.name,
        description: body.description,
        type: 'convention',
        // Provenance: this body came out of the repo, not out of a person or a file.
        source: 'extracted',
        body: body.body,
        enabled: true,
        version: 1,
      });
      await skills.snapshot(row.id, 1, row.body);
    }

    if (body.agent_id) {
      const [agentId] = await this.repo.agentsIn(workspaceId, [body.agent_id]);
      if (!agentId) throw new NotFoundError('Agent not found');
      const links = await this.container.agentsRepo.linkedSkills(agentId);
      const alreadyLinked = links.some((l) => l.skill.id === row.id);
      if (!alreadyLinked) {
        await this.container.agentsRepo.linkSkill(agentId, row.id, links.length);
      }
    }

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      source: row.source,
      body: row.body,
      enabled: row.enabled,
      version: row.version,
      evidence_files: row.evidenceFiles ?? null,
    };
  }

  /** The body the Create-skill modal opens with — editable before it is saved. */
  async draftSkillBody(workspaceId: string, repoId: string): Promise<string> {
    const accepted = await this.repo.listAccepted(workspaceId, repoId);
    return assembleSkillBody(accepted.map(toConventionDto));
  }

  // ---- internals ---------------------------------------------------------

  private async requireRepo(workspaceId: string, repoId: string) {
    const repo = await this.repo.getRepo(workspaceId, repoId);
    if (!repo) throw new NotFoundError('Repository not found');
    return repo;
  }

  /**
   * Read whichever of these paths exist in the clone. A missing file is not an
   * error — most repositories have only some of the config files, and the scan
   * works with whatever is there.
   */
  private async readSome(
    ref: { owner: string; name: string },
    paths: string[],
  ): Promise<SampleFile[]> {
    const out: SampleFile[] = [];
    for (const path of paths) {
      try {
        const text = await this.container.git.readFile(ref, path);
        if (text.trim()) out.push({ path, text: excerpt(text) });
      } catch {
        // Not in the clone (or not readable) — skip it silently.
      }
    }
    return out;
  }
}
