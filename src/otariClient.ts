/** Thin client for Otari smoke checks. Failures return results, not throws. */

export type CheckResult = {
  name: string;
  ok: boolean;
  status?: number;
  ms: number;
  body?: unknown;
  error?: string;
};

export type OtariModel = {
  id: string;
  owned_by?: string;
};

function normalizeBase(url: string): string {
  return url.replace(/\/+$/, "");
}

async function timedFetch(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<{ res: Response; ms: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    return { res, ms: Date.now() - started, text };
  } finally {
    clearTimeout(timer);
  }
}

function parseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export class OtariClient {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number
  ) {
    this.baseUrl = normalizeBase(baseUrl);
  }

  async health(): Promise<CheckResult> {
    return this.get("health", "/health");
  }

  async readiness(): Promise<CheckResult> {
    return this.get("readiness", "/health/readiness");
  }

  /** Live model catalog from Otari (requires gw- or master key). */
  async listModels(apiKey: string): Promise<{
    ok: boolean;
    status?: number;
    ms: number;
    models: OtariModel[];
    error?: string;
  }> {
    try {
      const { res, ms, text } = await timedFetch(
        `${this.baseUrl}/v1/models`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${apiKey}` },
        },
        this.timeoutMs
      );
      const body = parseBody(text);
      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          ms,
          models: [],
          error: summarizeError(body, text),
        };
      }
      const models = extractModels(body);
      return { ok: true, status: res.status, ms, models };
    } catch (err) {
      return {
        ok: false,
        ms: 0,
        models: [],
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async chat(opts: {
    apiKey: string;
    model: string;
    messages: { role: string; content: string }[];
  }): Promise<CheckResult> {
    const name = "chat";
    try {
      const { res, ms, text } = await timedFetch(
        `${this.baseUrl}/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${opts.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: opts.model,
            messages: opts.messages,
          }),
        },
        this.timeoutMs
      );
      const body = parseBody(text);
      const result: CheckResult = {
        name,
        ok: res.ok,
        status: res.status,
        ms,
        body,
      };
      if (!res.ok) result.error = summarizeError(body, text);
      return result;
    } catch (err) {
      return {
        name,
        ok: false,
        ms: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async get(name: string, path: string): Promise<CheckResult> {
    try {
      const { res, ms, text } = await timedFetch(
        `${this.baseUrl}${path}`,
        { method: "GET" },
        this.timeoutMs
      );
      const body = parseBody(text);
      const result: CheckResult = {
        name,
        ok: res.ok,
        status: res.status,
        ms,
        body,
      };
      if (!res.ok) result.error = summarizeError(body, text);
      return result;
    } catch (err) {
      return {
        name,
        ok: false,
        ms: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

function extractModels(body: unknown): OtariModel[] {
  if (!body || typeof body !== "object") return [];
  const data = (body as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];
  const out: OtariModel[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const id = (item as { id?: unknown }).id;
    if (typeof id !== "string" || !id) continue;
    const owned_by = (item as { owned_by?: unknown }).owned_by;
    const model: OtariModel = { id };
    if (typeof owned_by === "string" && owned_by) model.owned_by = owned_by;
    out.push(model);
  }
  return out;
}

function summarizeError(body: unknown, raw: string): string {
  if (body && typeof body === "object" && "error" in body) {
    const e = (body as { error: unknown }).error;
    if (typeof e === "string") return e;
    if (e && typeof e === "object" && "message" in e) {
      return String((e as { message: unknown }).message);
    }
  }
  return raw.slice(0, 300) || "request failed";
}
