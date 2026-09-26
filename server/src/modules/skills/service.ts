import type {
  Skill,
  SkillImportBody,
  SkillImportPreview,
  SkillInput,
  SkillSummary,
  SkillUpdate,
  SkillVersionRecord,
} from '@devdigest/shared';
import { AppError } from '../../platform/errors.js';
import { SkillsRepository } from './repository.js';
import {
  coerceSkillType,
  firstHeading,
  firstParagraph,
  parseFrontmatter,
  toSkillDto,
  toSummaryDto,
  toVersionDto,
} from './helpers.js';
import {
  FALLBACK_SKILL_DESCRIPTION,
  FALLBACK_SKILL_NAME,
  MARKDOWN_PATTERN,
  MAX_BODY_CHARS,
  MAX_UPLOAD_BYTES,
  SKILL_FILE_PATTERN,
} from './constants.js';
import { listZipEntries, looksLikeZip, readZipEntry, ZipFormatError } from './zip.js';

/**
 * Skills business logic.
 *
 * Versioning rule, in one place: the body that is being replaced is snapshotted
 * BEFORE the write, and `version` is the number of the live body. So a skill at
 * version 3 has versions 1 and 2 in history plus itself, and no edit can lose a
 * body that was ever live.
 */
export class SkillsService {
  constructor(private repo: SkillsRepository) {}

  async list(workspaceId: string): Promise<SkillSummary[]> {
    const rows = await this.repo.list(workspaceId);
    return rows.map(({ row, agentCount }) => toSummaryDto(row, agentCount));
  }

  async get(workspaceId: string, id: string): Promise<SkillSummary | undefined> {
    const row = await this.repo.get(workspaceId, id);
    if (!row) return undefined;
    const counts = await this.repo.agentCounts([row.id]);
    return toSummaryDto(row, counts.get(row.id) ?? 0);
  }

  async create(
    workspaceId: string,
    input: SkillInput,
    source: 'manual' | 'imported' | 'extracted' = 'manual',
  ): Promise<Skill> {
    const row = await this.repo.create({
      workspaceId,
      name: input.name,
      description: input.description,
      type: input.type,
      source,
      body: input.body,
      enabled: input.enabled ?? true,
      version: 1,
    });
    // The first body is history too — a restore to version 1 must be possible.
    await this.repo.snapshot(row.id, 1, row.body);
    return toSkillDto(row);
  }

  async update(workspaceId: string, id: string, patch: SkillUpdate): Promise<Skill | undefined> {
    const current = await this.repo.get(workspaceId, id);
    if (!current) return undefined;

    const bodyChanged = patch.body !== undefined && patch.body !== current.body;
    if (bodyChanged) await this.repo.snapshot(current.id, current.version, current.body);

    const row = await this.repo.update(current.id, {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.type !== undefined ? { type: patch.type } : {}),
      ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
      ...(bodyChanged ? { body: patch.body!, version: current.version + 1 } : {}),
    });
    if (bodyChanged) await this.repo.snapshot(row.id, row.version, row.body);
    return toSkillDto(row);
  }

  delete(workspaceId: string, id: string): Promise<boolean> {
    return this.repo.delete(workspaceId, id);
  }

  async versions(workspaceId: string, id: string): Promise<SkillVersionRecord[] | undefined> {
    const current = await this.repo.get(workspaceId, id);
    if (!current) return undefined;
    const rows = await this.repo.versions(current.id);
    return rows.map((row) => toVersionDto(row, current.version));
  }

  /**
   * Restore an old body. This is an ordinary edit, not a rewind: the live body
   * is snapshotted and the restored text becomes a NEW version, so the history
   * still shows what happened and in which order.
   */
  async restore(workspaceId: string, id: string, version: number): Promise<Skill | undefined> {
    const current = await this.repo.get(workspaceId, id);
    if (!current) return undefined;
    const target = await this.repo.version(current.id, version);
    if (!target) throw new AppError('skill_version_not_found', 'Skill version not found', 404);
    if (target.version === current.version) return toSkillDto(current);

    await this.repo.snapshot(current.id, current.version, current.body);
    const row = await this.repo.update(current.id, {
      body: target.body,
      version: current.version + 1,
    });
    await this.repo.snapshot(row.id, row.version, row.body);
    return toSkillDto(row);
  }

  /**
   * Parse an upload into a skill preview. Nothing is saved here: the caller
   * shows the preview, and only a human confirmation turns it into a skill.
   *
   * A markdown file is the skill. An archive is searched for `SKILL.md`, then
   * for any markdown file; every other member is reported as ignored, and no
   * member other than the chosen one is ever read.
   */
  preview(upload: SkillImportBody): SkillImportPreview {
    const buf = Buffer.from(upload.content_base64, 'base64');
    if (buf.length === 0) throw new AppError('empty_upload', 'The uploaded file is empty', 400);
    if (buf.length > MAX_UPLOAD_BYTES) {
      throw new AppError('upload_too_large', 'The uploaded file is too large for a skill', 413);
    }

    const warnings: string[] = [];
    const ignored: string[] = [];
    let origin = upload.filename;
    let text: string;

    if (looksLikeZip(buf)) {
      let entries;
      try {
        entries = listZipEntries(buf);
      } catch (err) {
        const message = err instanceof ZipFormatError ? err.message : 'Could not read the archive';
        throw new AppError('bad_archive', message, 400);
      }
      const chosen =
        entries.find((e) => SKILL_FILE_PATTERN.test(e.name)) ??
        entries.find((e) => MARKDOWN_PATTERN.test(e.name));
      if (!chosen) {
        throw new AppError(
          'no_skill_in_archive',
          'The archive contains no SKILL.md and no markdown file',
          400,
        );
      }
      for (const entry of entries) if (entry.name !== chosen.name) ignored.push(entry.name);
      if (!SKILL_FILE_PATTERN.test(chosen.name)) {
        warnings.push(`No SKILL.md in the archive — using ${chosen.name}`);
      }
      if (ignored.length > 0) {
        warnings.push(
          `${ignored.length} other file(s) in the archive were ignored and never executed`,
        );
      }
      origin = chosen.name;
      try {
        text = readZipEntry(buf, chosen).toString('utf8');
      } catch (err) {
        const message = err instanceof ZipFormatError ? err.message : 'Could not read the archive';
        throw new AppError('bad_archive', message, 400);
      }
    } else {
      text = buf.toString('utf8');
    }

    const { meta, body } = parseFrontmatter(text);
    if (!body) throw new AppError('empty_skill_body', 'The skill has no body', 400);
    if (body.length > MAX_BODY_CHARS) {
      throw new AppError('skill_too_large', 'The skill body is too large', 413);
    }
    if (Object.keys(meta).length === 0) {
      warnings.push('No YAML frontmatter — name and description were taken from the text');
    }
    if (!meta.description) {
      warnings.push('No description in the source; write one before saving — it is what makes the skill trigger');
    }

    return {
      name: meta.name || firstHeading(body) || FALLBACK_SKILL_NAME,
      description: meta.description || firstParagraph(body) || FALLBACK_SKILL_DESCRIPTION,
      type: coerceSkillType(meta.type),
      body,
      origin,
      ignored,
      warnings,
    };
  }
}
