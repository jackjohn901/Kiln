# Security audit memory

- [AI endpoint auth](ai-auth-requirement.md) — Every AI endpoint must check `req.isAuthenticated()` to prevent anonymous API cost abuse.
- [POST ownership checks](ownership-checks.md) — Any `POST`/`PATCH`/`DELETE` that updates existing rows must verify the caller owns the record via a DB lookup.
- [Route auth pattern](route-auth-pattern.md) — First line of every mutation handler: `if (!req.isAuthenticated()) { res.status(401); return; }`; authMiddleware adds no safety over inline checks.
- [Duplicate route shadowing](duplicate-route-shadowing.md) — Two routers defining the same method+path: Express serves the first-registered one; a field can silently vanish from responses. Grep `routes/` for the path before editing.
- [WS broadcast privacy](ws-broadcast-privacy.md) — `broadcastAll` reaches every client; include only public aggregates (counts), never actor userId or per-user records.
- [Classify failures by status](error-classification-by-status.md) — never regex-match "401"/"unauthorized" in an error body; a Mux 401 inside our 500 was misread as session expiry and caused an infinite re-login loop.
- [Fabricated-data rule](kiln-fabricated-data-hotspots.md) — never render fabricated numbers/activity as real; demo *content* datasets stay, their fake *stats* go; success only on `res.ok`.
- [Kiln mutation error handling](kiln-mutation-error-handling.md) — user-initiated mutation fetches must gate on r.ok + toast + revert optimistic UI; mark-read/like/follow/cart-sync intentionally stay silent.
- [Kiln video uploads → Mux](kiln-video-upload-mux.md) — user videos must upload via Mux (uploadVideo), persist muxPlaybackId + Mux thumbnail to localStorage AND DB; object-storage MP4s render black on grid/mobile.
- [Composite lib decl drift](composite-lib-decl-drift.md) — new export in a lib/* is invisible to consumers until `typecheck:libs` rebuilds its .d.ts; "no exported member X" despite source having it.
- [Mixed-content http assets](mixed-content-http-assets.md) — embedded media URLs must be https or they break on the prod https site; outbound link hrefs are exempt.
- [Kiln multi-account owner model](kiln-multi-account-owner-model.md) — one Replit login owns ≤10 accounts; active = session.user, owner = session.ownerId; switch swaps session.user; content scopes by req.user.id.
- [Create-flow navigation](create-flow-navigation.md) — after create POST, navigate directly to the new item's detail (/auctions/:id, /listings/:id) using the returned id; interstitials + Live-tab filters cause "nothing showed up".
- [Storefront id resolution](storefront-id-resolution.md) — listings/auctions keyed by user UUID not handle; resolve real id before fetch, own uses /me/listings, all ArtistProfile fetch effects must be AbortController-cancellable.
- [Auth redirect smoothing](auth-redirect-smoothing.md) — omit OIDC `prompt: login consent` so returning users glide through; show branded AuthSplash, never blank, during redirect/isLoading.
- [Mobile review-prompt gating](mobile-review-prompt-gating.md) — trigger store-review at end of one-shot onboarding (AsyncStorage flag), best-effort, never block app entry.
