/* /skills/:id — one skill, three tabs.
   Config edits it, Preview renders the body the way the agent will read it,
   Versioning is the history: every body that was ever live, with a diff against
   the current one and a restore that moves forward rather than rewinding. */
"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Badge,
  Button,
  ErrorState,
  FormField,
  Markdown,
  SelectInput,
  Skeleton,
  Tabs,
  Textarea,
  TextInput,
  Toggle,
} from "@devdigest/ui";
import type { SkillType } from "@devdigest/shared";
import { AppShell } from "@/components/app-shell";
import {
  useRestoreSkillVersion,
  useSkill,
  useSkillVersions,
  useUpdateSkill,
} from "@/lib/hooks/skills";
import { SKILL_TYPE_OPTIONS } from "../../../_components/SkillFormModal/constants";
import { VersionRow } from "../VersionRow";
import { TABS } from "./constants";
import { s } from "./styles";

export function SkillDetailView({ id }: { id: string }) {
  const t = useTranslations("skills");
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get("tab") ?? "config";

  const { data: skill, isLoading, isError, refetch } = useSkill(id);
  const { data: versions } = useSkillVersions(id);
  const update = useUpdateSkill();
  const restore = useRestoreSkillVersion();

  // Draft state for the Config tab — seeded once the skill arrives.
  const [draft, setDraft] = React.useState<{
    name: string;
    description: string;
    type: SkillType;
    body: string;
  } | null>(null);
  React.useEffect(() => {
    if (skill && draft === null) {
      setDraft({
        name: skill.name,
        description: skill.description,
        type: skill.type,
        body: skill.body,
      });
    }
  }, [skill, draft]);

  const setTab = (next: string) => router.replace(`/skills/${id}?tab=${next}`);

  if (isError) {
    return (
      <AppShell crumb={[{ label: t("breadcrumbLab") }, { label: t("title") }]}>
        <div style={s.page}>
          <ErrorState title={t("error.title")} body={t("error.body")} onRetry={() => refetch()} />
        </div>
      </AppShell>
    );
  }

  if (isLoading || !skill || !draft) {
    return (
      <AppShell crumb={[{ label: t("breadcrumbLab") }, { label: t("title") }]}>
        <div style={s.page}>
          <Skeleton height={160} />
        </div>
      </AppShell>
    );
  }

  const dirty =
    draft.name !== skill.name ||
    draft.description !== skill.description ||
    draft.type !== skill.type ||
    draft.body !== skill.body;

  return (
    <AppShell
      crumb={[{ label: t("breadcrumbLab") }, { label: t("title"), href: "/skills" }, { label: skill.name }]}
    >
      <div style={s.page}>
        <div style={s.header}>
          <div style={s.headerText}>
            <h1 style={s.h1}>{skill.name}</h1>
            <p style={s.subtitle}>{skill.description}</p>
          </div>
          <div style={s.headerMeta}>
            <Badge color="var(--accent)" bg="transparent">
              {skill.type}
            </Badge>
            <span className="mono" style={s.version}>
              v{skill.version}
            </span>
            <span style={s.agents}>{t("card.agents", { count: skill.agent_count })}</span>
            <Toggle
              on={skill.enabled}
              onChange={(enabled) => update.mutate({ id, patch: { enabled } })}
              size={16}
            />
          </div>
        </div>

        <Tabs tabs={TABS.map((key) => ({ key, label: t(`detail.tabs.${key}`) }))} value={tab} onChange={setTab} />

        {tab === "config" && (
          <div style={s.panel}>
            <FormField label={t("form.name")}>
              <TextInput value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
            </FormField>
            <FormField label={t("form.description")} hint={t("form.descriptionHint")}>
              <Textarea
                value={draft.description}
                onChange={(description) => setDraft({ ...draft, description })}
                rows={3}
              />
            </FormField>
            <FormField label={t("form.type")}>
              <SelectInput
                value={draft.type}
                onChange={(value) => setDraft({ ...draft, type: value as SkillType })}
                options={SKILL_TYPE_OPTIONS}
                mono={false}
              />
            </FormField>
            <FormField label={t("form.body")} hint={t("detail.bodyHint")}>
              <Textarea value={draft.body} onChange={(body) => setDraft({ ...draft, body })} rows={18} mono />
            </FormField>
            <div style={s.actions}>
              <Button kind="ghost" size="sm" disabled={!dirty} onClick={() => setDraft(null)}>
                {t("detail.revert")}
              </Button>
              <Button
                kind="primary"
                size="sm"
                disabled={!dirty || update.isPending}
                onClick={() => update.mutate({ id, patch: draft })}
              >
                {update.isPending ? t("form.saving") : t("form.save")}
              </Button>
            </div>
          </div>
        )}

        {tab === "preview" && (
          <div style={s.panel} data-testid="skill-preview-rendered">
            {/* Rendered, not raw: this is the shape a reader judges the skill by. */}
            <Markdown>{skill.body}</Markdown>
          </div>
        )}

        {tab === "versioning" && (
          <div style={s.panel} data-testid="skill-versions">
            {(versions ?? []).length === 0 ? (
              <p style={s.empty}>{t("detail.noVersions")}</p>
            ) : (
              (versions ?? []).map((version) => (
                <VersionRow
                  key={version.version}
                  version={version}
                  currentBody={skill.body}
                  restoring={restore.isPending}
                  onRestore={() => restore.mutate({ id, version: version.version })}
                />
              ))
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
