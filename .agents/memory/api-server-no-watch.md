---
name: API server dev has no watch
description: api-server dev = build-then-start (esbuild), so new routes/code need a workflow restart to take effect
---

The `@workspace/api-server` `dev` script runs `pnpm run build && pnpm run start`
(esbuild CJS bundle, then `node dist/index.mjs`). It does **not** watch/reload.

**Why:** After adding new Express routes, `curl` returned 404 even though typecheck
passed and the workflow was "running" — the running process was the old bundle.

**How to apply:** After any api-server source change, restart the
`artifacts/api-server: API Server` workflow before smoke-testing endpoints.
A 404 on a route you just added almost always means "stale bundle, restart," not
"route not registered."
