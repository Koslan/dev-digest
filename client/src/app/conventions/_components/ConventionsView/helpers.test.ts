import { describe, it, expect } from "vitest";
import { evidenceUrl } from "./helpers";

const repo = { full_name: "Koslan/dev-digest", default_branch: "main" };

describe("evidenceUrl", () => {
  it("links the evidence file and line on GitHub", () => {
    expect(evidenceUrl({ evidence_path: "server/src/app.ts", evidence_line: 42 }, repo)).toBe(
      "https://github.com/Koslan/dev-digest/blob/main/server/src/app.ts#L42",
    );
  });
  it("links the file without a line, and gives nothing without a repo", () => {
    expect(evidenceUrl({ evidence_path: "tsconfig.json", evidence_line: null }, repo)).toBe(
      "https://github.com/Koslan/dev-digest/blob/main/tsconfig.json",
    );
    expect(evidenceUrl({ evidence_path: "a.ts", evidence_line: 1 }, null)).toBeUndefined();
  });
});
