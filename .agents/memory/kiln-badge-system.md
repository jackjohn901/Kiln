---
name: Kiln badge system
description: How badges are defined, awarded, and rendered — and the latent gap that badge definitions aren't all reproducible from source.
---

# Kiln badge system

- `awardBadge(userId, badgeId)` in `artifacts/api-server/src/routes/badges.ts` is the idempotent helper to grant a badge. Feature routes must call it themselves — there is no central trigger.
- Display path: profile fetches `/api/users/:id/badges`; that endpoint joins `user_badges` → `badge_definitions` and **filters out any earned badge whose definition is missing** (`.filter(b => b.name)`). So a badge with no row in `badge_definitions` is awarded silently but never renders.

**Latent gap (important):** the ~21 rows in `badge_definitions` (first_post, streak_*, first_follower, etc.) were inserted out-of-band — they are **NOT** seeded from source code. A fresh or reset DB (including production) can therefore be missing them, and those badges will silently fail to render.

**Why:** only the referral badge definitions are now reproducible — `ensureReferralBadges()` in `seed.ts` idempotently upserts `referral_1/10/100` on every server start (called from `index.ts`). The rest have no source-of-truth seeding.

**How to apply:** if a badge "isn't showing up," first check whether its `badge_definitions` row exists in the target DB before debugging the award logic. If adding a new badge type, seed its definition idempotently (follow the `ensureReferralBadges` pattern) — don't rely on the row already existing.

- Referral credit is keyed on `referral_uses` (source of truth), which has a unique constraint on `referee_id` (one redemption per user). Milestone thresholds must be computed from `COUNT(*)` of `referral_uses`, not the cached `referral_codes.use_count` (which can lag under concurrency).
