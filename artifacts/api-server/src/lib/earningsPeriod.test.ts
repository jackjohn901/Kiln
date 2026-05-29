import { describe, it, expect } from "vitest";
import {
  isEarningsPeriod,
  resolveEarningsPeriodRange,
  monthBucketKeys,
  dayBucketKeys,
} from "./earningsPeriod";

const monthKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

// Assert the keys form a contiguous ascending month sequence.
function assertContiguousMonths(keys: string[]) {
  for (let i = 1; i < keys.length; i++) {
    const [py, pm] = keys[i - 1].split("-").map(Number);
    const [cy, cm] = keys[i].split("-").map(Number);
    const expected = new Date(Date.UTC(py, pm, 1)); // pm is 1-indexed → next month
    expect(keys[i]).toBe(`${expected.getUTCFullYear()}-${String(expected.getUTCMonth() + 1).padStart(2, "0")}`);
    expect(cy * 12 + cm).toBe(py * 12 + pm + 1);
  }
}

describe("isEarningsPeriod", () => {
  it("accepts the supported window values", () => {
    expect(isEarningsPeriod("30d")).toBe(true);
    expect(isEarningsPeriod("90d")).toBe(true);
    expect(isEarningsPeriod("1y")).toBe(true);
  });
  it("rejects anything else", () => {
    expect(isEarningsPeriod("bogus")).toBe(false);
    expect(isEarningsPeriod(undefined)).toBe(false);
    expect(isEarningsPeriod(null)).toBe(false);
    expect(isEarningsPeriod(7)).toBe(false);
  });
});

describe("resolveEarningsPeriodRange", () => {
  const now = new Date("2026-05-29T12:00:00Z");
  it("returns null for unrecognised periods", () => {
    expect(resolveEarningsPeriodRange("bogus", now)).toBeNull();
    expect(resolveEarningsPeriodRange(null, now)).toBeNull();
  });
  it("builds trailing day/year windows", () => {
    expect(Math.round((now.getTime() - resolveEarningsPeriodRange("30d", now)!.start.getTime()) / 86_400_000)).toBe(30);
    expect(Math.round((now.getTime() - resolveEarningsPeriodRange("90d", now)!.start.getTime()) / 86_400_000)).toBe(90);
    expect(resolveEarningsPeriodRange("1y", now)!.start.getUTCFullYear()).toBe(2025);
  });
});

describe("monthBucketKeys", () => {
  // Regression: the old client sliced the monthly series to a fixed 3 months for
  // 90d, which dropped the partial leading month whenever the window spanned 4
  // calendar months. The bucket set must always include the start month.
  it("includes the leading month of a 90-day window and drops nothing", () => {
    const now = new Date("2026-04-15T12:00:00Z");
    const range = resolveEarningsPeriodRange("90d", now)!;
    const keys = monthBucketKeys(range.start, now);

    expect(keys[0]).toBe(monthKey(range.start)); // leading month present, not sliced off
    expect(keys[keys.length - 1]).toBe(monthKey(now));
    // A 90-day window from mid-April reaches mid-January → 4 calendar months.
    expect(keys.length).toBe(4);
    assertContiguousMonths(keys);
  });

  it("covers every calendar month a 1-year window touches", () => {
    const now = new Date("2026-05-29T12:00:00Z");
    const range = resolveEarningsPeriodRange("1y", now)!;
    const keys = monthBucketKeys(range.start, now);

    expect(keys[0]).toBe(monthKey(range.start)); // 2025-05
    expect(keys[keys.length - 1]).toBe(monthKey(now)); // 2026-05
    assertContiguousMonths(keys);
  });

  it("falls back to the trailing 12 months with no start", () => {
    const now = new Date("2026-05-29T12:00:00Z");
    const keys = monthBucketKeys(null, now);
    expect(keys.length).toBe(12);
    expect(keys[keys.length - 1]).toBe("2026-05");
    expect(keys[0]).toBe("2025-06");
    assertContiguousMonths(keys);
  });
});

describe("dayBucketKeys", () => {
  it("spans the 30-day window inclusive of both ends", () => {
    const now = new Date("2026-05-29T12:00:00Z");
    const range = resolveEarningsPeriodRange("30d", now)!;
    const keys = dayBucketKeys(range.start, now);
    expect(keys.length).toBe(31); // 30 days back, inclusive of start and end
    expect(keys[keys.length - 1]).toBe("2026-05-29");
    expect(keys[0]).toBe("2026-04-29");
  });

  it("falls back to the trailing 30 days with no start", () => {
    const now = new Date("2026-05-29T12:00:00Z");
    const keys = dayBucketKeys(null, now);
    expect(keys.length).toBe(30);
    expect(keys[keys.length - 1]).toBe("2026-05-29");
  });
});
