---
name: Referral tree cycle-safety
description: Why a unique-parent constraint is not enough to keep a multi-level referral/network tree acyclic, and what to enforce.
---

# Referral / network tree cycle-safety

A `unique` constraint on `referee_id` (one parent per user) does **not** prevent cycles. Example: A refers B, then A redeems B's code → A→B and B→A, a loop.

**Rule:** before recording a referral edge (referrer→referee), reject it if the redeeming user is already an ancestor of the code owner (walk the ancestor chain up from the referrer and check membership). Combined with the existing self-code and already-redeemed checks, this keeps the graph an acyclic forest.

**Why:** the network/downline features use recursive CTEs (`WITH RECURSIVE`). On a cyclic graph these traverse the loop until the depth cap, double-counting nodes across levels — which inflates network totals and mis-awards the tiered network badges (badges are granted by recomputed count on redemption and lazily on view).

**How to apply:**
- Keep all recursive walk depth caps consistent across queries (one canonical value) so badge state and UI never disagree on deep trees.
- Compute the network total with a single `COUNT(DISTINCT referee_id)` over the whole downline, never as a sum of per-level counts.
- Index the parent column (`referrer_id`) since every downline/ancestor walk traverses parent→child edges.
- Rewards are badges/status only — no money flows between members (deliberately not an MLM payout; multi-level cash payouts for recruiting are a pyramid scheme).
