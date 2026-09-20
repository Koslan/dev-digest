import { describe, it, expect } from 'vitest';
import { nextDelayMs, shouldRetry } from '../src/platform/retry-budget.js';

describe('retry budget', () => {
  it('backs off exponentially', () => {
    expect(nextDelayMs(1)).toBe(500);
    expect(nextDelayMs(2)).toBe(1000);
    expect(nextDelayMs(3)).toBe(2000);
  });

  it('retries a server error', () => {
    expect(shouldRetry(1, 500)).toBe(true);
  });
});
