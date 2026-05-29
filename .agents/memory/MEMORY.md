# Security audit memory

- [AI endpoint auth](ai-auth-requirement.md) — Every AI endpoint must check `req.isAuthenticated()` to prevent anonymous API cost abuse.
- [POST ownership checks](ownership-checks.md) — Any `POST`/`PATCH`/`DELETE` that updates existing rows must verify the caller owns the record via a DB lookup.
- [Route auth pattern](route-auth-pattern.md) — First line of every mutation handler: `if (!req.isAuthenticated()) { res.status(401); return; }`; authMiddleware adds no safety over inline checks.
- [Duplicate route shadowing](duplicate-route-shadowing.md) — Two routers defining the same method+path: Express serves the first-registered one; a field can silently vanish from responses. Grep `routes/` for the path before editing.
- [WS broadcast privacy](ws-broadcast-privacy.md) — `broadcastAll` reaches every client; include only public aggregates (counts), never actor userId or per-user records.
- [Kiln mutation error handling](kiln-mutation-error-handling.md) — user-initiated mutation fetches must gate on r.ok + toast + revert optimistic UI; mark-read/like/follow/cart-sync intentionally stay silent.
- [Kiln fabricated-data hotspots](kiln-fabricated-data-hotspots.md) — pages hide hardcoded "demo" numbers as real stats; delete (don't empty-state) sections with no backing feature; vet reports first.
