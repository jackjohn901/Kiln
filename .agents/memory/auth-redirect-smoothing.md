---
name: Auth redirect smoothing
description: How to keep the Replit OIDC login hop feeling branded/seamless instead of "choppy bounce to Replit".
---

# Keeping the login redirect smooth

The Replit OIDC consent/login page itself cannot be rebranded. Smoothness comes from two levers on our side:

1. **Do not force `prompt: "login consent"`** in the OIDC authorization URL (routes/auth.ts `GET /login`). Omitting `prompt` lets users with an active Replit session pass through silently — they barely see Replit. Forcing `login consent` drags every returning user through Replit's screen on every login = the "choppy" complaint. state/nonce/PKCE still protect CSRF/replay, so dropping prompt is safe.
   **Why:** user reported the redirect to Replit felt choppy and un-branded.

2. **Branded splash, never blank.** Body bg is already dark (`--background: 20 8% 9%`), so blank screens aren't white — but show `AuthSplash` (Kiln flame) during `isLoading` and while a login/logout redirect is in flight (wrapped in AuthContext) for continuity. `components/AuthSplash.tsx`.

**Trade-off:** without forced prompt, shared-browser users are silently re-authed to the active Replit account. If account-choice is ever needed, add an opt-in route that sets `prompt: "login"` only when the user asks to switch.
