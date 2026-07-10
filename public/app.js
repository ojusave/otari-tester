const form = document.getElementById("smoke-form");
const runBtn = document.getElementById("run-btn");
const results = document.getElementById("results");
const checksEl = document.getElementById("checks");
const summary = document.getElementById("summary");

async function loadConfig() {
  const res = await fetch("/api/config");
  const json = await res.json();
  const cfg = json.data;
  document.getElementById("base-url").value = cfg.otariBaseUrl;
  document.getElementById("deploy-btn").href = cfg.deployUrl;
  document.getElementById("signup-btn").href = cfg.signupNavbar;
  document.getElementById("github-link").href = cfg.githubRepo;
  if (cfg.hasEnvApiKey) {
    const key = document.getElementById("api-key");
    key.required = false;
    key.placeholder = "using OTARI_API_KEY from env — or paste to override";
  }
}

function renderChecks(checks) {
  checksEl.innerHTML = "";
  for (const c of checks) {
    const li = document.createElement("li");
    li.className = "check";
    const status = c.status != null ? `HTTP ${c.status}` : "—";
    const detail = c.error
      ? { error: c.error, body: c.body }
      : c.body;
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

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  runBtn.disabled = true;
  runBtn.textContent = "Running…";
  results.hidden = true;

  try {
    const res = await fetch("/api/smoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl: document.getElementById("base-url").value.trim(),
        apiKey: document.getElementById("api-key").value.trim(),
        model: document.getElementById("model").value.trim(),
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
