import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { FindingRecord } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/prReview.json";

vi.mock("../../../../../../../lib/hooks/reviews", () => ({
  useFindingAction: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { FindingsPanel } from "./FindingsPanel";

afterEach(cleanup);

const FINDINGS: FindingRecord[] = [
  {
    id: "f1",
    severity: "CRITICAL",
    category: "security",
    title: "Hardcoded secret",
    file: "src/config.ts",
    start_line: 11,
    end_line: 11,
    rationale: "A secret is committed.",
    suggestion: null,
    confidence: 0.95,
    kind: "finding",
    trifecta_components: null,
    evidence: null,
    review_id: "r1",
    accepted_at: null,
    dismissed_at: null,
  },
];

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("FindingsPanel (smoke)", () => {
  it("renders the toolbar + a finding card", () => {
    renderWithIntl(<FindingsPanel findings={FINDINGS} prId="pr1" />);
    expect(screen.getByText("Hide low confidence")).toBeInTheDocument();
    expect(screen.getByText("Hardcoded secret")).toBeInTheDocument();
  });

  it("shows the empty state when nothing matches", () => {
    renderWithIntl(<FindingsPanel findings={[]} prId="pr1" />);
    expect(screen.getByText("No findings match")).toBeInTheDocument();
  });
});

/** One finding of the given severity, with a distinct title to assert on. */
function finding(id: string, severity: FindingRecord["severity"], title: string): FindingRecord {
  return { ...FINDINGS[0]!, id, severity, title };
}

const MIXED: FindingRecord[] = [
  finding("c1", "CRITICAL", "Critical one"),
  finding("c2", "CRITICAL", "Critical two"),
  finding("w1", "WARNING", "Warning one"),
  finding("s1", "SUGGESTION", "Suggestion one"),
];

/** Cards are the only headings-free titles; count them by their known titles. */
function visibleTitles(): string[] {
  return MIXED.map((f) => f.title).filter((title) => screen.queryByText(title) !== null);
}

describe("FindingsPanel — severity counters and filter", () => {
  it("counts each severity present, and the counts match the cards below", () => {
    renderWithIntl(<FindingsPanel findings={MIXED} prId="pr1" />);
    const counters = screen.getByTestId("severity-counts");
    expect(within(counters).getByText("2 Critical")).toBeInTheDocument();
    expect(within(counters).getByText("1 Warning")).toBeInTheDocument();
    expect(within(counters).getByText("1 Suggestion")).toBeInTheDocument();
    // 2 + 1 + 1 pills = 4 finding cards rendered below.
    expect(visibleTitles()).toHaveLength(4);
  });

  it("lists only severities the run actually produced", () => {
    renderWithIntl(<FindingsPanel findings={[finding("c1", "CRITICAL", "Only one")]} prId="pr1" />);
    const counters = screen.getByTestId("severity-counts");
    expect(within(counters).getByText("1 Critical")).toBeInTheDocument();
    expect(within(counters).queryByText(/Warning/)).not.toBeInTheDocument();
    expect(within(counters).queryByText(/Suggestion/)).not.toBeInTheDocument();
  });

  it("filters the list down to one severity, and a second click restores it", () => {
    renderWithIntl(<FindingsPanel findings={MIXED} prId="pr1" />);
    const criticalBtn = screen.getByRole("button", { name: "Critical" });

    fireEvent.click(criticalBtn);
    expect(visibleTitles()).toEqual(["Critical one", "Critical two"]);
    expect(criticalBtn).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(criticalBtn);
    expect(visibleTitles()).toHaveLength(4);
    expect(criticalBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("switching directly between filters replaces the selection", () => {
    renderWithIntl(<FindingsPanel findings={MIXED} prId="pr1" />);
    fireEvent.click(screen.getByRole("button", { name: "Critical" }));
    fireEvent.click(screen.getByRole("button", { name: "Warning" }));
    expect(visibleTitles()).toEqual(["Warning one"]);
  });

  it("disables the button of a severity this run has none of", () => {
    renderWithIntl(<FindingsPanel findings={[finding("c1", "CRITICAL", "Only one")]} prId="pr1" />);
    expect(screen.getByRole("button", { name: "Warning" })).toBeDisabled();
  });
});
