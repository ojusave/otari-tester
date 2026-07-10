/** Suggested chat models when Otari `/v1/models` is empty. */
export const MODEL_OPTIONS = [
  {
    group: "OpenAI",
    models: [
      { id: "openai:gpt-4.1-mini", label: "gpt-4.1-mini" },
      { id: "openai:gpt-4.1", label: "gpt-4.1" },
      { id: "openai:gpt-4o-mini", label: "gpt-4o-mini" },
      { id: "openai:gpt-4o", label: "gpt-4o" },
      { id: "openai:o4-mini", label: "o4-mini" },
      { id: "openai:o3-mini", label: "o3-mini" },
    ],
  },
  {
    group: "Anthropic",
    models: [
      { id: "anthropic:claude-opus-4-6", label: "claude-opus-4-6" },
      { id: "anthropic:claude-sonnet-4-6", label: "claude-sonnet-4-6" },
      { id: "anthropic:claude-haiku-4-5", label: "claude-haiku-4-5" },
    ],
  },
  {
    group: "Mistral",
    models: [
      { id: "mistral:mistral-small-latest", label: "mistral-small-latest" },
      { id: "mistral:mistral-medium-latest", label: "mistral-medium-latest" },
      { id: "mistral:mistral-large-latest", label: "mistral-large-latest" },
      { id: "mistral:codestral-latest", label: "codestral-latest" },
    ],
  },
  {
    group: "Gemini",
    models: [
      { id: "gemini:gemini-2.5-flash", label: "gemini-2.5-flash" },
      { id: "gemini:gemini-2.5-pro", label: "gemini-2.5-pro" },
      { id: "gemini:gemini-2.0-flash", label: "gemini-2.0-flash" },
    ],
  },
] as const;

export const DEFAULT_MODEL = "openai:gpt-4.1-mini";
