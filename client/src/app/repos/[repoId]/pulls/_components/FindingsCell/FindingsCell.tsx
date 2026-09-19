/* FindingsCell — the PR list's FINDINGS column: one severity icon per severity
   the latest run produced, and a read-only hover popover previewing those
   findings. Acting on a finding (accept / dismiss) lives on the PR page, so
   this popover deliberately has no buttons. */
"use client";

import React from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Icon } from "@devdigest/ui";
import type { PrFindingsSummary, Severity } from "@/lib/types";
import { POPOVER_GAP, SEVERITY_ICON, SEVERITY_ORDER_LIST, SEVERITY_TONE } from "./constants";
import { countBySeverity, popoverPosition } from "./helpers";
import { s } from "./styles";

export function FindingsCell({ findings }: { findings?: PrFindingsSummary | null }) {
  const t = useTranslations("prReview");
  const anchor = React.useRef<HTMLSpanElement>(null);
  const [at, setAt] = React.useState<{ top: number; left: number } | null>(null);

  // The list card clips its content (rounded corners), so the popover is
  // rendered into <body> and positioned against the icons instead of being
  // nested inside the row.
  const open = () => {
    const rect = anchor.current?.getBoundingClientRect();
    if (rect) setAt(popoverPosition(rect, POPOVER_GAP));
  };

  // No review yet, or a clean run: nothing to hover.
  if (!findings || findings.total === 0) return <span style={s.none}>—</span>;

  const counts = countBySeverity(findings.items);
  const present = SEVERITY_ORDER_LIST.filter((sev) => counts[sev] > 0);

  return (
    <div
      style={s.cell}
      // The row itself navigates on click; the popover is a preview, so keep
      // clicks inside it from opening the PR.
      onClick={(e) => e.stopPropagation()}
    >
      <span
        ref={anchor}
        style={s.icons}
        onMouseEnter={open}
        onMouseLeave={() => setAt(null)}
        data-testid="findings-icons"
      >
        {present.map((sev) => {
          const IconCmp = Icon[SEVERITY_ICON[sev]];
          return (
            <span key={sev} style={s.iconGroup(SEVERITY_TONE[sev])} className="tnum">
              <IconCmp size={13} />
              {counts[sev]}
            </span>
          );
        })}
      </span>

      {at !== null &&
        createPortal(
          <div
            style={{ ...s.popover, top: at.top, left: at.left }}
            role="tooltip"
            data-testid="findings-popover"
          >
          <div style={s.popoverTitle}>{t("list.findingsPopover.title", { count: findings.total })}</div>
          {findings.items.map((f, i) => (
            <div key={f.id} style={{ ...s.item, ...(i === 0 ? s.itemFirst : null) }}>
              <div style={s.itemHead}>
                <span style={s.sevDot(SEVERITY_TONE[f.severity as Severity])} />
                <span style={s.itemTitle}>{f.title}</span>
              </div>
              <div style={s.itemMeta}>
                <span>{f.category}</span>
                <span className="mono">
                  {f.file}:{f.start_line}
                  {f.end_line !== f.start_line ? `-${f.end_line}` : ""}
                </span>
                <span className="tnum">
                  {t("list.findingsPopover.confidence", {
                    percent: Math.round(f.confidence * 100),
                  })}
                </span>
              </div>
              <div style={s.itemBody}>{f.rationale}</div>
            </div>
          ))}
          {findings.total > findings.items.length && (
            <div style={s.more}>
              {t("list.findingsPopover.more", { count: findings.total - findings.items.length })}
            </div>
          )}
          </div>,
          document.body,
        )}
    </div>
  );
}
