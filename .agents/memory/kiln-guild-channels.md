---
name: Kiln guild discussion channels
description: Guild discussion channels are per-guild, stored in the DB, and server-authoritative — not a hardcoded allowlist.
---

# Guild discussion channels (topics)

Guild "Discussions" are split into channels (topics), not free-form. A guild post carries an optional `topic` column on `community_posts`.

Channels are **per-guild and stored in the DB**: `guilds.channels` (nullable `text[]`). When a guild has no custom list, both server and client fall back to a `DEFAULT_CHANNELS` const (`["General","Show & Tell","Help & Critique","Buy / Sell / Trade"]`) duplicated in `routes/guilds.ts`, `routes/community.ts`, and `GuildDetail.tsx`. Founders/admins edit a guild's channels via `POST /guilds/:id/channels`.

**Why:** the server validates any incoming `topic` against *that guild's* channel list (its `channels` or the default) on `GET /community/guilds/:id?topic=` and `POST /community`, rejecting off-menu topics with `400 Unknown channel`. Validation is server-authoritative — never trust the client's pill list.

**How to apply:**
- To change a guild's channels at runtime, go through the channels endpoint; do not edit constants.
- Only the `DEFAULT_CHANNELS` fallback is duplicated across the three files — keep those in exact-string sync (including spacing like `"Buy / Sell / Trade"`).
- Guild privacy is enforced in `community.ts` via `loadGuildAccess(guildId, viewerId)`: a guild that exists in the DB and is `isPublic === false` is members-only (GET 404s outsiders, POST 403s them). Static/demo guilds from `src/data/guilds.ts` are NOT in the DB (`loadGuildAccess` returns null) and stay openly readable/writable as before — do not "fix" that into a 404 or it breaks demo guild discussions.
- Pin: `POST /community/:postId/pin` is guild-posts-only and gated to founder/admin/moderator; GET ordering already sorts `isPinned` first.
