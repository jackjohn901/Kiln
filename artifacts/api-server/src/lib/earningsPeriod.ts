// Helpers for scoping the artist earnings summary (GET /me/earnings) to a
// trailing time window and for generating the time-series buckets that back the
// "Revenue by Stream" chart. Kept pure (no DB / request access) so the bucketing
// behaviour can be unit-tested independently of the route.
//
// All bucket math is UTC, matching how the route fills buckets
// (`createdAt.toISOString().slice(0, 7 | 10)`), so init keys and fill keys agree
// regardless of the server's local timezone.

export type EarningsPeriod = "30d" | "90d" | "1y";

export function isEarningsPeriod(value: unknown): value is EarningsPeriod {
  return value === "30d" || value === "90d" || value === "1y";
}

// Resolve a `period` query value into a trailing [start, end) date window.
// Returns null for unrecognised values (caller falls back to all-time).
export function resolveEarningsPeriodRange(
  period: unknown,
  now: Date = new Date(),
): { start: Date; end: Date } | null {
  if (!isEarningsPeriod(period)) return null;
  const end = new Date(now);
  const start = new Date(now);
  if (period === "30d") start.setUTCDate(start.getUTCDate() - 30);
  else if (period === "90d") start.setUTCDate(start.getUTCDate() - 90);
  else start.setUTCFullYear(start.getUTCFullYear() - 1);
  return { start, end };
}

// Trailing month bucket keys ("YYYY-MM", UTC) that fully cover the window from
// `start` through `now`, inclusive of both endpoint months. This intentionally
// includes a partial leading month (e.g. a 90-day window that spans four
// calendar months yields four keys) so no in-window data is dropped from the
// chart. With no start, falls back to the trailing 12 months.
export function monthBucketKeys(start: Date | null, now: Date = new Date()): string[] {
  const count = start
    ? (now.getUTCFullYear() - start.getUTCFullYear()) * 12 + (now.getUTCMonth() - start.getUTCMonth()) + 1
    : 12;
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

// Trailing day bucket keys ("YYYY-MM-DD", UTC) covering `start`..`now`,
// inclusive. With no start, falls back to the trailing 30 days.
export function dayBucketKeys(start: Date | null, now: Date = new Date()): string[] {
  let count = 30;
  if (start) {
    const startMid = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const nowMid = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    count = Math.round((nowMid - startMid) / 86_400_000) + 1;
  }
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}
