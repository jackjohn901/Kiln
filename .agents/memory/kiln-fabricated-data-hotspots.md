---
name: Kiln fabricated-data anti-patterns
description: Recurring ways Kiln showed fake activity as real, and the rule for fixing them
---

# Kiln: never present fabricated activity as real

**Rule:** No UI may present invented people, counts, dates, reviews, achievements,
or success states as if they were real platform activity. Derive from real data,
or show an honest empty/error state.

**Why:** Kiln is a live creator marketplace; fake "X reviews", "followers",
"recent stitches", canned "AI" answers, or "Published!" on failure mislead real
users and erode trust at soft launch.

**Recurring anti-patterns to scan for (they reappear in new pages):**
- Hardcoded `SEED_*` / demo arrays rendered in production UI (artists, reviews,
  achievements, "recent activity" feeds). Replace with a real API fetch (e.g. the
  public `/leaderboard`) or compute from real props (follower/post/listing counts).
- Client-side keyword "fallback" answers shown as if an AI/service replied when the
  real API fails. Show a single honest "unavailable" message instead.
- Success screens reached on failure: a mutation handler that flips to a "done"/
  success state in the `!res.ok` / `catch` branch. Gate success strictly on
  confirmed server result; on failure set an error state and keep the user on the form.
- Empty-state math: averages/ratings that divide by `length` crash or show `NaN`
  when there are zero items — guard `length ? ... : 0`.

**Delete vs empty-state:** If a section is backed by a real feature (reviews,
achievements, artist list), keep it and show an honest empty/real state. If it has
NO backing feature/data source (e.g. "recent stitches"), delete the section
entirely rather than faking it or leaving a permanently-empty shell.

**How to apply:** When adding or reviewing any Kiln page, check every rendered
number/name/date and every mutation's failure branch against this rule before ship.
