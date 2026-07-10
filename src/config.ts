/** Runtime config from environment. */

export const config = {
  port: Number(process.env.PORT ?? 3000),
  /** Default Otari instance under test. Overridable per request. */
  otariBaseUrl:
    process.env.OTARI_BASE_URL ?? "https://otari-ngc0.onrender.com",
  /** Optional default gateway key (gw-…). Prefer pasting in the UI. */
  otariApiKey: process.env.OTARI_API_KEY ?? "",
  /** Optional master key for listing models without a pasted gw- key. */
  otariMasterKey: process.env.OTARI_MASTER_KEY ?? "",
  githubRepo:
    process.env.GITHUB_REPO ?? "https://github.com/ojusave/otari-tester",
  /** One-click Otari gateway template (gallery). */
  otariTemplateDeployUrl:
    process.env.OTARI_TEMPLATE_DEPLOY_URL ??
    "https://render.com/deploy-template/api/github/start?template_repo=otari-render-template",
  otariTemplateRepo:
    process.env.OTARI_TEMPLATE_REPO ??
    "https://github.com/render-examples/otari-render-template",
  requestTimeoutMs: Number(process.env.OTARI_TIMEOUT_MS ?? 45_000),
};
