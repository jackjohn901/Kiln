---
name: Expo dev login prompt / offline mode
description: Why the kiln-mobile Expo dev workflow hangs at startup and how to keep it non-interactive without breaking Expo Go
---

# Expo dev workflow blocks on interactive login prompt

`expo start` (Expo Go path) shows an interactive arrow-key prompt at startup:
"It is recommended to log in with your Expo account before proceeding ... unverified-app-expo-go"
with options "Log in / Proceed anonymously". In a workflow (no TTY) this never
gets answered, so the process dies with
`ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL ... Command failed with signal "SIGTERM"` and
the mobile artifact "fails to run".

**Fix:** prefix the `dev` script in `artifacts/kiln-mobile/package.json` with
`EXPO_OFFLINE=1` (i.e. `EXPO_OFFLINE=1 EXPO_PACKAGER_PROXY_URL=... pnpm exec expo start ...`).
Offline mode skips the account-login prompt (log shows "Skipping dependency
validation in offline mode") and Metro reaches "Metro waiting on exp://...".

**Do NOT use `CI=1` for this.** CI mode also silences the prompt, but it makes
Expo Go demand an Expo auth token when serving the manifest — the canvas/preview
then fails with `HTTP response error 500: error EXPO TOKEN in CI`. CI mode also
disables Metro hot-reload. `EXPO_OFFLINE=1` avoids both problems.

**Why:** the prompt is Expo recommending login for an unverified Expo Go app;
offline mode just doesn't contact Expo servers, so there's nothing to prompt for
and no token requirement. It lives in the package.json script so it survives
workflow recreation from the artifact config.
