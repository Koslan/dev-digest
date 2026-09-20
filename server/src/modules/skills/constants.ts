import type { SkillType } from '@devdigest/shared';

/** Literals for the skills module. */

export const SKILL_TYPES = ['rubric', 'convention', 'security', 'custom'] as const;

/** An import with an unknown or missing type lands here rather than failing. */
export const DEFAULT_SKILL_TYPE: SkillType = 'custom';

/** Name used when an uploaded file carries neither frontmatter nor a heading. */
export const FALLBACK_SKILL_NAME = 'Imported skill';

/** Description used when the upload has nothing that reads like one. */
export const FALLBACK_SKILL_DESCRIPTION = 'Imported skill — no description in the source file.';

/**
 * Upload ceiling. A skill is prose; anything larger is not a skill, and the
 * body ends up inside an agent's system prompt on every run.
 */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

/** Body ceiling after parsing, for the same reason. */
export const MAX_BODY_CHARS = 200_000;

/**
 * Which file inside an archive is the skill. Anything else — scripts, assets,
 * binaries — is listed in the preview as ignored and never read or executed.
 */
export const SKILL_FILE_PATTERN = /(^|\/)SKILL\.md$/i;
export const MARKDOWN_PATTERN = /\.(md|markdown)$/i;

/** Rough token estimate: 4 characters per token, no tokenizer needed. */
export const CHARS_PER_TOKEN = 4;
