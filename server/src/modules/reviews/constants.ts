/**
 * Review module constants.
 */

/**
 * Studio review strategy. 'single-pass' = send the WHOLE diff in ONE LLM call.
 * We deliberately do NOT use 'auto'/map-reduce by default: map-reduce makes one
 * call PER FILE, which is slow and fragile (any single file's transient 5xx
 * fails the entire run) and unnecessary — the whole diff already fits the
 * model's context.
 */
export const REVIEW_STRATEGY = 'single-pass' as const;

/**
 * Characters per token for the skills-block estimate shown in the trace.
 * Deliberately a ratio, not a tokenizer call: the number answers "how much of
 * this prompt is knowledge", and being a few percent off does not change that
 * answer, while loading a tokenizer on every run would cost more than it tells.
 */
export const SKILL_CHARS_PER_TOKEN = 4;
