import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ConventionRecord } from "@devdigest/shared";
import messages from "../../../../../messages/en/conventions.json";

const patchMutate = vi.fn();
const scanMutate = vi.fn();
const served: { candidates: ConventionRecord[] } = { candidates: [] };

vi.mock("@/components/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/lib/repo-context", () => ({
  useActiveRepo: () => ({ repoId: "r1", activeRepo: { id: "r1", name: "dev-digest" } }),
}));
vi.mock("@/lib/hooks/conventions", () => ({
  useConventions: () => ({
    data: served.candidates,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useExtractConventions: () => ({ mutate: scanMutate, isPending: false, isError: false }),
  usePatchConvention: () => ({ mutate: patchMutate, isPending: false }),
}));

import { ConventionsView } from "./ConventionsView";

const candidate = (
  id: string,
  rule: string,
  status: ConventionRecord["status"],
): ConventionRecord => ({
  id,
  repo_id: "r1",
  category: "naming",
  rule,
  evidence_path: "server/src/modules/agents/routes.ts",
  evidence_line: 42,
  evidence_snippet: "app.get('/agents', …)",
  confidence: 0.8,
  status,
  edited: false,
  created_at: null,
});

afterEach(() => {
  cleanup();
  patchMutate.mockClear();
  scanMutate.mockClear();
  served.candidates = [];
});

function renderView() {
  return render(
    <NextIntlClientProvider locale="en" messages={{ conventions: messages }}>
      <ConventionsView />
    </NextIntlClientProvider>,
  );
}

describe("Conventions page", () => {
  it("offers Run Scan before anything was scanned, and ReScan only after", () => {
    renderView();
    // Two carry the label before a scan: the toolbar button and the empty-state CTA.
    expect(screen.getAllByRole("button", { name: "Run Scan" })[0]).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "ReScan" })).toBeDisabled();

    cleanup();
    served.candidates = [candidate("c1", "Route handlers delegate to a service", "pending")];
    renderView();
    expect(screen.getByRole("button", { name: "Run Scan" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "ReScan" })).not.toBeDisabled();
  });

  it("shows the rule, its source file and its confidence on each card", () => {
    served.candidates = [candidate("c1", "Route handlers delegate to a service", "pending")];
    renderView();
    expect(screen.getByText("Route handlers delegate to a service")).toBeInTheDocument();
    expect(screen.getByText("server/src/modules/agents/routes.ts:42")).toBeInTheDocument();
    expect(screen.getByText(/Confidence 80%/)).toBeInTheDocument();
  });

  it("rejects a candidate and keeps it out of the main list", () => {
    served.candidates = [
      candidate("c1", "Route handlers delegate to a service", "pending"),
      candidate("c2", "Tests live next to the code they cover", "rejected"),
    ];
    renderView();
    expect(screen.queryByText("Tests live next to the code they cover")).not.toBeInTheDocument();
    expect(screen.getByText("1 rejected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(patchMutate).toHaveBeenCalledWith({ id: "c1", patch: { status: "rejected" } });
  });

  it("offers Create skill only once a candidate is accepted", () => {
    served.candidates = [candidate("c1", "Route handlers delegate to a service", "pending")];
    renderView();
    expect(screen.queryByRole("button", { name: "Create skill" })).not.toBeInTheDocument();

    cleanup();
    served.candidates = [candidate("c1", "Route handlers delegate to a service", "accepted")];
    renderView();
    expect(screen.getByRole("button", { name: "Create skill" })).toBeInTheDocument();
  });

  it("edits a rule in place", () => {
    served.candidates = [candidate("c1", "Route handlers delegate to a service", "pending")];
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const box = screen.getByDisplayValue("Route handlers delegate to a service");
    fireEvent.change(box, { target: { value: "Route handlers never query the database" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(patchMutate).toHaveBeenCalledWith({
      id: "c1",
      patch: { rule: "Route handlers never query the database", category: "naming" },
    });
  });
});
