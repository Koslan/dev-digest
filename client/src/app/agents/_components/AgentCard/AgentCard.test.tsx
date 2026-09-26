import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AgentSummary } from "@devdigest/shared";
import messages from "../../../../../messages/en/agents.json";

const deleteAgent = vi.fn();

vi.mock("../../../../lib/hooks/agents", () => ({
  useDeleteAgent: () => ({ mutate: deleteAgent, isPending: false }),
}));

import { AgentCard } from "./AgentCard";

afterEach(() => {
  cleanup();
  deleteAgent.mockClear();
});

const AGENT: AgentSummary = {
  id: "ag1",
  name: "Security Reviewer",
  description: "Flags secrets and injection",
  provider: "openai",
  model: "gpt-4.1",
  system_prompt: "You are a security reviewer.",
  output_schema: null,
  strategy: "single-pass",
  ci_fail_on: "critical",
  repo_intel: true,
  enabled: true,
  version: 1,
  skill_count: 3,
};

function renderWithIntl(ui: React.ReactElement) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="en" messages={{ agents: messages }}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("AgentCard (smoke)", () => {
  it("renders the agent name, model chip and skill count", () => {
    renderWithIntl(<AgentCard ag={AGENT} />);
    expect(screen.getByText("Security Reviewer")).toBeInTheDocument();
    expect(screen.getByText("gpt-4.1")).toBeInTheDocument();
    expect(screen.getByText("3 skills")).toBeInTheDocument();
  });

  it("falls back to a translated placeholder when description is empty", () => {
    renderWithIntl(<AgentCard ag={{ ...AGENT, description: "" }} />);
    expect(screen.getByText("No description")).toBeInTheDocument();
  });

  it("asks for confirmation before deleting, and deletes only on confirm", () => {
    renderWithIntl(<AgentCard ag={AGENT} />);
    fireEvent.click(screen.getByLabelText("Delete agent"));
    expect(screen.getByText(/Its config history and skill links go with it/)).toBeInTheDocument();
    expect(deleteAgent).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Cancel"));
    expect(deleteAgent).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("Delete agent"));
    // Both the icon button on the tile and the modal's confirm button answer to
    // "Delete agent"; only the confirm button carries the label as its text.
    const confirm = screen
      .getAllByRole("button", { name: "Delete agent" })
      .find((b) => b.textContent === "Delete agent")!;
    fireEvent.click(confirm);
    expect(deleteAgent).toHaveBeenCalledWith("ag1", expect.anything());
  });
});
