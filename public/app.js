const form = document.getElementById("smoke-form");
const runBtn = document.getElementById("run-btn");
const results = document.getElementById("results");
const checksEl = document.getElementById("checks");
const summary = document.getElementById("summary");
const modelSelect = document.getElementById("model");
const modelStatus = document.getElementById("model-status");
const baseUrlInput = document.getElementById("base-url");
const apiKeyInput = document.getElementById("api-key");

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

function renderChecks(checks) {
  checksEl.innerHTML = "";
  for (const c of checks) {
    const li = document.createElement("li");
    li.className = "check";
    const status = c.status != null ? `HTTP ${c.status}` : "—";
    const detail = c.error ? { error: c.error, body: c.body } : c.body;
    li.innerHTML = `
      <div class="check-bar">
        <span class="badge ${c.ok ? "ok" : "bad"}">${c.ok ? "pass" : "fail"}</span>
        <span class="check-name">${escapeHtml(c.name)}</span>
        <span class="meta">${status} · ${c.ms}ms</span>
      </div>
      <details>
        <summary>Response</summary>
        <pre>${escapeHtml(JSON.stringify(detail, null, 2))}</pre>
      </details>
    `;
    checksEl.appendChild(li);
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

baseUrlInput.addEventListener("change", scheduleRefresh);
baseUrlInput.addEventListener("blur", scheduleRefresh);
apiKeyInput.addEventListener("input", scheduleRefresh);
apiKeyInput.addEventListener("change", scheduleRefresh);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  runBtn.disabled = true;
  runBtn.textContent = "Running…";
  results.hidden = true;

  try {
    await refreshModels({ force: true });
    const res = await fetch("/api/smoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl: baseUrlInput.value.trim(),
        apiKey: apiKeyInput.value.trim(),
        model: modelSelect.value,
        prompt: document.getElementById("prompt").value.trim(),
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.data) {
      summary.textContent = json.error?.message ?? "Request failed";
      summary.className = "summary bad";
      checksEl.innerHTML = "";
      results.hidden = false;
      return;
    }
    summary.textContent = json.data.ok ? "All checks passed" : "Something failed";
    summary.className = `summary ${json.data.ok ? "ok" : "bad"}`;
    renderChecks(json.data.checks);
    results.hidden = false;
  } catch (err) {
    summary.textContent = err instanceof Error ? err.message : String(err);
    summary.className = "summary bad";
    checksEl.innerHTML = "";
    results.hidden = false;
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = "Run smoke tests";
  }
});

loadConfig().catch((err) => {
  console.error(err);
});
