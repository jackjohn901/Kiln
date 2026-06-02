---
name: Kiln guild discussion channels
description: The fixed channel allowlist for guild discussions is duplicated in server + client and must stay in sync.
---

# Guild discussion channels (topics)

Guild "Discussions" are split into a **fixed set of channels** (topics), not free-form. A post in a guild carries an optional `topic` column on `community_posts`.

The allowed channel list is **hard-coded in two places that must match**:
- Server: `GUILD_TOPICS` in `artifacts/api-server/src/routes/community.ts`
- Client: `DISCUSSION_CHANNELS` in `artifacts/kiln/src/pages/GuildDetail.tsx`

**Why:** the server rejects any `topic` not in its allowlist with `400 Unknown channel` on both `POST /community` (create) and `GET /community/guilds/:guildId?topic=` (filter). This stops crafted clients from creating off-menu channels that the pill UI can never surface. If the two lists drift, legitimate client posts/filters start 400-ing.

**How to apply:** when adding/renaming/removing a channel, edit BOTH constants in the same change (exact string match, including spacing like `"Buy / Sell / Trade"`). The client uses `"all"` as a sentinel meaning "no topic filter" (it omits the query param); the server treats absent/empty topic as no filter and stores `General` as the default when posting from the "All" view.
