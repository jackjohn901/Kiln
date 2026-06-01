/**
 * Shared backfill helper — stamps `processing_window_days` /
 * `processing_window_label` on every order row where BOTH columns are NULL,
 * using each seller's current `paymentSettings` at the time of the call.
 *
 * Safe to re-run: only touches rows where BOTH fields are still NULL.
 */

import { isNull, and, inArray } from "drizzle-orm";
import { db } from "./index.js";
import { ordersTable, userSettingsTable } from "./schema/index.js";

export interface BackfillProcessingWindowResult {
  found: number;
  stamped: number;
  skipped: number;
}

/**
 * @param log  Optional logging callback. Defaults to a no-op.
 *             Pass `(msg) => console.log(msg)` from scripts,
 *             or a structured logger wrapper from the server.
 */
export async function backfillProcessingWindow(
  log: (msg: string) => void = () => {},
): Promise<BackfillProcessingWindowResult> {
  // Only target rows where BOTH fields are null so partial stamps are preserved.
  const nullRows = await db
    .select({ id: ordersTable.id, sellerId: ordersTable.sellerId })
    .from(ordersTable)
    .where(
      and(
        isNull(ordersTable.processingWindowDays),
        isNull(ordersTable.processingWindowLabel),
      ),
    );

  if (nullRows.length === 0) {
    log("backfillProcessingWindow: no orders with null processing window — nothing to do.");
    return { found: 0, stamped: 0, skipped: 0 };
  }

  log(`backfillProcessingWindow: found ${nullRows.length} order(s) with null processing window.`);

  const sellerIds = [...new Set(nullRows.map((r) => r.sellerId))];

  const settingsRows = await db
    .select({
      userId: userSettingsTable.userId,
      paymentSettings: userSettingsTable.paymentSettings,
    })
    .from(userSettingsTable)
    .where(inArray(userSettingsTable.userId, sellerIds));

  type WindowValues = { days: number | null; label: string | null };
  const sellerWindowMap = new Map<string, WindowValues>();

  for (const row of settingsRows) {
    const ps = row.paymentSettings as Record<string, unknown> | null;
    const days =
      ps && typeof ps.processingWindow === "number" ? ps.processingWindow : null;
    const label =
      ps &&
      typeof ps.processingWindowLabel === "string" &&
      (ps.processingWindowLabel as string).trim()
        ? (ps.processingWindowLabel as string).trim()
        : null;
    sellerWindowMap.set(row.userId, { days, label });
  }

  // Group orders by (days, label) pair for bulk updates.
  type UpdateBucket = { days: number | null; label: string | null; orderIds: string[] };
  const buckets = new Map<string, UpdateBucket>();

  let skipped = 0;
  for (const row of nullRows) {
    const win = sellerWindowMap.get(row.sellerId);
    if (!win || (win.days === null && win.label === null)) {
      skipped++;
      continue;
    }
    const key = `${win.days ?? "null"}|${win.label ?? "null"}`;
    if (!buckets.has(key)) {
      buckets.set(key, { days: win.days, label: win.label, orderIds: [] });
    }
    buckets.get(key)!.orderIds.push(row.id);
  }

  let stamped = 0;
  for (const bucket of buckets.values()) {
    await db
      .update(ordersTable)
      .set({
        processingWindowDays: bucket.days,
        processingWindowLabel: bucket.label,
        updatedAt: new Date(),
      })
      .where(inArray(ordersTable.id, bucket.orderIds));
    stamped += bucket.orderIds.length;
    log(
      `backfillProcessingWindow: stamped ${bucket.orderIds.length} order(s) → days=${bucket.days}, label="${bucket.label}"`,
    );
  }

  log(
    `backfillProcessingWindow: done — ${stamped} stamped, ${skipped} skipped (seller has no window set).`,
  );
  return { found: nullRows.length, stamped, skipped };
}
