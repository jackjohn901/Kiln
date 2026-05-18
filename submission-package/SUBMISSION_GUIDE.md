# KilnFire — App Store & Google Play Submission Package
*Prepared May 2026*

---

## CONTENTS OF THIS PACKAGE

```
submission-package/
├── SUBMISSION_GUIDE.md          ← This file (read first)
├── icons/
│   ├── icon.png                 ← App icon (dark / primary) — 1024×1024
│   ├── icon-light.png           ← iOS 18 light variant — 1024×1024
│   └── icon-tinted.png          ← iOS 18 tinted variant — 1024×1024
└── screenshots/
    ├── 01-feed.jpg              ← Video feed screen
    ├── 02-discover.jpg          ← Discover artists screen
    ├── 03-shop.jpg              ← Shop / marketplace screen
    ├── 04-workshops.jpg         ← Workshops screen
    ├── 05-artist-profile.jpg    ← Artist profile screen
    └── 06-guilds.jpg            ← Craft guilds screen
```

---

## APP IDENTITY

| Field | Value |
|-------|-------|
| **App Name** | KilnFire |
| **Bundle ID (iOS)** | app.kilnfire |
| **Package Name (Android)** | app.kilnfire |
| **Version** | 1.0.0 |
| **Build Number (iOS)** | 1 |
| **Version Code (Android)** | 1 |
| **Copyright** | © 2026 KilnFire |
| **Primary Category** | Social Networking |
| **Secondary Category** | Lifestyle |
| **Age Rating** | 12+ (iOS) / Teen (Android) |
| **Framework** | React Native / Expo SDK 54 |

---

## URLS

| Field | Value |
|-------|-------|
| **Live Web App** | https://kilnfire.replit.app/kiln/ |
| **Privacy Policy** | https://kilnfire.replit.app/kiln/privacy |
| **Support URL** | https://kilnfire.replit.app |
| **Marketing URL** | https://kilnfire.replit.app |

> **Action required:** Update `privacy@kilnfire.app` in the privacy policy to a real monitored inbox before submitting — Apple reviewers may use it.

---

## LISTING TEXT (USE FOR BOTH STORES)

### App Name (30 chars max)
```
KilnFire
```

### Subtitle / Short Description (30 chars max — iOS subtitle; Google uses this differently)
```
The platform for craft artists
```

### Promotional Text — iOS only (170 chars max)
```
Watch craft artists work in real time. Buy original handmade pieces. Book workshops. Support the makers behind the things you love.
```

### Full Description (4,000 chars max — same text works for both stores)

```
KilnFire is the social platform built for craft artists and the people who love handmade work.

Whether you throw pottery, blow glass, weave textiles, forge metal, or carve wood — KilnFire is where you share your process, grow your audience, and earn from your craft.

─── FOR ARTISTS ───

SHARE YOUR PROCESS
Post short videos and photos of your work as it happens. Show the making, not just the made. Build a following of people who genuinely care about craft.

SELL YOUR WORK
List original pieces directly from your profile. No gallery cut. No middlemen. Set your price and ship to collectors who found you through your work.

BOOK WORKSHOPS
Offer in-person and online classes. Students book and pay through the app. You set the schedule, the size, and the price.

EARN FROM YOUR COMMUNITY
Accept tips. Set up patron tiers so your most dedicated followers get early access to drops and exclusive content. Real income from the people who love what you make.

DROP LIMITED EDITIONS
Create timed limited-edition releases with a waitlist. Build anticipation and sell out fast.

RUN COMMISSIONS
Accept custom work requests. Agree on scope, set milestones, and get paid as you deliver.

─── FOR COLLECTORS ───

DISCOVER ARTISTS
Browse by technique — ceramics, glasswork, weaving, metalwork, woodwork, pottery, printmaking, and more. Filter by location or commission availability.

BUY ORIGINAL WORK
Shop directly from artists. Every piece is one-of-a-kind and comes straight from the maker.

BID ON AUCTIONS
Place live bids on rare one-of-a-kind works. Watch the count go up in real time.

SUPPORT YOUR FAVOURITES
Become a patron to get early access to new drops, exclusive behind-the-scenes content, and a closer connection to the artists you love.

─── COMMUNITY ───

JOIN CRAFT GUILDS
Technique-based communities for makers. The Ceramic Arts Collective, The Glass & Fire Guild, The Woodturners' Circle, and more. Share work, get feedback, and find your people.

─── DISCOVER MORE ───

• TikTok-style vertical video feed — swipe through artist process videos
• Following feed — see only the artists you follow
• Trending techniques and rising artists updated weekly
• Save posts and build your own collection of inspiration
• Direct messaging with artists
• Real-time notifications for likes, comments, follows, and sales

KilnFire is free to join. Artists keep the majority of every sale.

Download KilnFire and get closer to the craft.
```

