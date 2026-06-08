---
name: Seed marker persistence
description: The active Kiln seed marker lives in server_config, not just a compiled-in constant.
---

# Seed marker is persisted in server_config

The authoritative Kiln seed marker is stored in the `server_config` table under
key `active_seed_marker`. `SEED_MARKER_ID` in `seed.ts` is now ONLY the default
used to seed a brand-new, empty database.

Resolution order (`getCurrentMarkerId`): persisted config row → legacy `%-marker`
user row (for DBs seeded before this change) → `SEED_MARKER_ID` default.

`seedDatabase()` skips entirely when a persisted marker exists; for a legacy DB
(marker user but no config row) it adopts the marker into config without
re-seeding; a true fresh seed persists `SEED_MARKER_ID`.
`forceSeedDatabaseWithMarker()` persists the new marker. `getSeedStatus()`
reports `codeMarkerId === markerUserId`, so the admin "out of sync" warning can
no longer drift.

**Why:** before this, advancing the marker from the admin panel did not survive
restarts — `seedDatabase()` gated on the compiled-in constant, so a restart
re-seeded, resurrected the old marker user, overwrote admin-advanced content,
and the drift warning persisted until a dev hand-edited `seed.ts`.

**How to apply:** to advance the marker on a live DB, use the admin reseed-with-
marker flow (it persists to config) — do NOT just bump the `SEED_MARKER_ID`
constant and redeploy. The `replit.md` gotcha "Seed marker must be bumped
(seed-v4 → seed-v5) to re-run seed on a live DB" is now outdated for advances.
