import type { ConventionProposal, ConventionRecord } from '@devdigest/shared';
import type { ConventionRow } from '../../db/rows.js';
import { MAX_FILE_CHARS, MIN_CONFIDENCE } from './constants.js';

/** Pure transforms and prompt assembly for the conventions module. No I/O. */

export function toConventionDto(row: ConventionRow): ConventionRecord {
  return {
    id: row.id,
    repo_id: row.repoId,
    category: row.category as ConventionRecord['category'],
    rule: row.rule,
    evidence_path: row.evidencePath ?? '',
    evidence_line: row.evidenceLine,
    evidence_snippet: row.evidenceSnippet ?? '',
    confidence: row.confidence ?? 0,
    status: row.status,
    edited: row.edited,
    created_at: row.createdAt ? row.createdAt.toISOString() : null,
  };
}

/** One sample file as the prompt shows it: path, then a fenced excerpt. */
export interface SampleFile {
  path: string;
  text: string;
}

/** Trim a file to the per-file ceiling, marking that it was cut. */
export function excerpt(text: string, limit = MAX_FILE_CHARS): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n… (truncated at ${limit} characters)`;
}

/**
 * The user message for a scan: config files first (they state rules), then the
 * highest-ranked source files (they demonstrate them). Both lists are chosen by
 * code before the model is called, so what the model saw is reproducible.
 */
export function buildScanMessage(configs: SampleFile[], sources: SampleFile[]): string {
  const block = (f: SampleFile) => `--- ${f.path} ---\n${f.text}`;
  const parts: string[] = [];
  if (configs.length > 0) {
    parts.push(`# Config files (${configs.length})`, configs.map(block).join('\n\n'));
  }
  if (sources.length > 0) {
    parts.push(
      `# Most-depended-on source files (${sources.length})`,
      sources.map(block).join('\n\n'),
    );
  }
  return parts.join('\n\n');
}

/**
 * Drop proposals that are too unsure, point at a file that was never sampled
 * (the model invented the evidence), or repeat a rule already on file.
 */
export function keepProposal(
  proposal: ConventionProposal,
  sampledPaths: Set<string>,
  seenRules: Set<string>,
): boolean {
  if (proposal.confidence < MIN_CONFIDENCE) return false;
  if (!sampledPaths.has(proposal.evidence_path)) return false;
  return !seenRules.has(normaliseRule(proposal.rule));
}

/** Rules are compared loosely — the same sentence with different punctuation is the same rule. */
export function normaliseRule(rule: string): string {
  return rule.trim().toLowerCase().replace(/[\s.;:,]+/g, ' ');
}

/**
 * The body of the `repo-conventions` skill: the accepted rules grouped by
 * category, each carrying its evidence, because a rule without a file to point
 * at is an opinion.
 */
export function assembleSkillBody(records: ConventionRecord[]): string {
  const byCategory = new Map<string, ConventionRecord[]>();
  for (const record of records) {
    const list = byCategory.get(record.category) ?? [];
    list.push(record);
    byCategory.set(record.category, list);
  }

  const lines: string[] = [
    '# Repository conventions',
    '',
    'Rules this repository already follows, extracted from its config and its',
    'most-depended-on files, then reviewed by a human. Flag a change that breaks',
    'one of them, and cite the rule you are applying.',
    '',
  ];
  for (const [category, items] of byCategory) {
    lines.push(`## ${category}`, '');
    for (const item of items) {
      const where = item.evidence_line
        ? `${item.evidence_path}:${item.evidence_line}`
        : item.evidence_path;
      lines.push(`- ${item.rule}`, `  - Evidence: \`${where}\``);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}
