# Threat Model

## Project Overview

Kiln is a creator marketplace and social platform for craft artists. It has a React/Vite frontend in `artifacts/kiln`, an Express API in `artifacts/api-server`, and PostgreSQL/Drizzle schemas in `lib/db`. Production authentication is session-based Replit Auth handled by the API middleware. The application stores user profiles, messages, commissions, orders, workshop bookings, payout requests, payment metadata, moderation data, and object-storage-backed media.

This threat model is production-scoped. Mock/demo-only pages and local seed conveniences are out of scope unless there is evidence that they are reachable from the production API. Assume TLS is provided by the platform and `NODE_ENV=production` in deployed environments.

## Assets

- **User accounts and sessions** — Replit-authenticated sessions, mobile session tokens, and user identities. Compromise allows impersonation across marketplace, messaging, and moderation flows.
- **Private creator and buyer data** — profiles, direct messages, commission requests, verification applications, payout requests, waitlists, and notification data. Exposure would leak personal and business-sensitive information.
- **Commerce integrity** — listing prices, order records, digital download entitlements, workshop bookings, auction outcomes, tips, commissions, and payout state. Tampering here directly changes who gets paid, what was purchased, or what access was granted.
- **Moderation and admin authority** — report queues, verification approvals, and verified-profile state. Abuse here changes trust signals and moderation outcomes platform-wide.
- **Stored media and files** — uploaded images and private object-storage entities. Unauthorized access can expose paid or non-public content.
- **Secrets and service credentials** — database credentials, Stripe secrets, Mux tokens, object-storage signing access, and email infrastructure.

## Trust Boundaries

- **Browser/mobile client to API** — all request bodies, query parameters, and client-side state are untrusted. The server must enforce authorization, pricing, and entitlement checks.
- **API to PostgreSQL** — the API can read and mutate all application data. Any broken authz or injection flaw at the API layer becomes full data compromise.
- **API to external payment/media/storage services** — Stripe, Mux, email, and object storage are privileged integrations. The API must not let users drive those integrations with unvalidated identifiers or business values.
- **Public to authenticated boundary** — feeds, listings, and discovery endpoints are broadly readable; messaging, purchases, commissions, settings, and creator operations require authentication and per-record authorization.
- **Authenticated user to admin boundary** — report review and verification actions must remain restricted to explicitly designated admins in production.
- **Private object storage to public delivery boundary** — uploaded objects may exist in private storage, but only explicitly public assets should be retrievable without ownership or ACL validation.

## Scan Anchors

- **Production entry points:** `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/index.ts`, `artifacts/api-server/src/middlewares/authMiddleware.ts`
- **Highest-risk areas:** `artifacts/api-server/src/routes/admin.ts`, `storage.ts`, `stripe.ts`, `me.ts`, `commissions.ts`, `workshops.ts`, `digital-downloads.ts`, `video.ts`
- **Public surfaces:** feed/search/listings/discover/trending/public object routes and most read-only catalog endpoints
- **Authenticated surfaces:** `/me/*`, messages, social mutations, commissions, payouts, bookings, uploads, reports, settings
- **Usually dev-only / lower-priority for repeat scans:** static frontend data under `artifacts/kiln/src/data`, seed logic in `artifacts/api-server/src/lib/seed.ts`, mock/demo-only screens unless backed by live API routes

## Threat Categories

### Spoofing

Sessions are represented by a bearer token or `sid` cookie and hydrated by `authMiddleware`. Protected endpoints must require a valid authenticated session, and any route that grants elevated privileges must verify the caller's role server-side instead of trusting frontend state or missing configuration defaults.

### Tampering

Kiln lets users initiate payments, commissions, listings, auctions, bookings, and other marketplace actions from the client. The server must compute or validate authoritative prices, allowed state transitions, and ownership checks itself. Client-supplied amounts, payment-completion claims, or mutation fields cannot be trusted.

### Information Disclosure

The platform handles direct messages, moderation reports, verification applications, payout records, non-public uploads, and paid digital content. API responses and storage delivery routes must be scoped to the acting user or an explicit public audience. Error handling and logs must avoid leaking secrets, cookies, or privileged identifiers.

### Denial of Service

Several public or broadly reachable endpoints perform database queries or create external-service work such as uploads and checkout sessions. These routes must avoid unbounded resource consumption and should not allow unauthenticated or lightly authenticated callers to trigger excessive expensive operations.

### Elevation of Privilege

The main privilege boundaries are buyer vs seller, artist vs client, regular user vs admin, and private-file owner vs other users. Routes that mutate commission payment state, workshop enrollment, order confirmation, admin moderation state, or object-storage access must enforce per-action authorization and entitlement checks. Missing role checks or open “private” file delivery paths would let ordinary users gain access beyond what they purchased or own.