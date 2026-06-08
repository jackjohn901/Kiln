---
name: Expo CI login prompt
description: Why the kiln-mobile Expo dev workflow hangs/fails at startup and how to keep it non-interactive
---

# Expo dev workflow blocks on interactive login prompt

`expo start` (Expo Go path) shows an interactive arrow-key prompt at startup:
"It is recommended to log in with your Expo account before proceeding ... unverified-app-expo-go"
with options "Log in / Proceed anonymously". In a workflow (no TTY) this never
gets answered, so the process eventually dies with
`ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL ... Command failed with signal "SIGTERM"` and
the mobile artifact "fails to run".

**Fix:** prefix the `dev` script in `artifacts/kiln-mobile/package.json` with
`CI=1` (i.e. `CI=1 EXPO_PACKAGER_PROXY_URL=... pnpm exec expo start ...`). CI mode
makes Expo non-interactive (auto-proceeds anonymously). Log then shows
"Metro is running in CI mode, reloads are disabled" + a successful "Web Bundled".

**Why:** Expo's `prompts` selection prompt has no non-interactive default without
CI; the env-var prefix is the smallest, durable fix and lives in the script so it
survives workflow recreation from the artifact config.

**Tradeoff:** CI mode disables Metro watch/hot-reload ("Remove CI=true to enable
watch mode"). Acceptable for the Replit preview/Expo Go flow here; if live reload
is ever needed, find another way to answer the prompt rather than dropping CI=1.
