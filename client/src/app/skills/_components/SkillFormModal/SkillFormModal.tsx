/* Create or edit a skill. The description field carries a hint on purpose: it
   is the skill's interface — the text the model reads when deciding whether the
   skill applies — not a human-facing summary. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, FormField, Modal, SelectInput, Textarea, TextInput } from "@devdigest/ui";
import type { SkillInput, SkillType } from "@devdigest/shared";
import { useCreateSkill, useUpdateSkill } from "@/lib/hooks/skills";
import { SKILL_TYPE_OPTIONS } from "./constants";

export function SkillFormModal({
  onClose,
  initial,
  skillId,
  imported,
  onSaved,
}: {
  onClose: () => void;
  /** Prefilled values — an edit, or the parsed core of an import. */
  initial?: Partial<SkillInput>;
  /** Present for an edit; absent for a create. */
  skillId?: string;
  /** Marks provenance when saving a parsed upload. */
  imported?: boolean;
  onSaved?: (id: string) => void;
}) {
  const t = useTranslations("skills");
  const create = useCreateSkill();
  const update = useUpdateSkill();

  const [name, setName] = React.useState(initial?.name ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [type, setType] = React.useState<SkillType>(initial?.type ?? "custom");
  const [body, setBody] = React.useState(initial?.body ?? "");

  const pending = create.isPending || update.isPending;
  const complete = name.trim() && description.trim() && body.trim();

  const submit = () => {
    if (!complete || pending) return;
    const input: SkillInput = { name: name.trim(), description: description.trim(), type, body };
    if (skillId) {
      update.mutate({ id: skillId, patch: input }, { onSuccess: () => { onSaved?.(skillId); onClose(); } });
    } else {
      create.mutate(
        { input, imported },
        { onSuccess: (skill) => { onSaved?.(skill.id); onClose(); } },
      );
    }
  };

  return (
    <Modal
      width={760}
      title={skillId ? t("form.editTitle") : t("form.createTitle")}
      subtitle={t("form.subtitle")}
      onClose={onClose}
      footer={
        <>
          <Button kind="ghost" size="sm" onClick={onClose}>
            {t("form.cancel")}
          </Button>
          <Button kind="primary" size="sm" disabled={!complete || pending} onClick={submit}>
            {pending ? t("form.saving") : skillId ? t("form.save") : t("form.create")}
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <FormField label={t("form.name")} required>
          <TextInput value={name} onChange={setName} placeholder={t("form.namePlaceholder")} />
        </FormField>

        <FormField label={t("form.description")} hint={t("form.descriptionHint")} required>
          <Textarea
            value={description}
            onChange={setDescription}
            rows={3}
            placeholder={t("form.descriptionPlaceholder")}
          />
        </FormField>

        <FormField label={t("form.type")}>
          <SelectInput
            value={type}
            onChange={(value) => setType(value as SkillType)}
            options={SKILL_TYPE_OPTIONS}
            mono={false}
          />
        </FormField>

        <FormField label={t("form.body")} hint={t("form.bodyHint")} required>
          <Textarea value={body} onChange={setBody} rows={14} mono placeholder={t("form.bodyPlaceholder")} />
        </FormField>
      </div>
    </Modal>
  );
}
