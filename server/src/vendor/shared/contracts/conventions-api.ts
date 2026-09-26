import { z } from 'zod';

/**
 * Conventions API — extracting the rules a repository already follows, so they
 * can become a skill instead of tribal knowledge.
 *
 * The flow is scan → candidates → accept/reject/edit → one `repo-conventions`
 * skill. `ConventionCandidate` in contracts/knowledge.ts is the older, thinner
 * shape; the record below is what the Conventions page works with.
 */

/** What kind of rule a candidate states. `other` is the catch-all, never a failure. */
export const ConventionCategory = z.enum([
  'naming',
  'structure',
  'imports',
  'typing',
  'error-handling',
  'testing',
  'styling',
  'other',
]);
export type ConventionCategory = z.infer<typeof ConventionCategory>;

/**
 * A candidate's lifecycle. `rejected` is persisted rather than deleted: a
 * rescan must not re-propose a rule a human already turned down.
 */
export const ConventionStatus = z.enum(['pending', 'accepted', 'rejected']);
export type ConventionStatus = z.infer<typeof ConventionStatus>;

/**
 * What the model must return per candidate: the category, the rule itself,
 * evidence as file + line, and how sure it is. Also the schema handed to the
 * provider as structured output, so a malformed answer is retried, not stored.
 */
export const ConventionProposal = z.object({
  category: ConventionCategory,
  /** One directive sentence — "Route handlers delegate to a service", not "code is layered". */
  rule: z.string().min(1),
  evidence_path: z.string().min(1),
  evidence_line: z.number().int().positive().nullish(),
  /** The few lines that show the rule being followed. */
  evidence_snippet: z.string().nullish(),
  confidence: z.number().min(0).max(1),
});
export type ConventionProposal = z.infer<typeof ConventionProposal>;

/** The whole model answer for one scan. */
export const ConventionProposalSet = z.object({
  candidates: z.array(ConventionProposal),
});
export type ConventionProposalSet = z.infer<typeof ConventionProposalSet>;

/** A stored candidate, as the Conventions page renders it. */
export const ConventionRecord = ConventionProposal.extend({
  id: z.string(),
  repo_id: z.string().nullish(),
  status: ConventionStatus,
  /** True once a human edited the rule — a rescan leaves those rows alone. */
  edited: z.boolean(),
  created_at: z.string().nullish(),
});
export type ConventionRecord = z.infer<typeof ConventionRecord>;

/**
 * The result of a scan. `sampled_files` is what the model was shown — chosen by
 * code, not by a model — so the run is explainable after the fact.
 */
export const ConventionScanResult = z.object({
  candidates: z.array(ConventionRecord),
  sampled_files: z.array(z.string()),
  config_files: z.array(z.string()),
  model: z.string(),
});
export type ConventionScanResult = z.infer<typeof ConventionScanResult>;

/** Inline edit / accept / reject of one candidate. */
export const ConventionPatch = z
  .object({
    rule: z.string().min(1).optional(),
    category: ConventionCategory.optional(),
    status: ConventionStatus.optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: 'Nothing to update' });
export type ConventionPatch = z.infer<typeof ConventionPatch>;

/** Turn the accepted candidates into one skill named `repo-conventions`. */
export const CreateConventionSkillBody = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  /** The assembled body, editable in the modal before it is saved. */
  body: z.string().min(1),
  /** Link the new skill to this agent straight away. */
  agent_id: z.string().uuid().optional(),
});
export type CreateConventionSkillBody = z.infer<typeof CreateConventionSkillBody>;
