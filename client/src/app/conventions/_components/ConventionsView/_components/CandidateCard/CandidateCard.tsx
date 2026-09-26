/* One convention candidate: the rule, where it was seen, how sure the model
   was, and the three decisions a human can make about it. Edit happens in
   place — leaving the page to change a sentence is a way to lose the list. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Icon, MonoLink, SelectInput, Textarea } from "@devdigest/ui";
import type { ConventionCategory, ConventionPatch, ConventionRecord, Repo } from "@devdigest/shared";
import { CATEGORY_TONE, CATEGORY_VALUES } from "../../constants";
import { confidencePercent, evidenceLabel, evidenceUrl } from "../../helpers";
import { s } from "./styles";

export function CandidateCard({
  record,
  pending,
  onPatch,
  repo,
}: {
  record: ConventionRecord;
  pending?: boolean;
  onPatch: (patch: ConventionPatch) => void;
  /** Active repo; when set the evidence opens the file on GitHub. */
  repo?: Pick<Repo, "full_name" | "default_branch"> | null;
}) {
  const t = useTranslations("conventions");
  const [editing, setEditing] = React.useState(false);
  const [rule, setRule] = React.useState(record.rule);
  const [category, setCategory] = React.useState<ConventionCategory>(record.category);

  const tone = CATEGORY_TONE[record.category];
  const percent = confidencePercent(record.confidence);

  const startEdit = () => {
    setRule(record.rule);
    setCategory(record.category);
    setEditing(true);
  };

  const save = () => {
    onPatch({ rule: rule.trim(), category });
    setEditing(false);
  };

  return (
    <div style={s.card(record.status)} data-testid={`candidate-${record.id}`}>
      <div style={s.head}>
        <Badge color={tone} bg="transparent">
          {record.category}
        </Badge>
        {record.status === "accepted" && (
          <Badge color="var(--ok)" icon="Check">
            {t("card.accepted")}
          </Badge>
        )}
        {record.status === "rejected" && (
          <Badge color="var(--text-muted)">{t("card.rejectedLabel")}</Badge>
        )}
        {record.edited && <span style={s.editLabel}>{t("card.edited")}</span>}
        <span style={s.confidence(tone)}>
          {t("card.confidence")} {percent}%
        </span>
        <div style={s.meter}>
          <div style={s.meterFill(percent, tone)} />
        </div>
      </div>

      {editing ? (
        <div style={s.editRow}>
          <div>
            <div style={s.editLabel}>{t("card.ruleLabel")}</div>
            <Textarea value={rule} onChange={setRule} rows={3} />
          </div>
          <div>
            <div style={s.editLabel}>{t("card.categoryLabel")}</div>
            <SelectInput
              value={category}
              onChange={(v) => setCategory(v as ConventionCategory)}
              options={[...CATEGORY_VALUES]}
            />
          </div>
          <div style={s.footer}>
            <Button kind="primary" size="sm" icon="Check" disabled={!rule.trim()} onClick={save}>
              {t("card.save")}
            </Button>
            <Button kind="ghost" size="sm" onClick={() => setEditing(false)}>
              {t("card.cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div style={s.rule}>{record.rule}</div>
          <div style={s.evidence}>
            <Icon.File size={12} />
            <MonoLink href={evidenceUrl(record, repo)}>{evidenceLabel(record)}</MonoLink>
          </div>
          {record.evidence_snippet ? (
            <pre className="mono" style={s.snippet}>
              {record.evidence_snippet}
            </pre>
          ) : null}
          <div style={s.footer}>
            <Button
              kind={record.status === "accepted" ? "secondary" : "primary"}
              size="sm"
              icon="Check"
              disabled={pending || record.status === "accepted"}
              onClick={() => onPatch({ status: "accepted" })}
            >
              {t("card.accept")}
            </Button>
            <Button
              kind="ghost"
              size="sm"
              icon="X"
              disabled={pending || record.status === "rejected"}
              onClick={() => onPatch({ status: "rejected" })}
            >
              {t("card.reject")}
            </Button>
            <Button kind="ghost" size="sm" icon="Edit" disabled={pending} onClick={startEdit}>
              {t("card.edit")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
