---
name: Kiln feed music library
description: How feed background music is sourced, served, and auto-matched to a reel's craft.
---

# Kiln feed background music

The feed plays a per-reel background track (`reel.musicTrackId`) via an HTMLAudioElement
with crossfade, ducking the video's own audio. Track metadata lives in
`artifacts/kiln/src/data/music.ts` (`musicTracks`), resolved by `getTrackById(id)`.

## Sourcing rules
- **Default music id must be a real id in `musicTracks`, or reels play silently.** A
  long-standing bug used a non-existent fallback id, so any reel without an explicit
  track had no music. When changing a fallback/default id, grep that it exists.
- **Kiln Originals** (AI-composed, owned by Kiln) live in `public/music/` and are served
  via `${import.meta.env.BASE_URL}music/...` (relative/https — safe in prod). Prefer them
  over external CC URLs: no external host, no attribution/licensing risk, https by
  default. Older CC tracks (Kevin MacLeod / Scott Buckley / FMA) remain the wider library.

## Original sound vs auto-matched music
- **Empty `musicTrackId` ("") is the "original sound" sentinel** — no background-music
  layer; the video plays its own audio (HTML5 unmute effect uses volume 1.0 when no
  track; Mux `muted` also keys off `!!reel.musicTrackId`).
- **Real videos default to original sound; only audio-less content (seed image reels,
  photo posts) gets auto-matched music.** Detect video by `post.type==="video"` /
  `p.videoUrl||p.muxPlaybackId` in Feed's reel mappers. Explicit artist pick still wins.
  - **Why:** TikTok/Reels behavior — a creator's own sound shouldn't be ducked under an
    auto-chosen track; but silent thumbnails/photos still need music.
- **Any path that returns without playing a track must also pause `audioRef` + reset
  `lastTrackIdRef`** (empty id AND unknown/invalid id), or the previous reel's music keeps
  playing over the new one. The "skip if unchanged" fast-path must not resume a stale
  paused element on an original-sound reel.

## Auto-match (craft → music)
`pickTrackForCraft(craft, seed)` / `craftMoodFor(craft)` in music.ts map a
craft/technique/medium string to a track `craftMood` via ordered keyword regex, then
deterministically pick a track from that mood pool by hashing `seed`.
- **Why:** music should fit the video (fire/metal → energetic, wheel/carving → focused,
  fiber → warm) instead of being random; deterministic so a post's song is stable.
- **How to apply:** it is the *fallback* only — an explicit artist pick
  (`post.musicTrackId` / `p.musicTrackId`) always wins. Keyword order matters: fire terms
  must precede "wood" so "wood-fired" → Hot Shop, not Deep Focus. Not every craftMood is
  produced by the map (Energetic/Finishing stay manual) — that's fine, but every mood
  must keep ≥1 track or the pool would be empty.

## Side effects / gotchas
- `reels.ts` assigns seeded-reel music by `pickTrackForCraft(...)`; changing the catalog
  or the mood map changes which song seeded reels get. The MusicPicker "Trending" shelf
  looks tracks up by hardcoded id (not index), so catalog order changes don't break it.
- ElevenLabs music gen caps at 2 concurrent requests (429 otherwise) — generate in pairs.
