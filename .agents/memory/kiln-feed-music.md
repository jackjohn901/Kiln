---
name: Kiln feed music library
description: How feed background music is sourced/served and the silent-default gotcha.
---

# Kiln feed background music

The feed plays a per-reel background track (`reel.musicTrackId`) via an HTMLAudioElement
with crossfade, ducking the video's own audio. Track metadata lives in
`artifacts/kiln/src/data/music.ts` (`musicTracks`), resolved by `getTrackById(id)`.

## Default-fallback gotcha
**The feed's default music fallback id must be a real id in `musicTracks`, or default
reels play silently.** A long-standing bug used `"track-ambient-1"` as the fallback in
Feed.tsx — no such track existed, so `getTrackById` returned undefined and any reel
without an explicit track had no music. Fallback now points to a real id
(`"kiln-slow-wheel"`).
**How to apply:** when changing the default music id, grep that the id exists in
`music.ts`.

## Kiln Originals (AI-composed, owned by Kiln)
Original instrumental beds are generated with `generateMusic` and stored in
`artifacts/kiln/public/music/<id>.mp3`, served at `${import.meta.env.BASE_URL}music/<id>.mp3`
(resolves to `/kiln/music/...` in prod — relative/https, safe). They sit at the TOP of
`musicTracks` (one per craftMood) and carry `license: "Kiln Original"`, which the
MusicPicker uses to show an "Original" badge.
**Why originals over external CC URLs:** no external host, no attribution/licensing
risk, and https by default. The older CC tracks (Kevin MacLeod / Scott Buckley / FMA)
remain as the wider library.

## Side effects of catalog order
`reels.ts` auto-assigns seeded-reel music by `musicTracks[hash % length]`, so changing
the array length/order deterministically reshuffles which default song seeded reels get.
The MusicPicker "Trending" shelf looks tracks up by hardcoded id (not index), so order
changes don't break it. ElevenLabs music gen caps at 2 concurrent requests (429
otherwise) — generate in pairs/sequentially.
