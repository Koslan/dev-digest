/**
 * FindingsCell — the PR LIST's findings column. Hovering the severity icons
 * opens a read-only preview of the latest run's findings.
 *
 * Read-only is the point: accept / dismiss belong to the expanded run card on
 * the PR page, so this popover must never render an action button.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { PrFindingPreview, PrFindingsSummary } from "@/lib/types";
import messages from "../../../../../../../messages/en/prReview.json";
import { FindingsCell } from "./FindingsCell";

afterEach(cleanup);

function preview(o: Partial<PrFindingPreview> = {}): PrFindingPreview {
  return {
    id: "f1",
    severity: "CRITICAL",
    category: "security",
    title: "Hardcoded Stripe secret key",
    file: "src/config.ts",
    start_line: 11,
    end_line: 11,
    confidence: 0.98,
    rationale: "A live Stripe key is committed in source.",
    ...o,
  };
}

const SUMMARY: PrFindingsSummary = {
  run_id: "run-1",
  total: 2,
  items: [
    preview(),
    preview({
      id: "f2",
      severity: "WARNING",
      category: "perf",
      title: "N+1 query in user list endpoint",
      file: "src/api/users.ts",
      start_line: 45,
      end_line: 52,
      confidence: 0.86,
      rationale: "The endpoint queries per row under the new limiter.",
    }),
  ],
};

function renderCell(findings: PrFindingsSummary | null) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      <FindingsCell findings={findings} />
    </NextIntlClientProvider>,
  );
}

describe("FindingsCell", () => {
  it("shows one counter per severity the run produced", () => {
    renderCell(SUMMARY);
    const icons = screen.getByTestId("findings-icons");
    // One CRITICAL and one WARNING → two counters, each reading "1".
    expect(within(icons).getAllByText("1")).toHaveLength(2);
  });

  it("opens the popover on hover with the run's finding count in the title", () => {
    renderCell(SUMMARY);
    expect(screen.queryByTestId("findings-popover")).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByTestId("findings-icons"));
    const popover = screen.getByTestId("findings-popover");
    expect(within(popover).getByText("2 findings in this run")).toBeInTheDocument();
    expect(within(popover).getByText("Hardcoded Stripe secret key")).toBeInTheDocument();
    expect(within(popover).getByText("src/config.ts:11")).toBeInTheDocument();
    expect(within(popover).getByText("98% conf")).toBeInTheDocument();
    expect(
      within(popover).getByText("A live Stripe key is committed in source."),
    ).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByTestId("findings-icons"));
    expect(screen.queryByTestId("findings-popover")).not.toBeInTheDocument();
  });

  it("previews are read-only — no buttons in the popover", () => {
    renderCell(SUMMARY);
    fireEvent.mouseEnter(screen.getByTestId("findings-icons"));
    const popover = screen.getByTestId("findings-popover");
    expect(within(popover).queryAllByRole("button")).toHaveLength(0);
    expect(within(popover).queryByText("Accept")).not.toBeInTheDocument();
    expect(within(popover).queryByText("Dismiss")).not.toBeInTheDocument();
  });

  it("says how many more findings the PR page holds when previews are capped", () => {
    renderCell({ ...SUMMARY, total: 9 });
    fireEvent.mouseEnter(screen.getByTestId("findings-icons"));
    expect(screen.getByText("+7 more on the PR page")).toBeInTheDocument();
  });

  it("renders an em dash when the PR has no findings yet", () => {
    renderCell(null);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByTestId("findings-icons")).not.toBeInTheDocument();
  });
});
