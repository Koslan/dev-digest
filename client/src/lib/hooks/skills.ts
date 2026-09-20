/* Skills — the knowledge layer. Every server call for skills lives here; a
   component never calls `api` directly. */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Skill,
  SkillImportBody,
  SkillImportPreview,
  SkillInput,
  SkillSummary,
  SkillUpdate,
  SkillVersionRecord,
} from "@devdigest/shared";
import { api } from "../api";

export function useSkills() {
  return useQuery<SkillSummary[]>({
    queryKey: ["skills"],
    queryFn: () => api.get<SkillSummary[]>("/skills"),
  });
}

export function useSkill(id: string | undefined) {
  return useQuery<SkillSummary>({
    queryKey: ["skill", id],
    queryFn: () => api.get<SkillSummary>(`/skills/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateSkill() {
  const qc = useQueryClient();
  return useMutation({
    // `imported` marks provenance: a skill that came from a file is not the
    // same thing as one somebody typed, and the card says which.
    mutationFn: (vars: { input: SkillInput; imported?: boolean }) =>
      api.post<Skill>(`/skills${vars.imported ? "?source=imported" : ""}`, vars.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  });
}

export function useUpdateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: SkillUpdate }) =>
      api.put<Skill>(`/skills/${vars.id}`, vars.patch),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["skills"] });
      qc.invalidateQueries({ queryKey: ["skill", vars.id] });
      qc.invalidateQueries({ queryKey: ["skill-versions", vars.id] });
    },
  });
}

export function useDeleteSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ ok: true }>(`/skills/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  });
}

export function useSkillVersions(id: string | undefined) {
  return useQuery<SkillVersionRecord[]>({
    queryKey: ["skill-versions", id],
    queryFn: () => api.get<SkillVersionRecord[]>(`/skills/${id}/versions`),
    enabled: Boolean(id),
  });
}

export function useRestoreSkillVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; version: number }) =>
      api.post<Skill>(`/skills/${vars.id}/restore`, { version: vars.version }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["skills"] });
      qc.invalidateQueries({ queryKey: ["skill", vars.id] });
      qc.invalidateQueries({ queryKey: ["skill-versions", vars.id] });
    },
  });
}

/** Parse an upload server-side. Nothing is saved until the preview is accepted. */
export function useImportPreview() {
  return useMutation({
    mutationFn: (body: SkillImportBody) =>
      api.post<SkillImportPreview>("/skills/import/preview", body),
  });
}

/**
 * Skills linked to one agent, in prompt order. The link table is the order:
 * whatever sequence this returns is the sequence the bodies are pasted into
 * the system prompt in.
 */
export function useAgentSkills(agentId: string | undefined) {
  return useQuery<{ skill_id: string; order: number }[]>({
    queryKey: ["agent-skills", agentId],
    queryFn: () => api.get<{ skill_id: string; order: number }[]>(`/agents/${agentId}/skills`),
    enabled: Boolean(agentId),
  });
}

/** Replace the agent's linked skills with this exact list, in this exact order. */
export function useSetAgentSkills() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { agentId: string; skillIds: string[] }) =>
      api.post<{ skill_id: string; order: number }[]>(`/agents/${vars.agentId}/skills`, {
        skill_ids: vars.skillIds,
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["agent-skills", vars.agentId] });
      qc.invalidateQueries({ queryKey: ["agent", vars.agentId] });
      // agent_count on the skill cards moves with the links.
      qc.invalidateQueries({ queryKey: ["skills"] });
    },
  });
}
