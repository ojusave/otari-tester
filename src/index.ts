import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import {
  DEFAULT_MODEL,
  fallbackModelGroups,
  groupModels,
} from "./modelGroups.js";
import { MODEL_OPTIONS } from "./models.js";
import { OtariClient } from "./otariClient.js";
import { renderSignupUrlWithUtms } from "./renderSignup.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

const app = express();
app.use(express.json({ limit: "256kb" }));
app.use(express.static(publicDir));

app.get("/api/config", (_req, res) => {
  res.json({
    data: {
      otariBaseUrl: config.otariBaseUrl,
      hasEnvApiKey: Boolean(config.otariApiKey || config.otariMasterKey),
      githubRepo: config.githubRepo,
      /** Deploy this tester app. */
      deployUrl: `https://render.com/deploy?repo=${encodeURIComponent(config.githubRepo)}`,
      /** Deploy an Otari gateway from the Render gallery template. */
      otariTemplateDeployUrl: config.otariTemplateDeployUrl,
      otariTemplateRepo: config.otariTemplateRepo,
      signupNavbar: renderSignupUrlWithUtms("navbar_button"),
      signupHero: renderSignupUrlWithUtms("hero_cta"),
      models: MODEL_OPTIONS,
      defaultModel: DEFAULT_MODEL,
    },
  });
});

app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

function resolveApiKey(bodyKey: unknown): string {
  if (typeof bodyKey === "string" && bodyKey.trim()) return bodyKey.trim();
  return config.otariApiKey || config.otariMasterKey;
}

/** Live models from Otari `/v1/models`. Falls back to curated list on failure. */
app.post("/api/models", async (req, res) => {
  const baseUrl =
    typeof req.body?.baseUrl === "string" && req.body.baseUrl.trim()
      ? req.body.baseUrl.trim()
      : config.otariBaseUrl;
  const apiKey = resolveApiKey(req.body?.apiKey);

  if (!apiKey) {
    res.json({
      data: {
        source: "suggested",
        models: fallbackModelGroups(),
        defaultModel: DEFAULT_MODEL,
        message:
          "Suggested models — paste a gw-… key to load whatever this Otari instance lists.",
      },
      error: null,
    });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    res.status(400).json({
      data: null,
      error: { code: "bad_base_url", message: "Otari URL is not a valid URL." },
    });
    return;
  }

  const client = new OtariClient(parsed.origin, config.requestTimeoutMs);
  const listed = await client.listModels(apiKey);

  if (!listed.ok) {
    res.json({
      data: {
        source: "suggested",
        models: fallbackModelGroups(),
        defaultModel: DEFAULT_MODEL,
        message: listed.error
          ? `Could not load /v1/models (${listed.error}). Showing suggested models.`
          : "Could not load /v1/models. Showing suggested models.",
      },
      error: null,
    });
    return;
  }

  if (listed.models.length === 0) {
    res.json({
      data: {
        source: "suggested",
        models: fallbackModelGroups(),
        defaultModel: DEFAULT_MODEL,
        message:
          "Otari returned 0 models (common on env-only deploys with no pricing/discovery yet). Showing suggested models.",
        ms: listed.ms,
      },
      error: null,
    });
    return;
  }

  const groups = groupModels(listed.models);
  const ids = groups.flatMap((g) => g.models.map((m) => m.id));
  const defaultModel = ids.includes(DEFAULT_MODEL) ? DEFAULT_MODEL : ids[0];

  res.json({
    data: {
      source: "live",
      models: groups,
      defaultModel,
      count: listed.models.length,
      ms: listed.ms,
      message: `Live from Otari · ${listed.models.length} models`,
    },
    error: null,
  });
});

app.post("/api/chat", async (req, res) => {
  const baseUrl =
    typeof req.body?.baseUrl === "string" && req.body.baseUrl.trim()
      ? req.body.baseUrl.trim()
      : config.otariBaseUrl;
  const apiKey = resolveApiKey(req.body?.apiKey);
  const model =
    typeof req.body?.model === "string" && req.body.model.trim()
      ? req.body.model.trim()
      : DEFAULT_MODEL;

  const messages = normalizeMessages(req.body?.messages, req.body?.prompt);

  if (!apiKey) {
    res.status(400).json({
      data: null,
      error: {
        code: "missing_api_key",
        message: "Paste a gw-… key (or set OTARI_API_KEY on the service).",
      },
    });
    return;
  }

  if (messages.length === 0) {
    res.status(400).json({
      data: null,
      error: { code: "empty_messages", message: "Send at least one message." },
    });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    res.status(400).json({
      data: null,
      error: { code: "bad_base_url", message: "Otari URL is not a valid URL." },
    });
    return;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    res.status(400).json({
      data: null,
      error: { code: "bad_base_url", message: "Otari URL must be http(s)." },
    });
    return;
  }

  const client = new OtariClient(parsed.origin, config.requestTimeoutMs);
  const [health, readiness, chat] = await Promise.all([
    client.health(),
    client.readiness(),
    client.chat({ apiKey, model, messages }),
  ]);

  res.json({
    data: {
      baseUrl: parsed.origin,
      model,
      health,
      readiness,
      chat,
      ok: chat.ok,
    },
    error: null,
  });
});

function normalizeMessages(
  raw: unknown,
  prompt: unknown
): { role: string; content: string }[] {
  if (Array.isArray(raw)) {
    const out: { role: string; content: string }[] = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const role = (item as { role?: unknown }).role;
      const content = (item as { content?: unknown }).content;
      if (typeof role !== "string" || typeof content !== "string") continue;
      if (!content.trim()) continue;
      if (role !== "user" && role !== "assistant" && role !== "system") continue;
      out.push({ role, content: content.trim() });
    }
    if (out.length > 0) return out;
  }
  if (typeof prompt === "string" && prompt.trim()) {
    return [{ role: "user", content: prompt.trim() }];
  }
  return [];
}

app.listen(config.port, "0.0.0.0", () => {
  console.log(`otari-tester listening on 0.0.0.0:${config.port}`);
});
