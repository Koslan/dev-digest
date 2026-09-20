/* Skills tab — the agent's knowledge layer. Lists every skill in the system,
   attached first in prompt order. The toggle attaches/detaches; dragging
   reorders, and that order is the order the bodies land in the system prompt,
   so only attached rows are draggable. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, EmptyState, ErrorState, Icon, Skeleton, Toggle } from "@devdigest/ui";
import type { Agent } from "@devdigest/shared";
import { useAgentSkills, useSetAgentSkills, useSkills } from "@/lib/hooks/skills";
import { TYPE_TONE } from "@/lib/skill-type";
import { buildRows, filterByName, moveSkill, orderedSkillIds } from "./helpers";
import { s } from "./styles";

export function SkillsTab({ agent }: { agent: Agent }) {
  const t = useTranslations("agents");
  const { data: skills, isError, refetch } = useSkills();
  const { data: links } = useAgentSkills(agent.id);
  // Both queries must have landed before anything is clickable: a toggle sends
  // the WHOLE list back, so acting on a half-loaded one would unlink the rest.
  const isLoading = skills === undefined || links === undefined;
  const setSkills = useSetAgentSkills();

  const [search, setSearch] = React.useState("");
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);

  const linkedIds = orderedSkillIds(links);
  const all = skills ?? [];
  // Positions are computed over the full list, then the filter is applied to
  // the rows — so searching never renumbers the prompt order on screen.
  const rows = buildRows(all, linkedIds).filter((row) =>
    filterByName([row.skill], search).length > 0,
  );
  const attached = rows.filter((row) => row.position !== null);
  const available = rows.filter((row) => row.position === null);

  const commit = (ids: string[]) => setSkills.mutate({ agentId: agent.id, skillIds: ids });

  const toggle = (id: string, on: boolean) =>
    commit(on ? [...linkedIds, id] : linkedIds.filter((linked) => linked !== id));

  const drop = (targetId: string) => {
    if (dragId) commit(moveSkill(linkedIds, dragId, targetId));
    setDragId(null);
    setOverId(null);
  };

  if (isLoading) {
    return (
      <div style={s.wrap}>
        <Skeleton height={44} />
        <div style={{ height: 8 }} />
        <Skeleton height={44} />
      </div>
    );
  }
  if (isError) {
    return (
      <div style={s.wrap}>
        <ErrorState body={t("skills.loadError")} onRetry={() => refetch()} />
      </div>
    );
  }

  const renderRow = (skill: (typeof all)[number], position: number | null) => {
    const draggable = position !== null;
    return (
      <div
        key={skill.id}
        draggable={draggable}
        onDragStart={draggable ? () => setDragId(skill.id) : undefined}
        onDragEnd={() => {
          setDragId(null);
          setOverId(null);
        }}
        onDragOver={
          draggable
            ? (e) => {
                // Only an attached row is a valid drop target; preventDefault
                // is what tells the browser the drop is allowed.
                if (dragId && dragId !== skill.id) {
                  e.preventDefault();
                  setOverId(skill.id);
                }
              }
            : undefined
        }
        onDrop={draggable ? () => drop(skill.id) : undefined}
        data-testid={`skill-row-${skill.id}`}
        style={s.row(draggable, dragId === skill.id, overId === skill.id)}
      >
        <span
          style={s.handle(draggable)}
          title={draggable ? t("skills.dragHandle") : t("skills.dragDisabled")}
          aria-label={draggable ? t("skills.dragHandle") : t("skills.dragDisabled")}
        >
          <Icon.Menu size={14} />
        </span>
        <span className="mono" style={s.position}>
          {position ?? "—"}
        </span>
        <div style={s.main}>
          <div style={s.nameRow}>
            <span style={s.name}>{skill.name}</span>
            {/* Rubric label — which kind of knowledge this is. */}
            <Badge color={TYPE_TONE[skill.type]} bg="transparent">
              {skill.type}
            </Badge>
            <span className="mono" style={s.description}>
              v{skill.version}
            </span>
          </div>
          <div style={s.description}>{skill.description}</div>
        </div>
        <div style={s.toggleCell}>
          <Toggle
            on={position !== null}
            onChange={(on) => toggle(skill.id, on)}
            size={16}
          />
          <span style={s.toggleLabel}>
            {position !== null ? t("skills.on") : t("skills.off")}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <h2 style={s.h2}>{t("skills.title")}</h2>
        <span style={s.count}>
          {t("skills.enabledCount", { linked: linkedIds.length, total: all.length })}
        </span>
        <div style={s.search}>
          <Icon.Search size={13} style={s.searchIcon} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("skills.filterPlaceholder")}
            aria-label={t("skills.filterPlaceholder")}
            style={s.searchInput}
          />
        </div>
      </div>
      <p style={s.hint}>{t("skills.orderHint")}</p>

      <div style={s.sectionLabel}>{t("skills.attachedHeading")}</div>
      {attached.length === 0 ? (
        <EmptyState icon="Sparkles" title={t("skills.emptyAttachedTitle")} body={t("skills.emptyAttachedBody")} />
      ) : (
        <div style={s.list}>{attached.map((row) => renderRow(row.skill, row.position))}</div>
      )}

      <div style={s.sectionLabel}>{t("skills.availableHeading")}</div>
      {available.length === 0 ? (
        <p style={s.hint}>{t("skills.emptyAvailable")}</p>
      ) : (
        <div style={s.list}>{available.map((row) => renderRow(row.skill, null))}</div>
      )}
    </div>
  );
}
