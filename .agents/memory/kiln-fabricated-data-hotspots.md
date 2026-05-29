---
name: Kiln fabricated-data hotspots & anti-fabrication rule
description: Where Kiln renders fabricated numbers/activity as real, and the standard fix pattern for the "never show fabricated data as real" rule.
---

# Anti-fabrication rule (Kiln)

Core product rule: NEVER present fabricated numbers/people/dates/counts/activity as
real. Decision tree per surface:
- Backed by a real API → show real data, with an honest empty state when there is none.
- Not backed by any API → delete the fabricated metric/section (do not invent values).
- Success UI only on a confirmed server result (`res.ok`), never in a `catch`/finally.

**Why:** soft-launch users must never be shown fake spend, fake counts, or fake
"sent/submitted" confirmations. A swallowed error that still flips to a success state
is the most common offender.

## Demo content vs fabricated stats — the key distinction

These datasets are intentional placeholder *content* (like REELS filler) and are NOT
to be deleted wholesale: `data/seedArtists.ts` (used in ~26 files as the content
backbone), `data/collectors.ts`, `data/mentors.ts`, `data/drops.ts`,
`data/workshops.ts`. What must be neutralized is the fabricated *numbers/activity*
rendered from them as if real: spend totals, owned-piece/follower counts, mentor
"X mentored"/"X spots open", drop/workshop live waitlist & spots-left counts,
view/reply counters, fallback craftScore. Biographical facts (e.g. a real artist's
years of experience) and default placeholder avatars for real people are fine.

## Fix patterns proven here

- Mutation handlers (apply/submit/duet/commission/verify): gate the success state
  transition on `if (!res.ok) throw`, set a real error state in `catch`, reset
  loading in `finally`. Never mark "applied/submitted/done" before the server confirms.
- Error banner convention: `border-rose-500/30 bg-rose-500/10 text-rose-300` with an
  `AlertCircle` icon (size ~13–15).
- After removing a rendered stat, grep the file for the symbol — removing the only
  usage of an icon import or a local helper (e.g. a `fmt` money formatter) leaves an
  unused symbol that fails `noUnusedLocals` on typecheck.

## Tooling gotcha

`bash`/`rg` output in this repo obfuscates identifiers (field names → single letters,
import paths → "ln"), and `rg -c` counts the import line itself. Trust the `read` tool
for real content; confirm "unused" by reading, not by raw grep counts alone.
