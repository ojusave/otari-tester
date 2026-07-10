# Otari Tester

Small Render web app that smoke-tests a live [Otari](https://github.com/mozilla-ai/otari) gateway: health, readiness, then one chat completion.

Default target: `https://otari-ngc0.onrender.com`.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/ojusave/otari-tester)

## Env

| Variable | Notes |
| --- | --- |
| `OTARI_BASE_URL` | Gateway under test (default set in Blueprint) |
| `OTARI_API_KEY` | Optional default `gw-…` key; UI can override |
| `GITHUB_REPO` | Repo URL for Deploy / footer links |
| `PORT` | Set by Render |

## Deploy

Push this repo and apply the Blueprint, or use the Deploy button above. Paste a bootstrap `gw-…` key from Otari logs when you run the form.
