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
- Per-artist values derived from a hash of the artist id (e.g. commission price ranges) — looks personalized but is invented; replace with "Quoted per project" / honest copy.
- **Seed/default state that backfills *empty* user data with fabricated history** (e.g. a personal tracker that injects example logs when the API returns none, or `readState()` returning a SEED_STATE with fake entries). This shows invented activity as the user's own. For a *real* feature with no data yet, default to empty + an honest empty state — the opposite of the "delete the section" rule below, which is for features with no backend at all.
- **Fabricated dates/timestamps** presented as real event times — a hardcoded "Member since March 2025" shown to every user, or per-milestone/achievement month labels assigned client-side when no real timestamp is stored. If there's no real timestamp source, drop the date rather than inventing one; the milestone/achievement itself can stay if it's driven by real activity counts.
- **Hardcoded weighting/multiplier tables that silently change a computed result** (e.g. per-technique price multipliers, per-size factors) presented as authoritative premiums. Replace with a single user-controlled input (e.g. a markup slider the artist owns) so the number isn't fabricated by us; keep the now-decorative selector as honest metadata only, and make sure it no longer secretly affects the math.
- **Hardcoded trend deltas on stat cards** (`change: "+34%"`/`"+2.4%"` literals shown next to a real value as if measured). The value can be real while the delta is invented — set delta to empty/omit it unless there's a real comparison source.
- **Synthetic "views"/secondary metrics derived from another metric** (e.g. rendering `likes * 12` as "views"). A multiplier of a real number is still fabricated — drop the derived metric.
- **"Sold works"/provenance tabs** with hardcoded collector regions, sale prices, and acquired-dates built from inline arrays indexed by `i % n`. No backend exists for verified sales — use an honest empty state, not invented acquisition records.
- **Client-supplied metric that the server persists and the UI later renders as authoritative** (e.g. newsletter `recipientCount` sent in the POST body, stored verbatim, then shown in history). Removing the client send is not enough — the *server* trusting the field is the real leak, since a crafted request can still store a fabricated total. Make the count server-owned: ignore the client field, store `0`/null until a real pipeline computes it, and have the UI display it only when `> 0`. Also: a send-failure path must not append a synthetic "sent" record locally (shows unsent activity as done) — surface an error instead.

**Why it matters:** the product rule is "never show fabricated numbers as real." If there is no backing data source AND no real feature, prefer deleting the section over showing an empty state — an empty state falsely implies the capability exists.

**How to apply:**
- Audit by grepping pages for inline `[{...}]` literals feeding charts/stat cards, `Math.random`, `Math.imul`/hash helpers, and constants named like `*_DATA`, `*_TWINS`, `SEED`.
- Distinguish legitimate user-input estimators (e.g. a cost-plus price calculator driven by the user's own inputs) from fabricated "market"/"audience" data — keep the former (label it as an estimate), remove the latter.
- **Vet explorer/architect reports before acting:** explore/architect subagents over-report here — they have flagged fake sections (e.g. "estimated collection value", `Math.random` XP) that did not actually exist, on pages that already used real APIs / honest fallbacks. Always grep to confirm a flagged string/section actually exists before "fixing" it.
- **Removing a localStorage-seeded fallback is not enough on its own.** When a page initialized state from `readX()` that fell back to a `SEED_*` array (e.g. `kiln_glaze_formulas`, `kiln_boards`, provenance), deleting the seed leaves two leaks for *returning* users: (1) the fake records were already persisted to localStorage on a prior visit, and (2) API hydration that only overwrites when the server response is non-empty will never clear them. Fix both: bump the storage-key version (`_v1`→`_v2`) so legacy seeded entries are abandoned, and make the API authoritative even on empty success — `setX(data ?? [])` / `if (Array.isArray(saved)) setX(saved)`, not `if (data?.length)`. Note: if the seed was *also* synced to a server field (GlazeOracle wrote `glazeFormulas` into `/api/me/settings`), the key bump won't purge the server copy — only the UI delete action or a server cleanup will.
