---
name: Kiln multi-account owner model
description: How one Replit login owns/switches between multiple separate Kiln accounts (Instagram-style switcher)
---

Kiln supports one authenticated Replit identity ("owner") owning multiple fully
separate accounts (each its own `users` row + profile + posts/shop/followers),
with an Instagram-style switcher, capped at 10 total.

Model:
- **Owner / root account**: the Replit identity. Its `users` row has `id` = Replit
  sub, real `email`, and `ownerId = null`.
- **Sub-accounts**: `users` rows with `ownerId` = owner's id, `email = null` (so the
  unique email constraint isn't violated — they are NOT separate Replit logins), and
  a generated uuid `id`. They get their own `profiles` row; the profile's
  `contactEmail` is set to the OWNER ROOT email (read from the owner row, never from
  `session.user.email`, which is null while a sub-account is active).
- **Active vs owner in the session**: `session.user` = the ACTIVE account;
  `session.ownerId` = stable owner root id. `authMiddleware` sets `req.user =
  session.user`, so ALL content scopes by `req.user.id` = active account with no
  other changes. Legacy sessions lacking `ownerId` fall back to `ownerId = user.id`.
- **Switching**: swap `session.user` to the target, keep `ownerId` and the owner's
  OIDC access/refresh tokens unchanged.

**Why:** keeping content scoping on `req.user.id` meant zero changes across the
hundreds of routes that already key off it — switching just changes which account
`req.user` points to.

**How to apply:**
- Owner id must always be derived from the session (`session.ownerId ?? session.user.id`),
  NEVER from client input. Switch must verify `target.id === ownerId || target.ownerId === ownerId`.
- The per-owner account cap must be enforced atomically (transaction + per-owner
  `pg_advisory_xact_lock(hashtext(ownerId))`) — a plain count-then-insert races.
- Switching to a sub-account drops admin/CREATOR_USER_ID powers (those key off
  `req.user.id`); this is intended and safer.
- Frontend switch/create clears the `kiln_profile` localStorage key then reloads so
  ProfileContext re-syncs to the new active account.

**Account id conventions (use to audit/clean the `users` table):**
- Real human accounts: numeric Replit `sub` id (e.g. `44581520`), real email, `ownerId = null`.
- Demo/reference data: id prefixed `seed-%` — keep, it's the showcase content.
- Automated test junk: id prefixed `e2e-%` or `test-%` — safe to delete (left by testing/e2e runs).
- No DB-level FK constraints reference `users`/`profiles`, so cleanup means manually
  deleting rows across every table with a user-ref column (`user_id`/`author_id`/`artist_id`/
  `buyer_id`/`seller_id`/`sender_id`/`from_user_id`/`to_user_id`/`owner_id`) then the `users` row.
- A single real Replit login can only ever map to ONE owner row (upsert keys on `claims.sub`),
  so "I'm a different account each login" is almost always session expiry (landing logged-out),
  NOT duplicate accounts.
