/* AgentCard — one tile in the Agents grid: name, description, model chip,
   enabled toggle, linked-skill count, and delete. Deleting takes an agent's
   run history with it, so it goes through a confirmation modal, never a
   browser confirm(). */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Icon, Badge, Button, Toggle } from "@devdigest/ui";
import type { AgentSummary } from "@devdigest/shared";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { useDeleteAgent } from "../../../../lib/hooks/agents";
import { modelColor } from "./helpers";
import { s } from "./styles";

export function AgentCard({
  ag,
  active,
  skillCount,
  onClick,
  onToggle,
  onDeleted,
}: {
  ag: AgentSummary;
  active?: boolean;
  /** Override for the count on the tile; defaults to the one the list returns. */
  skillCount?: number;
  onClick?: () => void;
  onToggle?: (enabled: boolean) => void;
  /** Called after a successful delete — the editor uses it to leave the page. */
  onDeleted?: () => void;
}) {
  const t = useTranslations("agents");
  const del = useDeleteAgent();
  const [confirming, setConfirming] = React.useState(false);
  const color = modelColor(ag.model);
  const skills = skillCount ?? ag.skill_count;
  return (
    <div onClick={onClick} style={s.card(!!active, ag.enabled)}>
      {confirming && (
        <div onClick={(e) => e.stopPropagation()}>
          <ConfirmDeleteModal
            title={t("card.delete.title")}
            body={t("card.delete.body", { name: ag.name })}
            confirmLabel={t("card.delete.confirm")}
            cancelLabel={t("card.delete.cancel")}
            pending={del.isPending}
            onCancel={() => setConfirming(false)}
            onConfirm={() =>
              del.mutate(ag.id, {
                onSuccess: () => {
                  setConfirming(false);
                  onDeleted?.();
                },
              })
            }
          />
        </div>
      )}
      <div style={s.headerRow}>
        <div style={s.iconBox}>
          <Icon.Cpu size={15} />
        </div>
        <span style={s.name}>{ag.name}</span>
        {onToggle && (
          <div onClick={(e) => e.stopPropagation()} style={s.toggleCell}>
            <Toggle on={ag.enabled} onChange={onToggle} size={14} />
          </div>
        )}
        <div onClick={(e) => e.stopPropagation()}>
          <Button
            kind="ghost"
            size="sm"
            icon="Trash"
            title={t("card.delete.action")}
            aria-label={t("card.delete.action")}
            disabled={del.isPending}
            onClick={() => setConfirming(true)}
          />
        </div>
      </div>
      <div style={s.description}>{ag.description || t("card.noDescription")}</div>
      <div style={s.metaRow}>
        <span className="mono" style={s.modelChip(color)}>
          {ag.model}
        </span>
        {skills != null && (
          <Badge color="var(--text-secondary)" icon="Sparkles">
            {t("card.skillCount", { count: skills })}
          </Badge>
        )}
      </div>
    </div>
  );
}
