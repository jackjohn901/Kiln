# Kiln — Artist Creator Platform

A TikTok/Instagram Reels-style creator platform for craft artists at kilnfire.replit.app/kiln/.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/kiln run dev` — run the frontend (reads PORT from env)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + Tailwind (artifacts/kiln)
- API: Express 5 (artifacts/api-server, port 8080)
- DB: PostgreSQL + Drizzle ORM (lib/db)
- Auth: Replit Auth via `useAuth()` hook from AuthContext
- Build: esbuild (CJS bundle for API)

## Where things live

- `lib/db/src/schema/` — source of truth for all DB tables
- `artifacts/api-server/src/routes/index.ts` — all API routes registered here
- `artifacts/api-server/src/lib/seed.ts` — seed data (v4 marker = seed-v4-marker)
- `artifacts/kiln/src/contexts/` — AuthContext, ProfileContext, SocialContext, CartContext
- `artifacts/kiln/src/pages/` — all page components
- `artifacts/kiln/src/data/` — static reference data (techniques, materials, etc.)

## Architecture decisions

- All social actions (like/save/comment/follow) go through SocialContext — no inline fetch calls in pages.
- Feed is DB-first: For You loads real posts from `/api/feed` (scored by engagement) as the primary content; static `REELS` from `@/data/reels` are appended only as filler to reach a minimum feed length when real content is sparse. Following tab uses `/api/feed/following`. All API posts are mapped to `Reel` via the single `apiPostToReel` helper in `Feed.tsx` (maps `muxPlaybackId` so uploaded videos play).
- Seed data uses a marker user ID (e.g. "seed-v4-marker") to run exactly once on server start.
- GuildDetail and PatronTiers fetch from the API when the local static data file has no matching entry.
- MobileNav is `fixed bottom-0 z-50` — any page with a bottom submit button needs `pb-28 md:pb-8`.

## Product

Full creator platform for craft artists:
- **Feed** — TikTok-style vertical video/photo reels, For You + Following tabs
- **Shop** — Buy original works directly from artists (listings, wishlist, cart)
- **Drops** — Limited-edition timed releases with waitlist + patron early access
- **Auctions** — Live bidding on one-of-a-kind works with real-time bid counts
- **Workshops** — Book in-person and online classes from working artists
- **Guilds** — Technique-based communities (join, post, member directory)
- **Patron Tiers** — Monthly subscription tiers to support individual artists
- **Commissions** — Request custom work; artists manage quotes/milestones
- **Earnings** — Artist dashboard for tips + subscription income
- **Analytics** — Post performance stats for logged-in artists
- **Messages** — Direct messaging between users
- **Notifications** — Real-time activity feed (likes, follows, tips, bids, etc.)
- **Discover** — Browse artists by technique, location, commission availability
- **Profiles** — Full artist profiles with posts, shop, patron link

Static/reference pages (no backend required): Techniques, Materials, Mentorship, Opportunities, Process Journals, Lineage/Craft DNA.

## Seed Artists

All seed data uses IDs prefixed `seed-`:
- `seed-elena-vasquez` — Elena Vasquez (Ceramics, Portland OR)
- `seed-marco-chen` — Marco Chen (Glasswork, Brooklyn NY)
- `seed-zoe-nakamura` — Zoe Nakamura (Weaving, Seattle WA)
- `seed-felix-okafor` — Felix Okafor (Woodwork, Chicago IL)
- `seed-aria-patel` — Aria Patel (Metalwork, San Francisco CA)
- `seed-sam-rivera` — Sam Rivera (Pottery, Austin TX)

## Gotchas

- Seed marker must be bumped (seed-v3 → seed-v4 etc.) to re-run seed on a live DB.
- All authenticated API calls need `credentials: "include"` in fetch options.
- `pnpm run dev` at workspace root has no script — run individual packages via workflows.
- Static guild/artist data files in `src/data/` are for reference/demo data; DB is source of truth for real users.
- **Do not use `.catch(() => {})` on user-initiated mutation fetches** (Setup, ReelStudio, StitchStudio, etc.). It silently fails and leaves users stuck without feedback. Always handle errors: show toast / inline error / retry UI.
- **Framer Motion `animate` values must be clamped** when computed from unbounded inputs (timestamps, scroll positions). E.g. `Math.max(0, Math.min(1, (now - start) / duration))` for volume fades. Negative values crash React updates silently.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
