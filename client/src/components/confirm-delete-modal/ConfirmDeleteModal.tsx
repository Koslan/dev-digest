/* Delete confirmation, shared by the Skills library and the Agents grid. The
   caller passes the consequence as `body` — a delete that unlinks a skill from
   every agent, or drops an agent's history, is stated rather than asked as
   "are you sure?". */
"use client";

import React from "react";
import { Button, Modal } from "@devdigest/ui";

export function ConfirmDeleteModal({
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  pending,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      width={460}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button kind="ghost" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button kind="danger" size="sm" disabled={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--text-secondary)", margin: 0 }}>
        {body}
      </p>
    </Modal>
  );
}
