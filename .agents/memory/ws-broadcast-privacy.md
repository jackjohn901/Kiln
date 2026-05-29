---
name: WebSocket global broadcast privacy
description: What may and may not be included in broadcastAll (all-clients) websocket fanout
---

Global websocket fanout (`broadcastAll` in api-server `lib/websocket.ts`) reaches
every connected client. Such events must carry only public aggregate data
(e.g. a post's like/save total), never actor identity or per-user action records.

**Why:** Including the acting `userId` in a like/save event broadcast to all
clients leaks the platform-wide per-user interaction graph; saves in particular
are private. A code review flagged this as a serious information-disclosure issue.

**How to apply:** When adding a new `broadcastAll` event, strip user identifiers
and anything record-specific. If a recipient genuinely needs actor identity
(e.g. an author's "someone liked your post" notification), send that with the
user-scoped `broadcast(userId, ...)` instead, keeping the global event aggregate-only.
