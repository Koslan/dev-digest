import { describe, it, expect } from 'vitest';
import { temperatureParam } from '../src/adapters/llm/anthropic.js';

describe('temperatureParam', () => {
  it.each(['claude-sonnet-5', 'claude-opus-5-5', 'claude-fable-5-1'])('omits temperature for %s', (m) => {
    expect(temperatureParam(m, 0)).toEqual({});
  });
  it.each(['claude-haiku-4-5-20251001', 'claude-opus-4-8', 'claude-sonnet-4-6'])('keeps temperature for %s', (m) => {
    expect(temperatureParam(m, 0.2)).toEqual({ temperature: 0.2 });
  });
});
