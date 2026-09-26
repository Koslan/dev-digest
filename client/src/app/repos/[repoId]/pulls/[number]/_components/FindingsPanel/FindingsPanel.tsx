/* FindingsPanel — hide-low-confidence + j/k navigation + FindingCard list,
   wiring the accept/dismiss action hook (A2). */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Toggle, EmptyState } from "@devdigest/ui";
import type { FindingRecord } from "@devdigest/shared";
import { FindingCard } from "../FindingCard";
import { useFindingAction } from "../../../../../../../lib/hooks/reviews";
import {
  FILTER_SEVERITIES,
  KEY_TO_ACTION,
  SEVERITY_COLOR,
  SEVERITY_LABEL_KEY,
  type FilterSeverity,
} from "./constants";
import { countBySeverity, filterBySeverity, visibleFindings } from "./helpers";
import { s } from "./styles";

export function FindingsPanel({
  findings,
  prId,
  repoFullName,
  headSha,
}: {
  findings: FindingRecord[];
  prId: string;
  repoFullName?: string | null;
  headSha?: string | null;
}) {
  const t = useTranslations("prReview");
  const action = useFindingAction();
  const [hideLow, setHideLow] = React.useState(false);
  const [severity, setSeverity] = React.useState<FilterSeverity | null>(null);
  const [focusIdx, setFocusIdx] = React.useState(0);

  // Everything the run contributes, after the confidence filter: the list the
  // counters count and the filter buttons narrow.
  const inScope = React.useMemo(() => visibleFindings(findings, hideLow), [findings, hideLow]);
  const counts = React.useMemo(() => countBySeverity(inScope), [inScope]);
  const shown = React.useMemo(() => filterBySeverity(inScope, severity), [inScope, severity]);

  // A narrower list invalidates the keyboard cursor — start from the top again.
  React.useEffect(() => setFocusIdx(0), [severity, hideLow]);

  /** Click the active filter again to clear it. */
  const toggleSeverity = (sev: FilterSeverity) =>
    setSeverity((current) => (current === sev ? null : sev));

  // j/k navigation + a/d shortcuts on the focused finding (keyboard).
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "j") setFocusIdx((i) => Math.min(i + 1, shown.length - 1));
      else if (e.key === "k") setFocusIdx((i) => Math.max(i - 1, 0));
      else if (KEY_TO_ACTION[e.key] && shown[focusIdx]) {
        action.mutate({ findingId: shown[focusIdx]!.id, action: KEY_TO_ACTION[e.key]!, prId });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shown, focusIdx, action, prId]);

  const present = FILTER_SEVERITIES.filter((sev) => counts[sev] > 0);

  return (
    <div>
      {/* Counters — a plain group-by over the findings already on screen.
          Only severities this run actually produced are listed. */}
      {present.length > 0 && (
        <div style={s.countsRow} data-testid="severity-counts">
          {present.map((sev, i) => (
            <React.Fragment key={sev}>
              {i > 0 && <span style={s.countSeparator}>·</span>}
              <span style={s.countPill(SEVERITY_COLOR[sev])}>
                {counts[sev]} {t(`panel.severity.${SEVERITY_LABEL_KEY[sev]}`)}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Filter buttons — click one to keep only that severity, click it again
          to restore the full list of this run's findings. */}
      <div style={s.filterRow}>
        {FILTER_SEVERITIES.map((sev) => {
          const enabled = counts[sev] > 0;
          const active = severity === sev;
          return (
            <button
              key={sev}
              type="button"
              aria-pressed={active}
              disabled={!enabled}
              onClick={() => toggleSeverity(sev)}
              style={s.filterBtn(active, SEVERITY_COLOR[sev], enabled)}
            >
              {t(`panel.severity.${SEVERITY_LABEL_KEY[sev]}`)}
            </button>
          );
        })}
      </div>

      <div style={s.toolbar}>
        <div style={s.toggleGroup}>
          {t("panel.hideLowConfidence")}
          <Toggle on={hideLow} onChange={setHideLow} size={16} />
        </div>
      </div>

      <div style={s.list}>
        {shown.length === 0 ? (
          <EmptyState icon="Filter" title={t("panel.noMatchTitle")} body={t("panel.noMatchBody")} />
        ) : (
          shown.map((f, i) => (
            <FindingCard
              key={f.id}
              f={f}
              focused={i === focusIdx}
              defaultExpanded={i === 0}
              pending={action.isPending}
              repoFullName={repoFullName}
              headSha={headSha}
              onAction={(act) => action.mutate({ findingId: f.id, action: act, prId })}
            />
          ))
        )}
      </div>
    </div>
  );
}
