import rateLimit from "express-rate-limit";

/**
 * Shared per-IP rate limiter for broadly-reachable PUBLIC read endpoints
 * (feed, search, discover, listings, public object delivery, etc.).
 *
 * These routes run database queries (and in the case of object delivery, stream
 * files) without requiring authentication, so an unthrottled scraper or bot
 * could drive up load and cost. This is a lightweight, defense-in-depth throttle
 * — the limit is generous enough that it never affects a real person browsing
 * the site, but it caps runaway automated traffic with a 429.
 *
 * `req.ip` resolves to the real client IP via the platform-set X-Forwarded-For
 * header (`trust proxy` is set in app.ts). We disable express-rate-limit's
 * `trustProxy` validation because a permissive trust-proxy is intentional here:
 * per-IP keying must reflect the real client rather than collapsing every user
 * onto the shared proxy IP (which would throttle all users together).
 *
 * Tune limits here in one place.
 */
const PUBLIC_READ_WINDOW_MS = 60 * 1000;
const PUBLIC_READ_LIMIT = 240; // 240 req/min/IP — ~4/sec sustained, far above human browsing

export const publicReadLimiter: ReturnType<typeof rateLimit> = rateLimit({
  windowMs: PUBLIC_READ_WINDOW_MS,
  limit: PUBLIC_READ_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: { error: "Too many requests. Please try again later." },
});
