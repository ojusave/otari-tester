/**
 * Suggested models when Otari GET /v1/models is empty.
 * IDs follow Otari `provider:model` form. Updated July 2026.
 * Prefer live /v1/models whenever the gateway returns a catalog.
 */
export const MODEL_OPTIONS = [
  {
    group: "OpenAI",
    models: [
      { id: "openai:gpt-5.5", label: "gpt-5.5" },
      { id: "openai:gpt-5.6-terra", label: "gpt-5.6-terra" },
      { id: "openai:gpt-5.6-luna", label: "gpt-5.6-luna" },
      { id: "openai:gpt-5-mini", label: "gpt-5-mini" },
      { id: "openai:gpt-4.1", label: "gpt-4.1" },
      { id: "openai:gpt-4.1-mini", label: "gpt-4.1-mini" },
      { id: "openai:gpt-4o", label: "gpt-4o" },
      { id: "openai:gpt-4o-mini", label: "gpt-4o-mini" },
      { id: "openai:o4-mini", label: "o4-mini" },
      { id: "openai:o3-mini", label: "o3-mini" },
    ],
  },
  {
    group: "Anthropic",
    models: [
      { id: "anthropic:claude-fable-5", label: "claude-fable-5" },
      { id: "anthropic:claude-opus-4-8", label: "claude-opus-4-8" },
      { id: "anthropic:claude-opus-4-7", label: "claude-opus-4-7" },
      { id: "anthropic:claude-opus-4-6", label: "claude-opus-4-6" },
      { id: "anthropic:claude-sonnet-5", label: "claude-sonnet-5" },
      { id: "anthropic:claude-sonnet-4-6", label: "claude-sonnet-4-6" },
      { id: "anthropic:claude-haiku-4-5", label: "claude-haiku-4-5" },
    ],
  },
  {
    group: "Gemini",
    models: [
      { id: "gemini:gemini-3.1-pro", label: "gemini-3.1-pro" },
      { id: "gemini:gemini-3-flash", label: "gemini-3-flash" },
      { id: "gemini:gemini-2.5-pro", label: "gemini-2.5-pro" },
      { id: "gemini:gemini-2.5-flash", label: "gemini-2.5-flash" },
      { id: "gemini:gemini-2.0-flash", label: "gemini-2.0-flash" },
    ],
  },
  {
    group: "Mistral",
    models: [
      { id: "mistral:mistral-large-latest", label: "mistral-large-latest" },
      { id: "mistral:mistral-medium-latest", label: "mistral-medium-latest" },
      { id: "mistral:mistral-small-latest", label: "mistral-small-latest" },
      { id: "mistral:codestral-latest", label: "codestral-latest" },
    ],
  },
] as const;

export const DEFAULT_MODEL = "openai:gpt-5.5";
