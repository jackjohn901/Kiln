---
name: Mobile review-prompt + onboarding gating
description: How/when to trigger app-store review prompts and one-shot onboarding in the Expo app.
---

# Review prompt + one-shot onboarding (kiln-mobile)

A native store-review prompt (`expo-store-review`) is triggered at the end of the
first-run onboarding flow, not on app launch.

**Rule:** The review request must be best-effort — call `StoreReview.hasAction()`
first, wrap in try/catch, and never let it block navigation into the app.

**Rule:** Onboarding is one-shot per install, gated by an AsyncStorage flag
(`kiln:onboarding_done`). The gate hook resolves exactly once per sign-in:
mark the gate handled after the first storage read *regardless of the stored value*
so later navigation doesn't re-read storage; capture auth state at read start to
ignore stale completions if the user signed out mid-read; reset the handled flag
on sign-out so a future sign-in re-evaluates.

**Why:** Prompting for a review immediately on launch feels spammy and Apple/Google
rate-limit it anyway; tying it to a positive "wow" onboarding moment converts better.
Re-reading the flag on every navigation change contradicts one-shot semantics and
adds race risk around auth/navigation timing.

**How to apply:** Lives in `app/onboarding.tsx` (flow + requestReview) and
`useOnboardingGate` in `app/_layout.tsx` (the gate). Any new first-run prompt
(notifications permission, etc.) should follow the same best-effort, post-onboarding,
once-only pattern.
