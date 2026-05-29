---
name: Kiln video uploads must go through Mux
description: Why user-uploaded videos must use the Mux path, not object storage, and which fields must be persisted for grid/feed/detail rendering.
---

# Kiln video uploads must go through Mux

User-uploaded videos in Kiln must be uploaded via the Mux path (`uploadVideo()` in `useUpload`), NOT the object-storage `upload()` path. Capture the returned `playbackId` and persist `muxPlaybackId` to BOTH localStorage (`addPost`) and the DB (`POST /api/posts`). Set `mediaUrl`/`videoUrl` to the Mux HLS URL (`https://stream.mux.com/<id>.m3u8`) and `thumbnailUrl` to the Mux image URL (`https://image.mux.com/<id>/thumbnail.jpg`).

**Why:** Object-storage MP4s rendered as solid black cells on the profile grid and frequently failed to play on mobile (iOS `<video preload="metadata">` paints no first frame; client-captured `data:` thumbnails are stripped by `addPost`, and the DB stored `thumbnailUrl: null` for videos). The app already standardized on Mux everywhere else — Feed plays via `MuxPlayer`, ReelStudio builds HLS from `muxPlaybackId`, and the grid builds thumbnails via a `muxThumb(playbackId)` helper.

**How to apply:** Any create/edit surface that publishes video (there are multiple: `Create.tsx` and `ReelStudio.tsx`) must follow this. Renderers should prefer `MuxPlayer` when `muxPlaybackId` is present, falling back to native `<video>` then `<img>`. Mux upload failure should throw and surface an error to the user (no silent object-storage/IndexedDB fallback) — consistent with the "no silent mutation failures" rule.