### Keywords — iOS only (100 chars max, comma-separated, no spaces after commas)
```
ceramics,pottery,craft,weaving,metalwork,artist,maker,workshop,handmade,glass,studio,kiln
```
*(89 characters — within limit)*

---

## WHAT'S NEW (Version 1.0 release notes — both stores)

```
Welcome to KilnFire.

Watch craft artists share their process. Buy original handmade work. Book workshops. Join craft guilds. Support the makers you love through tips and patron tiers.

This is the first release of KilnFire — the social platform built for craft artists.
```

---

## SCREENSHOTS

### Included screenshots (390×844px reference captures)

| File | Screen | Suggested caption |
|------|--------|-------------------|
| `01-feed.jpg` | Video feed | "Watch craft artists work in real time" |
| `02-discover.jpg` | Discover artists | "Discover makers by technique and location" |
| `03-shop.jpg` | Shop / marketplace | "Buy original work directly from artists" |
| `04-workshops.jpg` | Workshops | "Book hands-on workshops from working artists" |
| `05-artist-profile.jpg` | Artist profile | "Follow, support, and commission your favourites" |
| `06-guilds.jpg` | Craft guilds | "Join technique-based communities" |

### Required screenshot sizes

**Apple App Store** — you only need ONE size and Apple scales the rest:
- iPhone: **1290×2796px** (iPhone 16 Pro Max) ← recommended
- iPad (if submitting for iPad): 2048×2732px

