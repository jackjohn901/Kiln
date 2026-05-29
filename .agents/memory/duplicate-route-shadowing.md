---
name: Duplicate Express route shadowing
description: Why an API field can silently disappear when two routers define the same path in api-server.
---

# Duplicate route shadowing in api-server

The API mounts many routers in `artifacts/api-server/src/routes/index.ts` via `router.use(...)`. If two different routers each register the **same** method+path (e.g. `GET /trending-posts`), Express serves the **first-registered** one and silently ignores the later one.

**Why it bites:** a response can be missing a field you know you added (e.g. `trendingTags`) even though source AND dist contain your code — because a different, earlier router is answering the request. Typecheck passes; no error logs; only the JSON shape reveals it.

**How to apply:** When adding fields/aggregates to an existing endpoint, first `rg` the whole `routes/` dir for the path string to confirm there is exactly one handler. If there are two, consolidate into one route (merge query-param behaviors) and delete the duplicate, rather than editing whichever one you happened to find.
