/** Runtime config from environment. */

export const config = {
  port: Number(process.env.PORT ?? 3000),
  /** Default Otari instance under test. Overridable per request. */
  otariBaseUrl:
    process.env.OTARI_BASE_URL ?? "https://otari-ngc0.onrender.com",
  /** Optional default gateway key (gw-…). Prefer pasting in the UI. */
  otariApiKey: process.env.OTARI_API_KEY ?? "",
  githubRepo:
    process.env.GITHUB_REPO ?? "https://github.com/ojusave/otari-tester",
  requestTimeoutMs: Number(process.env.OTARI_TIMEOUT_MS ?? 45_000),
};
