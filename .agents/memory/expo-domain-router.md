---
name: Expo artifact router=expo-domain
description: Why the Expo dev domain 404s in Expo Go and how the artifact.toml routes it to Metro
---

# Expo dev domain routing (kiln-mobile)

A mobile/expo artifact's `.replit-artifact/artifact.toml` must contain the top-level
field `router = "expo-domain"`. This is what makes `$REPLIT_EXPO_DEV_DOMAIN`
(the `*.expo.janeway.replit.dev` host) route the whole domain to Metro instead of
falling through the path-proxy to the catch-all root service.

**Symptom when missing:** Expo Go reports "HTTP response error 404" for the `exp://`
URL. `curl https://$REPLIT_EXPO_DEV_DOMAIN/` returns `302 → /__mockup` (or whatever
service owns externalPort 80) instead of the Metro JSON manifest, even though Metro
is healthy on its localPort (e.g. `curl -H "expo-platform: ios" localhost:8099/`
returns 200 with the manifest).

**Why:** The routing layer builds its table from each artifact's `artifact.toml` and
keys the special expo-domain host route off `router = "expo-domain"`. Without that
field the host is treated like the base domain and hits the path-proxy default.

**How to apply:**
- Never edit `artifact.toml` directly — write the full TOML to the sibling
  `artifact.edit.toml` and apply via the `verifyAndReplaceArtifactToml` callback
  (absolute paths). The callback needs the target file to already exist; if it was
  deleted, recreate it first (e.g. copy the edit file) then run the callback.
- A mobile artifact.toml needs at minimum: `kind="mobile"`, `router="expo-domain"`,
  a `[[services]]` block with `name="expo"`, `ensurePreviewReachable="/status"`,
  `paths`, `localPort`, and `[services.env]` `PORT` (+ `BASE_PATH` matching previewPath).
- After applying, restart the expo workflow, then verify
  `curl -H "expo-platform: ios" https://$REPLIT_EXPO_DEV_DOMAIN/` returns the manifest
  (200, JSON with `launchAsset`). Workflow restarts DO pick up the change once the
  field is present — a full repl restart is not required.

**How it broke here:** a checkpoint commit "Remove extra apps from project preview"
deleted the kiln-mobile `artifact.toml` (which had `router="expo-domain"`). A later
`artifact.edit.toml` reconstruction omitted that field, so the domain kept 404ing.
