---
name: Notification icon presentation
description: Where notification types and their web/mobile icons are single-sourced
---
The `NotificationType` union and per-type `{icon,color}` presentation are single-sourced in lib `@workspace/notifications`. `SocialContext.KilnNotification.type` imports that union.

**Rule:** add a new notification type only in `lib/notifications/src/index.ts` (union + `NOTIFICATION_ICONS`). Icon ids are concept-based (`craft`, `money`, `purchase`, ...), not glyph-based; each platform maps the id to its own library: web `ICON_COMPONENTS` (lucide) in `NotificationPanel.tsx`, mobile `FEATHER_ICONS` (Feather glyphs) in `app/(tabs)/notifications.tsx`. Both are exhaustive `Record<NotificationIconName, ...>`.

**Why:** web and mobile previously kept independent icon maps that silently drifted (the `sale` gap). Exhaustive Records make a missing mapping a compile error, not a silent bell fallback.

**How to apply:** reusing an existing icon id needs zero per-platform edits. A genuinely new icon id requires adding it to `NotificationIconName` plus both platform glyph maps (TS forces it). lucide↔Feather lack a shared icon set, so glyphs may differ per platform (e.g. commission Hammer vs tool); colors/concepts stay identical.

Note: server (`artifacts/api-server`) emits some notif types NOT in the union (e.g. `resale`, `order_shipped/delivered/tracking_updated`, `mention`, `pledge_update`) via `as any`; those render the default bell until added to the union.
