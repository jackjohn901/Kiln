---
name: Create-flow navigation
description: How Kiln create flows should route the user after a successful POST.
---

# Create-flow navigation

After a successful create POST, navigate the user **directly to the new item's
detail page** using the id returned by the API, instead of showing a "done"
interstitial that requires another click:
- Auctions: `/auctions/:id` (POST `/api/auctions` returns the auction object).
- Listings: `/listings/:id` (POST `/api/listings` returns `{ listing: {...} }`).

**Why:** A user created an auction on the published app and reported "nothing
showed up." The interstitial sent them to the Auctions list, whose **Live tab
filters `status === "live" && endDate > now`** — a freshly created auction can be
misclassified `upcoming` (client/server clock skew) and be hidden. The detail
page loads by id regardless of status/tab, so the creator always sees their work.

**Also:** server now only marks an auction `upcoming` when `startDate > now + 60s`
(see auctions POST), so a "start now" auction isn't hidden by minor clock drift.

**How to apply:** When adding/editing any create flow, return the created row's id
from the API and `navigate` straight to its detail route; keep a sensible fallback
(e.g. the shop) when no id comes back. Avoid success interstitials for create.
