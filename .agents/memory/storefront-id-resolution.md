---
name: Artist storefront id resolution & fetch races
description: How ArtistProfile resolves which user id to fetch listings/auctions for, and why its fetch effects must be cancellation-safe.
---

# Artist storefront listings/auctions — id resolution

Listings and auctions rows are keyed by the artist's **user id (UUID)** in `artist_id`,
NOT by handle. The profile route param `/artists/:id` may be a **handle** (real users)
or the id itself (seed artists, where handle === id). So fetching
`/api/listings?artistId=<routeParam>` returns `[]` for real users.

**Rule:** resolve the real user id before fetching storefront data:
- Own profile → `profile.id`, and prefer the authenticated `/api/me/listings`
  (server scopes by `req.user.id`); skip the public listings fetch so an empty
  handle-keyed result can't clobber it.
- Other profiles → `dbProfile.userId` from `/api/users/:id/profile`, but only trust it
  when it matches the current route (`dbProfile.userId === id || dbProfile.handle === id`),
  otherwise fall back to the route param.

**Why:** the storefront only renders for real/seed artists via the DB-profile branch
(they aren't in static `src/data`), so getting the id right is the whole feature.

## Fetch effects must be cancellation-safe
The component is reused across `/artists/:id` navigations (no remount). All profile +
storefront fetch effects use an `AbortController` (cleanup `() => ac.abort()`) and reset
route-scoped state at effect start. Without this, a slow response for a previously
viewed artist clobbers the current one (`storefrontArtistId` is derived from
`dbProfile`, so a stale profile mis-resolves listings/auctions to the wrong artist).

**How to apply:** any new per-artist fetch in ArtistProfile must take `{ signal }`,
abort on cleanup, and reset its target state when the route id changes.
