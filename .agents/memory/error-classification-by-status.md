---
name: Classify request failures by OUR HTTP status, not response body text
description: Why matching "401"/"unauthorized" in an error body misfires, and the loop it caused in the Create/post flow
---

Do not infer "user session expired" by regex-matching an error message/body for
"401" or "unauthorized". Decide auth-vs-other failures from the HTTP status of
*our own* endpoint, surfaced as a typed error (e.g. `UploadError.status`).

**Why:** The video post path calls our `/api/video/upload-url`, which returns
**500** when the upstream Mux API rejects *our* server credentials with its own
`401 {"error":{"type":"unauthorized"...}}` body. A frontend catch that matched
`/unauthorized|401/i` on that body misread a Mux credential outage as the user's
session expiring, showed "session expired — sign in again", the user re-logged
in successfully, retried, hit the same Mux 500, and looped forever. The user's
session was actually fine the whole time (auth/user + /me/* all returned 200/304).

**How to apply:** Upload helpers throw `UploadError(message, status)` carrying
the failed request's HTTP status. Callers branch on `status === 401` (real
session expiry → re-login UI), `429` (rate limit), else a generic "couldn't
upload your media" message — never a re-login prompt. A third-party service's
own auth error must never be promoted to a user-session error.
