import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Agent, SkillSummary } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/agents.json";

const setSkills = vi.fn();

vi.mock("@/lib/hooks/skills", () => ({
  useSkills: () => ({ data: SKILLS, isLoading: false, isError: false, refetch: vi.fn() }),
  useAgentSkills: () => ({
    data: [
      { skill_id: "s2", order: 1 },
      { skill_id: "s1", order: 0 },
    ],
  }),
  useSetAgentSkills: () => ({ mutate: setSkills, isPending: false }),
}));

import { SkillsTab } from "./SkillsTab";

afterEach(() => {
  cleanup();
  setSkills.mockClear();
});

const skill = (id: string, name: string, type: SkillSummary["type"]): SkillSummary => ({
  id,
  name,
  description: `${name} description`,
  type,
  body: "body",
  enabled: true,
  source: "manual",
  version: 1,
  agent_count: 1,
});

const SKILLS: SkillSummary[] = [
  skill("s1", "Secrets rubric", "security"),
  skill("s2", "Naming conventions", "convention"),
  skill("s3", "Test quality", "rubric"),
];

const AGENT: Agent = {
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
};

function renderTab() {
  return render(
    <NextIntlClientProvider locale="en" messages={{ agents: messages }}>
      <SkillsTab agent={AGENT} />
    </NextIntlClientProvider>,
  );
}

describe("Agent editor — Skills tab", () => {
  it("lists every skill in the system, attached ones first in prompt order", () => {
    renderTab();
    expect(screen.getByText("2 of 3 enabled")).toBeInTheDocument();
    const rows = screen.getAllByTestId(/^skill-row-/);
    expect(rows.map((r) => r.dataset.testid)).toEqual([
      "skill-row-s1",
      "skill-row-s2",
      "skill-row-s3",
    ]);
    // The rubric label of each skill is visible next to its name.
    expect(screen.getByText("security")).toBeInTheDocument();
    expect(screen.getByText("convention")).toBeInTheDocument();
    expect(screen.getByText("rubric")).toBeInTheDocument();
  });

  it("makes only attached rows draggable", () => {
    renderTab();
    expect(screen.getByTestId("skill-row-s1")).toHaveAttribute("draggable", "true");
    expect(screen.getByTestId("skill-row-s2")).toHaveAttribute("draggable", "true");
    expect(screen.getByTestId("skill-row-s3")).toHaveAttribute("draggable", "false");
  });

  it("filters the list by name", () => {
    renderTab();
    fireEvent.change(screen.getByLabelText("Filter skills…"), { target: { value: "naming" } });
    const rows = screen.getAllByTestId(/^skill-row-/);
    expect(rows.map((r) => r.dataset.testid)).toEqual(["skill-row-s2"]);
  });

  it("saves the new order when one attached row is dropped on another", () => {
    renderTab();
    const first = screen.getByTestId("skill-row-s1");
    const second = screen.getByTestId("skill-row-s2");
    fireEvent.dragStart(first);
    fireEvent.dragOver(second);
    fireEvent.drop(second);
    expect(setSkills).toHaveBeenCalledWith({ agentId: "ag1", skillIds: ["s2", "s1"] });
  });

  it("attaches a skill at the end of the prompt order when toggled on", () => {
    renderTab();
    const row = screen.getByTestId("skill-row-s3");
    fireEvent.click(row.querySelector("[role=switch]")!);
    expect(setSkills).toHaveBeenCalledWith({ agentId: "ag1", skillIds: ["s1", "s2", "s3"] });
  });
});
