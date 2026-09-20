/* /skills — the knowledge library. A grid of skill cards; selecting one opens
   its preview in the side panel. Adding a skill offers two paths: write one, or
   import a file and confirm what was parsed out of it. */
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Badge,
  Button,
  Dropdown,
  EmptyState,
  ErrorState,
  Icon,
  Skeleton,
  Toggle,
} from "@devdigest/ui";
import type { SkillSummary } from "@devdigest/shared";
import { AppShell } from "@/components/app-shell";
import { useDeleteSkill, useSkills, useUpdateSkill } from "@/lib/hooks/skills";
import { SkillFormModal } from "../SkillFormModal";
import { SkillImportModal } from "../SkillImportModal";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { TYPE_TONE } from "./constants";
import { filterSkills } from "./helpers";
import { s } from "./styles";

export function SkillsView() {
  const t = useTranslations("skills");
  const router = useRouter();
  const { data: skills, isLoading, isError, refetch } = useSkills();
  const update = useUpdateSkill();
  const remove = useDeleteSkill();

  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<SkillSummary | null>(null);

  const list = filterSkills(skills ?? [], search);
  const selected = (skills ?? []).find((skill) => skill.id === selectedId) ?? null;

  return (
    <AppShell crumb={[{ label: t("breadcrumbLab") }, { label: t("title") }]}>
      {creating && <SkillFormModal onClose={() => setCreating(false)} />}
      {importing && <SkillImportModal onClose={() => setImporting(false)} />}
      {pendingDelete && (
        <ConfirmDeleteModal
          title={t("delete.title")}
          body={t("delete.body", { name: pendingDelete.name })}
          confirmLabel={t("delete.confirm")}
          pending={remove.isPending}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            const id = pendingDelete.id;
            remove.mutate(id, {
              onSuccess: () => {
                if (selectedId === id) setSelectedId(null);
                setPendingDelete(null);
              },
            });
          }}
        />
      )}

      <div style={s.page}>
        <div style={s.header}>
          <div style={s.headerText}>
            <h1 style={s.h1}>{t("title")}</h1>
            <p style={s.subtitle}>{t("subtitle")}</p>
          </div>
          <div style={s.search}>
            <Icon.Search size={13} style={s.searchIcon} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              style={s.searchInput}
            />
          </div>
          <Dropdown
            width={240}
            align="right"
            trigger={
              <Button kind="primary" size="sm" icon="Plus" iconRight="ChevronDown">
                {t("add.button")}
              </Button>
            }
            items={[
              { label: t("add.create"), icon: "Edit", onClick: () => setCreating(true) },
              { label: t("add.import"), icon: "Upload", onClick: () => setImporting(true) },
            ]}
          />
        </div>

        <div style={s.body}>
          <div style={s.grid}>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={120} />)
            ) : isError ? (
              <ErrorState title={t("error.title")} body={t("error.body")} onRetry={() => refetch()} />
            ) : list.length === 0 ? (
              <EmptyState icon="Layers" title={t("empty.title")} body={t("empty.body")} />
            ) : (
              list.map((skill) => (
                <div
                  key={skill.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(skill.id)}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedId(skill.id)}
                  style={s.card(skill.id === selectedId)}
                >
                  <div style={s.cardHead}>
                    <span style={s.cardName}>{skill.name}</span>
                    <Badge color={TYPE_TONE[skill.type]} bg="transparent">
                      {skill.type}
                    </Badge>
                  </div>
                  <div style={s.cardDescription}>{skill.description}</div>
                  <div style={s.cardMeta}>
                    <span className="mono">v{skill.version}</span>
                    {/* How many agents depend on this skill — deleting it is
                        not a local decision once this is above zero. */}
                    <span>{t("card.agents", { count: skill.agent_count })}</span>
                    {skill.source === "imported" && <span>{t("card.imported")}</span>}
                  </div>
                  <div style={s.cardFooter} onClick={(e) => e.stopPropagation()}>
                    <Toggle
                      on={skill.enabled}
                      onChange={(enabled) => update.mutate({ id: skill.id, patch: { enabled } })}
                      size={16}
                    />
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {skill.enabled ? t("card.enabled") : t("card.disabled")}
                    </span>
                    <span style={{ flex: 1 }} />
                    <Button
                      kind="ghost"
                      size="sm"
                      icon="Trash"
                      onClick={() => setPendingDelete(skill)}
                    >
                      {t("card.delete")}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {selected && (
            <aside style={s.panel} data-testid="skill-preview-panel">
              <div style={s.panelHead}>
                <span style={s.panelTitle}>{selected.name}</span>
                <Badge color={TYPE_TONE[selected.type]} bg="transparent">
                  {selected.type}
                </Badge>
              </div>
              <div style={s.panelDescription}>{selected.description}</div>
              <div style={s.panelLabel}>{t("panel.body")}</div>
              <div style={s.panelBody}>{selected.body}</div>
              <div style={s.panelActions}>
                <Button
                  kind="secondary"
                  size="sm"
                  icon="ExternalLink"
                  onClick={() => router.push(`/skills/${selected.id}`)}
                >
                  {t("panel.open")}
                </Button>
                <Button kind="ghost" size="sm" onClick={() => setSelectedId(null)}>
                  {t("panel.close")}
                </Button>
              </div>
            </aside>
          )}
        </div>
      </div>
    </AppShell>
  );
}
