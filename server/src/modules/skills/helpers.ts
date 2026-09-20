import type { Skill, SkillSummary, SkillType, SkillVersionRecord } from '@devdigest/shared';
import type { SkillRow } from './repository.js';
import { DEFAULT_SKILL_TYPE, SKILL_TYPES } from './constants.js';

/** Pure transforms for the skills module. No I/O lives here. */

export function toSkillDto(row: SkillRow): Skill {
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

export function toSummaryDto(row: SkillRow, agentCount: number): SkillSummary {
  return {
    ...toSkillDto(row),
    agent_count: agentCount,
    created_at: row.createdAt ? row.createdAt.toISOString() : null,
  };
}

export function toVersionDto(
  row: { skillId: string; version: number; body: string; createdAt: Date | null },
  currentVersion: number,
): SkillVersionRecord {
  return {
    skill_id: row.skillId,
    version: row.version,
    body: row.body,
    created_at: row.createdAt ? row.createdAt.toISOString() : null,
    current: row.version === currentVersion,
  };
}

/** A type we do not recognise falls back to `custom` rather than failing an import. */
export function coerceSkillType(value: string | undefined): SkillType {
  const normalised = (value ?? '').trim().toLowerCase();
  return (SKILL_TYPES as readonly string[]).includes(normalised)
    ? (normalised as SkillType)
    : DEFAULT_SKILL_TYPE;
}

/**
 * Parse the YAML frontmatter of a SKILL.md. Deliberately minimal: only the
 * top-level `key: value` pairs an imported skill is allowed to carry. No YAML
 * library, no anchors, no nested structures — an imported file is untrusted
 * input, and the less of it we interpret, the smaller the surface.
 */
export function parseFrontmatter(text: string): { meta: Record<string, string>; body: string } {
  const normalised = text.replace(/\r\n/g, '\n');
  if (!normalised.startsWith('---\n')) return { meta: {}, body: normalised.trim() };
  const end = normalised.indexOf('\n---', 4);
  if (end === -1) return { meta: {}, body: normalised.trim() };

  const meta: Record<string, string> = {};
  for (const line of normalised.slice(4, end).split('\n')) {
    const separator = line.indexOf(':');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) meta[key] = value;
  }
  const body = normalised.slice(end + 4).replace(/^\n+/, '').trim();
  return { meta, body };
}

/** First markdown heading, used as a name when frontmatter has none. */
export function firstHeading(body: string): string | undefined {
  const match = body.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim();
}

/** First non-empty, non-heading line, used as a description fallback. */
export function firstParagraph(body: string): string | undefined {
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    return trimmed;
  }
  return undefined;
}
