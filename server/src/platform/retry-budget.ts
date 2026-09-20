/**
 * Retry budget for provider calls: how long to wait before attempt N, and
 * whether to keep trying at all.
 *
 * Exponential backoff with a ceiling, so a provider outage degrades into a
 * slow queue instead of a thundering herd.
 */

export interface RetryOptions {
  /** Delay before the first retry, in milliseconds. */
  baseMs?: number;
  /** Never wait longer than this, however many attempts have failed. */
  maxMs?: number;
  /** Give up after this many attempts. */
  maxAttempts?: number;
}

const DEFAULTS = { baseMs: 500, maxMs: 30_000, maxAttempts: 5 };

/**
 * Delay before `attempt` (1 = the first retry). Doubles each attempt and is
 * clamped to `maxMs`.
 */
export function nextDelayMs(attempt: number, opts: RetryOptions = {}): number {
  const { baseMs, maxMs } = { ...DEFAULTS, ...opts };
  if (attempt < 1) throw new RangeError('attempt must be >= 1');
  const delay = baseMs * 2 ** (attempt - 1);
  return Math.min(delay, maxMs);
}

/** Whether another attempt is allowed, and whether the error is worth retrying. */
export function shouldRetry(attempt: number, status: number, opts: RetryOptions = {}): boolean {
  const { maxAttempts } = { ...DEFAULTS, ...opts };
  if (attempt >= maxAttempts) return false;
  // 429 and 5xx are transient; a 4xx that is not 429 will fail again the same way.
  if (status === 429) return true;
  return status >= 500;
}
