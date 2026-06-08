---
name: Expo Metro monorepo watchFolders crash
description: Why NOT to set watchFolders=[workspaceRoot] in kiln-mobile metro.config.js
---

# Don't widen kiln-mobile Metro watchFolders to the workspace root

Setting `config.watchFolders = [workspaceRoot]` (the classic "Expo monorepo"
metro tweak) crashes the local Expo dev workflow with:
`Error: ENOENT: no such file or directory, watch '.../.cache/typescript/5.9/node_modules/@types/.react-*'`
Metro's FallbackWatcher (no watchman in this env) walks the whole repo root,
including `.cache/typescript`, and dies when TS's transient temp files vanish.

**Keep metro.config.js as the Expo default** (`module.exports = getDefaultConfig(__dirname)`).

**Why it's safe to keep default:** the kiln-mobile app uses workspace deps
(`@workspace/api-client-react`, `@workspace/notifications`) and still bundles fine
with the default config — Expo SDK 54's getDefaultConfig + pnpm symlinks already
resolve them (confirmed: app bundles, feed/nav render in Expo Go). No manual
watchFolders/nodeModulesPaths needed for dev OR EAS Build.

**If EAS Build ever fails to resolve workspace deps:** prefer narrowing
watchFolders to just `lib/` + root `node_modules` (never the bare workspace root),
or rely on EAS's built-in pnpm monorepo detection — do not re-introduce
`watchFolders=[workspaceRoot]`.
