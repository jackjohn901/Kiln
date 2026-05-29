---
name: Kiln mutation error handling
description: When a silent .catch on a fetch needs user feedback vs. when leaving it silent is correct.
---

# User-initiated mutation fetches must surface failure

Kiln has a shadcn toast available as `import { toast } from "@/hooks/use-toast"` and a `<Toaster/>` mounted in `App.tsx`. `toast` is a standalone function and works inside contexts/providers, not just components.

**Rule:** a fetch that performs a user-initiated mutation (POST/PATCH/PUT/DELETE the user explicitly triggered) must not swallow errors with `.catch(() => {})` or empty `try/catch {}`. Gate on `r.ok` (throw on `!r.ok`), then show a `variant: "destructive"` toast. If the UI was updated optimistically, **revert that state in the catch** so the screen never shows success after a failed request.

**Why:** silent swallow leaves users stuck with no feedback, and worse, several handlers showed success regardless of outcome (e.g. EditProfile set "saved" and navigated away even on a failed PATCH; ListingDetail marked a review submitted on failure). That is the fabrication problem in a different form — the UI asserts something happened that didn't.

**How to apply / capturing prior state for revert:**
- Component-local optimistic state: snapshot the value before the optimistic `setX(...)` (e.g. `const prevListings = apiListings;`) and restore it in `.catch`.
- Reducer-style `update((s) => ...)` state (SocialContext): capture the prior item *inside* the updater (`prevInquiry = s.find(...)`) since the `useCallback` has empty deps and closes over stale `state`.

**Deliberately left silent (NOT bugs):** notification mark-read PATCHes and like/save/follow toggles. They are optimistic, self-healing on reload, high-frequency, and low-stakes — a toast on every transient failure would be noise. Cart sync mutations toast but do **not** revert, because localStorage is the source of truth and the item legitimately stays in the local cart.
