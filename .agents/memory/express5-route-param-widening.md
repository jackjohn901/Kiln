---
name: Express 5 route param widening with per-route middleware
description: Adding a pre-typed RequestHandler (e.g. express-rate-limit) before an inferred handler widens req.params values to string | string[], breaking drizzle eq() calls.
---

When you add a concrete, non-generic `RequestHandler` (such as the one returned by
`rateLimit()` / `RateLimitRequestHandler`) as per-route middleware
(`router.get("/x/:id", limiter, handler)`) under @types/express 5, the inferred
handler's `req.params.<name>` widens from `string` to `string | string[]`.

**Symptom:** `error TS2769: No overload matches this call` where `req.params.id`
is passed straight into something expecting `string` (e.g. drizzle `eq(col, req.params.id)`).
A bare `router.get("/x/:id", handler)` (no extra middleware) does NOT widen.

**Why:** mixing the limiter's generic-param handler into the `...handlers` array
collapses the path-literal param inference.

**How to apply:** normalize the param once at the top of the handler —
`const id = req.params.id as string;` — then use `id`. Routes that only interpolate
the param into a template string (like orders cart receipt `sessionKey`) are unaffected
and need no change.
