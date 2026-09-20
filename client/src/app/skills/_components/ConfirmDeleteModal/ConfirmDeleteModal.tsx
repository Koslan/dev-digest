/* Delete confirmation. Deleting a skill unlinks it from every agent that used
   it, so the modal states the consequence rather than asking "are you sure?". */
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
