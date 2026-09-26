import { z } from 'zod';
import { Skill, SkillType } from './knowledge.js';

/**
 * Skills API — the wire shapes for managing the knowledge layer of an agent.
 *
 * `Skill` itself lives in contracts/knowledge.ts; everything here is about
 * creating, editing, versioning and importing one.
 */

/** Create a skill by hand (the editor modal). */
export const SkillInput = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  type: SkillType,
  body: z.string().min(1),
  enabled: z.boolean().optional(),
});
export type SkillInput = z.infer<typeof SkillInput>;

/**
 * Edit a skill. Editing the body is what creates a new version: the previous
 * body is snapshotted first, so no edit destroys history.
 */
export const SkillUpdate = SkillInput.partial();
export type SkillUpdate = z.infer<typeof SkillUpdate>;

/**
 * A skill as the list page shows it: the record plus the two numbers a card
 * needs — its current version and how many agents link to it.
 */
export const SkillSummary = Skill.extend({
  agent_count: z.number().int(),
  created_at: z.string().nullish(),
});
export type SkillSummary = z.infer<typeof SkillSummary>;

/** One entry of a skill's history. `body` is the text as it was then. */
export const SkillVersionRecord = z.object({
  skill_id: z.string(),
  version: z.number().int(),
  body: z.string(),
  created_at: z.string().nullish(),
  /** True for the version currently live on the skill. */
  current: z.boolean(),
});
export type SkillVersionRecord = z.infer<typeof SkillVersionRecord>;

/** Restore a previous version: the current body is snapshotted, then replaced. */
export const SkillRestoreBody = z.object({ version: z.number().int().positive() });
export type SkillRestoreBody = z.infer<typeof SkillRestoreBody>;

/**
 * An uploaded skill, parsed but NOT saved. The import flow is two steps on
 * purpose: a foreign skill is untrusted input that ends up inside an agent's
 * system prompt, so a human sees the core of it before it is stored.
 */
export const SkillImportPreview = z.object({
  name: z.string(),
  description: z.string(),
  type: SkillType,
  body: z.string(),
  /** Where the core came from inside the upload (file name in the archive). */
  origin: z.string(),
  /**
   * Everything in the upload that was NOT imported: scripts, binaries, extra
   * files. Listed so the reviewer can see what was dropped, never executed.
   */
  ignored: z.array(z.string()),
  /** Notes about how the core was derived (missing frontmatter, fallbacks). */
  warnings: z.array(z.string()),
});
export type SkillImportPreview = z.infer<typeof SkillImportPreview>;

/** Body of the import request: one base64 file, markdown or zip. */
export const SkillImportBody = z.object({
  filename: z.string().min(1),
  /** Base64 of the raw file bytes. */
  content_base64: z.string().min(1),
});
export type SkillImportBody = z.infer<typeof SkillImportBody>;
