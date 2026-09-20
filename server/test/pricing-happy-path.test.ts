/**
 * Pricing — a first test for estimateCost.
 */
import { describe, it, expect } from 'vitest';
import { estimateCost } from '../src/adapters/llm/pricing.js';

describe('estimateCost', () => {
  it('prices a known model', () => {
    const cost = estimateCost('claude-haiku-4-5', 1_000_000, 1_000_000);
    expect(cost).toBe(6);
  });
});
