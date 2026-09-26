import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../../../../../messages/en/settings.json";

const updateSettings = vi.fn();
const stored: { feature_models: Record<string, { provider: string; model: string }> } = {
  feature_models: {},
};

vi.mock("../../../../../../../lib/hooks", () => ({
  useSettings: () => ({ data: stored }),
  useUpdateSettings: () => ({ mutate: updateSettings }),
}));
vi.mock("../../../../../../../lib/hooks/agents", () => ({
  useProviderModels: (provider: string) => ({
    data:
      provider === "anthropic"
        ? [{ id: "claude-haiku-4-5-20251001", provider }]
        : provider === "openai"
          ? [{ id: "gpt-4.1", provider }]
          : [{ id: "deepseek/deepseek-v4-flash", provider }],
  }),
}));

import { SettingsModels } from "./SettingsModels";

afterEach(() => {
  cleanup();
  updateSettings.mockClear();
  stored.feature_models = {};
});

function renderSection() {
  return render(
    <NextIntlClientProvider locale="en" messages={{ settings: messages }}>
      <SettingsModels />
    </NextIntlClientProvider>,
  );
}

describe("Settings → Feature Models", () => {
  it("shows a row per system feature, including conventions", () => {
    renderSection();
    expect(screen.getByText("Conventions")).toBeInTheDocument();
    expect(screen.getByText("Extracts coding conventions from the repo.")).toBeInTheDocument();
    // Untouched features are flagged as still on their registry default.
    expect(screen.getAllByText("default").length).toBeGreaterThan(0);
  });

  it("stores the provider with the model instead of assuming OpenRouter", () => {
    renderSection();
    // The Conventions row is the last one in the registry.
    const providerSelects = screen.getAllByRole("combobox");
    fireEvent.change(providerSelects[providerSelects.length - 1]!, {
      target: { value: "anthropic" },
    });
    expect(updateSettings).toHaveBeenCalledWith({
      feature_models: {
        conventions: { provider: "anthropic", model: "claude-haiku-4-5-20251001" },
      },
    });
  });

  it("keeps a stored choice visible on its own provider", () => {
    stored.feature_models = {
      conventions: { provider: "anthropic", model: "claude-haiku-4-5-20251001" },
    };
    renderSection();
    expect(screen.getByText("claude-haiku-4-5-20251001")).toBeInTheDocument();
  });
});
