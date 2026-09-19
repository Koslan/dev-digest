/**
 * PRRow — the COST cell shows the total cost of a PR's successful runs.
 * Regression guard for "unknown rendered as free": a PR with no cost must show
 * an em dash, never "$0.00".
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { PrMeta } from "@/lib/types";
import messages from "../../../../../../../messages/en/prReview.json";
import { PRRow } from "./PRRow";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

afterEach(cleanup);

function pr(o: Partial<PrMeta> = {}): PrMeta {
  return {
    id: "pr-1",
    number: 482,
    title: "Add rate limiting to public API endpoints",
    author: "octocat",
    branch: "feat/rate-limit",
    base: "main",
    head_sha: "abc1234",
    additions: 40,
    deletions: 4,
    files_count: 3,
    status: "needs_review",
    opened_at: "2026-06-11T18:00:00.000Z",
    updated_at: "2026-06-11T18:44:34.000Z",
    score: null,
    cost_usd: null,
    ...o,
  };
}

function renderRow(meta: PrMeta) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      <PRRow pr={meta} repoId="repo-1" />
    </NextIntlClientProvider>,
  );
}

describe("PRRow — cost cell", () => {
  it("renders the summed cost of the PR's successful runs", () => {
    renderRow(pr({ cost_usd: 0.0246 }));
    expect(screen.getByText("$0.0246")).toBeInTheDocument();
  });

  it("renders an em dash when the PR has no successful run yet", () => {
    // Score set, so the only em dash in the row is the cost cell's.
    renderRow(pr({ score: 88, cost_usd: null }));
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
  });

  it("switches to two decimals once the cost passes a dollar", () => {
    renderRow(pr({ cost_usd: 1.2372 }));
    expect(screen.getByText("$1.24")).toBeInTheDocument();
  });
});
