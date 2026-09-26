import { describe, it, expect } from 'vitest';
import { normalizeForMatch, matchesPattern } from './pathNormalize.js';

describe('normalizeForMatch', () => {
  it('turns backslashes into slashes', () => {
    expect(normalizeForMatch('src\a.ts')).toBe('src/a.ts');
  });
  it('drops a leading ./', () => {
    expect(normalizeForMatch('./src/a.ts')).toBe('src/a.ts');
  });
});

describe('matchesPattern', () => {
  it('matches a plain pattern', () => {
    expect(matchesPattern('src/a.ts', '^src/')).toBe(true);
  });
  it('returns false for a pattern that does not match', () => {
    expect(matchesPattern('docs/a.md', '^src/')).toBe(false);
  });
});
