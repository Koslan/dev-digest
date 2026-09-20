import { describe, it, expect } from 'vitest';
import { severityWeight } from '../src/platform/severity-weight.js';

describe('severityWeight', () => {
  it('weights a critical finding', () => {
    expect(severityWeight('CRITICAL')).toBe(35);
  });
});
