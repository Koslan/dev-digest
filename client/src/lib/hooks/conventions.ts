/* Conventions — the rules a repo already follows. Every server call for the
   Conventions page lives here; a component never calls `api` directly. */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ConventionPatch,
  ConventionRecord,
  ConventionScanResult,
  CreateConventionSkillBody,
  Skill,
} from "@devdigest/shared";
import { api } from "../api";

/** Stored candidates for a repo. They are persisted, so a reload shows the same list. */
export function useConventions(repoId: string | null | undefined) {
  return useQuery<ConventionRecord[]>({
    queryKey: ["conventions", repoId],
    queryFn: () => api.get<ConventionRecord[]>(`/repos/${repoId}/conventions`),
    enabled: Boolean(repoId),
  });
}

/** Run Scan / ReScan — the same call; the server decides what a rescan may replace. */
export function useExtractConventions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (repoId: string) =>
      api.post<ConventionScanResult>(`/repos/${repoId}/conventions/extract`, {}),
    onSuccess: (_data, repoId) => {
      qc.invalidateQueries({ queryKey: ["conventions", repoId] });
      qc.invalidateQueries({ queryKey: ["conventions-draft", repoId] });
    },
  });
}

/** Accept, Reject or an inline Edit of one candidate. */
export function usePatchConvention(repoId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: ConventionPatch }) =>
      api.patch<ConventionRecord>(`/conventions/${vars.id}`, vars.patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conventions", repoId] });
      // The draft body is assembled from the accepted rows, so it moves with them.
      qc.invalidateQueries({ queryKey: ["conventions-draft", repoId] });
    },
  });
}

/** The skill body the Create-skill modal opens with, assembled from accepted rows. */
export function useConventionDraft(repoId: string | null | undefined, enabled: boolean) {
  return useQuery<{ body: string }>({
    queryKey: ["conventions-draft", repoId],
    queryFn: () => api.get<{ body: string }>(`/repos/${repoId}/conventions/draft`),
    enabled: Boolean(repoId) && enabled,
  });
}

/** Turn the accepted candidates into the `repo-conventions` skill. */
export function useCreateConventionSkill(repoId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateConventionSkillBody) =>
      api.post<Skill>(`/repos/${repoId}/conventions/skill`, body),
    onSuccess: () => {
      // The new skill shows up in the library, and its agent link changes counts.
      qc.invalidateQueries({ queryKey: ["skills"] });
      qc.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}
