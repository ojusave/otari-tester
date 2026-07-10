const form = document.getElementById("chat-form");
const sendBtn = document.getElementById("send-btn");
const modelSelect = document.getElementById("model");
const modelStatus = document.getElementById("model-status");
const baseUrlInput = document.getElementById("base-url");
const apiKeyInput = document.getElementById("api-key");
const promptInput = document.getElementById("prompt");

const replyPanel = document.getElementById("reply-panel");
const replyText = document.getElementById("reply-text");
const replyMeta = document.getElementById("reply-meta");
const replyError = document.getElementById("reply-error");
const replyRaw = document.getElementById("reply-raw");
const replyRawBody = document.getElementById("reply-raw-body");

const pillHealth = document.getElementById("pill-health");
const pillReadiness = document.getElementById("pill-readiness");
const healthValue = document.getElementById("health-value");
const readinessValue = document.getElementById("readiness-value");

let fallbackModels = [];
let fallbackDefault = "openai:gpt-4o-mini";
let refreshTimer = null;
let pollTimer = null;
let lastFetchKey = "";
let hasEnvApiKey = false;

function fillModels(groups, preferredId) {
  const previous = modelSelect.value;
  modelSelect.innerHTML = "";
  for (const group of groups) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = group.group;
    for (const m of group.models) {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${group.group}: ${m.label}`;
      optgroup.appendChild(opt);
    }
    modelSelect.appendChild(optgroup);
  }
  const ids = [...modelSelect.options].map((o) => o.value);
  if (previous && ids.includes(previous)) {
    modelSelect.value = previous;
  } else if (preferredId && ids.includes(preferredId)) {
    modelSelect.value = preferredId;
  } else if (ids[0]) {
    modelSelect.value = ids[0];
  }
}

function setModelStatus(text) {
  modelStatus.textContent = text;
}

function setPill(pill, valueEl, check) {
  pill.classList.remove("ok", "bad");
  if (!check) {
    valueEl.textContent = "—";
    return;
  }
  if (check.ok) {
    pill.classList.add("ok");
    const detail =
      check.name === "readiness" &&
      check.body &&
      typeof check.body === "object" &&
      "database" in check.body
        ? String(check.body.database)
        : "ok";
    valueEl.textContent = `${detail} · ${check.ms}ms`;
  } else {
    pill.classList.add("bad");
    valueEl.textContent = check.error
      ? String(check.error).slice(0, 48)
      : `HTTP ${check.status ?? "?"} · ${check.ms}ms`;
  }
}

function extractReply(body) {
  if (!body || typeof body !== "object") return null;
  const choices = body.choices;
  if (!Array.isArray(choices) || !choices[0]) return null;
  const message = choices[0].message;
  if (message && typeof message.content === "string") return message.content;
  if (typeof choices[0].text === "string") return choices[0].text;
  return null;
}

function showReply({ chat, model }) {
  replyPanel.hidden = false;
  replyError.hidden = true;
  replyText.hidden = false;
  replyRaw.hidden = true;

  if (!chat?.ok) {
    replyText.textContent = "";
    replyText.hidden = true;
    replyError.hidden = false;
    replyError.textContent =
      chat?.error || `Chat failed${chat?.status ? ` (HTTP ${chat.status})` : ""}`;
    replyMeta.textContent = chat ? `${chat.ms}ms` : "";
    if (chat?.body) {
      replyRaw.hidden = false;
      replyRawBody.textContent = JSON.stringify(chat.body, null, 2);
    }
    return;
  }

  const text = extractReply(chat.body);
  replyText.textContent = text ?? "(no message content in response)";
  replyMeta.textContent = `${model} · HTTP ${chat.status} · ${chat.ms}ms`;
  replyRaw.hidden = false;
  replyRawBody.textContent = JSON.stringify(chat.body, null, 2);
}

async function refreshModels({ force = false } = {}) {
  const baseUrl = baseUrlInput.value.trim();
  const apiKey = apiKeyInput.value.trim();
  const fetchKey = `${baseUrl}::${apiKey || (hasEnvApiKey ? "env" : "")}`;

  if (!force && fetchKey === lastFetchKey) return;
  lastFetchKey = fetchKey;

  if (!apiKey && !hasEnvApiKey) {
    fillModels(fallbackModels, fallbackDefault);
    setModelStatus("curated defaults — paste a gw-… key for live models");
    return;
  }

  setModelStatus("loading live models…");
  try {
    const res = await fetch("/api/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseUrl, apiKey }),
    });
    const json = await res.json();
    if (!res.ok || !json.data) {
      fillModels(fallbackModels, fallbackDefault);
      setModelStatus(json.error?.message ?? "could not load models");
      return;
    }

    fillModels(json.data.models, json.data.defaultModel);
    if (json.data.source === "live") {
      setModelStatus(
        `live from Otari · ${json.data.count} models · ${json.data.ms}ms`
      );
    } else {
      setModelStatus(json.data.message ?? "curated defaults");
    }
  } catch (err) {
    fillModels(fallbackModels, fallbackDefault);
    setModelStatus(err instanceof Error ? err.message : "models request failed");
  }
}

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshModels().catch(console.error);
  }, 450);
}

function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (!apiKeyInput.value.trim() && !hasEnvApiKey) return;
    refreshModels({ force: true }).catch(console.error);
  }, 30_000);
}

async function loadConfig() {
  const res = await fetch("/api/config");
  const json = await res.json();
  const cfg = json.data;
  baseUrlInput.value = cfg.otariBaseUrl;
  document.getElementById("deploy-btn").href = cfg.deployUrl;
  document.getElementById("signup-btn").href = cfg.signupNavbar;
  document.getElementById("github-link").href = cfg.githubRepo;
  document.getElementById("otari-template-btn").href = cfg.otariTemplateDeployUrl;
  document.getElementById("otari-template-link").href = cfg.otariTemplateDeployUrl;
  document.getElementById("otari-template-repo").href = cfg.otariTemplateRepo;

  fallbackModels = cfg.models;
  fallbackDefault = cfg.defaultModel;
  hasEnvApiKey = Boolean(cfg.hasEnvApiKey);
  fillModels(fallbackModels, fallbackDefault);

  if (hasEnvApiKey) {
    apiKeyInput.required = false;
    apiKeyInput.placeholder = "using OTARI_API_KEY from env — or paste to override";
  }

  await refreshModels({ force: true });
  startPolling();
}

baseUrlInput.addEventListener("change", scheduleRefresh);
baseUrlInput.addEventListener("blur", scheduleRefresh);
apiKeyInput.addEventListener("input", scheduleRefresh);
apiKeyInput.addEventListener("change", scheduleRefresh);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  sendBtn.disabled = true;
  sendBtn.textContent = "Sending…";

  try {
    await refreshModels({ force: true });
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl: baseUrlInput.value.trim(),
        apiKey: apiKeyInput.value.trim(),
        model: modelSelect.value,
        prompt: promptInput.value.trim(),
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.data) {
      showReply({
        chat: {
          ok: false,
          error: json.error?.message ?? "Request failed",
          ms: 0,
        },
        model: modelSelect.value,
      });
      setPill(pillHealth, healthValue, null);
      setPill(pillReadiness, readinessValue, null);
      return;
    }

    const { health, readiness, chat, model } = json.data;
    showReply({ chat, model });
    setPill(pillHealth, healthValue, health);
    setPill(pillReadiness, readinessValue, readiness);
  } catch (err) {
    showReply({
      chat: {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        ms: 0,
      },
      model: modelSelect.value,
    });
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Send";
  }
});

loadConfig().catch((err) => {
  console.error(err);
});
