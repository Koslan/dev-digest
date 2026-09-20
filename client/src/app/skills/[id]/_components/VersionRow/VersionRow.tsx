/* One entry of a skill's history: what it was, how it differs from what is live
   now, and a way back to it. Restore moves forward — it writes the old body as
   a new version rather than erasing the ones after it. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Button } from "@devdigest/ui";
import type { SkillVersionRecord } from "@devdigest/shared";
import { diffLines } from "./helpers";
import { s } from "./styles";

export function VersionRow({
  version,
  currentBody,
  restoring,
  onRestore,
}: {
  version: SkillVersionRecord;
  currentBody: string;
  restoring?: boolean;
  onRestore: () => void;
}) {
  const t = useTranslations("skills");
  const [showDiff, setShowDiff] = React.useState(false);
  const diff = React.useMemo(
    () => (showDiff ? diffLines(version.body, currentBody) : []),
    [showDiff, version.body, currentBody],
  );

  return (
    <div style={s.row}>
      <div style={s.head}>
        <span className="mono" style={s.version}>
          v{version.version}
        </span>
        {version.current && (
          <Badge color="var(--ok)" bg="transparent">
            {t("detail.currentVersion")}
          </Badge>
        )}
        <span style={s.date}>
          {version.created_at ? new Date(version.created_at).toLocaleString() : ""}
        </span>
        <span style={{ flex: 1 }} />
        {/* Diff and restore only make sense against a different body. */}
        {!version.current && (
          <>
            <Button kind="ghost" size="sm" onClick={() => setShowDiff((open) => !open)}>
              {showDiff ? t("detail.hideDiff") : t("detail.diff")}
            </Button>
            <Button kind="secondary" size="sm" disabled={restoring} onClick={onRestore}>
              {t("detail.restore")}
            </Button>
          </>
        )}
      </div>

      {showDiff && (
        <pre className="mono" style={s.diff} data-testid={`diff-${version.version}`}>
          {diff.map((line, i) => (
            <div key={i} style={s.diffLine(line.kind)}>
              {line.kind === "added" ? "+ " : line.kind === "removed" ? "- " : "  "}
              {line.text || " "}
            </div>
          ))}
        </pre>
      )}
    </div>
  );
}
