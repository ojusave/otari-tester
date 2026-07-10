import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
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
      deployUrl: `https://render.com/deploy?repo=${encodeURIComponent(config.githubRepo)}`,
      signupNavbar: renderSignupUrlWithUtms("navbar_button"),
      signupHero: renderSignupUrlWithUtms("hero_cta"),
    },
  });
});

app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/api/smoke", async (req, res) => {
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
      : "openai:gpt-4o-mini";
  const prompt =
    typeof req.body?.prompt === "string" && req.body.prompt.trim()
      ? req.body.prompt.trim()
      : "ping";

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

  const client = new OtariClient(baseUrl, config.requestTimeoutMs);
  const health = await client.health();
  const readiness = await client.readiness();
  const chat = await client.chat({ apiKey, model, prompt });

  const checks = [health, readiness, chat];
  res.json({
    data: {
      baseUrl: parsed.origin,
      model,
      checks,
      ok: checks.every((c) => c.ok),
    },
    error: null,
  });
});

app.listen(config.port, "0.0.0.0", () => {
  console.log(`otari-tester listening on 0.0.0.0:${config.port}`);
});
