/* Create-skill modal. The accepted conventions are already assembled into a
   body server-side; this is where a human reads that body, fixes the wording,
   and decides which agent starts using it. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, FormField, Modal, SelectInput, TextInput, Textarea } from "@devdigest/ui";
import { useAgents } from "@/lib/hooks/agents";
import { useConventionDraft, useCreateConventionSkill } from "@/lib/hooks/conventions";
import { useToast } from "@/lib/toast";
import { CONVENTIONS_SKILL_NAME } from "../../constants";
import { s } from "./styles";

const NO_AGENT = "";

export function CreateSkillModal({
  repoId,
  repoName,
  acceptedCount,
  onClose,
}: {
  repoId: string;
  repoName: string;
  acceptedCount: number;
  onClose: () => void;
}) {
  const t = useTranslations("conventions");
  const toast = useToast();
  const { data: draft } = useConventionDraft(repoId, true);
  const { data: agents } = useAgents();
  const create = useCreateConventionSkill(repoId);

  const [name, setName] = React.useState(CONVENTIONS_SKILL_NAME);
  const [description, setDescription] = React.useState(
    t("createModal.descriptionDefault", { repo: repoName }),
  );
  const [body, setBody] = React.useState("");
  const [agentId, setAgentId] = React.useState(NO_AGENT);
  // The draft arrives after the modal opens; adopt it once, then leave the
  // textarea alone so a refetch never overwrites what is being typed.
  const [bodyTouched, setBodyTouched] = React.useState(false);
  React.useEffect(() => {
    if (!bodyTouched && draft?.body) setBody(draft.body);
  }, [draft?.body, bodyTouched]);

  const agentOptions = [
    { value: NO_AGENT, label: t("createModal.agentNone") },
    ...(agents ?? []).map((a) => ({ value: a.id, label: a.name })),
  ];

  const submit = () =>
    create.mutate(
      {
        name: name.trim(),
        description: description.trim(),
        body,
        ...(agentId ? { agent_id: agentId } : {}),
      },
      {
        onSuccess: (skill) => {
          toast.success(t("createModal.created", { name: skill.name }));
          onClose();
        },
      },
    );

  return (
    <Modal
      width={720}
      title={t("createModal.title")}
      onClose={onClose}
      footer={
        <div style={s.footer}>
          <Button kind="ghost" size="sm" onClick={onClose}>
            {t("createModal.cancel")}
          </Button>
          <Button
            kind="primary"
            size="sm"
            icon="Check"
            disabled={create.isPending || !name.trim() || !description.trim() || !body.trim()}
            onClick={submit}
          >
            {create.isPending ? t("createModal.creating") : t("createModal.create")}
          </Button>
        </div>
      }
    >
      <div style={s.body}>
        <p style={s.intro}>{t("createModal.intro", { count: acceptedCount })}</p>
        <FormField label={t("createModal.name")} required>
          <TextInput value={name} onChange={setName} />
        </FormField>
        <FormField label={t("createModal.description")} required>
          <TextInput value={description} onChange={setDescription} />
        </FormField>
        <FormField label={t("createModal.agent")}>
          <SelectInput value={agentId} onChange={setAgentId} options={agentOptions} />
        </FormField>
        <FormField label={t("createModal.body")} hint={t("createModal.bodyHint")}>
          <Textarea
            value={body}
            onChange={(v) => {
              setBodyTouched(true);
              setBody(v);
            }}
            rows={14}
            mono
          />
        </FormField>
      </div>
    </Modal>
  );
}
