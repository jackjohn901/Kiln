# Security audit memory

- [AI endpoint auth](ai-auth-requirement.md) — Every AI endpoint must check `req.isAuthenticated()` to prevent anonymous API cost abuse.
- [POST ownership checks](ownership-checks.md) — Any `POST`/`PATCH`/`DELETE` that updates existing rows must verify the caller owns the record via a DB lookup.
- [Route auth pattern](route-auth-pattern.md) — Prefer `if (!req.isAuthenticated()) { res.status(401)... return; }` as the first line of every mutation handler; `authMiddleware` is fine but adds no additional safety over inline checks.
