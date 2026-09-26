/* Import a skill from a .md file or a .zip archive.
   Two steps, deliberately: the server parses the upload and returns a preview,
   and only a human accepting that preview turns it into a stored skill. A
   foreign skill is somebody else's instructions inside our agent's system
   prompt — the archive's other files are listed, never read, never executed. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Modal } from "@devdigest/ui";
import type { SkillImportPreview } from "@devdigest/shared";
import { useCreateSkill, useImportPreview } from "@/lib/hooks/skills";
import { readFileAsBase64 } from "./helpers";
import { ACCEPTED_EXTENSIONS } from "./constants";
import { s } from "./styles";

export function SkillImportModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations("skills");
  const parse = useImportPreview();
  const create = useCreateSkill();

  const [preview, setPreview] = React.useState<SkillImportPreview | null>(null);
  const [filename, setFilename] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setFilename(file.name);
    try {
      const content_base64 = await readFileAsBase64(file);
      const parsed = await parse.mutateAsync({ filename: file.name, content_base64 });
      setPreview(parsed);
    } catch (err) {
      setPreview(null);
      setError((err as Error).message);
    }
  };

  const save = () => {
    if (!preview) return;
    create.mutate(
      {
        input: {
          name: preview.name,
          description: preview.description,
          type: preview.type,
          body: preview.body,
        },
        imported: true,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      width={760}
      title={t("import.title")}
      subtitle={t("import.subtitle")}
      onClose={onClose}
      footer={
        <>
          <Button kind="ghost" size="sm" onClick={onClose}>
            {t("form.cancel")}
          </Button>
          <Button
            kind="primary"
            size="sm"
            disabled={!preview || create.isPending}
            onClick={save}
          >
            {create.isPending ? t("form.saving") : t("import.save")}
          </Button>
        </>
      }
    >
      <div style={s.wrap}>
        <label style={s.drop}>
          <input
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            style={{ display: "none" }}
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <span style={s.dropTitle}>{filename ?? t("import.choose")}</span>
          <span style={s.dropHint}>{t("import.accepts")}</span>
        </label>

        {parse.isPending && <div style={s.note}>{t("import.parsing")}</div>}
        {error && <div style={s.error}>{error}</div>}

        {preview && (
          <div style={s.preview} data-testid="import-preview">
            <div style={s.previewHead}>
              <span style={s.previewName}>{preview.name}</span>
              <Badge color="var(--info)" bg="transparent">
                {preview.type}
              </Badge>
              <span className="mono" style={s.origin}>
                {preview.origin}
              </span>
            </div>
            <div style={s.previewDescription}>{preview.description}</div>

            {preview.warnings.length > 0 && (
              <ul style={s.warnings}>
                {preview.warnings.map((warning: string) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}

            {preview.ignored.length > 0 && (
              <details style={s.ignored}>
                <summary style={s.ignoredSummary}>
                  {t("import.ignored", { count: preview.ignored.length })}
                </summary>
                <ul style={s.ignoredList}>
                  {preview.ignored.map((name: string) => (
                    <li key={name} className="mono">
                      {name}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div style={s.label}>{t("import.bodyPreview")}</div>
            <pre className="mono" style={s.body}>
              {preview.body}
            </pre>
          </div>
        )}
      </div>
    </Modal>
  );
}
