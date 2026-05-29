---
name: Kiln fabricated-data hotspots
description: Where the Kiln frontend hides hardcoded "demo" numbers styled as real stats, and how to vet audit reports.
---

# Kiln fabricated-data hotspots

Kiln's frontend pages frequently embed hardcoded arrays / constants that are rendered to look like real, personalized analytics or live community data. Recurring "remove fake data" audits keep finding new ones. Known offender *patterns* (not an exhaustive list):

- Per-item arrays of `{ label, pct }` or `{ ...stats }` rendered as bar charts / percentages (e.g. audience demographics, medium affinity, follower types).
- Hardcoded "A/B test" / performance numbers for a feature that has no backend at all.
- Hardcoded "people like you" / "twins" lists with fake names + avatars + match %.
- Deterministic-hash or `Math.random()` helpers that invent metrics (e.g. lifetime "studio hours") or shuffle rankings to look "dynamic".
- Static `MARKET_DATA`-style maps presented as live marketplace comparisons.

**Why it matters:** the product rule is "never show fabricated numbers as real." If there is no backing data source AND no real feature, prefer deleting the section over showing an empty state — an empty state falsely implies the capability exists.

**How to apply:**
- Audit by grepping pages for inline `[{...}]` literals feeding charts/stat cards, `Math.random`, `Math.imul`/hash helpers, and constants named like `*_DATA`, `*_TWINS`, `SEED`.
- Distinguish legitimate user-input estimators (e.g. a cost-plus price calculator driven by the user's own inputs) from fabricated "market"/"audience" data — keep the former (label it as an estimate), remove the latter.
- **Vet explorer/architect reports before acting:** an explore subagent over-reported here (claimed CollectorPortal had a fake "estimated collection value / roadmap" and CraftAssistant had dishonest status strings — neither existed; both already used real APIs / honest fallbacks). Always grep to confirm a flagged string/section actually exists before "fixing" it.
