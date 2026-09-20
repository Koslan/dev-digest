/**
 * AnthropicProvider — the reprompt turn after a schema failure.
 *
 * Forced tool use means the assistant turn we echo back carries a `tool_use`
 * block. The API rejects the whole request with a 400 unless the next message
 * opens with a matching `tool_result`, so a plain text reprompt never reaches
 * the model — the retry dies before it starts. Regression guard for that.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import type Anthropic from '@anthropic-ai/sdk';
import { AnthropicProvider } from '../src/adapters/llm/anthropic.js';

const Shape = z.object({ answer: z.string() });

/** A fake SDK client that first returns a schema-violating tool_use, then a valid one. */
function fakeClient(): { client: Anthropic; calls: Anthropic.MessageCreateParams[] } {
  const calls: Anthropic.MessageCreateParams[] = [];
  const replies = [
    { wrong: true }, // fails Shape
    { answer: 'ok' }, // passes
  ];
  const client = {
    messages: {
      create: async (params: Anthropic.MessageCreateParams) => {
        calls.push(params);
        const input = replies[calls.length - 1] ?? replies[replies.length - 1];
        return {
          content: [{ type: 'tool_use', id: `toolu_${calls.length}`, name: 'Shape', input }],
          usage: { input_tokens: 10, output_tokens: 5 },
        };
      },
    },
  } as unknown as Anthropic;
  return { client, calls };
}

describe('AnthropicProvider — structured output repair', () => {
  it('answers the failed tool_use with a tool_result before reprompting', async () => {
    const { client, calls } = fakeClient();
    const provider = new AnthropicProvider('test-key', client);

    const res = await provider.completeStructured({
      model: 'claude-haiku-4-5',
      schema: Shape,
      schemaName: 'Shape',
      messages: [{ role: 'user', content: 'give me the shape' }],
    });

    expect(res.data).toEqual({ answer: 'ok' });
    expect(res.attempts).toBe(2);
    expect(calls).toHaveLength(2);

    // The retry request must carry: the assistant turn with the tool_use, then
    // a user turn whose FIRST block is the matching tool_result.
    const retry = calls[1]!;
    const last = retry.messages[retry.messages.length - 1]!;
    expect(last.role).toBe('user');
    const blocks = last.content as Array<Record<string, unknown>>;
    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks[0]!.type).toBe('tool_result');
    expect(blocks[0]!.tool_use_id).toBe('toolu_1');
    expect(blocks[0]!.is_error).toBe(true);
    // The schema error itself is what the model is asked to fix.
    expect(String(blocks[0]!.content)).toMatch(/answer/);
  });

  it('counts tokens across both attempts, not just the successful one', async () => {
    const { client } = fakeClient();
    const provider = new AnthropicProvider('test-key', client);

    const res = await provider.completeStructured({
      model: 'claude-haiku-4-5',
      schema: Shape,
      schemaName: 'Shape',
      messages: [{ role: 'user', content: 'give me the shape' }],
    });

    expect(res.tokensIn).toBe(20);
    expect(res.tokensOut).toBe(10);
    // Haiku 4.5 is priced, so a repaired call still reports a cost.
    expect(res.costUsd).toBeGreaterThan(0);
  });
});
