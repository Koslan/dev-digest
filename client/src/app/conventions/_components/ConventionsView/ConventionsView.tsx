/* /conventions — what this repository already does, turned into rules.
   Run Scan proposes candidates, a human accepts/rejects/edits them, and the
   accepted ones become one skill. Candidates are stored server-side, so a
   rejection survives a reload rather than being a UI state. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, EmptyState, ErrorState, Skeleton } from "@devdigest/ui";
import type { ConventionScanResult } from "@devdigest/shared";
import { AppShell } from "@/components/app-shell";
import { useActiveRepo } from "@/lib/repo-context";
import {
  useConventions,
  useExtractConventions,
  usePatchConvention,
} from "@/lib/hooks/conventions";
import { CandidateCard } from "./_components/CandidateCard";
import { CreateSkillModal } from "./_components/CreateSkillModal";
import { groupCandidates } from "./helpers";
import { s } from "./styles";

export function ConventionsView() {
  const t = useTranslations("conventions");
  const { repoId, activeRepo } = useActiveRepo();
  const { data: candidates, isLoading, isError, refetch } = useConventions(repoId);
  const scan = useExtractConventions();
  const patch = usePatchConvention(repoId);

  const [showRejected, setShowRejected] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [lastScan, setLastScan] = React.useState<ConventionScanResult | null>(null);

  const repoName = activeRepo?.name ?? t("page.repoFallback");
  const groups = groupCandidates(candidates ?? []);
  const scanned = (candidates ?? []).length > 0;

  const runScan = () => {
    if (!repoId) return;
    scan.mutate(repoId, { onSuccess: (result) => setLastScan(result) });
  };

  if (!repoId) {
    return (
      <AppShell crumb={[{ label: t("page.crumbLab") }, { label: t("page.crumbConventions") }]}>
        <div style={s.page}>
          <EmptyState icon="Folder" title={t("page.noRepo.title")} body={t("page.noRepo.body")} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell crumb={[{ label: t("page.crumbLab") }, { label: t("page.crumbConventions") }]}>
      {creating && (
        <CreateSkillModal
          repoId={repoId}
          repoName={repoName}
          acceptedCount={groups.accepted.length}
          onClose={() => setCreating(false)}
        />
      )}

      <div style={s.page}>
        <div style={s.header}>
          <div style={s.headerText}>
            <h1 style={s.h1}>
              {t("page.headingPrefix")}
              {repoName}
            </h1>
            <p style={s.subtitle}>{t("page.subtitle")}</p>
          </div>
          <div style={s.actions}>
            {/* Two buttons, not one: the first scan and a rescan are different
                decisions — a rescan keeps every judgement already made. */}
            <Button
              kind="primary"
              size="sm"
              icon="Play"
              title={t("page.runScanHint")}
              disabled={scan.isPending || scanned}
              onClick={runScan}
            >
              {scan.isPending && !scanned ? t("page.scanning") : t("page.runScan")}
            </Button>
            <Button
              kind="secondary"
              size="sm"
              icon="RefreshCw"
              title={t("page.rescanHint")}
              disabled={scan.isPending || !scanned}
              onClick={runScan}
            >
              {scan.isPending && scanned ? t("page.scanning") : t("page.rescan")}
            </Button>
            {groups.accepted.length > 0 && (
              <Button kind="primary" size="sm" icon="Sparkles" onClick={() => setCreating(true)}>
                {t("page.createSkill")}
              </Button>
            )}
          </div>
        </div>

        {scan.isError && (
          <ErrorState
            title={t("page.extractionFailed")}
            body={(scan.error as Error)?.message ?? ""}
            onRetry={runScan}
          />
        )}
        {lastScan && (
          <div style={s.summary}>
            {t("page.scanSummary", {
              candidates: lastScan.candidates.length,
              sources: lastScan.sampled_files.length,
              configs: lastScan.config_files.length,
              model: lastScan.model,
            })}
          </div>
        )}

        {isLoading || (scan.isPending && !scanned) ? (
          <div style={s.list}>
            <Skeleton height={110} />
            <Skeleton height={110} />
            <Skeleton height={110} />
          </div>
        ) : isError ? (
          <ErrorState body={t("page.loadError")} onRetry={() => refetch()} />
        ) : !scanned ? (
          <EmptyState
            icon="ListChecks"
            title={t("page.empty.title")}
            body={t("page.empty.body")}
            cta={t("page.empty.cta")}
            onCta={runScan}
          />
        ) : (
          <>
            <div style={s.countRow}>
              <span>{t("page.candidateCount", { count: groups.open.length + groups.accepted.length })}</span>
              {groups.accepted.length > 0 && (
                <span>· {t("page.acceptedCount", { count: groups.accepted.length })}</span>
              )}
            </div>

            <div style={s.list}>
              {[...groups.accepted, ...groups.open].map((record) => (
                <CandidateCard
                  key={record.id}
                  record={record}
                  pending={patch.isPending}
                  onPatch={(p) => patch.mutate({ id: record.id, patch: p })}
                />
              ))}
            </div>

            {groups.rejected.length > 0 && (
              <>
                <div style={s.rejectedBar}>
                  <span>{t("page.rejected.count", { count: groups.rejected.length })}</span>
                  <Button kind="ghost" size="sm" onClick={() => setShowRejected((v) => !v)}>
                    {showRejected ? t("page.rejected.hide") : t("page.rejected.show")}
                  </Button>
                </div>
                {showRejected && (
                  <div style={s.list}>
                    {groups.rejected.map((record) => (
                      <CandidateCard
                        key={record.id}
                        record={record}
                        pending={patch.isPending}
                        onPatch={(p) => patch.mutate({ id: record.id, patch: p })}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
