---
name: Mixed-content http assets break on prod
description: Embedded media URLs must be https or they are blocked on the production https site.
---

Any embedded media URL (image `src`, `imageUrl`, `images[].url`, video, font, etc.) hardcoded
as `http://` will be blocked by the browser as mixed content when the app is served over
https (production / deploy domains), rendering as a broken image. Dev over http hides this.

**Why:** Kiln's static reference data (`artifacts/kiln/src/data/*.ts`) hotlinks external
artist images; one used an `http://` host that doesn't serve https, so it broke only in prod.

**How to apply:** Keep all embedded-asset URLs https. If a source host has no https, swap to
a verified https image (e.g. via image-search, confirm it returns 200 + image content-type).
Plain outbound link hrefs (`website: "http://..."`) are NOT mixed content and are exempt.
Consider a guard that rejects `http://` in media fields (imageUrl / images[].url).
