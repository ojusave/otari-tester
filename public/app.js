const form = document.getElementById("chat-form");
const sendBtn = document.getElementById("send-btn");
const modelSelect = document.getElementById("model");
const modelStatus = document.getElementById("model-status");
const customWrap = document.getElementById("custom-model-wrap");
const customModel = document.getElementById("custom-model");
const baseUrlInput = document.getElementById("base-url");
const apiKeyInput = document.getElementById("api-key");
const promptInput = document.getElementById("prompt");
const thread = document.getElementById("thread");
const emptyState = document.getElementById("empty-state");

const pillHealth = document.getElementById("pill-health");
const pillReadiness = document.getElementById("pill-readiness");
const healthValue = document.getElementById("health-value");
const readinessValue = document.getElementById("readiness-value");

const CUSTOM_VALUE = "__custom__";

let fallbackModels = [];
let fallbackDefault = "openai:gpt-5.5";
let refreshTimer = null;
let pollTimer = null;
let lastFetchKey = "";
let hasEnvApiKey = false;

function fillModels(groups, preferredId) {
  const previous = modelSelect.value === CUSTOM_VALUE ? CUSTOM_VALUE : selectedModelId();
  modelSelect.innerHTML = "";
  for (const group of groups) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = group.group;
    for (const m of group.models) {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.label;
      optgroup.appendChild(opt);
    }
    modelSelect.appendChild(optgroup);
  }
  const custom = document.createElement("option");
  custom.value = CUSTOM_VALUE;
  custom.textContent = "Custom model id…";
  modelSelect.appendChild(custom);

  const ids = [...modelSelect.options].map((o) => o.value);
  if (previous === CUSTOM_VALUE) {
    modelSelect.value = CUSTOM_VALUE;
  } else if (previous && ids.includes(previous)) {
    modelSelect.value = previous;
  } else if (preferredId && ids.includes(preferredId)) {
    modelSelect.value = preferredId;
  } else if (ids[0]) {
    modelSelect.value = ids[0];
  }
  syncCustomVisibility();
}

function selectedModelId() {
  if (modelSelect.value === CUSTOM_VALUE) return customModel.value.trim();
  return modelSelect.value;
}

function syncCustomVisibility() {
  const show = modelSelect.value === CUSTOM_VALUE;
  customWrap.hidden = !show;
  customModel.required = show;
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
      ? String(check.error).slice(0, 40)
      : `HTTP ${check.status ?? "?"}`;
  }
}

function clearEmpty() {
  if (emptyState) emptyState.remove();
}

function appendBubble({ role, text, meta, error, raw }) {
  clearEmpty();
  const el = document.createElement("article");
  el.className = `bubble ${role}${error ? " error" : ""}`;
  const metaHtml = meta
    ? `<div class="bubble-meta"><span>${escapeHtml(meta.left)}</span><span>${escapeHtml(meta.right)}</span></div>`
    : "";
  const rawHtml = raw
    ? `<details><summary>Raw JSON</summary><pre>${escapeHtml(JSON.stringify(raw, null, 2))}</pre></details>`
    : "";
  el.innerHTML = `${metaHtml}<div>${escapeHtml(text)}</div>${rawHtml}`;
  thread.appendChild(el);
  thread.scrollTop = thread.scrollHeight;
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

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function refreshModels({ force = false } = {}) {
  const baseUrl = baseUrlInput.value.trim();
  const apiKey = apiKeyInput.value.trim();
  const fetchKey = `${baseUrl}::${apiKey || (hasEnvApiKey ? "env" : "")}`;
  if (!force && fetchKey === lastFetchKey) return;
  lastFetchKey = fetchKey;

  if (!apiKey && !hasEnvApiKey) {
    fillModels(fallbackModels, fallbackDefault);
    setModelStatus("Suggested · paste gw-… for live /v1/models");
    return;
  }

  setModelStatus("Refreshing from Otari…");
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
        `Live · ${json.data.count} models · ${new Date().toLocaleTimeString()}`
      );
    } else {
      setModelStatus(json.data.message ?? "Suggested models");
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
  }, 20_000);
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
  document.getElementById("otari-template-repo").href = cfg.otariTemplateRepo;

  fallbackModels = cfg.models;
  fallbackDefault = cfg.defaultModel;
  hasEnvApiKey = Boolean(cfg.hasEnvApiKey);
  fillModels(fallbackModels, fallbackDefault);

  if (hasEnvApiKey) {
    apiKeyInput.required = false;
    apiKeyInput.placeholder = "env key set — or paste override";
  }

  await refreshModels({ force: true });
  startPolling();
}

baseUrlInput.addEventListener("change", scheduleRefresh);
baseUrlInput.addEventListener("blur", scheduleRefresh);
apiKeyInput.addEventListener("input", scheduleRefresh);
apiKeyInput.addEventListener("change", scheduleRefresh);
modelSelect.addEventListener("change", syncCustomVisibility);

promptInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const model = selectedModelId();
  const prompt = promptInput.value.trim();
  if (!model || !prompt) return;

  appendBubble({
    role: "user",
    text: prompt,
    meta: { left: "you", right: model },
  });
  promptInput.value = "";
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
        model,
        prompt,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.data) {
      appendBubble({
        role: "assistant",
        text: json.error?.message ?? "Request failed",
        error: true,
      });
      setPill(pillHealth, healthValue, null);
      setPill(pillReadiness, readinessValue, null);
      return;
    }

    const { health, readiness, chat, model: usedModel } = json.data;
    setPill(pillHealth, healthValue, health);
    setPill(pillReadiness, readinessValue, readiness);

    if (!chat.ok) {
      appendBubble({
        role: "assistant",
        text: chat.error || `Chat failed (HTTP ${chat.status ?? "?"})`,
        error: true,
        meta: { left: "otari", right: `${chat.ms}ms` },
        raw: chat.body,
      });
      return;
    }

    const text = extractReply(chat.body) ?? "(no message content)";
    appendBubble({
      role: "assistant",
      text,
      meta: {
        left: usedModel,
        right: `HTTP ${chat.status} · ${chat.ms}ms`,
      },
      raw: chat.body,
    });
  } catch (err) {
    appendBubble({
      role: "assistant",
      text: err instanceof Error ? err.message : String(err),
      error: true,
    });
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Send";
    promptInput.focus();
  }
});

loadConfig().catch(console.error);
