import { DEFAULT_MODEL, MODEL_OPTIONS } from "./models.js";

export type ModelGroup = {
  group: string;
  models: { id: string; label: string }[];
};

/** Group OpenAI-style `provider:model` ids for the dropdown. */
export function groupModels(
  models: { id: string; owned_by?: string }[]
): ModelGroup[] {
  const byGroup = new Map<string, { id: string; label: string }[]>();

  for (const m of models) {
    const colon = m.id.indexOf(":");
    const group =
      m.owned_by?.trim() ||
      (colon > 0 ? m.id.slice(0, colon) : "other");
    const label = colon > 0 ? m.id.slice(colon + 1) : m.id;
    const list = byGroup.get(group) ?? [];
    list.push({ id: m.id, label });
    byGroup.set(group, list);
  }

  return [...byGroup.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, items]) => ({
      group,
      models: items.sort((a, b) => a.id.localeCompare(b.id)),
    }));
}

export function fallbackModelGroups(): ModelGroup[] {
  return MODEL_OPTIONS.map((g) => ({
    group: g.group,
    models: g.models.map((m) => ({ id: m.id, label: m.label })),
  }));
}

export { DEFAULT_MODEL };
