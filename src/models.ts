/** Common chat models for the Blueprint's key-only providers. */
export const MODEL_OPTIONS = [
  {
    group: "OpenAI",
    models: [
      { id: "openai:gpt-4o-mini", label: "gpt-4o-mini" },
      { id: "openai:gpt-4o", label: "gpt-4o" },
      { id: "openai:gpt-4.1-mini", label: "gpt-4.1-mini" },
    ],
  },
  {
    group: "Anthropic",
    models: [
      { id: "anthropic:claude-sonnet-4-6", label: "claude-sonnet-4-6" },
      { id: "anthropic:claude-haiku-4-5", label: "claude-haiku-4-5" },
    ],
  },
  {
    group: "Mistral",
    models: [
      { id: "mistral:mistral-small-latest", label: "mistral-small-latest" },
      { id: "mistral:mistral-large-latest", label: "mistral-large-latest" },
    ],
  },
  {
    group: "Gemini",
    models: [
      { id: "gemini:gemini-2.0-flash", label: "gemini-2.0-flash" },
      { id: "gemini:gemini-2.5-flash", label: "gemini-2.5-flash" },
    ],
  },
] as const;

export const DEFAULT_MODEL = "openai:gpt-4o-mini";