**Google Play Store:**
- Phone screenshots: **1080×1920px** minimum (16:9 or 9:16)
- Feature graphic (required): **1024×500px** (landscape banner shown at top of listing)
- Hi-res icon: **512×512px** (use `icon.png` resized — it's already square)

> **How to get production-size screenshots:** Install the app via TestFlight or the Play Store internal track, then take real screenshots on an iPhone 16 Pro Max (or Simulator). Alternatively, use the Expo build and screenshot from Xcode Simulator set to iPhone 16 Pro Max.

---

## APP ICON NOTES

Three icon files are included:

| File | Use |
|------|-----|
| `icon.png` | Primary / dark mode (all platforms) |
| `icon-light.png` | iOS 18 light mode variant |
| `icon-tinted.png` | iOS 18 tinted variant |

**Apple App Store:** Submit `icon.png` as your 1024×1024 marketing icon in App Store Connect. Xcode will use all three variants automatically from the app bundle.

**Google Play:** Resize `icon.png` to **512×512px** for the hi-res icon field. The adaptive icon is already configured in the app (dark background `#191615` with the icon as foreground).

---

## AGE RATING

### Apple App Store — Age Rating Questionnaire

Answer every item as shown. Expected final rating: **12+**

| Question | Answer |
|----------|--------|
| Cartoon or Fantasy Violence | None |
| Realistic Violence | None |
| Prolonged Graphic or Sadistic Realistic Violence | None |
| Profanity or Crude Humor | None |
| Mature/Suggestive Themes | None |
| Horror/Fear Themes | None |
| Medical/Treatment Information | None |
| Alcohol, Tobacco, or Drug Use | None |
| Gambling | None |
| Sexual Content or Nudity | None |
| Graphic Sexual Content and Nudity | None |
| **User-Generated Content** | **Frequent/Intense** |
| Unrestricted Web Access | None |

### Google Play — Content Rating Questionnaire

Category: **Social**

| Question | Answer |
|----------|--------|
| User-generated content (photos, videos, text) | Yes |
| Shares user location | No |
| Contains ads | No |
| Violence | No |
| Sexual content | No |
| Profanity | No |
| Controlled substance references | No |

Expected rating: **Teen (T)** — due to user-generated content.

---

## iOS PERMISSIONS (already configured in app)

These strings appear in the system permission dialogs:

| Permission | Dialog text |
|-----------|-------------|
| Camera | "KilnFire uses your camera so you can record and share your craft process." |
| Microphone | "KilnFire uses your microphone when recording video." |
| Photo Library (read) | "KilnFire accesses your photo library so you can share images and videos of your work." |
| Photo Library (write) | "KilnFire saves media to your photo library." |

---

## ANDROID PERMISSIONS (already configured in app)

| Permission |
|-----------|
| CAMERA |
| READ_EXTERNAL_STORAGE |
| WRITE_EXTERNAL_STORAGE |
| RECORD_AUDIO |
| RECEIVE_BOOT_COMPLETED |
| VIBRATE |

---

## BUILDING THE APP (for the developer)

The app uses **Expo EAS Build**. Before building:

### Fill in these placeholders in `eas.json`

```json
"ios": {
  "appleId": "YOUR_APPLE_ID_EMAIL",        ← your Apple ID email
  "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",  ← numeric App ID from App Store Connect
  "appleTeamId": "YOUR_APPLE_TEAM_ID"       ← 10-char team ID from developer.apple.com
},
"android": {
  "serviceAccountKeyPath": "./google-service-account.json"  ← download from Google Play Console
}
```

### Fill in the EAS Project ID in `app.json`

```json
"extra": {
  "eas": {
    "projectId": "YOUR_EAS_PROJECT_ID"   ← from expo.dev after running `eas init`
  }
}
```

### Build commands

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in
eas login

# iOS production build (uploads to TestFlight automatically)
eas build --platform ios --profile production

# Android production build (.aab for Play Store)
eas build --platform android --profile production

# Submit to stores (after build completes)
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

---

## GOOGLE PLAY — ADDITIONAL REQUIREMENTS

Google Play requires a few things Apple doesn't:

1. **Feature Graphic** — 1024×500px landscape banner (not included — needs to be designed)
2. **Google Service Account JSON** — download from Google Play Console → Setup → API access → create a service account with "Release Manager" role. Save as `google-service-account.json` in the project root (do not commit to git).
3. **Data Safety form** — in Play Console, complete the Data Safety section. Key answers:
   - Collects: Name, Email address, User IDs, Photos/videos, Audio files
   - Shares data with third parties: No (unless Stripe/payment processor counts — check with legal)
   - Data encrypted in transit: Yes
   - Users can request deletion: Yes (via account deletion in settings)

---

## APPLE — ADDITIONAL REQUIREMENTS

1. **App Store Connect record** — create the app at appstoreconnect.apple.com before building. Set bundle ID to `app.kilnfire`.
2. **Certificates & provisioning** — EAS handles this automatically with `eas build`.
3. **TestFlight** — after the first build uploads, add internal testers and do at least one test session before submitting for review.
4. **Review notes** — when submitting, add a note to the reviewer:
   > "KilnFire is a creator marketplace for craft artists. Login is required to post content. To test, use the 'Continue as Guest' flow or create a free account. There is no hard-coded demo login."

---

## CONTACT / PRIVACY EMAIL

Before submitting, make sure **privacy@kilnfire.app** (referenced in the privacy policy) goes to a real inbox. Apple may email it during review.

---

*Package prepared May 2026.*
