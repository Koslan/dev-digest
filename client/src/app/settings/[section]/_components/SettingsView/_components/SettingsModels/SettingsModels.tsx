"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { FormField, SearchableSelect, SelectInput, Icon } from "@devdigest/ui";
import { useSettings, useUpdateSettings } from "../../../../../../../lib/hooks";
import { useProviderModels } from "../../../../../../../lib/hooks/agents";
import { toModelOptions } from "../../../../../../../lib/model-label";
import { FEATURE_MODELS } from "../../../../../../../lib/feature-models";
import type { FeatureModelChoice, FeatureModelId, Provider } from "../../../../../../../lib/types";
import { SectionTitle } from "../SectionTitle";
import { PROVIDER_OPTIONS } from "./constants";
import { s } from "./styles";

/**
 * Settings → Feature Models. One picker per system LLM feature: which provider,
 * then which of that provider's models. Both persist to `settings.feature_models`,
 * and a feature falls back to its registry default until one is picked.
 *
 * The provider is part of the choice, not a constant: a workspace that only has
 * an Anthropic key must still be able to point a feature at a model it can
 * actually call.
 */
export function SettingsModels() {
  const t = useTranslations("settings");
  const { data: settings } = useSettings();
  const update = useUpdateSettings();

  // One query per provider, at the top level — a hook cannot be called per row.
  const openai = useProviderModels("openai");
  const anthropic = useProviderModels("anthropic");
  const openrouter = useProviderModels("openrouter");
  const byProvider: Record<Provider, typeof openai> = { openai, anthropic, openrouter };

  const chosen = (settings?.feature_models ?? {}) as Partial<Record<FeatureModelId, FeatureModelChoice>>;
  const noModels = openrouter.data !== undefined && openrouter.data.length === 0;

  const setChoice = (id: FeatureModelId, choice: FeatureModelChoice) =>
    update.mutate({ feature_models: { ...chosen, [id]: choice } });

  return (
    <div style={s.wrap}>
      <SectionTitle title={t("models.title")} body={t("models.body")} />

      {FEATURE_MODELS.map((f) => {
        const current = chosen[f.id] ?? { provider: f.defaultProvider, model: f.defaultModel };
        const isDefault = !chosen[f.id];
        const models = byProvider[current.provider].data;
        const baseOptions = toModelOptions(models);
        // Keep the current value selectable even when it is not in the live list
        // (a registry default, or a provider whose key is missing).
        const options = baseOptions.some((o) => (typeof o === "string" ? o : o.value) === current.model)
          ? baseOptions
          : [current.model, ...baseOptions];
        return (
          <div key={f.id} style={s.row}>
            <FormField
              label={
                <>
                  {f.label}
                  {isDefault && <span style={s.defaultTag}>{t("models.usingDefault")}</span>}
                </>
              }
              hint={f.description}
            >
              <div style={s.pickers}>
                <div style={s.providerCell}>
                  <SelectInput
                    value={current.provider}
                    onChange={(p) => {
                      // Switching provider keeps the model only if that provider
                      // offers it; otherwise fall back to its first model.
                      const next = p as Provider;
                      const list = byProvider[next].data ?? [];
                      const keep = list.some((m) => m.id === current.model);
                      const model = keep ? current.model : (list[0]?.id ?? current.model);
                      setChoice(f.id, { provider: next, model });
                    }}
                    options={[...PROVIDER_OPTIONS]}
                  />
                </div>
                <div style={s.modelCell}>
                  <SearchableSelect
                    value={current.model}
                    onChange={(model) => setChoice(f.id, { provider: current.provider, model })}
                    options={options}
                    placeholder={t("models.search")}
                  />
                </div>
              </div>
            </FormField>
          </div>
        );
      })}

      <div style={s.note}>
        <Icon.Info size={15} style={s.noteIcon} />
        <span>{noModels ? t("models.noKeyNote") : t("models.liveNote")}</span>
      </div>
    </div>
  );
}
