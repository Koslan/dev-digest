import { z } from 'zod';
import { Agent } from './knowledge.js';

/**
 * Agents API — wire shapes that are about listing agents rather than about what
 * an agent IS. `Agent` itself lives in contracts/knowledge.ts.
 */

/**
 * An agent as the Agents grid shows it: the record plus the one number a tile
 * needs — how many skills are linked to it. Counted server-side so the grid is
 * one request, not one request per tile.
 */
export const AgentSummary = Agent.extend({
  skill_count: z.number().int(),
});
export type AgentSummary = z.infer<typeof AgentSummary>;
