---
name: Onboarding auth gating (front-load sign-in)
description: Why profile-creation / multi-step onboarding must require sign-in up front, not at submit.
---

# Front-load sign-in before data-creating onboarding

Any multi-step onboarding flow that ends in an authenticated write (e.g. Setup →
PATCH /api/me/profile) must put the sign-in step at the **front**, before the user
fills anything in — not silently at submit time.

**Why:** Replit Auth signs users in via a full-page redirect to the Replit OIDC
page. That redirect wipes all in-memory React state, so deferring auth to the
final "Publish" step means a 401 fires `kiln:session-expired`, yanks the user off
to the sign-in page mid-flow, and they lose everything they typed. Non-technical
users read this as "the app is broken." Front-loading also lets the redirect be
framed and branded ("Continue to secure sign-in") instead of a surprise.

**How to apply:** Gate the onboarding page on `useAuth()`: show `AuthSplash` while
`isLoading`, and a branded sign-in CTA (calls `login()`) while `!isAuthenticated`,
before rendering the form. `login()` returns the user to the current pathname, so
they land back on the same page authenticated. Keep a public "browse first" escape
hatch (e.g. `/?skipLanding=true`) so gating a page doesn't kill logged-out
exploration. Note: switching the whole app to in-app Clerk sign-in is NOT an option
— migrating off Replit Auth to Clerk is unsupported.
