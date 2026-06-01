---
name: Composite lib declaration drift
description: Why a consumer typecheck fails with "no exported member X" even though the lib source has it.
---

When you add a new export to a `lib/*` package (e.g. a new table in `@workspace/db`),
consumers (`artifacts/*`) typecheck against the lib's **emitted `.d.ts`**, not its source.
Until the lib is rebuilt, the new export is invisible and the consumer fails with
`Module '@workspace/db' has no exported member 'X'` — and the dev workflow can crash on
startup if the bundle references the still-undefined symbol.

**Why:** `lib/*` are composite packages; their declarations are cached in `.tsbuildinfo`
and emitted by `tsc --build`. A merge that adds the source export but doesn't rebuild
leaves stale declarations.

**How to apply:** After any new export appears in a lib (often via a merged task), run
`pnpm run typecheck:libs` (or `pnpm run typecheck`, which builds libs first) before
trusting a consumer typecheck/build failure. Restart the affected workflow afterward.
