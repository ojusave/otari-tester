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
app.use(express.json({ limit: "32kb" }));
app.use(express.static(publicDir));

app.get("/api/config", (_req, res) => {
  res.json({
    data: {
      otariBaseUrl: config.otariBaseUrl,
      hasEnvApiKey: Boolean(config.otariApiKey),
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

/** Live models from Otari `/v1/models`. Falls back to curated list on failure. */
app.post("/api/models", async (req, res) => {
  const baseUrl =
    typeof req.body?.baseUrl === "string" && req.body.baseUrl.trim()
      ? req.body.baseUrl.trim()
      : config.otariBaseUrl;
  const apiKey =
    typeof req.body?.apiKey === "string" && req.body.apiKey.trim()
      ? req.body.apiKey.trim()
      : config.otariApiKey;

  if (!apiKey) {
    res.json({
      data: {
        source: "fallback",
        models: fallbackModelGroups(),
        defaultModel: DEFAULT_MODEL,
        message: "Paste a gw-… key to load live models from Otari.",
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

  if (!listed.ok || listed.models.length === 0) {
    res.json({
      data: {
        source: "fallback",
        models: fallbackModelGroups(),
        defaultModel: DEFAULT_MODEL,
        message:
          listed.error ??
          "Live /v1/models returned nothing; showing curated defaults.",
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
    },
    error: null,
  });
});

app.post("/api/chat", async (req, res) => {
  const baseUrl =
    typeof req.body?.baseUrl === "string" && req.body.baseUrl.trim()
      ? req.body.baseUrl.trim()
      : config.otariBaseUrl;
  const apiKey =
    typeof req.body?.apiKey === "string" && req.body.apiKey.trim()
      ? req.body.apiKey.trim()
      : config.otariApiKey;
  const model =
    typeof req.body?.model === "string" && req.body.model.trim()
      ? req.body.model.trim()
      : DEFAULT_MODEL;
  const prompt =
    typeof req.body?.prompt === "string" && req.body.prompt.trim()
      ? req.body.prompt.trim()
      : "Say hello in one short sentence.";

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
    client.chat({ apiKey, model, prompt }),
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

app.listen(config.port, "0.0.0.0", () => {
  console.log(`otari-tester listening on 0.0.0.0:${config.port}`);
});
